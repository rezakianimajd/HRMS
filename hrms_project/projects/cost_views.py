"""Views for Phase 2 cost & progress models."""
from rest_framework import viewsets, filters
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Sum

from projects.cost_models import (
    BudgetLine, CommittedCost, CostTransaction, CostTransactionLine,
    ProgressStatement, ProgressStatementItem,
)
from projects.cost_serializers import (
    BudgetLineSerializer, CommittedCostSerializer, CostTransactionSerializer,
    CostTransactionLineSerializer, ProgressStatementSerializer,
    ProgressStatementItemSerializer,
)
from projects import audit


def _company(request):
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


def _apply_coding(instance, coding):
    """فیلدهای خالی کدینگ ردیف را از خروجی موتور «تعاریف اولیه» پر کن.

    مقدار دستیِ کاربر مقدم است؛ فقط فیلدهای تهی تکمیل می‌شوند. خروجی: فهرست
    نام فیلدهایی که تغییر کرده‌اند.
    """
    if not coding:
        return []
    mapping = {
        'general_account': coding.get('general_account'),
        'account': coding.get('subsidiary_account'),
        'cost_center': coding.get('cost_center'),
        'auxiliary_1': coding.get('auxiliary_1'),
        'auxiliary_2': coding.get('auxiliary_2'),
        'auxiliary_3': coding.get('auxiliary_3'),
    }
    changed = []
    for field, value in mapping.items():
        if value and getattr(instance, f'{field}_id', None) is None:
            setattr(instance, f'{field}_id', value['id'])
            changed.append(field)
    if changed and not instance.coding_note:
        instance.coding_note = (coding.get('preview') or '')[:250]
        changed.append('coding_note')
    return changed


class BaseCostViewSet(viewsets.ModelViewSet):
    """پایهٔ ViewSetهای مالی پروژه.

    Phase 0: هر تغییر مالی (ایجاد/ویرایش/حذف) در `core.AuditLog` ثبت می‌شود،
    کاربر جاری روی رکورد مهر می‌خورد و حذف به‌صورت **نرم** انجام می‌شود.
    """

    def get_queryset(self):
        qs = super().get_queryset()
        company = _company(self.request)
        if company:
            qs = qs.filter(company=company)
        return qs

    def _user(self):
        user = getattr(self.request, 'user', None)
        return user if getattr(user, 'is_authenticated', False) else None

    def perform_create(self, serializer):
        company = _company(self.request)
        user = self._user()
        instance = serializer.save(company=company, created_by=user, updated_by=user)
        audit.log_object(user, instance, 'CREATE')

    def perform_update(self, serializer):
        user = self._user()
        before = audit._snapshot(serializer.instance)
        instance = serializer.save(updated_by=user)
        changes = audit.diff(before, audit._snapshot(instance))
        audit.log_object(user, instance, 'UPDATE', changes=changes)

    def perform_destroy(self, instance):
        user = self._user()
        audit.log_object(user, instance, 'DELETE', description=f'حذف نرم {instance.__class__.__name__} #{instance.pk}')
        instance.delete()  # Soft delete (AuditableModel.delete)



class BudgetLineViewSet(BaseCostViewSet):
    serializer_class = BudgetLineSerializer
    queryset = BudgetLine.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['description']
    ordering = ['project', 'id']

    def get_queryset(self):
        qs = super().get_queryset().select_related('project', 'wbs', 'cbs')
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs


class CommittedCostViewSet(BaseCostViewSet):
    serializer_class = CommittedCostSerializer
    queryset = CommittedCost.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['description', 'reference']
    ordering = ['-date']

    def get_queryset(self):
        qs = super().get_queryset().select_related('project', 'wbs', 'cbs')
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs


class CostTransactionViewSet(BaseCostViewSet):
    serializer_class = CostTransactionSerializer
    queryset = CostTransaction.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['number', 'description']
    ordering = ['-date']

    def get_queryset(self):
        qs = super().get_queryset().select_related('project', 'cost_source', 'contract').prefetch_related('lines')
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs


