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
    AccountingSettings, CodingConfig, BankStatement, BankStatementLine, BankReconciliation,
    ApprovalPolicy, ApprovalStep,
)
from accounting.serializers import (
    BranchSerializer, FiscalYearSerializer, FiscalPeriodSerializer,
    AccountingBookSerializer, AccountTypeSerializer, AccountGroupSerializer,
    AccountSerializer, AuxiliaryAccountSerializer, AuxiliaryCategorySerializer,
    AccountingDimensionSerializer,
    DimensionValueSerializer, CostCenterSerializer, JournalSerializer,
    AccountingDocumentSerializer, AccountingSequenceSerializer,
    SourceTransactionSerializer, PostingTemplateSerializer, AccountingSettingsSerializer,
    CodingConfigSerializer, BankStatementSerializer, BankStatementLineSerializer, BankReconciliationSerializer,
    ApprovalPolicySerializer, ApprovalStepSerializer,
)
from accounting.services import PostingService, SourcePostingService, AccountingError
from accounting import coding


def _company(request):
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


def _find_petty_template(company_id):
    """قالب ثبت مرتبط با تنخواه را پیدا کن؛ قالب دارای الگوی شرح در اولویت است."""
    qs = PostingTemplate.objects.filter(company_id=company_id, is_active=True)
    # اولویت ۱: ماژول تنخواه + دارای الگوی شرح
    tpl = qs.filter(source_module__in=['pettycash', 'petty', 'تنخواه']).exclude(description_template=[]).order_by('-updated_at').first()
    if tpl:
        return tpl
    # اولویت ۲: هر ماژول + دارای الگوی شرح (جدیدترین)
    tpl = qs.exclude(description_template=[]).order_by('-updated_at').first()
    if tpl:
        return tpl
    # اولویت ۳: ماژول تنخواه بدون الگو
    tpl = qs.filter(source_module__in=['pettycash', 'petty', 'تنخواه']).order_by('-updated_at').first()
    if tpl:
        return tpl
    # اولویت ۴: هر قالب فعال
    return qs.order_by('-updated_at').first()


def _render_description(segments, ctx):
    """اجرای الگوی ماژولار شرح: segments=[{type:'text'|'token', value}] -> str."""
    out = []
    for seg in (segments or []):
        if seg.get('type') == 'text':
            out.append(str(seg.get('value', '')))
        else:
            out.append(str(ctx.get(seg.get('value'), '')) if ctx.get(seg.get('value')) is not None else '')
    return ' '.join(x for x in out if x).strip()


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

    @action(detail=True, methods=['post'])
    def open(self, request, pk=None):
        obj = self.get_object()
        obj.status = FiscalYear.Status.OPEN
        obj.save(update_fields=['status', 'updated_at'])
        return Response(FiscalYearSerializer(obj).data)

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        """بستن سال مالی: همهٔ دوره‌ها باید بسته باشند."""
        obj = self.get_object()
        open_periods = obj.periods.exclude(status='closed').count()
        if open_periods:
            return Response({'error': f'{open_periods} دورهٔ باز وجود دارد؛ ابتدا دوره‌ها را ببندید.'}, status=400)
        obj.status = FiscalYear.Status.CLOSED
        obj.is_current = False
        obj.save(update_fields=['status', 'is_current', 'updated_at'])
        return Response(FiscalYearSerializer(obj).data)

    @action(detail=True, methods=['post'])
    def lock(self, request, pk=None):
        obj = self.get_object()
        obj.status = FiscalYear.Status.LOCKED
        obj.save(update_fields=['status', 'updated_at'])
        return Response(FiscalYearSerializer(obj).data)

    @action(detail=False, methods=['post'])
    def next(self, request):
        """ایجاد سال مالی بعدی بر اساس سال جاری."""
        current = FiscalYear.objects.filter(company=_company(request), is_current=True).order_by('-start_date').first()
        if not current:
            return Response({'error': 'سال جاری تعیین نشده است.'}, status=400)
        import datetime
        next_start = current.end_date + datetime.timedelta(days=1)
        next_end = current.end_date.replace(year=current.end_date.year + 1)
        name = f'سال مالی {next_start.year}'
        exists = FiscalYear.objects.filter(company=_company(request), start_date=next_start).first()
        if exists:
            return Response(FiscalYearSerializer(exists).data)
        obj = FiscalYear.objects.create(
            company=_company(request),
            name=name,
            start_date=next_start,
            end_date=next_end,
            status=FiscalYear.Status.DRAFT,
            is_current=False,
        )
        return Response(FiscalYearSerializer(obj).data, status=201)


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


