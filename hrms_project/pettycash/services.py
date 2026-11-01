"""منطق مالی مشترک ماژول تنخواه (Petty Cash).

تمام کنترل‌های مالی سرورساید در این ماژول متمرکز شده‌اند تا فرانت‌اند تنها
نمایش‌دهنده باشد و از پراکندگی منطق جلوگیری شود:
  * کنترل دورهٔ مالی باز/بسته
  * کنترل سقف، مانده، اعتبار و وضعیت تنخواه
  * جلوگیری از دوباره‌شماری عملیات (کلید یکتا)
  * کنترل فاکتور تکراری، پیوست و روش پرداخت
  * محاسبهٔ شارژ مجدد و خلاصهٔ تسویه
  * ثبت لاگ عملیات حساس (AuditLog)
"""
from decimal import Decimal, InvalidOperation

from django.db import transaction as db_transaction
from django.db.models import Sum
from django.utils import timezone

from pettycash.models import (
    PettyCashFund, PettyCashSettings, PettyCashTransaction,
    PettyCashExpenseStatementLine,
)


class PettyCashError(Exception):
    """خطای منطق مالی تنخواه (پیام فارسی برای نمایش به کاربر)."""


def money(value):
    """تبدیل امن به Decimal با صفر پیش‌فرض."""
    if value in (None, ''):
        return Decimal('0')
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError):
        raise PettyCashError('مبلغ واردشده معتبر نیست.')


def get_settings(company):
    """تنظیمات تنخواه شرکت (در صورت نبود، مقدار پیش‌فرض ساخته می‌شود)."""
    if not company:
        raise PettyCashError('شرکت مشخص نیست.')
    obj, _ = PettyCashSettings.objects.get_or_create(company=company)
    return obj


def allowed_payment_methods(fund=None):
    """روش‌های پرداخت مجاز (اولویت: تنخواه، سپس تنظیمات شرکت)."""
    if fund is not None and fund.payment_methods:
        return list(fund.payment_methods)
    settings_obj = None
    if fund is not None and fund.company_id:
        try:
            settings_obj = get_settings(fund.company)
        except PettyCashError:
            settings_obj = None
    if settings_obj and settings_obj.payment_methods:
        return list(settings_obj.payment_methods)
    return [code for code, _label in PettyCashFund.PAYMENT_METHOD_CHOICES]


def assert_amount_positive(amount):
    amount = money(amount)
    if amount <= 0:
        raise PettyCashError('مبلغ باید بزرگ‌تر از صفر باشد.')
    return amount


def assert_period_open(company, date):
    """عملیات مالی در دورهٔ بسته/قفل‌شدهٔ حسابداری مجاز نیست."""
    if not company or not date:
        return
    from accounting.models import FiscalPeriod
    blocked = FiscalPeriod.objects.filter(
        company=company, start_date__lte=date, end_date__gte=date,
    ).exclude(status='open').first()
    if blocked:
        raise PettyCashError(
            f'دورهٔ مالی «{blocked.code}» بسته یا قفل است؛ ثبت عملیات در تاریخ {date} مجاز نیست.'
        )


def assert_fund_usable(fund, date=None):
    """تنخواه باید فعال و در بازهٔ اعتبار باشد."""
    if fund is None:
        raise PettyCashError('تنخواه انتخاب نشده است.')
    if fund.status != PettyCashFund.Status.ACTIVE:
        raise PettyCashError(f'تنخواه «{fund.title}» فعال نیست ({fund.get_status_display()}).')
    date = date or timezone.localdate()
    if fund.start_date and date < fund.start_date:
        raise PettyCashError('تاریخ عملیات قبل از شروع اعتبار تنخواه است.')
    if fund.end_date and date > fund.end_date:
        raise PettyCashError('تاریخ عملیات بعد از پایان اعتبار تنخواه است.')



def assert_payment_method_allowed(fund, method):
    if not method:
        return 'cash'
    if method not in allowed_payment_methods(fund):
        raise PettyCashError('این روش پرداخت برای تنخواه مجاز نیست.')
    return method


def assert_project_allowed(fund, project_id):
    if not project_id:
        return
    allowed = list(fund.allowed_projects.values_list('id', flat=True))
    if allowed and int(project_id) not in allowed:
        raise PettyCashError('این پروژه برای تنخواه مجاز نیست.')


