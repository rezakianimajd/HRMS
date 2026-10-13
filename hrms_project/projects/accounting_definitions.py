"""موتور «تعاریف اولیهٔ پروژه»: تبدیل تعریف به کدینگ واقعی (کل/معین/تفصیل).

منطق کار:

1. برای یک پروژه، **تعریف‌های مؤثر** ساخته می‌شود: تعریف‌های حوزهٔ همان «نوع پروژه» +
   تعریف‌های حوزهٔ خود «پروژه»؛ اگر کدی در هر دو باشد، تعریف پروژه‌ای اولویت دارد
   (این امکان را می‌دهد بعضی پروژه‌ها ماهیت/محل ثبت متفاوتی داشته باشند).
2. هر تعریف، یک «حساب کل» و یک «حساب معین» دارد و تا سه **تفصیل** (تفصیل ۱..۳) که منبع
   آن‌ها در تعریف مشخص شده است: پروژهٔ سند، طرف حساب، تأمین‌کننده، قرارداد، پرسنل،
   بانک/صندوق یا یک تفصیل ثابت.
3. هنگام ثبت هزینه/سند، `build_coding` تفصیل‌های لازم را **پیدا و در صورت نبود،
   به‌صورت خودکار می‌سازد** (کد از موتور کدینگ `accounting.coding`) و خروجی را در
   قالبی آمادهٔ درج روی ردیف سند برمی‌گرداند.
"""
from django.db.models import Q

from projects.definition_models import (
    ProjectAccountDefinition, ProjectAccountDefinitionAux,
)

# نگاشت منبع تفصیل به نوع تفصیلی (AuxiliaryAccount.AuxType)
SOURCE_AUX_TYPE = {
    ProjectAccountDefinitionAux.Source.PROJECT: 'project',
    ProjectAccountDefinitionAux.Source.PARTY: 'party',
    ProjectAccountDefinitionAux.Source.SUPPLIER: 'supplier',
    ProjectAccountDefinitionAux.Source.CONTRACT: 'contract',
    ProjectAccountDefinitionAux.Source.EMPLOYEE: 'employee',
    ProjectAccountDefinitionAux.Source.BANK: 'bank',
    ProjectAccountDefinitionAux.Source.CASH: 'cash',
}

SOURCE_LABELS = {
    'project': 'پروژهٔ همین سند',
    'party': 'طرف حساب / پیمانکار',
    'supplier': 'تأمین‌کننده',
    'contract': 'قرارداد',
    'employee': 'پرسنل',
    'bank': 'بانک',
    'cash': 'صندوق',
    'fixed': 'تفصیل ثابت',
    'none': 'بدون تفصیل',
}

# پیشنهاد «قالب اولیه» برای شروع سریع تعاریف هر نوع پروژه
SUGGESTED_DEFINITIONS = [
    ('MAT', 'مصالح مصرفی', 'material', 'خرید و مصرف مصالح پای کار'),
    ('LBR', 'دستمزد و پیمانکار جزء', 'labor', 'دستمزد مستقیم و پیمانکاران جزء'),
    ('MCH', 'ماشین‌آلات و تجهیزات', 'machinery', 'اجاره و استهلاک ماشین‌آلات'),
    ('TRN', 'حمل و نقل', 'transport', 'هزینهٔ حمل مواد و تجهیزات'),
    ('OVH', 'سربار کارگاه', 'overhead', 'هزینه‌های عمومی و سربار کارگاه'),
    ('REV', 'درآمد صورت‌وضعیت', 'revenue', 'درآمد شناسایی‌شده از صورت‌وضعیت‌ها'),
    ('ADV', 'پیش‌پرداخت پیمانکار', 'advance', 'پیش‌پرداخت‌های پرداختی به پیمانکار'),
    ('RET', 'حسن انجام کار', 'retention', 'کسور حسن انجام کار'),
    ('INS', 'بیمهٔ کارکنان', 'insurance', 'بیمهٔ اجتماعی و مسئولیت'),
    ('TAX', 'مالیات و عوارض', 'tax', 'مالیات بر ارزش افزوده و عوارض'),
    ('GUA', 'تضمین و ضمانت‌نامه', 'guarantee', 'تضمین‌های بانکی پروژه'),
    ('PTC', 'تنخواه کارگاه', 'petty_cash', 'هزینه‌های خرد کارگاه'),
    ('PRL', 'حقوق و دستمزد', 'payroll', 'حقوق، مزایا و بیمهٔ پرسنل'),
]


