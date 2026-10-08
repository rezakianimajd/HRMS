"""نگاشت و ایمپورت داده — API."""
from datetime import date, datetime

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounting.models import (
    AccountGroup, Account, AuxiliaryAccount,
    Journal, FiscalYear, AccountingDocument, AccountingDocumentLine,
)
from datamapping.models import MappingSource, MappingEntry
from datamapping.serializers import MappingSourceSerializer, MappingEntrySerializer
from datamapping.services import (
    normalize, find_best_match, get_candidates, to_decimal,
)
from accounting.coding import suggest_code


def _company(request):
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


LEVEL_LABELS = {
    'group': 'گروه حساب',
    'general': 'حساب کل',
    'subsidiary': 'حساب معین',
    'auxiliary': 'حساب تفصیلی',
}


def _resolve_target(level, target_id, company):
    if not target_id:
        return None
    if level == 'group':
        return AccountGroup.objects.filter(company=company, id=target_id).first()
    if level == 'general':
        return Account.objects.filter(company=company, id=target_id, parent__isnull=True).first()
    if level == 'subsidiary':
        return Account.objects.filter(company=company, id=target_id).first()
    if level == 'auxiliary':
        return AuxiliaryAccount.objects.filter(company=company, id=target_id).first()
    return None


def _assign_target_fields(level, obj):
    return {
        'group': {'target_group': obj},
        'general': {'target_account': obj},
        'subsidiary': {'target_account': obj},
        'auxiliary': {'target_auxiliary': obj},
    }.get(level, {})


def _match_headers(headers, alias_lists):
    result = {}
    norm_headers = [normalize(h) for h in headers]
    for key, aliases in alias_lists.items():
        for a in aliases:
            na = normalize(a)
            for i, h in enumerate(norm_headers):
                if h == na and key not in result:
                    result[key] = i
                    break
            if key in result:
                break
    return result


# -----------------------------------------------------------------------------
# منابع (Sources)
# -----------------------------------------------------------------------------
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def sources(request):
    company = _company(request)
    if request.method == 'GET':
        qs = MappingSource.objects.filter(company=company, is_active=True)
        return Response(MappingSourceSerializer(qs, many=True).data)
    serializer = MappingSourceSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    obj = serializer.save(company=company)
    return Response(MappingSourceSerializer(obj).data, status=201)


# -----------------------------------------------------------------------------
# گزینه‌های تطبیق
# -----------------------------------------------------------------------------
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def options(request):
    company = _company(request)
    level = request.query_params.get('level')

    def acc_brief(acc):
        return {'id': acc.id, 'code': acc.code, 'name': acc.name}

    payload = {
        'groups': [{'id': g.id, 'code': g.code, 'name': g.name} for g in AccountGroup.objects.filter(company=company, is_active=True)],
        'general': [acc_brief(a) for a in Account.objects.filter(company=company, is_active=True, parent__isnull=True)],
        'subsidiary': [acc_brief(a) for a in Account.objects.filter(company=company, is_active=True, parent__isnull=False)],
        'auxiliary': [{'id': a.id, 'code': a.code, 'name': a.name} for a in AuxiliaryAccount.objects.filter(company=company, is_active=True)],
    }
    if level and level in payload:
        return Response(payload[level])
    return Response(payload)


