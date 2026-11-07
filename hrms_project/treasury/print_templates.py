"""قالب‌های چاپ فیش/رسید با «جای‌نگهدار» (merge fields) — مثل نرم‌افزارهای حرفه‌ای.

کاربر می‌تواند در تنظیمات خزانه، نمونهٔ چاپ خود را با HTML و جای‌نگهدارهایی مثل
``{{company_name}}`` یا ``{{amount_words}}`` بسازد؛ موتور رندر مقدار هر جای‌نگهدار را
از دادهٔ سند جای‌گذاری می‌کند و بارکد اعتبارسنجی را هم درج می‌کند.
"""
from django.db import models
from django.utils.html import escape
from django.utils.translation import gettext_lazy as _

from core.models.base_model import BaseModel
from treasury.barcode import barcode_svg

KINDS = [
    ('receipt', _('فیش دریافت وجه')),
    ('payment', _('فیش پرداخت وجه')),
    ('bank_order', _('دستور پرداخت بین‌بانکی')),
    ('transfer', _('رسید انتقال وجه')),
    ('cheque_receipt', _('رسید تحویل چک')),
]

# جای‌نگهدارهای امن (HTML آماده — escape نمی‌شوند)
SAFE_KEYS = {'barcode', 'qr'}

PLACEHOLDERS = {
    'common': [
        ('company_name', 'نام شرکت', 'شرکت نمونه'),
        ('company_code', 'کد اقتصادی/شناسه شرکت', '14000000000'),
        ('number', 'شماره سند', 'RC-1405-000001'),
        ('date', 'تاریخ سند (شمسی)', '۱۴۰۵/۰۸/۱۶'),
        ('amount', 'مبلغ عددی', '25,000,000'),
        ('amount_words', 'مبلغ به حروف', 'بیست و پنج میلیون ریال'),
        ('description', 'شرح', 'دریافت بخشی از مطالبات'),
        ('status', 'وضعیت', 'دریافت‌شده'),
        ('barcode', 'بارکد اعتبارسنجی', ''),
        ('verify_code', 'کد اعتبارسنجی', 'RECEIPT-RC-1405-000001'),
        ('verify_url', 'نشانی اعتبارسنجی', '/treasury/verify?token=…'),
    ],
    'receipt': [
        ('received_from', 'دریافت از', 'آقای احمدی'),
        ('method', 'روش دریافت', 'نقدی'),
        ('account_name', 'حساب/صندوق', 'بانک ملت - جاری'),
        ('account_number', 'شماره حساب', '1234567890'),
        ('sheba_number', 'شبا', 'IR000000000000000000000000'),
        ('bank_name', 'بانک', 'بانک ملت'),
        ('purpose', 'بابت', 'فروش خدمات'),
    ],
    'payment': [
        ('beneficiary', 'پرداخت به', 'شرکت پیمانکار'),
        ('request_number', 'شماره درخواست پرداخت', 'PR-1405-000003'),
        ('method', 'روش پرداخت', 'انتقال بانکی'),
        ('account_name', 'حساب/صندوق', 'بانک ملت - جاری'),
        ('account_number', 'شماره حساب', '1234567890'),
        ('sheba_number', 'شبا', 'IR000000000000000000000000'),
        ('bank_name', 'بانک', 'بانک ملت'),
        ('purpose', 'بابت', 'تسویه صورت‌وضعیت'),
        ('accounting_document', 'شماره سند حسابداری', '100/1405/000012'),
    ],
    'bank_order': [
        ('transfer_type', 'نوع انتقال', 'ساتنا'),
        ('company_national_id', 'شناسه ملی شرکت', '1404142880'),
        ('customer_number', 'شماره مشتری', '1404142880'),
        ('source_account_number', 'شماره سپرده مبدأ', '201810023-1'),
        ('source_iban', 'شبا مبدأ', 'IR…'),
        ('destination_owner_name', 'نام صاحب سپرده مقصد', 'شرکت پیمانکار'),
        ('destination_account_number', 'شماره سپرده مقصد', '…'),
        ('destination_iban', 'شبا مقصد', 'IR…'),
        ('destination_bank', 'بانک مقصد', 'بانک پاسارگاد'),
        ('cheque_number', 'شماره چک', '—'),
        ('note', 'شرح انتقال', 'انتقال وجه'),
    ],
    'transfer': [
        ('from_entity', 'از حساب', 'بانک ملت'),
        ('to_entity', 'به حساب', 'صندوق مرکزی'),
        ('fee', 'کارمزد', '0'),
    ],
    'cheque_receipt': [
        ('cheque_number', 'شماره چک', '123456'),
        ('cheque_due_date', 'سررسید', '۱۴۰۵/۰۹/۱۰'),
        ('cheque_bank', 'بانک صادرکننده', 'بانک صادرات'),
        ('cheque_party', 'صادرکننده', 'آقای رضایی'),
    ],
}