def _acc(account):
    if account is None:
        return None
    return {
        'id': account.pk,
        'code': getattr(account, 'code', ''),
        'name': getattr(account, 'name', ''),
        'full_code': getattr(account, 'full_code', '') or '',
    }


def _aux(auxiliary):
    if auxiliary is None:
        return None
    return {
        'id': auxiliary.pk,
        'code': getattr(auxiliary, 'code', ''),
        'name': getattr(auxiliary, 'name', ''),
        'aux_type': getattr(auxiliary, 'aux_type', ''),
        'category_name': getattr(getattr(auxiliary, 'category', None), 'name', '') or '',
    }


def _cost_center(cost_center):
    if cost_center is None:
        return None
    return {
        'id': cost_center.pk,
        'code': getattr(cost_center, 'code', ''),
        'name': getattr(cost_center, 'name', ''),
    }


# ----------------------------------------------------------------------------
# انتخاب تعریف‌های مؤثر
# ----------------------------------------------------------------------------
def _base_queryset(company):
    return ProjectAccountDefinition.objects.filter(company=company, is_active=True).select_related(
        'general_account', 'subsidiary_account', 'cost_center', 'project', 'project_type',
        'general_account__parent', 'subsidiary_account__parent',
    ).prefetch_related('auxiliary_rules')


def _merge_scoped(rows):
    """ترکیب ردیف‌های دو حوزه: تعریف پروژه‌ای جای تعریف نوع پروژه را می‌گیرد."""
    ordered = sorted(rows, key=lambda d: 0 if getattr(d, 'project_id', None) else 1)
    merged, seen = [], set()
    for definition in ordered:
        if definition.code in seen:
            continue
        seen.add(definition.code)
        merged.append(definition)
    merged.sort(key=lambda d: (d.sort_order or 0, d.code))
    return merged


def effective_definitions(company, project):
    """تعریف‌های مؤثر یک پروژه: تعریف پروژه‌ای بر تعریف نوع پروژه اولویت دارد."""
    if company is None or project is None:
        return []
    type_id = getattr(project, 'project_type_id', None)
    query = Q(project_id=project.pk)
    if type_id:
        query |= Q(project_type_id=type_id, project__isnull=True)
    return _merge_scoped(list(_base_queryset(company).filter(query)))


def resolve_definition(company, project, code=None, kind=None, definition_id=None):
    """یک تعریف مشخص را پیدا کن (با کد، نوع آیتم یا شناسه)."""
    candidates = effective_definitions(company, project)
    if definition_id:
        for definition in candidates:
            if definition.pk == int(definition_id):
                return definition
        return None
    if code:
        for definition in candidates:
            if definition.code == code:
                return definition
    if kind:
        for definition in candidates:
            if definition.kind == kind:
                return definition
    return None



# ----------------------------------------------------------------------------
# ساخت/یافتن تفصیل‌ها
# ----------------------------------------------------------------------------
def _lookup_auxiliary(company, source, ctx):
    """تفصیل موجود را بر اساس منبع پیدا کن."""
    from accounting.models import AuxiliaryAccount

    qs = AuxiliaryAccount.objects.filter(company=company)
    project = ctx.get('project')
    if source == ProjectAccountDefinitionAux.Source.PROJECT:
        return qs.filter(project=project).order_by('code').first() if project else None
    if source == ProjectAccountDefinitionAux.Source.PARTY and ctx.get('party') is not None:
        return qs.filter(party=ctx['party']).order_by('code').first()
    if source == ProjectAccountDefinitionAux.Source.SUPPLIER and ctx.get('supplier') is not None:
        return qs.filter(supplier=ctx['supplier']).order_by('code').first()
    if source == ProjectAccountDefinitionAux.Source.CONTRACT and ctx.get('contract') is not None:
        return qs.filter(contract=ctx['contract']).order_by('code').first()
    if source == ProjectAccountDefinitionAux.Source.EMPLOYEE and ctx.get('employee') is not None:
        return qs.filter(employee=ctx['employee']).order_by('code').first()
    if source in (ProjectAccountDefinitionAux.Source.BANK, ProjectAccountDefinitionAux.Source.CASH):
        entity = ctx.get('treasury_entity')
        if entity is not None:
            return qs.filter(treasury_entity=entity).order_by('code').first()
    return None


