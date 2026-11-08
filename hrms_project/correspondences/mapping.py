"""اعمال نگاشت نام‌ها روی داده‌های مکاتبات — نسخهٔ کارا (بدون اسکن کل جدول).

طرح قبلی برای هر نگاشت **همهٔ** نامه‌ها/ارجاعات را در حافظه می‌خواند و در پایتون
فیلتر می‌کرد (O(نگاشت‌ها × ردیف‌ها)). اکنون مقادیر خام متمایز هر فیلد **یک بار**
خوانده و کش می‌شود و فقط ردیف‌های هم‌نام با ``<field>__in=[...]`` و
``queryset.update(...)`` به‌روزرسانی می‌شوند (بدون load در حافظه).
"""
from django.utils import timezone

from correspondences.alias_purposes import paired_scope, resolve_scopes
from correspondences.matching import normalize_name

# دامنه‌هایی که هر مقصد را تحت تأثیر قرار می‌دهند
EMPLOYEE_SCOPES = {
    'referral': ('referral',),
    'referral_target': (),
    'sender': ('sender',),
    'receiver': ('receiver',),
    'delivery': ('delivery',),
    'counterparty': ('sender', 'receiver'),
    'contact': (),
    'organization': (),
    'subject': (),
    'any': ('referral', 'sender', 'receiver', 'delivery'),
}
PARTY_SCOPES = {
    'referral': (),
    'referral_target': (),
    'sender': ('sender',),
    'receiver': ('receiver',),
    'delivery': (),
    'counterparty': ('sender', 'receiver'),
    'contact': (),
    'organization': (),
    'subject': (),
    'any': ('sender', 'receiver'),
}
CORRESPONDENT_SCOPES = {
    'referral': (),
    'referral_target': (),
    'sender': ('sender',),
    'receiver': ('receiver',),
    'delivery': (),
    'counterparty': ('sender', 'receiver'),
    'contact': ('sender',),
    'organization': (),
    'subject': (),
    'any': ('sender', 'receiver'),
}
ORGANIZATION_SCOPES = {
    'referral': (),
    'referral_target': (),
    'sender': ('sender',),
    'receiver': ('receiver',),
    'delivery': (),
    'counterparty': ('sender', 'receiver'),
    'contact': (),
    'organization': ('sender', 'receiver'),
    'subject': (),
    'any': ('sender', 'receiver'),
}
# نگاشت «موضوع نامه» روی نوع مکاتبهٔ نامه‌های هم‌موضوع اعمال می‌شود
CATEGORY_SCOPES = {
    'referral': (),
    'referral_target': (),
    'sender': (),
    'receiver': (),
    'delivery': (),
    'counterparty': (),
    'contact': (),
    'organization': (),
    'subject': ('subject',),
    'any': ('subject',),
}
LETTER_FIELDS = {
    'sender': ('sender_employee', 'sender_name'),
    'receiver': ('receiver_employee', 'receiver_name'),
    'delivery': ('delivered_by', 'delivered_by_name'),
}


def effective_scopes(alias, scope_map):
    """دامنه‌های مؤثر نگاشت (با در نظر گرفتن «نگاشت دو مسیره»)."""
    return resolve_scopes(
        getattr(alias, 'scope', 'any'),
        getattr(alias, 'bidirectional', False),
        scope_map,
    )


def _matches(value, normalized):
    """مقایسهٔ یک مقدار خام با کلید نرمال‌شده (برای تست‌ها و مصرف‌کننده‌های بیرونی)."""
    return bool(value) and normalize_name(value) == normalized


# ---------------------------------------------------------------------------
# کش مقادیر خام (مشترک در یک batch)
# ---------------------------------------------------------------------------
def _filters_key(filters):
    parts = []
    for key, value in sorted(filters.items()):
        parts.append((key, str(getattr(value, 'pk', value))))
    return tuple(parts)


