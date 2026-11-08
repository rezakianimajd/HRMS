"""گیت مجوز ماژول مکاتبات — مجوز ریز هر منو + سازگاری کامل با مجوزهای قدیمی.

لایهٔ مجوز پروژه ``<module>.<menu>.<action>`` است (``core.permission_catalog``)؛
منوهای ماژول مکاتبات: ``all / incoming / outgoing / internal / new / drafts /
referrals / overdue / archive / name-mapping / directory / settings``.

قواعد این ماژول:

1. اگر کاربر **هیچ** کد ریز مکاتباتی نداشته باشد (کاربران قدیمی که فقط نقش
   دارند)، همان رفتار قبلی ادامه می‌یابد (``module_action_granted``) تا کسی
   قفل نشود.
2. اگر کد ریز دارد، دقیقاً همان کدها اعمال می‌شوند و منوی مربوط به «جهت نامه»
   تعیین‌کننده است (مثلاً ``correspondence.incoming.edit`` فقط وارده را
   مجاز می‌کند).
3. نامهٔ «محرمانه/سری» فقط برای سازنده، تنظیم‌کننده، ارجاع‌شدگان و دارندگان
   مجوز تأیید/ویرایش قابل مشاهده است.
"""
from django.core.exceptions import PermissionDenied

MODULE = 'correspondence'

# منوهایی که «دیدن فهرست/نامه» را مجاز می‌کنند
READ_MENUS = (
    'all', 'incoming', 'outgoing', 'internal', 'drafts', 'referrals', 'overdue',
    'archive', 'dashboard',
)
# منوهایی که «ساخت/ویرایش» را مجاز می‌کنند
WRITE_MENUS = ('all', 'incoming', 'outgoing', 'internal', 'new', 'drafts')
# منوهای مرتبط با نگاشت نام‌ها و تعاریف
MAPPING_MENUS = ('name-mapping', 'settings', 'directory')

# منوهای هر «جهت» (به ترتیب اهمیت)
DIRECTION_MENUS = {
    'incoming': ('incoming', 'all', 'new', 'drafts'),
    'outgoing': ('outgoing', 'all', 'new', 'drafts'),
    'internal': ('internal', 'all', 'new', 'drafts'),
}

# نگاشت عمل ویو به کدهای مجوز (اولی خواستهٔ اصلی، بعدی‌ها سازگاری)
ACTION_FALLBACKS = {
    'view': ('view',),
    'create': ('create',),
    'edit': ('edit', 'create'),
    'delete': ('delete',),
    'approve': ('approve', 'edit'),
    'export': ('export', 'view'),
}

ACTION_LABELS = {
    'view': 'مشاهده',
    'create': 'ثبت',
    'edit': 'ویرایش',
    'delete': 'حذف',
    'approve': 'تأیید',
    'export': 'خروجی',
}

CONFIDENTIAL_LEVELS = ('confidential', 'secret')


def granted_codes(user):
    """کدهای ریز داده‌شده در ماژول مکاتبات (فقط True)."""
    if not user or not getattr(user, 'is_authenticated', False):
        return set()
    from core.engines.permission_engine import fine_permissions_for

    return {
        code for code, value in fine_permissions_for(user).items()
        if value and str(code).startswith(f'{MODULE}.')
    }


def menus_for_direction(direction, default=None):
    """منوهای مجاز برای یک جهت نامه."""
    menus = DIRECTION_MENUS.get(str(direction or ''))
    if menus:
        return menus
    return tuple(default or READ_MENUS)


def has_permission(user, action, menus=None, direction=None):
    """آیا کاربر «action» را روی یکی از این منوها دارد؟"""
    if not user or not getattr(user, 'is_authenticated', False):
        return False
    if getattr(user, 'is_superuser', False):
        return True

    wanted = ACTION_FALLBACKS.get(action, (action,))
    target_menus = tuple(menus) if menus else menus_for_direction(direction, READ_MENUS)
    codes = granted_codes(user)
    if codes:
        return any(
            f'{MODULE}.{menu}.{name}' in codes
            for menu in target_menus for name in wanted
        )

    # سازگاری: کاربران بدون کد ریز، از مجوزهای نقش/قدیمی استفاده می‌کنند
    from core.engines.permission_engine import module_action_granted

    return module_action_granted(user, MODULE, wanted)


