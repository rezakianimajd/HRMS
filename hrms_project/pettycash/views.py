"""Views for the Petty Cash module."""
from django.utils import timezone
from decimal import Decimal
from django.db import transaction as db_transaction
from django.db.models import Sum, Count, Q
from django.template.loader import render_to_string
from rest_framework import viewsets, filters, parsers, status
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.decorators import action
from rest_framework.response import Response
from pettycash.models import (
    PettyCashFund, PettyCashTransaction, PettyCashCategory,
    PettyCashExpenseStatement, PettyCashExpenseStatementLine,
    PettyCashApprovalPolicy, PettyCashApprovalStep,
    PettyCashExpenseAttachment, PettyCashSettings,
    PettyCashRequest, PettyCashSettlement, PettyCashCustodian,
)
from pettycash.serializers import (
    PettyCashFundSerializer, PettyCashTransactionSerializer, PettyCashCategorySerializer,
    PettyCashExpenseStatementSerializer, PettyCashApprovalPolicySerializer,
    PettyCashApprovalStepSerializer, PettyCashExpenseAttachmentSerializer,
    PettyCashSettingsSerializer, PettyCashRequestSerializer, PettyCashSettlementSerializer,
    PettyCashCustodianSerializer,
)
from pettycash import access, services
from pettycash.services import PettyCashError


def _company(request):
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


def _fund_in_scope(request, fund):
    """آیا تنخواه در دامنهٔ دید کاربر جاری است؟"""
    if fund is None:
        return False
    company = _company(request)
    fund_ids = access.accessible_fund_ids(company, request.user)
    return fund_ids is None or fund.id in fund_ids



def _notify(company, title, body, user_id=None, entity_type='petty_statement', entity_id=None, priority='normal'):
    """ایجاد اعلان برای کاربر."""
    try:
        from notifications.models import Notification
        Notification.objects.create(
            company=company,
            user_id=user_id,
            category=Notification.Category.PETTY_CASH,
            priority=priority,
            title=title,
            body=body,
            entity_type=entity_type,
            entity_id=entity_id,
            dedup_key=f'petty:{entity_id}:{title}' if entity_id else None,
        )
    except Exception:
        pass


class BaseViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        qs = super().get_queryset()
        company = _company(self.request)
        if not company:
            # بدون شناسایی شرکت هیچ رکوردی نمایش داده نمی‌شود (جلوگیری از نشت داده بین شرکت‌ها)
            return qs.none()
        qs = qs.filter(company=company)
        return access.scope_queryset(qs, company, self.request.user)


    def perform_create(self, serializer):
        company = _company(self.request)
        if not company:
            raise DRFValidationError({'error': 'شرکت مشخص نیست؛ امکان ثبت رکورد وجود ندارد.'})
        serializer.save(company=company)


class FinancialViewSet(BaseViewSet):
    """پایهٔ ویوست‌های اسناد مالی: بدون حذف فیزیکی."""

    def destroy(self, request, *args, **kwargs):
        return Response(
            {'error': 'حذف فیزیکی اسناد مالی مجاز نیست؛ از ابطال یا حذف نرم استفاده کنید.'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )




class PettyCashCategoryViewSet(BaseViewSet):
    serializer_class = PettyCashCategorySerializer
    queryset = PettyCashCategory.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'code']
    ordering = ['name']


class PettyCashApprovalPolicyViewSet(BaseViewSet):
    serializer_class = PettyCashApprovalPolicySerializer
    queryset = PettyCashApprovalPolicy.objects.all()
    ordering = ['id']


class PettyCashApprovalStepViewSet(BaseViewSet):
    serializer_class = PettyCashApprovalStepSerializer
    queryset = PettyCashApprovalStep.objects.all()

    def get_queryset(self):
        qs = super().get_queryset().select_related('approver')
        for key in ('statement', 'request', 'settlement'):
            value = self.request.query_params.get(key)
            if value:
                qs = qs.filter(**{f'{key}_id': value})
        company = _company(self.request)
        fund_ids = access.accessible_fund_ids(company, self.request.user)
        if fund_ids is not None:
            qs = qs.filter(
                Q(statement__fund_id__in=list(fund_ids))
                | Q(request__fund_id__in=list(fund_ids))
                | Q(settlement__fund_id__in=list(fund_ids))
            ).distinct()
        return qs

    def perform_create(self, serializer):
        obj = serializer.save(company=_company(self.request))
        target = obj.statement or obj.request or obj.settlement
        if target is None:
            return obj
        approved = obj.decision == PettyCashApprovalStep.Decision.APPROVED
        rejected = obj.decision == PettyCashApprovalStep.Decision.REJECTED
        has_pending = target.approval_steps.filter(
            decision=PettyCashApprovalStep.Decision.PENDING,
        ).exclude(pk=obj.pk).exists()
        if approved and not has_pending:
            target.status = 'approved'
            if hasattr(target, 'approved_by'):
                target.approved_by = obj.approver
                target.approved_at = timezone.now()
        elif rejected:
            target.status = 'rejected'
        target.save()
        return obj


class PettyCashSettingsViewSet(BaseViewSet):
    """تنظیمات تنخواه — یک رکورد در هر شرکت."""
    serializer_class = PettyCashSettingsSerializer
    queryset = PettyCashSettings.objects.all()

    @action(detail=False, methods=['get'])
    def current(self, request):
        company = _company(request)
        if not company:
            return Response({'error': 'شرکت مشخص نیست'}, status=400)
        obj = services.get_settings(company)
        return Response(PettyCashSettingsSerializer(obj).data)

    @action(detail=False, methods=['post', 'patch'], url_path='current')
    def update_current(self, request):
        company = _company(request)
        if not company:
            return Response({'error': 'شرکت مشخص نیست'}, status=400)
        if not access.is_senior_manager(request.user, company):
            return Response(
                {'error': 'تغییر تنظیمات تنخواه فقط توسط مدیر ارشد سیستم مجاز است.'},
                status=403,
            )
        obj = services.get_settings(company)
        serializer = PettyCashSettingsSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        services.audit('UPDATE', obj, user=request.user, description='به‌روزرسانی تنظیمات تنخواه')
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def access_summary(self, request):
        """خلاصهٔ دسترسی کاربر جاری (برای مخفی/نمایش بخش‌های رابط کاربری)."""
        company = _company(request)
        if not company:
            return Response({'error': 'شرکت مشخص نیست'}, status=400)
        fund_ids = access.accessible_fund_ids(company, request.user)
        assignments = access.assignments_for_user(company, request.user)
        return Response({
            'is_senior_manager': access.is_senior_manager(request.user, company),
            'can_view_all': fund_ids is None,
            'accessible_funds_count': None if fund_ids is None else len(fund_ids),
            'has_role': assignments.exists(),
            'can_create_expense': access.can_create_expense(company, request.user),
            'can_approve': access.can_approve(company, request.user),
            'can_view_reports': access.can_view_reports(company, request.user),
            'roles': [
                {
                    'id': a.id, 'role': a.role, 'role_display': a.get_role_display(),
                    'employee': a.employee.full_name if a.employee_id else '',
                    'supervisor': (
                        a.supervisor.employee.full_name
                        if a.supervisor_id and a.supervisor.employee_id else ''
                    ),
                }
                for a in assignments
            ],
        })


class PettyCashCustodianViewSet(BaseViewSet):
    """تعاریف اولیهٔ تنخواه‌داران و کمک‌تنخواه‌داران (تعریف/ویرایش فقط توسط مدیر ارشد)."""
    serializer_class = PettyCashCustodianSerializer
    queryset = PettyCashCustodian.objects.all()
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        'employee__first_name', 'employee__last_name', 'employee__employee_id',
        'note', 'supervisor__employee__first_name', 'supervisor__employee__last_name',
    ]
    ordering = ['employee__first_name', 'employee__last_name']

    def get_queryset(self):
        qs = (
            super().get_queryset()
            .select_related('employee', 'employee__department', 'supervisor', 'supervisor__employee', 'user')
            .prefetch_related('funds')
        )
        company = _company(self.request)
        # تنخواه‌دار فقط تعریف خودش را می‌بیند؛ مدیر ارشد همه را
        if not access.is_senior_manager(self.request.user, company):
            mine = access.assignments_for_user(company, self.request.user)
            qs = qs.filter(id__in=list(mine.values_list('id', flat=True)))
        role_q = self.request.query_params.get('role')
        if role_q:
            qs = qs.filter(role=role_q)
        if self.request.query_params.get('active') == '1':
            qs = qs.filter(is_active=True)
        return qs

    def _guard(self, request):
        company = _company(request)
        if not access.is_senior_manager(request.user, company):
            raise DRFValidationError(
                {'error': 'تعریف تنخواه‌داران فقط توسط مدیر ارشد سیستم مجاز است.'}
            )
        return company

    def perform_create(self, serializer):
        company = self._guard(self.request)
        obj = serializer.save(company=company)
        self._sync_funds(obj)
        self._sync_user(obj)
        services.audit(
            'CREATE', obj, user=self.request.user,
            description='تعریف تنخواه‌دار/کمک‌تنخواه‌دار',
        )

    def perform_update(self, serializer):
        self._guard(self.request)
        obj = serializer.save()
        self._sync_funds(obj)
        self._sync_user(obj)
        services.audit('UPDATE', obj, user=self.request.user, description='ویرایش تعریف تنخواه‌دار')

    def _ids(self, key):
        data = self.request.data
        raw = data.getlist(key) if hasattr(data, 'getlist') else (data.get(key) or [])
        if isinstance(raw, str):
            raw = [value for value in raw.split(',') if value]
        result = []
        for value in raw:
            try:
                result.append(int(value))
            except (TypeError, ValueError):
                continue
        return result

    def _sync_funds(self, obj):
        if 'funds' in self.request.data:
            obj.funds.set(self._ids('funds'))

    def _sync_user(self, obj):
        """اتصال خودکار کاربر سیستم از پروندهٔ پرسنلی در صورت خالی بودن."""
        if obj.user_id or not obj.employee_id:
            return
        try:
            from core.models.user import UserProfile
            profile = (
                UserProfile.objects
                .filter(employee_id=obj.employee_id, user__isnull=False)
                .select_related('user')
                .first()
            )
        except Exception:  # noqa: BLE001
            profile = None
        if profile is not None:
            obj.user_id = profile.user_id
            obj.save(update_fields=['user', 'updated_at'])

    @action(detail=False, methods=['get'])
    def options(self, request):
        """اطلاعات پایهٔ فرم تعریف تنخواه‌دار."""
        company = _company(request)
        return Response({
            'roles': [{'value': v, 'label': str(l)} for v, l in PettyCashCustodian.Role.choices],
            'supervisors': [
                {'id': c.id, 'employee': c.employee_id, 'name': c.employee.full_name if c.employee_id else ''}
                for c in PettyCashCustodian.objects
                .filter(company=company, role=PettyCashCustodian.Role.CUSTODIAN)
                .select_related('employee')
            ],
            'funds': list(PettyCashFund.objects.filter(company=company).values('id', 'code', 'title')),
            'is_senior_manager': access.is_senior_manager(request.user, company),
        })

    @action(detail=False, methods=['get'])
    def me(self, request):
        """تعریف(های) کاربر جاری و تنخواه‌های قابل دسترس او."""
        company = _company(request)
        if not company:
            return Response({'error': 'شرکت مشخص نیست'}, status=400)
        assignments = access.assignments_for_user(company, request.user)
        fund_ids = access.accessible_fund_ids(company, request.user)
        funds = PettyCashFund.objects.filter(company=company)
        if fund_ids is not None:
            funds = funds.filter(id__in=list(fund_ids))
        return Response({
            'is_senior_manager': access.is_senior_manager(request.user, company),
            'assignments': PettyCashCustodianSerializer(assignments, many=True).data,
            'funds': [
                {
                    'id': f.id, 'code': f.code, 'title': f.title, 'kind': f.kind,
                    'balance': float(services.fund_balance(f)),
                    'limit': float(f.limit or 0),
                }
                for f in funds
            ],
        })