def _raw_values(index, model, field, filters):
    """مقادیر خام متمایز یک فیلد (کش‌شده) — یک کوئری برای هر ترکیب فیلتر."""
    key = (model._meta.label, field, _filters_key(filters))
    cached = index.get(key)
    if cached is None:
        qs = model.objects.filter(**filters).exclude(**{field: ''})
        cached = [value for value in qs.values_list(field, flat=True).distinct() if value]
        index[key] = cached
    return cached


def _values_matching(index, model, field, filters, normalized):
    """مقادیر خامی که نام نرمال‌شده‌شان با این نگاشت برابر است."""
    if not normalized:
        return []
    return [
        value for value in _raw_values(index, model, field, filters)
        if normalize_name(value) == normalized
    ]


def _apply_employee(alias, dry_run=False, index=None):
    """اتصال ردیف‌های هم‌نام به پرسنل نگاشت‌شده (بدون اسکن کل جدول)."""
    from correspondences.models import Letter, LetterReferral

    index = {} if index is None else index
    employee = alias.employee
    full_name = (getattr(employee, 'full_name', '') or alias.raw_name or '')[:200]
    scopes = effective_scopes(alias, EMPLOYEE_SCOPES)
    normalized = alias.normalized
    company = alias.company
    counts = {'referrals': 0, 'letters': 0}

    if 'referral' in scopes:
        values = _values_matching(
            index, LetterReferral, 'to_name', {'company': company}, normalized,
        )
        if values:
            qs = LetterReferral.objects.filter(company=company, to_name__in=values)
            through = LetterReferral.to_employees.through
            ids = list(qs.values_list('id', flat=True))
            linked = set(
                through.objects.filter(letterreferral_id__in=ids)
                .values_list('letterreferral_id', flat=True),
            ) if ids else set()
            mine = set(
                through.objects.filter(letterreferral_id__in=ids, employee_id=employee.id)
                .values_list('letterreferral_id', flat=True),
            ) if ids else set()
            primary_ids = [
                row_id for row_id in qs.filter(to_employee__isnull=True)
                .values_list('id', flat=True)
                if row_id not in linked
            ]
            primary_set = set(primary_ids)
            extra_ids = [row_id for row_id in ids
                         if row_id not in primary_set and row_id not in mine]
            if not dry_run:
                if primary_ids:
                    LetterReferral.objects.filter(id__in=primary_ids).update(
                        to_employee=employee, to_name=full_name,
                    )
                if extra_ids:
                    through.objects.bulk_create(
                        [through(letterreferral_id=row_id, employee_id=employee.id)
                         for row_id in extra_ids],
                        ignore_conflicts=True, batch_size=300,
                    )
            counts['referrals'] = len(primary_ids) + len(extra_ids)

    for scope in scopes:
        link_field, name_field = LETTER_FIELDS.get(scope, (None, None))
        if not link_field:
            continue
        filters = {'company': company, f'{link_field}__isnull': True}
        values = _values_matching(index, Letter, name_field, filters, normalized)
        if not values:
            continue
        qs = Letter.objects.filter(**filters, **{f'{name_field}__in': values})
        if dry_run:
            counts['letters'] += qs.count()
        else:
            counts['letters'] += qs.update(**{link_field: employee, name_field: full_name})
    return counts


