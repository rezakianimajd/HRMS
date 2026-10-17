# اسناد سازمانی مرتبط با افراد تحت تکفل
from django.db import migrations, models

DEPENDENT_MARKERS = (
    'تکفل', 'تحت پوشش', 'همسر', 'فرزند', 'فرزندان',
    'dependent', 'spouse', 'child',
)


def mark_dependent_org_documents(apps, schema_editor):
    """پرچم «مربوط به افراد تحت تکفل» را برای اسناد موجودِ مرتبط فعال می‌کند."""
    OrganizationDocument = apps.get_model('documents', 'OrganizationDocument')
    for doc in OrganizationDocument.objects.all().only(
        'id', 'title', 'tags', 'description', 'dependent_related',
    ):
        if doc.dependent_related:
            continue
        haystack = f'{doc.title or ""} {doc.tags or ""} {doc.description or ""}'.lower()
        if any(marker in haystack for marker in DEPENDENT_MARKERS):
            OrganizationDocument.objects.filter(pk=doc.pk).update(dependent_related=True)


class Migration(migrations.Migration):

    dependencies = [
        ('documents', '0006_documenttype_archive_folder'),
    ]

    operations = [
        migrations.AddField(
            model_name='organizationdocument',
            name='dependent_related',
            field=models.BooleanField(
                default=False,
                help_text=(
                    'اگر این سند به یک پرسنل متصل باشد و مربوط به افراد تحت تکفل او باشد، '
                    'در پوشهٔ همان پرسنل ← «افراد تحت تکفل» بایگانی می‌شود.'
                ),
                verbose_name='مربوط به افراد تحت تکفل',
            ),
        ),
        migrations.RunPython(mark_dependent_org_documents, migrations.RunPython.noop),
    ]
