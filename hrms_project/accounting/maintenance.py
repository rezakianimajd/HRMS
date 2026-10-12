"""ابزارهای نگهداری دادهٔ حسابداری — رفع «ناهمگونی نوع حساب».

عارضه: در ایمپورت/ثبت قدیمی، نوعِ حساب همیشه «اولین نوع حساب» (کد ۱ = دارایی) ثبت
می‌شد؛ نتیجه این بود که حساب‌های بدهی/هزینه/درآمد هم در خزانهٔ دارایی می‌افتادند و
ترازنامه همه را در کارت دارایی‌ها (به تفکیک نام گروه) نشان می‌داد.

طبقهٔ درست هر رکورد با این ترتیب تعیین می‌شود:

* **گروه حساب** → استنتاج از نام خودِ گروه، سپس نام گروه‌های بالادستی (زنجیرهٔ
  `parent`)، سپس نوعِ فعلی گروه.
* **حساب** → نوع «والد» (حساب بالادستی)، سپس گروه (طبقهٔ درستِ محاسبه‌شده برای گروه)،
  سپس استنتاج از نام خودِ حساب.

هیچ تغییری بدون `apply` انجام نمی‌شود؛ ابتدا گزارش کامل «چه چیزی تغییر می‌کند» برمی‌گردد.
"""
from django.db import transaction

from accounting.models import Account, AccountGroup, AccountType

# ترتیب مهم است: کلیدواژه‌های خاص‌تر زودتر بررسی می‌شوند
# (مثال: «سرمایه‌گذاری» دارایی است، نه حقوق صاحبان سهام؛ «پیش‌خرید» دارایی است نه بهای تمام‌شده)
CATEGORY_KEYWORDS = [
    ('asset', (
        'دارایی', 'نقد', 'بانک', 'صندوق', 'موجودی', 'دریافتنی', 'سرمایه‌گذاری',
        'انبار', 'اموال', 'پیش‌پرداخت', 'پیش‌خرید',
    )),
    ('equity', ('حقوق مالکانه', 'سرمایه', 'اندوخته', 'سود و زیان', 'سود (زیان)', 'سود انباشته', 'زیان انباشته')),
    ('liability', ('بدهی', 'پرداختنی', 'وام', 'تسهیلات', 'حقوق پرداختنی')),
    ('cost_of_sales', ('بهای تمام‌شده', 'بهای تمام شده', 'بهای خرید', 'خرید کالا')),
    ('revenue', ('درآمد', 'فروش')),
    ('expense', ('هزینه', 'سربار')),
]


def infer_category_from_name(name):
    """استنتاج طبقهٔ حساب از نام فارسی (برای رفع ناهمگونی)."""
    if not name:
        return None
    for category, keywords in CATEGORY_KEYWORDS:
        if any(keyword in name for keyword in keywords):
            return category
    return None


def _category_of(account_type):
    return getattr(account_type, 'category', None)


def _types_by_category(company=None):
    """نخستین نوع حساب هر طبقه (بر پایهٔ کد) برای نگاشت طبقه → نوع."""
    qs = AccountType.objects.all()
    if company is not None:
        qs = qs.filter(company=company)
    mapping = {}
    for account_type in qs.order_by('code'):
        mapping.setdefault(account_type.category, account_type)
    return mapping


def _resolve_group(group, types_by_category, cache):
    """طبقهٔ درست یک گروه: نام خود → نام گروه‌های بالادستی → نوع فعلی گروه.

    برمی‌گرداند: ``(نوع هدف یا None, منبع, کد گروهِ مرجع یا '')``
    """
    if group.id in cache:
        return cache[group.id]

    category, source, ref = infer_category_from_name(group.name), 'group_name', group.code
    node, seen, depth = group.parent, {group.id}, 0
    while category is None and node is not None and node.id not in seen and depth < 20:
        seen.add(node.id)
        category = infer_category_from_name(node.name)
        if category is not None:
            source, ref = 'ancestor_name', node.code
            break
        node = node.parent
        depth += 1

    if category is None:
        result = (group.account_type, 'group_type', '')
        cache[group.id] = result
        return result

    target = types_by_category.get(category)
    if target is None:
        result = (group.account_type, 'group_type', '')
    else:
        result = (target, source, ref)
    cache[group.id] = result
    return result


