"""گزارش‌های خزانه: JSON برای جدول + خروجی Excel (openpyxl)."""
from django.http import HttpResponse
from rest_framework.response import Response
from rest_framework.views import APIView

from core.engines.permission_engine import require
from treasury.reports import REPORTS, build_report, report_catalog


def _company(request):
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


class TreasuryReportsView(APIView):
    """GET /api/treasury/reports/?kind=daily&date_from=…&date_to=…"""

    def get(self, request):
        require(request.user, 'treasury_view')
        kind = request.query_params.get('kind') or ''
        if not kind or kind == 'catalog':
            return Response({'catalog': report_catalog()})
        if kind not in REPORTS:
            return Response({'detail': 'گزارش نامعتبر است.'}, status=404)
        company = _company(request)
        data = build_report(
            kind,
            company,
            date_from=request.query_params.get('date_from') or None,
            date_to=request.query_params.get('date_to') or None,
            entity_id=request.query_params.get('entity') or None,
        )
        if request.query_params.get('export') == 'xlsx':
            return self._xlsx(data)
        return Response(data)

    def _xlsx(self, data):
        from openpyxl import Workbook
        from openpyxl.styles import Alignment, Font, PatternFill

        workbook = Workbook()
        sheet = workbook.active
        sheet.title = data['title'][:28] or 'report'
        sheet.sheet_view.rightToLeft = True

        header_fill = PatternFill('solid', fgColor='0F766E')
        header_font = Font(color='FFFFFF', bold=True)
        columns = data['columns']
        for index, column in enumerate(columns, start=1):
            cell = sheet.cell(row=1, column=index, value=column['label'])
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal='center')
            sheet.column_dimensions[cell.column_letter].width = 20

        for row_index, row in enumerate(data['rows'], start=2):
            for column_index, column in enumerate(columns, start=1):
                value = row.get(column['key'], '')
                cell = sheet.cell(row=row_index, column=column_index, value=value)
                cell.alignment = Alignment(horizontal='right')

        totals = data.get('totals') or {}
        if totals:
            sheet.cell(row=len(data['rows']) + 3, column=1, value='جمع').font = Font(bold=True)
            for column_index, column in enumerate(columns, start=1):
                key = column['key']
                if key in totals:
                    sheet.cell(
                        row=len(data['rows']) + 3,
                        column=column_index,
                        value=totals[key],
                    ).font = Font(bold=True)

        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        response['Content-Disposition'] = (
            f'attachment; filename="treasury-{data["key"]}.xlsx"'
        )
        workbook.save(response)
        return response
