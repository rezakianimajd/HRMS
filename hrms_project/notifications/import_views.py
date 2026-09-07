"""Import Bale contacts from an Excel file (name, chat_id, category)."""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response


def _company(request):
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bale_contacts_import(request):
    """Import Bale contacts from an uploaded Excel file.

    Expected columns (first row is header):
        name | chat_id | category
    """
    from settings_app.models import BaleContact

    company = _company(request)
    if not company:
        return Response({'error': 'شرکت فعالی انتخاب نشده است.'}, status=400)

    file = request.FILES.get('file')
    if not file:
        return Response({'error': 'فایل انتخاب نشده است.'}, status=400)

    try:
        import openpyxl
        wb = openpyxl.load_workbook(file, read_only=True, data_only=True)
        ws = wb.active
        rows = list(ws.iter_rows(values_only=True))
    except Exception as e:
        return Response({'error': f'خطا در خواندن فایل: {str(e)[:100]}'}, status=400)

    if not rows:
        return Response({'error': 'فایل خالی است.'}, status=400)

    header = [str(h).strip() if h else '' for h in rows[0]]
    # Map column names (English or Persian) to indexes
    name_idx = chat_idx = cat_idx = None
    for i, h in enumerate(header):
        hlow = h.lower()
        if hlow in ('name', 'نام'):
            name_idx = i
        elif hlow in ('chat_id', 'chatid', 'چت آیدی', 'چت ایدی'):
            chat_idx = i
        elif hlow in ('category', 'دسته', 'دسته‌بندی'):
            cat_idx = i

    if name_idx is None or chat_idx is None:
        return Response({'error': 'ستون‌های name و chat_id الزامی است.'}, status=400)

    created = 0
    skipped = []
    for r in rows[1:]:
        if not r or all(v is None or str(v).strip() == '' for v in r):
            continue
        name = str(r[name_idx]).strip() if name_idx < len(r) and r[name_idx] is not None else ''
        chat_id = str(r[chat_idx]).strip() if chat_idx < len(r) and r[chat_idx] is not None else ''
        category = str(r[cat_idx]).strip() if cat_idx is not None and cat_idx < len(r) and r[cat_idx] is not None else ''

        if not name or not chat_id:
            skipped.append('ردیف ناقص')
            continue
        if BaleContact.objects.filter(company=company, chat_id=chat_id).exists():
            skipped.append(f'{chat_id}: تکراری')
            continue

        BaleContact.objects.create(company=company, name=name, chat_id=chat_id, category=category)
        created += 1

    return Response({'imported_count': created, 'skipped': skipped[:50]})