"""تست‌های ساختاری: بستهٔ ``views/`` و سبک‌سازی پاسخ ``/auth/me``.

هدف: جلوگیری از برگشت فایل یکپارچهٔ ``views.py`` و اطمینان از اینکه همهٔ
ویوست‌ها/helperها از ``correspondences.views`` قابل import می‌مانند.
"""
import pathlib
from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase

APP_DIR = pathlib.Path(__file__).resolve().parent


class ViewsPackageTests(SimpleTestCase):
    """تقسیم ``views.py`` به بستهٔ ماژول‌های کوچک."""

    def test_monolithic_views_module_is_gone(self):
        self.assertFalse((APP_DIR / 'views.py').exists())
        self.assertTrue((APP_DIR / 'views' / '__init__.py').exists())

    def test_package_files_exist(self):
        package = APP_DIR / 'views'
        for name in ('base.py', 'legacy.py', 'letters.py', 'referrals.py',
                     'attachments.py', 'aliases.py', 'requests.py'):
            self.assertTrue((package / name).exists(), name)

    def test_every_viewset_is_importable_from_the_package(self):
        from correspondences import views

        for name in (
            'IncomingLetterViewSet', 'OutgoingLetterViewSet', 'AnnouncementViewSet',
            'FormViewSet', 'OrganizationViewSet', 'OrganizationalLetterViewSet',
            'LetterViewSet', 'LetterCategoryViewSet', 'LetterSeriesViewSet',
            'CorrespondentViewSet', 'LetterReferralViewSet', 'LetterAttachmentViewSet',
            'LetterRequestTypeViewSet', 'LetterRequestViewSet',
            'CorrespondenceNameAliasViewSet', 'BaseLetterViewSet',
        ):
            self.assertTrue(hasattr(views, name), name)

    def test_shared_helpers_are_exported(self):
        from correspondences import views

        for name in ('_get_company', '_create_referral', '_my_name_variants',
                     '_log_event', '_user_employee', 'JALALI_MONTHS'):
            self.assertTrue(hasattr(views, name), name)

    def test_urls_resolve_to_the_split_modules(self):
        from correspondences.urls import router

        basenames = {row[0] for row in router.registry}
        for expected in ('letters', 'letter-referrals', 'letter-attachments',
                         'correspondence-name-aliases', 'letter-requests',
                         'incoming-letters', 'organizations'):
            self.assertIn(expected, basenames, expected)

    def test_module_files_stay_reasonably_small(self):
        """هیچ ماژولی نباید دوباره به یک فایل غول‌آسا تبدیل شود."""
        package = APP_DIR / 'views'
        for path in package.glob('*.py'):
            lines = len(path.read_text(encoding='utf-8').splitlines())
            self.assertLess(lines, 1000, f'{path.name} = {lines} خط')


class AuthMePayloadTests(SimpleTestCase):
    """``/auth/me`` فقط کدهای داده‌شده را برمی‌گرداند و پرچم دسترسی کامل دارد."""

    def test_serializer_exposes_is_full_access(self):
        from core.serializers import UserSerializer

        self.assertIn('is_full_access', UserSerializer.Meta.fields)

    def test_only_granted_codes_are_returned(self):
        from core.serializers import UserSerializer

        user = SimpleNamespace(is_superuser=False, pk=5)
        granted = {'correspondence.all.view': True, 'treasury.receipts.edit': False}
        with patch('core.engines.permission_engine.user_access_record', return_value=None), \
                patch('core.engines.permission_engine.fine_permissions_for',
                      return_value=granted):
            payload = UserSerializer().get_fine_permissions(user)
        self.assertEqual(payload, {'correspondence.all.view': True})

    def test_full_access_user_gets_an_empty_dict(self):
        from core.serializers import UserSerializer

        user = SimpleNamespace(is_superuser=False, pk=5)
        access = SimpleNamespace(is_full_access=True, permissions={})
        with patch('core.engines.permission_engine.user_access_record',
                   return_value=access):
            payload = UserSerializer().get_fine_permissions(user)
            is_full = UserSerializer().get_is_full_access(user)
        self.assertEqual(payload, {})
        self.assertTrue(is_full)

    def test_superuser_is_full_access_without_codes(self):
        from core.serializers import UserSerializer

        user = SimpleNamespace(is_superuser=True, pk=1)
        self.assertTrue(UserSerializer().get_is_full_access(user))
        self.assertEqual(UserSerializer().get_fine_permissions(user), {})
