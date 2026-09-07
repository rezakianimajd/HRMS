from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('settings_app', '0004_companyprofile_notification_channels'),
    ]

    operations = [
        migrations.CreateModel(
            name='BaleContact',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='تاریخ ایجاد')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='تاریخ به\u200cروزرسانی')),
                ('is_active', models.BooleanField(default=True, help_text='وضعیت فعال بودن رکورد', verbose_name='فعال')),
                ('name', models.CharField(max_length=200, verbose_name='نام / عنوان')),
                ('chat_id', models.CharField(max_length=100, verbose_name='شناسه گفتگوی بله (chat_id)')),
                ('category', models.CharField(blank=True, help_text='مثلاً: مالی، فنی، پشتیبانی', max_length=100, verbose_name='دسته\u200cبندی')),
                ('note', models.TextField(blank=True, verbose_name='یادداشت')),
                ('company', models.ForeignKey(db_constraint=False, help_text='شرکت مربوطه', on_delete=django.db.models.deletion.CASCADE, related_name='%(class)s_records', to='core.company', verbose_name='شرکت')),
            ],
            options={
                'verbose_name': 'مخاطب بله',
                'verbose_name_plural': 'مخاطبان بله',
                'ordering': ['category', 'name'],
            },
        ),
    ]