def assert_cost_center_allowed(fund, cost_center_id):
    if not cost_center_id:
        return
    allowed = list(fund.allowed_cost_centers.values_list('id', flat=True))
    if allowed and int(cost_center_id) not in allowed:
        raise PettyCashError('این مرکز هزینه برای تنخواه مجاز نیست.')


def assert_account_allowed(fund, account_id):
    if not account_id:
        return
    allowed = list(fund.allowed_accounts.values_list('id', flat=True))
    if allowed and int(account_id) not in allowed:
        raise PettyCashError('این سرفصل هزینه برای تنخواه مجاز نیست.')


def fund_balance(fund):
    """ماندهٔ نقد تنخواه (بدون تراکنش‌های ابطال‌شده)."""
    live = PettyCashTransaction.objects.filter(fund=fund, is_void=False)
    credits = live.filter(entry_type='credit').aggregate(s=Sum('amount'))['s'] or Decimal('0')
    debits = live.filter(entry_type='debit').aggregate(s=Sum('amount'))['s'] or Decimal('0')
    return (fund.opening_balance or Decimal('0')) + credits - debits


def assert_payment_allowed(fund, amount, date=None):
    """کنترل پرداخت: سقف هر پرداخت، مانده و سقف تنخواه."""
    amount = assert_amount_positive(amount)
    settings_obj = get_settings(fund.company)
    if settings_obj.max_single_payment and amount > settings_obj.max_single_payment:
        raise PettyCashError(
            f'مبلغ پرداخت از سقف مجاز هر پرداخت ({settings_obj.max_single_payment}) بیشتر است.'
        )
    balance = fund_balance(fund)
    if not settings_obj.allow_negative_balance and amount > balance:
        raise PettyCashError(
            f'ماندهٔ تنخواه کافی نیست (مانده: {balance} ریال، درخواست: {amount} ریال).'
        )
    return amount


def assert_charge_allowed(fund, amount):
    """کنترل شارژ/دریافت: مجموع اعتبار از سقف تنخواه بیشتر نشود."""
    amount = assert_amount_positive(amount)
    limit = fund.limit
    if limit is not None and fund_balance(fund) + amount > limit:
        raise PettyCashError(f'شارژ پیشنهادی از سقف تنخواه ({limit} ریال) عبور می‌کند.')
    return amount


def find_duplicate_invoice(company, invoice_number, supplier='', exclude_line_id=None):
    """فاکتور تکراری در همان شرکت (شمارهٔ فاکتور + فروشنده)."""
    invoice_number = (invoice_number or '').strip()
    if not invoice_number:
        return None
    qs = PettyCashExpenseStatementLine.objects.filter(
        company=company, invoice_number=invoice_number, statement__is_deleted=False,
    )
    if supplier:
        qs = qs.filter(supplier__iexact=supplier.strip())
    if exclude_line_id:
        qs = qs.exclude(pk=exclude_line_id)
    return qs.select_related('statement').first()


def next_number(company, date, model, prefix='PC'):
    """شماره‌گذاری خوانا بر اساس شرکت و سال: PREFIX-YYYY-0001."""
    year = (date or timezone.localdate()).year
    stem = f'{prefix}-{year}-'
    last = (
        model.objects.filter(company=company, number__startswith=stem)
        .order_by('-number').values_list('number', flat=True).first()
    )
    seq = 1
    if last:
        try:
            seq = int(str(last).split('-')[-1]) + 1
        except (TypeError, ValueError):
            seq = model.objects.filter(company=company, number__startswith=stem).count() + 1
    return f'{stem}{seq:04d}'


def next_statement_number(company, date=None):
    from pettycash.models import PettyCashExpenseStatement
    prefix = get_settings(company).number_prefix or 'PC'
    return next_number(company, date, PettyCashExpenseStatement, f'{prefix}-EXP')


def next_request_number(company, date=None):
    from pettycash.models import PettyCashRequest
    prefix = get_settings(company).number_prefix or 'PC'
    return next_number(company, date, PettyCashRequest, f'{prefix}-REQ')


def next_settlement_number(company, date=None):
    from pettycash.models import PettyCashSettlement
    prefix = get_settings(company).number_prefix or 'PC'
    return next_number(company, date, PettyCashSettlement, f'{prefix}-STL')


