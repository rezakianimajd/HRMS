"""API صورت معاملات فصلی — نسخهٔ «خرید» (ماده ۱۶۹ مکرر).

- ``current``: دریافت/ساخت گزارش «سال مالی + فصل» و ردیف‌های خرید آن.
- ``rows``: ذخیرهٔ گروهی اتمیک ردیف‌های خرید (سایر جهت‌ها دست‌نخورده).
- ``validate``: اعتبارسنجی قواعدِ خرید از ``seasonal_rules`` (سرور مرجع نهایی).
- ``export``: اکسل مدیریتی سه‌شیتی خرید.
- ``export_ttms``: بستهٔ «پیش‌نویس آزمایش‌نشده» TTMS (zip: csv + README).
- ``reference``: قواعد و الزامات هر نوع فروشنده برای هم‌سانی فرانت و بک.
- ``status``: تغییر وضعیت پیش‌نویس ↔ آمادهٔ ارسال.
"""
from __future__ import annotations

import json

from django.db.models import F
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import filters, status as http_status
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from accounting import seasonal_reconcile, seasonal_rules
from accounting.models import (
    FiscalYear, SeasonalReconciliation, SeasonalReport, SeasonalSavedView,
)
from accounting.seasonal import (
    DIRECTION_PURCHASE, build_ttms_draft, build_workbook, control_totals,
    sync_rows, validate_report,
)
from accounting.serializers import (
    SeasonalReportSerializer, SeasonalRowsWriteSerializer, SeasonalSavedViewSerializer,
)
from accounting.views import CompanyScopedViewSet, _company


