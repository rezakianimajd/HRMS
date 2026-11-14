"""کنترل دسترسی و محرمانگی ماژول تنخواه.

قاعده‌ها:
  * **مدیر ارشد سیستم** (`is_superuser`, `is_staff` یا نقش `super_admin`) همهٔ تنخواه‌ها
    را می‌بیند.
  * کاربرانی که در تنظیمات تنخواه به‌عنوان «مدیر ارشد ناظر» معرفی شده‌اند همه را
    می‌بینند.
  * **تنخواه‌دار**: فقط تنخواه‌هایی که تنخواه‌دار آن‌هاست + تنخواه‌های صریحاً تخصیص‌یافته.
  * **کمک‌تنخواه‌دار**: تنخواه‌های تخصیص‌یافته + تنخواه‌های تنخواه‌دار مسئول.
  * سایر کاربران (بدون تعریف در «تعاریف اولیهٔ تنخواه‌داران») هیچ تنخواهی نمی‌بینند؛
    حتی اگر مجوز ماژول داشته باشند یا تنظیم «محدودسازی دسترسی» خاموش باشد.

توابع این ماژول تنها نقطهٔ تعیین دامنهٔ دید هستند تا در همهٔ ویوها یکسان اعمال شود.
"""
from django.db.models import Q

from core.models.user import UserProfile

from pettycash.models import (
    PettyCashCustodian, PettyCashExpenseStatement, PettyCashFund,
    PettyCashRequest, PettyCashSettlement, PettyCashSettings, PettyCashTransaction,
)


def user_profile(user):
    if not user or not getattr(user, 'is_authenticated', False):
        return None
    try:
        return user.profile
    except Exception:  # noqa: BLE001 — پروفایل ممکن است وجود نداشته باشد
        return None


def user_employee_id(user):
    profile = user_profile(user)
    return getattr(profile, 'employee_id', None) if profile else None


def user_role(user):
    profile = user_profile(user)
    if profile is not None:
        return profile.role
    return UserProfile.Role.SUPER_ADMIN if getattr(user, 'is_superuser', False) else UserProfile.Role.EMPLOYEE


def get_settings(company):
    if not company:
        return None
    obj, _created = PettyCashSettings.objects.get_or_create(company=company)
    return obj


def is_senior_manager(user, company=None):
    """آیا کاربر مجاز به دیدن همهٔ تنخواه‌های شرکت است؟"""
    if not user or not getattr(user, 'is_authenticated', False):
        return False
    if getattr(user, 'is_superuser', False) or getattr(user, 'is_staff', False):
        return True
    if user_role(user) == UserProfile.Role.SUPER_ADMIN:
        return True
    settings_obj = get_settings(company) if company is not None else None
    if settings_obj is None:
        return False
    ids = [str(value) for value in (settings_obj.senior_manager_ids or [])]
    return str(getattr(user, 'pk', '')) in ids


def assignments_for_user(company, user):
    """تعریف‌های تنخواه‌داری مرتبط با کاربر (بر اساس کاربر یا پروندهٔ پرسنلی)."""
    if not user or not company:
        return PettyCashCustodian.objects.none()
    employee_id = user_employee_id(user)
    condition = Q(user=user)
    if employee_id:
        condition |= Q(employee_id=employee_id)
    return (
        PettyCashCustodian.objects
        .filter(company=company)
        .filter(condition)
        .select_related('employee', 'supervisor', 'supervisor__employee')
    )


