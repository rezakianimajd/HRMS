"""ویوست‌های ماژول مکاتبات — بستهٔ تقسیم‌شده.

فایل یکپارچهٔ قبلی (``views.py``، ~۲٬۵۰۰ خط) به ماژول‌های زیر شکسته شد:

- ``base``        واردات/ثابت‌های مشترک، helperهای ارجاع و ``BaseLetterViewSet``
- ``legacy``      مدل‌های قدیمی (فقط-خواندنی)
- ``letters``     انواع/سری/مخاطبین + ویوست اصلی نامه‌ها
- ``referrals``   ارجاعات و کارتابل
- ``attachments`` پیوست‌ها و دانلود امن
- ``aliases``     نگاشت نام‌ها
- ``requests``    کارتابل درخواست‌ها

همهٔ نام‌های عمومی از همین‌جا re-export می‌شوند تا ``from correspondences.views
import LetterViewSet`` (و مسیرهای رشته‌ای مثل ``dev_query_profile``) بدون تغییر
کار کنند.
"""
from correspondences.views.base import (  # noqa: F401
    FINAL_STATUSES,
    JALALI_MONTHS,
    OPEN_REFERRAL_STATUSES,
    BaseLetterViewSet,
    _create_referral,
    _delete_media_file,
    _employee_of_user,
    _get_company,
    _log_event,
    _my_name_variants,
    _my_referral_filter,
    _raw_referral_names_for,
    _truthy,
    _user_employee,
    _user_name,
    _user_of_employee,
)
from correspondences.views.legacy import (  # noqa: F401
    AnnouncementViewSet,
    BaseCorrespondenceViewSet,
    FormViewSet,
    IncomingLetterViewSet,
    OrganizationViewSet,
    OrganizationalLetterViewSet,
    OutgoingLetterViewSet,
)
from correspondences.views.letters import (  # noqa: F401
    CorrespondentViewSet,
    LetterCategoryViewSet,
    LetterSeriesViewSet,
    LetterViewSet,
)
from correspondences.views.referrals import LetterReferralViewSet  # noqa: F401
from correspondences.views.attachments import LetterAttachmentViewSet  # noqa: F401
from correspondences.views.aliases import CorrespondenceNameAliasViewSet  # noqa: F401
from correspondences.views.requests import (  # noqa: F401
    LetterRequestTypeViewSet,
    LetterRequestViewSet,
)

__all__ = [
    'AnnouncementViewSet',
    'BaseCorrespondenceViewSet',
    'BaseLetterViewSet',
    'CorrespondenceNameAliasViewSet',
    'CorrespondentViewSet',
    'FormViewSet',
    'IncomingLetterViewSet',
    'LetterAttachmentViewSet',
    'LetterCategoryViewSet',
    'LetterReferralViewSet',
    'LetterRequestTypeViewSet',
    'LetterRequestViewSet',
    'LetterSeriesViewSet',
    'LetterViewSet',
    'OrganizationViewSet',
    'OrganizationalLetterViewSet',
    'OutgoingLetterViewSet',
    'JALALI_MONTHS',
    'FINAL_STATUSES',
    'OPEN_REFERRAL_STATUSES',
    '_create_referral',
    '_delete_media_file',
    '_employee_of_user',
    '_get_company',
    '_log_event',
    '_my_name_variants',
    '_my_referral_filter',
    '_raw_referral_names_for',
    '_truthy',
    '_user_employee',
    '_user_name',
    '_user_of_employee',
]