def placeholders_for(kind):
    """جای‌نگهدارهای قابل استفاده برای یک نوع سند (برای پنل ویرایش)."""
    rows = list(PLACEHOLDERS['common'])
    if kind in PLACEHOLDERS:
        rows += list(PLACEHOLDERS[kind])
    return [{'key': key, 'label': label, 'sample': sample} for key, label, sample in rows]


def _default_receipt_html():
    return """
<div style="font-family:Tahoma,sans-serif;direction:rtl;color:#0f172a">
  <table style="width:100%;border-collapse:collapse">
    <tr>
      <td style="padding:8px 0">
        <div style="font-size:16px;font-weight:bold">{{company_name}}</div>
        <div style="font-size:10px;color:#475569">شناسه/کد شرکت: {{company_code}}</div>
      </td>
      <td style="text-align:left;padding:8px 0">
        <div style="font-size:14px;font-weight:bold">فیش دریافت وجه</div>
        <div style="font-size:11px">شماره: {{number}}</div>
        <div style="font-size:11px">تاریخ: {{date}}</div>
      </td>
    </tr>
  </table>
  <hr style="border:none;border-top:1px solid #cbd5e1" />
  <table style="width:100%;border-collapse:collapse;font-size:11px">
    <tr><td style="width:120px;color:#475569">دریافت از</td><td><b>{{received_from}}</b></td></tr>
    <tr><td style="color:#475569">روش دریافت</td><td>{{method}}</td></tr>
    <tr><td style="color:#475569">حساب/صندوق</td><td>{{account_name}} — {{account_number}}</td></tr>
    <tr><td style="color:#475569">شبا</td><td>{{sheba_number}}</td></tr>
    <tr><td style="color:#475569">بابت</td><td>{{purpose}}</td></tr>
    <tr><td style="color:#475569">شرح</td><td>{{description}}</td></tr>
  </table>
  <div style="margin:10px 0;padding:8px;border:1px dashed #94a3b8;font-size:12px">
    <div>مبلغ: <b>{{amount}}</b> ریال</div>
    <div>به حروف: <b>{{amount_words}}</b></div>
  </div>
  <table style="width:100%;border-collapse:collapse;margin-top:12px;font-size:10px">
    <tr>
      <td style="border-top:1px dashed #94a3b8;padding-top:4px">دریافت‌کننده</td>
      <td style="border-top:1px dashed #94a3b8;padding-top:4px">خزانه‌دار</td>
      <td style="border-top:1px dashed #94a3b8;padding-top:4px">تأییدکننده</td>
      <td style="border-top:1px dashed #94a3b8;padding-top:4px">مدیر مالی</td>
    </tr>
  </table>
  <table style="width:100%;margin-top:10px">
    <tr>
      <td style="font-size:9px;color:#475569">این رسید صرفاً پس از ثبت و تأیید در سامانه معتبر است.<br />{{verify_code}}</td>
      <td style="text-align:left">{{barcode}}</td>
    </tr>
  </table>
</div>
""".strip()


