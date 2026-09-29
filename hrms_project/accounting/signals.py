"""اتصال خودکار موجودیت‌ها به حساب‌های تفصیلی."""
from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(post_save, sender='treasury.TreasuryEntity')
def sync_treasury_entity_aux(sender, instance, created, **kwargs):
    from accounting.models import AuxiliaryAccount
    aux_type = 'bank' if instance.entity_type == 'bank' else 'cash'
    AuxiliaryAccount.objects.update_or_create(
        company=instance.company,
        treasury_entity=instance,
        defaults={
            'code': f'{aux_type}-{instance.code}',
            'name': instance.name,
            'aux_type': aux_type,
            'person_type': 'legal',
        },
    )


@receiver(post_save, sender='procurement.Supplier')
def sync_supplier_aux(sender, instance, created, **kwargs):
    from accounting.models import AuxiliaryAccount, AuxiliaryCategory
    cat = AuxiliaryCategory.objects.filter(company=instance.company, source='party').first()
    AuxiliaryAccount.objects.update_or_create(
        company=instance.company,
        supplier=instance,
        defaults={
            'code': f'sup-{instance.code}',
            'name': instance.name,
            'aux_type': 'supplier',
            'category': cat,
            'person_type': 'legal',
        },
    )


@receiver(post_save, sender='contracts.ContractParty')
def sync_party_aux(sender, instance, created, **kwargs):
    from accounting.models import AuxiliaryAccount, AuxiliaryCategory
    cat = AuxiliaryCategory.objects.filter(company=instance.company, source='party').first()
    person_type = getattr(instance, 'person_type', None) or 'legal'
    AuxiliaryAccount.objects.update_or_create(
        company=instance.company,
        party=instance,
        defaults={
            'code': f'pty-{instance.pk}',
            'name': instance.name,
            'aux_type': instance.party_type,
            'category': cat,
            'person_type': person_type,
        },
    )


@receiver(post_save, sender='employees.Employee')
def sync_employee_aux(sender, instance, created, **kwargs):
    from accounting.models import AuxiliaryAccount, AuxiliaryCategory
    cat = AuxiliaryCategory.objects.filter(company=instance.company, source='employee').first()
    name = getattr(instance, 'full_name', None) or str(instance)
    AuxiliaryAccount.objects.update_or_create(
        company=instance.company,
        employee=instance,
        defaults={
            'code': f'emp-{instance.pk}',
            'name': name,
            'aux_type': 'employee',
            'category': cat,
            'person_type': 'natural',
        },
    )