"""Views for the Accounting module.

Business logic lives in `accounting.services`; these ViewSets are thin and
expose the lifecycle actions (submit/approve/post/lock/reverse) via @action.
"""
from django.utils import timezone
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response

from accounting.models import (
    Branch, FiscalYear, FiscalPeriod, AccountingBook,
    AccountType, AccountGroup, Account, AuxiliaryAccount,
    AccountingDimension, DimensionValue, CostCenter,
    Journal, AccountingDocument, AccountingDocumentLine,
    AccountingDocumentDimension, AccountingSequence,
    SourceTransaction, PostingBatch, PostingTemplate, PostingTemplateLine,
    AccountingSettings,
)
from accounting.serializers import (
    BranchSerializer, FiscalYearSerializer, FiscalPeriodSerializer,
    AccountingBookSerializer, AccountTypeSerializer, AccountGroupSerializer,
    AccountSerializer, AuxiliaryAccountSerializer, AccountingDimensionSerializer,
    DimensionValueSerializer, CostCenterSerializer, JournalSerializer,
    AccountingDocumentSerializer, AccountingSequenceSerializer,
    SourceTransactionSerializer, PostingTemplateSerializer, AccountingSettingsSerializer,
)
from accounting.services import PostingService, SourcePostingService, AccountingError


def _company(request):
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


class CompanyScopedViewSet(viewsets.ModelViewSet):
    """Base class: filters by tenant company and assigns it on create."""
    def get_queryset(self):
        qs = super().get_queryset()
        company = _company(self.request)
        if company:
            qs = qs.filter(company=company)
        return qs

    def perform_create(self, serializer):
        serializer.save(company=_company(self.request))


class BranchViewSet(CompanyScopedViewSet):
    serializer_class = BranchSerializer
    queryset = Branch.objects.prefetch_related('cost_centers')
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['code', 'name']
    ordering = ['code']


class FiscalYearViewSet(CompanyScopedViewSet):
    serializer_class = FiscalYearSerializer
    queryset = FiscalYear.objects.all()
    filter_backends = [filters.OrderingFilter]
    ordering = ['-start_date']

    @action(detail=True, methods=['post'])
    def set_current(self, request, pk=None):
        FiscalYear.objects.filter(company=self.get_object().company_id).update(is_current=False)
        self.get_object().is_current = True
        self.get_object().save(update_fields=['is_current', 'updated_at'])
        return Response(FiscalYearSerializer(self.get_object()).data)


class FiscalPeriodViewSet(CompanyScopedViewSet):
    serializer_class = FiscalPeriodSerializer
    queryset = FiscalPeriod.objects.select_related('fiscal_year')
    ordering = ['start_date']

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        obj = self.get_object()
        obj.status = 'closed'
        obj.save(update_fields=['status', 'updated_at'])
        return Response(FiscalPeriodSerializer(obj).data)

    @action(detail=True, methods=['post'])
    def reopen(self, request, pk=None):
        obj = self.get_object()
        obj.status = 'open'
        obj.save(update_fields=['status', 'updated_at'])
        return Response(FiscalPeriodSerializer(obj).data)


class AccountingBookViewSet(CompanyScopedViewSet):
    serializer_class = AccountingBookSerializer
    queryset = AccountingBook.objects.all()
    search_fields = ['code', 'name']
    ordering = ['code']


DEFAULT_ACCOUNT_TYPES = [
    ('asset', 'دارایی', 'asset', 'debit', 1),
    ('liability', 'بدهی', 'liability', 'credit', 2),
    ('equity', 'حقوق مالکانه', 'equity', 'credit', 3),
    ('revenue', 'درآمد', 'revenue', 'credit', 4),
    ('expense', 'هزینه', 'expense', 'none', 5),
    ('cost_of_sales', 'بهای تمام‌شده', 'cost_of_sales', 'debit', 6),
    ('memorandum', 'حساب‌های انتظامی', 'memorandum', 'none', 7),
]