def _aux_identity(source, ctx):
    """(کد پیشنهادی، نام، نوع تفصیلی و ارجاع‌های موجودیت) برای ساخت تفصیل."""
    project = ctx.get('project')
    party = ctx.get('party')
    supplier = ctx.get('supplier')
    contract = ctx.get('contract')
    employee = ctx.get('employee')
    entity = ctx.get('treasury_entity')
    aux_type = SOURCE_AUX_TYPE.get(source, 'other')

    if source == ProjectAccountDefinitionAux.Source.PROJECT and project is not None:
        prefix = getattr(project, 'code', '') or f'P{project.pk}'
        return f'PRJ-{prefix}', getattr(project, 'name', '') or str(project), aux_type, {'project': project}
    if source == ProjectAccountDefinitionAux.Source.PARTY and party is not None:
        prefix = getattr(party, 'id', '') or ''
        return f'PTY-{prefix}', getattr(party, 'name', '') or str(party), aux_type, {'party': party}
    if source == ProjectAccountDefinitionAux.Source.SUPPLIER and supplier is not None:
        prefix = getattr(supplier, 'code', '') or getattr(supplier, 'id', '')
        return f'SUP-{prefix}', getattr(supplier, 'name', '') or str(supplier), aux_type, {'supplier': supplier}
    if source == ProjectAccountDefinitionAux.Source.CONTRACT and contract is not None:
        prefix = getattr(contract, 'number', '') or contract.pk
        return f'CTR-{prefix}', getattr(contract, 'subject', '') or str(contract), aux_type, {'contract': contract}
    if source == ProjectAccountDefinitionAux.Source.EMPLOYEE and employee is not None:
        prefix = getattr(employee, 'personnel_code', '') or employee.pk
        name = getattr(employee, 'full_name', '') or str(employee)
        return f'EMP-{prefix}', name, aux_type, {'employee': employee}
    if source in (ProjectAccountDefinitionAux.Source.BANK, ProjectAccountDefinitionAux.Source.CASH) \
            and entity is not None:
        prefix = getattr(entity, 'code', '') or entity.pk
        return f'BNK-{prefix}', getattr(entity, 'name', '') or str(entity), aux_type, {'treasury_entity': entity}
    return None


def ensure_auxiliary(company, rule, ctx, create=None):
    """تفصیل متناظر با یک قاعده را برگردان (و در صورت اجازه، بساز).

    خروجی: ``(auxiliary_or_None, created: bool, warning_or_None)``
    """
    from accounting.coding import next_code
    from accounting.models import AuxiliaryAccount

    source = rule.source
    if source == ProjectAccountDefinitionAux.Source.NONE:
        return None, False, None
    if source == ProjectAccountDefinitionAux.Source.FIXED:
        if rule.auxiliary_id:
            return rule.auxiliary, False, None
        return None, False, f'تفصیل ثابت اسلات {rule.slot} انتخاب نشده است.'

    existing = _lookup_auxiliary(company, source, ctx)
    if existing is not None:
        return existing, False, None

    allowed = rule.auto_create if create is None else bool(create)
    identity = _aux_identity(source, ctx)
    if identity is None:
        return None, False, (
            f'منبع «{SOURCE_LABELS.get(source, source)}» برای اسلات {rule.slot} '
            'در این سند در دسترس نیست.'
        )
    if not allowed:
        label, _name, _type, _links = identity
        return None, False, (
            f'تفصیل «{label}» ({SOURCE_LABELS.get(source, source)}) موجود نیست و '
            'ساخت خودکار خاموش است.'
        )

    default_code, name, aux_type, links = identity
    code = default_code
    if AuxiliaryAccount.objects.filter(company=company, code=code).exists():
        code = next_code(company, 'auxiliary') or f'{default_code}-{ctx.get("project", "")}'[:50]
    auxiliary = AuxiliaryAccount.objects.create(
        company=company, code=code[:50], name=name[:200], aux_type=aux_type,
        category=rule.category, is_active=True, **links,
    )
    return auxiliary, True, None



# ----------------------------------------------------------------------------
# ساخت «کدینگ» نهایی برای یک سند
# ----------------------------------------------------------------------------
def _slot_categories(definition):
    """دستهٔ تفصیلی مورد انتظارِ حساب معین برای هر اسلات (۱..۳)."""
    account = definition.subsidiary_account
    return {
        1: getattr(account, 'auxiliary_category_1', None),
        2: getattr(account, 'auxiliary_category_2', None),
        3: getattr(account, 'auxiliary_category_3', None),
    }