def require(user, action, menus=None, direction=None, label=''):
    """PermissionDenied با پیام فارسی اگر مجوز نباشد."""
    if has_permission(user, action, menus=menus, direction=direction):
        return
    action_label = ACTION_LABELS.get(action, action)
    raise PermissionDenied(
        f'دسترسی غیرمجاز — برای {label or "مکاتبات"} مجوز «{action_label}» لازم است.',
    )


def employee_of(user):
    """شناسهٔ پرسنل متصل به کاربر (برای تطبیق ارجاع‌های پرسنلی)."""
    profile = getattr(user, 'profile', None)
    return getattr(profile, 'employee_id', None) if profile else None


def is_confidential(letter):
    return getattr(letter, 'confidentiality', 'normal') in CONFIDENTIAL_LEVELS


def referral_to_me_filter(user, employee_id=None, normalized_names=None):
    """شرط «این ارجاع به من است» (کاربر / پرسنل / ارجاع چندنفره / نام متنی)."""
    from django.db.models import Q

    user_id = getattr(user, 'pk', None)
    condition = Q(to_user_id=user_id) if user_id else Q(pk__in=[])
    if employee_id:
        condition |= Q(to_employee_id=employee_id) | Q(to_employees__id=employee_id)
    if normalized_names:
        condition |= Q(to_name__in=normalized_names)
    return condition


def my_name_variants(user, employee=None):
    """نام‌های نرمال‌شدهٔ کاربر/پرسنل برای تطبیق ارجاع‌های متنی."""
    from correspondences.matching import normalize_name

    variants = set()
    if employee is not None:
        variants.add(normalize_name(getattr(employee, 'full_name', '')))
    if user is not None:
        try:
            variants.add(normalize_name(user.get_full_name() or ''))
        except Exception:                              # noqa: BLE001 — کاربر سفارشی
            pass
        variants.add(normalize_name(getattr(user, 'username', '')))
    return {value for value in variants if value}


def can_read_confidential(user, letter):
    """آیا کاربر اجازهٔ دیدن نامهٔ محرمانه/سری را دارد؟"""
    if not is_confidential(letter):
        return True
    if not user or not getattr(user, 'is_authenticated', False):
        return False
    if getattr(user, 'is_superuser', False):
        return True
    for field in ('created_by_id', 'drafter_id', 'entered_by_id'):
        if getattr(letter, field, None) == user.id:
            return True

    from correspondences.models import LetterReferral

    if LetterReferral.objects.filter(
        referral_to_me_filter(user, employee_of(user)),
    ).filter(letter_id=letter.pk).exists():
        return True
    return has_permission(
        user, 'approve', menus=menus_for_direction(getattr(letter, 'direction', None)),
    )


def can_download_attachment(user, attachment):
    """آیا کاربر می‌تواند فایل پیوست را دریافت کند؟

    قاعده: محرمانگی رعایت شود و کاربر یا «ارجاع‌شدهٔ همان نامه» باشد یا مجوز
    «مشاهدهٔ» همان جهت را داشته باشد (تا کارتابل بدون دسترسی ماژول هم کار کند).
    """
    letter = getattr(attachment, 'letter', None)
    if letter is None:
        return False
    if not can_read_confidential(user, letter):
        return False
    if not user or not getattr(user, 'is_authenticated', False):
        return False
    if getattr(user, 'is_superuser', False):
        return True

    from correspondences.models import LetterReferral

    if LetterReferral.objects.filter(
        referral_to_me_filter(user, employee_of(user)),
    ).filter(letter_id=letter.pk).exists():
        return True
    return has_permission(
        user, 'view', menus=menus_for_direction(getattr(letter, 'direction', None)),
    )