class CostTransactionLineViewSet(BaseCostViewSet):
    serializer_class = CostTransactionLineSerializer
    queryset = CostTransactionLine.objects.all()

    def get_queryset(self):
        qs = super().get_queryset().select_related(
            'wbs', 'cbs', 'resource', 'account_definition', 'general_account', 'account',
            'cost_center', 'auxiliary_1', 'auxiliary_2', 'auxiliary_3',
        )
        transaction_id = self.request.query_params.get('transaction')
        if transaction_id:
            qs = qs.filter(transaction_id=transaction_id)
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(transaction__project_id=project_id)
        return qs

    def perform_create(self, serializer):
        """ثبت ردیف هزینه + تکمیل خودکار کدینگ از «تعریف حسابداری» انتخاب‌شده."""
        company = _company(self.request)
        user = self._user()
        definition = serializer.validated_data.get('account_definition')
        instance = serializer.save(company=company, created_by=user, updated_by=user)
        if definition is not None:
            from projects.accounting_definitions import build_coding

            transaction = instance.transaction
            contract = getattr(transaction, 'contract', None)
            coding = build_coding(
                definition, project=getattr(transaction, 'project', None),
                contract=contract, party=getattr(contract, 'party', None) if contract else None,
                company=company, create=None,
            )
            changed = _apply_coding(instance, coding)
            if changed:
                instance.save(update_fields=changed + ['updated_at'])
        audit.log_object(user, instance, 'CREATE')

    @action(detail=False, methods=['post'])
    def resolve(self, request):
        """پیش‌نمایش/ساخت کدینگ یک «تعریف» برای پروژهٔ جاری (بدون ثبت ردیف).

        بدنه: ``{project, definition|code|kind, party, supplier, contract, employee, create}``
        """
        from projects.accounting_definitions import build_coding, resolve_definition
        from projects.models import Project

        company = _company(request)
        project_id = request.data.get('project')
        project = Project.objects.filter(pk=project_id, company=company).first() if project_id else None
        if project is None:
            return Response({'detail': 'پروژه الزامی است.'}, status=400)

        definition = None
        definition_id = request.data.get('definition') or request.data.get('definition_id')
        if definition_id:
            definition = resolve_definition(company, project, definition_id=definition_id)
        if definition is None:
            definition = resolve_definition(
                company, project, code=request.data.get('code'), kind=request.data.get('kind'),
            )
        if definition is None:
            return Response({'detail': 'تعریف حسابداری برای این پروژه یافت نشد.'}, status=404)

        def _obj(identifier, label):
            if not identifier:
                return None
            from django.apps import apps

            try:
                model = apps.get_model(label)
            except LookupError:
                return None
            return model.objects.filter(pk=identifier, company=company).first()

        coding = build_coding(
            definition, project=project,
            party=_obj(request.data.get('party'), 'contracts.ContractParty'),
            supplier=_obj(request.data.get('supplier'), 'procurement.Supplier'),
            contract=_obj(request.data.get('contract'), 'contracts.Contract'),
            employee=_obj(request.data.get('employee'), 'employees.Employee'),
            company=company, create=request.data.get('create'),
        )
        return Response(coding)


class ProgressStatementViewSet(BaseCostViewSet):
    serializer_class = ProgressStatementSerializer
    queryset = ProgressStatement.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['number']
    ordering = ['-date']

    def get_queryset(self):
        qs = super().get_queryset().select_related('project', 'contract').prefetch_related('items')
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs


class ProgressStatementItemViewSet(BaseCostViewSet):
    serializer_class = ProgressStatementItemSerializer
    queryset = ProgressStatementItem.objects.all()

    def get_queryset(self):
        qs = super().get_queryset().select_related('wbs')
        statement_id = self.request.query_params.get('statement')
        if statement_id:
            qs = qs.filter(statement_id=statement_id)
        return qs