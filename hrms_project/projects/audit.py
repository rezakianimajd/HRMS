"""ردیابی حسابرسی ماژول پروژه (Phase 0).

بازاستفاده از helper متمرکز موجود (`treasury/audit.py`) تا همهٔ تغییرات مالی
در یک `core.AuditLog` واحد ثبت شوند: «چه کسی، چه زمانی، چه چیزی، از چه مقداری
به چه مقداری».
"""
from treasury.audit import log as _log

# مدل‌هایی که تغییرشان حسابرسی می‌شود
AUDITED_MODELS = (
    'BudgetLine',
    'CommittedCost',
    'CostTransaction',
    'CostTransactionLine',
    'ProgressStatement',
    'ProgressStatementItem',
)

# فیلدهای مالی/کلیدی که مقدار قبلی و جدیدشان ثبت می‌شود
TRACKED_FIELDS = (
    'amount', 'net_amount', 'gross', 'net_payable', 'retention',
    'insurance', 'tax', 'adjustment', 'quantity', 'unit_cost', 'unit_price',
    'description', 'date', 'project_id', 'wbs_id', 'cbs_id', 'contract_id',
    'cost_source_id', 'is_approved', 'number',
)


def _snapshot(instance):
    data = {}
    for field in TRACKED_FIELDS:
        value = getattr(instance, field, None)
        if value is not None:
            data[field] = str(value) if not isinstance(value, (int, float, bool)) else value
    return data


def log_object(user, instance, action, changes=None, description=''):
    """ثبت یک رکورد حسابرسی برای نمونهٔ مدل پروژه."""
    model_name = instance.__class__.__name__
    return _log(
        user,
        getattr(instance, 'company', None),
        action,
        model_name,
        getattr(instance, 'pk', None),
        changes if changes is not None else _snapshot(instance),
        description or f'{model_name} #{getattr(instance, "pk", "—")} → {action}',
    )


def diff(before, after):
    """تفاوت دو snapshot — فقط فیلدهای تغییرکرده."""
    out = {}
    for key, new_value in after.items():
        old_value = before.get(key)
        if old_value != new_value:
            out[key] = {'from': old_value, 'to': new_value}
    return out