def confidential_letter_filter(user, prefix=''):
    """شرط SQL «نامه‌های قابل مشاهده» (محرمانه‌ها فقط برای مجازها).

    ``prefix`` برای کوئری‌هایی است که از طریق FK به نامه می‌رسند
    (مثلاً ``letter__`` در ارجاعات و پیوست‌ها).
    """
    from django.db.models import Q

    condition = ~Q(**{f'{prefix}confidentiality__in': CONFIDENTIAL_LEVELS})
    if not user or not getattr(user, 'is_authenticated', False):
        return condition
    if getattr(user, 'is_superuser', False):
        return Q()
    for name in ('created_by_id', 'drafter_id', 'entered_by_id'):
        condition |= Q(**{f'{prefix}{name}': user.id})

    from correspondences.models import LetterReferral

    if has_permission(user, 'approve', menus=READ_MENUS):
        return Q()
    my_letters = LetterReferral.objects.filter(
        referral_to_me_filter(user, employee_of(user)),
    ).values('letter_id')
    condition |= Q(**{f'{prefix}pk__in': my_letters})
    return condition


# ---------------------------------------------------------------------------
# میکسین مجوز برای ویوست‌های مکاتبات
# ---------------------------------------------------------------------------

LETTER_MENUS_ALL = READ_MENUS
REQUESTS_MENUS = ('drafts', 'all', 'referrals', 'new', 'incoming', 'outgoing', 'internal')


class CorrespondencePermissionMixin:
    """گیت مجوز per-action برای ویوست‌های مکاتبات.

    ``permission_matrix``: ``{'<drf action>': ('<permission action>', '<scope>')}``
    که ``scope`` یکی از ``letters``، ``referrals``، ``attachments``،
    ``aliases``، ``requests``، ``fixed`` است. عمل‌های خارج از ماتریس آزادند
    (مثل ``cartable`` که دادهٔ شخصی است و خودش «مالِ من» را فیلتر می‌کند).
    """

    permission_matrix = {}
    permission_label = 'مکاتبات'
    fixed_menus = LETTER_MENUS_ALL

    # ------------------------------------------------------------------ کمکی
    def _letter_direction_for_request(self):
        """جهت نامهٔ هدف (برای انتخاب منوی مجوز) — یک کوئری سبک."""
        return None

    def _menus_for_current_action(self, scope, action):
        if scope == 'aliases':
            return MAPPING_MENUS
        if scope == 'requests':
            return REQUESTS_MENUS
        if scope == 'fixed':
            return self.fixed_menus
        if scope == 'letters':
            direction = None
            if self.action == 'list':
                direction = self.request.query_params.get('direction')
            elif self.action == 'create':
                payload = getattr(self.request, 'data', {}) or {}
                direction = payload.get('direction')
            else:
                direction = self._letter_direction_for_request()
            return menus_for_direction(direction)
        # referrals / attachments → همان منوهای نامه
        return menus_for_direction(self._letter_direction_for_request())

    def check_correspondence_permission(self, action, direction=None, menus=None):
        """چک دستی (برای اکشن‌هایی که GET/POST مشترک دارند)."""
        require(
            self.request.user, action,
            menus=menus or menus_for_direction(direction), label=self.permission_label,
        )

    # ------------------------------------------------------------------ گیت
    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        entry = self.permission_matrix.get(self.action)
        if not entry:
            return
        action, scope = entry
        require(
            request.user, action,
            menus=self._menus_for_current_action(scope, action),
            label=self.permission_label,
        )


class DefinitionPermissionMixin(CorrespondencePermissionMixin):
    """گیت سبک تعاریف مکاتبات (انواع، سری‌ها، مخاطبین).

    ویرایش/حذف تعاریف نیاز به مجوز «ویرایش/حذف» در منوهای تعاریف یا دفتر نامه‌ها
    دارد؛ فهرست و ساخت آن‌ها آزاد است تا فرم ثبت نامه و انتخابگرها کار کنند.
    """

    permission_label = 'تعاریف مکاتبات'
    fixed_menus = ('settings', 'directory', 'name-mapping') + WRITE_MENUS
    permission_matrix = {
        'update': ('edit', 'fixed'),
        'partial_update': ('edit', 'fixed'),
        'destroy': ('delete', 'fixed'),
    }
