"""Views for the Employee Lifecycle module."""
from datetime import date, timedelta

from rest_framework import viewsets, filters
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from lifecycle.models import Asset, LifecycleChecklist, ChecklistItem, CalendarEvent
from lifecycle.serializers import (
    AssetSerializer, LifecycleChecklistSerializer,
    ChecklistItemSerializer, CalendarEventSerializer,
)


def _company(request):
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


class AssetViewSet(viewsets.ModelViewSet):
    queryset = Asset.objects.select_related('employee')
    serializer_class = AssetSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'serial_number', 'employee__first_name', 'employee__last_name', 'employee__employee_id']
    ordering_fields = ['assigned_date', 'created_at', 'status']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = super().get_queryset()
        company = _company(self.request)
        if company:
            qs = qs.filter(company=company)
        employee_id = self.request.query_params.get('employee_id')
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        status_q = self.request.query_params.get('status')
        if status_q:
            qs = qs.filter(status=status_q)
        return qs

    def perform_create(self, serializer):
        serializer.save(company=_company(self.request))

    @action(detail=True, methods=['post'])
    def return_asset(self, request, pk=None):
        """Mark an assigned asset as returned and record the return date."""
        obj = self.get_object()
        if obj.status not in (Asset.AssetStatus.ASSIGNED, Asset.AssetStatus.DAMAGED, Asset.AssetStatus.LOST):
            return Response({'error': 'این دارایی قابل تحویل نیست.'}, status=400)
        obj.status = Asset.AssetStatus.RETURNED
        obj.returned_date = date.today()
        obj.save(update_fields=['status', 'returned_date', 'updated_at'])
        return Response(AssetSerializer(obj).data)


class LifecycleChecklistViewSet(viewsets.ModelViewSet):
    queryset = LifecycleChecklist.objects.select_related('employee').prefetch_related('items')
    serializer_class = LifecycleChecklistSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['employee__first_name', 'employee__last_name', 'employee__employee_id']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = super().get_queryset()
        company = _company(self.request)
        if company:
            qs = qs.filter(company=company)
        employee_id = self.request.query_params.get('employee_id')
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        kind = self.request.query_params.get('kind')
        if kind:
            qs = qs.filter(kind=kind)
        return qs

    def perform_create(self, serializer):
        serializer.save(company=_company(self.request))

    @action(detail=True, methods=['post'])
    def toggle_item(self, request, pk=None):
        """Toggle completion for a checklist item."""
        checklist = self.get_object()
        item_id = request.data.get('item_id')
        item = ChecklistItem.objects.filter(id=item_id, checklist=checklist).first()
        if not item:
            return Response({'error': 'آیتم یافت نشد.'}, status=404)
        item.is_completed = not item.is_completed
        item.completed_at = date.today() if item.is_completed else None
        item.save()
        return Response(ChecklistItemSerializer(item).data)


class ChecklistItemViewSet(viewsets.ModelViewSet):
    serializer_class = ChecklistItemSerializer
    queryset = ChecklistItem.objects.select_related('checklist')

    def get_queryset(self):
        qs = super().get_queryset()
        company = _company(self.request)
        if company:
            qs = qs.filter(company=company)
        return qs

    def perform_create(self, serializer):
        serializer.save(company=_company(self.request))


