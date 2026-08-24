"""
Phonebook views for the Employees module.
"""
from rest_framework import viewsets, filters, status
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from employees.models import Employee
from employees.filters import EmployeeFilter
import openpyxl
from django.http import HttpResponse
from datetime import datetime


class PhonebookPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200


class PhonebookViewSet(viewsets.ReadOnlyModelViewSet):
    """ReadOnly ViewSet for the phonebook with export support."""
    permission_classes = [IsAuthenticated]
    pagination_class = PhonebookPagination
    filterset_class = EmployeeFilter
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    ordering_fields = ['first_name', 'last_name', 'employee_id', 'department__name']
    ordering = ['last_name', 'first_name']

    def get_queryset(self):
        company = getattr(self.request, 'tenant', None) or getattr(self.request, 'company', None)
        qs = Employee.objects.filter(is_active=True).select_related(
            'department', 'job_title', 'work_location', 'insurance_list'
        ).only(
            'id', 'first_name', 'last_name', 'employee_id', 'national_id',
            'mobile', 'phone', 'emergency_contact_name', 'emergency_contact_phone',
            'email', 'address', 'postal_code', 'photo',
            'department__name', 'job_title__name', 'work_location__name', 'insurance_list__name',
        )
        if company:
            qs = qs.filter(company=company)
        return qs

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        data = [self._format_phonebook_entry(emp) for emp in (page or queryset)]
        if page is not None:
            return self.get_paginated_response(data)
        return Response(data)

    def _format_phonebook_entry(self, emp):
        request = self.request
        photo_url = None
        if emp.photo:
            photo_url = request.build_absolute_uri(emp.photo.url) if request else emp.photo.url
        return {
            'id': emp.id,
            'employee_id': emp.employee_id,
            'first_name': emp.first_name,
            'last_name': emp.last_name,
            'full_name': emp.full_name,
            'photo_url': photo_url,
            'national_id': emp.national_id,
            'mobile': emp.mobile,
            'phone': emp.phone,
            'emergency_contact_name': emp.emergency_contact_name,
            'emergency_contact_phone': emp.emergency_contact_phone,
            'email': emp.email,
            'address': emp.address,
            'postal_code': emp.postal_code,
            'department': emp.department.name if emp.department else '',
            'job_title': emp.job_title.name if emp.job_title else '',
            'work_location': emp.work_location.name if emp.work_location else '',
            'insurance_list': emp.insurance_list.name if emp.insurance_list else '',
        }

    @action(detail=False, methods=['get'])
    def export(self, request):
        """Export phonebook data to Excel."""
        queryset = self.filter_queryset(self.get_queryset())
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "دفترچه تلفن"

        headers = [
            'ردیف', 'کد پرسنلی', 'نام', 'نام خانوادگی', 'کد ملی',
            'موبایل', 'تلفن ثابت', 'تماس اضطراری', 'تلفن اضطراری',
            'ایمیل', 'آدرس', 'کد پستی', 'دپارتمان', 'محل استقرار',
            'عنوان شغلی', 'لیست بیمه'
        ]
        ws.append(headers)

        for idx, emp in enumerate(queryset, 1):
            ws.append([
                idx, emp.employee_id, emp.first_name, emp.last_name, emp.national_id,
                emp.mobile, emp.phone or '', emp.emergency_contact_name or '', emp.emergency_contact_phone or '',
                emp.email or '', emp.address or '', emp.postal_code or '',
                emp.department.name if emp.department else '',
                emp.work_location.name if emp.work_location else '',
                emp.job_title.name if emp.job_title else '',
                emp.insurance_list.name if emp.insurance_list else '',
            ])

        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename=phonebook_{datetime.now().strftime("%Y%m%d")}.xlsx'
        wb.save(response)
        return response