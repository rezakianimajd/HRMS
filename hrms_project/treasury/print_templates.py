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
    ('interbank', _('حواله بین‌بانکی (شبا)')),
    ('cash', _('فیش نقدی')),
    ('transfer', _('رسید انتقال وجه')),
    ('cheque_receipt', _('رسید تحویل چک')),
]

# جای‌نگهدارهای امن (HTML آماده — escape نمی‌شوند)
SAFE_KEYS = {
    'barcode', 'qr',
    'amount_boxes', 'date_boxes',
    'account_iban_boxes', 'source_iban_boxes', 'destination_iban_boxes',
}

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
    'interbank': [
        ('transfer_type', 'نوع انتقال', 'ساتنا'),
        ('company_national_id', 'شناسه ملی شرکت', '1404142880'),
        ('company_phone', 'تلفن شرکت', '021-88776655'),
        ('bank_name', 'بانک مبدأ', 'بانک پاسارگاد'),
        ('account_name', 'نام حساب مبدأ', 'جاری شرکت'),
        ('account_number', 'شماره حساب مبدأ', '201810023-1'),
        ('source_iban', 'شبا مبدأ', 'IR120570020181002310000001'),
        ('source_iban_boxes', 'شبا مبدأ (خانه‌های عددی)', ''),
        ('source_owner_name', 'نام صاحب حساب مبدأ', 'شرکت نمونه'),
        ('source_national_id', 'کد ملی/شناسه صاحب حساب مبدأ', '1404142880'),
        ('account_branch', 'شعبه مبدأ', 'شعبه مرکزی'),
        ('destination_owner_name', 'نام صاحب حساب مقصد', 'شرکت پیمانکار'),
        ('destination_national_id', 'کد ملی/شناسه مقصد', '10101234567'),
        ('destination_account_number', 'شماره حساب مقصد', '1234567890'),
        ('destination_iban', 'شبا مقصد', 'IR000000000000000000000000'),
        ('destination_iban_boxes', 'شبا مقصد (خانه‌های عددی)', ''),
        ('destination_bank', 'بانک مقصد', 'بانک ملت'),
        ('destination_branch', 'شعبه مقصد', '—'),
        ('fee', 'کارمزد', '0'),
        ('purpose', 'بابت / شرح', 'تسویه صورت‌وضعیت'),
        ('reference_no', 'شماره پیگیری', 'REF-1'),
        ('tracking_no', 'شماره مرجع بانکی', 'TRK-1'),
        ('amount_boxes', 'مبلغ (خانه‌های عددی)', ''),
        ('date_boxes', 'تاریخ (خانه‌های عددی)', ''),
        ('note', 'توضیحات', 'انتقال وجه'),
    ],
    'cash': [
        ('operation', 'نوع عملیات', 'پرداخت نقدی'),
        ('branch', 'شعبه', 'شعبه مرکزی'),
        ('cashier', 'باجه/متصدی', 'باجه ۳'),
        ('payer_name', 'نام پرداخت‌کننده', 'شرکت نمونه'),
        ('payer_account', 'شماره حساب پرداخت‌کننده', '201810023-1'),
        ('payer_national_id', 'کد ملی پرداخت‌کننده', '1404142880'),
        ('receiver_name', 'نام دریافت‌کننده', 'آقای احمدی'),
        ('receiver_account', 'شماره حساب دریافت‌کننده', '1234567890'),
        ('receiver_national_id', 'کد ملی دریافت‌کننده', '10101234567'),
        ('bank_name', 'بانک', 'بانک پاسارگاد'),
        ('account_name', 'حساب/صندوق', 'صندوق مرکزی'),
        ('account_number', 'شماره حساب', '201810023-1'),
        ('purpose', 'جهت مصرف / بابت', 'پرداخت هزینه‌ها'),
        ('serial_no', 'شماره سری/سند', '1405-000123'),
        ('cheque_number', 'شماره چک', '—'),
        ('amount_boxes', 'مبلغ (خانه‌های عددی)', ''),
        ('date_boxes', 'تاریخ (خانه‌های عددی)', ''),
        ('note', 'توضیحات', ''),
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


def _digit_boxes(value, size=16):
    """خانه‌های عددی مبلغ/تاریخ (سبک فیش‌های بانکی) — HTML امن."""
    digits = ''.join(char for char in str(value or '') if char.isdigit())
    digits = digits.translate(str.maketrans('0123456789', '۰۱۲۳۴۵۶۷۸۹'))
    cells = ''.join(
        f'<span style="display:inline-block;min-width:{size}px;height:{size + 3}px;'
        'border:1px solid #64748b;margin-inline-start:2px;text-align:center;'
        f'line-height:{size + 3}px;font-weight:bold;font-size:{size - 4}px">{char}</span>'
        for char in digits
    )
    return f'<span style="direction:ltr;unicode-bidi:embed">{cells}</span>'


def _iban_boxes(value):
    """شبا با خانه‌های عددی: IR + دو رقم کنترلی + ۲۲ رقم — HTML امن."""
    from treasury.iban import normalize

    text = normalize(value)
    if not text.startswith('IR') or len(text) < 4:
        return _digit_boxes(text, size=14)
    digits = text[2:]
    groups = []
    for index, char in enumerate(digits):
        if index == 2:
            groups.append('<span style="display:inline-block;width:8px"></span>')
        if index and index % 4 == 2:
            groups.append('<span style="display:inline-block;width:6px"></span>')
        groups.append(
            f'<span style="display:inline-block;min-width:14px;height:17px;'
            'border:1px solid #64748b;margin-inline-start:1px;text-align:center;'
            f'line-height:17px;font-size:11px;font-weight:bold">'
            f'{char.translate(str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹"))}</span>',
        )
    return (
        '<span style="direction:ltr;unicode-bidi:embed">'
        '<b style="font-size:11px;margin-inline-end:3px">IR</b>' + ''.join(groups) + '</span>'
    )


def _default_interbank_html():
    """حواله بین‌بانکی (شبا/پایا/ساتنا) — چیدمان الگوی فیش بانک پاسارگاد."""
    return """
<div style="font-family:Tahoma,'IRANSans',sans-serif;direction:rtl;color:#111827;font-size:11px">
<style>
  @page { size: A4; margin: 8mm; }
  .ib-head { width:100%; border-collapse:collapse }
  .ib-title { border:1.6px solid #111827; text-align:center; font-size:13px; font-weight:bold;
              padding:5px; margin:6px 0; letter-spacing:.2px }
  .ib-band { background:#111827; color:#fff; font-size:10.5px; font-weight:bold;
             padding:3px 6px; margin-top:8px }
  .ib-table { width:100%; border-collapse:collapse; table-layout:fixed }
  .ib-table td { border:1px solid #94a3b8; padding:4px 6px; font-size:10.5px;
                 vertical-align:middle; word-wrap:break-word }
  .ib-label { background:#f1f5f9; color:#334155; font-weight:bold; width:118px }
  .ib-sig td { border:1px solid #94a3b8; height:52px; text-align:center; font-size:9.5px;
               color:#475569; vertical-align:bottom; padding-bottom:4px }
  .ib-foot { width:100%; margin-top:8px; font-size:9px; color:#475569 }
</style>
<table class="ib-head">
  <tr>
    <td style="width:58%">
      <div style="font-size:15px;font-weight:bold">{{company_name}}</div>
      <div style="font-size:10px;color:#475569">شناسه ملی: {{company_national_id}} — تلفن: {{company_phone}}</div>
    </td>
    <td style="text-align:left">
      <div style="font-size:13px;font-weight:bold">{{bank_name}}</div>
      <div style="font-size:10px;color:#475569">شعبه: {{account_branch}} — حساب: {{account_number}}</div>
      <div style="font-size:10px;color:#475569">شبا: {{source_iban}}</div>
    </td>
  </tr>
</table>
<div class="ib-title">فرم دستور پرداخت الکترونیکی بین‌بانکی ({{transfer_type}})</div>
<table class="ib-table">
  <tr>
    <td class="ib-label">شماره دستور</td><td>{{number}}</td>
    <td class="ib-label">تاریخ</td><td>{{date}} <span style="margin-inline-start:6px">{{date_boxes}}</span></td>
  </tr>
</table>
<div class="ib-band">مشخصات دستور پرداخت</div>
<table class="ib-table">
  <tr><td class="ib-label">حساب / شبا مبدأ</td>
      <td colspan="3">{{account_number}} — {{source_iban}}</td></tr>
  <tr><td class="ib-label">نام صاحب حساب</td><td>{{source_owner_name}}</td>
      <td class="ib-label">کد ملی / شناسه</td><td>{{source_national_id}}</td></tr>
  <tr><td class="ib-label">بانک مبدأ</td><td>{{bank_name}}</td>
      <td class="ib-label">شعبه</td><td>{{account_branch}}</td></tr>
  <tr><td class="ib-label">مبلغ (ریال)</td><td>{{amount}}</td>
      <td class="ib-label">کارمزد</td><td>{{fee}}</td></tr>
  <tr><td class="ib-label">مبلغ به حروف</td><td colspan="3"><b>{{amount_words}}</b></td></tr>
</table>
<div class="ib-band">مشخصات حساب مقصد</div>
<table class="ib-table">
  <tr><td class="ib-label">شماره حساب مقصد</td><td>{{destination_account_number}}</td></tr>
  <tr><td class="ib-label">شبا مقصد</td>
      <td>{{destination_iban}}<div style="margin-top:3px">{{destination_iban_boxes}}</div></td></tr>
  <tr><td class="ib-label">نام صاحب حساب</td><td>{{destination_owner_name}}</td></tr>
  <tr><td class="ib-label">کد ملی / شناسه</td><td>{{destination_national_id}}</td></tr>
  <tr><td class="ib-label">بانک مقصد</td><td>{{destination_bank}}</td></tr>
  <tr><td class="ib-label">بابت / شرح</td><td>{{purpose}}</td></tr>
  <tr><td class="ib-label">شماره پیگیری</td>
      <td>{{reference_no}} — مرجع بانکی: {{tracking_no}}</td></tr>
</table>
<div style="margin-top:7px">مبلغ به عدد: {{amount_boxes}}</div>
<table class="ib-table ib-sig" style="margin-top:9px">
  <tr>
    <td style="width:34%">مهر و امضای صاحب حساب</td>
    <td style="width:33%">امضای مجازین / نماینده</td>
    <td>مهر و امضای بانک</td>
  </tr>
</table>
<table class="ib-foot">
  <tr>
    <td>این فرم صرفاً برای ثبت دستور پرداخت است و پس از تأیید بانک معتبر می‌باشد.<br />
      شماره اعتبارسنجی: {{verify_code}}</td>
    <td style="text-align:left">{{barcode}}</td>
  </tr>
</table>
</div>
""".strip()

def _default_cash_html():
    """فیش نقدی (دریافت/پرداخت) — چیدمان الگوی برگ دریافت/پرداخت نقدی بانک پاسارگاد."""
    return """
<div style="font-family:Tahoma,'IRANSans',sans-serif;direction:rtl;color:#111827;font-size:11px">
<style>
  @page { size: A5; margin: 6mm; }
  .cs-head { width:100%; border-collapse:collapse }
  .cs-title { font-size:13px; font-weight:bold }
  .cs-box { border:1.4px solid #111827; padding:5px 6px; margin-top:6px }
  .cs-band { font-size:10.5px; font-weight:bold; padding:2px 0; border-bottom:1px solid #cbd5e1;
             margin-bottom:4px }
  .cs-table { width:100%; border-collapse:collapse; table-layout:fixed }
  .cs-table td { border:1px solid #94a3b8; padding:4px 6px; font-size:10.5px }
  .cs-label { background:#f1f5f9; color:#334155; font-weight:bold; width:112px }
  .cs-payer { background:#fdf2f8 }
  .cs-receiver { background:#eff6ff }
  .cs-sig td { border:1px solid #94a3b8; height:46px; text-align:center; font-size:9.5px;
               color:#475569; vertical-align:bottom; padding-bottom:4px }
  .cs-foot { width:100%; margin-top:7px; font-size:9px; color:#475569 }
</style>
<table class="cs-head">
  <tr>
    <td style="width:55%">
      <div style="font-size:15px;font-weight:bold">{{company_name}}</div>
      <div style="font-size:10px;color:#475569">شناسه ملی: {{company_code}} — تلفن: {{company_phone}}</div>
    </td>
    <td style="text-align:left">
      <div class="cs-title">برگ دریافت / پرداخت نقدی ({{operation}})</div>
      <div style="font-size:10.5px">شماره: {{number}}</div>
      <div style="font-size:10.5px">تاریخ: {{date}}</div>
      <div style="font-size:10.5px">شعبه: {{branch}} — باجه: {{cashier}}</div>
    </td>
  </tr>
</table>
<div class="cs-box">
  <div class="cs-band">مبلغ (ریال)</div>
  <div style="font-size:12px">مبلغ به عدد: {{amount}}</div>
  <div style="margin-top:4px">{{amount_boxes}}</div>
  <div style="margin-top:5px;font-size:12px">به حروف: <b>{{amount_words}}</b></div>
</div>
<div class="cs-box cs-payer">
  <div class="cs-band">پرداخت‌کننده / واریزکننده</div>
  <table class="cs-table">
    <tr><td class="cs-label">شماره حساب</td><td>{{payer_account}}</td>
        <td class="cs-label">کد ملی</td><td>{{payer_national_id}}</td></tr>
    <tr><td class="cs-label">نام و نام خانوادگی</td><td colspan="3">{{payer_name}}</td></tr>
  </table>
</div>
<div class="cs-box cs-receiver">
  <div class="cs-band">دریافت‌کننده</div>
  <table class="cs-table">
    <tr><td class="cs-label">شماره حساب</td><td>{{receiver_account}}</td>
        <td class="cs-label">کد ملی</td><td>{{receiver_national_id}}</td></tr>
    <tr><td class="cs-label">نام و نام خانوادگی</td><td colspan="3">{{receiver_name}}</td></tr>
  </table>
</div>
<table class="cs-table" style="margin-top:6px">
  <tr><td class="cs-label">حساب/صندوق</td><td>{{account_name}} — {{account_number}}</td>
      <td class="cs-label">بانک</td><td>{{bank_name}}</td></tr>
  <tr><td class="cs-label">جهت مصرف / بابت</td><td colspan="3">{{purpose}}</td></tr>
  <tr><td class="cs-label">شماره سری/سند</td><td>{{serial_no}}</td>
      <td class="cs-label">شماره چک</td><td>{{cheque_number}}</td></tr>
  <tr><td class="cs-label">توضیحات</td><td colspan="3">{{note}}</td></tr>
</table>
<table class="cs-table cs-sig" style="margin-top:8px">
  <tr>
    <td style="width:50%">مهر و امضای بانک / خزانه‌دار</td>
    <td>مهر و امضای مشتری</td>
  </tr>
</table>
<table class="cs-foot">
  <tr>
    <td>این برگ صرفاً پس از ثبت در سامانه معتبر است — تاریخ: {{date}}<br />
      شماره اعتبارسنجی: {{verify_code}}</td>
    <td style="text-align:left">{{barcode}}</td>
  </tr>
</table>
</div>
""".strip()


def _default_html_for(kind):
    """بدنهٔ پیش‌فرض هر نوع سند (برای رندر بدون قالب ذخیره‌شده)."""
    if kind == 'interbank':
        return _default_interbank_html()
    if kind == 'cash':
        return _default_cash_html()
    return _default_receipt_html()


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
        {
            'kind': 'interbank',
            'name': 'حواله بین‌بانکی (شبا) — الگوی بانک پاسارگاد',
            'body': _default_interbank_html(),
            'paper': 'A4',
            'is_default': True,
        },
        {
            'kind': 'cash',
            'name': 'فیش نقدی — الگوی بانک پاسارگاد',
            'body': _default_cash_html(),
            'paper': 'A5',
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
    context = context or {}
    body = template.body if template else _default_html_for(context.get('kind') or 'receipt')
    for key, value in context.items():
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
    source_iban = payload.get('source_iban') or account.get('sheba_number', '')
    destination_iban = payload.get('destination_iban', '')
    return {
        'kind': payload.get('kind', ''),
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
        'source_iban': source_iban,
        'source_iban_boxes': _iban_boxes(source_iban) if source_iban else '',
        'source_owner_name': payload.get('source_owner_name', ''),
        'source_national_id': payload.get('source_national_id', ''),
        'account_branch': payload.get('account_branch', '') or account.get('branch_name', ''),
        'account_iban_boxes': _iban_boxes(account.get('sheba_number', ''))
        if account.get('sheba_number') else '',
        'destination_owner_name': payload.get('destination_owner_name', ''),
        'destination_national_id': payload.get('destination_national_id', ''),
        'destination_account_number': payload.get('destination_account_number', ''),
        'destination_iban': destination_iban,
        'destination_iban_boxes': _iban_boxes(destination_iban) if destination_iban else '',
        'destination_bank': payload.get('destination_bank', ''),
        'destination_branch': payload.get('destination_branch', ''),
        'company_phone': company.get('phone', ''),
        'operation': payload.get('operation', ''),
        'branch': payload.get('branch', ''),
        'cashier': payload.get('cashier', ''),
        'payer_name': payload.get('payer_name', ''),
        'payer_account': payload.get('payer_account', ''),
        'payer_national_id': payload.get('payer_national_id', ''),
        'receiver_name': payload.get('receiver_name', ''),
        'receiver_account': payload.get('receiver_account', ''),
        'receiver_national_id': payload.get('receiver_national_id', ''),
        'serial_no': payload.get('serial_no', '') or payload.get('number', ''),
        'reference_no': instrument.get('reference_no', '') or payload.get('reference_no', ''),
        'tracking_no': instrument.get('tracking_no', '') or payload.get('tracking_no', ''),
        'amount_boxes': _digit_boxes(payload.get('amount', '')),
        'date_boxes': _digit_boxes(payload.get('date', ''), size=14),
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