def accessible_fund_ids(company, user):
    """شناسهٔ تنخواه‌های قابل مشاهده برای کاربر.

    قاعدهٔ سخت‌گیرانه (مستقل از تنظیمات): هر کاربر غیرمدیر ارشد فقط تنخواه‌هایی را
    می‌بیند که در «تعاریف اولیهٔ تنخواه‌داران» به او تخصیص داده شده یا تنخواه‌دار آن است.
    `None` یعنی دسترسی کامل (مدیر ارشد)، مجموعهٔ خالی یعنی هیچ تنخواهی.

    اگر برای یک تنخواه‌دار در تعاریف، لیست «تنخواه‌های مجاز» پر شده باشد همان لیست
    مبنا است؛ اگر خالی باشد همهٔ تنخواه‌هایی که تنخواه‌دار آن‌هاست.
    """
    if not company:
        return set()
    if is_senior_manager(user, company):
        return None

    assignments = list(assignments_for_user(company, user))
    if not assignments:
        return set()

    fund_ids = set()
    for assignment in assignments:
        assigned_ids = set(assignment.funds.values_list('id', flat=True))
        supervisor = assignment.supervisor
        if assignment.role == PettyCashCustodian.Role.ASSISTANT:
            fund_ids.update(assigned_ids)
            if supervisor is not None:
                supervisor_funds = set(supervisor.funds.values_list('id', flat=True))
                if supervisor_funds:
                    fund_ids.update(supervisor_funds)
                elif supervisor.employee_id:
                    fund_ids.update(
                        PettyCashFund.objects
                        .filter(company=company, custodian_id=supervisor.employee_id)
                        .values_list('id', flat=True)
                    )
            continue
        if assigned_ids:
            fund_ids.update(assigned_ids)
        elif assignment.employee_id:
            fund_ids.update(
                PettyCashFund.objects
                .filter(company=company, custodian_id=assignment.employee_id)
                .values_list('id', flat=True)
            )
    return fund_ids


def can_view_all(company, user):
    return accessible_fund_ids(company, user) is None


def has_module_role(company, user):
    """آیا کاربر در ماژول تنخواه تعریف شده است (تنخواه‌دار/کمک‌تنخواه‌دار)؟"""
    return assignments_for_user(company, user).exists()


def can_create_expense(company, user):
    """ثبت صورت هزینه: مدیر ارشد یا تنخواه‌دار/کمک‌تنخواه‌داری که در تعاریف اجازه دارد.

    تنظیم «محدودسازی دسترسی» نمی‌تواند این قاعده را دور بزند؛ کاربری که در تعاریف
    تنخواه‌داران نیست، حتی با مجوز ماژول، اجازهٔ ثبت ندارد.
    """
    if is_senior_manager(user, company):
        return True
    return assignments_for_user(company, user).filter(can_create_expense=True).exists()


def can_approve(company, user):
    settings_obj = get_settings(company) if company else None
    if settings_obj and not settings_obj.restrict_visibility:
        return True
    if is_senior_manager(user, company):
        return True
    return assignments_for_user(company, user).filter(can_approve=True).exists()


def can_view_reports(company, user):
    settings_obj = get_settings(company) if company else None
    if settings_obj and not settings_obj.restrict_visibility:
        return True
    if is_senior_manager(user, company):
        return True
    return assignments_for_user(company, user).filter(can_view_reports=True).exists()


def scope_funds(qs, company, user):
    """محدودسازی کوئری تنخواه‌ها به دامنهٔ دید کاربر."""
    fund_ids = accessible_fund_ids(company, user)
    if fund_ids is None:
        return qs
    return qs.filter(id__in=list(fund_ids))


def scope_by_fund(qs, company, user, field='fund_id'):
    """محدودسازی کوئری‌های وابسته به تنخواه (تراکنش، صورت هزینه)."""
    fund_ids = accessible_fund_ids(company, user)
    if fund_ids is None:
        return qs
    if not fund_ids:
        return qs.none()
    return qs.filter(**{f'{field}__in': list(fund_ids)})


def scope_by_custodian(qs, company, user, field='custodian_id', extra_field='fund_id'):
    """محدودسازی بر اساس تنخواه‌دار برای رکوردهایی که ممکن است تنخواه نداشته باشند."""
    fund_ids = accessible_fund_ids(company, user)
    if fund_ids is None:
        return qs
    employee_ids = {a.employee_id for a in assignments_for_user(company, user)}
    if not fund_ids and not employee_ids:
        return qs.none()
    condition = Q()
    if fund_ids:
        condition |= Q(**{f'{extra_field}__in': list(fund_ids)})
    if employee_ids:
        condition |= Q(**{f'{field}__in': list(employee_ids)})
    return qs.filter(condition).distinct() if condition else qs.none()


def scope_queryset(qs, company, user, model=None):
    """انتخاب خودکار نوع محدودسازی بر اساس مدل."""
    model = model or getattr(qs, 'model', None)
    if model is PettyCashFund:
        return scope_funds(qs, company, user)
    if model in (PettyCashTransaction, PettyCashExpenseStatement):
        return scope_by_fund(qs, company, user)
    if model in (PettyCashRequest, PettyCashSettlement):
        return scope_by_custodian(qs, company, user)
    return qs

