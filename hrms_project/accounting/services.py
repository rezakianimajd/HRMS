"""KIAN EBP — Accounting service layer.

This is where financial rules live (NOT in serializers or React). The service
layer is deliberately thin but centralises:
  * double-entry validation
  * posting lifecycle
  * period-lock enforcement
  * duplicate source prevention
  * reversal / corrective semantics
"""
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError


class AccountingError(Exception):
    """Raised for business-rule violations that must not silently proceed."""


def _dec(v):
    return Decimal(str(v or 0))


class DocumentValidator:
    """Validates an AccountingDocument before submit/post."""

    def __init__(self, document):
        self.document = document

    def validate_balance(self):
        debit = sum(_dec(l.debit) for l in self.document.lines.all())
        credit = sum(_dec(l.credit) for l in self.document.lines.all())
        if debit != credit:
            raise AccountingError(
                f"سند نامتوازن است: بدهکار {debit} ≠ بستانکار {credit}"
            )
        return debit, credit

    def validate_period_open(self):
        period = self.document.period
        if period and period.status in ('closed', 'locked'):
            raise AccountingError('ثبت در دورهٔ بسته یا قفل‌شده مجاز نیست.')
        year = self.document.fiscal_year
        if year and year.status in ('closed', 'locked'):
            raise AccountingError('ثبت در سال مالی بسته یا قفل‌شده مجاز نیست.')

    def validate_lines(self):
        for line in self.document.lines.all():
            if not line.account.is_active:
                raise AccountingError(f'حساب {line.account.code} غیرفعال است.')
            if not line.account.is_postable:
                raise AccountingError(f'حساب {line.account.code} قابل سندخور نیست.')
            if line.account.requires_cost_center and not line.cost_center:
                raise AccountingError(f'مرکز هزینه برای حساب {line.account.code} الزامی است.')
            if line.account.requires_project and not line.project:
                raise AccountingError(f'پروژه برای حساب {line.account.code} الزامی است.')
            if line.account.requires_contract and not line.contract:
                raise AccountingError(f'قرارداد برای حساب {line.account.code} الزامی است.')
            if line.account.requires_party and not line.auxiliary:
                raise AccountingError(f'طرف/تفصیلی برای حساب {line.account.code} الزامی است.')
            if line.account.requires_employee and not line.employee:
                raise AccountingError(f'پرسنل برای حساب {line.account.code} الزامی است.')

    def validate_draft_editable(self):
        if self.document.is_locked:
            raise AccountingError('سند قفل‌شده است و قابل ویرایش نیست.')
        if self.document.status in ('posted', 'locked'):
            raise AccountingError('سند ثبت/قفل‌شده قابل ویرایش مستقیم نیست.')

    def validate_no_lines(self):
        if not self.document.lines.exists():
            raise AccountingError('سند بدون سطر است.')