class AccountTypeViewSet(CompanyScopedViewSet):
    serializer_class = AccountTypeSerializer
    queryset = AccountType.objects.all()
    search_fields = ['code', 'name']
    ordering = ['code']

    def get_queryset(self):
        qs = super().get_queryset()
        company = _company(self.request)
        if company:
            # همیشه سید را همگام کن (upsert) تا لیست استاندارد دقیقاً مطابق تعریف باشد
            for code, name, category, nature, order in DEFAULT_ACCOUNT_TYPES:
                AccountType.objects.update_or_create(
                    company=company,
                    code=code,
                    defaults={'name': name, 'category': category, 'default_nature': nature, 'sort_order': order},
                )
            qs = super().get_queryset()
        return qs

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        if obj.accounts.exists() or obj.groups.exists():
            return Response({'error': 'این نوع حساب، حساب/گروه دارد و قابل حذف نیست.'}, status=400)
        return super().destroy(request, *args, **kwargs)


class AccountGroupViewSet(CompanyScopedViewSet):
    serializer_class = AccountGroupSerializer
    queryset = AccountGroup.objects.select_related('account_type')
    search_fields = ['code', 'name']
    ordering = ['code']

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        if obj.accounts.exists():
            return Response({'error': 'این گروه حساب، حساب دارد و قابل حذف نیست.'}, status=400)
        if obj.children.exists():
            return Response({'error': 'این گروه حساب، زیرگروه دارد و قابل حذف نیست.'}, status=400)
        return super().destroy(request, *args, **kwargs)


class _NoDeleteWithLinesMixin:
    use_lines_rel = 'lines'
    use_template_lines_rel = 'posting_template_lines'

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        if getattr(obj, self.use_lines_rel).exists():
            return Response({'error': 'این کد در سند حسابداری استفاده شده و قابل حذف نیست.'}, status=400)
        if getattr(obj, self.use_template_lines_rel).exists():
            return Response({'error': 'این کد در قالب ثبت استفاده شده و قابل حذف نیست.'}, status=400)
        return super().destroy(request, *args, **kwargs)


class AccountViewSet(_NoDeleteWithLinesMixin, CompanyScopedViewSet):
    serializer_class = AccountSerializer
    queryset = Account.objects.select_related('account_type', 'group', 'parent')
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['code', 'name']
    ordering = ['code']

    def get_queryset(self):
        qs = super().get_queryset()
        kind = self.request.query_params.get('kind')
        if kind == 'general':
            qs = qs.filter(parent__isnull=True)
        elif kind == 'subsidiary':
            qs = qs.filter(parent__isnull=False)
        return qs


class AuxiliaryAccountViewSet(CompanyScopedViewSet):
    serializer_class = AuxiliaryAccountSerializer
    queryset = AuxiliaryAccount.objects.select_related('account', 'parent')
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['code', 'name']
    ordering = ['code']

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        if obj.lines.exists():
            return Response({'error': 'این تفصیلی در سند استفاده شده و قابل حذف نیست.'}, status=400)
        if obj.children.exists():
            return Response({'error': 'این تفصیلی، تفصیلی زیرمجموعه دارد و قابل حذف نیست.'}, status=400)
        return super().destroy(request, *args, **kwargs)


class AccountingDimensionViewSet(CompanyScopedViewSet):
    serializer_class = AccountingDimensionSerializer
    queryset = AccountingDimension.objects.all()
    search_fields = ['code', 'name']
    ordering = ['code']


class DimensionValueViewSet(CompanyScopedViewSet):
    serializer_class = DimensionValueSerializer
    queryset = DimensionValue.objects.select_related('dimension')
    search_fields = ['code', 'name']
    ordering = ['dimension', 'code']


class CostCenterViewSet(CompanyScopedViewSet):
    serializer_class = CostCenterSerializer
    queryset = CostCenter.objects.select_related('parent', 'branch')
    search_fields = ['code', 'name']
    ordering = ['code']

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        if obj.lines.exists():
            return Response({'error': 'این مرکز هزینه در سند استفاده شده و قابل حذف نیست.'}, status=400)
        if obj.children.exists():
            return Response({'error': 'این مرکز هزینه، زیرمجموعه دارد و قابل حذف نیست.'}, status=400)
        return super().destroy(request, *args, **kwargs)


class JournalViewSet(CompanyScopedViewSet):
    serializer_class = JournalSerializer
    queryset = Journal.objects.all()
    search_fields = ['code', 'name']
    ordering = ['code']


