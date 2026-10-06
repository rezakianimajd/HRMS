"""Views for the Contracts module."""
from rest_framework import viewsets, filters, parsers
from rest_framework.decorators import action
from rest_framework.response import Response
from contracts.models import (
    ContractParty, Contract, ContractDocument, Invoice, Statement,
    Addendum, Guarantee, Payment, ContractDispute,
    ContractTypeMaster, SupplierEvaluation,
    ContractTemplate, ContractDraft, ContractApproval,
    ContractApprovalWorkflow, ContractApprovalStep,
    ContractAuditLog,
)
from contracts.serializers import (
    ContractPartySerializer, ContractSerializer, ContractDocumentSerializer,
    InvoiceSerializer, StatementSerializer, AddendumSerializer,
    GuaranteeSerializer, PaymentSerializer, ContractDisputeSerializer,
    ContractTypeMasterSerializer, SupplierEvaluationSerializer,
    ContractTemplateSerializer, ContractDraftSerializer, ContractApprovalSerializer,
    ContractApprovalWorkflowSerializer, ContractApprovalStepSerializer,
    ContractAuditLogSerializer,
)


def _company(request):
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


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

    def get_queryset(self):
        qs = super().get_queryset().select_related('party', 'signatory').prefetch_related(
            'documents', 'invoices', 'statements', 'addendums', 'guarantees', 'payments', 'audit_logs',
        )
        party_id = self.request.query_params.get('party')
        if party_id:
            qs = qs.filter(party_id=party_id)
        contract_type = self.request.query_params.get('contract_type')
        if contract_type:
            qs = qs.filter(contract_type=contract_type)
        status = self.request.query_params.get('status')
        if status:
            qs = qs.filter(status=status)
        return qs

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

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Aggregated dashboard statistics for contracts (server-side)."""
        from datetime import date, timedelta
        from django.db.models import Count, Sum
        qs = self.get_queryset()
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
        return qs


class InvoiceViewSet(BaseContractViewSet):
    serializer_class = InvoiceSerializer
    queryset = Invoice.objects.select_related('contract', 'currency')
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['number', 'subject', 'description', 'contract__subject']
    ordering = ['-date']

    def get_queryset(self):
        qs = super().get_queryset()
        contract_id = self.request.query_params.get('contract')
        if contract_id:
            qs = qs.filter(contract_id=contract_id)
        return qs


class StatementViewSet(BaseContractViewSet):
    serializer_class = StatementSerializer
    queryset = Statement.objects.all()

    def get_queryset(self):
        qs = super().get_queryset()
        contract_id = self.request.query_params.get('contract')
        if contract_id:
            qs = qs.filter(contract_id=contract_id)
        return qs


class AddendumViewSet(BaseContractViewSet):
    serializer_class = AddendumSerializer
    queryset = Addendum.objects.select_related('contract', 'currency')
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['number', 'subject', 'change_description', 'contract__subject']
    ordering = ['-date']

    def get_queryset(self):
        qs = super().get_queryset()
        contract_id = self.request.query_params.get('contract')
        if contract_id:
            qs = qs.filter(contract_id=contract_id)
        return qs


class GuaranteeViewSet(BaseContractViewSet):
    serializer_class = GuaranteeSerializer
    queryset = Guarantee.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['number', 'bank', 'contract__subject']
    ordering = ['-expiry_date']

    def get_queryset(self):
        qs = super().get_queryset().select_related('contract', 'contract__party')
        contract_id = self.request.query_params.get('contract')
        if contract_id:
            qs = qs.filter(contract_id=contract_id)
        guarantee_type = self.request.query_params.get('guarantee_type')
        if guarantee_type:
            qs = qs.filter(guarantee_type=guarantee_type)
        only_active = self.request.query_params.get('active')
        if only_active in ('true', '1'):
            qs = qs.filter(is_released=False)
        return qs

    @action(detail=True, methods=['post'])
    def release(self, request, pk=None):
        """Release a guarantee and record the release date."""
        from datetime import date
        obj = self.get_object()
        obj.is_released = True
        obj.release_date = request.data.get('release_date') or date.today().isoformat()
        obj.last_action = 'returned'
        obj.last_action_date = date.today().isoformat()
        obj.save(update_fields=['is_released', 'release_date', 'last_action', 'last_action_date', 'updated_at'])
        return Response(GuaranteeSerializer(obj, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def lifecycle(self, request, pk=None):
        """Apply a lifecycle action (returned/executed/canceled/extended)."""
        from datetime import date
        obj = self.get_object()
        action = request.data.get('action')
        valid = {'returned', 'executed', 'canceled', 'extended'}
        if action not in valid:
            return Response({'error': 'اقدام نامعتبر است.'}, status=400)

        if action != 'extended':
            obj.is_released = True
        else:
            obj.is_released = False

        obj.last_action = action
        obj.last_action_date = request.data.get('date') or date.today().isoformat()

        # For extension, optionally push the expiry date forward.
        new_expiry = request.data.get('new_expiry_date')
        if action == 'extended' and new_expiry:
            obj.expiry_date = new_expiry
            if obj.instrument_type in ('bank_guarantee', 'check_and_guarantee', 'promissory_and_guarantee'):
                obj.guarantee_expiry_date = new_expiry

        update_fields = ['is_released', 'last_action', 'last_action_date', 'updated_at']
        if action == 'extended' and new_expiry:
            update_fields += ['expiry_date', 'guarantee_expiry_date']
        obj.save(update_fields=update_fields)
        return Response(GuaranteeSerializer(obj, context={'request': request}).data)


class PaymentViewSet(BaseContractViewSet):
    serializer_class = PaymentSerializer
    queryset = Payment.objects.select_related('contract', 'currency', 'invoice', 'statement')
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
        obj = serializer.save(company=_company(self.request))
        try:
            from accounting.integrations import enqueue_contract_payment
            enqueue_contract_payment(_company(self.request), obj)
        except Exception:
            pass
        return obj


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
        obj.save(update_fields=['status', 'comment', 'acted_at', 'updated_at'])
        return Response(ContractApprovalSerializer(obj).data)
