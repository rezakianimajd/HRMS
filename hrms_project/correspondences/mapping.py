"""اعمال نگاشت نام‌ها روی داده‌های مکاتبات و استفاده از آن‌ها در ورود اکسل."""
from django.utils import timezone

from correspondences.matching import normalize_name

# دامنه‌هایی که هر مقصد را تحت تأثیر قرار می‌دهند
EMPLOYEE_SCOPES = {
    'referral': ('referral',),
    'sender': ('sender',),
    'receiver': ('receiver',),
    'delivery': ('delivery',),
    'counterparty': ('sender', 'receiver'),
    'any': ('referral', 'sender', 'receiver', 'delivery'),
}
PARTY_SCOPES = {
    'referral': (),
    'sender': ('sender',),
    'receiver': ('receiver',),
    'delivery': (),
    'counterparty': ('sender', 'receiver'),
    'any': ('sender', 'receiver'),
}
LETTER_FIELDS = {
    'sender': ('sender_employee', 'sender_name'),
    'receiver': ('receiver_employee', 'receiver_name'),
    'delivery': ('delivered_by', 'delivered_by_name'),
}


def _matches(value, normalized):
    return bool(value) and normalize_name(value) == normalized


def _apply_employee(alias, dry_run=False):
    """اتصال ردیف‌های هم‌نام به پرسنل نگاشت‌شده."""
    from correspondences.models import Letter, LetterReferral

    employee = alias.employee
    full_name = getattr(employee, 'full_name', '') or alias.raw_name
    scopes = EMPLOYEE_SCOPES.get(alias.scope, EMPLOYEE_SCOPES['any'])
    normalized = alias.normalized
    company = alias.company
    counts = {'referrals': 0, 'letters': 0}

    if 'referral' in scopes:
        rows = list(
            LetterReferral.objects.filter(
                company=company, to_employee__isnull=True,
            ).exclude(to_name=''),
        )
        matched = [row for row in rows if _matches(row.to_name, normalized)]
        if matched and not dry_run:
            for row in matched:
                row.to_employee = employee
                row.to_name = full_name[:200]
            LetterReferral.objects.bulk_update(matched, ['to_employee', 'to_name'],
                                               batch_size=300)
        counts['referrals'] = len(matched)

    for scope in scopes:
        link_field, name_field = LETTER_FIELDS.get(scope, (None, None))
        if not link_field:
            continue
        rows = list(
            Letter.objects.filter(
                company=company, **{f'{link_field}__isnull': True},
            ).exclude(**{name_field: ''}),
        )
        matched = [row for row in rows if _matches(getattr(row, name_field), normalized)]
        if matched and not dry_run:
            for row in matched:
                setattr(row, link_field, employee)
                setattr(row, name_field, full_name[:200])
            Letter.objects.bulk_update(matched, [link_field, name_field], batch_size=300)
        counts['letters'] += len(matched)
    return counts


def _apply_party(alias, dry_run=False):
    """اتصال نامه‌های هم‌نام به طرف حساب قراردادها."""
    from correspondences.models import Letter

    party = alias.party
    scopes = PARTY_SCOPES.get(alias.scope, PARTY_SCOPES['any'])
    normalized = alias.normalized
    company = alias.company
    counts = {'referrals': 0, 'letters': 0}

    if 'sender' in scopes:
        rows = list(
            Letter.objects.filter(
                company=company, sender_party__isnull=True, direction='incoming',
            ).exclude(sender_name=''),
        )
        matched = [row for row in rows if _matches(row.sender_name, normalized)]
        if matched and not dry_run:
            for row in matched:
                row.sender_party = party
                if not row.party_account_id:
                    row.party_account = party
            Letter.objects.bulk_update(matched, ['sender_party', 'party_account'],
                                       batch_size=300)
        counts['letters'] += len(matched)

        rows = list(
            Letter.objects.filter(
                company=company, party_account__isnull=True,
            ).exclude(sender_name=''),
        )
        matched = [row for row in rows if _matches(row.sender_name, normalized)]
        if matched and not dry_run:
            for row in matched:
                row.party_account = party
            Letter.objects.bulk_update(matched, ['party_account'], batch_size=300)
        counts['letters'] += len(matched)

    if 'receiver' in scopes:
        rows = list(
            Letter.objects.filter(
                company=company, party_account__isnull=True, direction='outgoing',
            ).exclude(receiver_name=''),
        )
        matched = [row for row in rows if _matches(row.receiver_name, normalized)]
        if matched and not dry_run:
            for row in matched:
                row.party_account = party
            Letter.objects.bulk_update(matched, ['party_account'], batch_size=300)
        counts['letters'] += len(matched)
    return counts