def _apply_party(alias, dry_run=False, index=None):
    """اتصال نامه‌های هم‌نام به طرف حساب قراردادها."""
    from correspondences.models import Letter, LetterReferral

    index = {} if index is None else index
    party = alias.party
    scopes = effective_scopes(alias, PARTY_SCOPES)
    normalized = alias.normalized
    company = alias.company
    counts = {'referrals': 0, 'letters': 0}
    party_name = (party.name or '')[:250]

    if 'sender' in scopes or 'receiver' in scopes:
        # نام آزاد طرف حساب (شرکتی که هنوز در قراردادها ثبت نشده) → «تعمیم» به طرف حساب
        filters = {'company': company, 'party_account__isnull': True}
        values = _values_matching(index, Letter, 'party_name', filters, normalized)
        if values:
            qs = Letter.objects.filter(**filters, party_name__in=values)
            incoming = qs.filter(direction='incoming', sender_party__isnull=True)
            if dry_run:
                counts['letters'] += qs.count()
            else:
                incoming.update(sender_party=party)
                counts['letters'] += qs.update(party_account=party, party_name=party_name)

    if 'sender' in scopes:
        filters = {'company': company, 'sender_party__isnull': True, 'direction': 'incoming'}
        values = _values_matching(index, Letter, 'sender_name', filters, normalized)
        if values:
            qs = Letter.objects.filter(**filters, sender_name__in=values)
            if dry_run:
                counts['letters'] += qs.count()
            else:
                qs.filter(party_account__isnull=True).update(party_account=party)
                counts['letters'] += qs.update(sender_party=party)

        filters = {'company': company, 'party_account__isnull': True}
        values = _values_matching(index, Letter, 'sender_name', filters, normalized)
        if values:
            qs = Letter.objects.filter(**filters, sender_name__in=values)
            if dry_run:
                counts['letters'] += qs.count()
            else:
                counts['letters'] += qs.update(party_account=party)

    if 'receiver' in scopes:
        filters = {'company': company, 'party_account__isnull': True, 'direction': 'outgoing'}
        values = _values_matching(index, Letter, 'receiver_name', filters, normalized)
        if values:
            qs = Letter.objects.filter(**filters, receiver_name__in=values)
            if dry_run:
                counts['letters'] += qs.count()
            else:
                counts['letters'] += qs.update(party_account=party)

    if alias.scope == 'referral_target':
        # گیرندهٔ ارجاع یک طرف حساب خارج از سامانه است → طرف حساب نامه هم ثبت شود
        values = _values_matching(
            index, LetterReferral, 'to_name', {'company': company}, normalized,
        )
        if values:
            letter_ids = LetterReferral.objects.filter(
                company=company, to_name__in=values,
            ).values('letter_id')
            qs = Letter.objects.filter(
                company=company, party_account__isnull=True, id__in=letter_ids,
            )
            if dry_run:
                counts['letters'] += qs.count()
            else:
                counts['letters'] += qs.update(party_account=party)
    return counts


def _apply_correspondent(alias, dry_run=False, index=None):
    """اتصال نامه‌ها به مخاطب تعریف‌شدهٔ مکاتبات."""
    from correspondences.models import Letter

    index = {} if index is None else index
    correspondent = alias.correspondent
    normalized = alias.normalized
    company = alias.company
    scopes = effective_scopes(alias, CORRESPONDENT_SCOPES)
    counts = {'referrals': 0, 'letters': 0}
    field_map = {'sender': 'sender_name', 'receiver': 'receiver_name'}
    for scope in scopes:
        name_field = field_map.get(scope)
        if not name_field:
            continue
        filters = {'company': company, 'correspondent__isnull': True}
        values = _values_matching(index, Letter, name_field, filters, normalized)
        if not values:
            continue
        qs = Letter.objects.filter(**filters, **{f'{name_field}__in': values})
        if dry_run:
            counts['letters'] += qs.count()
        else:
            counts['letters'] += qs.update(correspondent=correspondent)
    return counts