# -----------------------------------------------------------------------------
# پیش‌نمایش تطبیق کدینگ
# -----------------------------------------------------------------------------
CODING_HEADERS = {
    'source_code': ['کد', 'کد حساب', 'کد مبدا', 'code'],
    'source_name': ['عنوان', 'نام', 'شرح', 'نام حساب', 'title', 'name'],
}


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def preview(request):
    company = _company(request)
    level = request.data.get('level') or request.query_params.get('level')
    if level not in LEVEL_LABELS:
        return Response({'error': 'سطح کدینگ نامعتبر است'}, status=400)

    file = request.FILES.get('file')
    if not file:
        return Response({'error': 'فایل انتخاب نشده است'}, status=400)

    try:
        import openpyxl
        wb = openpyxl.load_workbook(file, read_only=True, data_only=True)
        ws = wb.active
        raw = list(ws.iter_rows(values_only=True))
        if not raw:
            return Response({'error': 'فایل خالی است'}, status=400)
        headers = [str(h).strip() if h is not None else '' for h in raw[0]]
        col_map = _match_headers(headers, CODING_HEADERS)
        if 'source_code' not in col_map and 'source_name' not in col_map:
            return Response({'error': 'ستون‌های «کد» یا «عنوان» پیدا نشدند'}, status=400)

        candidates = get_candidates(level, company)
        existing = {e.source_code: e for e in MappingEntry.objects.filter(company=company, level=level)}

        rows = []
        for r in raw[1:]:
            if not any(r):
                continue
            code = str(r[col_map['source_code']]).strip() if 'source_code' in col_map and col_map['source_code'] < len(r) and r[col_map['source_code']] is not None else ''
            name = str(r[col_map['source_name']]).strip() if 'source_name' in col_map and col_map['source_name'] < len(r) and r[col_map['source_name']] is not None else ''
            if not code and not name:
                continue
            best, score = find_best_match(name, code, candidates)
            prev = existing.get(code)
            rows.append({
                'source_code': code,
                'source_name': name,
                'matched_target_id': getattr(best, 'id', None),
                'matched_target_code': getattr(best, 'code', ''),
                'matched_target_name': getattr(best, 'name', ''),
                'match_score': round(score, 2),
                'is_exact': bool(best and score >= 0.999),
                'previously_mapped': bool(prev and prev.status in ('matched', 'new')),
                'previous_target_name': prev.target_name if prev else '',
            })
        return Response({'level': level, 'rows': rows, 'total': len(rows)})
    except Exception as e:
        return Response({'error': f'خطا در خواندن فایل: {str(e)[:120]}'}, status=400)


# -----------------------------------------------------------------------------
# اعمال نگاشت
# -----------------------------------------------------------------------------
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def apply(request):
    company = _company(request)
    level = request.data.get('level')
    if level not in LEVEL_LABELS:
        return Response({'error': 'سطح کدینگ نامعتبر است'}, status=400)
    source_id = request.data.get('source_id')
    rows = request.data.get('rows') or []

    created = 0
    mapped = 0
    ignored = 0
    errors = []

    for i, row in enumerate(rows):
        action = row.get('action', 'ignore')
        source_code = str(row.get('source_code', '') or '').strip()
        source_name = str(row.get('source_name', '') or '').strip()

        if action == 'ignore':
            ignored += 1
            continue

        if action == 'matched':
            target_id = row.get('target_id') or row.get('matched_target_id')
            obj = _resolve_target(level, target_id, company)
            if not obj:
                errors.append({'row': i + 2, 'error': 'هدف انتخاب‌شده یافت نشد'})
                continue
        elif action == 'new':
            name = str(row.get('new_name', '') or source_name or '').strip()
            if not name:
                errors.append({'row': i + 2, 'error': 'عنوان جدید خالی است'})
                continue
            obj = _create_new_target(level, company, name)
            if not obj:
                errors.append({'row': i + 2, 'error': 'ایجاد رکورد جدید ناموفق بود'})
                continue
        else:
            ignored += 1
            continue

        fields = _assign_target_fields(level, obj)
        is_new = action == 'new'
        entry = MappingEntry.objects.filter(
            company=company,
            source_id=source_id or None,
            level=level,
            source_code=source_code,
        ).first()
        if entry:
            entry.source_name = source_name
            entry.status = 'new' if is_new else 'matched'
            entry.resolved = True
            for k, v in fields.items():
                setattr(entry, k, v)
            entry.save()
        else:
            MappingEntry.objects.create(
                company=company,
                source_id=source_id or None,
                level=level,
                source_code=source_code,
                source_name=source_name,
                status='new' if is_new else 'matched',
                resolved=True,
                **fields,
            )
        if is_new:
            created += 1
        else:
            mapped += 1

    return Response({
        'message': 'نگاشت اعمال شد',
        'created': created,
        'mapped': mapped,
        'ignored': ignored,
        'errors': errors,
    })


