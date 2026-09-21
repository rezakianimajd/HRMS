"""Views for the Petty Cash module."""
from django.utils import timezone
from django.db.models import Sum, Count
from rest_framework import viewsets, filters, parsers
from rest_framework.decorators import action
from rest_framework.response import Response
from pettycash.models import (
    PettyCashFund, PettyCashTransaction, PettyCashCategory,
    PettyCashExpenseStatement, PettyCashApprovalPolicy, PettyCashApprovalStep,
)
from pettycash.serializers import (
    PettyCashFundSerializer, PettyCashTransactionSerializer, PettyCashCategorySerializer,
    PettyCashExpenseStatementSerializer, PettyCashApprovalPolicySerializer,
    PettyCashApprovalStepSerializer,
)


def _company(request):
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


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
        if company:
            qs = qs.filter(company=company)
        return qs

    def perform_create(self, serializer):
        serializer.save(company=_company(self.request))


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
        statement_id = self.request.query_params.get('statement')
        if statement_id:
            qs = qs.filter(statement_id=statement_id)
        return qs

    def perform_create(self, serializer):
        obj = serializer.save(company=_company(self.request))
        # به‌روزرسانی وضعیت صورت بر اساس تصمیم
        st = obj.statement
        if obj.decision == PettyCashApprovalStep.Decision.APPROVED:
            nxt = st.approval_steps.filter(decision=PettyCashApprovalStep.Decision.PENDING).order_by('step_no').first()
            if not nxt:
                st.status = PettyCashExpenseStatement.Status.APPROVED
                st.approved_by = obj.approver
                st.approved_at = timezone.now()
        elif obj.decision == PettyCashApprovalStep.Decision.REJECTED:
            st.status = PettyCashExpenseStatement.Status.REJECTED
        st.save()
        return obj


class PettyCashFundViewSet(BaseViewSet):
    serializer_class = PettyCashFundSerializer
    queryset = PettyCashFund.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['code', 'title', 'custodian__first_name', 'custodian__last_name']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = super().get_queryset().select_related('custodian')
        status = self.request.query_params.get('status')
        if status:
            qs = qs.filter(status=status)
        # تنخواه‌دار فقط تنخواه خودش را ببیند
        if self.request.query_params.get('mine') == '1':
            emp_id = getattr(getattr(self.request.user, 'profile', None), 'employee_id', None)
            if emp_id:
                qs = qs.filter(custodian_id=emp_id)
        return qs

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
                    'funds': [], 'total_balance': 0,
                }
            by_emp[e.id]['funds'].append({'id': f.id, 'title': f.title, 'code': f.code, 'balance': float(f.balance)})
            by_emp[e.id]['total_balance'] += float(f.balance)
        data = list(by_emp.values())
        data.sort(key=lambda x: x['name'])
        return Response(data)

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        obj = self.get_object()
        obj.status = 'archived'
        obj.archived_at = timezone.now()
        obj.save(update_fields=['status', 'archived_at', 'updated_at'])
        return Response(PettyCashFundSerializer(obj).data)

    @action(detail=True, methods=['post'])
    def reconcile(self, request, pk=None):
        """مغایرت‌گیری تنخواه."""
        obj = self.get_object()
        obj.is_reconciled = True
        obj.reconciled_at = timezone.now()
        obj.reconciled_by = request.user
        obj.save(update_fields=['is_reconciled', 'reconciled_at', 'reconciled_by', 'updated_at'])
        return Response(PettyCashFundSerializer(obj).data)

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """داشبورد تحلیلی تنخواه."""
        company = _company(request)
        funds = PettyCashFund.objects.filter(company=company).select_related('custodian')
        stmts = PettyCashExpenseStatement.objects.filter(company=company)
        txns = PettyCashTransaction.objects.filter(company=company)

        from django.db.models import Sum
        total_balance = sum(f.balance for f in funds)
        active_funds = funds.filter(status='active').count()
        pending_total = stmts.filter(status='submitted').aggregate(s=Sum('total_debit'))['s'] or 0
        monthly_spend = txns.filter(entry_type='debit', date__month=timezone.now().month, date__year=timezone.now().year).aggregate(s=Sum('amount'))['s'] or 0

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

        return Response({
            'total_balance': float(total_balance),
            'active_funds': active_funds,
            'pending_total': float(pending_total),
            'monthly_spend': float(monthly_spend),
            'by_category': by_category,
            'by_custodian': by_custodian,
            'status_counts': status_counts,
            'total_statements': stmts.count(),
        })

    @action(detail=True, methods=['get'])
    def ledger(self, request, pk=None):
        """دفتر حساب: خلاصهٔ تراکنش‌ها و مانده."""
        obj = self.get_object()
        txs = obj.transactions.order_by('date', 'created_at')
        from django.db.models import Sum
        credits = obj.transactions.filter(entry_type='credit').aggregate(s=Sum('amount'))['s'] or 0
        debits = obj.transactions.filter(entry_type='debit').aggregate(s=Sum('amount'))['s'] or 0
        return Response({
            'fund': PettyCashFundSerializer(obj).data,
            'opening_balance': obj.opening_balance,
            'total_credits': credits,
            'total_debits': debits,
            'balance': obj.balance,
            'transactions': PettyCashTransactionSerializer(txs, many=True, context={'request': request}).data,
        })


