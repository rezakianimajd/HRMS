"""تست بیلدرهای اسناد سروری موتور چاپ (فیش حقوقی و سند خزانه) — بدون دیتابیس."""
from unittest.mock import patch

from django.test import SimpleTestCase

from core.print_engine import registry
from core.print_engine.builders.payslip import payslip_document
from core.print_engine.builders.voucher import voucher_document
from core.print_engine.layout import render_document

PAYSLIP_DATA = {
    'company': {'name': 'موسسه نمونه', 'subtitle': 'کد ۱'},
    'employee': {
        'name': 'مهدیه جمشیدنیا', 'code': '1042', 'national_id': '0012345678',
        'position': 'کارشناس ارشد', 'department': 'مالی', 'bank_account': 'IR000000000000000000000000',
    },
    'period_label': '۱۴۰۵ — مهر',
    'work_days': 30,
    'overtime_hours': 12,
    'insurance_subject': 90000000,
    'employer_insurance': 20700000,
    'earnings': [
        {'label': 'حقوق پایه', 'amount': 80000000},
        {'label': 'حق مسکن', 'amount': 9000000},
        {'label': 'بن کارکنان', 'amount': 0},
    ],
    'deductions': [
        {'label': 'حق بیمه سهم پرسنل', 'amount': 6300000},
        {'label': 'مالیات', 'amount': 4700000},
    ],
    'total_benefits': 89000000,
    'total_deductions': 11000000,
    'net_payable': 78000000,
    'barcode_value': 'PAY-15-1405-7',
    'printed_on': '2026-11-08',
}

VOUCHER_DATA = {
    'kind': 'receipt',
    'title': 'فیش دریافت وجه',
    'company': {'name': 'موسسه نمونه'},
    'number': 'RC-1405-0042',
    'date': '۱۴۰۵/۰۸/۱۷',
    'time': '10:20',
    'status': 'ثبت‌شده',
    'received_from': 'شرکت راه‌سازی پارس',
    'amount': 125000000,
    'amount_words': 'صد و بیست و پنج میلیون ریال',
    'purpose': 'تسویه صورت‌وضعیت ۳',
    'description': 'واریز به حساب اصلی',
    'method': 'انتقال بانکی',
    'instrument': {'reference_no': 'REF-991', 'tracking_no': 'TRK-4411', 'terminal': '10203040'},
    'account': {'name': 'حساب اصلی', 'bank': 'پاسارگاد', 'account_number': '1234567890'},
    'project': 'برج اداری',
    'verification': {'code': 'ABCD-1234', 'url': '/treasury/verify?t=x'},
    'signatures': [{'label': 'دریافت‌کننده', 'name': ''}, {'label': 'خزانه‌دار', 'name': ''}],
    'footer': 'این سند با کد اعتبارسنجی قابل بررسی است.',
    'printed_on': '2026-11-08',
}


class PayslipDocumentTests(SimpleTestCase):
    def test_document_sections_and_totals(self):
        document = payslip_document(PAYSLIP_DATA)
        self.assertEqual(document['title'], 'فیش حقوقی')
        self.assertEqual(len(document['sections']), 3)
        html = render_document(document, {'paper': 'A5'})
        self.assertIn('مهدیه جمشیدنیا', html)
        self.assertIn('حق مسکن', html)
        # ردیف‌های صفر حذف می‌شوند
        self.assertNotIn('بن کارکنان', html)
        self.assertIn('جمع حقوق و مزایا', html)
        self.assertIn('جمع کسورات', html)
        self.assertIn('۷۸٬۰۰۰٬۰۰۰ ریال', html)
        self.assertIn('هفتاد و هشت میلیون', html)

    def test_net_is_recomputed_when_missing(self):
        data = dict(PAYSLIP_DATA)
        data.pop('net_payable')
        document = payslip_document(data)
        self.assertEqual(document['amount_box']['value'], '۷۸٬۰۰۰٬۰۰۰ ریال')

    def test_barcode_and_signatures_present(self):
        document = payslip_document(PAYSLIP_DATA)
        self.assertIn('<svg', document['barcode'])
        self.assertIn('مهر و امضا', document['signatures'])

    def test_payslip_requires_permission(self):
        from types import SimpleNamespace

        request = SimpleNamespace(user=SimpleNamespace(is_authenticated=False))
        with patch('core.print_engine.registry.can_print', return_value=False):
            with self.assertRaises(registry.PrintError) as context:
                registry.build_payslip({'id': 1}, {}, request=request)
        self.assertEqual(context.exception.status, 403)


class VoucherDocumentTests(SimpleTestCase):
    def test_receipt_document_fields(self):
        document = voucher_document(VOUCHER_DATA)
        html = render_document(document, {'paper': 'A5'})
        self.assertIn('فیش دریافت وجه', html)
        self.assertIn('RC-1405-0042', html)
        self.assertIn('شرکت راه‌سازی پارس', html)
        self.assertIn('دریافت از', html)
        self.assertIn('صد و بیست و پنج میلیون ریال', html)
        self.assertIn('۱۲۵٬۰۰۰٬۰۰۰ ریال', html)
        self.assertIn('ABCD-1234', html)
        self.assertIn('اطلاعات ابزار پرداخت', html)
        # وضعیت ثبت‌شده ⇒ بدون واترمارک پیش‌نویس
        self.assertNotIn('<div class="pe-watermark">', html)

    def test_payment_direction_uses_beneficiary(self):
        data = dict(VOUCHER_DATA)
        data.update({'kind': 'payment', 'title': 'حواله پرداخت', 'received_from': '',
                     'beneficiary': 'تأمین‌کننده تجهیزات', 'status': 'پیش‌نویس'})
        document = voucher_document(data)
        html = render_document(document, {})
        self.assertIn('پرداخت به', html)
        self.assertIn('تأمین‌کننده تجهیزات', html)
        self.assertIn('pe-watermark', html)

    def test_unsupported_kind_raises(self):
        from types import SimpleNamespace

        request = SimpleNamespace(
            user=SimpleNamespace(is_authenticated=True, is_superuser=True), tenant=None,
        )
        with self.assertRaises(registry.PrintError) as context:
            registry.build_voucher({'id': 1, 'kind': 'unknown-kind'}, {}, request=request)
        self.assertEqual(context.exception.status, 400)

    def test_available_documents_lists_new_kinds(self):
        keys = {item['key'] for item in registry.available_documents()}
        self.assertTrue({'payslip', 'voucher'} <= keys)
