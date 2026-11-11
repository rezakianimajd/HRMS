"""اتصال نامه‌ها به پروندهٔ «طرف حساب» بر اساس نام یکسان.

نامه‌هایی که «طرف حساب»شان فقط با نام (متن آزاد) ثبت شده‌اند در پروندهٔ قرارداد
آن طرف دیده نمی‌شدند؛ این دستور نام را با ``ContractParty`` موجود تطبیق می‌دهد و
``party_account`` (و در صورت لزوم ``sender_party``) را پر می‌کند.
"""
from __future__ import annotations

from collections import defaultdict

from django.core.management.base import BaseCommand
from django.db import transaction

from correspondences.party_link import normalize_party_name


class Command(BaseCommand):
    help = 'اتصال نامه‌های دارای «نام طرف حساب» به پروندهٔ طرف حساب/قرارداد (پیش‌فرض: dry-run)'

    def add_arguments(self, parser):
        parser.add_argument('--schema', default='', help='نام اسکیمای شرکت (مثلاً kpsmi)')
        parser.add_argument('--apply', action='store_true', help='ذخیرهٔ تغییرات (بدون آن فقط گزارش)')
        parser.add_argument('--limit', type=int, default=0, help='حداکثر تعداد نامه در هر مرحله')

    def handle(self, *args, **options):
        from django_tenants.utils import get_tenant_model, schema_context

        schema = str(options.get('schema') or '').strip()
        tenants = get_tenant_model().objects.exclude(schema_name='public')
        if schema:
            tenants = tenants.filter(schema_name=schema)
        if not tenants.exists():
            self.stdout.write(self.style.ERROR('شرکتی با این اسکیما یافت نشد.'))
            return
        for tenant in tenants:
            with schema_context(tenant.schema_name):
                self._link(tenant, apply=options['apply'], limit=options['limit'])

    def _link(self, company, *, apply, limit):
        from contracts.models import ContractParty
        from correspondences.models import Letter

        parties = ContractParty.objects.filter(company=company, is_active=True).values('id', 'name')
        lookup = {}
        for party in parties:
            key = normalize_party_name(party['name'])
            lookup.setdefault(key, party['id'])
        self.stdout.write(f'--- {company.schema_name}: {len(lookup)} طرف حساب فعال')

        party_rows = Letter.objects.filter(party_account__isnull=True).exclude(party_name='')
        if limit:
            party_rows = party_rows[:limit]
        party_updates = defaultdict(list)
        unmatched = 0
        for row in party_rows.values('id', 'party_name'):
            party_id = lookup.get(normalize_party_name(row['party_name']))
            if party_id:
                party_updates[party_id].append(row['id'])
            else:
                unmatched += 1

        sender_rows = Letter.objects.filter(
            sender_party__isnull=True, sender_kind='party',
        ).exclude(sender_name='')
        if limit:
            sender_rows = sender_rows[:limit]
        sender_updates = defaultdict(list)
        for row in sender_rows.values('id', 'sender_name'):
            party_id = lookup.get(normalize_party_name(row['sender_name']))
            if party_id:
                sender_updates[party_id].append(row['id'])

        party_total = sum(len(ids) for ids in party_updates.values())
        sender_total = sum(len(ids) for ids in sender_updates.values())
        self.stdout.write(
            f'    party_account: {party_total} نامه قابل اتصال، '
            f'{unmatched} نام بدون تطبیق؛ sender_party: {sender_total}',
        )
        if not apply:
            self.stdout.write('    (dry-run — برای ذخیره --apply بدهید)')
            return
        with transaction.atomic():
            for party_id, ids in party_updates.items():
                Letter.objects.filter(id__in=ids).update(party_account_id=party_id)
            for party_id, ids in sender_updates.items():
                Letter.objects.filter(id__in=ids).update(sender_party_id=party_id)
        self.stdout.write(self.style.SUCCESS(f'    ذخیره شد: {party_total + sender_total} نامه'))
