"""Seed داده‌های پایهٔ خزانه: بانک‌های ایران، روش‌های دریافت/پرداخت، شماره‌گذاری."""
from django.db import migrations

IRANIAN_BANKS = [
    ('بانک ملی ایران', 'Bank Melli Iran', '010'),
    ('بانک ملت', 'Bank Mellat', '012'),
    ('بانک صادرات ایران', 'Bank Saderat Iran', '019'),
    ('بانک تجارت', 'Bank Tejarat', '018'),
    ('بانک رفاه کارگران', 'Bank Refah Kargaran', '013'),
    ('بانک مسکن', 'Bank Maskan', '014'),
    ('بانک کشاورزی', 'Bank Keshavarzi', '016'),
    ('بانک سپه', 'Bank Sepah', '015'),
    ('بانک توسعه صادرات ایران', 'Export Development Bank of Iran', '020'),
    ('بانک صنعت و معدن', 'Bank Sanat va Madan', '011'),
    ('بانک توسعه تعاون', 'Tosee Taavon Bank', '021'),
    ('پست بانک ایران', 'Post Bank of Iran', '022'),
    ('بانک پارسیان', 'Parsian Bank', '054'),
    ('بانک پاسارگاد', 'Bank Pasargad', '057'),
    ('بانک سامان', 'Saman Bank', '056'),
    ('بانک اقتصاد نوین', 'EN Bank', '055'),
    ('بانک کارآفرین', 'Karafarin Bank', '053'),
    ('بانک سینا', 'Sina Bank', '059'),
    ('بانک شهر', 'Shahr Bank', '061'),
    ('بانک دی', 'Day Bank', '066'),
    ('بانک آینده', 'Ayandeh Bank', '062'),
    ('بانک گردشگری', 'Tourism Bank', '064'),
    ('بانک ایران زمین', 'Iran Zamin Bank', '069'),
    ('بانک خاورمیانه', 'Middle East Bank', '078'),
    ('بانک قرض‌الحسنه مهر ایران', 'Ghavamin Mehr Iran', '060'),
    ('بانک قرض‌الحسنه رسالت', 'Resalat Ghavamin', '070'),
    ('بانک سرمایه', 'Sarmayeh Bank', '058'),
    ('بانک حکمت ایرانیان', 'Hekmat Iranian Bank', '065'),
    ('بانک مشترک ایران-ونزوئلا', 'Iran-Venezuela Joint Bank', '095'),
]

# کد، عنوان، ابزار، سمت، نیازمندی‌ها
PAYMENT_METHODS = [
    ('CASH', 'نقد', 'cash', 'both', {'requires_reference': False}),
    ('BANK_TRANSFER', 'انتقال/واریز بانکی', 'bank', 'both',
     {'requires_bank': True, 'requires_tracking': True}),
    ('INTERNAL_TRANSFER', 'انتقال بین حساب‌های شرکت', 'bank', 'both',
     {'requires_bank': True}),
    ('CARD_TO_CARD', 'کارت‌به‌کارت', 'card', 'both', {'requires_card': True}),
    ('POS', 'کارت‌خوان', 'card', 'receipt',
     {'requires_terminal': True, 'requires_card': True}),
    ('CHEQUE', 'چک', 'cheque', 'both', {'requires_cheque': True}),
    ('GUARANTEE_CHEQUE', 'چک تضمینی', 'cheque', 'both', {'requires_cheque': True}),
    ('DRAFT', 'حواله بانکی', 'bank', 'payment', {'requires_bank': True}),
    ('PROMISSORY_NOTE', 'سفته', 'cheque', 'both', {'requires_cheque': True}),
    ('FOREIGN_CURRENCY', 'دریافت/پرداخت ارزی', 'bank', 'both',
     {'requires_bank': True, 'requires_foreign_currency': True}),
    ('OTHER', 'سایر', 'bank', 'both', {'requires_reference': False}),
]


def seed(apps, schema_editor):
    Company = apps.get_model('core', 'Company')
    Bank = apps.get_model('treasury', 'Bank')
    PaymentMethod = apps.get_model('treasury', 'TreasuryPaymentMethod')
    Numbering = apps.get_model('treasury', 'TreasuryNumberingSetting')

    for company in Company.objects.filter(is_active=True).iterator():
        for order, (name, name_en, code) in enumerate(IRANIAN_BANKS, start=1):
            Bank.objects.update_or_create(
                company=company, name=name,
                defaults={'name_en': name_en, 'code': code, 'sort_order': order},
            )
        for order, (code, name, target, side, flags) in enumerate(PAYMENT_METHODS, start=1):
            defaults = {
                'name': name,
                'target': target,
                'category': side,
                'sort_order': order,
                'is_active': True,
            }
            defaults.update(flags)
            PaymentMethod.objects.update_or_create(
                company=company, code=code, defaults=defaults,
            )
        Numbering.objects.get_or_create(company=company)


def unseed(apps, schema_editor):
    Bank = apps.get_model('treasury', 'Bank')
    PaymentMethod = apps.get_model('treasury', 'TreasuryPaymentMethod')
    Bank.objects.filter(code__in=[row[2] for row in IRANIAN_BANKS]).delete()
    PaymentMethod.objects.filter(
        code__in=[row[0] for row in PAYMENT_METHODS],
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('treasury', '0007_treasurynumberingsetting_and_more'),
    ]

    operations = [
        migrations.RunPython(seed, unseed),
    ]