def _create_new_target(level, company, name):
    """ایجاد ردیف جدید در سطح کدینگ مربوطه با کد خودکار (بر اساس CodingConfig)."""
    from accounting.models import AccountType
    from django.db import IntegrityError
    acc_type = AccountType.objects.filter(company=company).first()

    if level == 'group':
        if not acc_type:
            return None
        for _ in range(3):
            code = suggest_code(company, 'group') or _next_code(AccountGroup, company)
            try:
                return AccountGroup.objects.create(company=company, account_type=acc_type, code=code, name=name)
            except IntegrityError:
                continue
        return None

    if level in ('general', 'subsidiary'):
        if not acc_type:
            return None
        for attempt in range(5):
            code = suggest_code(company, level) if attempt == 0 else _next_code(Account, company)
            if not code:
                code = _next_code(Account, company)
            try:
                return Account.objects.create(
                    company=company, account_type=acc_type, code=code, name=name,
                    level=1 if level == 'general' else 2,
                )
            except IntegrityError:
                continue
        return None

    if level == 'auxiliary':
        for attempt in range(5):
            code = suggest_code(company, 'auxiliary') if attempt == 0 else _next_code(AuxiliaryAccount, company)
            if not code:
                code = _next_code(AuxiliaryAccount, company)
            try:
                return AuxiliaryAccount.objects.create(company=company, code=code, name=name)
            except IntegrityError:
                continue
        return None
    return None


def _next_code(model, company):
    """تولید کد عددی بعدی (بر اساس بیشترین کد عددی موجود)."""
    from django.db.models import Max
    agg = model.objects.filter(company=company).aggregate(m=Max('code'))
    cur = 0
    for ch in str(agg.get('m') or ''):
        if ch.isdigit():
            cur = cur * 10 + int(ch)
    return str(cur + 1) if cur else '1'


# -----------------------------------------------------------------------------
# لیست نگاشت‌ها
# -----------------------------------------------------------------------------
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def entries(request):
    company = _company(request)
    level = request.query_params.get('level')
    qs = MappingEntry.objects.filter(company=company).select_related('target_group', 'target_account', 'target_auxiliary')
    if level:
        qs = qs.filter(level=level)
    return Response(MappingEntrySerializer(qs[:500], many=True).data)


# -----------------------------------------------------------------------------
# ایمپورت اسناد حسابداری
# -----------------------------------------------------------------------------
DOC_HEADERS = {
    'doc_number': ['شماره سند', 'شماره', 'شماره سند مبدا', 'number', 'doc_no'],
    'date': ['تاریخ', 'تاریخ سند', 'date'],
    'description': ['شرح', 'شرح سند', 'description'],
    'account_code': ['کد حساب', 'کد معین', 'کد', 'حساب', 'account', 'account_code'],
    'line_description': ['شرح سطر', 'شرح ردیف', 'line_description'],
    'debit': ['بدهکار', 'debit'],
    'credit': ['بستانکار', 'credit'],
    'auxiliary_code': ['تفصیل', 'کد تفصیل', 'تفصیلی', 'auxiliary', 'aux'],
}


def _parse_date(value):
    if isinstance(value, date):
        return value
    if not value:
        return None
    s = str(value).strip()
    for fmt in ('%Y-%m-%d', '%Y/%m/%d', '%m/%d/%Y', '%d/%m/%Y'):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def _resolve_account(company, code, source_id=None):
    if not code:
        return None
    acc = Account.objects.filter(company=company, code=code).first()
    if acc:
        return acc
    # ابتدا نگاشت مختص منبع، سپس نگاشت عمومی
    qs = MappingEntry.objects.filter(
        company=company, level__in=['subsidiary', 'general'], source_code=code, resolved=True,
    )
    if source_id:
        entry = qs.filter(source_id=source_id).first() or qs.filter(source__isnull=True).first()
    else:
        entry = qs.first()
    if entry and entry.target_account:
        return entry.target_account
    return None