class PettyCashFundViewSet(BaseViewSet):
    serializer_class = PettyCashFundSerializer
    queryset = PettyCashFund.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['code', 'title', 'custodian__first_name', 'custodian__last_name']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = super().get_queryset().select_related('custodian')
        status_q = self.request.query_params.get('status')
        if status_q:
            qs = qs.filter(status=status_q)
        kind = self.request.query_params.get('kind')
        if kind:
            qs = qs.filter(kind=kind)
        custodian_id = self.request.query_params.get('custodian')
        if custodian_id:
            qs = qs.filter(custodian_id=custodian_id)
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(Q(allowed_projects__id=project_id) | Q(expense_statements__project_id=project_id)).distinct()
        # تنخواه‌دار فقط تنخواه خودش را ببیند
        if self.request.query_params.get('mine') == '1':
            emp_id = getattr(getattr(self.request.user, 'profile', None), 'employee_id', None)
            if emp_id:
                qs = qs.filter(custodian_id=emp_id)
        return qs

    def perform_create(self, serializer):
        company = _company(self.request)
        if not company:
            raise DRFValidationError({'error': 'شرکت مشخص نیست.'})
        settings_obj = services.get_settings(company)
        defaults = {}
        if not serializer.validated_data.get('limit') and settings_obj.default_limit:
            defaults['limit'] = settings_obj.default_limit
        if not serializer.validated_data.get('settlement_days'):
            defaults['settlement_days'] = settings_obj.default_settlement_days
        obj = serializer.save(company=company, **defaults)
        self._sync_allowed(obj)
        services.audit('CREATE', obj, user=self.request.user, description='ایجاد تنخواه')

    def perform_update(self, serializer):
        obj = serializer.save()
        self._sync_allowed(obj)
        services.audit('UPDATE', obj, user=self.request.user, description='ویرایش تنخواه')

    def _ids(self, key):
        """استخراج فهرست شناسه‌ها از payload (JSON یا form-data)."""
        data = self.request.data
        if hasattr(data, 'getlist'):
            raw = data.getlist(key)
        else:
            raw = data.get(key) or []
        if isinstance(raw, str):
            raw = [value for value in raw.split(',') if value]
        result = []
        for value in raw:
            try:
                result.append(int(value))
            except (TypeError, ValueError):
                continue
        return result

    def _sync_allowed(self, obj):
        """همگام‌سازی پروژه‌ها/مراکز هزینه/سرفصل‌های مجاز تنخواه."""
        mapping = {
            'allowed_projects': 'allowed_projects',
            'allowed_cost_centers': 'allowed_cost_centers',
            'allowed_accounts': 'allowed_accounts',
        }
        for key, attr in mapping.items():
            if key in self.request.data:
                getattr(obj, attr).set(self._ids(key))


    @action(detail=False, methods=['get'])
    def options(self, request):
        """اطلاعات پایهٔ فرم تنخواه: انواع، روش‌های پرداخت، پیش‌فرض‌ها."""
        company = _company(request)
        settings_obj = services.get_settings(company) if company else None
        return Response({
            'kinds': [{'value': v, 'label': str(l)} for v, l in PettyCashFund.Kind.choices],
            'payment_methods': [
                {'value': v, 'label': str(l)} for v, l in PettyCashFund.PAYMENT_METHOD_CHOICES
            ],
            'statuses': [{'value': v, 'label': str(l)} for v, l in PettyCashFund.Status.choices],
            'defaults': PettyCashSettingsSerializer(settings_obj).data if settings_obj else {},
        })

    @action(detail=False, methods=['get'])
    def custodians(self, request):
        """لیست تنخواه‌داران (پرسنلی که تنخواه دارند) به همراه خلاصهٔ تنخواه."""
        qs = self.get_queryset().select_related('custodian')
        by_emp = {}
        for f in qs:
            e = f.custodian
            if e.id not in by_emp:
                by_emp[e.id] = {
                    'id': e.id, 'name': e.full_name, 'employee_id': e.employee_id,
                    'department': e.department.name if e.department else '',
                    'funds': [], 'total_balance': 0, 'total_limit': 0, 'fund_count': 0,
                }
            by_emp[e.id]['funds'].append({
                'id': f.id, 'title': f.title, 'code': f.code, 'kind': f.kind,
                'balance': float(f.balance), 'limit': float(f.limit or 0),
                'status': f.status,
            })
            by_emp[e.id]['total_balance'] += float(f.balance)
            by_emp[e.id]['total_limit'] += float(f.limit or 0)
            by_emp[e.id]['fund_count'] += 1
        data = list(by_emp.values())
        data.sort(key=lambda x: x['name'])
        return Response(data)


    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        obj = self.get_object()
        obj.status = PettyCashFund.Status.ARCHIVED
        obj.archived_at = timezone.now()
        obj.save(update_fields=['status', 'archived_at', 'updated_at'])
        services.audit('UPDATE', obj, user=request.user, description='بایگانی تنخواه')
        return Response(PettyCashFundSerializer(obj).data)

    @action(detail=True, methods=['post'])
    def set_status(self, request, pk=None):
        """تغییر وضعیت تنخواه: active / suspended / archived."""
        obj = self.get_object()
        new_status = request.data.get('status')
        valid = {c for c, _l in PettyCashFund.Status.choices}
        if new_status not in valid:
            return Response({'error': 'وضعیت نامعتبر است.'}, status=400)
        note = (request.data.get('note') or '').strip()
        if new_status == PettyCashFund.Status.ARCHIVED and obj.balance != 0:
            return Response(
                {'error': 'تنخواه با ماندهٔ غیرصفر قابل بایگانی نیست؛ ابتدا تسویه کنید.'},
                status=400,
            )
        obj.status = new_status
        obj.archived_at = timezone.now() if new_status == PettyCashFund.Status.ARCHIVED else None
        obj.save(update_fields=['status', 'archived_at', 'updated_at'])
        services.audit(
            'UPDATE', obj, user=request.user,
            description=f'تغییر وضعیت تنخواه به {new_status}. {note}'.strip(),
        )
        return Response(PettyCashFundSerializer(obj).data)

    @action(detail=True, methods=['post'])
    def extend(self, request, pk=None):
        """تمدید اعتبار تنخواه."""
        obj = self.get_object()
        new_end = request.data.get('end_date')
        if not new_end:
            return Response({'error': 'تاریخ پایان جدید الزامی است.'}, status=400)
        obj.end_date = new_end
        obj.save(update_fields=['end_date', 'updated_at'])
        services.audit('UPDATE', obj, user=request.user, description=f'تمدید اعتبار تا {new_end}')
        return Response(PettyCashFundSerializer(obj).data)

    @action(detail=True, methods=['post'])
    def reconcile(self, request, pk=None):
        """مغایرت‌گیری تنخواه: مقایسهٔ ماندهٔ دفتری با وجه شمارش‌شده."""
        obj = self.get_object()
        counted = request.data.get('cash_counted')
        result = {'fund': obj.pk, 'book_balance': float(services.fund_balance(obj))}
        if counted not in (None, ''):
            try:
                counted_value = services.money(counted)
            except PettyCashError as exc:
                return Response({'error': str(exc)}, status=400)
            difference = counted_value - services.fund_balance(obj)
            result.update({
                'cash_counted': float(counted_value),
                'difference': float(difference),
                'is_matched': difference == 0,
            })
            if difference != 0:
                note = (request.data.get('note') or '').strip()
                services.audit(
                    'UPDATE', obj, user=request.user,
                    description=f'مغایرت‌گیری با اختلاف {difference} ریال. {note}'.strip(),
                    changes=result,
                )
                return Response({**result, 'error': 'مغایرت وجود دارد.'}, status=400)
        obj.is_reconciled = True
        obj.reconciled_at = timezone.now()
        obj.reconciled_by = request.user
        obj.save(update_fields=['is_reconciled', 'reconciled_at', 'reconciled_by', 'updated_at'])
        services.audit('UPDATE', obj, user=request.user, description='مغایرت‌گیری تنخواه', changes=result)
        result['fund'] = PettyCashFundSerializer(obj).data
        return Response(result)

    @action(detail=True, methods=['post'])
    def charge(self, request, pk=None):
        """شارژ/دریافت وجه به تنخواه (با کنترل سقف و ثبت لاگ)."""
        obj = self.get_object()
        try:
            tx, created = services.register_movement(
                fund=obj,
                entry_type=PettyCashTransaction.EntryType.CREDIT,
                amount=request.data.get('amount'),
                title=request.data.get('title') or 'شارژ تنخواه',
                date=request.data.get('date') or timezone.localdate(),
                user=request.user,
                description=request.data.get('description', ''),
                payment_method=request.data.get('payment_method'),
                counterparty=request.data.get('counterparty', ''),
                reference=request.data.get('reference', ''),
                unique_key=request.data.get('unique_key', ''),
            )
        except PettyCashError as exc:
            return Response({'error': str(exc)}, status=400)
        return Response(
            {
                'transaction': PettyCashTransactionSerializer(tx, context={'request': request}).data,
                'created': created,
                'balance': float(services.fund_balance(obj)),
                'imprest_status': services.imprest_status(obj),
            },
            status=201 if created else 200,
        )


    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """داشبورد تحلیلی تنخواه با فیلتر دوره/تنخواه/تنخواه‌دار/پروژه/وضعیت."""
        company = _company(request)
        if not company:
            return Response({'error': 'شرکت مشخص نیست'}, status=400)
        funds = access.scope_funds(
            PettyCashFund.objects.filter(company=company).select_related('custodian'),
            company, request.user,
        )
        stmts = access.scope_by_fund(
            PettyCashExpenseStatement.objects.filter(company=company, is_deleted=False),
            company, request.user,
        )
        txns = access.scope_by_fund(
            PettyCashTransaction.objects.filter(company=company, is_void=False),
            company, request.user,
        )
        reqs = access.scope_by_custodian(
            PettyCashRequest.objects.filter(company=company), company, request.user,
        )

        fund_id = request.query_params.get('fund')
        custodian_id = request.query_params.get('custodian')
        project_id = request.query_params.get('project')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')

        if fund_id:
            funds = funds.filter(pk=fund_id)
            stmts = stmts.filter(fund_id=fund_id)
            txns = txns.filter(fund_id=fund_id)
            reqs = reqs.filter(fund_id=fund_id)
        if custodian_id:
            funds = funds.filter(custodian_id=custodian_id)
            stmts = stmts.filter(custodian_id=custodian_id)
            txns = txns.filter(fund__custodian_id=custodian_id)
            reqs = reqs.filter(custodian_id=custodian_id)
        if project_id:
            stmts = stmts.filter(Q(project_id=project_id) | Q(lines__project_id=project_id)).distinct()
            txns = txns.filter(project_id=project_id)
            reqs = reqs.filter(project_id=project_id)
        if date_from:
            stmts = stmts.filter(date__gte=date_from)
            txns = txns.filter(date__gte=date_from)
        if date_to:
            stmts = stmts.filter(date__lte=date_to)
            txns = txns.filter(date__lte=date_to)

        total_balance = sum((services.fund_balance(f) for f in funds), Decimal('0'))
        total_limit = sum((f.limit or Decimal('0') for f in funds), Decimal('0'))
        active_funds = funds.filter(status=PettyCashFund.Status.ACTIVE).count()
        pending_total = stmts.filter(status=PettyCashExpenseStatement.Status.SUBMITTED).aggregate(
            s=Sum('lines__debit'))['s'] or 0
        approved_total = stmts.filter(status=PettyCashExpenseStatement.Status.APPROVED).aggregate(
            s=Sum('lines__debit'))['s'] or 0
        posted_total = stmts.filter(status=PettyCashExpenseStatement.Status.POSTED).aggregate(
            s=Sum('lines__debit'))['s'] or 0
        now = timezone.now()
        monthly_spend = txns.filter(
            entry_type='debit', date__month=now.month, date__year=now.year,
        ).aggregate(s=Sum('amount'))['s'] or 0
        unsettled = stmts.filter(settled_at__isnull=True).exclude(
            status=PettyCashExpenseStatement.Status.DRAFT,
        ).count()
        overdue = services.overdue_statements(company)
        scope_ids = access.accessible_fund_ids(company, request.user)
        if scope_ids is not None:
            overdue = [row for row in overdue if row.get('fund_id') in scope_ids]
        near_limit = [
            {'id': f.id, 'title': f.title, 'balance': float(services.fund_balance(f)),
             'limit': float(f.limit or 0), 'percent': f.usage_percent}
            for f in funds if f.limit and f.usage_percent >= 90
        ]


        # مصرف بر اساس دسته
        by_category = []
        cat_rows = (
            txns.filter(entry_type='debit')
            .values('category__name')
            .annotate(total=Sum('amount'))
            .order_by('-total')
        )
        for row in cat_rows:
            by_category.append({'category': row['category__name'] or 'نامشخص', 'total': float(row['total'])})

        # مصرف بر اساس تنخواه‌دار
        by_custodian = []
        cust_rows = (
            txns.filter(entry_type='debit')
            .values('fund__custodian__first_name', 'fund__custodian__last_name')
            .annotate(total=Sum('amount'))
            .order_by('-total')
        )
        for row in cust_rows:
            by_custodian.append({
                'name': f"{row['fund__custodian__first_name'] or ''} {row['fund__custodian__last_name'] or ''}".strip(),
                'total': float(row['total']),
            })

        # وضعیت‌ها
        status_counts = {}
        for st in stmts.values('status').annotate(c=Count('id')):
            status_counts[st['status']] = st['c']

        # روند ۶ ماه اخیر
        monthly_trend = []
        import datetime
        months = []
        now = timezone.now()
        for i in range(5, -1, -1):
            y = now.year
            m = now.month - i
            while m <= 0:
                m += 12
                y -= 1
            months.append((y, m))
        for y, m in months:
            total = txns.filter(entry_type='debit', date__year=y, date__month=m).aggregate(s=Sum('amount'))['s'] or 0
            monthly_trend.append({'year': y, 'month': m, 'total': float(total)})

        # مصرف بر اساس پروژه (از سطرهای صورت هزینه)
        by_project = []
        proj_rows = (
            PettyCashExpenseStatementLine.objects
            .filter(statement__in=stmts, project__isnull=False)
            .values('project__name')
            .annotate(total=Sum('debit'))
            .order_by('-total')
        )
        for row in proj_rows:
            by_project.append({'project': row['project__name'] or 'نامشخص', 'total': float(row['total'])})

        # مصرف بر اساس سرفصل هزینه (کد معین)
        by_account = []
        acc_rows = (
            PettyCashExpenseStatementLine.objects
            .filter(statement__in=stmts)
            .values('account__code', 'account__name')
            .annotate(total=Sum('debit'))
            .order_by('-total')[:20]
        )
        for row in acc_rows:
            by_account.append({
                'code': row['account__code'],
                'account': row['account__name'],
                'total': float(row['total']),
            })

        # آخرین فعالیت‌ها
        recent_activity = []
        for tx in txns.select_related('fund').order_by('-created_at')[:10]:
            recent_activity.append({
                'type': 'transaction', 'id': tx.pk,
                'title': tx.title, 'fund': tx.fund.title,
                'amount': float(tx.amount), 'entry_type': tx.entry_type,
                'date': tx.date.isoformat(), 'created_at': tx.created_at,
            })
        for st in stmts.select_related('fund').order_by('-created_at')[:10]:
            recent_activity.append({
                'type': 'statement', 'id': st.pk,
                'title': st.number or st.pk, 'fund': st.fund.title,
                'amount': float(st.total), 'status': st.status,
                'date': st.date.isoformat(), 'created_at': st.created_at,
            })

        alerts = []
        if overdue:
            alerts.append({
                'level': 'error',
                'title': f'{len(overdue)} صورت هزینه از مهلت تسویه گذشته است',
                'count': len(overdue),
            })
        if near_limit:
            alerts.append({
                'level': 'warning',
                'title': f'{len(near_limit)} تنخواه به سقف اعتبار نزدیک شده است',
                'count': len(near_limit),
            })
        if reqs.filter(status=PettyCashRequest.Status.SUBMITTED).exists():
            alerts.append({
                'level': 'info',
                'title': f"{reqs.filter(status=PettyCashRequest.Status.SUBMITTED).count()} درخواست تنخواه در انتظار تأیید است",
                'count': reqs.filter(status=PettyCashRequest.Status.SUBMITTED).count(),
            })

        return Response({
            'total_balance': float(total_balance),
            'total_limit': float(total_limit),
            'active_funds': active_funds,
            'funds_count': funds.count(),
            'pending_total': float(pending_total),
            'approved_total': float(approved_total),
            'posted_total': float(posted_total),
            'monthly_spend': float(monthly_spend),
            'unsettled_count': unsettled,
            'overdue_count': len(overdue),
            'overdue': overdue[:20],
            'near_limit': near_limit,
            'pending_requests': reqs.filter(status=PettyCashRequest.Status.SUBMITTED).count(),
            'by_category': by_category,
            'by_custodian': by_custodian,
            'by_project': by_project,
            'by_account': by_account,
            'status_counts': status_counts,
            'monthly_trend': monthly_trend,
            'recent_activity': sorted(
                recent_activity, key=lambda row: row['created_at'], reverse=True,
            )[:12],
            'alerts': alerts,
            'total_statements': stmts.count(),
        })


    @action(detail=True, methods=['get'])
    def ledger(self, request, pk=None):
        """دفتر گردش تنخواه با ماندهٔ تجمعی سطر‌به‌سطر."""
        obj = self.get_object()
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        include_void = request.query_params.get('include_void') == '1'
        txs = obj.transactions.select_related('category', 'statement').order_by('date', 'created_at')
        if date_from:
            txs = txs.filter(date__gte=date_from)
        if date_to:
            txs = txs.filter(date__lte=date_to)
        if not include_void:
            txs = txs.filter(is_void=False)
        running = obj.opening_balance or Decimal('0')
        rows = []
        for tx in txs:
            if not tx.is_void:
                running += tx.signed_amount()
            data = PettyCashTransactionSerializer(tx, context={'request': request}).data
            data['running_balance'] = float(running)
            rows.append(data)
        credits = obj.transactions.filter(entry_type='credit', is_void=False).aggregate(
            s=Sum('amount'))['s'] or 0
        debits = obj.transactions.filter(entry_type='debit', is_void=False).aggregate(
            s=Sum('amount'))['s'] or 0
        return Response({
            'fund': PettyCashFundSerializer(obj).data,
            'opening_balance': obj.opening_balance,
            'total_credits': credits,
            'total_debits': debits,
            'balance': services.fund_balance(obj),
            'imprest_status': services.imprest_status(obj),
            'transactions': rows,
        })