class PostingService:
    """Lifecycle: draft → submitted → approved → posted (→ reversed)."""

    def __init__(self, document, user=None):
        self.document = document
        self.user = user
        self.validator = DocumentValidator(document)

    def submit(self):
        self.validator.validate_draft_editable()
        self.validator.validate_no_lines()
        self.validator.validate_balance()
        self.document.status = 'submitted'
        self.document.submitted_by = self.user
        self.document.submitted_at = timezone.now()
        self.document.save()

    def approve(self):
        if self.document.status != 'submitted':
            raise AccountingError('فقط سندِ «در انتظار تأیید» را می‌توان تأیید کرد.')
        self.validator.validate_balance()
        self.document.status = 'approved'
        self.document.approved_by = self.user
        self.document.save()

    def post(self):
        if self.document.status not in ('approved', 'submitted'):
            raise AccountingError('سند ابتدا باید تأیید شود (یا حداقل ارسال).')
        self.validator.validate_balance()
        self.validator.validate_period_open()
        self.validator.validate_lines()
        self.document.status = 'posted'
        self.document.posted_by = self.user
        self.document.posted_at = timezone.now()
        self.document.is_locked = True
        self.document.save()

    def lock(self):
        if self.document.status != 'posted':
            raise AccountingError('فقط سند ثبت‌شده را می‌توان قفل کرد.')
        self.document.status = 'locked'
        self.document.is_locked = True
        self.document.save()

    def reverse(self):
        """برگشت سند: ساخت سند قرینه (بدهکار/بستانکار جابه‌جا) با وضعیت posted."""
        if self.document.status not in ('posted', 'locked'):
            raise AccountingError('فقط سند ثبت‌شده قابل برگشت است.')
        from accounting.models import AccountingDocument, AccountingDocumentLine

        with transaction.atomic():
            reversal = AccountingDocument.objects.create(
                company_id=self.document.company_id,
                branch=self.document.branch,
                journal=self.document.journal,
                fiscal_year=self.document.fiscal_year,
                period=self.document.period,
                date=self.document.date,
                description=f'برگشت {self.document.number or self.document.pk}: {self.document.description}',
                status='posted',
                source_module=self.document.source_module,
                source_type='reversal',
                source_id=f'{self.document.source_id or self.document.pk}-rev',
                is_locked=True,
                posted_by=self.user,
                posted_at=timezone.now(),
                reversed_from=self.document,
            )
            for line in self.document.lines.all():
                AccountingDocumentLine.objects.create(
                    document=reversal,
                    account=line.account,
                    auxiliary=line.auxiliary,
                    line_no=line.line_no,
                    description=line.description,
                    debit=line.credit,   # swapped
                    credit=line.debit,   # swapped
                    currency=line.currency,
                    exchange_rate=line.exchange_rate,
                    base_amount=line.base_amount,
                    reference=line.reference,
                    cost_center=line.cost_center,
                    project=line.project,
                    contract=line.contract,
                    employee=line.employee,
                    company_id=self.document.company_id,
                )
            self.document.status = 'reversed'
            self.document.save()
            return reversal


class SourcePostingService:
    """Idempotent posting from a source transaction via a template."""

    def __init__(self, source_transaction, template, fiscal_year, period, user=None):
        self.source = source_transaction
        self.template = template
        self.fiscal_year = fiscal_year
        self.period = period
        self.user = user

    def _resolve_amount(self, expression, payload):
        expr = (expression or '').strip()
        if not expr:
            return Decimal('0')
        # dotted path lookup e.g. "amount" or "nested.amount"
        val = payload
        for part in expr.split('.'):
            if isinstance(val, dict) and part in val:
                val = val[part]
            else:
                return Decimal('0')
        try:
            return Decimal(str(val))
        except Exception:
            return Decimal('0')

    def preview(self):
        """Preview generated lines without persisting."""
        lines = []
        payload = self.source.payload or {}
        for tl in self.template.lines.order_by('line_no'):
            lines.append({
                'account': tl.account_id,
                'account_code': tl.account.code,
                'side': tl.side,
                'amount': self._resolve_amount(tl.amount_expression, payload),
            })
        return lines

    def post(self):
        """Generate the accounting document (idempotent by source)."""
        from accounting.models import AccountingDocument, AccountingDocumentLine

        existing = AccountingDocument.objects.filter(
            company_id=self.source.company_id,
            source_module=self.source.source_module,
            source_id=self.source.source_id,
        ).first()
        if existing:
            raise AccountingError('سند برای این تراکنش منبع از قبل ایجاد شده است.')

        lines = self.preview()
        debit = sum(_dec(l['amount']) for l in lines if l['side'] == 'debit')
        credit = sum(_dec(l['amount']) for l in lines if l['side'] == 'credit')
        if debit != credit:
            raise AccountingError(f'قالب ثبت نامتوازن است: بدهکار {debit} ≠ بستانکار {credit}')

        with transaction.atomic():
            doc = AccountingDocument.objects.create(
                company_id=self.source.company_id,
                journal=self.template.journal,
                fiscal_year=self.fiscal_year,
                period=self.period,
                date=self.source.created_at.date(),
                description=self.template.name,
                status='posted',
                source_module=self.source.source_module,
                source_type=self.source.source_type,
                source_id=self.source.source_id,
                is_locked=True,
                posted_by=self.user,
                posted_at=timezone.now(),
            )
            for i, l in enumerate(lines):
                AccountingDocumentLine.objects.create(
                    document=doc,
                    account_id=l['account'],
                    line_no=i + 1,
                    debit=l['amount'] if l['side'] == 'debit' else 0,
                    credit=l['amount'] if l['side'] == 'credit' else 0,
                    base_amount=l['amount'],
                    company_id=self.source.company_id,
                )
            self.source.status = 'processed'
            self.source.save()
            return doc