def _resolve_auxiliary(company, code, source_id=None):
    if not code:
        return None
    aux = AuxiliaryAccount.objects.filter(company=company, code=code).first()
    if aux:
        return aux
    qs = MappingEntry.objects.filter(
        company=company, level='auxiliary', source_code=code, resolved=True,
    )
    if source_id:
        entry = qs.filter(source_id=source_id).first() or qs.filter(source__isnull=True).first()
    else:
        entry = qs.first()
    if entry and entry.target_auxiliary:
        return entry.target_auxiliary
    return None


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def import_documents(request):
    company = _company(request)
    post_now = str(request.data.get('post') or 'false').lower() in ('true', '1')
    source_id = request.data.get('source_id') or None
    file = request.FILES.get('file')
    if not file:
        return Response({'error': 'فایل انتخاب نشده است'}, status=400)

    try:
        import openpyxl
        wb = openpyxl.load_workbook(file, read_only=True, data_only=True)
        ws = wb.active
        raw = list(ws.iter_rows(values_only=True))
        if not raw:
            return Response({'error': 'فایل خالی است'}, status=400)
        headers = [str(h).strip() if h is not None else '' for h in raw[0]]
        col_map = _match_headers(headers, DOC_HEADERS)
        if 'account_code' not in col_map:
            return Response({'error': 'ستون «کد حساب / کد معین» پیدا نشد'}, status=400)

        rows = []
        for r in raw[1:]:
            if not any(r):
                continue

            def cell(key):
                if key in col_map and col_map[key] < len(r):
                    return r[col_map[key]]
                return None

            rows.append({
                'doc_number': str(cell('doc_number') or '').strip() if cell('doc_number') is not None else '',
                'date': _parse_date(cell('date')),
                'description': str(cell('description') or '').strip() if cell('description') is not None else '',
                'account_code': str(cell('account_code') or '').strip(),
                'line_description': str(cell('line_description') or '').strip() if cell('line_description') is not None else '',
                'debit': to_decimal(cell('debit')),
                'credit': to_decimal(cell('credit')),
                'auxiliary_code': str(cell('auxiliary_code') or '').strip() if cell('auxiliary_code') is not None else '',
            })

        from collections import OrderedDict
        docs = OrderedDict()
        for r in rows:
            key = r['doc_number'] or (r['date'].isoformat() if r['date'] else 'doc')
            docs.setdefault(key, []).append(r)

        journal, _ = Journal.objects.get_or_create(
            company=company, code='GEN',
            defaults={'name': 'روزنامه عمومی', 'journal_type': 'manual'},
        )

        created_docs = 0
        created_lines = 0
        unresolved_codes = set()
        for doc_key, lines in docs.items():
            first = lines[0]
            doc_date = first['date'] or date.today()
            fiscal_year = FiscalYear.objects.filter(
                company=company, start_date__lte=doc_date, end_date__gte=doc_date,
            ).order_by('-start_date').first()

            doc = AccountingDocument.objects.create(
                company=company,
                journal=journal,
                fiscal_year=fiscal_year,
                date=doc_date,
                description=first['description'] or f'سند ایمپورت‌شده {doc_key}',
                number='',
                status='posted' if post_now else 'draft',
                source_module='datamapping',
                source_type='excel',
                source_id=str(doc_key),
                created_by=request.user if request.user.is_authenticated else None,
            )
            created_docs += 1
            for i, ln in enumerate(lines, start=1):
                acc = _resolve_account(company, ln['account_code'], source_id)
                if not acc:
                    unresolved_codes.add(ln['account_code'])
                    continue
                aux = _resolve_auxiliary(company, ln['auxiliary_code'], source_id)
                AccountingDocumentLine.objects.create(
                    company=company,
                    document=doc,
                    account=acc,
                    auxiliary_1=aux,
                    line_no=i,
                    description=ln['line_description'] or ln['description'],
                    debit=ln['debit'],
                    credit=ln['credit'],
                )
                created_lines += 1

        return Response({
            'message': 'ایمپورت اسناد انجام شد',
            'created_documents': created_docs,
            'created_lines': created_lines,
            'post_now': post_now,
            'unresolved_codes': sorted(unresolved_codes)[:100],
        })
    except Exception as e:
        return Response({'error': f'خطا در ایمپورت: {str(e)[:150]}'}, status=400)


