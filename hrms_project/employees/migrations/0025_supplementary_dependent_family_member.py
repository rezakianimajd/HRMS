# اتصال پوشش‌های بیمهٔ تکمیلی به عضو خانوادهٔ پروندهٔ پرسنلی
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('employees', '0024_backfill_family_from_insurance'),
    ]

    operations = [
        migrations.AddField(
            model_name='supplementaryinsurancedependent',
            name='family_member',
            field=models.ForeignKey(
                blank=True, help_text='عضو خانوادهٔ ثبت‌شده در پروندهٔ پرسنلی که این پوشش بیمه‌ای به او تعلق دارد',
                null=True, on_delete=django.db.models.deletion.CASCADE,
                related_name='insurance_dependents', to='employees.employeefamilymember',
                verbose_name='عضو خانواده',
            ),
        ),
    ]