def _row(account, group=None, parent=None):
    return {
        'id': account.id,
        'code': account.code,
        'name': account.name,
        'level': account.level,
        'group_code': (group.code if group else ''),
        'group_name': (group.name if group else ''),
        'parent_code': (parent.code if parent else ''),
        'current_type': account.account_type_id,
        'current_type_name': getattr(account.account_type, 'name', ''),
        'current_category': _category_of(account.account_type) or '',
        'current_nature': account.nature,
        'coding_locked': bool(account.coding_locked),
    }


def _expected_category(account, group_targets, parent_types):
    """طبقهٔ درست حساب با ترتیب «اعتماد» به منابع مختلف.

    اولویت (از مطمئن‌ترین):
    ۰) والد: نوعِ **اصلاح‌شدهٔ** والد (پردازش بالا→پایین)، سپس نام والد
    ۱) نام گروه / نام گروهِ بالادستی — همان چیزی که کاربر در کدینگ می‌بیند
    ۲) نام خودِ حساب
    ۳) نوع فعلی گروه (کم‌اعتمادترین: عارضهٔ «همه دارایی» از همین‌جا می‌آید)
    """
    candidates = []

    parent = account.parent
    if parent is not None:
        parent_type = parent_types.get(parent.id) or parent.account_type
        if _category_of(parent_type):
            candidates.append((0, _category_of(parent_type), 'parent', parent.code))
        parent_name_category = infer_category_from_name(parent.name)
        if parent_name_category:
            candidates.append((0, parent_name_category, 'parent_name', parent.code))

    group = account.group
    if group is not None:
        target, source, ref = group_targets.get(group.id) or (group.account_type, 'group_type', '')
        category = _category_of(target)
        if source in ('group_name', 'ancestor_name') and category:
            candidates.append((1, category, 'group' if source == 'group_name' else source, ref))
        elif category:
            candidates.append((3, category, 'group_type', ''))

    name_category = infer_category_from_name(account.name)
    if name_category:
        candidates.append((2, name_category, 'account_name', ''))

    if not candidates:
        return None, None, ''
    candidates.sort(key=lambda item: item[0])
    _, category, source, ref = candidates[0]
    return category, source, ref


def analyze_account_types(company=None, fix_groups=False, force=False):
    """تحلیل کامل ناهمگونی نوع/ماهیت (بدون تغییر داده).

    در دو مرحله محاسبه می‌شود تا والدهای درست، مبنای فرزندان قرار گیرند:
    ۱) گروه‌ها → ۲) حساب‌ها (والد ← گروه ← نام).

    رکوردهایی که کاربر نوع/ماهیت آن‌ها را **دستی** تعیین کرده (`coding_locked`)
    دست‌نخورده می‌مانند؛ مگر با `force=True` که اصراری برای بازنویسی همه است.
    """
    types_by_category = _types_by_category(company)

    group_qs = AccountGroup.objects.select_related('account_type', 'parent', 'parent__account_type')
    if company is not None:
        group_qs = group_qs.filter(company=company)
    groups = list(group_qs.order_by('code'))

    group_targets = {}
    groups_to_fix = []
    locked_groups = 0
    for group in groups:
        target, source, ref = _resolve_group(group, types_by_category, group_targets)
        if target is None or target.id == group.account_type_id:
            continue
        if group.coding_locked and not force:
            locked_groups += 1
            continue
        groups_to_fix.append({
            'id': group.id,
            'code': group.code,
            'name': group.name,
            'parent_code': group.parent.code if group.parent else '',
            'from_type': group.account_type_id,
            'from_type_name': getattr(group.account_type, 'name', ''),
            'from_category': _category_of(group.account_type) or '',
            'to_type': target.id,
            'to_type_name': target.name,
            'to_category': _category_of(target) or '',
            'source': source,
            'matched_by': ref,
        })

    account_qs = Account.objects.select_related(
        'account_type', 'group', 'group__account_type', 'group__parent',
        'parent', 'parent__account_type',
    )
    if company is not None:
        account_qs = account_qs.filter(company=company)
    accounts = list(account_qs.order_by('level', 'code'))

    parent_types = {}
    changes = []
    nature_changes = []
    by_category = {}
    group_account_counts = {}
    locked_accounts = 0

    for account in accounts:
        if account.group_id:
            group_account_counts[account.group_id] = group_account_counts.get(account.group_id, 0) + 1

        expected, source, ref = _expected_category(account, group_targets, parent_types)
        target_type = types_by_category.get(expected) if expected else None
        if target_type is None:
            target_type = account.account_type
        parent_types[account.id] = target_type

        if account.coding_locked and not force:
            locked_accounts += 1
            continue

        type_changed = target_type is not None and target_type.id != account.account_type_id
        target_nature = None
        if type_changed:
            if account.parent is not None and account.parent.nature not in ('', 'none'):
                target_nature = account.parent.nature
            elif account.group_id and account.group is not None and account.group.nature not in ('', 'none'):
                target_nature = account.group.nature
            elif getattr(target_type, 'default_nature', '') not in ('', 'none'):
                target_nature = target_type.default_nature
        nature_changed = bool(target_nature) and account.nature != target_nature
        if not (type_changed or nature_changed):
            continue

        row = _row(account, group=account.group, parent=account.parent)
        row.update({
            'new_type': target_type.id if type_changed else account.account_type_id,
            'new_type_name': target_type.name if type_changed else account.account_type.name,
            'new_category': (_category_of(target_type) if type_changed
                             else (_category_of(account.account_type) or '')),
            'new_nature': target_nature if nature_changed else account.nature,
            'source': source or '',
            'matched_by': ref,
        })
        if type_changed:
            changes.append(row)
            by_category[row['new_category']] = by_category.get(row['new_category'], 0) + 1
        if nature_changed:
            nature_changes.append(row)

    return {
        'accounts_total': len(accounts),
        'accounts_mismatched': len(changes),
        'nature_mismatched': len(nature_changes),
        'locked_accounts': locked_accounts,
        'locked_groups': locked_groups,
        'force': bool(force),
        'groups_total': len(groups),
        'groups_to_fix': groups_to_fix,
        'groups_report': _groups_report(groups, group_targets, group_account_counts),
        'summary_by_category': by_category,
        'changes': changes[:300],
        'fix_groups': bool(fix_groups),
        'applied': False,
    }


