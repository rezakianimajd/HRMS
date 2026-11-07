"""اعمال نگاشت نام‌ها روی داده‌های مکاتبات و استفاده از آن‌ها در ورود اکسل."""
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
    return bool(value) and normalize_name(value) == normalized


def _apply_employee(alias, dry_run=False):
    """اتصال ردیف‌های هم‌نام به پرسنل نگاشت‌شده."""
    from correspondences.models import Letter, LetterReferral

    employee = alias.employee
    full_name = getattr(employee, 'full_name', '') or alias.raw_name
    scopes = effective_scopes(alias, EMPLOYEE_SCOPES)
    normalized = alias.normalized
    company = alias.company
    counts = {'referrals': 0, 'letters': 0}

    if 'referral' in scopes:
        rows = list(
            LetterReferral.objects.filter(company=company).exclude(to_name='').prefetch_related(
                'to_employees',
            ),
        )
        matched = [row for row in rows if _matches(row.to_name, normalized)]
        primary, extras = [], []
        for row in matched:
            existing = set(row.to_employees.values_list('id', flat=True))
            if row.to_employee_id == employee.id or employee.id in existing:
                continue
            if row.to_employee_id or existing:
                # ارجاع قبلاً به یک/چند نفر وصل شده؛ این مقصد «نفر بعدی» است
                extras.append(row)
            else:
                primary.append(row)
        if not dry_run:
            if primary:
                for row in primary:
                    row.to_employee = employee
                    row.to_name = full_name[:200]
                LetterReferral.objects.bulk_update(primary, ['to_employee', 'to_name'],
                                                   batch_size=300)
            if extras:
                through = LetterReferral.to_employees.through
                through.objects.bulk_create(
                    [through(letterreferral_id=row.id, employee_id=employee.id)
                     for row in extras],
                    ignore_conflicts=True, batch_size=300,
                )
        counts['referrals'] = len(primary) + len(extras)

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
    scopes = effective_scopes(alias, PARTY_SCOPES)
    normalized = alias.normalized
    company = alias.company
    counts = {'referrals': 0, 'letters': 0}

    if 'sender' in scopes or 'receiver' in scopes:
        # نام آزاد طرف حساب (شرکتی که هنوز در قراردادها ثبت نشده) → «تعمیم» به طرف حساب
        rows = list(
            Letter.objects.filter(
                company=company, party_account__isnull=True,
            ).exclude(party_name=''),
        )
        matched = [row for row in rows if _matches(row.party_name, normalized)]
        if matched and not dry_run:
            for row in matched:
                row.party_account = party
                if row.direction == 'incoming' and not row.sender_party_id:
                    row.sender_party = party
                row.party_name = party.name[:250]
            Letter.objects.bulk_update(
                matched, ['party_account', 'sender_party', 'party_name'], batch_size=300,
            )
        counts['letters'] += len(matched)

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

    if alias.scope == 'referral_target':
        # گیرندهٔ ارجاع یک طرف حساب خارج از سامانه است → طرف حساب نامه هم ثبت شود
        from correspondences.models import LetterReferral

        referral_rows = LetterReferral.objects.filter(
            company=company,
        ).exclude(to_name='').values_list('letter_id', 'to_name')
        matching_letters = {
            letter_id for letter_id, to_name in referral_rows
            if _matches(to_name, normalized)
        }
        if matching_letters:
            rows = list(
                Letter.objects.filter(
                    company=company, party_account__isnull=True,
                    id__in=matching_letters,
                ),
            )
            if rows and not dry_run:
                for row in rows:
                    row.party_account = party
                Letter.objects.bulk_update(rows, ['party_account'], batch_size=300)
            counts['letters'] += len(rows)
    return counts


def _apply_correspondent(alias, dry_run=False):
    """اتصال نامه‌ها به مخاطب تعریف‌شدهٔ مکاتبات."""
    from correspondences.models import Letter

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
        rows = list(
            Letter.objects.filter(
                company=company, correspondent__isnull=True,
            ).exclude(**{name_field: ''}),
        )
        matched = [row for row in rows if _matches(getattr(row, name_field), normalized)]
        if matched and not dry_run:
            for row in matched:
                row.correspondent = correspondent
            Letter.objects.bulk_update(matched, ['correspondent'], batch_size=300)
        counts['letters'] += len(matched)
    return counts


def _apply_organization(alias, dry_run=False):
    """اتصال سازمان طرف نامه (و سازمان مخاطبین) به سازمان نگاشت‌شده."""
    from correspondences.models import Correspondent, Letter

    organization = alias.organization
    normalized = alias.normalized
    company = alias.company
    scopes = effective_scopes(alias, ORGANIZATION_SCOPES)
    counts = {'referrals': 0, 'letters': 0}

    if 'sender' in scopes:
        rows = list(
            Letter.objects.filter(
                company=company, sender_organization__isnull=True,
            ).exclude(sender_name=''),
        )
        matched = [row for row in rows if _matches(row.sender_name, normalized)]
        if matched and not dry_run:
            for row in matched:
                row.sender_organization = organization
            Letter.objects.bulk_update(matched, ['sender_organization'], batch_size=300)
        counts['letters'] += len(matched)

    if 'receiver' in scopes:
        rows = list(
            Letter.objects.filter(
                company=company, organization__isnull=True, direction='outgoing',
            ).exclude(receiver_name=''),
        )
        matched = [row for row in rows if _matches(row.receiver_name, normalized)]
        if matched and not dry_run:
            for row in matched:
                row.organization = organization
            Letter.objects.bulk_update(matched, ['organization'], batch_size=300)
        counts['letters'] += len(matched)

    if alias.scope in ('organization', 'contact', 'any'):
        rows = list(
            Correspondent.objects.filter(company=company, organization__isnull=True),
        )
        matched = [row for row in rows if _matches(row.name, normalized)]
        if matched and not dry_run:
            for row in matched:
                row.organization = organization
            Correspondent.objects.bulk_update(matched, ['organization'], batch_size=300)
        counts['letters'] += len(matched)
    return counts


def _apply_category(alias, dry_run=False):
    """اتصال نامه‌های هم‌موضوع به «نوع مکاتبه» نگاشت‌شده (نگاشت موضوع نامه)."""
    from correspondences.models import Letter

    category = alias.category
    normalized = alias.normalized
    company = alias.company
    scopes = effective_scopes(alias, CATEGORY_SCOPES)
    counts = {'referrals': 0, 'letters': 0}
    if category is None or 'subject' not in scopes:
        return counts

    rows = list(
        Letter.objects.filter(company=company, category__isnull=True).exclude(subject=''),
    )
    matched = [row for row in rows if _matches(row.subject, normalized)]
    if matched and not dry_run:
        for row in matched:
            row.category = category
        Letter.objects.bulk_update(matched, ['category'], batch_size=300)
    counts['letters'] += len(matched)
    return counts


def apply_alias(alias, dry_run=False):
    """یک نگاشت را روی داده‌های موجود اعمال می‌کند و آمار را برمی‌گرداند."""
    handlers = {
        'employee': _apply_employee,
        'party': _apply_party,
        'correspondent': _apply_correspondent,
        'organization': _apply_organization,
        'category': _apply_category,
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
        ).select_related('employee', 'party', 'correspondent', 'organization', 'category')
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
