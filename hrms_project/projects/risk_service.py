"""سرویس رجیستر ریسک (فاز ۳) — چرخهٔ وضعیت، بازنگری و اقدام‌های کاهش.

چرخهٔ وضعیت ریسک (قابل تست بدون دیتابیس):

    open       → mitigating | monitoring | accepted | occurred | closed
    mitigating → monitoring | occurred | closed | open
    monitoring → mitigating | occurred | accepted | closed
    occurred   → mitigating | monitoring | closed
    accepted   → monitoring | closed | open
    closed     → open

همهٔ تغییرهای وضعیت در `RiskReview` (تاریخچه) و `core.AuditLog` ثبت می‌شوند.
"""
from django.utils import timezone

from projects import audit, risk_engine
from projects.risk_models import Risk, RiskAction, RiskReview

RISK_TRANSITIONS = {
    Risk.Status.OPEN: {Risk.Status.MITIGATING, Risk.Status.MONITORING,
                       Risk.Status.ACCEPTED, Risk.Status.OCCURRED, Risk.Status.CLOSED},
    Risk.Status.MITIGATING: {Risk.Status.MONITORING, Risk.Status.OCCURRED,
                             Risk.Status.CLOSED, Risk.Status.OPEN},
    Risk.Status.MONITORING: {Risk.Status.MITIGATING, Risk.Status.OCCURRED,
                             Risk.Status.ACCEPTED, Risk.Status.CLOSED},
    Risk.Status.OCCURRED: {Risk.Status.MITIGATING, Risk.Status.MONITORING, Risk.Status.CLOSED},
    Risk.Status.ACCEPTED: {Risk.Status.MONITORING, Risk.Status.CLOSED, Risk.Status.OPEN},
    Risk.Status.CLOSED: {Risk.Status.OPEN},
}

ACTION_TRANSITIONS = {
    RiskAction.Status.PLANNED: {RiskAction.Status.IN_PROGRESS, RiskAction.Status.DONE,
                                RiskAction.Status.CANCELLED},
    RiskAction.Status.IN_PROGRESS: {RiskAction.Status.DONE, RiskAction.Status.CANCELLED,
                                    RiskAction.Status.PLANNED},
    RiskAction.Status.DONE: {RiskAction.Status.IN_PROGRESS},
    RiskAction.Status.CANCELLED: {RiskAction.Status.PLANNED},
}


def can_transition(current_status, target_status):
    """آیا گذار از وضعیت فعلی به وضعیت هدف مجاز است؟"""
    return target_status in RISK_TRANSITIONS.get(current_status, set())


def next_statuses(current_status):
    """وضعیت‌های ممکن بعدی (برای UI)."""
    return sorted(RISK_TRANSITIONS.get(current_status, set()))


def can_transition_action(current_status, target_status):
    return target_status in ACTION_TRANSITIONS.get(current_status, set())


def action_next_statuses(current_status):
    return sorted(ACTION_TRANSITIONS.get(current_status, set()))


def _user_or_none(user):
    return user if getattr(user, 'is_authenticated', False) else None


def user_display(user):
    """نام نمایشی کاربر برای ثبت در تاریخچه."""
    if not getattr(user, 'is_authenticated', False):
        return ''
    full = f'{getattr(user, "first_name", "")} {getattr(user, "last_name", "")}'.strip()
    return full or getattr(user, 'username', '') or ''


def recalculate_risk(risk, save=True):
    """بازمحاسبهٔ امتیاز/سطح/ارزش مورد انتظار و ریسک باقی‌مانده."""
    score = risk_engine.effective_score(
        risk.probability,
        [risk.impact_cost, risk.impact_time, risk.impact_quality, risk.impact_hse],
    )
    risk.score = score
    risk.level = risk_engine.level_of(score)
    risk.expected_cost = risk_engine.expected_cost(risk.cost_impact, risk.probability)
    if risk.residual_probability and risk.residual_impact:
        risk.residual_score = risk_engine.score_of(risk.residual_probability, risk.residual_impact)
    else:
        risk.residual_score = 0
    risk.residual_cost = risk_engine.residual_expected_cost(
        risk.cost_impact, risk.probability, risk.residual_probability,
    )
    if save:
        risk.save(update_fields=[
            'score', 'level', 'expected_cost', 'residual_score', 'residual_cost',
            'updated_at',
        ])
    return risk


