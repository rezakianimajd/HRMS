"""Annual closing operations — opening document, close accounts, closing journal,
and statutory (legal) books.

All querysets are company-scoped. Financial rules mirror `report_views`.
"""
from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounting.constants import REPORTABLE_DOCUMENT_STATUSES
from accounting.models import (
    Account, AccountingDocument, AccountingDocumentLine, AccountingSettings,
    AuxiliaryAccount, FiscalYear, Journal,
)


def _company(request):
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


def _round2(value):
    return round(float(value or 0), 2)


def _report_lines(company, year=None):
    """خطوط اسناد قابل‌گزارش (ارسال‌شده/تأییدشده/ثبت‌شده/قفل‌شده) — اسناد پیش‌نویس لحاظ نمی‌شوند."""
    qs = AccountingDocumentLine.objects.filter(
        document__company=company,
        document__status__in=REPORTABLE_DOCUMENT_STATUSES,
    ).select_related('account', 'account__account_type')
    if year is not None:
        qs = qs.filter(document__fiscal_year=year)
    return qs


AUX_FIELDS = ('auxiliary', 'auxiliary_1', 'auxiliary_2', 'auxiliary_3')
DEBIT_CATEGORIES = ('asset', 'expense', 'cost_of_sales')


def _is_debit_side(category, nature):
    """آیا ماندهٔ مثبت این حساب در سمت بدهکار است؟

    دارایی/هزینه/بهای تمام‌شده بدهکارند و بدهی/حقوق/درآمد بستانکار؛ برای
    **حساب‌های انتظامی** (که هم می‌توانند بدهکار باشند و هم بستانکار) ماهیت خودِ
    حساب تعیین‌کننده است.
    """
    if category in DEBIT_CATEGORIES:
        return True
    if category == 'memorandum':
        return nature != 'credit'
    return False


def _signed_net(category, nature, debit, credit):
    """ماندهٔ علامت‌دار بر پایهٔ سمت درستِ همان حساب."""
    return (debit - credit) if _is_debit_side(category, nature) else (credit - debit)


def _exclude_annual_closing(qs):
    """حذف «سند اختتامیهٔ سالانه» از محاسبهٔ مانده‌ها.

    سند اختتامیه، ماندهٔ حساب‌های دائمی را عمداً صفر می‌کند؛ پس اگر آن را در محاسبه
    لحاظ کنیم، مانده‌های واقعی پایان سال صفر می‌شوند و سند افتتاحیهٔ سال بعد خالی
    درمی‌آید. پس برای استخراج مانده‌های «پیش از بستن» این سند کنار گذاشته می‌شود.
    """
    return qs.exclude(document__source_module='annual', document__source_type='closing')


def _balance_rows(company, year, categories):
    """ماندهٔ تجمعی به تفکیک «حساب + تفصیلی‌های سطر» تا **آخرین تفصیل**.

    سند اختتامیهٔ همان سال از محاسبه کنار گذاشته می‌شود تا مانده‌های واقعیِ پایان سال
    (پیش از بستن) منتقل شوند.
    """
    lines = _exclude_annual_closing(_report_lines(company, year)).select_related(
        'account', 'account__account_type',
        'auxiliary', 'auxiliary_1', 'auxiliary_2', 'auxiliary_3',
    )
    agg = {}
    for line in lines:
        account_type = line.account.account_type
        category = account_type.category if account_type else None
        if category not in categories:
            continue
        key = (
            line.account_id, line.auxiliary_id, line.auxiliary_1_id,
            line.auxiliary_2_id, line.auxiliary_3_id,
        )
        rec = agg.get(key)
        if rec is None:
            rec = agg[key] = {
                'account': line.account,
                'category': category,
                'auxiliary': line.auxiliary,
                'auxiliary_1': line.auxiliary_1,
                'auxiliary_2': line.auxiliary_2,
                'auxiliary_3': line.auxiliary_3,
                'debit': 0.0,
                'credit': 0.0,
            }
        rec['debit'] += float(line.debit or 0)
        rec['credit'] += float(line.credit or 0)

    rows = []
    for key, rec in agg.items():
        debit, credit = rec['debit'], rec['credit']
        nature = rec['account'].nature
        if rec['category'] == 'memorandum' and nature not in ('debit', 'credit'):
            # ماهیت تعیین نشده است → سمت درست از گردش واقعیِ خودِ حساب استنتاج می‌شود
            nature = 'debit' if debit >= credit else 'credit'
        net = _signed_net(rec['category'], nature, debit, credit)
        if abs(net) <= 1e-9:
            continue
        deepest = rec['auxiliary_3'] or rec['auxiliary_2'] or rec['auxiliary_1'] or rec['auxiliary']
        rows.append({
            **rec,
            'nature': nature,
            'net': _round2(net),
            'deepest_aux': deepest,
            'key': '|'.join(str(k or '') for k in key),
        })
    rows.sort(key=lambda r: (r['account'].code, (r['deepest_aux'].code if r['deepest_aux'] else '')))
    return rows