def build_coding(definition, *, project=None, party=None, supplier=None, contract=None,
                 employee=None, treasury_entity=None, create=None, company=None):
    """تعریف را به کدینگ آمادهٔ ثبت تبدیل کن.

    ``create``: ``None`` یعنی از پرچم تعریف/قاعده پیروی کن، ``True/False`` یعنی اجبار.
    خروجی شامل حساب کل/معین، مرکز هزینه، سه تفصیل، هشدارها و متن پیش‌نمایش است.
    """
    company = company or getattr(definition, 'company', None)
    project = project or getattr(definition, 'project', None)
    ctx = {
        'project': project, 'party': party, 'supplier': supplier, 'contract': contract,
        'employee': employee, 'treasury_entity': treasury_entity,
    }
    warnings = []
    if definition is None:
        return {
            'definition': None, 'general_account': None, 'subsidiary_account': None,
            'cost_center': None, 'auxiliary_1': None, 'auxiliary_2': None, 'auxiliary_3': None,
            'created_auxiliaries': [], 'warnings': ['تعریفی برای این کدینگ یافت نشد.'],
            'preview': '', 'ready': False,
        }

    if project is not None and definition.project_id and definition.project_id != project.pk:
        warnings.append('این تعریف مربوط به پروژهٔ دیگری است و روی پروژهٔ جاری اعمال شد.')
    if project is not None and not definition.project_id and definition.project_type_id \
            and getattr(project, 'project_type_id', None) != definition.project_type_id:
        warnings.append('نوع پروژهٔ جاری با حوزهٔ تعریف هم‌خوان نیست.')

    if not definition.subsidiary_account_id:
        warnings.append('حساب معین این تعریف خالی است؛ ابتدا آن را تعیین کنید.')
    elif definition.general_account_id and not definition.subsidiary_is_under_general():
        warnings.append('حساب معین زیرمجموعهٔ حساب کل انتخابی نیست.')

    expected = _slot_categories(definition)
    rules = {rule.slot: rule for rule in definition.auxiliary_rules.all()}
    auxiliaries, created_names = {}, []
    if create is None:
        create = bool(definition.auto_create_auxiliaries)

    for slot in (1, 2, 3):
        rule = rules.get(slot)
        if rule is None:
            if expected.get(slot) is not None:
                warnings.append(
                    f'حساب معین برای اسلات تفصیل {slot} دستهٔ «{expected[slot].name}» را '
                    'انتظار دارد؛ ولی تفصیلی در تعریف تعیین نشده است.'
                )
            continue
        if rule.category is None and expected.get(slot) is not None:
            rule.category = expected[slot]
        auxiliary, created, warning = ensure_auxiliary(company, rule, ctx, create=create)
        if warning:
            warnings.append(warning)
        if auxiliary is not None:
            auxiliaries[slot] = auxiliary
            if created:
                created_names.append(f'{auxiliary.code} - {auxiliary.name}')

    parts = []
    if definition.general_account_id:
        parts.append(f"کل: {definition.general_account.code} - {definition.general_account.name}")
    if definition.subsidiary_account_id:
        parts.append(f"معین: {definition.subsidiary_account.code} - {definition.subsidiary_account.name}")
    for slot in (1, 2, 3):
        auxiliary = auxiliaries.get(slot)
        if auxiliary is not None:
            parts.append(f'تفصیل {slot}: {auxiliary.code} - {auxiliary.name}')
    if definition.cost_center_id:
        parts.append(f'مرکز هزینه: {definition.cost_center.code} - {definition.cost_center.name}')

    return {
        'definition': {
            'id': definition.pk,
            'code': definition.code,
            'title': definition.title,
            'kind': definition.kind,
            'kind_display': definition.get_kind_display(),
            'scope': definition.scope,
            'scope_label': definition.scope_label,
            'project': definition.project_id,
            'project_type': definition.project_type_id,
        },
        'general_account': _acc(definition.general_account),
        'subsidiary_account': _acc(definition.subsidiary_account),
        'cost_center': _cost_center(definition.cost_center),
        'auxiliary_1': _aux(auxiliaries.get(1)),
        'auxiliary_2': _aux(auxiliaries.get(2)),
        'auxiliary_3': _aux(auxiliaries.get(3)),
        'created_auxiliaries': created_names,
        'warnings': warnings,
        'preview': ' · '.join(parts),
        'ready': bool(definition.subsidiary_account_id),
    }