def _log_review(risk, user, status, note='', date_value=None, next_review_date=None):
    """ثبت یک ردیف در تاریخچهٔ بازنگری ریسک."""
    return RiskReview.objects.create(
        company=risk.company,
        risk=risk,
        date=date_value or timezone.localdate(),
        reviewer=_user_or_none(user),
        reviewer_name=user_display(user),
        probability=risk.probability,
        impact=risk.impact_cost,
        score=risk.score,
        residual_score=risk.residual_score,
        status=status or risk.status,
        note=note or '',
        next_review_date=next_review_date or risk.review_date,
    )


def set_status(risk, user, target_status, note='', review_date=None):
    """تغییر وضعیت ریسک با اعتبارسنجی گذار + ثبت تاریخچه."""
    if not can_transition(risk.status, target_status):
        raise ValueError('تغییر وضعیت از وضعیت فعلی به حالت انتخاب‌شده مجاز نیست.')
    previous = risk.status
    risk.status = target_status
    if target_status == Risk.Status.CLOSED:
        risk.closed_date = timezone.localdate()
    if note:
        risk.note = (risk.note + '\n' if risk.note else '') + note
    recalculate_risk(risk, save=False)
    risk.save()
    _log_review(risk, user, target_status, note=note, next_review_date=review_date)
    audit.log_object(
        _user_or_none(user), risk, 'UPDATE',
        description=f'تغییر وضعیت ریسک {risk.number}: {previous} → {target_status}',
    )
    return risk


def add_review(risk, user, date_value=None, note='', probability=None, impact=None,
               residual_probability=None, residual_impact=None, next_review_date=None):
    """ثبت بازنگری دوره‌ای و به‌روزرسانی احتمال/شدت (در صورت ارسال)."""
    if probability is not None:
        risk.probability = risk_engine.clamp_scale(probability)
    if impact is not None:
        risk.impact_cost = risk_engine.clamp_scale(impact)
    if residual_probability is not None:
        risk.residual_probability = risk_engine.clamp_scale(residual_probability, 0)
    if residual_impact is not None:
        risk.residual_impact = risk_engine.clamp_scale(residual_impact, 0)
    if next_review_date is not None:
        risk.review_date = next_review_date
    recalculate_risk(risk, save=False)
    risk.save()
    review = _log_review(
        risk, user, risk.status, note=note, date_value=date_value,
        next_review_date=next_review_date,
    )
    audit.log_object(
        _user_or_none(user), risk, 'UPDATE',
        description=f'بازنگری ریسک {risk.number} (امتیاز {risk.score})',
    )
    return review


def set_action_status(action, user, target_status, date_value=None):
    """تغییر وضعیت یک اقدام کاهش/واکنش."""
    if not can_transition_action(action.status, target_status):
        raise ValueError('تغییر وضعیت این اقدام مجاز نیست.')
    action.status = target_status
    if target_status == RiskAction.Status.DONE:
        action.completed_at = date_value or timezone.localdate()
    else:
        action.completed_at = None
    action.save(update_fields=['status', 'completed_at', 'updated_at'])
    audit.log_object(
        _user_or_none(user), action, 'UPDATE',
        description=f'اقدام ریسک «{action.title}» → {target_status}',
    )
    return action


def complete_action(action, user, date_value=None):
    """بستن یک اقدام (انجام‌شده)."""
    return set_action_status(action, user, RiskAction.Status.DONE, date_value=date_value)


def project_risk_rows(project):
    """ردیف‌های تخت ریسک‌های یک پروژه برای موتور/KPI."""
    qs = Risk.objects.filter(project=project).select_related('category')
    return [risk_engine.risk_row(risk) for risk in qs]


def project_risk_kpis(project, today=None):
    """شاخص‌های کلیدی رجیستر ریسک پروژه (بر پایهٔ موتور خالص)."""
    rows = project_risk_rows(project)
    actions = list(
        RiskAction.objects.filter(risk__project=project).values(
            'id', 'status', 'due_date', 'cost',
        )
    )
    return risk_engine.risk_kpis(rows, today=today or timezone.localdate(), actions=actions)
