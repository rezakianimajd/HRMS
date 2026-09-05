"""Views for the Attendance module."""
from rest_framework import viewsets, filters, status
from rest_framework.response import Response
from rest_framework.decorators import action
from datetime import date
from django.db.models import Count, Q
from django.db.models.functions import Coalesce

from attendance.models import AttendanceRecord
from attendance.serializers import AttendanceRecordSerializer


def _company(request):
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


class AttendanceRecordViewSet(viewsets.ModelViewSet):
    """CRUD for daily attendance records, multi-tenant, by employee/filters."""
    serializer_class = AttendanceRecordSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['employee__first_name', 'employee__last_name', 'employee__employee_id', 'employee__national_id']
    ordering_fields = ['date', 'employee__employee_id', 'created_at']
    ordering = ['-date']

    def get_queryset(self):
        qs = AttendanceRecord.objects.select_related('employee')
        company = _company(self.request)
        if company:
            qs = qs.filter(company=company)

        employee_id = self.request.query_params.get('employee_id')
        if employee_id:
            qs = qs.filter(employee_id=employee_id)

        status_q = self.request.query_params.get('status')
        if status_q:
            qs = qs.filter(status=status_q)

        # date_from / date_to (ISO format YYYY-MM-DD)
        date_from = self.request.query_params.get('date_from')
        if date_from:
            qs = qs.filter(date__gte=date_from)
        date_to = self.request.query_params.get('date_to')
        if date_to:
            qs = qs.filter(date__lte=date_to)

        return qs

    def perform_create(self, serializer):
        serializer.save(company=_company(self.request))

    @action(detail=False, methods=['get'])
    def month_summary(self, request):
        """Grouped counts by status for a given year/month (Jalali)."""
        from jdatetime import date as jdate
        from datetime import timedelta

        company = _company(request)

        # Defaults to current Jalali month
        jtoday = jdate.today()
        year = int(request.query_params.get('year', jtoday.year))
        month = int(request.query_params.get('month', jtoday.month))

        # Compute first/last day of the Jalali month in Gregorian
        first_j = jdate(year, month, 1)
        if month == 12:
            last_j = jdate(year + 1, 1, 1) - timedelta(days=1)
        else:
            last_j = jdate(year, month + 1, 1) - timedelta(days=1)

        qs = AttendanceRecord.objects.filter(
            date__gte=first_j.togregorian(),
            date__lte=last_j.togregorian(),
        )
        if company:
            qs = qs.filter(company=company)
        employee_id = request.query_params.get('employee_id')
        if employee_id:
            qs = qs.filter(employee_id=employee_id)

        grouped = (qs.values('status')
                   .annotate(total=Count('id'))
                   .order_by('status'))

        present_q = qs.filter(status=AttendanceRecord.Status.PRESENT)
        total_work_h = sum(float(r.work_hours or 0) for r in present_q)
        total_ot_h = sum(float(r.overtime_hours or 0) for r in present_q)

        by_status = {g['status']: g['total'] for g in grouped}
        return Response({
            'year': year,
            'month': month,
            'days': (last_j.day),
            'by_status': by_status,
            'total_days': qs.count(),
            'present_days': by_status.get('present', 0),
            'absent_days': by_status.get('absent', 0),
            'leave_days': by_status.get('leave', 0),
            'mission_days': by_status.get('mission', 0),
            'total_work_hours': round(total_work_h, 1),
            'total_overtime_hours': round(total_ot_h, 1),
        })

    @action(detail=False, methods=['get'])
    def today(self, request):
        """All today's records (for quick overview)."""
        qs = self.get_queryset().filter(date=date.today())
        return Response(self.get_serializer(qs, many=True).data)