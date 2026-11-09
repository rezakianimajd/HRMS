"""Views for the Contracts module."""
from decimal import Decimal

from django.db import transaction
from django.db.models import Q, Sum, Value, DecimalField, Prefetch
from django.db.models.functions import Coalesce
from rest_framework import viewsets, filters, parsers
from rest_framework.decorators import action
from rest_framework.response import Response
from contracts.models import (
    ContractParty, Contract, ContractDocument, Invoice, Statement,
    Addendum, Guarantee, Payment, PaymentAttachment, PaymentAllocation, ContractDispute,
    ContractTypeMaster, SupplierEvaluation,
    ContractTemplate, ContractDraft, ContractApproval,
    ContractApprovalWorkflow, ContractApprovalStep,
    ContractAuditLog, ContractAccountMapping,
)
from contracts.serializers import (
    ContractPartySerializer, ContractSerializer, ContractListSerializer,
    ContractDocumentSerializer,
    InvoiceSerializer, StatementSerializer, AddendumSerializer,
    GuaranteeSerializer, PaymentSerializer, PaymentAttachmentSerializer, ContractDisputeSerializer,
    ContractTypeMasterSerializer, SupplierEvaluationSerializer,
    ContractTemplateSerializer, ContractDraftSerializer, ContractApprovalSerializer,
    ContractApprovalWorkflowSerializer, ContractApprovalStepSerializer,
    ContractAuditLogSerializer, ContractAccountMappingSerializer,
)
from contracts.accounting_mapping import (
    AUXILIARY_SOURCES, CONTROL_MODES, MAPPING_DEFINITIONS, MAPPING_BY_KEY,
    contract_mapping_rows, contract_mapping_summary, resolve_contract_mapping,
    resolve_event_mapping,
)
from contracts.statement_totals import recalculate_contract_statements


def _company(request):
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


# جمع مبالغ تخصیص‌یافتهٔ هر سند (صورت‌وضعیت / فاکتور) — بدون کوئری اضافه در لیست‌ها.
# سه سبد مجزا: خالص صورت‌وضعیت، سپرده حسن انجام کار و سپرده حق بیمه.
_SUM_FIELD = DecimalField(max_digits=18, decimal_places=0)
PAID_SUM = Coalesce(
    Sum('payment_allocations__amount', filter=Q(payment_allocations__kind='net')),
    Value(Decimal('0')), output_field=_SUM_FIELD,
)
RETENTION_PAID_SUM = Coalesce(
    Sum('payment_allocations__amount', filter=Q(payment_allocations__kind='retention')),
    Value(Decimal('0')), output_field=_SUM_FIELD,
)
INSURANCE_PAID_SUM = Coalesce(
    Sum('payment_allocations__amount', filter=Q(payment_allocations__kind='insurance')),
    Value(Decimal('0')), output_field=_SUM_FIELD,
)


class BaseContractViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        qs = super().get_queryset()
        company = _company(self.request)
        if company:
            qs = qs.filter(company=company)
        return qs

    def perform_create(self, serializer):
        company = _company(self.request)
        serializer.save(company=company)


class ContractPartyViewSet(BaseContractViewSet):
    serializer_class = ContractPartySerializer
    queryset = ContractParty.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'national_id', 'mobile', 'email', 'economic_code', 'registration_number']
    ordering = ['name']

    def get_queryset(self):
        qs = super().get_queryset()
        party_type = self.request.query_params.get('party_type')
        if party_type:
            qs = qs.filter(party_type=party_type)
        return qs

    @action(detail=True, methods=['get'])
    def summary(self, request, pk=None):
        """Return a party's contracts and aggregated financial figures."""
        from django.db.models import Sum, Count
        party = self.get_object()
        contracts = party.contracts.all()
        total_amount = contracts.aggregate(s=Sum('amount'))['s'] or 0
        active_count = contracts.filter(status='active').count()
        stats = {
            'contracts_count': contracts.count(),
            'active_count': active_count,
            'total_amount': total_amount,
            'contracts': ContractSerializer(contracts, many=True).data,
        }
        return Response(stats)

    @action(detail=True, methods=['post'])
    def toggle_status(self, request, pk=None):
        """Enable/disable a party (soft)."""
        party = self.get_object()
        party.is_active = not party.is_active
        party.save(update_fields=['is_active', 'updated_at'])
        return Response(ContractPartySerializer(party).data)


