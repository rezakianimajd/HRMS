"""سرویس تغییر پروژه (فاز ۲) — چرخهٔ وضعیت و اعمال اثر هزینه/زمان.

چرخهٔ وضعیت (قابل تست بدون دیتابیس):

    draft      → submitted | cancelled
    submitted  → approved | rejected | cancelled
    approved   → applied | cancelled
    rejected   → draft
    cancelled  → draft
    applied    → (پایان)

اعمال تغییر تأییدشده: ایجاد ردیف‌های بودجه از خطوط تغییر (یا از اثر ریالی سرصفحه)،
تمدید تاریخ پایان پروژه بر پایهٔ اثر زمانی، و ساخت **الحاقیه** روی قرارداد مرتبط.
"""
from datetime import date, timedelta

from django.db import transaction
from django.utils import timezone

from projects import audit
from projects.change_models import ChangeOrder, ChangeOrderApproval

ALLOWED_TRANSITIONS = {
    'draft': {'submitted', 'cancelled'},
    'submitted': {'approved', 'rejected', 'cancelled'},
    'approved': {'applied', 'cancelled'},
    'rejected': {'draft'},
    'cancelled': {'draft'},
    'applied': set(),
}

APPROVAL_ACTIONS = {
    'submitted': ChangeOrderApproval.Action.SUBMITTED,
    'approved': ChangeOrderApproval.Action.APPROVED,
    'rejected': ChangeOrderApproval.Action.REJECTED,
    'applied': ChangeOrderApproval.Action.APPLIED,
    'cancelled': ChangeOrderApproval.Action.CANCELLED,
}


def can_transition(current_status, target_status):
    """آیا گذار از وضعیت فعلی به وضعیت هدف مجاز است؟"""
    return target_status in ALLOWED_TRANSITIONS.get(current_status, set())


def next_statuses(current_status):
    """وضعیت‌های ممکن بعدی (برای UI)."""
    return sorted(ALLOWED_TRANSITIONS.get(current_status, set()))


def _user_or_none(user):
    return user if getattr(user, 'is_authenticated', False) else None


def record_action(co, status, user=None, comment=''):
    ChangeOrderApproval.objects.create(
        company=co.company,
        change_order=co,
        action=APPROVAL_ACTIONS.get(status, ChangeOrderApproval.Action.SUBMITTED),
        actor=_user_or_none(user),
        actor_name=getattr(user, 'username', '') or '',
        comment=comment or '',
    )


def transition(co, target_status, user=None, comment=''):
    """تغییر وضعیت با اعتبارسنجی گذار مجاز."""
    if not can_transition(co.status, target_status):
        raise ValueError(
            f'گذار از وضعیت «{co.get_status_display()}» به این وضعیت مجاز نیست.'
        )
    co.status = target_status
    co.save(update_fields=['status', 'updated_at'])
    record_action(co, target_status, user, comment)
    audit.log_object(user, co, 'UPDATE', description=f'تغییر وضعیت → {target_status}')
    return co


def submit(co, user=None, comment=''):
    return transition(co, 'submitted', user, comment)


def decide(co, user=None, comment='', approve=True):
    """تصمیم روی تغییر ارسال‌شده (تأیید یا رد) با ثبت تصمیم‌گیرنده و تاریخ."""
    co.decided_by = _user_or_none(user)
    co.decided_date = date.today()
    if comment:
        co.decision_note = comment
    co.save(update_fields=['decided_by', 'decided_date', 'decision_note', 'updated_at'])
    return transition(co, 'approved' if approve else 'rejected', user, comment)


def cancel(co, user=None, comment=''):
    return transition(co, 'cancelled', user, comment)


@transaction.atomic
def apply_change_order(co, user=None, create_addendum=True):
    """اعمال تغییر تأییدشده: بودجه، زمان و (اختیاری) الحاقیهٔ قرارداد."""
    from projects.cost_models import BudgetLine

    if co.applied:
        raise ValueError('این تغییر قبلاً اعمال شده است.')
    if co.status != ChangeOrder.Status.APPROVED:
        raise ValueError('فقط تغییر «تأییدشده» قابل اعمال است.')

    user_obj = _user_or_none(user)
    lines = list(co.lines.all())
    budget_lines = []

    if lines:
        for line in lines:
            amount = line.amount or 0
            if not amount and line.quantity and line.unit_price:
                amount = float(line.quantity) * float(line.unit_price)
            budget_lines.append(BudgetLine.objects.create(
                company=co.company,
                project=co.project,
                wbs=line.wbs,
                cbs=line.cbs,
                cost_source=line.cost_source,
                description=line.description or f'{co.number} — {co.title}',
                quantity=line.quantity or 0,
                unit=line.unit or '',
                unit_cost=line.unit_price or 0,
                amount=amount,
                created_by=user_obj,
                updated_by=user_obj,
            ))
    elif float(co.cost_impact or 0):
        budget_lines.append(BudgetLine.objects.create(
            company=co.company,
            project=co.project,
            description=f'{co.number} — {co.title}',
            amount=co.cost_impact,
            created_by=user_obj,
            updated_by=user_obj,
        ))

    time_impact = float(co.time_impact_days or 0)
    if time_impact and co.project.end_date:
        co.project.end_date = co.project.end_date + timedelta(days=int(round(time_impact)))
        co.project.save(update_fields=['end_date', 'updated_at'])

    addendum = None
    if create_addendum and co.contract_id and float(co.cost_impact or 0):
        from contracts.models import Addendum

        addendum = Addendum.objects.create(
            company=co.company,
            contract=co.contract,
            number=f'CO-{co.number}',
            subject=co.title,
            date=co.decided_date or co.request_date or date.today(),
            amount_change=co.cost_impact,
            change_description=co.description or co.subject,
        )

    co.applied = True
    co.applied_at = timezone.now()
    co.applied_budget_line = budget_lines[0] if budget_lines else None
    co.created_addendum = addendum
    co.status = ChangeOrder.Status.APPLIED
    co.save(update_fields=[
        'applied', 'applied_at', 'applied_budget_line', 'created_addendum',
        'status', 'updated_at',
    ])
    record_action(co, 'applied', user, f'{len(budget_lines)} ردیف بودجه ایجاد شد.')
    audit.log_object(user, co, 'UPDATE', description='اعمال تغییر پروژه')

    return {
        'change_order': co.id,
        'number': co.number,
        'budget_lines': len(budget_lines),
        'time_impact_days': time_impact,
        'addendum_id': addendum.id if addendum else None,
        'status': co.status,
    }