class PettyCashExpenseStatementViewSet(BaseViewSet):
    """صورت ریز هزینهٔ تنخواه با چرخهٔ ارسال/برگشت/ثبت."""
    serializer_class = PettyCashExpenseStatementSerializer
    queryset = PettyCashExpenseStatement.objects.all()

    def get_queryset(self):
        qs = super().get_queryset().select_related('fund', 'custodian').prefetch_related('lines__account')
        fund_id = self.request.query_params.get('fund')
        if fund_id:
            qs = qs.filter(fund_id=fund_id)
        # تنخواه‌دار فقط صورت‌های خودش را ببیند
        if self.request.query_params.get('mine') == '1':
            emp_id = getattr(getattr(self.request.user, 'profile', None), 'employee_id', None)
            if emp_id:
                qs = qs.filter(custodian_id=emp_id)
        return qs

    def perform_create(self, serializer):
        company = _company(self.request)
        fund = serializer.validated_data['fund']
        serializer.save(company=company, custodian=fund.custodian)

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        st = self.get_object()
        st.status = 'submitted'
        st.submitted_by = request.user
        st.submitted_at = timezone.now()
        st.save(update_fields=['status', 'submitted_by', 'submitted_at', 'updated_at'])
        st.history = [*st.history, {'step': 'submitted', 'by': request.user.username, 'at': timezone.now().isoformat()}]
        st.save(update_fields=['history'])
        # اعلان به حسابداری/مدیران (user_id=None = سراسری)
        _notify(st.company, 'صورت هزینهٔ تنخواه ارسال شد', f'{st.custodian.full_name if st.custodian else ""} صورت {st.number or st.pk} را به حسابداری ارسال کرد.', entity_id=st.pk, priority='high')
        # ثبت در صف حسابداری
        try:
            from accounting.integrations import enqueue
            src = enqueue(company=_company(request), source_module='pettycash', source_type='expense_statement', source_id=str(st.pk), payload={'total': str(st.total)})
            st.source_transaction = src
            st.save(update_fields=['source_transaction'])
        except Exception:
            pass
        return Response(PettyCashExpenseStatementSerializer(st).data)

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

    @action(detail=True, methods=['post'])
    def mark_status(self, request, pk=None):
        """به‌روزرسانی وضعیت از سمت حسابداری (approved/rejected/edited/posted)."""
        st = self.get_object()
        new_status = request.data.get('status')
        note = request.data.get('note', '')
        if new_status not in ['approved', 'rejected', 'edited', 'posted']:
            return Response({'error': 'وضعیت نامعتبر'}, status=400)
        st.status = new_status
        if new_status in ('approved', 'posted'):
            st.approved_by = request.user
            st.approved_at = timezone.now()
        st.save(update_fields=['status', 'approved_by', 'approved_at', 'updated_at'])
        st.history = [*st.history, {'step': new_status, 'by': request.user.username, 'note': note, 'at': timezone.now().isoformat()}]
        st.save(update_fields=['history'])
        # اعلان به تنخواه‌دار
        custodian_user = None
        if st.submitted_by:
            custodian_user = st.submitted_by_id
        _notify(st.company, f'صورت هزینهٔ تنخواه {st.get_status_display()}', f'وضعیت صورت {st.number or st.pk} تغییر کرد: {st.get_status_display()}', user_id=custodian_user, entity_id=st.pk)
        # اگر ثبت نهایی شد، هزینهٔ تنخواه را کم کن (تراکنش debit)
        if new_status == 'posted':
            PettyCashTransaction.objects.get_or_create(
                company=st.company_id, fund=st.fund, entry_type='debit',
                amount=st.total, title=f'صورت هزینه {st.number or st.pk}', date=st.date,
                defaults={'description': st.description},
            )
        return Response(PettyCashExpenseStatementSerializer(st).data)


class PettyCashTransactionViewSet(BaseViewSet):
    serializer_class = PettyCashTransactionSerializer
    queryset = PettyCashTransaction.objects.all()
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description']
    ordering = ['-date', '-created_at']

    def perform_create(self, serializer):
        obj = serializer.save(company=_company(self.request))
        try:
            from accounting.integrations import enqueue_pettycash_transaction
            enqueue_pettycash_transaction(_company(self.request), obj)
        except Exception:
            pass
        return obj

    def get_queryset(self):
        qs = super().get_queryset().select_related('fund', 'category')
        fund_id = self.request.query_params.get('fund')
        if fund_id:
            qs = qs.filter(fund_id=fund_id)
        entry_type = self.request.query_params.get('entry_type')
        if entry_type:
            qs = qs.filter(entry_type=entry_type)
        return qs

    @action(detail=True, methods=['post'])
    def toggle_archive(self, request, pk=None):
        obj = self.get_object()
        obj.is_archived = not obj.is_archived
        obj.archived_at = timezone.now() if obj.is_archived else None
        obj.save(update_fields=['is_archived', 'archived_at', 'updated_at'])
        return Response(PettyCashTransactionSerializer(obj).data)
