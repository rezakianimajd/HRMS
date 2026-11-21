import json
from datetime import datetime
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django_tenants.utils import get_tenant_model, schema_context

from contracts.guarantee_normalization import normalize_contract_guarantees
from contracts.models import Contract, Guarantee


class Command(BaseCommand):
    help = (
        'Normalize legacy contract guarantee fields and guarantee links. '
        'Defaults to dry-run; pass --apply to write changes.'
    )

    def add_arguments(self, parser):
        parser.add_argument('--schema', default='kpsmi', help='Tenant schema name')
        parser.add_argument('--apply', action='store_true', help='Write the repairs')
        parser.add_argument('--limit', type=int, default=0, help='Limit contracts for inspection')

    def handle(self, *args, **options):
        schema = options['schema']
        apply_changes = options['apply']
        limit = options['limit']
        try:
            tenant = get_tenant_model().objects.get(schema_name=schema)
        except get_tenant_model().DoesNotExist as exc:
            raise CommandError(f'Tenant schema not found: {schema}') from exc
        if not tenant.is_active:
            raise CommandError(f'Tenant is not active: {schema}')

        stats = {
            'contracts': 0, 'changed': 0, 'legacy_cleared': 0,
            'guarantees_linked': 0, 'items_filled': 0,
        }
        details = []
        backup_rows = []
        with schema_context(schema):
            queryset = Contract.objects.prefetch_related('guarantees').order_by('id')
            if limit:
                queryset = queryset[:limit]
            for contract in queryset:
                stats['contracts'] += 1
                guarantees = list(contract.guarantees.all())
                result = normalize_contract_guarantees(contract, guarantees=guarantees)
                if not result['changes']:
                    continue
                stats['changed'] += 1
                if 'legacy_primary_cleared' in result['changes']:
                    stats['legacy_cleared'] += 1
                if result['links']:
                    stats['guarantees_linked'] += len(result['links'])
                stats['items_filled'] += sum(
                    1 for change in result['changes'] if change.startswith('item_') and change.endswith('_amount_filled')
                )
                details.append((contract.id, contract.number, result['changes']))
                backup_rows.append({
                    'contract_id': contract.id,
                    'number': contract.number,
                    'guarantee_type': contract.guarantee_type,
                    'guarantee_amount': contract.guarantee_amount,
                    'guarantee_items': contract.guarantee_items,
                    'guarantees': [
                        {'id': guarantee.id, 'contract_guarantee_index': guarantee.contract_guarantee_index}
                        for guarantee in guarantees
                    ],
                })
                if not apply_changes:
                    continue
                with transaction.atomic():
                    update_fields = []
                    if result['items'] != (contract.guarantee_items or []):
                        contract.guarantee_items = result['items']
                        update_fields.append('guarantee_items')
                    if contract.guarantee_type != result['guarantee_type']:
                        contract.guarantee_type = result['guarantee_type']
                        update_fields.append('guarantee_type')
                    if contract.guarantee_amount != result['guarantee_amount']:
                        contract.guarantee_amount = result['guarantee_amount']
                        update_fields.append('guarantee_amount')
                    if update_fields:
                        contract.save(update_fields=update_fields + ['updated_at'])
                    for guarantee in guarantees:
                        target = result['links'].get(guarantee.id)
                        if target is not None and guarantee.contract_guarantee_index != target:
                            Guarantee.objects.filter(pk=guarantee.pk).update(
                                contract_guarantee_index=target,
                            )

        if apply_changes and backup_rows:
            stamp = datetime.now().strftime('%Y%m%d%H%M%S')
            backup_path = Path(f'/var/tmp/guarantee-normalize-backup-{stamp}.json')
            backup_path.write_text(
                json.dumps(backup_rows, ensure_ascii=False, indent=2, default=str),
                encoding='utf-8',
            )
            self.stdout.write(f'  backup: {backup_path}')

        mode = 'APPLIED' if apply_changes else 'DRY-RUN'
        self.stdout.write(self.style.SUCCESS(f'{mode} {schema}: {stats}'))
        for contract_id, number, changes in details[:100]:
            self.stdout.write(f'  {contract_id} {number}: {", ".join(changes)}')
        if not apply_changes:
            self.stdout.write('  (pass --apply to persist these changes)')