def _apply_organization(alias, dry_run=False, index=None):
    """اتصال سازمان طرف نامه (و سازمان مخاطبین) به سازمان نگاشت‌شده."""
    from correspondences.models import Correspondent, Letter

    index = {} if index is None else index
    organization = alias.organization
    normalized = alias.normalized
    company = alias.company
    scopes = effective_scopes(alias, ORGANIZATION_SCOPES)
    counts = {'referrals': 0, 'letters': 0}

    if 'sender' in scopes:
        filters = {'company': company, 'sender_organization__isnull': True}
        values = _values_matching(index, Letter, 'sender_name', filters, normalized)
        if values:
            qs = Letter.objects.filter(**filters, sender_name__in=values)
            if dry_run:
                counts['letters'] += qs.count()
            else:
                counts['letters'] += qs.update(sender_organization=organization)

    if 'receiver' in scopes:
        filters = {'company': company, 'organization__isnull': True, 'direction': 'outgoing'}
        values = _values_matching(index, Letter, 'receiver_name', filters, normalized)
        if values:
            qs = Letter.objects.filter(**filters, receiver_name__in=values)
            if dry_run:
                counts['letters'] += qs.count()
            else:
                counts['letters'] += qs.update(organization=organization)

    if alias.scope in ('organization', 'contact', 'any'):
        filters = {'company': company, 'organization__isnull': True}
        values = _values_matching(index, Correspondent, 'name', filters, normalized)
        if values:
            qs = Correspondent.objects.filter(**filters, name__in=values)
            if dry_run:
                counts['letters'] += qs.count()
            else:
                counts['letters'] += qs.update(organization=organization)
    return counts


def _apply_category(alias, dry_run=False, index=None):
    """اتصال نامه‌های هم‌موضوع به «نوع مکاتبه» نگاشت‌شده (نگاشت موضوع نامه)."""
    from correspondences.models import Letter

    index = {} if index is None else index
    category = alias.category
    normalized = alias.normalized
    company = alias.company
    scopes = effective_scopes(alias, CATEGORY_SCOPES)
    counts = {'referrals': 0, 'letters': 0}
    if category is None or 'subject' not in scopes:
        return counts

    filters = {'company': company, 'category__isnull': True}
    values = _values_matching(index, Letter, 'subject', filters, normalized)
    if values:
        qs = Letter.objects.filter(**filters, subject__in=values)
        if dry_run:
            counts['letters'] += qs.count()
        else:
            counts['letters'] += qs.update(category=category)
    return counts


def apply_alias(alias, dry_run=False, index=None):
    """یک نگاشت را روی داده‌های موجود اعمال می‌کند و آمار را برمی‌گرداند."""
    handlers = {
        'employee': _apply_employee,
        'party': _apply_party,
        'correspondent': _apply_correspondent,
        'organization': _apply_organization,
        'category': _apply_category,
    }
    handler = handlers.get(alias.target_kind)
    counts = handler(alias, dry_run=dry_run, index=index) if handler else None
    if not isinstance(counts, dict):
        counts = {'referrals': 0, 'letters': 0}
    total = counts.get('referrals', 0) + counts.get('letters', 0)
    if not dry_run and total:
        alias.applied_count = (alias.applied_count or 0) + total
        alias.last_applied_at = timezone.now()
        alias.save(update_fields=['applied_count', 'last_applied_at', 'updated_at'])
    return {
        'alias': alias.id,
        'raw_name': alias.raw_name,
        'target': alias.target_label,
        'target_kind': alias.target_kind,
        'scope': alias.scope,
        'referrals': counts['referrals'],
        'letters': counts['letters'],
        'total': total,
        'dry_run': bool(dry_run),
    }


def _alias_queryset(company):
    from correspondences.models import CorrespondenceNameAlias

    return CorrespondenceNameAlias.objects.filter(
        company=company, is_active=True,
    ).select_related(
        'employee', 'party', 'correspondent', 'organization', 'category',
    ).order_by('order', 'id')


def _run_aliases(aliases, dry_run=False):
    """اعمال چند نگاشت با **یک** کش مشترک از نام‌های خام."""
    index = {}
    results = [apply_alias(alias, dry_run=dry_run, index=index) for alias in aliases]
    return {
        'dry_run': bool(dry_run),
        'aliases': len(results),
        'referrals': sum(item['referrals'] for item in results),
        'letters': sum(item['letters'] for item in results),
        'total': sum(item['total'] for item in results),
        'items': results,
    }