class ContractViewSet(BaseContractViewSet):
    serializer_class = ContractSerializer
    queryset = Contract.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['number', 'subject', 'party__name']
    ordering = ['-created_at']

    def get_serializer_class(self):
        # فهرست/انتخابگرها نسخهٔ سبک می‌گیرند؛ پروندهٔ قرارداد (retrieve) کامل است.
        if self.action in ('list', 'options'):
            return ContractListSerializer
        return ContractSerializer

    def _apply_filters(self, qs):
        party_id = self.request.query_params.get('party')
        if party_id:
            qs = qs.filter(party_id=party_id)
        contract_type = self.request.query_params.get('contract_type')
        if contract_type:
            qs = qs.filter(contract_type=contract_type)
        type_master = self.request.query_params.get('contract_type_master')
        if type_master:
            qs = qs.filter(contract_type_master_id=type_master)
        status = self.request.query_params.get('status')
        if status:
            qs = qs.filter(status=status)
        return qs

    def _lean_queryset(self):
        """کوئری فهرست: فقط FKهای لازم + آرایه‌های فشردهٔ اسناد (بدون N+1)."""
        allocations = PaymentAllocation.objects.only(
            'id', 'amount', 'kind', 'payment_id', 'invoice_id', 'statement_id',
        )
        return self._apply_filters(
            super().get_queryset().select_related(
                'party', 'project', 'currency', 'contract_type_master',
            ).prefetch_related(
                Prefetch('addendums', queryset=Addendum.objects.only(
                    'id', 'contract_id', 'number', 'subject', 'date', 'subjects', 'subject_type',
                    'amount_change', 'new_amount', 'percent_change', 'advance_change',
                    'new_advance_payment', 'new_retention_percent', 'new_guarantee_amount',
                    'new_exchange_rate', 'new_end_date',
                )),
                Prefetch('invoices', queryset=Invoice.objects.only(
                    'id', 'contract_id', 'number', 'date', 'due_date', 'amount', 'total', 'is_paid',
                ).prefetch_related(Prefetch('payment_allocations', queryset=allocations))),
                Prefetch('statements', queryset=Statement.objects.only(
                    'id', 'contract_id', 'number', 'date', 'kind', 'amount', 'net_amount',
                    'is_approved', 'work_done', 'cumulative_previous_amount', 'deductions_total',
                    'additions_total', 'adjustment_amount', 'adjustment_work_done',
                    'deductions', 'additions', 'levels',
                ).prefetch_related(Prefetch('payment_allocations', queryset=allocations))),
                Prefetch('payments', queryset=Payment.objects.only(
                    'id', 'contract_id', 'reference', 'date', 'amount',
                )),
                Prefetch('guarantees', queryset=Guarantee.objects.only(
                    'id', 'contract_id', 'number', 'guarantee_type', 'amount', 'is_released',
                )),
            ),
        )

    def get_queryset(self):
        if self.action == 'retrieve':
            # پروندهٔ قرارداد: همهٔ تب‌ها با یک درخواست سرو می‌شوند.
            return self._apply_filters(
                super().get_queryset().select_related(
                    'party', 'signatory', 'project', 'currency', 'contract_type_master',
                ).prefetch_related(
                    'documents', 'invoices', 'statements', 'addendums', 'addendums__documents',
                    'guarantees', 'guarantees__documents', 'guarantees__actions',
                    'payments', 'disputes', 'audit_logs',
                    'statements__payment_allocations', 'statements__payment_allocations__payment',
                    'invoices__payment_allocations', 'invoices__payment_allocations__payment',
                    'payments__allocations',
                ),
            )
        return self._lean_queryset()

    def _audit(self, contract, action, field='', old='', new=''):
        user = self.request.user.username if getattr(self.request, 'user', None) and getattr(self.request.user, 'is_authenticated', False) else ''
        ContractAuditLog.objects.create(
            company=_company(self.request), contract=contract, user=user,
            action=action, field=field, old_value=str(old or ''), new_value=str(new or ''),
        )

    def perform_create(self, serializer):
        company = _company(self.request)
        instance = serializer.save(company=company)
        self._audit(instance, 'create')

    def perform_update(self, serializer):
        company = _company(self.request)
        old = self.get_object()
        tracked = ['status', 'amount', 'end_date', 'guarantee_amount', 'subject']
        instance = serializer.save(company=company)
        for f in tracked:
            old_v = getattr(old, f)
            new_v = getattr(instance, f)
            if str(old_v) != str(new_v):
                action = 'status' if f == 'status' else 'update'
                self._audit(instance, action, field=f, old=old_v, new=new_v)

    def perform_destroy(self, instance):
        self._audit(instance, 'delete')
        instance.delete()

    @action(detail=True, methods=['get'])
    def effective(self, request, pk=None):
        """پروندهٔ مؤثر قرارداد: اثر همهٔ الحاقیه‌ها روی مبلغ، پیش‌پرداخت، مدت، تضمین و ...

        خروجی شامل مقدار پایه، مقدار مؤثر، تفاوت‌ها، ردیابی تغییرات هر الحاقیه و هشدارهاست.
        """
        from contracts.addendum_effects import contract_effects

        contract = self.get_object()
        return Response(contract_effects(contract))

    @action(detail=True, methods=['get'], url_path='guarantees-status')
    def guarantees_status(self, request, pk=None):
        """وضعیت تأمین تضامین قرارداد: کدام تضمین اورده شده و کدام نه.

        برای هر «قلم تضمین قرارداد» مبلغ مورد نیاز، مبلغ تأمین‌شده، کمبود، درصد پوشش و
        تضامین وابسته (شماره/ابزار/مبلغ/سررسید/آزادشده) برگردانده می‌شود.
        """
        from contracts.guarantee_status import guarantee_compliance

        contract = self.get_object()
        return Response(guarantee_compliance(contract))

    @action(detail=False, methods=['get'], url_path='guarantees-overview')
    def guarantees_overview(self, request):
        """نمای کلی وضعیت تضامین همهٔ قراردادها (صفحهٔ پایش تضامین)."""
        from contracts.guarantee_overview import contract_overview_row, summarize
        from contracts.guarantee_status import guarantee_compliance

        # نکتهٔ کارایی: iterator() پیش‌بارگذاری‌ها را نادیده می‌گیرد و برای هر قرارداد
        # چند کوئری (تضامین/الحاقیه‌ها/طرف) می‌زد؛ نسخهٔ زیر با prefetch و بدون iterator
        # کل صفحه را با چند کوئری می‌سازد.
        queryset = self._apply_filters(
            super().get_queryset().select_related('party', 'currency').prefetch_related(
                'guarantees', 'addendums',
            ),
        ).filter(is_active=True)
        only_with_guarantee = request.query_params.get('only_registered') in ('1', 'true', 'yes')
        rows = []
        for contract in queryset:
            guarantees = list(contract.guarantees.all())
            items = getattr(contract, 'guarantee_items', None) or []
            if not guarantees and not items and not getattr(contract, 'guarantee_amount', 0):
                continue
            if only_with_guarantee and not guarantees:
                continue
            compliance = guarantee_compliance(contract, guarantees=guarantees)
            rows.append(contract_overview_row(contract, compliance))

        rows.sort(key=lambda row: (row['coverage_percent'], str(row['contract_number'])))
        return Response({'results': rows, 'summary': summarize(rows)})


    @action(detail=False, methods=['get'], url_path='export-excel')
    def export_excel(self, request):
        """خروجی اکسل جامع قراردادها — تک‌شیت و **یک ردیف برای هر قرارداد**.

        همهٔ آیتم‌های درون قرارداد به‌صورت ستون‌های شماره‌دار («فاکتور ۱ — مبلغ»، …) در
        همان ردیف قرارداد می‌آیند؛ فیلترهای همان صفحه اعمال می‌شوند (q، وضعیت، نوع قرارداد،
        طرف، پروژه) و با پارامتر `contract=<id>` فقط یک قرارداد با تمام جزئیاتش گرفته می‌شود.
        """
        from django.http import HttpResponse
        from django.utils import timezone

        from contracts.excel_export import build_contracts_workbook

        queryset = self.filter_queryset(self.get_queryset()).order_by('-created_at')
        contract_id = request.query_params.get('contract')
        if contract_id:
            queryset = queryset.filter(id=contract_id)

        workbook = build_contracts_workbook(queryset)
        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        filename = f'contracts-{timezone.localtime().strftime("%Y%m%d-%H%M")}.xlsx'
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        workbook.save(response)
        return response

    @action(detail=False, methods=['get'])
    def options(self, request):
        """فهرست سبک قراردادها برای انتخابگرها (یک کوئری، بدون آرایه‌های تودرتو)."""
        qs = self.filter_queryset(
            self._apply_filters(
                super().get_queryset().select_related('party', 'project', 'currency'),
            )
        ).values(
            'id', 'number', 'subject', 'amount', 'status',
            'start_date', 'end_date',
            'currency_id', 'currency__code', 'currency__name', 'currency__symbol',
            'currency__exchange_rate',
            'party_id', 'party__name', 'project_id', 'project__name',
        )[:1000]
        return Response([
            {
                'id': row['id'],
                'number': row['number'],
                'subject': row['subject'],
                'amount': row['amount'],
                'status': row['status'],
                'start_date': row['start_date'],
                'end_date': row['end_date'],
                'currency': row['currency_id'],
                'currency_code': row['currency__code'],
                'currency_name': row['currency__name'],
                'currency_symbol': row['currency__symbol'],
                'exchange_rate': row['currency__exchange_rate'],
                'party': row['party_id'],
                'party_name': row['party__name'],
                'project': row['project_id'],
                'project_name': row['project__name'],
            }
            for row in qs
        ])

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Aggregated dashboard statistics for contracts (server-side)."""
        from datetime import date, timedelta
        from django.db.models import Count, Sum
        # این اکشن فقط شمارش/جمع می‌خواهد؛ prefetch سنگین فهرست را برنمی‌داریم.
        qs = self._apply_filters(super().get_queryset())
        status_counts = dict(
            qs.values_list('status').annotate(c=Count('id')).values_list('status', 'c')
        )
        # نوع قرارداد: نام نوع پیکربندی‌شده در اولویت است؛ در غیر این صورت نوع ثابت
        type_labels = dict(Contract.ContractType.choices)
        type_counts = {}
        for name, c in qs.filter(contract_type_master__isnull=False)\
                .values_list('contract_type_master__name')\
                .annotate(c=Count('id')).values_list('contract_type_master__name', 'c'):
            key = name or 'سایر'
            type_counts[key] = type_counts.get(key, 0) + c
        for t, c in qs.filter(contract_type_master__isnull=True)\
                .values_list('contract_type')\
                .annotate(c=Count('id')).values_list('contract_type', 'c'):
            key = type_labels.get(t, t or 'سایر')
            type_counts[key] = type_counts.get(key, 0) + c
        # پروژه‌ها: از تخصیص پروژه‌ها (project_allocations) و در صورت نبود، از پروژهٔ منفرد
        project_counts = {}
        for c in qs:
            allocs = c.project_allocations or []
            for pa in allocs:
                pid = pa.get('project') if isinstance(pa, dict) else None
                if pid:
                    project_counts[str(pid)] = project_counts.get(str(pid), 0) + 1
            if c.project_id and not allocs:
                project_counts[str(c.project_id)] = project_counts.get(str(c.project_id), 0) + 1
        if project_counts:
            from projects.models import Project
            ids = [int(k) for k in project_counts.keys() if str(k).isdigit()]
            names = dict(Project.objects.filter(id__in=ids).values_list('id', 'name'))
            project_counts = {names.get(int(k), f'پروژه #{k}'): v for k, v in project_counts.items()}
        total_amount = qs.aggregate(s=Sum('amount'))['s'] or 0
        today = date.today()
        in60 = today + timedelta(days=60)
        expiring = qs.filter(end_date__isnull=False, end_date__gte=today, end_date__lte=in60).count()
        return Response({
            'total': qs.count(),
            'status_counts': status_counts,
            'type_counts': type_counts,
            'project_counts': project_counts,
            'total_amount': total_amount,
            'expiring': expiring,
        })

    @action(detail=False, methods=['get'], url_path='completeness')
    def completeness(self, request):
        """نواقص قراردادها — فیلدهای خالی، مدارک، درصد پروژه، تاریخ‌ها و مسائل مالی.

        کل صفحه از **سه کوئری** ساخته می‌شود (قراردادها + جمع فاکتورها + عناوین
        مدارک) و قاعده‌ها در ``contracts.completeness`` (توابع خالص) اعمال می‌شوند.
        فیلترها: ``?code=a,b`` · ``?severity=high`` · ``?group=documents`` ·
        ``?search=`` · ``?status=``.
        """
        from datetime import date

        from django.db.models import Count

        from contracts import completeness as comp

        company = _company(request)

        def scoped(model):
            queryset = model.objects.all()
            return queryset.filter(company=company) if company else queryset

        queryset = scoped(Contract)
        status = request.query_params.get('status')
        if status:
            queryset = queryset.filter(status=status)
        queryset = queryset.select_related('party', 'project', 'currency', 'signatory').annotate(
            documents_count=Count('documents', distinct=True),
            guarantees_count=Count('guarantees', distinct=True),
            invoices_count=Count('invoices', distinct=True),
            statements_count=Count('statements', distinct=True),
        )

        invoice_totals = {
            row['contract_id']: row['total'] or 0
            for row in scoped(Invoice).values('contract_id').annotate(total=Sum('total'))
        }
        document_titles = {}
        for contract_id, title in scoped(ContractDocument).values_list('contract_id', 'title'):
            document_titles.setdefault(contract_id, []).append(title or '')

        status_labels = dict(Contract.Status.choices)
        type_labels = dict(Contract.ContractType.choices)
        rows = []
        for contract in queryset[:2000]:
            rows.append({
                'id': contract.pk,
                'number': contract.number,
                'subject': contract.subject,
                'status': contract.status,
                'status_label': str(status_labels.get(contract.status, contract.status)),
                'contract_type': contract.contract_type,
                'contract_type_label': str(type_labels.get(contract.contract_type, contract.contract_type)),
                'party_id': contract.party_id,
                'party_name': getattr(contract.party, 'name', '') or '',
                'party_national_id': getattr(contract.party, 'national_id', '') or '',
                'party_economic_code': getattr(contract.party, 'economic_code', '') or '',
                'amount': contract.amount,
                'currency': contract.currency_id,
                'start_date': contract.start_date,
                'end_date': contract.end_date,
                'signing_date': contract.signing_date,
                'signatory': contract.signatory_id,
                'project_id': contract.project_id,
                'project_name': getattr(contract.project, 'name', '') or contract.project_name,
                'project_allocations': contract.project_allocations or [],
                'guarantee_amount': contract.guarantee_amount,
                'guarantee_items': contract.guarantee_items or [],
                'payment_terms': contract.payment_terms,
                'penalty_terms': contract.penalty_terms,
                'insurance_terms': contract.insurance_terms,
                'delivery_terms': contract.delivery_terms,
                'category': contract.category,
                'project_location': contract.project_location,
                'description': contract.description,
                'tender_number': contract.tender_number,
                'retention_percent': contract.retention_percent,
                'advance_payment': contract.advance_payment,
                'documents_count': contract.documents_count,
                'invoices_count': contract.invoices_count,
                'statements_count': contract.statements_count,
                'guarantees_count': contract.guarantees_count,
                'invoices_total': invoice_totals.get(contract.pk, 0),
                'document_titles': document_titles.get(contract.pk, []),
            })

        codes = str(request.query_params.get('code') or request.query_params.get('codes') or '')
        try:
            limit = int(request.query_params.get('limit') or 500)
        except (TypeError, ValueError):
            limit = 500

        payload = comp.build_completeness(
            rows,
            today=date.today(),
            codes=[code.strip() for code in codes.split(',') if code.strip()],
            severity=request.query_params.get('severity') or None,
            group=request.query_params.get('group') or None,
            search=request.query_params.get('search') or request.query_params.get('q') or None,
            limit=max(1, min(limit, 2000)),
        )
        return Response(payload)


class ContractTypeMasterViewSet(BaseContractViewSet):
    serializer_class = ContractTypeMasterSerializer
    queryset = ContractTypeMaster.objects.prefetch_related('contracts')
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'code', 'description']
    ordering = ['name']
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'code']
    ordering = ['name']


class SupplierEvaluationViewSet(BaseContractViewSet):
    serializer_class = SupplierEvaluationSerializer
    queryset = SupplierEvaluation.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['party__name', 'period', 'evaluator']
    ordering = ['-evaluation_date']

    def get_queryset(self):
        qs = super().get_queryset().select_related('party', 'contract')
        party_id = self.request.query_params.get('party')
        if party_id:
            qs = qs.filter(party_id=party_id)
        return qs


class ContractDocumentViewSet(BaseContractViewSet):
    serializer_class = ContractDocumentSerializer
    queryset = ContractDocument.objects.all()
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]

    def get_queryset(self):
        qs = super().get_queryset()
        contract_id = self.request.query_params.get('contract')
        if contract_id:
            qs = qs.filter(contract_id=contract_id)
        addendum_id = self.request.query_params.get('addendum')
        if addendum_id:
            qs = qs.filter(addendum_id=addendum_id)
        guarantee_id = self.request.query_params.get('guarantee')
        if guarantee_id:
            qs = qs.filter(guarantee_id=guarantee_id)
        statement_id = self.request.query_params.get('statement')
        if statement_id:
            qs = qs.filter(statement_id=statement_id)
        return qs.select_related('contract', 'addendum', 'guarantee', 'statement')


class InvoiceViewSet(BaseContractViewSet):
    serializer_class = InvoiceSerializer
    queryset = Invoice.objects.select_related('contract', 'currency').prefetch_related('payment_allocations__payment')
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['number', 'subject', 'description', 'contract__subject']
    ordering = ['-date']

    def get_queryset(self):
        qs = super().get_queryset()
        qs = qs.annotate(
            paid_sum=PAID_SUM,
            retention_paid_sum=RETENTION_PAID_SUM,
            insurance_paid_sum=INSURANCE_PAID_SUM,
        )
        contract_id = self.request.query_params.get('contract')
        if contract_id:
            qs = qs.filter(contract_id=contract_id)
        return qs


class StatementViewSet(BaseContractViewSet):
    serializer_class = StatementSerializer
    queryset = Statement.objects.select_related('contract', 'currency').prefetch_related('documents', 'payment_allocations__payment')
    _recalc_fields = {
        'amount', 'date', 'contract', 'additions', 'deductions', 'kind',
        'value_added_tax', 'other_additions', 'cumulative_previous_amount', 'work_done',
        'adjustment_work_done', 'adjustment_foreign_work_done',
    }

    def get_queryset(self):
        qs = super().get_queryset()
        qs = qs.annotate(
            paid_sum=PAID_SUM,
            retention_paid_sum=RETENTION_PAID_SUM,
            insurance_paid_sum=INSURANCE_PAID_SUM,
        )
        contract_id = self.request.query_params.get('contract')
        if contract_id:
            qs = qs.filter(contract_id=contract_id)
        return qs

    def perform_create(self, serializer):
        with transaction.atomic():
            statement = serializer.save(company=_company(self.request))
            recalculate_contract_statements(statement.contract)
            statement.refresh_from_db()

    def perform_update(self, serializer):
        with transaction.atomic():
            old_contract = serializer.instance.contract
            statement = serializer.save()
            # ویرایش صرفاً «تأیید» نباید مبالغ را دوباره محاسبه کند؛ بقیهٔ
            # تغییرهای مؤثر روی زنجیره باید دوره‌های بعدی را هم اصلاح کنند.
            if any(field in serializer.validated_data for field in self._recalc_fields):
                recalculate_contract_statements(statement.contract)
                if old_contract and old_contract.pk != statement.contract_id:
                    recalculate_contract_statements(old_contract)
                statement.refresh_from_db()

    def perform_destroy(self, instance):
        with transaction.atomic():
            contract = instance.contract
            instance.delete()
            recalculate_contract_statements(contract)


class AddendumViewSet(BaseContractViewSet):
    serializer_class = AddendumSerializer
    queryset = Addendum.objects.select_related(
        'contract', 'contract__party', 'contract__currency', 'currency',
    ).prefetch_related(
        Prefetch('documents', queryset=ContractDocument.objects.select_related(
            'contract', 'contract__party', 'addendum', 'guarantee', 'statement',
        )),
        'contract__addendums',
    )
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['number', 'subject', 'change_description', 'contract__subject']
    ordering = ['-date']

    def get_queryset(self):
        qs = super().get_queryset()
        contract_id = self.request.query_params.get('contract')
        if contract_id:
            qs = qs.filter(contract_id=contract_id)
        subject_type = self.request.query_params.get('subject_type')
        if subject_type:
            qs = qs.filter(subject_type=subject_type)
        return qs

    @action(detail=False, methods=['get'], url_path='subject-types')
    def subject_types(self, request):
        """طرح کامل موضوع‌های الحاقیه: عنوان، گروه و فیلدهای تخصصی هر موضوع.

        پارامتر `compact=1` فقط `value`/`label` را برمی‌گرداند (برای فهرست‌های سبک).
        """
        from contracts.addendum_schema import CONTRACT_TARGETS, subject_options

        if request.query_params.get('compact') in ('1', 'true', 'True'):
            return Response([
                {'value': item['value'], 'label': item['label']} for item in subject_options()
            ])
        return Response({
            'subjects': subject_options(),
            'contract_targets': CONTRACT_TARGETS,
        })

    @action(detail=False, methods=['post'], url_path='effect-preview')
    def effect_preview(self, request):
        """اثر «پیش‌نویس» یک الحاقیه روی پروندهٔ قرارداد (بدون ذخیره).

        بدنه: ``{contract, subjects|subject_type, fields..., ignore}``
        """
        from contracts.addendum_effects import effects_from_payload
        from contracts.models import Contract

        company = _company(request)
        contract_id = request.data.get('contract')
        contract = Contract.objects.filter(pk=contract_id, company=company).prefetch_related(
            'addendums').first() if contract_id else None
        if contract is None:
            return Response({'detail': 'قرارداد الزامی است.'}, status=400)
        ignore = request.data.get('ignore') or request.data.get('ignore_id')
        if ignore:
            try:
                ignore = int(ignore)
            except (TypeError, ValueError):
                ignore = None
        return Response(effects_from_payload(contract, request.data, ignore_id=ignore))


class GuaranteeViewSet(BaseContractViewSet):
    serializer_class = GuaranteeSerializer
    queryset = Guarantee.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['number', 'bank', 'contract__subject']
    ordering = ['-expiry_date']

    # نگاشت فیلد شماره/انقضا بر اساس ابزار تضمین در contracts/guarantee_actions.py است.

    def get_queryset(self):
        qs = super().get_queryset().select_related(
            'contract', 'contract__party',
        ).prefetch_related('documents', 'actions')
        contract_id = self.request.query_params.get('contract')
        if contract_id:
            qs = qs.filter(contract_id=contract_id)
        guarantee_type = self.request.query_params.get('guarantee_type')
        if guarantee_type:
            qs = qs.filter(guarantee_type=guarantee_type)
        instrument_type = self.request.query_params.get('instrument_type')
        if instrument_type:
            qs = qs.filter(instrument_type=instrument_type)
        only_active = self.request.query_params.get('active')
        if only_active in ('true', '1'):
            qs = qs.filter(is_released=False)
        return qs

    # ------------------------------------------------------------------ سابقهٔ اقدامات
    def _log_action(self, obj, action, *, date_value=None, previous=None, new=None, note=''):
        """ثبت یک ردیف تاریخچه برای تضمین (مقادیر قبل/بعد)."""
        from datetime import date as date_cls

        from contracts.models import GuaranteeAction

        previous = previous or {}
        new = new or {}
        try:
            GuaranteeAction.objects.create(
                company_id=obj.company_id,
                guarantee=obj,
                action=action,
                date=date_value or date_cls.today(),
                previous_amount=previous.get('amount'),
                new_amount=new.get('amount'),
                previous_expiry_date=previous.get('expiry_date'),
                new_expiry_date=new.get('expiry_date'),
                previous_number=(previous.get('number') or '')[:100],
                new_number=(new.get('number') or '')[:100],
                note=note or '',
            )
        except Exception:  # noqa: BLE001 — تاریخچه نباید عملیات اصلی را بشکند
            logger.exception('guarantee action log failed for %s', obj.pk)

    @staticmethod
    def _drop_action_cache(obj):
        """حذف کش پیش‌واکشی تاریخچه تا پاسخ اقدام، مقادیر تازه را برگرداند."""
        cache = getattr(obj, '_prefetched_objects_cache', None)
        if cache:
            cache.pop('actions', None)


    @staticmethod
    def _snapshot(obj):
        return {
            'amount': obj.amount,
            'expiry_date': obj.expiry_date,
            'number': obj.number or '',
        }

    def perform_create(self, serializer):
        obj = serializer.save(company=_company(self.request))
        self._log_action(
            obj, 'registered',
            date_value=obj.issue_date,
            new=self._snapshot(obj),
            note='ثبت تضمین در سیستم',
        )

    def perform_update(self, serializer):
        previous = self._snapshot(serializer.instance)
        obj = serializer.save()
        current = self._snapshot(obj)
        changes = []
        if previous['number'] != current['number']:
            changes.append('شماره')
        if previous['amount'] != current['amount']:
            changes.append('مبلغ')
        if previous['expiry_date'] != current['expiry_date']:
            changes.append('تاریخ انقضا')
        if not changes:
            return
        if 'شماره' in changes:
            self._log_action(
                obj, 'number_changed',
                previous=previous, new=current, note='تغییر شمارهٔ تضمین',
            )
        self._log_action(
            obj, 'updated',
            previous=previous, new=current, note='ویرایش: ' + '، '.join(changes),
        )

    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        """تاریخچهٔ اقدامات تضمین (تمدید/تقلیل/تغییر شماره/استرداد/…)."""
        from contracts.models import GuaranteeAction
        from contracts.serializers import GuaranteeActionSerializer
        obj = self.get_object()
        # کوئری تازه (نه کش پیش‌واکشی) تا تاریخچه بلافاصله پس از هر اقدام درست باشد.
        rows = GuaranteeAction.objects.filter(guarantee_id=obj.pk)
        serializer = GuaranteeActionSerializer(rows, many=True)
        summary = {
            'total': rows.count(),
            'extended': rows.filter(action='extended').count(),
            'reduced': rows.filter(action='reduced').count(),
        }
        return Response({'results': serializer.data, 'summary': summary})

    @action(detail=True, methods=['post'])
    def release(self, request, pk=None):
        """Release a guarantee and record the release date."""
        from datetime import date
        obj = self.get_object()
        previous = self._snapshot(obj)
        action_date = request.data.get('release_date') or date.today().isoformat()
        obj.is_released = True
        obj.release_date = action_date
        obj.last_action = 'returned'
        obj.last_action_date = action_date
        obj.save(update_fields=['is_released', 'release_date', 'last_action', 'last_action_date', 'updated_at'])
        self._log_action(
            obj, 'returned', date_value=action_date,
            previous=previous, new=previous, note=request.data.get('note') or 'استرداد تضمین',
        )
        self._drop_action_cache(obj)
        return Response(GuaranteeSerializer(obj, context={'request': request}).data)


    @action(detail=True, methods=['post'])
    def lifecycle(self, request, pk=None):
        """اقدامات چرخهٔ عمر: استرداد / اجرا / ابطال / تمدید / تقلیل.

        در «تمدید» و «تقلیل» می‌توان شمارهٔ جدید تضمین را (اختیاری) ثبت کرد؛
        تغییر شماره در تاریخچهٔ تضمین ذخیره می‌شود.
        """
        from datetime import date

        from contracts.guarantee_actions import (
            GuaranteeActionError, action_expiry_field, action_number_field,
            compose_release_note, resolve_reduced_amount,
        )

        obj = self.get_object()
        action = request.data.get('action')
        valid = {'returned', 'released', 'executed', 'canceled', 'extended', 'reduced'}
        if action not in valid:
            return Response({'error': 'اقدام نامعتبر است.'}, status=400)

        previous = self._snapshot(obj)
        action_date = request.data.get('date') or date.today().isoformat()
        note = str(request.data.get('note') or '').strip()
        if action in ('released', 'returned'):
            note = compose_release_note(request.data.get('release_reason'), note)
            if not note:
                note = 'آزادسازی تضمین پس از انجام تعهدات'
        new_number = str(request.data.get('new_number') or '').strip()
        new_expiry = request.data.get('new_expiry_date') or None

        update_fields = ['last_action', 'last_action_date', 'updated_at']

        if action in ('returned', 'released', 'executed', 'canceled'):
            obj.is_released = True
            update_fields.append('is_released')
            if action in ('returned', 'released'):
                obj.release_date = action_date
                update_fields.append('release_date')

        if action == 'extended':
            obj.is_released = False
            update_fields.append('is_released')
            if new_expiry:
                obj.expiry_date = new_expiry
                update_fields.append('expiry_date')
                expiry_field = action_expiry_field(obj.instrument_type)
                if expiry_field:
                    setattr(obj, expiry_field, new_expiry)
                    update_fields.append(expiry_field)

        if action == 'reduced':
            try:
                target_amount = resolve_reduced_amount(
                    obj.amount,
                    reduction_amount=request.data.get('reduction_amount'),
                    new_amount=request.data.get('new_amount'),
                )
            except GuaranteeActionError as error:
                return Response({'error': str(error)}, status=400)
            obj.amount = target_amount
            update_fields.append('amount')
            # تقلیل تضمین را آزاد نمی‌کند؛ فقط سقف تعهد کاهش می‌یابد.
            if obj.is_released and obj.last_action in ('returned', 'executed', 'canceled'):
                obj.is_released = False
                update_fields.append('is_released')

        if new_number and new_number != previous['number']:
            obj.number = new_number
            update_fields.append('number')
            number_field = action_number_field(obj.instrument_type)
            if number_field:
                setattr(obj, number_field, new_number)
                update_fields.append(number_field)

        obj.last_action = action
        obj.last_action_date = action_date
        obj.save(update_fields=list(dict.fromkeys(update_fields)))

        current = self._snapshot(obj)
        if new_number and new_number != previous['number']:
            self._log_action(
                obj, 'number_changed', date_value=action_date,
                previous=previous, new=current,
                note='شمارهٔ جدید در ' + {
                    'extended': 'تمدید', 'reduced': 'تقلیل',
                }.get(action, 'اقدام'),
            )
        self._log_action(
            obj, action, date_value=action_date,
            previous=previous, new=current, note=note,
        )
        self._drop_action_cache(obj)
        return Response(GuaranteeSerializer(obj, context={'request': request}).data)


class PaymentViewSet(BaseContractViewSet):
    serializer_class = PaymentSerializer
    queryset = Payment.objects.select_related(
        'contract', 'currency', 'invoice', 'statement', 'statement__currency',
    ).prefetch_related(
        'attachments', 'allocations', 'allocations__statement', 'allocations__invoice',
    )
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['reference', 'method', 'note', 'contract__subject', 'invoice__number', 'statement__number']
    ordering = ['-date']

    def get_queryset(self):
        qs = super().get_queryset()
        contract_id = self.request.query_params.get('contract')
        if contract_id:
            qs = qs.filter(contract_id=contract_id)
        return qs

    def perform_create(self, serializer):
        with transaction.atomic():
            obj = serializer.save(company=_company(self.request))
        try:
            from accounting.integrations import enqueue_contract_payment
            enqueue_contract_payment(_company(self.request), obj)
        except Exception:
            pass
        return obj

    def perform_update(self, serializer):
        with transaction.atomic():
            obj = serializer.save()
        return obj


class PaymentAttachmentViewSet(BaseContractViewSet):
    serializer_class = PaymentAttachmentSerializer
    queryset = PaymentAttachment.objects.select_related('payment', 'payment__contract')
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]
    filter_backends = [filters.OrderingFilter]
    ordering = ['-uploaded_at']

    def get_queryset(self):
        qs = super().get_queryset()
        payment_id = self.request.query_params.get('payment')
        if payment_id:
            qs = qs.filter(payment_id=payment_id)
        return qs


class ContractDisputeViewSet(BaseContractViewSet):
    serializer_class = ContractDisputeSerializer
    queryset = ContractDispute.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description']
    ordering = ['-opened_date']

    def get_queryset(self):
        qs = super().get_queryset().select_related('contract')
        contract_id = self.request.query_params.get('contract')
        if contract_id:
            qs = qs.filter(contract_id=contract_id)
        status = self.request.query_params.get('status')
        if status:
            qs = qs.filter(status=status)
        return qs


class ContractTemplateViewSet(BaseContractViewSet):
    serializer_class = ContractTemplateSerializer
    queryset = ContractTemplate.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering = ['name']

    def get_queryset(self):
        qs = super().get_queryset()
        type_id = self.request.query_params.get('contract_type_master')
        if type_id:
            qs = qs.filter(contract_type_master_id=type_id)
        return qs


class ContractDraftViewSet(BaseContractViewSet):
    serializer_class = ContractDraftSerializer
    queryset = ContractDraft.objects.select_related('template', 'contract').prefetch_related('approvals')
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'submitted_by']
    ordering = ['-updated_at']

    def get_queryset(self):
        qs = super().get_queryset()
        status = self.request.query_params.get('status')
        if status:
            qs = qs.filter(status=status)
        return qs

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """ارسال پیش‌نویس برای تأیید (ورود به گردش‌کار)."""
        from django.utils import timezone
        obj = self.get_object()
        obj.status = ContractDraft.Status.PENDING
        obj.submitted_at = timezone.now()
        obj.submitted_by = request.data.get('submitted_by') or obj.submitted_by
        obj.save(update_fields=['status', 'submitted_at', 'submitted_by', 'updated_at'])
        return Response(ContractDraftSerializer(obj, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """تأیید نهایی پیش‌نویس."""
        obj = self.get_object()
        obj.status = ContractDraft.Status.APPROVED
        obj.save(update_fields=['status', 'updated_at'])
        return Response(ContractDraftSerializer(obj, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """رد پیش‌نویس."""
        obj = self.get_object()
        obj.status = ContractDraft.Status.REJECTED
        obj.save(update_fields=['status', 'updated_at'])
        return Response(ContractDraftSerializer(obj, context={'request': request}).data)


class ContractApprovalViewSet(BaseContractViewSet):
    serializer_class = ContractApprovalSerializer
    queryset = ContractApproval.objects.select_related('draft')
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['approver', 'draft__title']
    ordering = ['draft', 'step']

    def get_queryset(self):
        qs = super().get_queryset()
        draft_id = self.request.query_params.get('draft')
        if draft_id:
            qs = qs.filter(draft_id=draft_id)
        status = self.request.query_params.get('status')
        if status:
            qs = qs.filter(status=status)
        return qs

    @action(detail=True, methods=['post'])
    def decide(self, request, pk=None):
        """اقدام روی یک مرحله: تأیید یا رد."""
        from django.utils import timezone
        obj = self.get_object()
        decision = request.data.get('decision')  # 'approve' | 'reject'
        comment = request.data.get('comment') or obj.comment
        if decision == 'approve':
            obj.status = ContractApproval.Status.APPROVED
        elif decision == 'reject':
            obj.status = ContractApproval.Status.REJECTED
        else:
            return Response({'error': 'تصمیم نامعتبر است'}, status=400)
        obj.comment = comment
        obj.acted_at = timezone.now()
        obj.save(update_fields=['status', 'comment', 'acted_at', 'updated_at'])
        return Response(ContractApprovalSerializer(obj).data)


class ContractApprovalWorkflowViewSet(BaseContractViewSet):
    serializer_class = ContractApprovalWorkflowSerializer
    queryset = ContractApprovalWorkflow.objects.select_related('contract_type').prefetch_related('steps')
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description', 'contract_type__name']
    ordering = ['name']

    def get_queryset(self):
        qs = super().get_queryset()
        contract_type = self.request.query_params.get('contract_type')
        if contract_type:
            qs = qs.filter(contract_type_id=contract_type)
        return qs


class ContractApprovalStepViewSet(BaseContractViewSet):
    serializer_class = ContractApprovalStepSerializer
    queryset = ContractApprovalStep.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'approver_role']
    ordering = ['workflow', 'step']

    def get_queryset(self):
        qs = super().get_queryset()
        workflow_id = self.request.query_params.get('workflow')
        if workflow_id:
            qs = qs.filter(workflow_id=workflow_id)
        return qs


class ContractAccountMappingViewSet(viewsets.GenericViewSet):
    """پیکربندی «نگاشت و کنترل» حساب‌های مالی قراردادها."""

    serializer_class = ContractAccountMappingSerializer

    def _company(self):
        return _company(self.request)

    def list(self, request):
        company = self._company()
        if not company:
            return Response({'definitions': MAPPING_DEFINITIONS, 'mappings': [], 'summary': {}})
        return Response({
            'definitions': MAPPING_DEFINITIONS,
            'mappings': contract_mapping_rows(company),
            'sources': AUXILIARY_SOURCES,
            'control_modes': CONTROL_MODES,
            'summary': contract_mapping_summary(company),
        })

    def _validated_payload(self, item):
        allowed = {
            'key', 'title', 'subsidiary_account',
            'auxiliary_source_1', 'auxiliary_category_1', 'auxiliary_1',
            'auxiliary_source_2', 'auxiliary_category_2', 'auxiliary_2',
            'auxiliary_source_3', 'auxiliary_category_3', 'auxiliary_3',
            'auto_create_auxiliaries', 'enforce_auxiliary', 'control_mode',
            'notes', 'sort_order', 'is_active',
        }
        data = {key: value for key, value in item.items() if key in allowed}
        serializer = self.get_serializer(data=data, context={
            'request': self.request, 'company': self._company(),
        })
        serializer.is_valid(raise_exception=True)
        return serializer.validated_data

    @action(detail=False, methods=['put'], url_path='bulk')
    def bulk(self, request):
        company = self._company()
        if not company:
            return Response({'detail': 'شرکت جاری مشخص نیست.'}, status=400)
        items = request.data.get('items')
        if not isinstance(items, list):
            return Response({'detail': 'فهرست نگاشت‌ها ارسال نشده است.'}, status=400)

        normalized = []
        for item in items:
            if not isinstance(item, dict):
                continue
            key = item.get('key')
            if key not in MAPPING_BY_KEY:
                return Response({'detail': f'کلید نگاشت نامعتبر است: {key}'}, status=400)
            normalized.append(item)

        with transaction.atomic():
            for item in normalized:
                payload = self._validated_payload(item)
                key = payload.pop('key')
                ContractAccountMapping.objects.update_or_create(
                    company=company, key=key, defaults=payload,
                )

        return self.list(request)

    @action(detail=False, methods=['get'], url_path='resolve')
    def resolve(self, request):
        company = self._company()
        if not company:
            return Response({'detail': 'شرکت جاری مشخص نیست.'}, status=400)
        event = request.query_params.get('event')
        if event:
            return Response(resolve_event_mapping(company, event))
        key = request.query_params.get('key')
        if not key:
            return Response({'detail': 'key یا event لازم است.'}, status=400)
        mapping = resolve_contract_mapping(company, key)
        if mapping is None:
            return Response({'detail': 'کلید نگاشت یافت نشد.'}, status=404)
        return Response(mapping)
