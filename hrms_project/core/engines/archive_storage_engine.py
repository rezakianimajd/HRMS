"""
Archive Storage Engine — سامانهٔ حرفه‌ای بایگانی فایل بر اساس ماژول.

ساختار پوشه‌ها روی سرور:
    {MEDIA_ROOT}/{archive_prefix}/company_{company_id}/{module_folder}/{entity_folder}/{sub_folder}

مثال:
    /var/www/hrms/media/archive/company_1/employees/1001_احمدی/مدارک هویتی/
    /var/www/hrms/media/archive/company_1/contracts/CT-2024-015/اسناد قرارداد/

ویژگی‌ها:
  * نام‌گذاری امن پوشه‌ها (فارسی‌پسند + حذف کاراکترهای غیرمجاز فایل‌سیستم).
  * الگوی نام پوشهٔ موجودیت با قالب‌بندی (مثلاً «{code}_{name}» یا شمارهٔ قرارداد).
  * جلوگیری از تکرار نام (اگر پوشه وجود داشت، پسوند _2، _3 ... می‌گیرد).
  * ساخت خودکار زیرپوشه‌های استاندارد هر ماژول.
  * گزارش حجم و تعداد فایل هر پوشه/ماژول بر اساس پیمایش واقعی دیسک.
  * محافظت از path traversal (همهٔ مسیرها داخل MEDIA_ROOT محدود می‌شوند).
"""
from __future__ import annotations

import os
import re
import shutil
from datetime import datetime
from pathlib import Path

from django.conf import settings

# کاراکترهای غیرمجاز در نام فایل/پوشه (ویندوز + لینوکس + کنترل‌کاراکترها)
_ILLEGAL_CHARS = re.compile(r'[\\/:*?"<>|\x00-\x1f]')
_MULTI_UNDERSCORE = re.compile(r'_{2,}')
_MULTI_SPACE = re.compile(r'\s{2,}')

# نام‌های رزرو‌شده که در ویندوز/شبکه مشکل‌ساز هستند
_RESERVED_NAMES = {
    'CON', 'PRN', 'AUX', 'NUL',
    *(f'COM{i}' for i in range(1, 10)),
    *(f'LPT{i}' for i in range(1, 10)),
}

MAX_FOLDER_NAME_LEN = 120


class ArchiveStorageError(Exception):
    """خطای عملیات بایگانی (مسیر نامعتبر، عدم دسترسی و ...)."""


class _SafeDict(dict):
    """dict مقاوم برای format_map: کلید ناموجود → رشتهٔ خالی."""

    def __missing__(self, key):
        return ''