def _carry_sides(category, net, nature='debit'):
    """افتتاحیه: مانده همان‌طور که هست منتقل می‌شود (همیشه با مقدار مثبت)."""
    if _is_debit_side(category, nature):
        return (abs(net), 0.0) if net >= 0 else (0.0, abs(net))
    return (0.0, abs(net)) if net >= 0 else (abs(net), 0.0)


def _zero_sides(category, net, nature='debit'):
    """اختتامیه: حساب صفر می‌شود (برعکسِ مانده) و همان مانده به حساب هدف می‌رود."""
    carry = _carry_sides(category, net, nature)
    return (carry[1], carry[0]), carry


def _close_sides(category, net):
    """بستن حساب‌های موقت: مقابلِ مانده، حساب هدف خورده می‌شود."""
    if category == 'revenue':
        return (net, 0.0), (0.0, net)
    return (0.0, net), (net, 0.0)


def _target_account(company):
    settings = AccountingSettings.objects.filter(company=company).select_related('profit_loss_account').first()
    if settings and settings.profit_loss_account_id:
        return settings.profit_loss_account
    return Account.objects.filter(company=company, is_active=True, account_type__category='equity').order_by('code').first()


def _retained_account(company):
    settings = AccountingSettings.objects.filter(company=company).select_related('retained_earnings_account').first()
    if settings and settings.retained_earnings_account_id:
        return settings.retained_earnings_account
    return _target_account(company)


def _journal(company, jtype, name):
    j = Journal.objects.filter(company=company, journal_type=jtype).first()
    if not j:
        j = Journal.objects.create(company=company, code=jtype.upper(), name=name, journal_type=jtype)
    return j


# =============================================================================
# عملیات سالانه — موتور مشترک (پیش‌نمایش، تاریخ دلخواه، پیش‌نویس قابل ویرایش)
# =============================================================================
ANNUAL_SPECS = {
    'opening': {
        'title': 'سند افتتاحیه',
        'source_type': 'opening',
        'source_prefix': 'opening',
        'journal_type': Journal.JournalType.OPENING,
        'journal_name': 'سند افتتاحیه',
        'categories': ('asset', 'liability', 'equity', 'memorandum'),
        'date_attr': 'start_date',
        'needs_prev_year': True,
        'target': 'profit_loss',
    },
    'closing': {
        'title': 'سند اختتامیه',
        'source_type': 'closing',
        'source_prefix': 'closing',
        'journal_type': Journal.JournalType.CLOSING,
        'journal_name': 'سند اختتامیه',
        'categories': ('asset', 'liability', 'equity', 'memorandum'),
        'date_attr': 'end_date',
        'needs_prev_year': False,
        'target': 'retained',
    },
    'close-accounts': {
        'title': 'بستن حساب‌های موقت',
        'source_type': 'close-accounts',
        'source_prefix': 'close',
        'journal_type': Journal.JournalType.CLOSING,
        'journal_name': 'سند بستن حساب‌ها',
        'categories': ('revenue', 'expense', 'cost_of_sales'),
        'date_attr': 'end_date',
        'needs_prev_year': False,
        'target': 'profit_loss',
    },
}


def _flag(value):
    return str(value or '').lower() in ('1', 'true', 'yes', 'on')


def _parse_date(raw, fallback):
    if not raw:
        return fallback
    try:
        from datetime import date as _date
        return _date.fromisoformat(str(raw)[:10])
    except (ValueError, TypeError):
        return fallback