class SeasonalReportViewSet(CompanyScopedViewSet):
    """گزارش‌های فصلی شرکت جاری (در این نسخه فقط خرید)."""

    serializer_class = SeasonalReportSerializer
    queryset = SeasonalReport.objects.select_related('fiscal_year', 'company').prefetch_related('transactions')
    filter_backends = [filters.OrderingFilter]
    ordering = ['-fiscal_year__start_date', 'quarter']

    def _direction(self, request):
        """جهت معامله؛ در این نسخه فقط ``purchase`` مجاز است."""
        direction = request.query_params.get('direction') or request.data.get('direction') or DIRECTION_PURCHASE
        if direction != DIRECTION_PURCHASE:
            return None
        return direction

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['company'] = _company(self.request)
        try:
            context['direction'] = self._direction(self.request) or DIRECTION_PURCHASE
        except Exception:
            context['direction'] = DIRECTION_PURCHASE
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
    def reference(self, request):
        """قواعد اعتبارسنجی و الزامات هر نوع فروشنده (منبع واحد سرور/فرانت)."""
        return Response(seasonal_rules.build_reference(DIRECTION_PURCHASE))

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
        """ذخیرهٔ کل جدول خرید (جایگزینی لیست ردیف‌ها) به‌صورت اتمیک."""
        report = self.get_object()
        if report.is_locked:
            return Response(
                {'detail': 'این فصل ارسال شده است و قابل ویرایش نیست.'},
                status=http_status.HTTP_400_BAD_REQUEST,
            )
        direction = self._direction(request)
        if direction is None:
            return Response(
                {'detail': 'در این نسخه فقط معاملات خرید پشتیبانی می‌شود.'},
                status=http_status.HTTP_400_BAD_REQUEST,
            )

        payload = SeasonalRowsWriteSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        rows = payload.validated_data['rows']

        try:
            saved = sync_rows(report, rows, direction)
        except ValueError as error:
            return Response({'detail': str(error)}, status=http_status.HTTP_400_BAD_REQUEST)

        report.refresh_from_db()
        data = self.get_serializer(report).data
        data['saved_rows'] = saved
        return Response(data)

    @action(detail=True, methods=['post'])
    def validate(self, request, pk=None):
        """گزارش خطا/هشدارهای خرید (قواعد سرور) + جمع‌های کنترل."""
        report = self.get_object()
        direction = self._direction(request) or DIRECTION_PURCHASE
        result = validate_report(report, direction)
        result['totals'] = control_totals(report, direction)
        return Response(result)

    @action(detail=True, methods=['post'])
    def status(self, request, pk=None):
        """تغییر وضعیت گزارش: draft / ready (مبتنی بر خطاهای خرید)."""
        report = self.get_object()
        target = request.data.get('status')
        allowed = {SeasonalReport.Status.DRAFT, SeasonalReport.Status.READY}
        if target not in allowed:
            return Response({'detail': 'وضعیت مجاز نیست.'}, status=http_status.HTTP_400_BAD_REQUEST)

        if target == SeasonalReport.Status.READY:
            result = validate_report(report, DIRECTION_PURCHASE)
            if result['summary']['errors']:
                return Response(
                    {'detail': 'تا رفع خطاهای اعتبارسنجی خرید، گزارش آمادهٔ ارسال نمی‌شود.', **result},
                    status=http_status.HTTP_400_BAD_REQUEST,
                )

        report.status = target
        report.notes = request.data.get('notes', report.notes)
        report.save(update_fields=['status', 'notes', 'updated_at'])
        return Response(self.get_serializer(report).data)

    @action(detail=True, methods=['get'], url_path='party-pivot')
    def party_pivot(self, request, pk=None):
        """جدول پیوت طرف حساب: جمع مبلغ هر طرف، تفکیک‌شده بر اساس نوع/ماه/وضعیت/نوع طرف."""
        report = self.get_object()
        direction = self._direction(request) or DIRECTION_PURCHASE
        filters = seasonal_reconcile.filters_from_query(request.query_params)
        dimension = request.query_params.get('dimension') or request.query_params.get('group_by') or 'kind'
        return Response(seasonal_reconcile.build_party_pivot(report, direction, filters, dimension))

    @action(detail=True, methods=['get'], url_path='party-pivot-export')
    def party_pivot_export(self, request, pk=None):
        """خروجی اکسل جدول پیوت طرف حساب با همان بُعد و فیلترها."""
        report = self.get_object()
        direction = self._direction(request) or DIRECTION_PURCHASE
        filters = seasonal_reconcile.filters_from_query(request.query_params)
        dimension = request.query_params.get('dimension') or request.query_params.get('group_by') or 'kind'
        pivot = seasonal_reconcile.build_party_pivot(report, direction, filters, dimension)
        workbook = seasonal_reconcile.build_party_pivot_workbook(pivot)
        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        stamp = timezone.localtime().strftime('%Y%m%d-%H%M')
        filename = (f'seasonal-party-pivot-{report.fiscal_year_id}-q{report.quarter}'
                    f'-{pivot["dimension"]}-{stamp}.xlsx')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        workbook.save(response)
        return response

    @action(detail=True, methods=['get'])
    def analytics(self, request, pk=None):
        """گزارش تحلیلی فصل (با فیلتر نوع معامله / وضعیت مودیان / نوع طرف / جستجو)."""
        report = self.get_object()
        direction = self._direction(request) or DIRECTION_PURCHASE
        filters = seasonal_reconcile.filters_from_query(request.query_params)
        return Response(seasonal_reconcile.build_analytics(report, direction, filters))

    @action(detail=True, methods=['get'], url_path='analytics-export')
    def analytics_export(self, request, pk=None):
        """خروجی اکسل گزارش تحلیلی با همان فیلترهای تب گزارش‌ها."""
        report = self.get_object()
        direction = self._direction(request) or DIRECTION_PURCHASE
        filters = seasonal_reconcile.filters_from_query(request.query_params)
        analytics = seasonal_reconcile.build_analytics(report, direction, filters)
        rows = seasonal_reconcile.filtered_rows(report, direction, filters)
        workbook = seasonal_reconcile.build_analytics_workbook(analytics, rows)
        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        stamp = timezone.localtime().strftime('%Y%m%d-%H%M')
        suffix = ''
        if filters.get('kind'):
            suffix += f'-kind{filters["kind"]}'
        if filters.get('moadian_status'):
            suffix += f'-{filters["moadian_status"]}'
        filename = f'seasonal-analytics-{report.fiscal_year_id}-q{report.quarter}{suffix}-{stamp}.xlsx'
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        workbook.save(response)
        return response

    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser, JSONParser])
    def reconcile(self, request, pk=None):
        """مغایرت‌گیری با فایل دفاتر (xlsx/xlsm/csv/tsv) — خروجی JSON یا اکسل."""
        report = self.get_object()
        direction = self._direction(request) or DIRECTION_PURCHASE
        upload = request.FILES.get('file')
        if upload is None:
            return Response(
                {'detail': 'فایل دفاتر (xlsx/xlsm/csv/tsv) ارسال نشده است.'},
                status=http_status.HTTP_400_BAD_REQUEST,
            )

        def _json_field(name):
            value = request.data.get(name)
            if isinstance(value, str) and value.strip():
                try:
                    return json.loads(value)
                except ValueError:
                    return {}
            return value or {}

        options = seasonal_reconcile.MatchOptions.from_payload(_json_field('options'))
        mapping = _json_field('mapping') or None
        try:
            parsed = seasonal_reconcile.read_ledger_rows(upload, mapping=mapping)
        except ValueError as error:
            return Response({'detail': str(error)}, status=http_status.HTTP_400_BAD_REQUEST)

        result = seasonal_reconcile.reconcile(
            report, parsed.rows, options, direction, parsed.as_dict(),
        )

        user = getattr(request, 'user', None)
        run = SeasonalReconciliation.objects.create(
            company=_company(request),
            report=report,
            direction=direction,
            file_name=(parsed.source or '')[:255],
            file_sheet=(parsed.sheet or '')[:120],
            source_rows=len(parsed.rows),
            matched_count=result['summary']['matched']['count'],
            error_count=result['summary']['counts']['errors'],
            warning_count=result['summary']['counts']['warnings'],
            amount_delta=result['summary']['amount_delta'],
            summary=result['summary'],
            detail={'items': result['items'][:1000], 'source': result['source']},
            created_by_name=((user.get_full_name() if hasattr(user, 'get_full_name') else '')
                             or getattr(user, 'username', '') or '')[:150],
        )
        result['run'] = {
            'id': run.pk,
            'created_at': timezone.localtime(run.created_at).isoformat() if run.created_at else '',
        }

        if (request.query_params.get('format') or '').lower() == 'xlsx':
            workbook = seasonal_reconcile.build_reconciliation_workbook(result)
            response = HttpResponse(
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            )
            stamp = timezone.localtime().strftime('%Y%m%d-%H%M')
            filename = f'seasonal-reconcile-{report.fiscal_year_id}-q{report.quarter}-{stamp}.xlsx'
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            workbook.save(response)
            return response
        return Response(result)

    @action(detail=True, methods=['get'])
    def reconciliations(self, request, pk=None):
        """تاریخچهٔ مغایرت‌گیری‌های این گزارش (۵۰ مورد آخر)."""
        report = self.get_object()
        runs = report.reconciliations.order_by('-created_at')[:50]
        return Response([{
            'id': run.pk,
            'file_name': run.file_name,
            'file_sheet': run.file_sheet,
            'source_rows': run.source_rows,
            'matched_count': run.matched_count,
            'error_count': run.error_count,
            'warning_count': run.warning_count,
            'amount_delta': float(run.amount_delta or 0),
            'created_at': timezone.localtime(run.created_at).isoformat() if run.created_at else '',
            'created_by_name': run.created_by_name,
            'summary': run.summary,
        } for run in runs])

    @action(detail=True, methods=['get'])
    def export(self, request, pk=None):
        """خروجی اکسل مدیریتی سه‌شیتی خرید."""
        report = self.get_object()
        workbook = build_workbook(report, DIRECTION_PURCHASE)
        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        stamp = timezone.localtime().strftime('%Y%m%d-%H%M')
        filename = f'seasonal-purchase-{report.fiscal_year_id}-q{report.quarter}-{stamp}.xlsx'
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        workbook.save(response)
        return response

    @action(detail=True, methods=['get'], url_path='export-ttms')
    def export_ttms(self, request, pk=None):
        """بستهٔ «پیش‌نویس آزمایش‌نشده» TTMS برای خرید (zip: csv + README).

        هشدار: قالب رسمی/Access نسخهٔ TTMS هدف در دسترس نیست؛ این خروجی
        تأییدشده نیست و باید با نسخهٔ مشخص TTMS آزمایش شود.
        """
        report = self.get_object()
        content, filename, warnings = build_ttms_draft(report, DIRECTION_PURCHASE)
        response = HttpResponse(content, content_type='application/zip')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        response['X-TTMS-Status'] = seasonal_rules.RULESET_STATUS
        response['X-TTMS-Warnings'] = ' | '.join(warnings).encode('ascii', 'ignore').decode() or 'unverified'
        return response


