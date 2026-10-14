"""ساخت درختوارهٔ کامل حساب‌ها: نوع حساب → گروه → زیرگروه → حساب کل → معین.

هر سطح با **یک پرسمان** خوانده و درخت در حافظه مونتاژ می‌شود (بدون N+1). خروجی برای
صفحهٔ «درخت حساب‌ها» استفاده می‌شود و شامل:

* شمارنده‌های تجمعی هر شاخه (گروه/کل/معین/تفصیلی) برای نشان‌های روی گره‌ها،
* جستجوی هرس‌کننده (`q`) که فقط شاخه‌های منطبق و والدهایشان را نگه می‌دارد،
* نشانهٔ `matched` (تطبیق مستقیم) و `has_match` (تطبیق در زیرشاخه) برای هایلایت/بازکردن،
* محافظ چرخه: دادهٔ خراب (والد چرخه‌ای/یتیم) باعث تکرار یا هنگ نمی‌شود.

ساختار هر گره یکنواخت است (`children`) و فقط `node_type` آن را متمایز می‌کند:
`type` | `group` | `account` (حساب با `kind: general|subsidiary`).
"""
from collections import defaultdict

from django.db.models import Count

from accounting.models import Account, AccountGroup, AccountType, AuxiliaryAccount

NATURE_LABELS = {'debit': 'بدهکار', 'credit': 'بستانکار', 'none': 'مهم نیست'}
NATURE_COLORS = {'debit': '#059669', 'credit': '#dc2626', 'none': '#64748b'}
CATEGORY_LABELS = {
    'asset': 'دارایی', 'liability': 'بدهی', 'equity': 'حقوق مالکانه',
    'revenue': 'درآمد', 'cost_of_sales': 'بهای تمام‌شده', 'expense': 'هزینه',
    'memorandum': 'حساب‌های انتظامی',
}
TOTAL_KEYS = ('groups', 'general', 'subsidiary', 'accounts', 'auxiliary')


def _hit(code, name, term):
    """آیا گره با عبارت جستجو منطبق است؟ (کد یا نام)"""
    if not term:
        return False
    return term in (code or '').lower() or term in (name or '').lower()


def _zero():
    return {key: 0 for key in TOTAL_KEYS}


def _account_node(account, children_map, aux_counts, term, placed, depth=0):
    """گرهٔ حساب (کل/معین/سطح‌های پایین‌تر) با فرزندان بازگشتی."""
    node = {
        'node_type': 'account',
        'id': account.id,
        'code': account.code,
        'full_code': account.full_code,
        'name': account.name,
        'kind': 'general' if account.parent_id is None else 'subsidiary',
        'level': account.level,
        'depth': depth,
        'nature': account.nature,
        'nature_label': NATURE_LABELS.get(account.nature, account.nature or ''),
        'nature_color': NATURE_COLORS.get(account.nature, '#64748b'),
        'type_id': account.account_type_id,
        'type_name': account.account_type.name if account.account_type_id else '',
        'group_id': account.group_id,
        'group_name': account.group.name if account.group_id else '',
        'is_active': bool(getattr(account, 'is_active', True)),
        'is_postable': bool(getattr(account, 'is_postable', True)),
        'coding_locked': bool(getattr(account, 'coding_locked', False)),
        'auxiliary_count': aux_counts.get(account.id, 0),
        'matched': _hit(account.code, account.name, term),
        'children': [],
    }
    for child in children_map.get(account.id, []):
        if child.id in placed:
            continue                     # محافظ چرخه / جلوگیری از تکرار گره
        placed.add(child.id)
        node['children'].append(
            _account_node(child, children_map, aux_counts, term, placed, depth + 1)
        )
    return node


def _group_node(group, sub_map, roots_by_group, children_map, aux_counts, term, placed, depth=0):
    """گرهٔ گروه/زیرگروه با زیرگروه‌ها و حساب‌های کل زیرمجموعه."""
    node = {
        'node_type': 'group',
        'id': group.id,
        'code': group.code,
        'name': group.name,
        'depth': depth,
        'nature': group.nature,
        'nature_label': NATURE_LABELS.get(group.nature, group.nature or ''),
        'nature_color': NATURE_COLORS.get(group.nature, '#64748b'),
        'is_active': bool(getattr(group, 'is_active', True)),
        'coding_locked': bool(getattr(group, 'coding_locked', False)),
        'type_id': group.account_type_id,
        'type_name': group.account_type.name if group.account_type_id else '',
        'is_subgroup': depth > 0,
        'matched': _hit(group.code, group.name, term),
        'children': [],
    }
    for child in sub_map.get(group.id, []):
        node['children'].append(
            _group_node(child, sub_map, roots_by_group, children_map, aux_counts, term,
                        placed, depth + 1)
        )
    for account in roots_by_group.get(group.id, []):
        if account.id in placed:
            continue
        placed.add(account.id)
        node['children'].append(
            _account_node(account, children_map, aux_counts, term, placed)
        )
    return node


