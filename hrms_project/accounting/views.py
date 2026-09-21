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
    AccountType, AccountGroup, Account, AuxiliaryAccount, AuxiliaryCategory,
    AccountingDimension, DimensionValue, CostCenter,
    Journal, AccountingDocument, AccountingDocumentLine,
    AccountingDocumentDimension, AccountingSequence,
    SourceTransaction, PostingBatch, PostingTemplate, PostingTemplateLine,
    AccountingSettings, CodingConfig,
)
from accounting.serializers import (
    BranchSerializer, FiscalYearSerializer, FiscalPeriodSerializer,
    AccountingBookSerializer, AccountTypeSerializer, AccountGroupSerializer,
    AccountSerializer, AuxiliaryAccountSerializer, AuxiliaryCategorySerializer,
    AccountingDimensionSerializer,
    DimensionValueSerializer, CostCenterSerializer, JournalSerializer,
    AccountingDocumentSerializer, AccountingSequenceSerializer,
    SourceTransactionSerializer, PostingTemplateSerializer, AccountingSettingsSerializer,
    CodingConfigSerializer,
)
from accounting.services import PostingService, SourcePostingService, AccountingError
from accounting import coding


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
            # سید استاندارد را فقط بار اول بساز؛ هرگز نباید خطای سید باعث ۵۰۰ شود.
            try:
                if not AccountType.objects.filter(company=company).exists():
                    for code, name, category, nature, order in DEFAULT_ACCOUNT_TYPES:
                        AccountType.objects.get_or_create(
                            company=company,
                            code=code,
                            defaults={'name': name, 'category': category, 'default_nature': nature, 'sort_order': order},
                        )
            except Exception:
                pass
        return qs

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        if obj.accounts.exists() or obj.groups.exists():
            return Response({'error': 'این نوع حساب، حساب/گروه دارد و قابل حذف نیست.'}, status=400)
        return super().destroy(request, *args, **kwargs)


DEFAULT_AUXILIARY_CATEGORIES = [
    ('employee', 'پرسنل', 'employee', 1),
    ('natural_person', 'اشخاص حقیقی', 'party', 2),
    ('legal_person', 'اشخاص حقوقی', 'party', 3),
    ('project', 'پروژه‌ها', 'project', 4),
    ('contract', 'قراردادها', 'contract', 5),
    ('bank', 'بانک', 'bank', 6),
    ('cash', 'صندوق', 'cash', 7),
    ('other', 'سایر', 'manual', 8),
]