def _apply_correspondent(alias, dry_run=False):
    """اتصال نامه‌ها به مخاطب تعریف‌شدهٔ مکاتبات."""
    from correspondences.models import Letter

    correspondent = alias.correspondent
    normalized = alias.normalized
    company = alias.company
    rows = list(
        Letter.objects.filter(company=company, correspondent__isnull=True).exclude(
            sender_name='',
        ),
    )
    matched = [row for row in rows if _matches(row.sender_name, normalized)]
    if matched and not dry_run:
        for row in matched:
            row.correspondent = correspondent
        Letter.objects.bulk_update(matched, ['correspondent'], batch_size=300)
    return {'referrals': 0, 'letters': len(matched)}



def apply_alias(alias, dry_run=False):
    """یک نگاشت را روی داده‌های موجود اعمال می‌کند و آمار را برمی‌گرداند."""
    handlers = {
        'employee': _apply_employee,
        'party': _apply_party,
        'correspondent': _apply_correspondent,
    }
    handler = handlers.get(alias.target_kind)
    counts = handler(alias, dry_run=dry_run) if handler else None
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


def apply_all(company, dry_run=False, aliases=None):
    """اعمال همهٔ نگاشت‌های فعال شرکت."""
    from correspondences.models import CorrespondenceNameAlias

    rows = list(aliases) if aliases is not None else list(
        CorrespondenceNameAlias.objects.filter(
            company=company, is_active=True,
        ).select_related('employee', 'party', 'correspondent')
    )
    results = [apply_alias(alias, dry_run=dry_run) for alias in rows]
    return {
        'dry_run': bool(dry_run),
        'aliases': len(results),
        'referrals': sum(item['referrals'] for item in results),
        'letters': sum(item['letters'] for item in results),
        'total': sum(item['total'] for item in results),
        'items': results,
    }


def load_alias_map(company):
    """نگاشت‌های فعال شرکت به‌صورت ``{(scope, normalized): alias}``."""
    from correspondences.models import CorrespondenceNameAlias

    mapping = {}
    rows = CorrespondenceNameAlias.objects.filter(
        company=company, is_active=True,
    ).select_related('employee', 'party', 'correspondent')
    for alias in rows:
        mapping[(alias.scope, alias.normalized)] = alias
    return mapping


class AliasResolver:
    """تشخیص مقصد نام‌ها هنگام ورود داده‌های اکسل."""

    def __init__(self, alias_map=None):
        self.alias_map = alias_map or {}

    def alias_for(self, scope, raw_name):
        normalized = normalize_name(raw_name)
        if not normalized:
            return None
        return (self.alias_map.get((scope, normalized))
                or self.alias_map.get(('any', normalized)))

    def _target_id(self, kind, scope, raw_name):
        alias = self.alias_for(scope, raw_name)
        if not alias or alias.target_kind != kind:
            return None
        return {'employee': alias.employee_id, 'party': alias.party_id,
                'correspondent': alias.correspondent_id}.get(kind)

    def employee_id(self, scope, raw_name):
        return self._target_id('employee', scope, raw_name)

    def party_id(self, scope, raw_name):
        return self._target_id('party', scope, raw_name)

    def correspondent_id(self, scope, raw_name):
        return self._target_id('correspondent', scope, raw_name)


def build_resolver(company):
    """ساخت resolver برای ورود داده‌ها."""
    return AliasResolver(load_alias_map(company))
