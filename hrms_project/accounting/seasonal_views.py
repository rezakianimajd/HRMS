"""API صورت معاملات فصلی (ماده ۱۶۹ مکرر) — فاز ۱.

- ``current``: دریافت/ساخت گزارش یک «سال مالی + فصل».
- ``rows``: ذخیرهٔ گروهی و اتمیک کل جدول.
- ``validate``: اعتبارسنجی با سطح خطا/هشدار (برای نمایش در صفحه و شیت اکسل).
- ``export``: خروجی اکسل رسمی سه‌شیتی (داده / خلاصه / خطاها).
- ``status``: تغییر وضعیت پیش‌نویس ↔ آمادهٔ ارسال (ارسال در فاز ۲).
"""
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import filters, status as http_status
from rest_framework.decorators import action
from rest_framework.response import Response

from accounting.models import FiscalYear, SeasonalReport
from accounting.serializers import SeasonalReportSerializer, SeasonalRowsWriteSerializer
from accounting.seasonal import build_workbook, control_totals, sync_rows, validate_report
from accounting.views import CompanyScopedViewSet, _company


class SeasonalReportViewSet(CompanyScopedViewSet):
    """گزارش‌های فصلی شرکت جاری."""

    serializer_class = SeasonalReportSerializer
    queryset = SeasonalReport.objects.select_related('fiscal_year', 'company').prefetch_related('transactions')
    filter_backends = [filters.OrderingFilter]
    ordering = ['-fiscal_year__start_date', 'quarter']

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['company'] = _company(self.request)
        return context

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params
        year = params.get('fiscal_year')
        quarter = params.get('quarter')
        if year:
            qs = qs.filter(fiscal_year_id=year)
        if quarter:
            qs = qs.filter(quarter=quarter)
        return qs

    @action(detail=False, methods=['get'])
    def current(self, request):
        """گزارش همان دوره را برمی‌گرداند و در صورت نبود، می‌سازد."""
        company = _company(request)
        year_id = request.query_params.get('fiscal_year')
        if not year_id:
            return Response({'detail': 'پارامتر سال مالی الزامی است.'}, status=http_status.HTTP_400_BAD_REQUEST)
        try:
            quarter = int(request.query_params.get('quarter') or 1)
        except (TypeError, ValueError):
            quarter = 1
        quarter = quarter if 1 <= quarter <= 4 else 1

        fiscal_year = FiscalYear.objects.filter(pk=year_id, company=company).first()
        if fiscal_year is None:
            return Response({'detail': 'سال مالی یافت نشد.'}, status=http_status.HTTP_404_NOT_FOUND)

        report, _created = SeasonalReport.objects.get_or_create(
            company=company, fiscal_year=fiscal_year, quarter=quarter,
        )
        return Response(self.get_serializer(report).data)

    @action(detail=True, methods=['post'])
    def rows(self, request, pk=None):
        """ذخیرهٔ کل جدول (جایگزینی لیست ردیف‌ها) به‌صورت اتمیک."""
        report = self.get_object()
        if report.is_locked:
            return Response(
                {'detail': 'این فصل ارسال شده است و قابل ویرایش نیست.'},
                status=http_status.HTTP_400_BAD_REQUEST,
            )

        payload = SeasonalRowsWriteSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        rows = payload.validated_data['rows']

        try:
            saved = sync_rows(report, rows)
        except ValueError as error:
            return Response({'detail': str(error)}, status=http_status.HTTP_400_BAD_REQUEST)

        report.refresh_from_db()
        data = self.get_serializer(report).data
        data['saved_rows'] = saved
        return Response(data)

    @action(detail=True, methods=['post'])
    def validate(self, request, pk=None):
        """گزارش خطا/هشدارهای ردیف‌ها + جمع‌های کنترل."""
        report = self.get_object()
        result = validate_report(report)
        result['totals'] = control_totals(report)
        return Response(result)

    @action(detail=True, methods=['post'])
    def status(self, request, pk=None):
        """تغییر وضعیت گزارش: draft / ready."""
        report = self.get_object()
        target = request.data.get('status')
        allowed = {SeasonalReport.Status.DRAFT, SeasonalReport.Status.READY}
        if target not in allowed:
            return Response({'detail': 'وضعیت مجاز نیست.'}, status=http_status.HTTP_400_BAD_REQUEST)

        if target == SeasonalReport.Status.READY:
            result = validate_report(report)
            if result['summary']['errors']:
                return Response(
                    {'detail': 'تا رفع خطاهای اعتبارسنجی، گزارش آمادهٔ ارسال نمی‌شود.', **result},
                    status=http_status.HTTP_400_BAD_REQUEST,
                )

        report.status = target
        report.notes = request.data.get('notes', report.notes)
        report.save(update_fields=['status', 'notes', 'updated_at'])
        return Response(self.get_serializer(report).data)

    @action(detail=True, methods=['get'])
    def export(self, request, pk=None):
        """خروجی اکسل رسمی سه‌شیتی."""
        report = self.get_object()
        workbook = build_workbook(report)
        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        stamp = timezone.localtime().strftime('%Y%m%d-%H%M')
        filename = f'seasonal-{report.fiscal_year_id}-q{report.quarter}-{stamp}.xlsx'
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        workbook.save(response)
        return response