class AuxiliaryCategoryViewSet(CompanyScopedViewSet):
    serializer_class = AuxiliaryCategorySerializer
    queryset = AuxiliaryCategory.objects.all()
    search_fields = ['code', 'name']
    ordering = ['sort_order', 'code']

    def get_queryset(self):
        qs = super().get_queryset()
        company = _company(self.request)
        if company:
            try:
                if not AuxiliaryCategory.objects.filter(company=company).exists():
                    for code, name, source, order in DEFAULT_AUXILIARY_CATEGORIES:
                        AuxiliaryCategory.objects.get_or_create(
                            company=company, code=code,
                            defaults={'name': name, 'source': source, 'sort_order': order},
                        )
            except Exception:
                pass
        return qs


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

    def perform_create(self, serializer):
        data = serializer.validated_data
        parent = data.get('parent')
        group = data.get('group')

        # وراثت: اگر پدر داشته باشد از پدر ارث می‌برد؛ وگرنه از گروه.
        if parent and not data.get('account_type'):
            data['account_type'] = parent.account_type
        if parent and not data.get('nature'):
            data['nature'] = parent.nature

        if not parent and group and not data.get('account_type'):
            data['account_type'] = group.account_type
        if not parent and group and not data.get('nature'):
            data['nature'] = group.nature

        serializer.save(company=_company(self.request))


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
    def detail(self, request, pk=None):
        """جزئیات کامل تراکنش منبع + دادهٔ صورت (برای کارتابل)."""
        source = self.get_object()
        data = SourceTransactionSerializer(source).data
        # اگر منبع صورت هزینهٔ تنخواه بود، سطرها را هم اضافه کن
        if source.source_module == 'pettycash' and source.source_type == 'expense_statement':
            from pettycash.models import PettyCashExpenseStatement
            st = PettyCashExpenseStatement.objects.filter(pk=source.source_id).first()
            if st:
                from pettycash.serializers import PettyCashExpenseStatementSerializer
                data['statement'] = PettyCashExpenseStatementSerializer(st).data
        return Response(data)

    @action(detail=True, methods=['post'])
    def decide(self, request, pk=None):
        """تصمیم روی صورت (تأیید/برگشت/ویرایش/ثبت نهایی)."""
        source = self.get_object()
        decision = request.data.get('decision')  # approve | reject | edit | post
        note = request.data.get('note', '')
        if source.source_module != 'pettycash' or source.source_type != 'expense_statement':
            return Response({'error': 'این تراکنش از جنس صورت هزینه نیست'}, status=400)

        from pettycash.models import PettyCashExpenseStatement
        st = PettyCashExpenseStatement.objects.filter(pk=source.source_id).first()
        if not st:
            return Response({'error': 'صورت هزینه یافت نشد'}, status=404)

        mapping = {
            'approve': 'approved',
            'reject': 'rejected',
            'edit': 'edited',
            'post': 'posted',
        }
        if decision not in mapping:
            return Response({'error': 'تصمیم نامعتبر'}, status=400)

        st.status = mapping[decision]
        st.history = [*st.history, {'step': mapping[decision], 'by': request.user.username, 'note': note, 'at': timezone.now().isoformat()}]
        st.save()

        # ثبت سند نهایی به‌صورت یک سند قابل ویرایش
        if decision == 'post':
            from accounting.models import AccountingDocument, AccountingDocumentLine
            doc = AccountingDocument.objects.filter(
                company_id=source.company_id,
                source_module='pettycash', source_type='expense_statement', source_id=source.source_id,
            ).first()
            if not doc:
                from django.db import transaction
                with transaction.atomic():
                    doc = AccountingDocument.objects.create(
                        company_id=source.company_id,
                        date=st.date,
                        description=st.description or st.fund.title,
                        status='draft',
                        source_module='pettycash',
                        source_type='expense_statement',
                        source_id=source.source_id,
                        is_locked=False,
                        created_by=request.user,
                    )
                    for line in st.lines.all():
                        AccountingDocumentLine.objects.create(
                            document=doc, company_id=source.company_id,
                            account_id=line.account_id,
                            auxiliary_1_id=line.auxiliary_1_id,
                            auxiliary_2_id=line.auxiliary_2_id,
                            auxiliary_3_id=line.auxiliary_3_id,
                            description=line.description,
                            debit=line.debit,
                            credit=0,
                            line_no=line.line_no,
                        )
                # از تنخواه کسر کن
                from pettycash.models import PettyCashTransaction
                PettyCashTransaction.objects.get_or_create(
                    company_id=st.company_id, fund_id=st.fund_id, entry_type='debit',
                    amount=st.total, title=f'صورت هزینه {st.number or st.pk}', date=st.date,
                    defaults={'description': st.description},
                )
            source.status = 'processed'
            source.save(update_fields=['status'])
            return Response({'status': 'posted', 'document_id': doc.id})
        return Response({'status': mapping[decision]})

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


DEFAULT_CODING_CONFIGS = {
    'account_type': {'prefix': '', 'start_number': 1, 'end_number': 99, 'min_length': 1, 'max_length': 20},
    'group': {'prefix': '', 'start_number': 100, 'end_number': 999, 'min_length': 3, 'max_length': 20},
    'general': {'prefix': '', 'start_number': 1000, 'end_number': 9999, 'min_length': 4, 'max_length': 20},
    'subsidiary': {'prefix': '', 'start_number': 10000, 'end_number': 99999, 'min_length': 5, 'max_length': 20},
    'auxiliary': {'prefix': '', 'start_number': 100, 'end_number': 999, 'min_length': 3, 'max_length': 20},
    'cost_center': {'prefix': 'C', 'start_number': 1, 'end_number': 99, 'min_length': 2, 'max_length': 20},
}


class CodingConfigViewSet(CompanyScopedViewSet):
    serializer_class = CodingConfigSerializer
    queryset = CodingConfig.objects.all()
    ordering = ['level']

    def create(self, request, *args, **kwargs):
        """Upsert: اگر برای این سطح رکوردی هست، به‌جای خطای duplicate آن را آپدیت کن."""
        company = _company(request)
        level = request.data.get('level')
        existing = CodingConfig.objects.filter(company=company, level=level).first() if (company and level) else None
        if existing:
            serializer = self.get_serializer(existing, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        return super().create(request, *args, **kwargs)

    def get_queryset(self):
        qs = super().get_queryset()
        company = _company(self.request)
        if company:
            try:
                if not CodingConfig.objects.filter(company=company).exists():
                    for level, defaults in DEFAULT_CODING_CONFIGS.items():
                        CodingConfig.objects.get_or_create(company=company, level=level, defaults=defaults)
            except Exception:
                pass
        return qs

    @action(detail=False, methods=['get'])
    def suggest(self, request):
        """پیشنهاد کد بعدی برای یک سطح کدینگ مشخص."""
        level = request.query_params.get('level')
        if not level:
            return Response({'error': 'level الزامی است'}, status=400)
        company = _company(request)
        code = coding.suggest_code(company, level)
        return Response({'code': code})