def _source_id(kind, year):
    return f'{ANNUAL_SPECS[kind]["source_prefix"]}-{year.id}'


def _aux_path(aux):
    """مسیر تفصیلی تا آخرین سطح (برای نمایش در پیش‌نمایش)."""
    if aux is None:
        return ''
    chain, node, seen = [], aux, set()
    while node is not None and node.id not in seen and len(chain) < 6:
        seen.add(node.id)
        chain.append(f'{node.code} {node.name}'.strip())
        node = node.parent
    return ' / '.join(reversed(chain))


def _aux_options(company, account_ids, limit=400):
    """تفصیلی‌های مرتبط با هر حساب (برای انتخاب دستی در پیش‌نمایش)."""
    options = {}
    if not account_ids:
        return options
    qs = (
        AuxiliaryAccount.objects
        .filter(company=company, account_id__in=list(account_ids), is_active=True)
        .order_by('code')[:limit]
    )
    for aux in qs:
        options.setdefault(aux.account_id, []).append({
            'id': aux.id, 'code': aux.code, 'name': aux.name, 'path': _aux_path(aux),
        })
    return options


def _blank_aux():
    return {'auxiliary': None, 'auxiliary_1': None, 'auxiliary_2': None, 'auxiliary_3': None, 'deepest': None}


def _row_line(row, debit, credit, description):
    line = {**_blank_aux(), 'account': row['account'], 'deepest': row['deepest_aux'],
            'auxiliary': row['auxiliary'], 'auxiliary_1': row['auxiliary_1'],
            'auxiliary_2': row['auxiliary_2'], 'auxiliary_3': row['auxiliary_3']}
    line.update({'debit': _round2(debit), 'credit': _round2(credit), 'description': description})
    return line


def _target_line(target, debit, credit, description):
    line = {**_blank_aux(), 'account': target}
    line.update({'debit': _round2(debit), 'credit': _round2(credit), 'description': description})
    return line


def _build_spec_lines(kind, rows, target):
    """ساخت سطرهای پیشنهادی سند سالانه — با تفصیلی‌های هر ردیف حساب.

    * **افتتاحیه**: هر حساب با معین/تفصیل خودش ثبت می‌شود و اگر لازم باشد یک سطر توازن.
    * **اختتامیه / بستن حساب‌ها**: فقط **برگشت** ماندهٔ هر حساب (با معین/تفصیل خودش)؛
      اگر حساب‌های موقت بسته شده باشند و کتاب‌ها در تعادل باشند، جمع بدهکار و بستانکار
      خودِ همین برگشت‌ها برابر است و **هیچ سطر حساب هدفی ساخته نمی‌شود** (بدون گردش
      اضافی). تنها در صورت نامتعادل بودن، **یک** سطر توازن به حساب هدف اضافه می‌شود.
    """
    lines = []
    for row in rows:
        category, net = row['category'], row['net']
        nature = row.get('nature') or getattr(row['account'], 'nature', 'debit')
        code = row['account'].code
        if kind == 'opening':
            debit, credit = _carry_sides(category, net, nature)
            lines.append(_row_line(row, debit, credit, f'ماندهٔ سال قبل {code}'))
            continue
        if kind == 'closing':
            debit, credit = _zero_sides(category, net, nature)[0]
            lines.append(_row_line(row, debit, credit, f'اختتام {code}'))
        else:
            debit, credit = _close_sides(category, net)[0]
            lines.append(_row_line(row, debit, credit, f'بستن {code}'))

    diff = _round2(sum(l['debit'] for l in lines) - sum(l['credit'] for l in lines))
    if target is not None and abs(diff) > 0.001:
        description = 'توازن افتتاحیه' if kind == 'opening' else 'توازن اختتامیه'
        if diff > 0:
            lines.append(_target_line(target, 0.0, diff, description))
        else:
            lines.append(_target_line(target, -diff, 0.0, description))
    return lines