def default_templates():
    """قالب‌های پیش‌فرض (هر شرکت یک نسخه از هر نوع سند)."""
    payment_body = (
        _default_receipt_html()
        .replace('فیش دریافت وجه', 'فیش پرداخت وجه')
        .replace('{{received_from}}', '{{beneficiary}}')
        .replace('دریافت از', 'پرداخت به')
        .replace('روش دریافت', 'روش پرداخت')
    )
    bank_order_body = """
<div style="font-family:Tahoma,sans-serif;direction:rtl;color:#0f172a;font-size:11px">
  <table style="width:100%;border-collapse:collapse">
    <tr>
      <td><b>{{company_name}}</b><div style="font-size:10px;color:#475569">شناسه ملی: {{company_national_id}}</div></td>
      <td style="text-align:left"><b>دستور پرداخت الکترونیکی بین‌بانکی ({{transfer_type}})</b>
        <div>شماره: {{number}} — تاریخ: {{date}}</div></td>
    </tr>
  </table>
  <hr style="border:none;border-top:1px solid #cbd5e1" />
  <p>اینجانب به شماره مشتری {{customer_number}} دستور می‌دهم مبلغ <b>{{amount}}</b> ریال
     ({{amount_words}}) در تاریخ {{date}} از سپرده مبدأ کسر و به سپرده مقصد واریز شود.</p>
  <table style="width:100%;border-collapse:collapse;font-size:11px">
    <tr><td style="color:#475569;width:130px">سپرده مبدأ</td><td>{{source_account_number}} — {{source_iban}}</td></tr>
    <tr><td style="color:#475569">صاحب سپرده مقصد</td><td>{{destination_owner_name}}</td></tr>
    <tr><td style="color:#475569">سپرده مقصد</td><td>{{destination_account_number}}</td></tr>
    <tr><td style="color:#475569">شبا مقصد</td><td>{{destination_iban}}</td></tr>
    <tr><td style="color:#475569">بانک مقصد</td><td>{{destination_bank}}</td></tr>
    <tr><td style="color:#475569">از محل چک</td><td>{{cheque_number}}</td></tr>
    <tr><td style="color:#475569">شرح انتقال</td><td>{{note}}</td></tr>
  </table>
  <table style="width:100%;margin-top:14px">
    <tr>
      <td style="font-size:9px;color:#475569">{{verify_code}} — این سند صرفاً پس از ثبت در سامانه معتبر است.</td>
      <td style="text-align:left">{{barcode}}</td>
    </tr>
  </table>
</div>
""".strip()
    return [
        {
            'kind': 'receipt',
            'name': 'فیش دریافت — قالب استاندارد',
            'body': _default_receipt_html(),
            'paper': 'A5',
            'is_default': True,
        },
        {
            'kind': 'payment',
            'name': 'فیش پرداخت — قالب استاندارد',
            'body': payment_body,
            'paper': 'A5',
            'is_default': True,
        },
        {
            'kind': 'bank_order',
            'name': 'دستور پرداخت بین‌بانکی — استاندارد',
            'body': bank_order_body,
            'paper': 'A4',
            'is_default': True,
        },
    ]