# ---------------------------------------------------------------------------
# عملیات مالی
# ---------------------------------------------------------------------------
def audit(action, obj, user=None, description='', changes=None):
    """ثبت لاگ عملیات حساس (بی‌صدا در صورت خطا)."""
    try:
        from core.models.audit_log import AuditLog
        AuditLog.objects.create(
            user=user if getattr(user, 'is_authenticated', False) else None,
            company=getattr(obj, 'company', None),
            action=action,
            model_name=obj.__class__.__name__,
            object_id=str(getattr(obj, 'pk', '') or ''),
            changes=changes or {},
            description=description,
        )
    except Exception:  # noqa: BLE001 — لاگ نباید عملیات مالی را بشکند
        pass



def register_movement(
    *, fund, entry_type, amount, title, date, user=None,
    description='', statement=None, settlement=None, request=None,
    payment_method=None, project=None, cost_center=None, counterparty='',
    reference='', receipt=None, unique_key='',
):
    """ثبت حرکت مالی تنخواه با تمام کنترل‌های سرورساید و کلید یکتا.

    entry_type: credit (دریافت/شارژ) یا debit (هزینه/پرداخت).
    """
    amount = assert_amount_positive(amount)
    date = date or timezone.localdate()
    if fund.company_id is None:
        raise PettyCashError('تنخواه به شرکت متصل نیست.')
    assert_period_open(fund.company, date)
    assert_fund_usable(fund, date)
    method = assert_payment_method_allowed(fund, payment_method)
    if entry_type == PettyCashTransaction.EntryType.DEBIT:
        assert_payment_allowed(fund, amount, date)
    else:
        assert_charge_allowed(fund, amount)

    if unique_key:
        existing = PettyCashTransaction.objects.filter(
            company_id=fund.company_id, unique_key=unique_key,
        ).first()
        if existing:
            # عملیات قبلاً ثبت شده است؛ همان رکورد برگردانده می‌شود (idempotent)
            return existing, False

    with db_transaction.atomic():
        tx = PettyCashTransaction.objects.create(
            company_id=fund.company_id,
            fund=fund,
            entry_type=entry_type,
            amount=amount,
            title=title,
            date=date,
            description=description or '',
            statement=statement,
            settlement=settlement,
            payment_method=method,
            project=project,
            cost_center=cost_center,
            counterparty=counterparty or '',
            reference=reference or '',
            receipt=receipt,
            unique_key=unique_key or '',
            created_by=user if getattr(user, 'is_authenticated', False) else None,
        )
    audit('CREATE', tx, user=user, description=f'ثبت حرکت تنخواه: {title}')
    try:
        from accounting.integrations import enqueue_pettycash_transaction
        enqueue_pettycash_transaction(fund.company, tx)
    except Exception:  # noqa: BLE001 — نبود صف حسابداری نباید ثبت را بشکند
        pass
    return tx, True


def statement_debit_key(statement):
    return f'statement:{statement.pk}:debit'


def apply_statement_to_fund(statement, user=None):
    """کسر هزینهٔ صورت از تنخواه — تنها نقطهٔ مجاز این عملیات (idempotent)."""
    from pettycash.models import PettyCashExpenseStatement
    key = statement_debit_key(statement)
    existing = PettyCashTransaction.objects.filter(
        company_id=statement.company_id, unique_key=key,
    ).first()
    if not existing:
        # سازگاری با رکوردهای قدیمی/مسیر حسابداری که کلید یکتا ندارند
        existing = (
            PettyCashTransaction.objects
            .filter(company_id=statement.company_id, statement=statement, entry_type='debit', is_void=False)
            .first()
        )
    if not existing:
        existing = (
            PettyCashTransaction.objects
            .filter(
                company_id=statement.company_id, fund_id=statement.fund_id,
                entry_type='debit', is_void=False, date=statement.date,
                amount=statement.total,
                title=f'صورت هزینه {statement.number or statement.pk}',
            )
            .first()
        )
    if existing:
        if existing.unique_key != key:
            existing.statement = statement
            existing.unique_key = key
            existing.save(update_fields=['statement', 'unique_key', 'updated_at'])
        if statement.status != PettyCashExpenseStatement.Status.POSTED:
            statement.status = PettyCashExpenseStatement.Status.POSTED
            statement.save(update_fields=['status', 'updated_at'])
        return existing, False
    total = statement.total
    if total <= 0:
        raise PettyCashError('صورت هزینه فاقد مبلغ است.')
    tx, created = register_movement(
        fund=statement.fund,
        entry_type=PettyCashTransaction.EntryType.DEBIT,
        amount=total,
        title=f'صورت هزینه {statement.number or statement.pk}',
        date=statement.date,
        user=user,
        description=statement.description,
        statement=statement,
        payment_method=statement.payment_method,
        project=statement.project,
        cost_center=statement.cost_center,
        unique_key=key,
    )
    if created:
        statement.status = PettyCashExpenseStatement.Status.POSTED
        statement.save(update_fields=['status', 'updated_at'])
    return tx, created