class ApprovalPolicyViewSet(CompanyScopedViewSet):
    serializer_class = ApprovalPolicySerializer
    queryset = ApprovalPolicy.objects.all()
    ordering = ['id']


class ApprovalStepViewSet(CompanyScopedViewSet):
    serializer_class = ApprovalStepSerializer
    queryset = ApprovalStep.objects.all()

    def get_queryset(self):
        qs = super().get_queryset().select_related('approver')
        doc_id = self.request.query_params.get('document')
        if doc_id:
            qs = qs.filter(document_id=doc_id)
        return qs

    def perform_create(self, serializer):
        obj = serializer.save(company=_company(self.request))
        doc = obj.document
        if obj.decision == ApprovalStep.Decision.APPROVED:
            nxt = doc.approval_steps.filter(decision=ApprovalStep.Decision.PENDING).order_by('step_no').first()
            if not nxt:
                doc.status = AccountingDocument.Status.APPROVED
                doc.approved_by = obj.approver
                doc.save(update_fields=['status', 'approved_by', 'updated_at'])
        elif obj.decision == ApprovalStep.Decision.REJECTED:
            doc.status = AccountingDocument.Status.SUBMITTED
            doc.save(update_fields=['status', 'updated_at'])
        return obj


class AccountingDocumentViewSet(CompanyScopedViewSet):
    serializer_class = AccountingDocumentSerializer
    queryset = AccountingDocument.objects.select_related(
        'branch', 'journal', 'fiscal_year', 'period',
    ).prefetch_related('lines__account')
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['number', 'description']
    ordering = ['-date', '-created_at']

    def get_queryset(self):
        from django.db.models import Q
        qs = super().get_queryset()
        p = self.request.query_params

        # وضعیت و روزنامه
        status = p.get('status')
        if status:
            qs = qs.filter(status=status)
        journal = p.get('journal')
        if journal:
            qs = qs.filter(journal_id=journal)

        # سال مالی (از/تا)
        year_from = p.get('year_from'); year_to = p.get('year_to')
        if year_from: qs = qs.filter(fiscal_year_id__gte=year_from)
        if year_to: qs = qs.filter(fiscal_year_id__lte=year_to)

        # شماره سند (از/تا)
        num_from = p.get('number_from'); num_to = p.get('number_to')
        if num_from: qs = qs.filter(number__gte=num_from)
        if num_to: qs = qs.filter(number__lte=num_to)

        # تاریخ سند (از/تا)
        date_from = p.get('date_from'); date_to = p.get('date_to')
        if date_from: qs = qs.filter(date__gte=date_from)
        if date_to: qs = qs.filter(date__lte=date_to)

        # شرح سند
        description = p.get('description')
        if description:
            qs = qs.filter(Q(description__icontains=description) | Q(lines__description__icontains=description))

        # حساب کل (از/تا) — روی والد حسابِ سطر
        general_from = p.get('general_from'); general_to = p.get('general_to')
        if general_from: qs = qs.filter(lines__account__parent_id__gte=general_from)
        if general_to: qs = qs.filter(lines__account__parent_id__lte=general_to)

        # حساب معین (از/تا) — روی خود حساب سطر
        sub_from = p.get('subsidiary_from'); sub_to = p.get('subsidiary_to')
        if sub_from: qs = qs.filter(lines__account_id__gte=sub_from)
        if sub_to: qs = qs.filter(lines__account_id__lte=sub_to)

        # سه تفصیل (از/تا)
        for i in (1, 2, 3):
            f = p.get(f'aux{i}_from'); t = p.get(f'aux{i}_to')
            if f: qs = qs.filter(**{f'lines__auxiliary_{i}__code__gte': f})
            if t: qs = qs.filter(**{f'lines__auxiliary_{i}__code__lte': t})

        # شماره چک/ارجاع (از/تا)
        ref_from = p.get('reference_from'); ref_to = p.get('reference_to')
        if ref_from: qs = qs.filter(lines__reference__gte=ref_from)
        if ref_to: qs = qs.filter(lines__reference__lte=ref_to)

        # مبلغ بدهکار (از/تا)
        debit_from = p.get('debit_from'); debit_to = p.get('debit_to')
        if debit_from: qs = qs.filter(lines__debit__gte=debit_from)
        if debit_to: qs = qs.filter(lines__debit__lte=debit_to)

        # مبلغ بستانکار (از/تا)
        credit_from = p.get('credit_from'); credit_to = p.get('credit_to')
        if credit_from: qs = qs.filter(lines__credit__gte=credit_from)
        if credit_to: qs = qs.filter(lines__credit__lte=credit_to)

        # مبلغ (هر دو: بدهکار یا بستانکار) (از/تا)
        amt_from = p.get('amount_from'); amt_to = p.get('amount_to')
        if amt_from or amt_to:
            cond = Q()
            if amt_from: cond &= (Q(lines__debit__gte=amt_from) | Q(lines__credit__gte=amt_from))
            if amt_to: cond &= (Q(lines__debit__lte=amt_to) | Q(lines__credit__lte=amt_to))
            qs = qs.filter(cond)

        # جستجوی آزاد (شماره/شرح)
        q = p.get('q')
        if q:
            qs = qs.filter(Q(number__icontains=q) | Q(description__icontains=q))

        return qs.distinct()

    def perform_create(self, serializer):
        from accounting.services import allocate_document_number
        data = serializer.validated_data
        # اگر شماره دستی وارد نشده، شمارهٔ خودکار بر اساس Sequence اختصاص بده
        if not data.get('number'):
            company = _company(self.request)
            data['number'] = allocate_document_number(
                company=company,
                journal=data.get('journal'),
                fiscal_year=data.get('fiscal_year'),
                branch=data.get('branch'),
            )
        serializer.save(company=_company(self.request))

    def destroy(self, request, *args, **kwargs):
        """اسناد ثبت/قفل‌شده قابل حذف نیستند (ماندگاری)؛ فقط برگشت مجاز است."""
        obj = self.get_object()
        if obj.status in ('posted', 'locked'):
            return Response({'error': 'سند ثبت/قفل‌شده قابل حذف نیست؛ از برگشت سند استفاده کنید.'}, status=400)
        return super().destroy(request, *args, **kwargs)

    def _service(self, obj):
        return PostingService(obj, user=self.request.user)

    def _log(self, obj, step, note=''):
        hist = list(obj.history or [])
        hist.append({'step': step, 'by': self.request.user.username, 'note': note, 'at': timezone.now().isoformat()})
        obj.history = hist
        obj.save(update_fields=['history', 'updated_at'])

    @action(detail=False, methods=['get'])
    def export(self, request):
        """خروجی CSV اسناد حسابداری (با فیلترهای اعمال‌شده)."""
        import csv
        from django.http import HttpResponse
        qs = self.get_queryset().select_related('journal')
        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = 'attachment; filename="accounting_documents.csv"'
        writer = csv.writer(response)
        writer.writerow(['شماره', 'تاریخ', 'روزنامه', 'وضعیت', 'بدهکار', 'بستانکار', 'شرح'])
        for doc in qs:
            writer.writerow([
                doc.number or doc.pk,
                doc.date.isoformat() if doc.date else '',
                doc.journal.name if doc.journal else '',
                doc.get_status_display(),
                float(doc.total_debit),
                float(doc.total_credit),
                doc.description,
            ])
        return response

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        obj = self.get_object()
        try:
            self._service(obj).submit()
        except AccountingError as e:
            return Response({'error': str(e)}, status=400)
        self._log(obj, 'submitted', 'ارسال برای تأیید')
        try:
            self._build_approval_steps(obj)
        except Exception:
            pass
        return Response(AccountingDocumentSerializer(obj).data)

    def _build_approval_steps(self, doc):
        """بر اساس سقف سیاست فعال، مراحل تأیید (۱ یا ۲ مرحله) بساز."""
        from decimal import Decimal
        policy = ApprovalPolicy.objects.filter(company=doc.company, is_active=True).order_by('-updated_at').first()
        limit = policy.single_level_limit if policy else Decimal('50000000')
        if doc.approval_steps.exists():
            return
        steps = 2 if doc.total_debit >= limit else 1
        for i in range(1, steps + 1):
            ApprovalStep.objects.create(
                company=doc.company,
                document=doc,
                step_no=i,
                decision=ApprovalStep.Decision.PENDING,
            )

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        obj = self.get_object()
        try:
            self._service(obj).approve()
        except AccountingError as e:
            return Response({'error': str(e)}, status=400)
        self._log(obj, 'approved', 'تأیید شد')
        return Response(AccountingDocumentSerializer(obj).data)

    @action(detail=True, methods=['post'])
    def post_document(self, request, pk=None):
        obj = self.get_object()
        try:
            self._service(obj).post()
        except AccountingError as e:
            return Response({'error': str(e)}, status=400)
        self._log(obj, 'posted', 'ثبت نهایی شد')
        return Response(AccountingDocumentSerializer(obj).data)

    @action(detail=True, methods=['post'])
    def lock(self, request, pk=None):
        obj = self.get_object()
        try:
            self._service(obj).lock()
        except AccountingError as e:
            return Response({'error': str(e)}, status=400)
        self._log(obj, 'locked', 'قفل شد')
        return Response(AccountingDocumentSerializer(obj).data)

    @action(detail=True, methods=['post'])
    def reverse(self, request, pk=None):
        obj = self.get_object()
        try:
            reversal = self._service(obj).reverse()
        except AccountingError as e:
            return Response({'error': str(e)}, status=400)
        self._log(obj, 'reversed', 'برگشت خورد')
        return Response(AccountingDocumentSerializer(reversal).data)

    @action(detail=False, methods=['post'])
    def bulk_post(self, request):
        """قطعی کردن گروهی: ثبت نهایی چند سند تأییدشده/ارسال‌شده."""
        ids = request.data.get('ids') or []
        docs = self.get_queryset().filter(id__in=ids)
        posted = 0
        errors = []
        for doc in docs:
            try:
                PostingService(doc, user=request.user).post()
                self._log(doc, 'posted', 'ثبت نهایی گروهی')
                posted += 1
            except AccountingError as e:
                errors.append({'id': doc.id, 'number': doc.number or doc.pk, 'error': str(e)})
        return Response({'posted': posted, 'errors': errors})

    @action(detail=False, methods=['get'])
    def control(self, request):
        """کنترل اسناد: اسناد نامتوازن، در انتظار، آمادهٔ ثبت، قطعی و برگشتی."""
        qs = self.get_queryset()

        def _doc(d):
            return {
                'id': d.id,
                'number': d.number or d.pk,
                'date': d.date.isoformat() if d.date else None,
                'description': d.description,
                'status': d.status,
                'status_display': d.get_status_display(),
                'total_debit': float(d.total_debit),
                'total_credit': float(d.total_credit),
                'journal_name': d.journal.name if d.journal else None,
            }

        unbalanced = [
            _doc(d) for d in qs.filter(status__in=['draft', 'submitted', 'approved'])
            if d.total_debit != d.total_credit
        ]
        pending = qs.filter(status='submitted')
        ready = qs.filter(status='approved')
        posted = qs.filter(status__in=['posted', 'locked'])
        reversed_docs = qs.filter(status='reversed')

        return Response({
            'unbalanced': unbalanced,
            'pending': [_doc(d) for d in pending[:100]],
            'ready_to_post': [_doc(d) for d in ready[:100]],
            'posted': [_doc(d) for d in posted[:100]],
            'reversed': [_doc(d) for d in reversed_docs[:100]],
            'counts': {
                'unbalanced': len(unbalanced),
                'pending': pending.count(),
                'ready_to_post': ready.count(),
                'posted': posted.count(),
                'reversed': reversed_docs.count(),
            },
        })


