import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0003_userprofile_employee_id'),
    ]

    operations = [
        migrations.CreateModel(
            name='Application',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('slug', models.SlugField(max_length=60, unique=True, verbose_name='شناسه')),
                ('title', models.CharField(max_length=120, verbose_name='عنوان')),
                ('description', models.TextField(blank=True, verbose_name='توضیح')),
                ('icon', models.CharField(blank=True, max_length=80, verbose_name='آیکون')),
                ('color', models.CharField(blank=True, default='#6366f1', max_length=20, verbose_name='رنگ')),
                ('order', models.PositiveIntegerField(default=0, verbose_name='ترتیب')),
                ('is_active', models.BooleanField(default=True, verbose_name='فعال')),
            ],
            options={
                'verbose_name': 'سامانه',
                'verbose_name_plural': 'سامانه\u200cها',
                'ordering': ['order', 'title'],
            },
        ),
        migrations.AddField(
            model_name='userprofile',
            name='applications',
            field=models.ManyToManyField(blank=True, related_name='users', to='core.application', verbose_name='سامانه\u200cهای مجاز'),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='current_application',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='active_users', to='core.application', verbose_name='سامانهٔ جاری'),
        ),
    ]