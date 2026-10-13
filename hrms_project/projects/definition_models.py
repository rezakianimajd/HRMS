"""تعاریف اولیهٔ پروژه — نگاشت «حساب کل/معین» و «تفصیل‌ها» به پروژه یا نوع پروژه.

هر پروژه ممکن است ماهیت متفاوتی داشته باشد (عمرانی، بازرگانی، خدماتی، تولیدی و ...)،
بنابراین محل ثبت هزینه/درآمد آن نیز تفاوت دارد. در این ماژول برای هر «آیتم» (هزینه،
مصالح، دستمزد، درآمد، تضمین و ...) تعیین می‌شود:

* روی کدام **حساب معین** (و در نتیجه کدام **حساب کل**) بنشیند،
* **تفصیل‌ها** (تفصیل یک/دو/سه) از چه منبعی پر شوند — مثلاً تفصیل پروژهٔ همین سند،
  تفصیل طرف حساب یا تفصیل قرارداد — و اگر موجود نبودند ساخته شوند.

حوزهٔ تعریف می‌تواند «نوع پروژه» (الگو برای همهٔ پروژه‌های آن نوع) یا «پروژهٔ خاص»
(جایگزین/تخصیص) باشد؛ در زمان ثبت، تعریف پروژه‌ای بر تعریف نوع پروژه اولویت دارد.
"""
from django.core.exceptions import ValidationError
from django.db import models
from django.utils.translation import gettext_lazy as _

from core.models.base_model import BaseModel


class ProjectAccountDefinition(BaseModel):
    """تعریف نگاشت حسابداری برای یک آیتم پروژه (هزینه/درآمد/...)."""

    class Kind(models.TextChoices):
        EXPENSE = 'expense', _('هزینه عمومی')
        MATERIAL = 'material', _('مصالح / انبار')
        LABOR = 'labor', _('دستمزد / پیمانکار جزء')
        MACHINERY = 'machinery', _('ماشین‌آلات و تجهیزات')
        TRANSPORT = 'transport', _('حمل و نقل')
        OVERHEAD = 'overhead', _('سربار و هزینه‌های عمومی')
        REVENUE = 'revenue', _('درآمد / صورت‌وضعیت')
        ADVANCE = 'advance', _('پیش‌پرداخت')
        RETENTION = 'retention', _('حسن انجام کار')
        INSURANCE = 'insurance', _('بیمه')
        TAX = 'tax', _('مالیات و عوارض')
        GUARANTEE = 'guarantee', _('تضمین')
        PETTY_CASH = 'petty_cash', _('تنخواه')
        PAYROLL = 'payroll', _('حقوق و دستمزد')
        OTHER = 'other', _('سایر')

    code = models.CharField(max_length=50, verbose_name=_('کد تعریف'))
    title = models.CharField(max_length=200, verbose_name=_('عنوان تعریف'))
    kind = models.CharField(
        max_length=20, choices=Kind.choices, default=Kind.EXPENSE,
        verbose_name=_('نوع آیتم'),
    )
    description = models.TextField(blank=True, verbose_name=_('توضیحات'))

    # حوزهٔ تعریف: نوع پروژه (الگو) یا پروژهٔ خاص (جایگزین)
    project_type = models.ForeignKey(
        'projects.ProjectType', on_delete=models.PROTECT, null=True, blank=True,
        related_name='account_definitions', verbose_name=_('نوع پروژه'),
    )
    project = models.ForeignKey(
        'projects.Project', on_delete=models.CASCADE, null=True, blank=True,
        related_name='account_definitions', verbose_name=_('پروژه'),
    )

    general_account = models.ForeignKey(
        'accounting.Account', on_delete=models.PROTECT, null=True, blank=True,
        related_name='+', verbose_name=_('حساب کل'),
    )
    subsidiary_account = models.ForeignKey(
        'accounting.Account', on_delete=models.PROTECT, null=True, blank=True,
        related_name='+', verbose_name=_('حساب معین'),
    )
    cost_center = models.ForeignKey(
        'accounting.CostCenter', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name=_('مرکز هزینه'),
    )
    auto_create_auxiliaries = models.BooleanField(
        default=True, verbose_name=_('ساخت خودکار تفصیل‌ها'),
        help_text=_('اگر تفصیل مورد نیاز (پروژه/طرف/قرارداد) موجود نباشد، ساخته شود.'),
    )
    sort_order = models.PositiveSmallIntegerField(default=0, verbose_name=_('ترتیب نمایش'))

    class Meta:
        verbose_name = _('تعریف حسابداری پروژه')
        verbose_name_plural = _('تعاریف حسابداری پروژه')
        ordering = ['sort_order', 'code']
        indexes = [
            models.Index(fields=['company', 'project_type']),
            models.Index(fields=['company', 'project']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['company', 'project_type', 'code'],
                condition=models.Q(project__isnull=True),
                name='uniq_proj_def_type_code',
            ),
            models.UniqueConstraint(
                fields=['company', 'project', 'code'],
                condition=models.Q(project_type__isnull=True),
                name='uniq_proj_def_project_code',
            ),
        ]

    def __str__(self):
        scope = self.project.name if self.project_id else (
            self.project_type.name if self.project_type_id else 'بی‌موضوع'
        )
        return f'{self.code} - {self.title} ({scope})'

    # ------------------------------------------------------------------ کمکی‌ها
    @property
    def scope(self):
        if self.project_id:
            return 'project'
        if self.project_type_id:
            return 'project_type'
        return 'none'

    @property
    def scope_label(self):
        return {'project': 'پروژه', 'project_type': 'نوع پروژه'}.get(self.scope, '—')

    def subsidiary_is_under_general(self):
        """آیا معین زیرمجموعهٔ (در هر عمقی) حساب کل انتخابی است؟"""
        if not (self.general_account_id and self.subsidiary_account_id):
            return True
        node = self.subsidiary_account
        for _ in range(20):
            if node is None:
                return False
            if node.pk == self.general_account_id:
                return True
            node = node.parent
        return False

    def coding_problems(self):
        """هشدارهای کیفی نگاشت (نمایش در فرم و پاسخ API)."""
        problems = []
        if not self.subsidiary_account_id:
            problems.append('حساب معین انتخاب نشده است؛ ثبت سند روی این تعریف ممکن نیست.')
        elif self.general_account_id and not self.subsidiary_is_under_general():
            problems.append('حساب معین انتخابی زیرمجموعهٔ حساب کل انتخاب‌شده نیست.')
        elif not self.general_account_id:
            problems.append('حساب کل انتخاب نشده است.')
        if not self.auxiliary_rules.exists():
            problems.append('هیچ تفصیلی برای این تعریف مشخص نشده است.')
        return problems

    def clean(self):
        if self.project_id and self.project_type_id:
            raise ValidationError({
                'project': _('فقط یکی از «نوع پروژه» یا «پروژه» را به‌عنوان حوزهٔ تعریف انتخاب کنید.'),
            })
        if not self.project_id and not self.project_type_id:
            raise ValidationError({
                'project_type': _('حوزهٔ تعریف الزامی است: یا «نوع پروژه» یا «پروژه».'),
            })
        if self.general_account_id and self.subsidiary_account_id \
                and not self.subsidiary_is_under_general():
            raise ValidationError({
                'subsidiary_account': _('حساب معین انتخابی زیرمجموعهٔ حساب کل انتخاب‌شده نیست.'),
            })


