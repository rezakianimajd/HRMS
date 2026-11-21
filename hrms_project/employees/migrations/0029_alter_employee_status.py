"""گسترش وضعیت‌های استخدامی: استعفا، پایان قرارداد، تعلیق، انتقال و ترک خدمت."""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('employees', '0028_move_family_attachments'),
    ]

    operations = [
        migrations.AlterField(
            model_name='employee',
            name='status',
            field=models.CharField(
                choices=[
                    ('active', 'شاغل'),
                    ('leave', 'مرخصی طولانی‌مدت'),
                    ('retired', 'بازنشسته'),
                    ('terminated', 'اخراج'),
                    ('resigned', 'استعفا'),
                    ('contract_ended', 'پایان قرارداد'),
                    ('suspended', 'تعلیق'),
                    ('transferred', 'انتقال به سازمان دیگر'),
                    ('abandoned', 'ترک خدمت'),
                    ('deceased', 'فوت'),
                ],
                default='active',
                max_length=20,
                verbose_name='وضعیت',
            ),
        ),
    ]