def void_movement(tx, user, reason=''):
    """ابطال (نه حذف) حرکت مالی با ثبت علت و کاربر."""
    if tx.is_void:
        raise PettyCashError('این حرکت قبلاً ابطال شده است.')
    if not (reason or '').strip():
        raise PettyCashError('علت ابطال الزامی است.')
    assert_period_open(tx.company, tx.date)
    with db_transaction.atomic():
        tx.is_void = True
        tx.voided_at = timezone.now()
        tx.voided_by = user if getattr(user, 'is_authenticated', False) else None
        tx.void_reason = reason.strip()
        tx.save(update_fields=['is_void', 'voided_at', 'voided_by', 'void_reason', 'updated_at'])
    audit('UPDATE', tx, user=user, description=f'ابطال حرکت مالی: {reason.strip()}')
    return tx



# ---------------------------------------------------------------------------
# اعتبارسنجی صورت هزینه
# ---------------------------------------------------------------------------
def validate_statement_for_submission(statement):
    """کنترل‌های پیش از ارسال/ثبت صورت هزینه (سمت سرور)."""
    settings_obj = get_settings(statement.company)
    assert_period_open(statement.company, statement.date)
    assert_fund_usable(statement.fund, statement.date)
    lines = list(statement.lines.select_related('account').all())
    if not lines:
        raise PettyCashError('صورت هزینه باید حداقل یک سطر داشته باشد.')
    total = Decimal('0')
    for line in lines:
        if (line.debit or Decimal('0')) <= 0:
            raise PettyCashError(f'مبلغ سطر {line.line_no} باید بزرگ‌تر از صفر باشد.')
        assert_account_allowed(statement.fund, line.account_id)
        assert_project_allowed(statement.fund, line.project_id)
        assert_cost_center_allowed(statement.fund, line.cost_center_id)
        if settings_obj.require_attachment and not line.has_document:
            raise PettyCashError(f'سطر {line.line_no}: پیوست فاکتور/رسید الزامی است.')
        if settings_obj.require_invoice_number and not (line.invoice_number or '').strip():
            raise PettyCashError(f'سطر {line.line_no}: شمارهٔ فاکتور الزامی است.')
        if line.invoice_number:
            dup = find_duplicate_invoice(
                statement.company, line.invoice_number, line.supplier, exclude_line_id=line.pk,
            )
            if dup:
                raise PettyCashError(
                    f'فاکتور شمارهٔ {line.invoice_number} قبلاً در صورت '
                    f'{dup.statement.number or dup.statement_id} ثبت شده است.'
                )
        if line.net_amount is not None:
            expected = (
                (line.net_amount or Decimal('0'))
                + (line.vat_amount or Decimal('0'))
                + (line.tax_amount or Decimal('0'))
            )
            if expected != (line.debit or Decimal('0')):
                raise PettyCashError(
                    f'سطر {line.line_no}: مبلغ خالص + مالیات و عوارض باید برابر مبلغ کل باشد.'
                )
        total += line.debit or Decimal('0')
    if settings_obj.max_single_payment and total > settings_obj.max_single_payment:
        raise PettyCashError(
            f'مبلغ صورت از سقف مجاز هر پرداخت ({settings_obj.max_single_payment} ریال) بیشتر است.'
        )
    assert_payment_allowed(statement.fund, total, statement.date)
    return total


def assert_segregation(settings_obj, submitter_id, actor, action_label='تأیید'):
    """تفکیک وظایف: ثبت‌کننده/ارسال‌کننده نتواند خودش تأیید/ثبت نهایی کند."""
    if not settings_obj or not settings_obj.enforce_segregation_of_duties:
        return
    actor_id = getattr(actor, 'id', None)
    if actor_id and submitter_id and int(actor_id) == int(submitter_id):
        raise PettyCashError(
            f'تفکیک وظایف: ثبت‌کننده/ارسال‌کننده نمی‌تواند خودش {action_label} کند.'
        )