# ----------------------------------------------------------------------------
# تفضیل‌های یک پروژه
# ----------------------------------------------------------------------------
def project_auxiliary(company, project, category=None, create=True):
    """تفصیل مخصوص یک پروژه را برگردان (و در صورت نبود بساز)."""
    from accounting.coding import next_code
    from accounting.models import AuxiliaryAccount

    existing = AuxiliaryAccount.objects.filter(company=company, project=project).order_by('code').first()
    if existing is not None or not create:
        return existing
    code = f'PRJ-{getattr(project, "code", "") or project.pk}'
    if AuxiliaryAccount.objects.filter(company=company, code=code).exists():
        code = next_code(company, 'auxiliary') or code
    return AuxiliaryAccount.objects.create(
        company=company, code=code[:50], name=(getattr(project, 'name', '') or str(project))[:200],
        aux_type='project', category=category, project=project, is_active=True,
    )


def auxiliaries_of_project(company, project):
    """همهٔ تفصیل‌های مرتبط با یک پروژه (پروژه، قراردادها، طرف‌های قرارداد، تأمین‌کنندگان)."""
    from django.db.models import Q

    from accounting.models import AuxiliaryAccount

    query = Q(project=project)
    try:
        from contracts.models import Contract, ContractParty
        contracts = list(Contract.objects.filter(project=project).values_list('id', flat=True))
        if contracts:
            query |= Q(contract_id__in=contracts)
            parties = list(
                Contract.objects.filter(id__in=contracts).exclude(party__isnull=True)
                .values_list('party_id', flat=True)
            )
            if parties:
                query |= Q(party_id__in=parties)
        else:
            party_ids = list(ContractParty.objects.filter(company=company, contracts__project=project)
                             .values_list('id', flat=True))
            if party_ids:
                query |= Q(party_id__in=party_ids)
    except Exception:  # noqa: BLE001 — نبود جدول قرارداد نباید فهرست را قطع کند
        pass
    try:
        from procurement.models import PurchaseOrder
        suppliers = list(PurchaseOrder.objects.filter(project=project)
                         .exclude(supplier__isnull=True).values_list('supplier_id', flat=True))
        if suppliers:
            query |= Q(supplier_id__in=suppliers)
    except Exception:  # noqa: BLE001
        pass
    return list(
        AuxiliaryAccount.objects.filter(company=company).filter(query)
        .select_related('category', 'project', 'contract', 'party', 'supplier', 'employee')
        .order_by('code')
    )


def project_coding_usage(company, project):
    """معین‌هایی که در ردیف‌های هزینهٔ پروژه استفاده شده‌اند (جمع مبلغ و تعداد)."""
    from django.db.models import Count, Sum

    from projects.cost_models import CostTransactionLine

    rows = (
        CostTransactionLine.objects
        .filter(company=company, transaction__project=project)
        .exclude(account__isnull=True)
        .values('account__code', 'account__name')
        .annotate(lines=Count('id'), amount=Sum('net_amount'))
        .order_by('-amount')
    )
    return [
        {
            'account_code': row['account__code'],
            'account_name': row['account__name'],
            'lines': row['lines'],
            'amount': float(row['amount'] or 0),
        }
        for row in rows
    ]




# ----------------------------------------------------------------------------
# قالب پیشنهادی
# ----------------------------------------------------------------------------
def suggested_rows():
    """ردیف‌های پیشنهادی «قالب اولیه» برای شروع سریع تعاریف."""
    return [
        {'code': code, 'title': title, 'kind': kind, 'description': description}
        for code, title, kind, description in SUGGESTED_DEFINITIONS
    ]


def apply_template(company, rows, project=None, project_type=None):
    """ساخت تعریف‌های انتخاب‌شدهٔ کاربر (ردیف‌های موجود بازنویسی نمی‌شوند)."""
    from django.core.exceptions import ValidationError

    created, skipped, errors = [], [], []
    for row in rows or []:
        code = (row.get('code') or '').strip()
        if not code:
            continue
        if ProjectAccountDefinition.objects.filter(
            company=company, code=code, project=project, project_type=project_type,
        ).exists():
            skipped.append(code)
            continue
        definition = ProjectAccountDefinition(
            company=company, code=code,
            title=(row.get('title') or code)[:200],
            kind=row.get('kind') or 'expense',
            description=row.get('description') or '',
            project=project, project_type=project_type,
            sort_order=int(row.get('sort_order') or 0),
        )
        try:
            definition.full_clean(exclude=['company'])
        except ValidationError as exc:
            errors.append({'code': code, 'errors': exc.message_dict})
            continue
        definition.save()
        for slot in (1, 2, 3):
            ProjectAccountDefinitionAux.objects.create(
                company=company, definition=definition, slot=slot,
                source=ProjectAccountDefinitionAux.Source.NONE, auto_create=True,
            )
        created.append(code)
    return {'created': created, 'skipped': skipped, 'errors': errors}