def _groups_report(groups, group_targets, account_counts=None):
    """وضعیت هر گروه: نوع فعلی، طبقهٔ مورد انتظار و منبع تشخیص (برای بازبینی کاربر)."""
    counts = account_counts or {}
    report = []
    for group in groups:
        target, source, ref = group_targets.get(group.id) or (group.account_type, 'group_type', '')
        current_category = _category_of(group.account_type) or ''
        expected_category = _category_of(target) or ''
        report.append({
            'id': group.id,
            'code': group.code,
            'name': group.name,
            'parent_code': group.parent.code if group.parent else '',
            'current_type_name': getattr(group.account_type, 'name', ''),
            'current_category': current_category,
            'expected_category': expected_category,
            'expected_type_name': getattr(target, 'name', '') or '',
            'source': source or '',
            'matched_by': ref,
            'accounts_count': counts.get(group.id, 0),
            'coding_locked': bool(group.coding_locked),
            'ok': bool(expected_category) and expected_category == current_category,
        })
    return report


def sync_account_types(company=None, fix_groups=False, force=False):
    """اعمال همگام‌سازی نوع/ماهیت حساب‌ها + (اختیاری) اصلاح نوع گروه‌ها.

    رکوردهای «دستی» (`coding_locked`) بازنویسی نمی‌شوند؛ مگر `force=True`.
    """
    report = analyze_account_types(company=company, fix_groups=fix_groups, force=force)
    rows = report['changes']

    with transaction.atomic():
        if fix_groups and report['groups_to_fix']:
            for change in report['groups_to_fix']:
                AccountGroup.objects.filter(pk=change['id']).update(account_type_id=change['to_type'])
        if rows:
            accounts = {a.id: a for a in Account.objects.filter(id__in=[r['id'] for r in rows])}
            for row in rows:
                account = accounts.get(row['id'])
                if not account:
                    continue
                account.account_type_id = row['new_type']
                if row.get('new_nature'):
                    account.nature = row['new_nature']
                account.save(update_fields=['account_type', 'nature', 'updated_at'])

    report['applied'] = True
    report['accounts_updated'] = len(rows)
    report['groups_updated'] = len(report['groups_to_fix']) if fix_groups else 0
    return report
