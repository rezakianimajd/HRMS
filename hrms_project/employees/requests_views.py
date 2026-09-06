"""Views for HR administrative / workflow requests."""
from datetime import date
from django.db import transaction
from rest_framework import viewsets, filters
from rest_framework.response import Response
from rest_framework.decorators import action

from employees.models import HRRequest
from employees.requests_serializers import HRRequestSerializer
from core.engines.permission_engine import require


def _company(request):
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


class HRRequestViewSet(viewsets.ModelViewSet):
    queryset = HRRequest.objects.select_related('employee')
    serializer_class = HRRequestSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        'employee__first_name', 'employee__last_name',
        'employee__employee_id', 'description', 'target_value',
    ]
    ordering_fields = ['created_at', 'requested_date', 'employee__employee_id']
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
        data = dict(serializer.validated_data)
        data.setdefault('requested_date', date.today())
        data['company'] = _company(self.request)
        serializer.save(**data)

    # ------------------------------------------------------------------
    # Approval applies real changes to the employee (2026 integration):
    #   * transfer  → department changed
    #   * promotion → job_title changed
    #   * others    → appended note in description
    # ------------------------------------------------------------------
    def _apply_to_employee(self, obj):
        if not obj.target_value:
            return
        from employees.models import Department, JobTitle

        emp = obj.employee
        target = str(obj.target_value).strip()

        if obj.request_type == HRRequest.RequestType.TRANSFER:
            dept = Department.objects.filter(company=obj.company, name__icontains=target).first()
            dept = dept or Department.objects.filter(company=obj.company, code__iexact=target).first()
            if dept and emp.department_id != dept.id:
                old = emp.department.name if emp.department else ''
                emp.department = dept
                emp.save(update_fields=['department', 'updated_at'])
                note = f'\n🔁 انتقال: {old} ← {dept.name}'
                obj.description = (obj.description or '') + note

        elif obj.request_type == HRRequest.RequestType.PROMOTION:
            title = JobTitle.objects.filter(company=obj.company, name__icontains=target).first()
            title = title or JobTitle.objects.filter(company=obj.company, code__iexact=target).first()
            if title and emp.job_title_id != title.id:
                old = emp.job_title.name if emp.job_title else ''
                emp.job_title = title
                emp.save(update_fields=['job_title', 'updated_at'])
                note = f'\n🥁 ارتقا: {old} ← {title.name}'
                obj.description = (obj.description or '') + note

        else:
            note = f'\n✅ تأیید: {target}'
            obj.description = (obj.description or '') + note

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        require(request.user, 'can_change_employee')
        obj = self.get_object()
        if obj.status != HRRequest.Status.PENDING:
            return Response({'error': 'فقط درخواست‌های در انتظار قابل تأیید هستند.'}, status=400)
        try:
            with transaction.atomic():
                obj.status = HRRequest.Status.APPROVED
                obj.save(update_fields=['status', 'updated_at'])
                self._apply_to_employee(obj)
                if obj.description:
                    obj.save(update_fields=['description', 'updated_at'])
        except Exception as e:
            return Response({'error': f'خطا در اعمال درخواست: {str(e)[:120]}'}, status=500)
        return Response(HRRequestSerializer(obj).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        require(request.user, 'can_change_employee')
        obj = self.get_object()
        if obj.status != HRRequest.Status.PENDING:
            return Response({'error': 'فقط درخواست‌های در انتظار قابل رد هستند.'}, status=400)
        obj.status = HRRequest.Status.REJECTED
        obj.save(update_fields=['status', 'updated_at'])
        return Response(HRRequestSerializer(obj).data)