def _line_json(line):
    account = line['account']
    aux = line.get('deepest')
    account_type = account.account_type
    return {
        'account': account.id,
        'account_code': account.code,
        'account_name': account.name,
        'account_type_name': account_type.name if account_type else '',
        'category': account_type.category if account_type else '',
        'auxiliary': line.get('auxiliary').id if line.get('auxiliary') else None,
        'auxiliary_1': line.get('auxiliary_1').id if line.get('auxiliary_1') else None,
        'auxiliary_2': line.get('auxiliary_2').id if line.get('auxiliary_2') else None,
        'auxiliary_3': line.get('auxiliary_3').id if line.get('auxiliary_3') else None,
        'auxiliary_label': f'{aux.code} - {aux.name}' if aux else '',
        'auxiliary_path': _aux_path(aux),
        'debit': _round2(line['debit']),
        'credit': _round2(line['credit']),
        'description': line.get('description', ''),
    }


def _lines_from_payload(raw_lines, company):
    """ساخت سطرها از ورودی ویرایش‌شدهٔ کاربر (پیش‌نمایش قابل ادیت)."""
    lines = []
    for item in raw_lines or []:
        account = (
            Account.objects.filter(id=item.get('account'), company=company)
            .select_related('account_type').first()
        )
        if account is None:
            continue
        debit = float(item.get('debit') or 0)
        credit = float(item.get('credit') or 0)
        if abs(debit) < 1e-9 and abs(credit) < 1e-9:
            continue
        auxes = {}
        for field in AUX_FIELDS:
            aux_id = item.get(field)
            auxes[field] = (
                AuxiliaryAccount.objects.filter(id=aux_id, company=company).first() if aux_id else None
            )
        deepest = auxes['auxiliary_3'] or auxes['auxiliary_2'] or auxes['auxiliary_1'] or auxes['auxiliary']
        lines.append({
            'account': account,
            'auxiliary': auxes['auxiliary'],
            'auxiliary_1': auxes['auxiliary_1'],
            'auxiliary_2': auxes['auxiliary_2'],
            'auxiliary_3': auxes['auxiliary_3'],
            'deepest': deepest,
            'debit': _round2(debit),
            'credit': _round2(credit),
            'description': item.get('description') or '',
        })
    return lines


def _temporary_balance(company, year):
    """ماندهٔ حساب‌های موقت سال (درآمد منهای هزینه) — اگر «بستن حساب‌ها» اجرا نشده باشد صفر نیست."""
    total = 0.0
    for row in _balance_rows(company, year, ('revenue', 'expense', 'cost_of_sales')):
        total += row['net'] if row['category'] == 'revenue' else -row['net']
    return _round2(total)


def _misclassified_memorandum_accounts(company, limit=5):
    """حساب‌هایی که نامشان «انتظامی» است اما دستهٔ نوع حسابشان انتظامی نیست.

    عارضهٔ رایج داده‌ها: حساب‌های انتظامی زیر نوع «دارایی» ساخته می‌شوند؛ در این حالت
    در سند اختتامیه/افتتاحیه به‌عنوان انتظامی شناخته نمی‌شوند و در ترازنامه هم وارد می‌شوند.
    """
    qs = (
        Account.objects
        .filter(company=company, is_active=True, name__contains='انتظامی')
        .exclude(account_type__category='memorandum')
        .select_related('account_type')
        .order_by('code')
    )
    return [
        f'{a.code} {a.name} ({a.account_type.name if a.account_type else "—"})'
        for a in qs[:limit]
    ]


def _existing_document(company, kind, year):
    return AccountingDocument.objects.filter(
        company=company, source_module='annual',
        source_type=ANNUAL_SPECS[kind]['source_type'], source_id=_source_id(kind, year),
    ).first()


def _existing_closing_of_source_year(company, year):
    """سند اختتامیهٔ همان سال (اگر ساخته شده باشد) — برای اطلاع‌رسانی به کاربر."""
    if year is None:
        return None
    return AccountingDocument.objects.filter(
        company=company, source_module='annual',
        source_type=ANNUAL_SPECS['closing']['source_type'],
        source_id=_source_id('closing', year),
    ).first()


def _document_json(doc):
    if doc is None:
        return None
    return {
        'id': doc.id,
        'number': doc.number or f'#{doc.id}',
        'status': doc.status,
        'status_display': doc.get_status_display(),
        'date': doc.date.isoformat() if doc.date else None,
        'is_locked': doc.is_locked,
        'description': doc.description,
    }


