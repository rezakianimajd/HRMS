"""Views for the Payroll module."""
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Count
from payroll.models import EmployeeTransaction, SalaryRecord, BenefitRecord, EmployeeLoan
from payroll.serializers import (
    TransactionSerializer, TransactionSummarySerializer, SalaryRecordSerializer,
    BenefitRecordSerializer, EmployeeLoanSerializer,
)


def _get_company(request):
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


class TransactionViewSet(viewsets.ModelViewSet):
    serializer_class = TransactionSerializer
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['date', 'created_at', 'amount', 'quantity']
    ordering = ['-date', '-created_at']

    def get_queryset(self):
        qs = EmployeeTransaction.objects.select_related('employee')
        company = _get_company(self.request)
        if company:
            qs = qs.filter(company=company)
        employee_id = self.request.query_params.get('employee_id')
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        ttype = self.request.query_params.get('transaction_type')
        if ttype:
            qs = qs.filter(transaction_type=ttype)
        return qs

    def _sync_attendance(self, instance):
        """
        پل معکوس یکپارچگی: وقتی در «ورود اطلاعات» رکورد غیبت/مرخصی ثبت میشود،
        رکوردِ حضور متناظر نیز ساخته میشود تا «حضور و غیاب» همان واقعیت را ببیند.
        """
        from attendance.models import AttendanceRecord

        company = _get_company(self.request)
        status_map = {
            EmployeeTransaction.TransactionType.ABSENCE: AttendanceRecord.Status.ABSENT,
            EmployeeTransaction.TransactionType.LEAVE: AttendanceRecord.Status.LEAVE,
        }
        status = status_map.get(instance.transaction_type)
        if not status:
            return
        AttendanceRecord.objects.update_or_create(
            company=company,
            employee_id=instance.employee_id,
            date=instance.date,
            defaults={'status': status, 'note': instance.title or 'از «ورود اطلاعات»'},
        )

    def perform_create(self, serializer):
        company = _get_company(self.request)
        instance = serializer.save(company=company)
        try:
            self._sync_attendance(instance)
        except Exception:
            pass

    @action(detail=False, methods=['get'])
    def summary(self, request):
        company = _get_company(request)
        qs = EmployeeTransaction.objects.all()
        if company:
            qs = qs.filter(company=company)
        qs = qs.values('transaction_type').annotate(
            count=Count('id'), total_amount=Sum('amount'), total_quantity=Sum('quantity'),
        ).order_by('transaction_type')
        result = [
            {
                'transaction_type': row['transaction_type'],
                'transaction_type_display': dict(EmployeeTransaction.TransactionType.choices).get(row['transaction_type'], row['transaction_type']),
                'count': row['count'],
                'total_amount': row['total_amount'] or 0,
                'total_quantity': row['total_quantity'] or 0,
            }
            for row in qs
        ]
        return Response(result)

    @action(detail=False, methods=['get'])
    def by_employee(self, request):
        employee_id = request.query_params.get('employee_id')
        if not employee_id:
            return Response({'error': 'employee_id الزامی است'}, status=400)
        qs = self.get_queryset().filter(employee_id=employee_id)
        return Response(TransactionSerializer(qs, many=True).data)