def apply_all(company, dry_run=False, aliases=None):
    """اعمال همهٔ نگاشت‌های فعال شرکت (یک پیمایش مشترک برای کش نام‌ها)."""
    rows = list(aliases) if aliases is not None else list(_alias_queryset(company))
    return _run_aliases(rows, dry_run=dry_run)


def apply_batch(company, alias_ids=None, scope=None, dry_run=False):
    """اعمال گروهی: یک ستون (scope) یا مجموعه‌ای از شناسه‌ها، در **یک** درخواست.

    جایگزین حلقهٔ درخواست‌های فرانت (که برای هر نگاشت یک HTTP call می‌زد).
    """
    qs = _alias_queryset(company)
    if scope:
        qs = qs.filter(scope=scope)
    if alias_ids:
        ids = [int(item) for item in alias_ids if str(item).strip().isdigit()]
        qs = qs.filter(id__in=ids)
    rows = list(qs)
    payload = _run_aliases(rows, dry_run=dry_run)
    payload['scope'] = scope or ''
    return payload


def load_alias_map(company):
    """نگاشت‌های فعال شرکت به‌صورت ``{(scope, normalized): [alias, ...]}``.

    نگاشت‌های «دو مسیره» (مثل فرستنده) زیر دامنهٔ طرف مقابل هم ثبت می‌شوند تا
    هنگام ورود داده‌های اکسل در هر دو جهت پیدا شوند.
    """
    from correspondences.models import CorrespondenceNameAlias

    mapping = {}
    rows = CorrespondenceNameAlias.objects.filter(
        company=company, is_active=True,
    ).select_related(
        'employee', 'party', 'correspondent', 'organization', 'category',
    ).order_by('order', 'id')
    for alias in rows:
        mapping.setdefault((alias.scope, alias.normalized), []).append(alias)
        if alias.bidirectional:
            pair = paired_scope(alias.scope)
            if pair:
                mapping.setdefault((pair, alias.normalized), []).append(alias)
    return mapping


class AliasResolver:
    """تشخیص مقصد نام‌ها هنگام ورود داده‌های اکسل (با پشتیبانی چند مقصد)."""

    def __init__(self, alias_map=None):
        self.alias_map = alias_map or {}

    def aliases_for(self, scope, raw_name):
        normalized = normalize_name(raw_name)
        if not normalized:
            return []
        rows = self.alias_map.get((scope, normalized))
        if rows:
            return list(rows)
        return list(self.alias_map.get(('any', normalized)) or [])

    def alias_for(self, scope, raw_name):
        rows = self.aliases_for(scope, raw_name)
        return rows[0] if rows else None

    def _target_ids(self, kind, scope, raw_name):
        ids = []
        for alias in self.aliases_for(scope, raw_name):
            if alias.target_kind != kind:
                continue
            target = {'employee': alias.employee_id, 'party': alias.party_id,
                      'correspondent': alias.correspondent_id,
                      'organization': getattr(alias, 'organization_id', None)}.get(kind)
            if target and target not in ids:
                ids.append(target)
        return ids

    def _target_id(self, kind, scope, raw_name):
        ids = self._target_ids(kind, scope, raw_name)
        return ids[0] if ids else None

    def employee_ids(self, scope, raw_name):
        """همهٔ پرسنل‌های نگاشت‌شده (اولی = گیرندهٔ اصلی، بقیه = نفرات دیگر)."""
        return self._target_ids('employee', scope, raw_name)

    def employee_id(self, scope, raw_name):
        return self._target_id('employee', scope, raw_name)

    def party_id(self, scope, raw_name):
        return self._target_id('party', scope, raw_name)

    def correspondent_id(self, scope, raw_name):
        return self._target_id('correspondent', scope, raw_name)

    def organization_id(self, scope, raw_name):
        return self._target_id('organization', scope, raw_name)


def build_resolver(company):
    """ساخت resolver برای ورود داده‌ها."""
    return AliasResolver(load_alias_map(company))
