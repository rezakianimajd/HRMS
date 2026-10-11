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
        qs = super().get_queryset().select_related('wbs', 'cbs', 'resource')
        transaction_id = self.request.query_params.get('transaction')
        if transaction_id:
            qs = qs.filter(transaction_id=transaction_id)
        return qs


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