class TreasuryPrintTemplate(BaseModel):
    """قالب چاپ سند خزانه با جای‌نگهدار (merge field)."""

    name = models.CharField(max_length=150, verbose_name=_('نام قالب'))
    kind = models.CharField(max_length=20, choices=KINDS, verbose_name=_('نوع سند'))
    body = models.TextField(verbose_name=_('بدنهٔ قالب (HTML با {{جای‌نگهدار}})'))
    paper = models.CharField(
        max_length=5, default='A5',
        choices=[('A4', 'A4'), ('A5', 'A5')], verbose_name=_('اندازهٔ کاغذ'),
    )
    is_default = models.BooleanField(default=False, verbose_name=_('قالب پیش‌فرض این نوع'))
    note = models.CharField(max_length=250, blank=True, verbose_name=_('یادداشت'))

    class Meta:
        verbose_name = _('قالب چاپ خزانه')
        verbose_name_plural = _('قالب‌های چاپ خزانه')
        ordering = ['kind', '-is_default', 'name']
        unique_together = [('company', 'kind', 'name')]

    def __str__(self):
        return f'{self.get_kind_display()} — {self.name}'

    def save(self, *args, **kwargs):
        if self.is_default and self.company_id:
            TreasuryPrintTemplate.objects.filter(
                company_id=self.company_id, kind=self.kind, is_default=True,
            ).exclude(pk=self.pk).update(is_default=False)
        return super().save(*args, **kwargs)


def get_default_template(company, kind):
    """قالب پیش‌فرض شرکت برای یک نوع سند (یا None)."""
    if not company:
        return None
    return (
        TreasuryPrintTemplate.objects.filter(
            company=company, kind=kind, is_default=True, is_active=True,
        ).first()
        or TreasuryPrintTemplate.objects.filter(
            company=company, kind=kind, is_active=True,
        ).first()
    )


def render_template(template, context):
    """جای‌گذاری مقادیر در قالب؛ مقادیر escape می‌شوند مگر کلیدهای امن."""
    body = template.body if template else _default_receipt_html()
    for key, value in (context or {}).items():
        if key in SAFE_KEYS:
            replacement = str(value or '')
        else:
            replacement = escape(str(value if value is not None else ''))
        body = (
            body.replace('{{' + key + '}}', replacement)
            .replace('{{ ' + key + ' }}', replacement)
        )
    return body


def build_context(payload):
    """تبدیل دادهٔ فیش/دستور به دیکشنری جای‌نگهدارها (+ بارکد)."""
    account = payload.get('account') or {}
    instrument = payload.get('instrument') or {}
    verification = payload.get('verification') or {}
    company = payload.get('company') or {}
    code = verification.get('code', '')
    transfer = payload.get('transfer_type') or ''
    return {
        'company_name': company.get('name', ''),
        'company_code': company.get('code', ''),
        'number': payload.get('number', ''),
        'date': payload.get('date', ''),
        'amount': str(payload.get('amount', '')),
        'amount_words': payload.get('amount_words', ''),
        'description': payload.get('description', ''),
        'status': payload.get('status', ''),
        'received_from': payload.get('received_from', ''),
        'beneficiary': payload.get('beneficiary', ''),
        'request_number': payload.get('request_number', ''),
        'method': payload.get('method', ''),
        'account_name': account.get('name', ''),
        'account_number': account.get('account_number', ''),
        'sheba_number': account.get('sheba_number', ''),
        'bank_name': account.get('bank_name', ''),
        'purpose': payload.get('purpose', ''),
        'accounting_document': payload.get('accounting_document', ''),
        'transfer_type': transfer,
        'company_national_id': payload.get('company_national_id', ''),
        'customer_number': payload.get('customer_number', ''),
        'source_account_number': payload.get('source_account_number', ''),
        'source_iban': payload.get('source_iban', ''),
        'destination_owner_name': payload.get('destination_owner_name', ''),
        'destination_account_number': payload.get('destination_account_number', ''),
        'destination_iban': payload.get('destination_iban', ''),
        'destination_bank': payload.get('destination_bank', ''),
        'cheque_number': instrument.get('cheque', '') or payload.get('cheque_number', ''),
        'cheque_due_date': payload.get('cheque_due_date', ''),
        'note': payload.get('note', ''),
        'from_entity': (payload.get('from') or {}).get('name', ''),
        'to_entity': (payload.get('to') or {}).get('name', ''),
        'fee': payload.get('fee', ''),
        'verify_code': code,
        'verify_url': verification.get('url', ''),
        'barcode': barcode_svg(code) if code else '',
        'qr': '',
    }

