"""قواعد گذار گردش‌کار اسناد کنترل‌شده.

این قواعد عمداً کوچک و صریح نگه داشته شده‌اند تا رفتار سند قابل پیش‌بینی
باشد و از تبدیل شدن به یک موتور BPM پیچیده جلوگیری شود.
"""
from documents.models import ManagedDocument

WorkflowStatus = ManagedDocument.WorkflowStatus

WORKFLOW_TRANSITIONS = {
    WorkflowStatus.DRAFT: {WorkflowStatus.IN_REVIEW},
    WorkflowStatus.REJECTED: {WorkflowStatus.IN_REVIEW},
    WorkflowStatus.IN_REVIEW: {
        WorkflowStatus.APPROVED,
        WorkflowStatus.REJECTED,
    },
    WorkflowStatus.APPROVED: {
        WorkflowStatus.PUBLISHED,
        WorkflowStatus.WITHDRAWN,
    },
    WorkflowStatus.PUBLISHED: {
        WorkflowStatus.DRAFT,
        WorkflowStatus.WITHDRAWN,
        WorkflowStatus.SUPERSEDED,
    },
    WorkflowStatus.WITHDRAWN: {
        WorkflowStatus.DRAFT,
        WorkflowStatus.ARCHIVED,
    },
    WorkflowStatus.SUPERSEDED: {WorkflowStatus.ARCHIVED},
    WorkflowStatus.ARCHIVED: {WorkflowStatus.DRAFT},
}


def available_transitions(status):
    """وضعیت‌های مقصد مجاز از وضعیت فعلی."""
    return sorted(WORKFLOW_TRANSITIONS.get(status, set()))


def valid_workflow_targets():
    return set(WorkflowStatus.values)


def can_transition(current, target):
    return target in WORKFLOW_TRANSITIONS.get(current, set())