def _prune(node, term):
    """هرس شاخه‌های بی‌ربط در جستجو؛ گره منطبق یا دارای تطبیق در زیرشاخه می‌ماند."""
    kept = []
    for child in node.get('children', []):
        if _prune(child, term):
            kept.append(child)
    node['children'] = kept
    node['child_count'] = len(kept)
    node['has_match'] = bool(node.get('matched')) or any(c['has_match'] for c in kept)
    if not term:
        return True
    return node['has_match']


def _finalize(node):
    """محاسبهٔ شمارنده‌های تجمعی هر شاخه (پس از هرس، تا اعداد با نمایش هم‌خوان باشد).

    بازگشتی، شمارندهٔ «کل زیرشاخه با احتساب خودِ گره» را برمی‌گرداند؛ اما روی گره
    `totals` = فقط فرزندان (بدون خودِ گره) نشانده می‌شود تا در نمایش دوباره‌شماری نشود،
    و `subtree` = با احتساب خودِ گره.
    """
    totals = _zero()
    own = _zero()
    for child in node.get('children', []):
        sub = _finalize(child)
        for key in TOTAL_KEYS:
            totals[key] += sub[key]
    if node.get('node_type') == 'group':
        own['groups'] = 1
    elif node.get('node_type') == 'account':
        own['accounts'] = 1
        own['auxiliary'] = node.get('auxiliary_count', 0)
        own['general' if node.get('kind') == 'general' else 'subsidiary'] = 1
    for key in TOTAL_KEYS:
        totals[key] += own[key]
    node['subtree'] = dict(totals)
    node['totals'] = {key: totals[key] - own[key] for key in TOTAL_KEYS}
    return totals




def build_tree_from(account_types, groups, accounts, aux_counts, query=None):
    """مونتاژ درخت از دادهٔ آمادهٔ حافظه (قابل تست بدون دیتابیس).

    :param account_types: انواع حساب
    :param groups: گروه‌ها/زیرگروه‌ها (با `parent_id`)
    :param accounts: حساب‌ها (کل/معین/سطوح پایین‌تر، با `parent_id`)
    :param aux_counts: {account_id: تعداد تفصیلی‌های مرتبط}
    """
    term = (query or '').strip().lower()

    children_map = defaultdict(list)
    for account in accounts:
        children_map[account.parent_id].append(account)

    known_ids = {account.id for account in accounts}
    # ریشه‌ها: حساب‌های بدون والد + حساب‌های «یتیم» (والدشان در همین شرکت نیست)
    roots = [
        account for account in accounts
        if account.parent_id is None or account.parent_id not in known_ids
    ]
    roots_by_group = defaultdict(list)
    for account in roots:
        roots_by_group[account.group_id].append(account)

    group_ids = {group.id for group in groups}
    sub_map = defaultdict(list)
    for group in groups:
        if group.parent_id in group_ids and group.parent_id != group.id:
            sub_map[group.parent_id].append(group)

    placed = set()
    type_nodes = []
    for account_type in account_types:
        node = {
            'node_type': 'type',
            'id': account_type.id,
            'code': account_type.code,
            'name': account_type.name,
            'category': account_type.category,
            'category_label': CATEGORY_LABELS.get(account_type.category, account_type.category),
            'default_nature': account_type.default_nature,
            'default_nature_label': NATURE_LABELS.get(
                account_type.default_nature, account_type.default_nature or ''
            ),
            'matched': _hit(account_type.code, account_type.name, term),
            'children': [],
        }
        for group in groups:
            if group.account_type_id != account_type.id or group.parent_id in group_ids:
                continue
            node['children'].append(
                _group_node(group, sub_map, roots_by_group, children_map, aux_counts,
                            term, placed)
            )
        # حساب‌های بدون گروه، مستقیم زیر همان نوع حساب می‌نشینند
        for account in roots_by_group.get(None, []):
            if account.account_type_id != account_type.id or account.id in placed:
                continue
            placed.add(account.id)
            node['children'].append(
                _account_node(account, children_map, aux_counts, term, placed)
            )
        type_nodes.append(node)

    for node in type_nodes:
        _prune(node, term)
        _finalize(node)
    if term:
        type_nodes = [node for node in type_nodes if node['has_match']]

    summary = {'type_count': len(type_nodes), 'query': query or ''}
    for key in TOTAL_KEYS:
        summary[key] = sum(node['totals'][key] for node in type_nodes)
    summary['ungrouped_count'] = sum(1 for account in roots if account.group_id is None)
    return {
        'query': query or '',
        'types': type_nodes,
        'summary': summary,
    }


def build_account_tree(company, query=None):
    """درخت کامل حساب‌های شرکت (با خواندن داده از دیتابیس): انواع → گروه → زیرگروه → کل → معین."""
    account_types = list(
        AccountType.objects.filter(company=company).order_by('sort_order', 'code')
    )
    groups = list(
        AccountGroup.objects.filter(company=company)
        .select_related('account_type').order_by('code')
    )
    accounts = list(
        Account.objects.filter(company=company)
        .select_related('account_type', 'group', 'parent').order_by('code')
    )
    aux_counts = dict(
        AuxiliaryAccount.objects.filter(company=company, account__isnull=False)
        .values_list('account_id').annotate(n=Count('id'))
    )
    return build_tree_from(account_types, groups, accounts, aux_counts, query)
