"""Views for the Leaves module."""
from rest_framework import viewsets, filters, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.conf import settings

from leaves.models import LeaveRequest
from leaves.serializers import LeaveRequestSerializer
from settings_app.engines.settings_engine import SettingsEngine


def _company(request):
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


class LeaveRequestViewSet(viewsets.ModelViewSet):
    serializer_class = LeaveRequestSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['employee__first_name', 'employee__last_name', 'employee__employee_id', 'employee__national_id', 'reason']
    ordering_fields = ['created_at', 'start_date', 'employee__employee_id']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = LeaveRequest.objects.select_related('employee')
        company = _company(self.request)
        if company:
            qs = qs.filter(company=company)

        employee_id = self.request.query_params.get('employee_id')
        if employee_id:
            qs = qs.filter(employee_id=employee_id)

        leave_type = self.request.query_params.get('leave_type')
        if leave_type:
            qs = qs.filter(leave_type=leave_type)

        status_q = self.request.query_params.get('status')
        if status_q:
            qs = qs.filter(status=status_q)

        return qs

    def perform_create(self, serializer):
        serializer.save(company=_company(self.request))

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a pending leave request (admin/HR only by permission)."""
        from core.engines.permission_engine import require
        require(request.user, 'can_approve_leaves')
        obj = self.get_object()
        if obj.status != LeaveRequest.Status.PENDING:
            return Response({'error': 'فقط درخواستهای در انتظار قابل تأیید هستند.'}, status=400)
        obj.status = LeaveRequest.Status.APPROVED
        obj.save(update_fields=['status', 'updated_at'])
        return Response(LeaveRequestSerializer(obj).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject a pending leave request."""
        from core.engines.permission_engine import require
        require(request.user, 'can_approve_leaves')
        obj = self.get_object()
        if obj.status != LeaveRequest.Status.PENDING:
            return Response({'error': 'فقط درخواستهای در انتظار قابل رد هستند.'}, status=400)
        obj.status = LeaveRequest.Status.REJECTED
        obj.save(update_fields=['status', 'updated_at'])
        return Response(LeaveRequestSerializer(obj).data)

    @action(detail=False, methods=['get'])
    def balance(self, request):
        """Remaining annual leave for a given employee (default: today's Jalali year)."""
        from jdatetime import date as jdate

        employee_id = request.query_params.get('employee_id')
        if not employee_id:
            return Response({'error': 'employee_id الزامی است'}, status=400)

        company = _company(request)
        annual = int(SettingsEngine.get_effective_setting(
            'LEAVE_DEFAULT_TOTAL_DAYS', default=30, company=company,
        ) or 30)

        # Sum approved leave days in current Jalali year (excluding mission — that is not leave)
        today = jdate.today()
        from datetime import timedelta
        year_start_j = jdate(today.year, 1, 1)
        if today.month == 12:
            year_end_j = jdate(today.year + 1, 1, 1) - timedelta(days=1)
        else:
            year_end_j = jdate(today.year, today.month + 1, 1) - timedelta(days=1)

        qs = LeaveRequest.objects.filter(
            employee_id=employee_id,
            leave_type__in=[LeaveRequest.LeaveType.ANNUAL, LeaveRequest.LeaveType.SICK, LeaveRequest.LeaveType.UNPAID],
            status=LeaveRequest.Status.APPROVED,
            start_date__lte=year_end_j.togregorian(),
            end_date__gte=year_start_j.togregorian(),
        )
        if company:
            qs = qs.filter(company=company)

        used = sum(float(r.days or 0) for r in qs)
        remaining = max(0, annual - used)

        return Response({
            'year': today.year,
            'annual_entitlement': annual,
            'used_days': round(used, 1),
            'remaining_days': round(remaining, 1),
        })