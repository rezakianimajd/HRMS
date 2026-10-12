"""ابزارهای نگهداری دادهٔ حسابداری.

هدف: رفع «ناهمگونی نوع حساب» — رکوردهایی که گروه والدشان «بدهی جاری» است اما
`account_type` آن‌ها «دارایی» ثبت شده (عارضهٔ قدیمی فرم/ایمپورت). نتیجهٔ این
ناهمگونی، انتقال اشتباه آن حساب‌ها به بخش دارایی‌های ترازنامه است.

منطق حل تعارض:
1) اگر حساب «والد» داشته باشد، نوع/ماهیت از والد گرفته می‌شود.
2) در غیر این صورت، نوع «گروه» مبنا است؛ مگر آنکه نام گروه با نوع آن در تعارض
   باشد (مثل گروهِ «بدهی جاری» با نوع «دارایی») که در آن صورت نوع از **نام**
   استنتاج و گروه نیز اصلاح می‌شود.
3) اگر هیچ‌کدام تعیین‌کننده نباشد، رکورد دست‌نخورده می‌ماند.

هیچ تغییری بدون `apply` انجام نمی‌شود؛ ابتدا گزارش «چه چیزی تغییر می‌کند» برمی‌گردد.
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
    ('equity', ('حقوق مالکانه', 'سرمایه', 'اندوخته', 'انباشته', 'سود و زیان')),
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


def _report_row(account, group=None, parent=None):
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
    }


def _resolve_target(account, types_by_category, fix_groups):
    """نوع/ماهیت/منبع صحیح برای یک حساب + تغییرات لازم روی گروه."""
    group = account.group
    parent = account.parent
    group_change = None

    if parent is not None and parent.account_type_id:
        return parent.account_type, parent.nature, 'parent', group_change

    if group is not None and group.account_type_id:
        name_category = infer_category_from_name(group.name)
        group_category = _category_of(group.account_type)
        if name_category and name_category != group_category:
            target = types_by_category.get(name_category)
            if target is not None:
                if fix_groups:
                    group_change = {
                        'id': group.id, 'code': group.code, 'name': group.name,
                        'from_type': group.account_type_id,
                        'from_type_name': group.account_type.name,
                        'from_category': group_category or '',
                        'to_type': target.id, 'to_type_name': target.name,
                        'to_category': name_category,
                    }
                return target, group.nature, 'group_name', group_change
        return group.account_type, group.nature, 'group', group_change

    return None, None, None, group_change


def analyze_account_types(company=None, fix_groups=False):
    """تحلیل ناهمگونی نوع حساب‌ها (بدون تغییر داده)."""
    types_by_category = {}
    type_qs = AccountType.objects.all()
    if company is not None:
        type_qs = type_qs.filter(company=company)
    for account_type in type_qs.order_by('code'):
        types_by_category.setdefault(account_type.category, account_type)

    account_qs = Account.objects.select_related(
        'account_type', 'group', 'group__account_type', 'parent', 'parent__account_type',
    )
    if company is not None:
        account_qs = account_qs.filter(company=company)

    changes = []
    nature_changes = []
    group_changes = {}
    by_category = {}

    for account in account_qs.order_by('code'):
        target_type, target_nature, source, group_change = _resolve_target(
            account, types_by_category, fix_groups,
        )
        if target_type is None:
            continue
        if group_change:
            group_changes[group_change['id']] = group_change

        type_changed = account.account_type_id != target_type.id
        nature_changed = bool(target_nature) and account.nature != target_nature
        if not (type_changed or nature_changed):
            continue

        row = _report_row(account, group=account.group, parent=account.parent)
        row.update({
            'new_type': target_type.id if type_changed else account.account_type_id,
            'new_type_name': target_type.name if type_changed else account.account_type.name,
            'new_category': target_type.category if type_changed else (
                _category_of(account.account_type) or ''
            ),
            'new_nature': target_nature if nature_changed else account.nature,
            'source': source,
        })
        if type_changed:
            changes.append(row)
            by_category[target_type.category] = by_category.get(target_type.category, 0) + 1
        if nature_changed:
            nature_changes.append(row)

    return {
        'accounts_total': account_qs.count(),
        'accounts_mismatched': len(changes),
        'nature_mismatched': len(nature_changes),
        'groups_to_fix': list(group_changes.values()),
        'summary_by_category': by_category,
        'changes': changes[:300],
        'fix_groups': bool(fix_groups),
        'applied': False,
    }


def sync_account_types(company=None, fix_groups=False):
    """اعمال همگام‌سازی نوع/ماهیت حساب‌ها + (اختیاری) اصلاح نوع گروه‌ها."""
    report = analyze_account_types(company=company, fix_groups=fix_groups)
    rows = report['changes']

    with transaction.atomic():
        if fix_groups and report['groups_to_fix']:
            for change in report['groups_to_fix']:
                AccountGroup.objects.filter(pk=change['id']).update(
                    account_type_id=change['to_type'],
                )
        if rows:
            accounts = {acc.id: acc for acc in Account.objects.filter(id__in=[r['id'] for r in rows])}
            for row in rows:
                account = accounts.get(row['id'])
                if not account:
                    continue
                account.account_type_id = row['new_type']
                account.nature = row['new_nature'] or account.nature
                account.save(update_fields=['account_type', 'nature', 'updated_at'])

    report['applied'] = True
    report['accounts_updated'] = len(rows)
    report['groups_updated'] = len(report['groups_to_fix']) if fix_groups else 0
    return report