class CalendarEventViewSet(viewsets.ModelViewSet):
    queryset = CalendarEvent.objects.select_related('employee')
    serializer_class = CalendarEventSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description', 'employee__first_name', 'employee__last_name']
    ordering = ['event_date', 'id']

    def get_queryset(self):
        qs = super().get_queryset()
        company = _company(self.request)
        if company:
            qs = qs.filter(company=company)
        start = self.request.query_params.get('start')
        if start:
            qs = qs.filter(event_date__gte=start)
        end = self.request.query_params.get('end')
        if end:
            qs = qs.filter(event_date__lte=end)
        return qs

    def perform_create(self, serializer):
        serializer.save(company=_company(self.request))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def calendar_feed(request):
    """Hybrid calendar feed: manual events + birthdays + contract ends + leaves.

    The client sends an explicit Gregorian range via `start` / `end`
    (YYYY-MM-DD), so the frontend Jalali calendar stays authoritative.
    """
    from datetime import datetime
    import jdatetime as jd
    from employees.models import Employee
    from leaves.models import LeaveRequest

    company = _company(request)

    start_raw = request.query_params.get('start')
    end_raw = request.query_params.get('end')
    if start_raw and end_raw:
        start = datetime.strptime(start_raw, '%Y-%m-%d').date()
        end = datetime.strptime(end_raw, '%Y-%m-%d').date()
    else:
        today = date.today()
        start = today.replace(day=1)
        end = (today.replace(month=today.month % 12 + 1, day=1) - timedelta(days=1)) if today.month != 12 else date(today.year + 1, 1, 1) - timedelta(days=1)

    events = []

    # Manual / custom events (CalendarEvent.event_date is Gregorian).
    custom_qs = CalendarEvent.objects.filter(is_active=True)
    if company:
        custom_qs = custom_qs.filter(company=company)
    custom_qs = custom_qs.filter(event_date__gte=start, event_date__lte=end)
    for e in custom_qs:
        events.append({
            'id': f'cal-{e.id}',
            'type': e.event_type,
            'title': e.title,
            'date': e.event_date.isoformat(),
            'company': e.employee.full_name if e.employee else '',
            'description': e.description,
        })

    # Birthdays: match on the Jalali month/day of each employee, scanning the
    # requested Gregorian range (hybrid Shamsi layer).
    emp_qs = Employee.objects.filter(is_active=True, birth_date__isnull=False)
    if company:
        emp_qs = emp_qs.filter(company=company)
    bday_index = {}
    for emp in emp_qs:
        try:
            bj = jd.date.fromgregorian(date=emp.birth_date)
            bday_index[(bj.month, bj.day)] = bday_index.get((bj.month, bj.day), [])
            bday_index[(bj.month, bj.day)].append(emp)
        except Exception:
            continue

    cursor = start
    while cursor <= end:
        try:
            cj = jd.date.fromgregorian(date=cursor)
            for emp in bday_index.get((cj.month, cj.day), []):
                events.append({
                    'id': f'birthday-{emp.id}-{cursor.isoformat()}',
                    'type': 'birthday',
                    'title': f'تولد {emp.full_name}',
                    'date': cursor.isoformat(),
                    'company': emp.department.name if emp.department else '',
                })
        except Exception:
            pass
        cursor += timedelta(days=1)

    # Contract end dates (Gregorian field).
    contract_qs = Employee.objects.filter(
        is_active=True, contract_end_date__isnull=False,
        status='active',
    )
    if company:
        contract_qs = contract_qs.filter(company=company)
    for emp in contract_qs.filter(contract_end_date__gte=start, contract_end_date__lte=end):
        events.append({
            'id': f'contract-{emp.id}',
            'type': 'contract_end',
            'title': f'پایان قرارداد {emp.full_name}',
            'date': emp.contract_end_date.isoformat(),
            'company': emp.department.name if emp.department else '',
        })

    # Approved leaves overlapping the range.
    leave_qs = LeaveRequest.objects.filter(
        is_active=True, status=LeaveRequest.Status.APPROVED,
        start_date__lte=end, end_date__gte=start,
    )
    if company:
        leave_qs = leave_qs.filter(company=company)
    for lr in leave_qs:
        cur = max(lr.start_date, start)
        stop = min(lr.end_date, end)
        while cur <= stop:
            events.append({
                'id': f'leave-{lr.id}-{cur.isoformat()}',
                'type': 'leave',
                'title': f'{lr.get_leave_type_display()} — {lr.employee.full_name}',
                'date': cur.isoformat(),
                'company': '',
            })
            cur += timedelta(days=1)

    events.sort(key=lambda e: e['date'])
    return Response({'start': start.isoformat(), 'end': end.isoformat(), 'events': events})
