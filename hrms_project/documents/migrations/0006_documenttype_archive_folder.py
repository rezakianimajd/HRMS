# Generated for dependent-documents archive folder (افراد تحت تکفل)
from django.db import migrations, models


DEPENDENTS_FOLDER = 'افراد تحت تکفل'
DEPENDENT_MARKERS = (
    'تکفل', 'تحت پوشش', 'همسر', 'فرزند', 'فرزندان',
    'dependent', 'spouse', 'child',
)


def mark_dependent_document_types(apps, schema_editor):
    """برای انواع مدرک مرتبط با افراد تحت تکفل، زیرپوشهٔ استاندارد را ست می‌کند."""
    DocumentType = apps.get_model('documents', 'DocumentType')
    for doc_type in DocumentType.objects.all().only('id', 'name', 'code', 'archive_folder'):
        if (doc_type.archive_folder or '').strip():
            continue
        haystack = f'{doc_type.name or ""} {doc_type.code or ""}'.lower()
        if any(marker in haystack for marker in DEPENDENT_MARKERS):
            DocumentType.objects.filter(pk=doc_type.pk).update(
                archive_folder=DEPENDENTS_FOLDER,
            )


class Migration(migrations.Migration):

    dependencies = [
        ('documents', '0005_alter_organizationdocument_file'),
    ]

    operations = [
        migrations.AddField(
            model_name='documenttype',
            name='archive_folder',
            field=models.CharField(
                blank=True, default='', max_length=120,
                help_text=(
                    'نام زیرپوشه در پوشهٔ هر پرسنل؛ مثلاً «افراد تحت تکفل». '
                    'اگر خالی بماند و نام/کد مدرک به افراد تحت تکفل اشاره کند، خودکار انتخاب می‌شود.'
                ),
                verbose_name='زیرپوشهٔ بایگانی',
            ),
        ),
        migrations.RunPython(mark_dependent_document_types, migrations.RunPython.noop),
    ]
