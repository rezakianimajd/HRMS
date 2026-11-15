"""انتقال پیوست‌های افراد تحت تکفل بیمه به پروندهٔ خانواده."""
from django.db import migrations


def forwards(apps, schema_editor):
    FamilyMember = apps.get_model('employees', 'EmployeeFamilyMember')
    InsuranceDependent = apps.get_model('employees', 'SupplementaryInsuranceDependent')

    for dependent in InsuranceDependent.objects.select_related('family_member', 'insurance').iterator():
        member = dependent.family_member
        if member is None:
            member = (
                FamilyMember.objects.filter(
                    employee_id=dependent.insurance.employee_id,
                    first_name__iexact=dependent.first_name,
                    last_name__iexact=dependent.last_name or '',
                    relation=dependent.relation,
                ).first()
            )
            if member is not None:
                dependent.family_member = member
                dependent.save(update_fields=['family_member'])
        if member is None:
            continue
        if dependent.attachment and not member.attachment:
            member.attachment.name = dependent.attachment.name
            member.save(update_fields=['attachment'])


def backwards(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('employees', '0027_employeefamilymember_attachment'),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
