from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('notifications', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='BaleTemplate',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='تاریخ ایجاد')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='تاریخ به\u200cروزرسانی')),
                ('is_active', models.BooleanField(default=True, help_text='وضعیت فعال بودن رکورد', verbose_name='فعال')),
                ('title', models.CharField(max_length=200, verbose_name='عنوان قالب')),
                ('event_type', models.CharField(choices=[('birthday', 'تولد'), ('benefits', 'مزایا'), ('payslip', 'فیش حقوقی'), ('eid', 'اعیاد'), ('announcement', 'اطلاعیه'), ('other', 'سایر')], default='announcement', max_length=20, verbose_name='نوع مناسبت')),
                ('text', models.TextField(verbose_name='متن پیام')),
                ('is_default', models.BooleanField(default=False, verbose_name='پیش\u200cفرض')),
                ('company', models.ForeignKey(db_constraint=False, help_text='شرکت مربوطه', on_delete=django.db.models.deletion.CASCADE, related_name='%(class)s_records', to='core.company', verbose_name='شرکت')),
            ],
            options={
                'verbose_name': 'قالب پیام بله',
                'verbose_name_plural': 'قالب\u200cهای پیام بله',
                'ordering': ['event_type', 'title'],
            },
        ),
    ]