# ---------------------------------------------------------------------------
# تسویه و شارژ مجدد
# ---------------------------------------------------------------------------
def settlement_summary(fund, statements, cash_counted=0):
    """خلاصهٔ مالی تسویه: هزینه‌های تأییدشده/ردشده، کسری، اضافه و شارژ مجدد."""
    from pettycash.models import PettyCashExpenseStatement as St
    cash_counted = money(cash_counted)
    approved = [s for s in statements if s.status in (St.Status.APPROVED, St.Status.POSTED)]
    rejected = [s for s in statements if s.status == St.Status.REJECTED]
    pending = [
        s for s in statements
        if s.status not in (St.Status.APPROVED, St.Status.POSTED, St.Status.REJECTED)
    ]
    expenses_total = sum((s.total for s in approved), Decimal('0'))
    rejected_total = sum((s.total for s in rejected), Decimal('0'))
    pending_total = sum((s.total for s in pending), Decimal('0'))
    book_balance = fund_balance(fund)
    difference = cash_counted - book_balance
    target = fund.target_amount if fund.kind == PettyCashFund.Kind.IMPREST else Decimal('0')
    recharge = min(expenses_total, target) if target else Decimal('0')
    return {
        'cash_counted': float(cash_counted),
        'expenses_total': float(expenses_total),
        'rejected_total': float(rejected_total),
        'pending_total': float(pending_total),
        'book_balance': float(book_balance),
        'returned_amount': float(min(cash_counted, book_balance)) if cash_counted > 0 else 0.0,
        'shortage': float(abs(difference)) if difference < 0 else 0.0,
        'overage': float(difference) if difference > 0 else 0.0,
        'recharge_amount': float(recharge),
        'target_amount': float(target),
        'approved_count': len(approved),
        'rejected_count': len(rejected),
        'pending_count': len(pending),
    }


def imprest_status(fund):
    """وضعیت تنخواه ثابت: نقد + اسناد تأییدشدهٔ تسویه‌نشده = مبلغ ثابت؟"""
    from django.db.models import Sum as _Sum
    from pettycash.models import PettyCashExpenseStatement as St
    cash = fund_balance(fund)
    unsettled = (
        fund.expense_statements
        .filter(status__in=(St.Status.APPROVED, St.Status.POSTED), settled_at__isnull=True, is_deleted=False)
        .aggregate(s=_Sum('lines__debit'))['s'] or Decimal('0')
    )
    target = fund.target_amount
    covered = cash + unsettled
    is_balanced = abs(covered - target) < Decimal('0.5') if target else True
    near_limit = bool(fund.limit and cash >= fund.limit * Decimal('0.9'))
    return {
        'kind': fund.kind,
        'target_amount': float(target),
        'cash_balance': float(cash),
        'unsettled_documents': float(unsettled),
        'covered_total': float(covered),
        'difference': float(covered - target),
        'is_balanced': bool(is_balanced),
        'is_near_limit': near_limit,
    }


def overdue_statements(company, as_of=None):
    """صورت‌های تسویه‌نشدهٔ گذشته از مهلت (برای هشدار و گزارش)."""
    from pettycash.models import PettyCashExpenseStatement as St
    as_of = as_of or timezone.localdate()
    qs = (
        St.objects.filter(company=company, is_deleted=False, settled_at__isnull=True)
        .exclude(status__in=(St.Status.DRAFT, St.Status.REJECTED))
        .select_related('fund', 'custodian')
        .prefetch_related('lines')
    )
    result = []
    for st in qs:
        due = st.due_date or (st.date + timezone.timedelta(days=st.fund.settlement_days or 30))
        if due < as_of:
            result.append({
                'id': st.pk,
                'number': st.number or st.pk,
                'fund': st.fund.title,
                'custodian': st.custodian.full_name if st.custodian else '',
                'due_date': due.isoformat(),
                'days_late': (as_of - due).days,
                'total': float(st.total),
                'status': st.status,
            })
    result.sort(key=lambda row: row['days_late'], reverse=True)
    return result