class AccountingDocumentViewSet(CompanyScopedViewSet):
    serializer_class = AccountingDocumentSerializer
    queryset = AccountingDocument.objects.select_related(
        'branch', 'journal', 'fiscal_year', 'period',
    ).prefetch_related('lines__account')
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['number', 'description']
    ordering = ['-date', '-created_at']

    def get_queryset(self):
        qs = super().get_queryset()
        status = self.request.query_params.get('status')
        if status:
            qs = qs.filter(status=status)
        return qs

    def _service(self, obj):
        return PostingService(obj, user=self.request.user)

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        try:
            self._service(self.get_object()).submit()
        except AccountingError as e:
            return Response({'error': str(e)}, status=400)
        return Response(AccountingDocumentSerializer(self.get_object()).data)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        try:
            self._service(self.get_object()).approve()
        except AccountingError as e:
            return Response({'error': str(e)}, status=400)
        return Response(AccountingDocumentSerializer(self.get_object()).data)

    @action(detail=True, methods=['post'])
    def post_document(self, request, pk=None):
        try:
            self._service(self.get_object()).post()
        except AccountingError as e:
            return Response({'error': str(e)}, status=400)
        return Response(AccountingDocumentSerializer(self.get_object()).data)

    @action(detail=True, methods=['post'])
    def lock(self, request, pk=None):
        try:
            self._service(self.get_object()).lock()
        except AccountingError as e:
            return Response({'error': str(e)}, status=400)
        return Response(AccountingDocumentSerializer(self.get_object()).data)

    @action(detail=True, methods=['post'])
    def reverse(self, request, pk=None):
        try:
            reversal = self._service(self.get_object()).reverse()
        except AccountingError as e:
            return Response({'error': str(e)}, status=400)
        return Response(AccountingDocumentSerializer(reversal).data)


class AccountingSequenceViewSet(CompanyScopedViewSet):
    serializer_class = AccountingSequenceSerializer
    queryset = AccountingSequence.objects.select_related('journal', 'fiscal_year', 'branch')
    ordering = ['journal', 'fiscal_year']


class SourceTransactionViewSet(CompanyScopedViewSet):
    serializer_class = SourceTransactionSerializer
    queryset = SourceTransaction.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['source_module', 'source_type', 'source_id']
    ordering = ['-created_at']

    @action(detail=True, methods=['get'])
    def preview(self, request, pk=None):
        """پیش‌نمایش سند حاصل از قالب ثبت برای یک تراکنش منبع."""
        source = self.get_object()
        template_id = request.query_params.get('template_id')
        template = PostingTemplate.objects.filter(id=template_id).first() if template_id else None
        if not template:
            return Response({'error': 'template_id الزامی است'}, status=400)
        svc = SourcePostingService(source, template, None, None, user=request.user)
        return Response(svc.preview())

    @action(detail=True, methods=['post'])
    def post_from_template(self, request, pk=None):
        """ثبت سند حسابداری از تراکنش منبع با قالب ثبت (idempotent)."""
        source = self.get_object()
        template_id = request.data.get('template_id')
        template = PostingTemplate.objects.filter(id=template_id).first() if template_id else None
        if not template:
            return Response({'error': 'template_id الزامی است'}, status=400)
        year_id = request.data.get('fiscal_year')
        period_id = request.data.get('period')
        year = FiscalYear.objects.filter(id=year_id).first() if year_id else None
        period = FiscalPeriod.objects.filter(id=period_id).first() if period_id else None
        if not year or not period:
            return Response({'error': 'سال مالی و دورهٔ معتبر الزامی است'}, status=400)
        try:
            doc = SourcePostingService(source, template, year, period, user=request.user).post()
        except AccountingError as e:
            return Response({'error': str(e)}, status=400)
        return Response(AccountingDocumentSerializer(doc).data)


class PostingTemplateViewSet(CompanyScopedViewSet):
    serializer_class = PostingTemplateSerializer
    queryset = PostingTemplate.objects.select_related('journal').prefetch_related('lines')
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['code', 'name', 'source_module']
    ordering = ['code']


class AccountingSettingsViewSet(CompanyScopedViewSet):
    serializer_class = AccountingSettingsSerializer
    queryset = AccountingSettings.objects.select_related('base_currency', 'default_branch')