class BankStatementViewSet(CompanyScopedViewSet):
    serializer_class = BankStatementSerializer
    queryset = BankStatement.objects.select_related('account').prefetch_related('lines')
    ordering = ['-statement_date']

    def get_queryset(self):
        qs = super().get_queryset()
        account_id = self.request.query_params.get('account')
        if account_id:
            qs = qs.filter(account_id=account_id)
        return qs

    def perform_create(self, serializer):
        serializer.save(company=_company(self.request))

    @action(detail=True, methods=['post'])
    def match_line(self, request, pk=None):
        line_id = request.data.get('line_id')
        line = BankStatementLine.objects.filter(id=line_id, statement=self.get_object()).first()
        if not line:
            return Response({'error': 'ردیف یافت نشد'}, status=404)
        line.matched = not line.matched
        line.save(update_fields=['matched', 'updated_at'])
        return Response(BankStatementLineSerializer(line).data)


class BankStatementLineViewSet(CompanyScopedViewSet):
    serializer_class = BankStatementLineSerializer
    queryset = BankStatementLine.objects.select_related('statement')
    ordering = ['date']


class BankReconciliationViewSet(CompanyScopedViewSet):
    serializer_class = BankReconciliationSerializer
    queryset = BankReconciliation.objects.select_related('account')
    ordering = ['-as_of']

    def get_queryset(self):
        qs = super().get_queryset()
        account_id = self.request.query_params.get('account')
        if account_id:
            qs = qs.filter(account_id=account_id)
        return qs

    def perform_create(self, serializer):
        from django.db.models import Sum
        account_id = serializer.validated_data['account_id']
        debit = AccountingDocumentLine.objects.filter(account_id=account_id).aggregate(s=Sum('debit'))['s'] or 0
        credit = AccountingDocumentLine.objects.filter(account_id=account_id).aggregate(s=Sum('credit'))['s'] or 0
        book_balance = float(debit) - float(credit)
        statement_balance = float(serializer.validated_data.get('statement_balance', 0))
        serializer.save(
            company=_company(self.request),
            book_balance=book_balance,
            difference=statement_balance - book_balance,
        )


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

    @action(detail=True, methods=['get'], url_path='inbox')
    def inbox(self, request, pk=None):
        """جزئیات کامل تراکنش منبع + دادهٔ صورت (برای کارتابل)."""
        source = self.get_object()
        data = SourceTransactionSerializer(source).data
        if source.source_module == 'pettycash' and source.source_type == 'expense_statement':
            from pettycash.models import PettyCashExpenseStatement
            st = PettyCashExpenseStatement.objects.filter(pk=source.source_id).first()
            if st:
                from pettycash.serializers import PettyCashExpenseStatementSerializer
                from decimal import Decimal
                data['statement'] = PettyCashExpenseStatementSerializer(st).data
                # پیش‌نمایش سند حسابداری (دوطرفه) بر اساس صورت
                template = _find_petty_template(source.company_id)
                lines = []
                for line in st.lines.all():
                    ctx = {
                        'invoice_number': line.invoice_number or '',
                        'supplier': line.supplier or '',
                        'expense_date': line.expense_date.isoformat() if line.expense_date else '',
                        'description': line.description or '',
                        'account_code': line.account.code,
                        'account_name': line.account.name,
                        'aux1': line.auxiliary_1.name if line.auxiliary_1 else '',
                        'aux2': line.auxiliary_2.name if line.auxiliary_2 else '',
                        'aux3': line.auxiliary_3.name if line.auxiliary_3 else '',
                        'fund': st.fund.title,
                        'custodian': st.fund.custodian.full_name if st.fund.custodian else '',
                    }
                    lines.append({
                        'account_code': line.account.code,
                        'account_name': line.account.name,
                        'description': _render_description(template.description_template if template else [], ctx) or line.description or '',
                        'debit': line.debit,
                        'credit': 0,
                    })
                if st.fund.account:
                    lines.append({
                        'account_code': st.fund.account.code,
                        'account_name': st.fund.account.name,
                        'description': f'تنخواه {st.fund.title}',
                        'debit': 0,
                        'credit': Decimal(st.total),
                    })
                    balanced = True
                else:
                    balanced = False
                data['document_preview'] = {'lines': lines, 'balanced': balanced, 'total': Decimal(st.total), 'has_account': bool(st.fund.account_id)}
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

        # ثبت سند نهایی به‌صورت یک سند قابل ویرایش (دوطرفه)
        if decision == 'post':
            # تنخواه باید حساب طرف بستانکار داشته باشد
            if not st.fund.account_id:
                return Response({
                    'error': 'تنخواه حساب (معین) بستانکار ندارد؛ ابتدا برای این تنخواه یک حساب تعریف کنید.',
                }, status=400)

            from accounting.models import AccountingDocument, AccountingDocumentLine
            # قالب ثبت تنخواه (برای الگوی شرح)
            template = _find_petty_template(source.company_id)
            doc = AccountingDocument.objects.filter(
                company_id=source.company_id,
                source_module='pettycash', source_type='expense_statement', source_id=source.source_id,
            ).first()
            if not doc:
                from django.db import transaction
                from decimal import Decimal
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
                    line_no = 0
                    for line in st.lines.all():
                        line_no += 1
                        ctx = {
                            'invoice_number': line.invoice_number or '',
                            'supplier': line.supplier or '',
                            'expense_date': line.expense_date.isoformat() if line.expense_date else '',
                            'description': line.description or '',
                            'account_code': line.account.code,
                            'account_name': line.account.name,
                            'aux1': line.auxiliary_1.name if line.auxiliary_1 else '',
                            'aux2': line.auxiliary_2.name if line.auxiliary_2 else '',
                            'aux3': line.auxiliary_3.name if line.auxiliary_3 else '',
                            'fund': st.fund.title,
                            'custodian': st.fund.custodian.full_name if st.fund.custodian else '',
                        }
                        line_desc = _render_description(template.description_template if template else [], ctx) or line.description or ''
                        AccountingDocumentLine.objects.create(
                            document=doc, company_id=source.company_id,
                            account_id=line.account_id,
                            auxiliary_1_id=line.auxiliary_1_id,
                            auxiliary_2_id=line.auxiliary_2_id,
                            auxiliary_3_id=line.auxiliary_3_id,
                            description=line_desc,
                            debit=line.debit,
                            credit=0,
                            line_no=line_no,
                        )
                    # طرف بستانکار = حساب تنخواه (معین + تفصیلها)
                    line_no += 1
                    AccountingDocumentLine.objects.create(
                        document=doc, company_id=source.company_id,
                        account_id=st.fund.account_id,
                        auxiliary_1_id=st.fund.auxiliary_1_id,
                        auxiliary_2_id=st.fund.auxiliary_2_id,
                        auxiliary_3_id=st.fund.auxiliary_3_id,
                        description=f'تنخواه {st.fund.title}',
                        debit=0,
                        credit=Decimal(st.total),
                        line_no=line_no,
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
        """پیشنهاد کد بعدی برای یک سطح کدینگ مشخص.

        برای سطح `subsidiary` می‌توان `parent_code` (کد کل) را ارسال کرد تا کد
        معین به‌صورت ترکیبی (کدکل + پسوند) تولید شود.
        """
        level = request.query_params.get('level')
        if not level:
            return Response({'error': 'level الزامی است'}, status=400)
        company = _company(request)
        parent_code = request.query_params.get('parent_code')
        code = coding.suggest_code(company, level, parent_code)
        return Response({'code': code})
