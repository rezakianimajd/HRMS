from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('employees', '0012_contractversion_signature'),
    ]

    operations = [
        migrations.AddField(
            model_name='contractversion',
            name='attraction_allowance',
            field=models.DecimalField(blank=True, decimal_places=0, max_digits=15, null=True, verbose_name='حق جذب (ریال)'),
        ),
        migrations.AddField(
            model_name='contractversion',
            name='children_allowance',
            field=models.DecimalField(blank=True, decimal_places=0, max_digits=15, null=True, verbose_name='حق اولاد (ریال)'),
        ),
        migrations.AddField(
            model_name='contractversion',
            name='family_allowance',
            field=models.DecimalField(blank=True, decimal_places=0, max_digits=15, null=True, verbose_name='حق عائله‌مندی (ریال)'),
        ),
        migrations.AddField(
            model_name='contractversion',
            name='housing_allowance',
            field=models.DecimalField(blank=True, decimal_places=0, max_digits=15, null=True, verbose_name='حق مسکن (ریال)'),
        ),
        migrations.AddField(
            model_name='contractversion',
            name='job_allowance',
            field=models.DecimalField(blank=True, decimal_places=0, max_digits=15, null=True, verbose_name='فوق‌العاده شغل (ریال)'),
        ),
        migrations.AddField(
            model_name='contractversion',
            name='meal_voucher',
            field=models.DecimalField(blank=True, decimal_places=0, max_digits=15, null=True, verbose_name='بن و خواربار (ریال)'),
        ),
        migrations.AddField(
            model_name='contractversion',
            name='travel_cost',
            field=models.DecimalField(blank=True, decimal_places=0, max_digits=15, null=True, verbose_name='ایاب و ذهاب (ریال)'),
        ),
        migrations.AddField(
            model_name='contractversion',
            name='contract_text',
            field=models.TextField(blank=True, verbose_name='متن کامل قرارداد'),
        ),
    ]