# -----------------------------------------------------------------------------
# ساخت خودکار حساب‌های تفصیلی از موجودیت‌های ماژول‌های دیگر
# -----------------------------------------------------------------------------
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sync_auxiliaries(request):
    """ساخت تفصیل‌ها از: طرف‌حساب‌ها (حقیقی/حقوقی)، بانک‌ها، قراردادها، پروژه‌ها و پرسنل."""
    company = _company(request)

    from accounting.models import AuxiliaryCategory
    from contracts.models import ContractParty, Contract
    from treasury.models import TreasuryEntity
    from projects.models import Project
    from employees.models import Employee

    def get_category(name, source, sort):
        return AuxiliaryCategory.objects.get_or_create(
            company=company, name=name,
            defaults={'code': source + str(sort), 'source': source, 'sort_order': sort},
        )[0]

    cat_party_legal = get_category('طرف حساب حقوقی', 'party', 1)
    cat_party_natural = get_category('طرف حساب حقیقی', 'party', 2)
    cat_bank = get_category('بانک', 'bank', 3)
    cat_contract = get_category('قرارداد', 'contract', 4)
    cat_project = get_category('پروژه', 'project', 5)
    cat_employee = get_category('پرسنل', 'employee', 6)

    created = 0
    updated = 0
    counts = {}

    def upsert(lookup, aux_type, category, name, extra=None):
        nonlocal created, updated
        obj = AuxiliaryAccount.objects.filter(company=company, **lookup).first()
        if obj:
            changed = False
            if not obj.category:
                obj.category = category
                changed = True
            if not obj.aux_type or obj.aux_type == 'other':
                obj.aux_type = aux_type
                changed = True
            if changed:
                obj.save(update_fields=['category', 'aux_type', 'updated_at'])
            updated += 1
            return
        kwargs = {'company': company, 'category': category, 'aux_type': aux_type, 'name': name, **lookup}
        if extra:
            kwargs.update(extra)
        kwargs['code'] = suggest_code(company, 'auxiliary') or _next_code(AuxiliaryAccount, company)
        obj = AuxiliaryAccount.objects.create(**kwargs)
        created += 1

    # طرف‌حساب‌ها (حقیقی/حقوقی)
    for party in ContractParty.objects.filter(company=company, is_active=True):
        cat = cat_party_legal if party.person_type == 'legal' else cat_party_natural
        upsert({'party': party}, 'party', cat, party.name, {'person_type': party.person_type})
    counts['parties'] = ContractParty.objects.filter(company=company, is_active=True).count()

    # بانک‌ها / صندوق‌ها
    for entity in TreasuryEntity.objects.filter(company=company, is_active=True):
        upsert({'treasury_entity': entity}, 'bank' if entity.entity_type == 'bank' else 'cash', cat_bank, entity.name)
    counts['banks'] = TreasuryEntity.objects.filter(company=company, is_active=True).count()

    # قراردادها (نام = طرف + شماره قرارداد)
    for contract in Contract.objects.filter(company=company).select_related('party'):
        if contract.party:
            label = f"{contract.party.name} - {contract.number}".strip(' -')
        else:
            label = contract.number or f'قرارداد {contract.pk}'
        upsert({'contract': contract}, 'contract', cat_contract, label, {'party': contract.party})
    counts['contracts'] = Contract.objects.filter(company=company).count()

    # پروژه‌ها
    for project in Project.objects.filter(company=company):
        upsert({'project': project}, 'project', cat_project, project.name)
    counts['projects'] = Project.objects.filter(company=company).count()

    # پرسنل
    for emp in Employee.objects.filter(company=company, is_active=True):
        upsert({'employee': emp}, 'employee', cat_employee, emp.full_name)
    counts['employees'] = Employee.objects.filter(company=company, is_active=True).count()

    return Response({
        'message': 'تفصیل‌ها همگام‌سازی شدند',
        'created': created,
        'updated': updated,
        'counts': counts,
    })