class SalaryRecordViewSet(viewsets.ModelViewSet):
    serializer_class = SalaryRecordSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['employee__first_name', 'employee__last_name', 'employee__employee_id', 'employee__national_id']
    ordering_fields = ['year', 'month', 'employee__employee_id', 'net_payable']
    ordering = ['-year', '-month', 'employee__employee_id']

    def get_queryset(self):
        qs = SalaryRecord.objects.select_related('employee')
        company = _get_company(self.request)
        if company:
            qs = qs.filter(company=company)
        employee_id = self.request.query_params.get('employee_id')
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        year = self.request.query_params.get('year')
        if year:
            qs = qs.filter(year=year)
        month = self.request.query_params.get('month')
        if month:
            qs = qs.filter(month=month)
        return qs

    def perform_create(self, serializer):
        company = _get_company(self.request)
        instance = serializer.save(company=company)
        # 2c: قسط وام فعال خودکار در فیش حقوق
        if not instance.employee_loan:
            active = (EmployeeLoan.objects
                      .filter(company=company, employee_id=instance.employee_id,
                              status=EmployeeLoan.LoanStatus.ACTIVE)
                      .order_by('-grant_date').first())
            if active:
                instance.employee_loan = active.installment_amount
        instance.calculate_totals()
        instance.save()

    def perform_update(self, serializer):
        instance = serializer.save()
        instance.calculate_totals()
        instance.save()

    @action(detail=False, methods=['get'])
    def by_employee(self, request):
        employee_id = request.query_params.get('employee_id')
        if not employee_id:
            return Response({'error': 'employee_id الزامی است'}, status=400)
        qs = self.get_queryset().filter(employee_id=employee_id)
        return Response(SalaryRecordSerializer(qs, many=True).data)

    @action(detail=False, methods=['get'])
    def years(self, request):
        company = _get_company(request)
        qs = SalaryRecord.objects.all()
        if company:
            qs = qs.filter(company=company)
        years = list(qs.values_list('year', flat=True).distinct().order_by('-year'))
        return Response(years)


class BenefitRecordViewSet(viewsets.ModelViewSet):
    serializer_class = BenefitRecordSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['employee__first_name', 'employee__last_name', 'employee__employee_id', 'employee__national_id']
    ordering_fields = ['year', 'month', 'employee__employee_id', 'gross_amount']
    ordering = ['-year', '-month', 'employee__employee_id']

    def get_queryset(self):
        qs = BenefitRecord.objects.select_related('employee')
        company = _get_company(self.request)
        if company:
            qs = qs.filter(company=company)
        employee_id = self.request.query_params.get('employee_id')
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        year = self.request.query_params.get('year')
        if year:
            qs = qs.filter(year=year)
        month = self.request.query_params.get('month')
        if month:
            qs = qs.filter(month=month)
        benefit_type = self.request.query_params.get('benefit_type')
        if benefit_type:
            qs = qs.filter(benefit_type=benefit_type)
        return qs

    def perform_create(self, serializer):
        company = _get_company(self.request)
        serializer.save(company=company)

    @action(detail=False, methods=['get'])
    def by_employee(self, request):
        employee_id = request.query_params.get('employee_id')
        if not employee_id:
            return Response({'error': 'employee_id الزامی است'}, status=400)
        qs = self.get_queryset().filter(employee_id=employee_id)
        return Response(BenefitRecordSerializer(qs, many=True).data)

    @action(detail=False, methods=['get'])
    def years(self, request):
        company = _get_company(request)
        qs = BenefitRecord.objects.all()
        if company:
            qs = qs.filter(company=company)
        years = list(qs.values_list('year', flat=True).distinct().order_by('-year'))
        return Response(years)


class EmployeeLoanViewSet(viewsets.ModelViewSet):
    serializer_class = EmployeeLoanSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['employee__first_name', 'employee__last_name', 'employee__employee_id', 'employee__national_id']
    ordering_fields = ['grant_date', 'amount', 'employee__employee_id']
    ordering = ['-grant_date']

    def get_queryset(self):
        qs = EmployeeLoan.objects.select_related('employee')
        company = _get_company(self.request)
        if company:
            qs = qs.filter(company=company)
        employee_id = self.request.query_params.get('employee_id')
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        status = self.request.query_params.get('status')
        if status:
            qs = qs.filter(status=status)
        return qs

    def perform_create(self, serializer):
        company = _get_company(self.request)
        serializer.save(company=company)


class TransactionSummaryViewSet(viewsets.ViewSet):
    def list(self, request):
        company = _get_company(request)
        qs = EmployeeTransaction.objects.all()
        if company:
            qs = qs.filter(company=company)
        qs = qs.values('transaction_type').annotate(
            count=Count('id'), total_amount=Sum('amount'), total_quantity=Sum('quantity'),
        ).order_by('transaction_type')
        result = []
        for row in qs:
            ttype = row['transaction_type']
            result.append({
                'transaction_type': ttype,
                'transaction_type_display': dict(EmployeeTransaction.TransactionType.choices).get(ttype, ttype),
                'count': row['count'],
                'total_amount': row['total_amount'] or 0,
                'total_quantity': row['total_quantity'] or 0,
            })
        return Response(result)