class ArchiveStorageEngine:
    """مدیریت ساختار پوشه‌ها و بایگانی فایل‌ها به‌ازای ماژول و موجودیت."""

    def __init__(self, archive_prefix: str = 'archive'):
        self.archive_prefix = self.sanitize(archive_prefix) or 'archive'

    # ------------------------------------------------------------------ #
    # مسیرهای پایه
    # ------------------------------------------------------------------ #
    @property
    def media_root(self) -> str:
        """ریشهٔ مدیا؛ اگر تنظیم نشده باشد به BASE_FILE_STORAGE_PATH برمی‌گردد."""
        root = getattr(settings, 'MEDIA_ROOT', None) or getattr(
            settings, 'BASE_FILE_STORAGE_PATH', '/var/hr_data/'
        )
        return str(root)

    @property
    def archive_root(self) -> str:
        """ریشهٔ پوشهٔ بایگانی: {MEDIA_ROOT}/{archive_prefix}"""
        return os.path.join(self.media_root, self.archive_prefix)

    def company_root(self, company_id, include_company: bool = True) -> str:
        """ریشهٔ بایگانی شرکت: .../archive/company_{id} (در صورت فعال بودن)."""
        if not include_company:
            return self.archive_root
        return os.path.join(self.archive_root, f'company_{company_id}')

    def module_path(self, company_id, root_folder: str, include_company: bool = True) -> str:
        """مسیر پوشهٔ یک ماژول در بایگانی شرکت."""
        root = self.sanitize(root_folder) or 'misc'
        return os.path.join(self.company_root(company_id, include_company), root)

    def entity_path(
        self, company_id, root_folder: str, entity_label: str,
        include_company: bool = True,
    ) -> str:
        """مسیر پوشهٔ یک موجودیت (پرسنل/قرارداد/...) داخل پوشهٔ ماژول."""
        folder = self.sanitize(entity_label) or 'unnamed'
        return os.path.join(
            self.module_path(company_id, root_folder, include_company), folder
        )

    # ------------------------------------------------------------------ #
    # امن‌سازی نام‌ها
    # ------------------------------------------------------------------ #
    @staticmethod
    def sanitize(value, *, fallback: str = '') -> str:
        """
        نام ورودی را به یک نام امن پوشه/فایل تبدیل می‌کند.

        * کاراکترهای غیرمجاز حذف می‌شوند.
        * فاصله‌ها و نیم‌فاصله به «_» تبدیل می‌شوند.
        * نقطه‌های ابتدا/انتها و «..» حذف می‌شوند (جلوگیری از پیمایش مسیر).
        * نام‌های رزرو‌شدهٔ ویندوز پسوند «_» می‌گیرند.
        """
        if value is None:
            return fallback
        text = str(value).strip()
        text = text.replace('\u200c', '_')
        text = _ILLEGAL_CHARS.sub('', text)
        text = re.sub(r'[\s\u3000]+', '_', text)
        text = _MULTI_SPACE.sub('_', text)
        text = _MULTI_UNDERSCORE.sub('_', text)
        text = text.replace('..', '')
        text = text.strip('._')
        if not text:
            return fallback
        if text.split('.')[0].upper() in _RESERVED_NAMES:
            text = f'{text}_'
        if len(text) > MAX_FOLDER_NAME_LEN:
            text = text[:MAX_FOLDER_NAME_LEN].rstrip('._')
        return text

    @classmethod
    def render_pattern(cls, pattern: str, context: dict) -> str:
        """
        الگوی نام پوشه را با مقادیر موجودیت پر می‌کند.
        مثال: render_pattern('{code}_{name}', {'code': '1001', 'name': 'احمدی'})
              → '1001_احمدی'
        """
        if not pattern:
            return ''
        try:
            filled = pattern.format_map(_SafeDict(context or {}))
        except Exception:
            filled = pattern
        filled = re.sub(r'_+', '_', filled)
        filled = re.sub(r'-+', '-', filled)
        return filled.strip('_- .')


    # ------------------------------------------------------------------ #
    # ساخت پوشه‌ها
    # ------------------------------------------------------------------ #
    @staticmethod
    def _ensure_dir(path: str) -> str:
        try:
            Path(path).mkdir(parents=True, exist_ok=True)
        except OSError as exc:
            raise ArchiveStorageError(f'ساخت پوشه ناموفق بود: {path} ({exc})') from exc
        return path

    def ensure_company_structure(self, company_id, include_company: bool = True) -> str:
        """ساخت ریشهٔ بایگانی شرکت."""
        return self._ensure_dir(self.company_root(company_id, include_company))

    def ensure_module_folder(
        self, company_id, root_folder: str, include_company: bool = True
    ) -> str:
        """ساخت پوشهٔ یک ماژول (در صورت نبود)."""
        return self._ensure_dir(self.module_path(company_id, root_folder, include_company))

    def unique_entity_path(self, base_path: str) -> str:
        """اگر مسیر وجود داشت، با پسوند _2/_3 یک مسیر یکتا برمی‌گرداند."""
        if not os.path.exists(base_path):
            return base_path
        counter = 2
        while True:
            candidate = f'{base_path}_{counter}'
            if not os.path.exists(candidate):
                return candidate
            counter += 1

    def ensure_entity_folder(
        self,
        company_id,
        root_folder: str,
        entity_label: str,
        subfolders=None,
        include_company: bool = True,
        unique: bool = False,
    ) -> dict:
        """
        ساخت (یا بازگرداندن) پوشهٔ یک موجودیت به‌همراه زیرپوشه‌های استاندارد.

        Args:
            unique: اگر True و پوشه وجود داشته باشد، مسیر جدید با پسوند می‌سازد
                    (برای موجودیت‌های هم‌نام مثل دو پرسنل با نام یکسان).
        Returns:
            dict: relative_path, absolute_path, folder, created, subfolders
        """
        base = self.entity_path(company_id, root_folder, entity_label, include_company)
        target = base
        exists = os.path.exists(base)

        if unique and exists:
            target = self.unique_entity_path(base)
            exists = False

        created = not exists
        self._ensure_dir(target)

        created_subs = []
        for sub in (subfolders or []):
            safe_sub = self.sanitize(sub)
            if not safe_sub:
                continue
            sub_path = os.path.join(target, safe_sub)
            if not os.path.exists(sub_path):
                self._ensure_dir(sub_path)
                created_subs.append(safe_sub)

        return {
            'relative_path': os.path.relpath(target, self.media_root),
            'absolute_path': target,
            'folder': os.path.basename(target),
            'created': created,
            'subfolders': created_subs,
        }

    def ensure_profile_structure(self, company_id, profile) -> dict:
        """
        ساخت کل ساختار یک StorageProfile:
          ریشهٔ شرکت → پوشهٔ ماژول → زیرپوشه‌های پیش‌فرض ماژول.
        """
        include_company = getattr(profile, 'include_company', True)
        self.ensure_company_structure(company_id, include_company)
        module_dir = self.ensure_module_folder(
            company_id, profile.root_folder, include_company
        )

        created = []
        for sub in (getattr(profile, 'subfolders', None) or []):
            safe_sub = self.sanitize(sub)
            if not safe_sub:
                continue
            sub_path = os.path.join(module_dir, safe_sub)
            if not os.path.exists(sub_path):
                self._ensure_dir(sub_path)
                created.append(safe_sub)

        return {
            'module_path_relative': os.path.relpath(module_dir, self.media_root),
            'module_path_absolute': module_dir,
            'created_subfolders': created,
        }

    # ------------------------------------------------------------------ #
    # گزارش‌گیری
    # ------------------------------------------------------------------ #
    @staticmethod
    def dir_size(path: str) -> tuple:
        """بازگرداندن (حجم کل بایت، تعداد فایل) یک پوشه به‌صورت بازگشتی."""
        total = 0
        count = 0
        if not os.path.isdir(path):
            return 0, 0
        for root, _dirs, files in os.walk(path):
            for fname in files:
                try:
                    total += os.path.getsize(os.path.join(root, fname))
                    count += 1
                except OSError:
                    continue
        return total, count

    def list_entity_folders(self, company_id, profile) -> list:
        """فهرست پوشه‌های موجودیت‌های یک ماژول روی دیسک + حجم/تعداد فایل."""
        include_company = getattr(profile, 'include_company', True)
        module_dir = self.module_path(company_id, profile.root_folder, include_company)

        if not os.path.isdir(module_dir):
            return []

        reserved = {self.sanitize(s) for s in (getattr(profile, 'subfolders', None) or [])}
        rows = []
        for name in sorted(os.listdir(module_dir)):
            full = os.path.join(module_dir, name)
            if not os.path.isdir(full):
                continue
            size, files = self.dir_size(full)
            rows.append({
                'folder': name,
                'is_standard_subfolder': name in reserved,
                'relative_path': os.path.relpath(full, self.media_root),
                'size_bytes': size,
                'file_count': files,
                'modified': datetime.fromtimestamp(os.path.getmtime(full)).isoformat(),
            })
        return rows

    def module_stats(self, company_id, profile) -> dict:
        """آمار یک ماژول: حجم کل، تعداد موجودیت‌ها، تعداد فایل‌ها."""
        folders = self.list_entity_folders(company_id, profile)
        entities = [f for f in folders if not f['is_standard_subfolder']]
        return {
            'folder_count': len(entities),
            'file_count': sum(f['file_count'] for f in folders),
            'total_size': sum(f['size_bytes'] for f in folders),
            'folders': folders,
        }

    def overview(self, company_id, profiles, include_company: bool = True) -> dict:
        """آمار کل بایگانی شرکت در همهٔ ماژول‌ها."""
        company_dir = self.company_root(company_id, include_company)
        total_size, total_files = self.dir_size(company_dir)
        modules = []
        for profile in profiles:
            stats = self.module_stats(company_id, profile)
            modules.append({
                'module_key': getattr(profile, 'module_key', ''),
                'module_name': getattr(profile, 'module_name', ''),
                'root_folder': getattr(profile, 'root_folder', ''),
                'folder_count': stats['folder_count'],
                'file_count': stats['file_count'],
                'total_size': stats['total_size'],
            })
        return {
            'archive_root': self.archive_root,
            'company_path': os.path.relpath(company_dir, self.media_root),
            'total_size': total_size,
            'total_files': total_files,
            'module_count': len(modules),
            'modules': modules,
        }

    # ------------------------------------------------------------------ #
    # عملیات فایل
    # ------------------------------------------------------------------ #
    def save_file(
        self,
        uploaded_file,
        company_id,
        root_folder: str,
        entity_label: str,
        subfolder: str = '',
        include_company: bool = True,
        filename: str = '',
    ) -> dict:
        """ذخیرهٔ فایل ارسالی در پوشهٔ موجودیت با نام یکتا."""
        target_dir = self.entity_path(company_id, root_folder, entity_label, include_company)
        if subfolder:
            target_dir = os.path.join(target_dir, self.sanitize(subfolder))
        self._ensure_dir(target_dir)

        original = filename or getattr(uploaded_file, 'name', 'file')
        safe_name = self.sanitize(Path(original).stem) or 'file'
        ext = Path(original).suffix
        unique = f'{safe_name}_{datetime.now():%Y%m%d%H%M%S}{ext}'
        full_path = os.path.join(target_dir, unique)

        with open(full_path, 'wb+') as dest:
            for chunk in uploaded_file.chunks():
                dest.write(chunk)

        return {
            'relative_path': os.path.relpath(full_path, self.media_root),
            'absolute_path': full_path,
            'filename': unique,
            'original_filename': original,
            'size': os.path.getsize(full_path),
        }

    def delete_folder(self, relative_path: str) -> bool:
        """حذف یک پوشه (محدود به داخل MEDIA_ROOT)."""
        absolute = self.resolve(relative_path)
        if not os.path.isdir(absolute):
            return False
        try:
            shutil.rmtree(absolute)
            return True
        except OSError:
            return False

    def resolve(self, relative_path: str) -> str:
        """
        تبدیل مسیر نسبی به مطلق و اطمینان از این‌که داخل MEDIA_ROOT می‌ماند
        (محافظت از path traversal).
        """
        root = os.path.abspath(self.media_root)
        absolute = os.path.abspath(
            os.path.join(root, str(relative_path or '').lstrip('/\\'))
        )
        if absolute != root and not absolute.startswith(root + os.sep):
            raise ArchiveStorageError('مسیر خارج از پوشهٔ مجاز است.')
        return absolute


# نمونهٔ سراسری آماده برای استفاده در سرویس‌ها
archive_engine = ArchiveStorageEngine()

