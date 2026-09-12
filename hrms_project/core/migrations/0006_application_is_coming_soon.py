from django.db import migrations, models


def seed_catalog(apps, schema_editor):
    Application = apps.get_model('core', 'Application')
    coming_soon = [
        {
            'slug': 'projects',
            'title': 'مدیریت پروژه',
            'description': 'پروژه‌ها، فازها، وظایف، پیشرفت و تخصیص منابع',
            'icon': '📊',
            'color': '#8b5cf6',
            'order': 3,
        },
        {
            'slug': 'inventory',
            'title': 'انبار و موجودی',
            'description': 'کالاها، رسید/حواله، انبارگردانی و موجودی',
            'icon': '📦',
            'color': '#10b981',
            'order': 4,
        },
        {
            'slug': 'accounting',
            'title': 'حسابداری',
            'description': 'اسناد حسابداری، دفاتر، تراز و صورت‌های مالی',
            'icon': '🧾',
            'color': '#0ea5e9',
            'order': 5,
        },
        {
            'slug': 'assets',
            'title': 'اموال و دارایی',
            'description': 'تجهیزات، استهلاک، واگذاری و ردیابی دارایی‌ها',
            'icon': '🖥️',
            'color': '#f97316',
            'order': 6,
        },
        {
            'slug': 'treasury',
            'title': 'خزانه داری',
            'description': 'دریافت/پرداخت، حساب‌های بانکی، چک و جریان نقدی',
            'icon': '🏦',
            'color': '#14b8a6',
            'order': 7,
        },
        {
            'slug': 'crm',
            'title': 'CRM',
            'description': 'مشتریان، فرصت‌های فروش، تیکت و پشتیبانی',
            'icon': '🤝',
            'color': '#ec4899',
            'order': 8,
        },
        {
            'slug': 'procurement',
            'title': 'خرید و تدارکات',
            'description': 'درخواست خرید، استعلام، سفارش خرید و تأمین‌کنندگان',
            'icon': '🛒',
            'color': '#3b82f6',
            'order': 9,
        },
        {
            'slug': 'sales',
            'title': 'فروش',
            'description': 'پیش‌فاکتور، فاکتور فروش، مشتریان و تخفیف‌ها',
            'icon': '💰',
            'color': '#22c55e',
            'order': 10,
        },
        {
            'slug': 'production',
            'title': 'تولید و برنامه‌ریزی',
            'description': 'BOM، دستور تولید، برنامه‌ریزی و کنترل کیفیت',
            'icon': '🏭',
            'color': '#a855f7',
            'order': 11,
        },
        {
            'slug': 'settings',
            'title': 'تنظیمات و تعاریف',
            'description': 'تنظیمات سیستم، نقش‌ها، کاربران و ساختار سازمانی',
            'icon': '⚙️',
            'color': '#64748b',
            'order': 12,
        },
    ]
    for cfg in coming_soon:
        cfg = dict(cfg, is_coming_soon=True)
        Application.objects.update_or_create(slug=cfg['slug'], defaults=cfg)


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0005_seed_applications'),
    ]

    operations = [
        migrations.AddField(
            model_name='application',
            name='is_coming_soon',
            field=models.BooleanField(default=False, help_text='ماژول‌هایی که هنوز پیاده‌سازی نشده و در کاتالوگ نمایش داده می‌شوند', verbose_name='در حال بهسازی/به‌زودی'),
        ),
        migrations.RunPython(seed_catalog),
    ]