class PettyCashExpenseStatementViewSet(FinancialViewSet):
    """صورت ریز هزینهٔ تنخواه با چرخهٔ ارسال/برگشت/ثبت."""
    serializer_class = PettyCashExpenseStatementSerializer
    queryset = PettyCashExpenseStatement.objects.all()
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]
    search_fields = ['number', 'description', 'fund__title', 'custodian__first_name', 'custodian__last_name']
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    ordering = ['-date', '-created_at']

    def get_queryset(self):
        qs = (
            super().get_queryset()
            .select_related('fund', 'custodian', 'project', 'cost_center')
            .prefetch_related('lines__account', 'lines__attachments', 'approval_steps')
        )
        # حذف نرم: به‌طور پیش‌فرض حذف‌شده‌ها نمایش داده نشوند
        if self.request.query_params.get('include_deleted') != '1':
            qs = qs.filter(is_deleted=False)
        fund_id = self.request.query_params.get('fund')
        if fund_id:
            qs = qs.filter(fund_id=fund_id)
        status_q = self.request.query_params.get('status')
        if status_q:
            qs = qs.filter(status=status_q)
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        custodian_id = self.request.query_params.get('custodian')
        if custodian_id:
            qs = qs.filter(custodian_id=custodian_id)
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(Q(project_id=project_id) | Q(lines__project_id=project_id)).distinct()
        cost_center_id = self.request.query_params.get('cost_center')
        if cost_center_id:
            qs = qs.filter(
                Q(cost_center_id=cost_center_id) | Q(lines__cost_center_id=cost_center_id),
            ).distinct()
        if self.request.query_params.get('unsettled') == '1':
            qs = qs.filter(settled_at__isnull=True).exclude(status='draft')
        if self.request.query_params.get('missing_document') == '1':
            qs = qs.filter(
                Q(lines__attachment='') | Q(lines__attachment__isnull=True),
            ).distinct()
        # تنخواه‌دار فقط صورت‌های خودش را ببیند
        if self.request.query_params.get('mine') == '1':
            emp_id = getattr(getattr(self.request.user, 'profile', None), 'employee_id', None)
            if emp_id:
                qs = qs.filter(custodian_id=emp_id)
        return qs


    @action(detail=False, methods=['post'])
    def bulk_action(self, request):
        """اکشن انبوه: submit/approve/return روی چند صورت (با کنترل‌های سرور)."""
        ids = request.data.get('ids', [])
        act = request.data.get('action')
        if act not in ('submit', 'approve', 'return'):
            return Response({'error': 'اکشن نامعتبر'}, status=400)
        done, errors = 0, []
        for st in self.get_queryset().filter(id__in=ids):
            try:
                if act == 'submit':
                    self._submit_statement(st, request.user)
                elif act == 'approve':
                    self._approve_statement(st, request.user, request.data.get('note', ''))
                else:
                    note = (request.data.get('note') or 'برگشت گروهی').strip()
                    st.status = PettyCashExpenseStatement.Status.REJECTED
                    st.history = [*st.history, {
                        'step': 'rejected', 'by': request.user.username,
                        'note': note, 'at': timezone.now().isoformat(),
                    }]
                    st.save(update_fields=['status', 'history', 'updated_at'])
                done += 1
            except PettyCashError as exc:
                errors.append({'id': st.pk, 'error': str(exc)})
        return Response({'count': done, 'errors': errors})

    def _submit_statement(self, st, user):
        services.validate_statement_for_submission(st)
        st.status = PettyCashExpenseStatement.Status.SUBMITTED
        st.submitted_by = user
        st.submitted_at = timezone.now()
        st.history = [*st.history, {
            'step': 'submitted', 'by': getattr(user, 'username', ''),
            'at': timezone.now().isoformat(),
        }]
        st.save(update_fields=['status', 'submitted_by', 'submitted_at', 'history', 'updated_at'])
        _notify(
            st.company, 'صورت هزینهٔ تنخواه ارسال شد',
            f'{st.custodian.full_name if st.custodian else ""} صورت {st.number or st.pk} را به حسابداری ارسال کرد.',
            entity_id=st.pk, priority='high',
        )
        try:
            from accounting.integrations import enqueue
            src = enqueue(
                company=st.company, source_module='pettycash',
                source_type='expense_statement', source_id=str(st.pk),
                payload={'total': str(st.total)},
            )
            if src and not st.source_transaction_id:
                st.source_transaction = src
                st.save(update_fields=['source_transaction'])
        except Exception:  # noqa: BLE001 — نبود موتور حسابداری نباید ارسال را بشکند
            pass
        services.audit('UPDATE', st, user=user, description='ارسال صورت هزینه به حسابداری')
        return st

    def _approve_statement(self, st, user, note=''):
        settings_obj = services.get_settings(st.company)
        services.assert_segregation(settings_obj, st.submitted_by_id, user, 'تأیید')
        if st.status != PettyCashExpenseStatement.Status.SUBMITTED:
            raise PettyCashError('فقط صورت ارسال‌شده قابل تأیید است.')
        services.validate_statement_for_submission(st)
        st.status = PettyCashExpenseStatement.Status.APPROVED
        st.approved_by = user
        st.approved_at = timezone.now()
        st.history = [*st.history, {
            'step': 'approved', 'by': getattr(user, 'username', ''),
            'note': note, 'at': timezone.now().isoformat(),
        }]
        st.save(update_fields=['status', 'approved_by', 'approved_at', 'history', 'updated_at'])
        services.audit('APPROVE', st, user=user, description=f'تأیید صورت هزینه. {note}'.strip())
        _notify(
            st.company, 'صورت هزینهٔ تنخواه تأیید شد',
            f'صورت {st.number or st.pk} تأیید شد.', entity_id=st.pk,
        )
        return st

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        st = self.get_object()
        try:
            self._approve_statement(st, request.user, request.data.get('note', ''))
        except PettyCashError as exc:
            return Response({'error': str(exc)}, status=400)
        return Response(PettyCashExpenseStatementSerializer(st).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        st = self.get_object()
        if st.status == PettyCashExpenseStatement.Status.POSTED:
            return Response({'error': 'صورت ثبت‌شده قابل برگشت نیست؛ از ابطال استفاده کنید.'}, status=400)
        note = (request.data.get('note') or '').strip()
        if not note:
            return Response({'error': 'علت برگشت الزامی است.'}, status=400)
        st.status = PettyCashExpenseStatement.Status.REJECTED
        st.history = [*st.history, {
            'step': 'rejected', 'by': request.user.username, 'note': note,
            'at': timezone.now().isoformat(),
        }]
        st.save(update_fields=['status', 'history', 'updated_at'])
        services.audit('REJECT', st, user=request.user, description=f'برگشت صورت هزینه: {note}')
        _notify(
            st.company, 'صورت هزینهٔ تنخواه برگشت خورد',
            f'صورت {st.number or st.pk} با علت «{note}» برگشت داده شد.',
            entity_id=st.pk, priority='high',
        )
        return Response(PettyCashExpenseStatementSerializer(st).data)

    @action(detail=True, methods=['post'])
    def upload_attachment(self, request, pk=None):
        """افزودن پیوست (چند فایل) به یک سطر هزینه."""
        st = self.get_object()
        if not st.is_editable:
            return Response({'error': 'در وضعیت جاری امکان افزودن پیوست نیست.'}, status=400)
        line = st.lines.filter(pk=request.data.get('line')).first()
        if not line:
            return Response({'error': 'سطر هزینه یافت نشد.'}, status=400)
        files = request.FILES.getlist('files') or request.FILES.getlist('file')
        if not files:
            return Response({'error': 'فایلی ارسال نشده است.'}, status=400)
        created = []
        for f in files:
            if f.size > 10 * 1024 * 1024:
                return Response({'error': f'فایل {f.name} بزرگ‌تر از ۱۰ مگابایت است.'}, status=400)
            obj = PettyCashExpenseAttachment.objects.create(
                company=st.company, line=line, file=f,
                title=request.data.get('title') or f.name[:200],
                kind=request.data.get('kind') or 'invoice',
                uploaded_by=request.user,
            )
            created.append(
                PettyCashExpenseAttachmentSerializer(obj, context={'request': request}).data
            )
        services.audit('UPDATE', st, user=request.user, description='افزودن پیوست به صورت هزینه')
        return Response({'attachments': created}, status=201)


    @action(detail=True, methods=['post'])
    def soft_delete(self, request, pk=None):
        """حذف نرم (قابل بازیابی) — فقط برای صورت‌های قابل ویرایش."""
        obj = self.get_object()
        if not obj.is_editable:
            return Response(
                {'error': 'صورت هزینه در وضعیت جاری قابل حذف نیست؛ ابتدا آن را برگشت دهید.'},
                status=400,
            )
        obj.is_deleted = True
        obj.deleted_at = timezone.now()
        obj.save(update_fields=['is_deleted', 'deleted_at', 'updated_at'])
        services.audit('DELETE', obj, user=request.user, description='حذف نرم صورت هزینه')
        return Response({'status': 'deleted'})

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        """بازیابی از سطل بازیافت."""
        obj = self.get_object()
        obj.is_deleted = False
        obj.deleted_at = None
        obj.save(update_fields=['is_deleted', 'deleted_at', 'updated_at'])
        services.audit('UPDATE', obj, user=request.user, description='بازیابی صورت هزینه')
        return Response({'status': 'restored'})

    def perform_create(self, serializer):
        company = _company(self.request)
        if not company:
            raise DRFValidationError({'error': 'شرکت مشخص نیست.'})
        fund = serializer.validated_data['fund']
        if not _fund_in_scope(self.request, fund):
            raise DRFValidationError({'error': 'این تنخواه در دامنهٔ دسترسی شما نیست.'})
        if not access.can_create_expense(company, self.request.user):
            raise DRFValidationError({'error': 'اجازهٔ ثبت صورت هزینه برای شما تعریف نشده است.'})
        st = serializer.save(company=company, custodian=fund.custodian)
        services.audit('CREATE', st, user=self.request.user, description='ایجاد صورت هزینه')

    def perform_update(self, serializer):
        st = serializer.save()
        services.audit('UPDATE', st, user=self.request.user, description='ویرایش صورت هزینه')

    @action(detail=False, methods=['get'])
    def calendar(self, request):
        """تقویم هزینه‌ها بر اساس تاریخ صورت."""
        qs = self.get_queryset().filter(is_deleted=False).select_related('fund', 'custodian')
        events = []
        for st in qs:
            events.append({
                'id': st.id,
                'date': st.date.isoformat(),
                'title': st.fund.title,
                'number': st.number or st.pk,
                'status': st.status,
                'total': float(st.total),
                'due_date': st.due_date.isoformat() if st.due_date else None,
            })
        return Response(events)

    @action(detail=True, methods=['post'])
    def sign(self, request, pk=None):
        """امضای دیجیتال نهایی‌سازی صورت."""
        st = self.get_object()
        if st.status != 'posted':
            return Response({'error': 'فقط صورت ثبت‌شده قابلیت امضا دارد.'}, status=400)
        settings_obj = services.get_settings(st.company)
        try:
            services.assert_segregation(settings_obj, st.submitted_by_id, request.user, 'امضا')
        except PettyCashError as exc:
            return Response({'error': str(exc)}, status=400)
        st.history = [*st.history, {
            'step': 'signed', 'by': request.user.username, 'at': timezone.now().isoformat(),
        }]
        st.save(update_fields=['history', 'updated_at'])
        return Response(PettyCashExpenseStatementSerializer(st).data)

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        st = self.get_object()
        if st.is_deleted:
            return Response({'error': 'صورت حذف‌شده را نمی‌توان ارسال کرد.'}, status=400)
        try:
            self._submit_statement(st, request.user)
        except PettyCashError as exc:
            return Response({'error': str(exc)}, status=400)
        return Response(PettyCashExpenseStatementSerializer(st).data)


    @action(detail=True, methods=['get'], url_path='pdf')
    def pdf(self, request, pk=None):
        """گزارش چاپی PDF صورت هزینهٔ تنخواه (HTML چاپی)."""
        from django.http import HttpResponse
        st = self.get_object()
        html = render_to_string('pettycash/statement_pdf.html', {
            'statement': st,
            'lines': st.lines.all().select_related('account').order_by('line_no'),
            'total': st.total,
        })
        response = HttpResponse(html, content_type='text/html; charset=utf-8')
        response['Content-Disposition'] = f'inline; filename="statement-{st.pk}.html"'
        return response

    @action(detail=False, methods=['get'])
    def export(self, request):
        """خروجی CSV صورت‌های هزینهٔ تنخواه."""
        import csv
        from django.http import HttpResponse
        qs = self.get_queryset().prefetch_related('lines')
        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = 'attachment; filename="petty_cash_expenses.csv"'
        writer = csv.writer(response)
        writer.writerow(['شماره', 'تاریخ', 'تنخواه', 'تنخواه‌دار', 'وضعیت', 'مبلغ', 'شرح'])
        for st in qs:
            writer.writerow([st.number or st.pk, st.date.isoformat(), st.fund.title, st.custodian.full_name if st.custodian else '', st.status, st.total, st.description])
        return response

    @action(detail=False, methods=['get'])
    def reminders(self, request):
        """یادآورها: صورت‌های draft/در انتظار که معطل مانده‌اند."""
        days = int(request.query_params.get('days', 3))
        cutoff = timezone.now() - timezone.timedelta(days=days)
        drafts = self.get_queryset().filter(status='draft', is_deleted=False, updated_at__lte=cutoff)
        submitted = self.get_queryset().filter(status='submitted', is_deleted=False, submitted_at__lte=cutoff)
        return Response({
            'drafts': PettyCashExpenseStatementSerializer(drafts, many=True).data,
            'submitted': PettyCashExpenseStatementSerializer(submitted, many=True).data,
            'draft_count': drafts.count(),
            'submitted_count': submitted.count(),
        })

    @action(detail=True, methods=['post'])
    def mark_status(self, request, pk=None):
        """به‌روزرسانی وضعیت از سمت حسابداری (approved/rejected/edited/posted)."""
        st = self.get_object()
        new_status = request.data.get('status')
        note = request.data.get('note', '')
        if new_status not in ['approved', 'rejected', 'edited', 'posted']:
            return Response({'error': 'وضعیت نامعتبر'}, status=400)
        if new_status == 'posted' and st.status == PettyCashExpenseStatement.Status.POSTED:
            # idempotent: ثبت دوباره اثر مالی ندارد
            return Response(PettyCashExpenseStatementSerializer(st).data)
        try:
            settings_obj = services.get_settings(st.company)
            if new_status in ('approved', 'posted'):
                services.assert_segregation(
                    settings_obj, st.submitted_by_id, request.user,
                    'تأیید' if new_status == 'approved' else 'ثبت نهایی',
                )
            if new_status in ('approved', 'posted'):
                services.validate_statement_for_submission(st)
            with db_transaction.atomic():
                st.status = new_status
                if new_status in ('approved', 'posted'):
                    st.approved_by = request.user
                    st.approved_at = timezone.now()
                st.history = [*st.history, {
                    'step': new_status, 'by': request.user.username,
                    'note': note, 'at': timezone.now().isoformat(),
                }]
                st.save(update_fields=[
                    'status', 'approved_by', 'approved_at', 'history', 'updated_at',
                ])
                if new_status == 'posted':
                    services.apply_statement_to_fund(st, user=request.user)
        except PettyCashError as exc:
            return Response({'error': str(exc)}, status=400)
        except Exception as exc:  # noqa: BLE001
            return Response({'error': f'خطا در ثبت نهایی: {exc}'}, status=400)
        # اعلان به تنخواه‌دار
        custodian_user = st.submitted_by_id or None
        _notify(
            st.company, f'صورت هزینهٔ تنخواه {st.get_status_display()}',
            f'وضعیت صورت {st.number or st.pk} تغییر کرد: {st.get_status_display()}',
            user_id=custodian_user, entity_id=st.pk,
        )
        services.audit(
            'APPROVE' if new_status == 'approved' else 'UPDATE',
            st, user=request.user, description=f'تغییر وضعیت به {new_status}. {note}'.strip(),
        )
        return Response(PettyCashExpenseStatementSerializer(st).data)

    @action(detail=False, methods=['get'])
    def compliance(self, request):
        """کنترل مستندات: صورت‌های فاقد پیوست، دارای مغایرت مبلغ و خارج از سقف."""
        qs = self.get_queryset().filter(is_deleted=False).prefetch_related('lines')
        settings_obj = services.get_settings(_company(request)) if _company(request) else None
        missing_docs, amount_mismatch, over_limit = [], [], []
        for st in qs:
            lines = list(st.lines.all())
            if any(not line.has_document for line in lines):
                missing_docs.append({'id': st.pk, 'number': st.number or st.pk, 'total': float(st.total)})
            for line in lines:
                if line.net_amount is not None:
                    expected = (line.net_amount or 0) + (line.vat_amount or 0) + (line.tax_amount or 0)
                    if expected != (line.debit or 0):
                        amount_mismatch.append({
                            'statement': st.pk, 'line': line.line_no,
                            'expected': float(expected), 'actual': float(line.debit or 0),
                        })
            if settings_obj and settings_obj.max_single_payment and st.total > settings_obj.max_single_payment:
                over_limit.append({'id': st.pk, 'number': st.number or st.pk, 'total': float(st.total)})
        return Response({
            'missing_document': missing_docs,
            'amount_mismatch': amount_mismatch,
            'over_limit': over_limit,
            'counts': {
                'missing_document': len(missing_docs),
                'amount_mismatch': len(amount_mismatch),
                'over_limit': len(over_limit),
            },
        })



class PettyCashTransactionViewSet(FinancialViewSet):
    serializer_class = PettyCashTransactionSerializer
    queryset = PettyCashTransaction.objects.all()
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description', 'reference', 'counterparty']
    ordering = ['-date', '-created_at']

    def get_queryset(self):
        qs = super().get_queryset().select_related('fund', 'category', 'project', 'cost_center')
        fund_id = self.request.query_params.get('fund')
        if fund_id:
            qs = qs.filter(fund_id=fund_id)
        entry_type = self.request.query_params.get('entry_type')
        if entry_type:
            qs = qs.filter(entry_type=entry_type)
        if self.request.query_params.get('include_void') != '1':
            qs = qs.filter(is_void=False)
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs

    def create(self, request, *args, **kwargs):
        """ثبت حرکت مالی با کنترل‌های کامل سرور (سقف، مانده، دوره، روش پرداخت)."""
        company = _company(request)
        if not company:
            return Response({'error': 'شرکت مشخص نیست'}, status=400)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        if not _fund_in_scope(request, data['fund']):
            return Response({'error': 'این تنخواه در دامنهٔ دسترسی شما نیست.'}, status=403)
        try:
            tx, created = services.register_movement(
                fund=data['fund'],
                entry_type=data['entry_type'],
                amount=data['amount'],
                title=data['title'],
                date=data['date'],
                user=request.user,
                description=data.get('description', ''),
                payment_method=data.get('payment_method'),
                project=data.get('project'),
                cost_center=data.get('cost_center'),
                counterparty=data.get('counterparty', ''),
                reference=data.get('reference', ''),
                receipt=data.get('receipt'),
                unique_key=request.data.get('unique_key', ''),
            )
        except PettyCashError as exc:
            return Response({'error': str(exc)}, status=400)
        if data.get('category'):
            tx.category = data['category']
            tx.save(update_fields=['category'])
        return Response(
            self.get_serializer(tx).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    def update(self, request, *args, **kwargs):
        obj = self.get_object()
        if obj.statement_id or obj.settlement_id:
            return Response(
                {'error': 'حرکت مالی متصل به سند قابل ویرایش نیست؛ برای اصلاح آن را ابطال کنید.'},
                status=400,
            )
        if obj.is_void:
            return Response({'error': 'حرکت ابطال‌شده قابل ویرایش نیست.'}, status=400)
        return super().update(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def void(self, request, pk=None):
        """ابطال حرکت مالی با ثبت علت (بدون حذف)."""
        obj = self.get_object()
        try:
            services.void_movement(obj, request.user, request.data.get('reason', ''))
        except PettyCashError as exc:
            return Response({'error': str(exc)}, status=400)
        return Response(self.get_serializer(obj).data)


    @action(detail=False, methods=['post'])
    def transfer(self, request):
        """انتقال وجه بین دو تنخواه (پرداخت از مبدأ + دریافت در مقصد)."""
        company = _company(request)
        source_id = request.data.get('from_fund')
        target_id = request.data.get('to_fund')
        amount = request.data.get('amount')
        date = request.data.get('date') or timezone.localdate()
        title = request.data.get('title') or 'انتقال بین تنخواه‌ها'
        if not source_id or not target_id:
            return Response({'error': 'تنخواه مبدأ و مقصد الزامی است.'}, status=400)
        if str(source_id) == str(target_id):
            return Response({'error': 'مبدأ و مقصد نمی‌توانند یکسان باشند.'}, status=400)
        source = PettyCashFund.objects.filter(company=company, pk=source_id).first()
        target = PettyCashFund.objects.filter(company=company, pk=target_id).first()
        if not source or not target:
            return Response({'error': 'تنخواه یافت نشد.'}, status=404)
        if not (_fund_in_scope(request, source) and _fund_in_scope(request, target)):
            return Response({'error': 'یکی از تنخواه‌ها در دامنهٔ دسترسی شما نیست.'}, status=403)
        try:
            with db_transaction.atomic():
                out_tx, _ = services.register_movement(
                    fund=source, entry_type=PettyCashTransaction.EntryType.DEBIT,
                    amount=amount, title=f'{title} → {target.title}', date=date,
                    user=request.user, counterparty=target.title,
                    description=request.data.get('description', ''),
                    unique_key=request.data.get('unique_key', '') or f'transfer:{source.pk}:{target.pk}:{amount}:{date}',
                )
                in_tx, _ = services.register_movement(
                    fund=target, entry_type=PettyCashTransaction.EntryType.CREDIT,
                    amount=amount, title=f'{title} ← {source.title}', date=date,
                    user=request.user, counterparty=source.title,
                    description=request.data.get('description', ''),
                    unique_key=f'tf-in:{out_tx.pk}',
                )
        except PettyCashError as exc:
            return Response({'error': str(exc)}, status=400)
        return Response({
            'out': self.get_serializer(out_tx).data,
            'in': self.get_serializer(in_tx).data,
        }, status=201)

    @action(detail=True, methods=['post'])
    def toggle_archive(self, request, pk=None):
        obj = self.get_object()
        obj.is_archived = not obj.is_archived
        obj.archived_at = timezone.now() if obj.is_archived else None
        obj.save(update_fields=['is_archived', 'archived_at', 'updated_at'])
        return Response(PettyCashTransactionSerializer(obj).data)



class PettyCashRequestViewSet(FinancialViewSet):
    """درخواست‌های تنخواه و کارتابل تأیید."""
    serializer_class = PettyCashRequestSerializer
    queryset = PettyCashRequest.objects.all()
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['number', 'reason', 'fund__title', 'custodian__first_name', 'custodian__last_name']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = super().get_queryset().select_related(
            'fund', 'custodian', 'project', 'cost_center', 'account',
        ).prefetch_related('approval_steps')
        for key in ('fund', 'custodian', 'kind', 'status', 'project'):
            value = self.request.query_params.get(key)
            if value:
                qs = qs.filter(**{key: value})
        if self.request.query_params.get('pending') == '1':
            qs = qs.filter(status=PettyCashRequest.Status.SUBMITTED)
        return qs

    def perform_create(self, serializer):
        company = _company(self.request)
        if not company:
            raise DRFValidationError({'error': 'شرکت مشخص نیست.'})
        fund = serializer.validated_data.get('fund')
        if fund is not None and not _fund_in_scope(self.request, fund):
            raise DRFValidationError({'error': 'این تنخواه در دامنهٔ دسترسی شما نیست.'})
        obj = serializer.save(company=company)
        services.audit('CREATE', obj, user=self.request.user, description='ایجاد درخواست تنخواه')

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        obj = self.get_object()
        if obj.status != PettyCashRequest.Status.DRAFT:
            return Response({'error': 'فقط درخواست پیش‌نویس قابل ارسال است.'}, status=400)
        obj.status = PettyCashRequest.Status.SUBMITTED
        obj.submitted_by = request.user
        obj.submitted_at = timezone.now()
        obj.history = [*obj.history, {
            'step': 'submitted', 'by': request.user.username,
            'at': timezone.now().isoformat(),
        }]
        obj.save(update_fields=['status', 'submitted_by', 'submitted_at', 'history', 'updated_at'])
        services.audit('UPDATE', obj, user=request.user, description='ارسال درخواست تنخواه')
        _notify(
            obj.company, 'درخواست تنخواه در انتظار تأیید',
            f'درخواست {obj.number or obj.pk} ({obj.get_kind_display()}) ارسال شد.',
            entity_type='petty_request', entity_id=obj.pk, priority='high',
        )
        return Response(PettyCashRequestSerializer(obj).data)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        obj = self.get_object()
        if obj.status != PettyCashRequest.Status.SUBMITTED:
            return Response({'error': 'فقط درخواست ارسال‌شده قابل تأیید است.'}, status=400)
        try:
            settings_obj = services.get_settings(obj.company)
            services.assert_segregation(settings_obj, obj.submitted_by_id, request.user, 'تأیید')
        except PettyCashError as exc:
            return Response({'error': str(exc)}, status=400)
        note = (request.data.get('note') or '').strip()
        obj.status = PettyCashRequest.Status.APPROVED
        obj.approved_by = request.user
        obj.approved_at = timezone.now()
        obj.decision_note = note
        obj.history = [*obj.history, {
            'step': 'approved', 'by': request.user.username, 'note': note,
            'at': timezone.now().isoformat(),
        }]
        obj.save(update_fields=[
            'status', 'approved_by', 'approved_at', 'decision_note', 'history', 'updated_at',
        ])
        services.audit('APPROVE', obj, user=request.user, description=f'تأیید درخواست. {note}'.strip())
        _notify(
            obj.company, 'درخواست تنخواه تأیید شد',
            f'درخواست {obj.number or obj.pk} تأیید شد.',
            entity_type='petty_request', entity_id=obj.pk,
        )
        return Response(PettyCashRequestSerializer(obj).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        obj = self.get_object()
        note = (request.data.get('note') or '').strip()
        if not note:
            return Response({'error': 'علت رد درخواست الزامی است.'}, status=400)
        obj.status = PettyCashRequest.Status.REJECTED
        obj.decision_note = note
        obj.history = [*obj.history, {
            'step': 'rejected', 'by': request.user.username, 'note': note,
            'at': timezone.now().isoformat(),
        }]
        obj.save(update_fields=['status', 'decision_note', 'history', 'updated_at'])
        services.audit('REJECT', obj, user=request.user, description=f'رد درخواست: {note}')
        return Response(PettyCashRequestSerializer(obj).data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        obj = self.get_object()
        if obj.status in (PettyCashRequest.Status.DONE, PettyCashRequest.Status.CANCELLED):
            return Response({'error': 'این درخواست قابل لغو نیست.'}, status=400)
        obj.status = PettyCashRequest.Status.CANCELLED
        obj.history = [*obj.history, {
            'step': 'cancelled', 'by': request.user.username,
            'at': timezone.now().isoformat(),
        }]
        obj.save(update_fields=['status', 'history', 'updated_at'])
        services.audit('UPDATE', obj, user=request.user, description='لغو درخواست تنخواه')
        return Response(PettyCashRequestSerializer(obj).data)


    @action(detail=True, methods=['post'])
    def execute(self, request, pk=None):
        """اجرای درخواست تأییدشده (شارژ، افزایش سقف، تمدید، تغییر تنخواه‌دار، بستن)."""
        obj = self.get_object()
        if obj.status != PettyCashRequest.Status.APPROVED:
            return Response({'error': 'فقط درخواست تأییدشده قابل اجراست.'}, status=400)
        try:
            with db_transaction.atomic():
                self._execute(obj, request.user)
        except PettyCashError as exc:
            return Response({'error': str(exc)}, status=400)
        return Response(PettyCashRequestSerializer(obj).data)

    def _execute(self, obj, user):
        kind = obj.kind
        fund = obj.fund
        today = timezone.localdate()
        if kind in (
            PettyCashRequest.Kind.FUND, PettyCashRequest.Kind.RECHARGE,
            PettyCashRequest.Kind.ADHOC, PettyCashRequest.Kind.MISSION,
        ):
            if not fund:
                raise PettyCashError('برای اجرای این درخواست، تنخواه الزامی است.')
            tx, _created = services.register_movement(
                fund=fund, entry_type=PettyCashTransaction.EntryType.CREDIT,
                amount=obj.amount, title=f'شارژ بر اساس درخواست {obj.number or obj.pk}',
                date=today, user=user, description=obj.reason,
                project=obj.project, cost_center=obj.cost_center,
                unique_key=f'request:{obj.pk}:credit',
            )
            obj.resulting_transaction = tx
        elif kind == PettyCashRequest.Kind.LIMIT_INCREASE:
            if not fund:
                raise PettyCashError('تنخواه مشخص نیست.')
            if (obj.amount or 0) > 0:
                fund.limit = (fund.limit or Decimal('0')) + obj.amount
            fund.save(update_fields=['limit', 'updated_at'])
        elif kind == PettyCashRequest.Kind.EXTEND:
            if not fund:
                raise PettyCashError('تنخواه مشخص نیست.')
            days = int(obj.amount or 0) or (fund.settlement_days or 30)
            fund.end_date = (fund.end_date or today) + timezone.timedelta(days=days)
            fund.save(update_fields=['end_date', 'updated_at'])
        elif kind == PettyCashRequest.Kind.CUSTODIAN_CHANGE:
            if not fund or not obj.custodian:
                raise PettyCashError('تنخواه و تنخواه‌دار جدید الزامی است.')
            if services.fund_balance(fund) != 0:
                raise PettyCashError('تنخواه با ماندهٔ غیرصفر قابل تغییر تنخواه‌دار نیست؛ ابتدا تسویه کنید.')
            fund.custodian = obj.custodian
            fund.save(update_fields=['custodian', 'updated_at'])
        elif kind == PettyCashRequest.Kind.CLOSE:
            if not fund:
                raise PettyCashError('تنخواه مشخص نیست.')
            if services.fund_balance(fund) != 0:
                raise PettyCashError('تنخواه با ماندهٔ غیرصفر قابل بستن نیست؛ ابتدا تسویه کنید.')
            fund.status = PettyCashFund.Status.ARCHIVED
            fund.archived_at = timezone.now()
            fund.save(update_fields=['status', 'archived_at', 'updated_at'])
        obj.status = PettyCashRequest.Status.DONE
        obj.history = [*obj.history, {
            'step': 'executed', 'by': getattr(user, 'username', ''),
            'at': timezone.now().isoformat(),
        }]
        obj.save(update_fields=['status', 'history', 'resulting_transaction', 'updated_at'])
        services.audit('UPDATE', obj, user=user, description=f'اجرای درخواست {obj.get_kind_display()}')



class PettyCashSettlementViewSet(FinancialViewSet):
    """تسویهٔ تنخواه: شمارش نقد، محاسبهٔ کسری/اضافه، برگشت وجه و شارژ مجدد."""
    serializer_class = PettyCashSettlementSerializer
    queryset = PettyCashSettlement.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['number', 'notes', 'fund__title', 'custodian__first_name', 'custodian__last_name']
    ordering = ['-date', '-created_at']

    def get_queryset(self):
        qs = super().get_queryset().select_related('fund', 'custodian').prefetch_related(
            'statements', 'approval_steps',
        )
        for key in ('fund', 'custodian', 'status'):
            value = self.request.query_params.get(key)
            if value:
                qs = qs.filter(**{key: value})
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        if self.request.query_params.get('open') == '1':
            qs = qs.filter(status__in=('draft', 'submitted', 'approved'))
        return qs

    def perform_create(self, serializer):
        company = _company(self.request)
        if not company:
            raise DRFValidationError({'error': 'شرکت مشخص نیست.'})
        fund = serializer.validated_data.get('fund')
        if fund is not None and not _fund_in_scope(self.request, fund):
            raise DRFValidationError({'error': 'این تنخواه در دامنهٔ دسترسی شما نیست.'})
        obj = serializer.save(company=company)
        services.audit('CREATE', obj, user=self.request.user, description='ایجاد تسویهٔ تنخواه')

    @action(detail=False, methods=['post'])
    def preview(self, request):
        """محاسبهٔ خلاصهٔ تسویه بدون ذخیره (برای فرم تسویه)."""
        company = _company(request)
        fund = PettyCashFund.objects.filter(company=company, pk=request.data.get('fund')).first()
        if not fund:
            return Response({'error': 'تنخواه یافت نشد.'}, status=404)
        qs = PettyCashExpenseStatement.objects.filter(company=company, fund=fund, is_deleted=False)
        ids = request.data.get('statements') or []
        if ids:
            qs = qs.filter(pk__in=ids)
        else:
            qs = qs.filter(settled_at__isnull=True).exclude(status='draft')
        statements = list(qs.prefetch_related('lines'))
        summary = services.settlement_summary(fund, statements, request.data.get('cash_counted', 0))
        summary['statements'] = [
            {
                'id': st.pk, 'number': st.number or st.pk, 'status': st.status,
                'total': float(st.total), 'due_date': st.due_date.isoformat() if st.due_date else None,
            }
            for st in statements
        ]
        summary['fund'] = {
            'id': fund.id, 'title': fund.title, 'kind': fund.kind,
            'balance': float(services.fund_balance(fund)),
        }
        return Response(summary)

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        obj = self.get_object()
        if obj.status != PettyCashSettlement.Status.DRAFT:
            return Response({'error': 'فقط تسویهٔ پیش‌نویس قابل ارسال است.'}, status=400)
        obj.status = PettyCashSettlement.Status.SUBMITTED
        obj.submitted_by = request.user
        obj.submitted_at = timezone.now()
        obj.history = [*obj.history, {
            'step': 'submitted', 'by': request.user.username, 'at': timezone.now().isoformat(),
        }]
        obj.save(update_fields=['status', 'submitted_by', 'submitted_at', 'history', 'updated_at'])
        services.audit('UPDATE', obj, user=request.user, description='ارسال تسویه برای تأیید')
        _notify(
            obj.company, 'تسویهٔ تنخواه در انتظار تأیید',
            f'تسویه {obj.number or obj.pk} برای تنخواه {obj.fund.title} ارسال شد.',
            entity_type='petty_settlement', entity_id=obj.pk, priority='high',
        )
        return Response(PettyCashSettlementSerializer(obj).data)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        obj = self.get_object()
        if obj.status != PettyCashSettlement.Status.SUBMITTED:
            return Response({'error': 'فقط تسویهٔ ارسال‌شده قابل تأیید است.'}, status=400)
        try:
            settings_obj = services.get_settings(obj.company)
            services.assert_segregation(settings_obj, obj.submitted_by_id, request.user, 'تأیید تسویه')
        except PettyCashError as exc:
            return Response({'error': str(exc)}, status=400)
        note = (request.data.get('note') or '').strip()
        obj.status = PettyCashSettlement.Status.APPROVED
        obj.approved_by = request.user
        obj.approved_at = timezone.now()
        obj.history = [*obj.history, {
            'step': 'approved', 'by': request.user.username, 'note': note,
            'at': timezone.now().isoformat(),
        }]
        obj.save(update_fields=['status', 'approved_by', 'approved_at', 'history', 'updated_at'])
        obj.statements.update(settled_at=timezone.now())
        services.audit('APPROVE', obj, user=request.user, description=f'تأیید تسویه. {note}'.strip())
        return Response(PettyCashSettlementSerializer(obj).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        obj = self.get_object()
        note = (request.data.get('note') or '').strip()
        if not note:
            return Response({'error': 'علت برگشت تسویه الزامی است.'}, status=400)
        obj.status = PettyCashSettlement.Status.REJECTED
        obj.history = [*obj.history, {
            'step': 'rejected', 'by': request.user.username, 'note': note,
            'at': timezone.now().isoformat(),
        }]
        obj.save(update_fields=['status', 'history', 'updated_at'])
        services.audit('REJECT', obj, user=request.user, description=f'برگشت تسویه: {note}')
        return Response(PettyCashSettlementSerializer(obj).data)


    @action(detail=True, methods=['post'])
    def post(self, request, pk=None):
        """ثبت نهایی تسویه: برگشت وجه به خزانه، شارژ مجدد (تنخواه ثابت) و ارسال به حسابداری."""
        obj = self.get_object()
        if obj.status == PettyCashSettlement.Status.POSTED:
            return Response(PettyCashSettlementSerializer(obj).data)
        if obj.status != PettyCashSettlement.Status.APPROVED:
            return Response({'error': 'فقط تسویهٔ تأییدشده قابل ثبت نهایی است.'}, status=400)
        try:
            with db_transaction.atomic():
                returned = services.money(obj.returned_amount)
                if returned > 0:
                    services.register_movement(
                        fund=obj.fund, entry_type=PettyCashTransaction.EntryType.DEBIT,
                        amount=returned, title=f'برگشت وجه تسویه {obj.number or obj.pk}',
                        date=obj.date, user=request.user, settlement=obj,
                        description=obj.notes,
                        unique_key=f'settlement:{obj.pk}:return',
                    )
                recharge = services.money(obj.recharge_amount)
                if recharge > 0:
                    services.register_movement(
                        fund=obj.fund, entry_type=PettyCashTransaction.EntryType.CREDIT,
                        amount=recharge, title=f'شارژ مجدد تنخواه ثابت ({obj.number or obj.pk})',
                        date=obj.date, user=request.user, settlement=obj,
                        description='شارژ مجدد بر اساس هزینه‌های تأییدشده',
                        unique_key=f'settlement:{obj.pk}:recharge',
                    )
                obj.status = PettyCashSettlement.Status.POSTED
                obj.history = [*obj.history, {
                    'step': 'posted', 'by': request.user.username,
                    'at': timezone.now().isoformat(),
                }]
                obj.save(update_fields=['status', 'history', 'updated_at'])
                obj.statements.update(settled_at=timezone.now())
                try:
                    from accounting.integrations import enqueue
                    src = enqueue(
                        company=obj.company, source_module='pettycash',
                        source_type='settlement', source_id=str(obj.pk),
                        payload={
                            'fund': obj.fund.title,
                            'expenses_total': str(obj.expenses_total),
                            'returned_amount': str(obj.returned_amount),
                            'recharge_amount': str(obj.recharge_amount),
                            'shortage': str(obj.shortage),
                            'overage': str(obj.overage),
                            'date': obj.date.isoformat(),
                        },
                    )
                    if src:
                        obj.source_transaction = src
                        obj.save(update_fields=['source_transaction'])
                except Exception:  # noqa: BLE001 — نبود صف حسابداری مانع ثبت نیست
                    pass
        except PettyCashError as exc:
            return Response({'error': str(exc)}, status=400)
        services.audit('UPDATE', obj, user=request.user, description='ثبت نهایی تسویهٔ تنخواه')
        return Response(PettyCashSettlementSerializer(obj).data)



class PettyCashReportViewSet(viewsets.ViewSet):
    """گزارش‌های تحلیلی تنخواه (فیلترپذیر و قابل خروجی CSV)."""

    def _company_or_error(self, request):
        company = _company(request)
        if not company:
            raise DRFValidationError({'error': 'شرکت مشخص نیست.'})
        return company

    def _filtered(self, request, qs, date_field='date'):
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        if date_from:
            qs = qs.filter(**{f'{date_field}__gte': date_from})
        if date_to:
            qs = qs.filter(**{f'{date_field}__lte': date_to})
        fund_id = request.query_params.get('fund')
        if fund_id:
            qs = qs.filter(fund_id=fund_id)
        custodian_id = request.query_params.get('custodian')
        if custodian_id:
            qs = qs.filter(fund__custodian_id=custodian_id)
        return qs

    def _csv(self, filename, headers, rows):
        import csv
        from django.http import HttpResponse
        response = HttpResponse(content_type='text/csv; charset=utf-8-sig')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        writer = csv.writer(response)
        writer.writerow(headers)
        for row in rows:
            writer.writerow(row)
        return response

    def _scoped_funds(self, request, qs):
        return access.scope_funds(qs, self._company_or_error(request), request.user)

    def _scoped_by_fund(self, request, qs, field='fund_id'):
        return access.scope_by_fund(qs, self._company_or_error(request), request.user, field=field)

    def _scoped_overdue(self, request, company):
        rows = services.overdue_statements(company)
        fund_ids = access.accessible_fund_ids(company, request.user)
        if fund_ids is None:
            return rows
        return [row for row in rows if row.get('fund_id') in fund_ids]


    @action(detail=False, methods=['get'])
    def summary(self, request):
        """گزارش وضعیت تنخواه‌ها و مانده هر تنخواه‌دار."""
        company = self._company_or_error(request)
        funds = self._scoped_funds(
            request, PettyCashFund.objects.filter(company=company).select_related('custodian'),
        )
        rows = []
        for fund in funds:
            status = services.imprest_status(fund)
            rows.append({
                'id': fund.id, 'code': fund.code, 'title': fund.title,
                'custodian': fund.custodian.full_name if fund.custodian else '',
                'kind': fund.kind, 'status': fund.status,
                'limit': float(fund.limit or 0),
                'balance': status['cash_balance'],
                'unsettled_documents': status['unsettled_documents'],
                'target_amount': status['target_amount'],
                'is_balanced': status['is_balanced'],
                'is_near_limit': status['is_near_limit'],
            })
        if request.query_params.get('export') == 'csv':
            return self._csv(
                'petty_cash_status.csv',
                ['کد', 'عنوان', 'تنخواه‌دار', 'نوع', 'سقف', 'مانده', 'اسناد تسویه‌نشده', 'مبلغ هدف'],
                [
                    [r['code'], r['title'], r['custodian'], r['kind'], r['limit'],
                     r['balance'], r['unsettled_documents'], r['target_amount']]
                    for r in rows
                ],
            )
        return Response({'results': rows, 'count': len(rows)})

    @action(detail=False, methods=['get'], url_path='custodian-performance')
    def custodian_performance(self, request):
        """عملکرد تنخواه‌داران: مصرف، تعداد صورت، مانده و تسویه‌های معوق."""
        company = self._company_or_error(request)
        funds = self._scoped_funds(
            request, PettyCashFund.objects.filter(company=company).select_related('custodian'),
        )
        overdue = self._scoped_overdue(request, company)
        stats = {}

        def ensure(custodian):
            key = custodian.id if custodian else 0
            return stats.setdefault(key, {
                'custodian': custodian.full_name if custodian else 'نامشخص',
                'employee_id': custodian.employee_id if custodian else '',
                'funds': 0, 'balance': 0.0, 'statements': 0, 'spent': 0.0, 'overdue': 0,
            })

        for fund in funds:
            row = ensure(fund.custodian)
            row['funds'] += 1
            row['balance'] += float(services.fund_balance(fund))
        stmts = self._scoped_by_fund(request, self._filtered(
            request,
            PettyCashExpenseStatement.objects.filter(company=company, is_deleted=False),
        )).select_related('custodian').prefetch_related('lines')
        for st in stmts:
            row = ensure(st.custodian)
            row['statements'] += 1
            if st.status in ('approved', 'posted'):
                row['spent'] += float(st.total)
        for item in overdue:
            for row in stats.values():
                if row['custodian'] == item['custodian']:
                    row['overdue'] += 1
        results = sorted(stats.values(), key=lambda r: r['spent'], reverse=True)
        if request.query_params.get('export') == 'csv':
            return self._csv(
                'petty_cash_custodian_performance.csv',
                ['تنخواه‌دار', 'کد پرسنلی', 'تعداد تنخواه', 'مانده', 'تعداد صورت', 'مصرف تأییدشده', 'تسویه معوق'],
                [
                    [r['custodian'], r['employee_id'], r['funds'], r['balance'],
                     r['statements'], r['spent'], r['overdue']]
                    for r in results
                ],
            )
        return Response({'results': results, 'count': len(results)})


    @action(detail=False, methods=['get'])
    def by_category(self, request):
        """هزینه به تفکیک سرفصل/دستهٔ هزینه."""
        company = self._company_or_error(request)
        qs = self._filtered(
            request,
            PettyCashExpenseStatementLine.objects.filter(
                company=company, statement__is_deleted=False,
            ).exclude(statement__status='draft'),
            date_field='expense_date',
        )
        qs = self._scoped_by_fund(request, qs, field='statement__fund_id')
        rows = list(
            qs.values('category__name', 'account__code', 'account__name')
            .annotate(total=Sum('debit'), count=Count('id'))
            .order_by('-total')
        )
        results = [
            {
                'category': r['category__name'] or 'نامشخص',
                'account_code': r['account__code'],
                'account': r['account__name'],
                'total': float(r['total'] or 0),
                'count': r['count'],
            }
            for r in rows
        ]
        if request.query_params.get('export') == 'csv':
            return self._csv(
                'petty_cash_by_category.csv',
                ['دسته', 'کد معین', 'سرفصل', 'مبلغ', 'تعداد'],
                [[r['category'], r['account_code'], r['account'], r['total'], r['count']]
                 for r in results],
            )
        return Response({'results': results, 'count': len(results)})

    @action(detail=False, methods=['get'])
    def by_project(self, request):
        """هزینه به تفکیک پروژه و مرکز هزینه."""
        company = self._company_or_error(request)
        qs = PettyCashExpenseStatementLine.objects.filter(
            company=company, statement__is_deleted=False,
        ).exclude(statement__status='draft')
        qs = self._scoped_by_fund(request, qs, field='statement__fund_id')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        if date_from:
            qs = qs.filter(statement__date__gte=date_from)
        if date_to:
            qs = qs.filter(statement__date__lte=date_to)
        project_id = request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)
        rows = list(
            qs.values('project__code', 'project__name', 'cost_center__name')
            .annotate(total=Sum('debit'), count=Count('id'))
            .order_by('-total')
        )
        results = [
            {
                'project_code': r['project__code'] or '',
                'project': r['project__name'] or 'بدون پروژه',
                'cost_center': r['cost_center__name'] or '',
                'total': float(r['total'] or 0),
                'count': r['count'],
            }
            for r in rows
        ]
        if request.query_params.get('export') == 'csv':
            return self._csv(
                'petty_cash_by_project.csv',
                ['کد پروژه', 'پروژه', 'مرکز هزینه', 'مبلغ', 'تعداد'],
                [[r['project_code'], r['project'], r['cost_center'], r['total'], r['count']]
                 for r in results],
            )
        return Response({'results': results, 'count': len(results)})

    @action(detail=False, methods=['get'])
    def cashflow(self, request):
        """گردش دریافت و پرداخت در بازه."""
        company = self._company_or_error(request)
        qs = self._filtered(
            request,
            PettyCashTransaction.objects.filter(company=company, is_void=False),
        )
        qs = self._scoped_by_fund(request, qs)
        credits = qs.filter(entry_type='credit').aggregate(s=Sum('amount'))['s'] or 0
        debits = qs.filter(entry_type='debit').aggregate(s=Sum('amount'))['s'] or 0
        results = [
            {
                'id': tx.pk, 'date': tx.date.isoformat(), 'fund': tx.fund.title,
                'entry_type': tx.entry_type, 'amount': float(tx.amount),
                'title': tx.title, 'payment_method': tx.payment_method,
                'reference': tx.reference, 'counterparty': tx.counterparty,
            }
            for tx in qs.select_related('fund').order_by('date', 'id')
        ]
        if request.query_params.get('export') == 'csv':
            return self._csv(
                'petty_cash_cashflow.csv',
                ['تاریخ', 'تنخواه', 'نوع', 'مبلغ', 'عنوان', 'روش پرداخت', 'شماره سند', 'طرف حساب'],
                [[r['date'], r['fund'], r['entry_type'], r['amount'], r['title'],
                  r['payment_method'], r['reference'], r['counterparty']] for r in results],
            )
        return Response({
            'results': results,
            'totals': {
                'credits': float(credits), 'debits': float(debits),
                'net': float(credits - debits),
            },
            'count': len(results),
        })


    @action(detail=False, methods=['get'], url_path='credit-vs-usage')
    def credit_vs_usage(self, request):
        """اعتبار در برابر مصرف هر تنخواه."""
        company = self._company_or_error(request)
        funds = self._scoped_funds(
            request, PettyCashFund.objects.filter(company=company).select_related('custodian'),
        )
        results = []
        for fund in funds:
            status = services.imprest_status(fund)
            limit = float(fund.limit or fund.target_amount or 0)
            balance = status['cash_balance']
            spent = float(max(limit - balance, 0)) if limit else 0.0
            results.append({
                'id': fund.id, 'title': fund.title,
                'custodian': fund.custodian.full_name if fund.custodian else '',
                'limit': limit, 'spent': spent, 'balance': balance,
                'usage_percent': round(spent / limit * 100, 2) if limit else 0.0,
            })
        return Response({'results': results, 'count': len(results)})

    @action(detail=False, methods=['get'])
    def overdue(self, request):
        """تسویه‌های معوق و تأخیر در تسویه."""
        company = self._company_or_error(request)
        results = self._scoped_overdue(request, company)
        if request.query_params.get('export') == 'csv':
            return self._csv(
                'petty_cash_overdue.csv',
                ['شماره صورت', 'تنخواه', 'تنخواه‌دار', 'مهلت تسویه', 'روز تأخیر', 'مبلغ'],
                [[r['number'], r['fund'], r['custodian'], r['due_date'], r['days_late'], r['total']]
                 for r in results],
            )
        return Response({'results': results, 'count': len(results)})

    @action(detail=False, methods=['get'])
    def settlements(self, request):
        """تاریخچهٔ تسویه‌ها با کسری/اضافه و شارژ مجدد."""
        company = self._company_or_error(request)
        qs = self._filtered(
            request,
            PettyCashSettlement.objects.filter(company=company).select_related('fund', 'custodian'),
        )
        qs = access.scope_by_custodian(qs, company, request.user)
        results = [
            {
                'id': s.pk, 'number': s.number or s.pk, 'date': s.date.isoformat(),
                'fund': s.fund.title, 'custodian': s.custodian.full_name if s.custodian else '',
                'status': s.status, 'cash_counted': float(s.cash_counted),
                'expenses_total': float(s.expenses_total), 'returned_amount': float(s.returned_amount),
                'shortage': float(s.shortage), 'overage': float(s.overage),
                'recharge_amount': float(s.recharge_amount),
            }
            for s in qs
        ]
        return Response({'results': results, 'count': len(results)})


    @action(detail=False, methods=['get'])
    def details(self, request):
        """گزارش دهی جزئیات: ریز صورت‌های هزینه یا ریز حرکات مالی با فیلتر و جمع کل."""
        company = self._company_or_error(request)
        kind = request.query_params.get('kind', 'statements')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        fund_id = request.query_params.get('fund')
        custodian_id = request.query_params.get('custodian')
        project_id = request.query_params.get('project')
        status_q = request.query_params.get('status')

        rows = []
        totals = {'count': 0, 'amount': 0.0}
        if kind == 'transactions':
            qs = PettyCashTransaction.objects.filter(
                company=company, is_void=False,
            ).select_related('fund', 'fund__custodian', 'project', 'cost_center', 'category')
            if date_from:
                qs = qs.filter(date__gte=date_from)
            if date_to:
                qs = qs.filter(date__lte=date_to)
            if fund_id:
                qs = qs.filter(fund_id=fund_id)
            if custodian_id:
                qs = qs.filter(fund__custodian_id=custodian_id)
            if project_id:
                qs = qs.filter(project_id=project_id)
            qs = access.scope_by_fund(qs, company, request.user)
            for tx in qs.order_by('date', 'id')[:2000]:
                rows.append({
                    'date': tx.date.isoformat(),
                    'type': 'دریافت' if tx.entry_type == 'credit' else 'پرداخت',
                    'number': tx.reference or tx.pk,
                    'fund': tx.fund.title,
                    'custodian': tx.fund.custodian.full_name if tx.fund.custodian_id else '',
                    'project': tx.project.name if tx.project_id else '',
                    'cost_center': tx.cost_center.name if tx.cost_center_id else '',
                    'description': tx.title,
                    'status': 'ابطال‌شده' if tx.is_void else 'ثبت‌شده',
                    'payment_method': tx.get_payment_method_display(),
                    'amount': float(tx.amount),
                })
                totals['count'] += 1
                totals['amount'] += float(tx.amount)
        else:
            qs = PettyCashExpenseStatement.objects.filter(
                company=company, is_deleted=False,
            ).select_related('fund', 'fund__custodian', 'project', 'cost_center').prefetch_related('lines')
            if date_from:
                qs = qs.filter(date__gte=date_from)
            if date_to:
                qs = qs.filter(date__lte=date_to)
            if fund_id:
                qs = qs.filter(fund_id=fund_id)
            if custodian_id:
                qs = qs.filter(custodian_id=custodian_id)
            if project_id:
                qs = qs.filter(Q(project_id=project_id) | Q(lines__project_id=project_id)).distinct()
            if status_q:
                qs = qs.filter(status=status_q)
            qs = access.scope_by_fund(qs, company, request.user)
            as_of = timezone.localdate()
            for st in qs.order_by('-date', '-id')[:2000]:
                lines = list(st.lines.all())
                rows.append({
                    'date': st.date.isoformat(),
                    'type': 'صورت هزینه',
                    'number': st.number or st.pk,
                    'fund': st.fund.title,
                    'custodian': st.custodian.full_name if st.custodian_id else '',
                    'project': st.project.name if st.project_id else (
                        lines[0].project.name if lines and lines[0].project_id else ''
                    ),
                    'cost_center': st.cost_center.name if st.cost_center_id else '',
                    'description': st.description or (lines[0].description if lines else ''),
                    'status': st.get_status_display(),
                    'payment_method': st.get_payment_method_display(),
                    'lines_count': len(lines),
                    'missing_documents': sum(1 for line in lines if not line.has_document),
                    'due_date': st.due_date.isoformat() if st.due_date else '',
                    'days_late': max((as_of - st.due_date).days, 0) if st.due_date else 0,
                    'amount': float(st.total),
                })
                totals['count'] += 1
                totals['amount'] += float(st.total)

        if request.query_params.get('export') == 'csv':
            headers = ['تاریخ', 'نوع', 'شماره', 'تنخواه', 'تنخواه‌دار', 'پروژه', 'مرکز هزینه',
                       'شرح', 'وضعیت', 'روش پرداخت', 'مبلغ']
            return self._csv(
                f'petty_cash_details_{kind}.csv',
                headers,
                [[r.get('date'), r.get('type'), r.get('number'), r.get('fund'), r.get('custodian'),
                  r.get('project'), r.get('cost_center'), r.get('description'), r.get('status'),
                  r.get('payment_method'), r.get('amount')] for r in rows],
            )
        return Response({'kind': kind, 'results': rows, 'totals': totals, 'count': len(rows)})

    @action(detail=False, methods=['get'], url_path='compliance-summary')
    def compliance_summary(self, request):
        """خلاصهٔ کنترل مستندات: فاقد پیوست / مغایرت مبلغ / خارج از سقف."""
        company = self._company_or_error(request)
        qs = PettyCashExpenseStatement.objects.filter(
            company=company, is_deleted=False,
        ).select_related('fund').prefetch_related('lines')
        qs = access.scope_by_fund(qs, company, request.user)
        settings_obj = services.get_settings(company)
        missing_docs, amount_mismatch, over_limit = [], [], []
        for st in qs[:2000]:
            lines = list(st.lines.all())
            if any(not line.has_document for line in lines):
                missing_docs.append({
                    'id': st.pk, 'number': st.number or st.pk, 'date': st.date.isoformat(),
                    'fund': st.fund.title, 'amount': float(st.total),
                    'status': st.get_status_display(),
                })
            for line in lines:
                if line.net_amount is not None:
                    expected = (line.net_amount or 0) + (line.vat_amount or 0) + (line.tax_amount or 0)
                    if expected != (line.debit or 0):
                        amount_mismatch.append({
                            'id': st.pk, 'number': st.number or st.pk, 'line': line.line_no,
                            'expected': float(expected), 'actual': float(line.debit or 0),
                        })
            if settings_obj and settings_obj.max_single_payment and st.total > settings_obj.max_single_payment:
                over_limit.append({
                    'id': st.pk, 'number': st.number or st.pk, 'date': st.date.isoformat(),
                    'amount': float(st.total),
                })
        return Response({
            'missing_document': missing_docs,
            'amount_mismatch': amount_mismatch,
            'over_limit': over_limit,
            'counts': {
                'missing_document': len(missing_docs),
                'amount_mismatch': len(amount_mismatch),
                'over_limit': len(over_limit),
            },
        })