def _annual_payload(request, kind):
    """محاسبهٔ داده‌های پیش‌نمایش یک عملیات سالانه (بدون هیچ تغییری در داده)."""
    company = _company(request)
    spec = ANNUAL_SPECS[kind]
    params = dict(request.query_params.dict())
    try:
        params.update({k: v for k, v in request.data.items()})
    except AttributeError:
        pass

    year = FiscalYear.objects.filter(id=params.get('fiscal_year'), company=company).first()
    if not year:
        return None, {'error': 'سال مالی معتبر انتخاب کنید.'}

    source_year = year
    prev_year = None
    if spec['needs_prev_year']:
        prev_year = (
            FiscalYear.objects.filter(company=company, start_date__lt=year.start_date)
            .order_by('-start_date').first()
        )
        if not prev_year:
            return None, {'error': 'سال مالی قبل یافت نشد؛ سند افتتاحیه قابل ساخت نیست.'}
        source_year = prev_year

    target = _retained_account(company) if spec['target'] == 'retained' else _target_account(company)
    rows = _balance_rows(company, source_year, spec['categories'])
    lines = _build_spec_lines(kind, rows, target)

    default_date = getattr(year, spec['date_attr'])
    chosen_date = _parse_date(params.get('date'), default_date)

    debit_total = _round2(sum(l['debit'] for l in lines))
    credit_total = _round2(sum(l['credit'] for l in lines))
    difference = _round2(debit_total - credit_total)

    options = _aux_options(company, {l['account'].id for l in lines})

    warnings = []
    without_aux = sum(1 for l in lines if l.get('deepest') is None)
    with_aux = sum(1 for l in lines if l.get('deepest') is not None)
    if without_aux:
        warnings.append(
            f'{without_aux} سطر بدون تفصیلی است؛ اگر برای آن حساب تفصیلی تعریف شده باشد، '
            'در همین جدول می‌توانید تفصیلی را انتخاب کنید.'
        )
    if not lines:
        warnings.append('مانده‌ای برای انتقال یافت نشد.')
    if abs(difference) > 0.001:
        warnings.append(f'سند متوازن نیست (اختلاف {difference:,.2f}).')

    existing = _existing_document(company, kind, year)
    if existing is not None:
        warnings.append(
            f'سند این عملیات قبلاً ساخته شده است (شماره {existing.number or existing.id}، '
            f'وضعیت {existing.get_status_display()}). برای بازسازی، «جایگزینی سند موجود» را انتخاب کنید.'
        )

    # حساب‌های انتظامی: طرف مقابل در همان گروه است و به سود و زیان منتقل نمی‌شوند
    memo_lines = [
        l for l in lines
        if l['account'].account_type and l['account'].account_type.category == 'memorandum'
    ]
    memo_debit = _round2(sum(l['debit'] for l in memo_lines))
    memo_credit = _round2(sum(l['credit'] for l in memo_lines))
    memo_balanced = abs(memo_debit - memo_credit) <= 0.001
    notes = []
    if memo_lines:
        notes.append(
            f'{len(memo_lines)} سطر مربوط به حساب‌های انتظامی در سند گنجانده شد — '
            + ('جمع انتظامی‌ها متوازن است، پس طرف مقابلِ آن‌ها در همان گروه حساب‌های انتظامی است '
               'و به سود و زیان منتقل نمی‌شود.'
               if memo_balanced else
               'جمع انتظامی‌ها متوازن نیست؛ اختلاف آن‌ها با حساب هدف جبران شد.')
        )
    if _existing_closing_of_source_year(company, source_year) is not None:
        notes.append(
            f'مانده‌ها «پیش از بستن» سال {source_year.name} محاسبه شده‌اند؛ سند اختتامیهٔ آن سال '
            '(که مانده‌ها را صفر می‌کند) در این محاسبه لحاظ نشده است.'
        )

    # شمارش ردیف‌ها به تفکیک دسته (برای اطمینان کاربر از حضور انتظامی‌ها در سند)
    rows_by_category = {}
    for r in rows:
        rows_by_category[r['category']] = rows_by_category.get(r['category'], 0) + 1

    # آیا سطر توازن اضافه شده است؟ (برای سندهای برگشتی، حالت مطلوب «بدون سطر توازن» است)
    balancing_lines = [l for l in lines if 'توازن' in (l.get('description') or '')]
    if kind in ('closing', 'close-accounts') and lines:
        if not balancing_lines:
            notes.append(
                'این سند فقط برگشتِ ماندهٔ حساب‌هاست و خودبه‌خود متوازن است — بدون هیچ سطر توازن اضافی.'
            )
        else:
            temporary = _temporary_balance(company, year) if kind == 'closing' else 0.0
            if kind == 'closing' and abs(temporary) > 0.001:
                warnings.append(
                    f'حساب‌های موقت سال (درآمد/هزینه/بهای تمام‌شده) بسته نشده‌اند (مانده {temporary:,.2f})؛ '
                    'به همین دلیل یک سطر «توازن اختتامیه» به حساب هدف اضافه شد. توصیه: ابتدا «بستن حساب‌ها» را '
                    'اجرا کنید تا سند اختتامیه تنها برگشتِ حساب‌ها و خودبه‌خود متوازن شود.'
                )
            else:
                warnings.append(
                    'کتاب‌ها در تعادل نیستند؛ یک سطر «توازن» به حساب هدف اضافه شد.'
                )

    misclassified = _misclassified_memorandum_accounts(company)
    if misclassified:
        warnings.append(
            f'{len(misclassified)} حساب با نام «انتظامی» وجود دارد که دستهٔ نوع حسابش «حساب‌های انتظامی» نیست '
            f'(مثل «{misclassified[0]}»)؛ این حساب‌ها در سند انتظامی نمی‌آیند و به‌عنوان دارایی/بدهی در '
            'ترازنامه وارد می‌شوند. برای اعمال رفتار انتظامی، دستهٔ نوع حساب آن‌ها را در «کدینگ → انواع حساب» '
            'به «حساب‌های انتظامی» تغییر دهید.'
        )

    return {
        'kind': kind,
        'title': spec['title'],
        'fiscal_year': {
            'id': year.id, 'name': year.name,
            'start_date': year.start_date.isoformat(), 'end_date': year.end_date.isoformat(),
        },
        'prev_year': ({
            'id': prev_year.id, 'name': prev_year.name,
            'start_date': prev_year.start_date.isoformat(), 'end_date': prev_year.end_date.isoformat(),
        } if prev_year else None),
        'source_year': {
            'id': source_year.id, 'name': source_year.name,
            'start_date': source_year.start_date.isoformat(), 'end_date': source_year.end_date.isoformat(),
        },
        'default_date': default_date.isoformat(),
        'date': chosen_date.isoformat(),
        'journal_name': spec['journal_name'],
        'target_account': ({'id': target.id, 'code': target.code, 'name': target.name} if target else None),
        'lines': [_line_json(l) for l in lines],
        'aux_options': {str(k): v for k, v in options.items()},
        'totals': {'debit': debit_total, 'credit': credit_total,
                   'difference': difference, 'is_balanced': abs(difference) <= 0.001},
        'aux_summary': {'with_aux': with_aux, 'without_aux': without_aux, 'accounts': len(rows)},
        'rows_by_category': rows_by_category,
        'memorandum': {
            'lines': len(memo_lines),
            'debit': memo_debit,
            'credit': memo_credit,
            'is_balanced': memo_balanced,
        },
        'warnings': warnings,
        'notes': notes,
        'existing': _document_json(existing),
        'needs_prev_year': spec['needs_prev_year'],
    }, None



