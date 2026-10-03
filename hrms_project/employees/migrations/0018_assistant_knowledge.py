from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0002_rolepermission_remove_company_created_on_and_more'),
        ('employees', '0017_is_record_complete'),
    ]

    operations = [
        migrations.CreateModel(
            name='AssistantKnowledge',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='تاریخ ایجاد')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='تاریخ به\u200cروزرسانی')),
                ('is_active', models.BooleanField(default=True, help_text='وضعیت فعال بودن رکورد', verbose_name='فعال')),
                ('title', models.CharField(max_length=200, verbose_name='عنوان')),
                ('content', models.TextField(verbose_name='محتوا')),
                ('category', models.CharField(choices=[('hr_policy', 'آیین\u200cنامه و قوانین'), ('procedure', 'رویه\u200cها و فرایندها'), ('faq', 'پرسش متداول'), ('general', 'عمومی')], default='general', max_length=30, verbose_name='دسته\u200cبندی')),
                ('tags', models.CharField(blank=True, help_text='برچسب\u200cها را با ویرگول جدا کنید', max_length=300, verbose_name='برچسب\u200cها')),
                ('company', models.ForeignKey(db_constraint=False, help_text='شرکت مربوطه', on_delete=django.db.models.deletion.CASCADE, related_name='%(class)s_records', to='core.company', verbose_name='شرکت')),
            ],
            options={
                'verbose_name': 'دانش دستیار',
                'verbose_name_plural': 'دانش دستیار',
                'ordering': ['-updated_at'],
                'indexes': [models.Index(fields=['company', 'category'], name='assist_company_category_idx')],
            },
        ),
    ]
