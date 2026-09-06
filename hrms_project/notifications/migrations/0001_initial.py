import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('core', '__first__'),
    ]

    operations = [
        migrations.CreateModel(
            name='Notification',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='تاریخ ایجاد')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='تاریخ به\u200cروزرسانی')),
                ('is_active', models.BooleanField(default=True, help_text='وضعیت فعال بودن رکورد', verbose_name='فعال')),
                ('user_id', models.PositiveIntegerField(blank=True, db_index=True, help_text='NULL = اعلان سراسری (مدیران منابع انسانی / سوپرادمین)', null=True, verbose_name='شناسه کاربر گیرنده')),
                ('category', models.CharField(choices=[('leave_request', 'درخواست مرخصی'), ('hr_request', 'درخواست اداری'), ('contract_expiry', 'انقضای قرارداد'), ('document_expiry', 'انقضای مدرک'), ('leave_balance', 'پایان مانده مرخصی')], max_length=30, verbose_name='دسته\u200cبندی')),
                ('priority', models.CharField(choices=[('low', 'کم'), ('normal', 'عادی'), ('high', 'زیاد'), ('urgent', 'فوری')], default='normal', max_length=20, verbose_name='اولویت')),
                ('title', models.CharField(max_length=200, verbose_name='عنوان')),
                ('body', models.TextField(blank=True, verbose_name='متن')),
                ('entity_type', models.CharField(blank=True, max_length=50, verbose_name='نوع موجودیت')),
                ('entity_id', models.PositiveIntegerField(blank=True, null=True, verbose_name='شناسه موجودیت')),
                ('is_read', models.BooleanField(default=False, verbose_name='خوانده شده')),
                ('read_at', models.DateTimeField(blank=True, null=True, verbose_name='زمان خواندن')),
                ('dedup_key', models.CharField(blank=True, max_length=255, verbose_name='کلید یکتاسازی')),
                ('company', models.ForeignKey(db_constraint=False, help_text='شرکت مربوطه', on_delete=django.db.models.deletion.CASCADE, related_name='%(class)s_records', to='core.company', verbose_name='شرکت')),
            ],
            options={
                'verbose_name': 'اعلان',
                'verbose_name_plural': 'اعلان\u200cها',
                'ordering': ['-created_at'],
            },
        ),
    ]