def _persist_annual(request, kind, payload):
    """ساخت/بازسازی سند عملیات سالانه از سطرهای تأییدشدهٔ کاربر."""
    company = _company(request)
    spec = ANNUAL_SPECS[kind]
    params = dict(request.query_params.dict())
    try:
        params.update({k: v for k, v in request.data.items()})
    except AttributeError:
        pass

    year = FiscalYear.objects.filter(id=params.get('fiscal_year'), company=company).first()
    if not year:
        return None, {'error': 'سال مالی معتبر انتخاب کنید.'}, 400

    raw_lines = payload.get('lines')
    if isinstance(raw_lines, list):
        lines = _lines_from_payload(raw_lines, company)
    else:
        computed, error = _annual_payload(request, kind)
        if error:
            return None, error, 400
        lines = _lines_from_payload(computed['lines'], company)

    if not lines:
        return None, {'error': 'سندی برای ایجاد وجود ندارد (هیچ مانده یا سطری یافت نشد).'}, 400

    totals = {
        'debit': _round2(sum(l['debit'] for l in lines)),
        'credit': _round2(sum(l['credit'] for l in lines)),
    }
    difference = _round2(totals['debit'] - totals['credit'])
    if abs(difference) > 0.001 and not _flag(params.get('force')):
        return None, {
            'error': f'سند متوازن نیست (بدهکار {totals["debit"]:,.2f} / بستانکار {totals["credit"]:,.2f}). '
                     'برای ثبت با اختلاف، گزینهٔ «ثبت با اختلاف» را فعال کنید.',
            'totals': totals,
        }, 400

    status = str(params.get('status') or 'draft').lower()
    if status not in ('draft', 'submitted', 'posted'):
        status = 'draft'

    doc_date = _parse_date(params.get('date'), getattr(year, spec['date_attr']))
    replace = _flag(params.get('replace'))
    force_replace = _flag(params.get('force_replace'))

    existing = _existing_document(company, kind, year)
    if existing is not None and not replace:
        return None, {
            'error': f'سند این عملیات از قبل وجود دارد (شماره {existing.number or existing.id}). '
                     'برای بازسازی، «جایگزینی سند موجود» را انتخاب کنید.',
            'existing': _document_json(existing),
        }, 400
    if existing is not None and existing.is_locked and not force_replace:
        return None, {
            'error': 'سند موجود ثبت‌شده/قفل است؛ برای بازسازی، «جایگزینی سند ثبت‌شده» را فعال کنید.',
            'existing': _document_json(existing),
        }, 400

    journal = _journal(company, spec['journal_type'], spec['journal_name'])
    locked = status in ('posted', 'locked')
    description = f'{spec["title"]} — {year.name}'

    with transaction.atomic():
        if existing is not None:
            existing.lines.all().delete()
            doc = existing
            doc.journal = journal
            doc.fiscal_year = year
            doc.date = doc_date
            doc.description = description
            doc.status = status
            doc.is_locked = locked
            doc.issues = []
            doc.posted_by = request.user if status == 'posted' else None
            doc.posted_at = timezone.now() if status == 'posted' else None
            doc.save()
        else:
            doc = AccountingDocument.objects.create(
                company=company,
                journal=journal,
                fiscal_year=year,
                date=doc_date,
                description=description,
                status=status,
                source_module='annual',
                source_type=spec['source_type'],
                source_id=_source_id(kind, year),
                is_locked=locked,
                created_by=request.user,
                posted_by=request.user if status == 'posted' else None,
                posted_at=timezone.now() if status == 'posted' else None,
            )
        for index, line in enumerate(lines, start=1):
            amount = line['debit'] or line['credit']
            AccountingDocumentLine.objects.create(
                document=doc,
                company=company,
                account=line['account'],
                auxiliary=line.get('auxiliary'),
                auxiliary_1=line.get('auxiliary_1'),
                auxiliary_2=line.get('auxiliary_2'),
                auxiliary_3=line.get('auxiliary_3'),
                description=line.get('description') or '',
                debit=Decimal(str(line['debit'])),
                credit=Decimal(str(line['credit'])),
                line_no=index,
                base_amount=Decimal(str(amount)),
            )

    from accounting.serializers import AccountingDocumentSerializer
    return AccountingDocumentSerializer(doc).data, None, 201