class ProjectAccountDefinitionAux(BaseModel):
    """تفصیل‌های یک تعریف: در هر اسلات (۱..۳) منبع تفصیل مشخص می‌شود."""

    class Source(models.TextChoices):
        NONE = 'none', _('بدون تفصیل')
        PROJECT = 'project', _('پروژهٔ همین سند')
        PARTY = 'party', _('طرف حساب / پیمانکار')
        SUPPLIER = 'supplier', _('تأمین‌کننده')
        CONTRACT = 'contract', _('قرارداد')
        EMPLOYEE = 'employee', _('پرسنل')
        BANK = 'bank', _('بانک')
        CASH = 'cash', _('صندوق')
        FIXED = 'fixed', _('تفصیل ثابت')

    definition = models.ForeignKey(
        ProjectAccountDefinition, on_delete=models.CASCADE, related_name='auxiliary_rules',
        verbose_name=_('تعریف'),
    )
    slot = models.PositiveSmallIntegerField(
        default=1, verbose_name=_('اسلات تفصیل'),
        help_text=_('تفصیل یک = ۱، تفصیل دو = ۲، تفصیل سه = ۳'),
    )
    source = models.CharField(
        max_length=20, choices=Source.choices, default=Source.NONE, verbose_name=_('منبع تفصیل'),
    )
    category = models.ForeignKey(
        'accounting.AuxiliaryCategory', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name=_('دسته‌بندی تفصیلی'),
    )
    auxiliary = models.ForeignKey(
        'accounting.AuxiliaryAccount', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='+', verbose_name=_('تفصیل ثابت'),
    )
    auto_create = models.BooleanField(
        default=True, verbose_name=_('ساخت خودکار'),
        help_text=_('اگر تفصیل متناظر پیدا نشد، به‌صورت خودکار ساخته شود.'),
    )

    class Meta:
        verbose_name = _('تفصیل تعریف حسابداری')
        verbose_name_plural = _('تفصیل‌های تعریف حسابداری')
        ordering = ['slot']
        unique_together = [('definition', 'slot')]

    def __str__(self):
        return f'{self.definition_id} / تفصیل {self.slot} → {self.get_source_display()}'

    def clean(self):
        if self.slot not in (1, 2, 3):
            raise ValidationError({'slot': _('شمارهٔ اسلات تفصیل باید ۱، ۲ یا ۳ باشد.')})
        if self.source == self.Source.FIXED and not self.auxiliary_id:
            raise ValidationError({'auxiliary': _('برای «تفصیل ثابت» انتخاب تفصیل الزامی است.')})