class SeasonalSavedViewViewSet(CompanyScopedViewSet):
    """نماهای ذخیره‌شدهٔ فیلتر برای گزارش‌های فصلی شرکت جاری."""

    serializer_class = SeasonalSavedViewSerializer
    queryset = SeasonalSavedView.objects.select_related('report', 'report__fiscal_year')
    filter_backends = [filters.OrderingFilter]
    ordering = ['-is_favorite', 'name']

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['company'] = _company(self.request)
        return context

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params
        if params.get('report'):
            qs = qs.filter(report_id=params['report'])
        if (params.get('favorite') or '').lower() in ('1', 'true', 'yes'):
            qs = qs.filter(is_favorite=True)
        return qs

    def perform_create(self, serializer):
        user = getattr(self.request, 'user', None)
        name = ((user.get_full_name() if hasattr(user, 'get_full_name') else '')
                or getattr(user, 'username', '') or '')[:150]
        serializer.save(company=_company(self.request), owner_name=name)

    @action(detail=True, methods=['post'])
    def touch(self, request, pk=None):
        """ثبت استفاده از نما (برای مرتب‌سازی «پرکاربردترین‌ها»)."""
        view = self.get_object()
        SeasonalSavedView.objects.filter(pk=view.pk).update(use_count=F('use_count') + 1)
        return Response({'id': view.pk, 'use_count': (view.use_count or 0) + 1})

    @action(detail=True, methods=['post'])
    def favorite(self, request, pk=None):
        """علامت‌گذاری/برداشتن علامت «مورد علاقه»."""
        view = self.get_object()
        value = request.data.get('value')
        view.is_favorite = bool(value) if value is not None else not view.is_favorite
        view.save(update_fields=['is_favorite', 'updated_at'])
        return Response(SeasonalSavedViewSerializer(view, context=self.get_serializer_context()).data)