def _annual_action(request, kind):
    """GET/POST مشترک: پیش‌نمایش (پیش‌فرض) یا ساخت سند."""
    params = dict(request.query_params.dict())
    try:
        params.update({k: v for k, v in request.data.items()})
    except AttributeError:
        pass

    wants_preview = _flag(params.get('preview')) or request.method == 'GET'
    if wants_preview and not _flag(params.get('create')):
        data, error = _annual_payload(request, kind)
        if error:
            return Response(error, status=400)
        return Response(data)

    data, error, status = _persist_annual(request, kind, params)
    if error:
        return Response(error, status=status)
    return Response({
        'document': data,
        'id': data.get('id'),
        'number': data.get('number'),
        'status': data.get('status'),
        'total_debit': data.get('total_debit'),
        'total_credit': data.get('total_credit'),
    }, status=status)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def opening_document(request):
    """سند افتتاحیه — پیش‌نمایش قابل‌ویرایش، تاریخ دلخواه و پیش‌نویس قابل ادیت."""
    return _annual_action(request, 'opening')


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def close_accounts(request):
    """بستن حساب‌های موقت (درآمد/هزینه/بهای تمام‌شده) با پیش‌نمایش و ویرایش."""
    return _annual_action(request, 'close-accounts')


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def closing_document(request):
    """سند اختتامیه — صفر کردن حساب‌های ترازنامه‌ای با پیش‌نمایش و ویرایش."""
    return _annual_action(request, 'closing')


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def legal_books(request):
    """ساخت دفاتر قانونی: روزنامه، کل، معین و تراز آزمایشی سال مالی."""
    company = _company(request)
    year_id = request.query_params.get('fiscal_year')
    year = FiscalYear.objects.filter(id=year_id, company=company).first() if year_id else None

    lines = _report_lines(company, year)

    journal_book = []
    docs = AccountingDocument.objects.filter(
        company=company, status__in=REPORTABLE_DOCUMENT_STATUSES,
    ).order_by('date', 'id')
    for doc in docs:
        if year and doc.fiscal_year_id != year.id:
            continue
        journal_book.append({
            'id': doc.id,
            'number': doc.number or str(doc.id),
            'date': doc.date.isoformat() if doc.date else None,
            'description': doc.description,
            'debit': float(doc.total_debit or 0),
            'credit': float(doc.total_credit or 0),
            'lines': [
                {
                    'account': l.account.code + ' - ' + l.account.name,
                    'debit': float(l.debit or 0),
                    'credit': float(l.credit or 0),
                }
                for l in doc.lines.select_related('account').all()
            ],
        })

    agg = {}
    for line in lines:
        rec = agg.setdefault(line.account_id, {
            'id': line.account_id, 'code': line.account.code, 'name': line.account.name,
            'nature': line.account.nature, 'debit': 0.0, 'credit': 0.0,
        })
        rec['debit'] += float(line.debit or 0)
        rec['credit'] += float(line.credit or 0)

    general_ledger = []
    for rec in sorted(agg.values(), key=lambda x: x['code']):
        balance = (rec['credit'] - rec['debit']) if rec['nature'] == 'credit' else (rec['debit'] - rec['credit'])
        general_ledger.append({**rec, 'balance': balance})

    ordered = _report_lines(company, year).order_by('document__date', 'document__id', 'line_no')
    by_account = {}
    for line in ordered:
        by_account.setdefault(line.account_id, []).append({
            'date': line.document.date.isoformat() if line.document.date else None,
            'number': line.document.number or str(line.document_id),
            'description': line.description or line.document.description,
            'debit': float(line.debit or 0),
            'credit': float(line.credit or 0),
        })

    subsidiary_ledger = []
    for aid, rows in by_account.items():
        account = Account.objects.filter(id=aid).first()
        if not account:
            continue
        running = 0.0
        for r in rows:
            if account.nature == 'credit':
                running += r['credit'] - r['debit']
            else:
                running += r['debit'] - r['credit']
            r['balance'] = running
        subsidiary_ledger.append({
            'id': aid, 'code': account.code, 'name': account.name, 'rows': rows,
        })
    subsidiary_ledger.sort(key=lambda x: x['code'])

    trial_rows = [
        {
            'account_code': rec['code'], 'account_name': rec['name'],
            'debit': rec['debit'], 'credit': rec['credit'], 'balance': rec['balance'],
        }
        for rec in general_ledger
    ]
    total_debit = sum(r['debit'] for r in trial_rows)
    total_credit = sum(r['credit'] for r in trial_rows)

    return Response({
        'fiscal_year': {'id': year.id, 'name': year.name} if year else None,
        'journal_book': journal_book,
        'general_ledger': general_ledger,
        'subsidiary_ledger': subsidiary_ledger,
        'trial_balance': {'rows': trial_rows, 'total_debit': total_debit, 'total_credit': total_credit},
    })