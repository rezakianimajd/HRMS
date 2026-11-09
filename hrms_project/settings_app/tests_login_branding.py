"""تست‌های ظاهر صفحهٔ ورود (تصویر پس‌زمینه، رنگ پوشش و رنگ متن).

این تست‌ها روی توابع خالصِ اعتبارسنجی اجرا می‌شوند و به دیتابیس نیاز ندارند.
"""
from types import SimpleNamespace

from django.test import SimpleTestCase

from settings_app.login_branding import (
    DEFAULT_LOGIN_BRANDING,
    DEFAULT_LOGIN_GRADIENT,
    BackgroundUploadError,
    _validate_upload,
    sanitize_login_branding,
)


class LoginBrandingSanitizeTests(SimpleTestCase):
    def test_empty_payload_returns_defaults(self):
        self.assertEqual(sanitize_login_branding(None), DEFAULT_LOGIN_BRANDING)
        self.assertEqual(sanitize_login_branding({}), DEFAULT_LOGIN_BRANDING)
        self.assertEqual(sanitize_login_branding('not-a-dict'), DEFAULT_LOGIN_BRANDING)

    def test_valid_colors_are_normalized_to_lowercase(self):
        result = sanitize_login_branding({
            'overlay_color': ' #0B3B2E ',
            'text_color': '#FFFFFF',
            'accent_color': '#12AB9f',
        })
        self.assertEqual(result['overlay_color'], '#0b3b2e')
        self.assertEqual(result['text_color'], '#ffffff')
        self.assertEqual(result['accent_color'], '#12ab9f')

    def test_invalid_colors_fall_back_to_defaults(self):
        result = sanitize_login_branding({
            'overlay_color': 'red',
            'text_color': '#fff',
            'accent_color': 'javascript:alert(1)',
        })
        self.assertEqual(result['overlay_color'], DEFAULT_LOGIN_BRANDING['overlay_color'])
        self.assertEqual(result['text_color'], DEFAULT_LOGIN_BRANDING['text_color'])
        self.assertEqual(result['accent_color'], DEFAULT_LOGIN_BRANDING['accent_color'])

    def test_overlay_opacity_is_clamped(self):
        self.assertEqual(sanitize_login_branding({'overlay_opacity': -20})['overlay_opacity'], 0)
        self.assertEqual(sanitize_login_branding({'overlay_opacity': 140})['overlay_opacity'], 95)
        self.assertEqual(sanitize_login_branding({'overlay_opacity': '48.6'})['overlay_opacity'], 49)
        self.assertEqual(
            sanitize_login_branding({'overlay_opacity': 'abc'})['overlay_opacity'],
            DEFAULT_LOGIN_BRANDING['overlay_opacity'],
        )

    def test_overlay_blur_is_clamped(self):
        self.assertEqual(sanitize_login_branding({'overlay_blur': -5})['overlay_blur'], 0)
        self.assertEqual(sanitize_login_branding({'overlay_blur': 90})['overlay_blur'], 24)
        self.assertEqual(sanitize_login_branding({'overlay_blur': '12.4'})['overlay_blur'], 12)
        self.assertEqual(
            sanitize_login_branding({'overlay_blur': 'abc'})['overlay_blur'],
            DEFAULT_LOGIN_BRANDING['overlay_blur'],
        )
        self.assertEqual(DEFAULT_LOGIN_BRANDING['overlay_blur'], 8)

    def test_save_merges_overlay_blur(self):
        """صرفه‌جویی: کلیدهای مجاز از payload روی تنظیمات فعلی merge می‌شوند."""
        from settings_app import login_branding as module

        saved = {}

        class _Engine:
            @staticmethod
            def get_setting(key, company, default=None):  # noqa: ARG004
                return saved or default

            @staticmethod
            def set_setting(key, value, company, **kwargs):  # noqa: ARG004
                saved.update(value)

        original = module.SettingsEngine
        module.SettingsEngine = _Engine
        try:
            result = module.save_login_branding(SimpleNamespace(pk=1), {'overlay_blur': 18})
        finally:
            module.SettingsEngine = original
        self.assertEqual(result['overlay_blur'], 18)
        self.assertEqual(saved['overlay_blur'], 18)
        self.assertEqual(saved['background_url'], '')
        self.assertEqual(saved['overlay_opacity'], DEFAULT_LOGIN_BRANDING['overlay_opacity'])
        self.assertNotIn('hack', saved)

    def test_unsafe_background_urls_are_rejected(self):
        for value in ('javascript:alert(1)', 'data:image/svg+xml;base64,AAA', 'https://x/y.png" onload="alert(1)'):
            self.assertEqual(sanitize_login_branding({'background_url': value})['background_url'], '')

    def test_safe_background_urls_are_kept(self):
        for value in ('/media/login_branding/company_1/a.jpg', 'https://cdn.example.com/a.jpg', '//cdn.example.com/a.jpg'):
            self.assertEqual(sanitize_login_branding({'background_url': value})['background_url'], value)

    def test_unknown_keys_are_dropped(self):
        result = sanitize_login_branding({'overlay_color': '#000000', 'hack': '<script>'})
        self.assertEqual(set(result.keys()), set(DEFAULT_LOGIN_BRANDING.keys()))


class LoginGradientTests(SimpleTestCase):
    """گرادیانت رنگی به‌جای تصویر پس‌زمینهٔ صفحهٔ ورود."""

    def test_defaults_use_image_kind_and_default_gradient(self):
        result = sanitize_login_branding({})
        self.assertEqual(result['background_kind'], 'image')
        self.assertEqual(result['gradient'], DEFAULT_LOGIN_GRADIENT)

    def test_valid_gradient_is_normalized(self):
        result = sanitize_login_branding({
            'background_kind': 'gradient',
            'gradient': {'preset': 'mesh', 'angle': -30, 'colors': ['#ABCDEF', '#123456']},
        })
        self.assertEqual(result['background_kind'], 'gradient')
        self.assertEqual(result['gradient']['preset'], 'mesh')
        self.assertEqual(result['gradient']['angle'], 330)
        self.assertEqual(result['gradient']['colors'], ['#abcdef', '#123456'])

    def test_invalid_gradient_falls_back(self):
        result = sanitize_login_branding({
            'background_kind': 'video',
            'gradient': {'preset': 'not-a-preset', 'colors': ['#zzzzzz', 'red']},
        })
        self.assertEqual(result['background_kind'], 'image')
        self.assertEqual(result['gradient']['preset'], DEFAULT_LOGIN_GRADIENT['preset'])
        self.assertEqual(result['gradient']['colors'], DEFAULT_LOGIN_GRADIENT['colors'])

    def test_gradient_colors_are_capped_at_four(self):
        colors = ['#111111', '#222222', '#333333', '#444444', '#555555']
        result = sanitize_login_branding({'gradient': {'colors': colors}})
        self.assertEqual(result['gradient']['colors'], colors[:4])

    def test_save_merges_partial_gradient(self):
        from settings_app import login_branding as module

        saved = {}

        class _Engine:
            @staticmethod
            def get_setting(key, company, default=None):  # noqa: ARG004
                return saved or default

            @staticmethod
            def set_setting(key, value, company, **kwargs):  # noqa: ARG004
                saved.update(value)

        original = module.SettingsEngine
        module.SettingsEngine = _Engine
        try:
            result = module.save_login_branding(
                SimpleNamespace(pk=1),
                {'background_kind': 'gradient', 'gradient': {'preset': 'radial'}},
            )
        finally:
            module.SettingsEngine = original

        self.assertEqual(result['background_kind'], 'gradient')
        self.assertEqual(result['gradient']['preset'], 'radial')
        # زاویه و رنگ‌ها از تنظیمات قبلی حفظ می‌شوند
        self.assertEqual(result['gradient']['angle'], DEFAULT_LOGIN_GRADIENT['angle'])
        self.assertEqual(result['gradient']['colors'], DEFAULT_LOGIN_GRADIENT['colors'])


class LoginBackgroundUploadValidationTests(SimpleTestCase):
    def _upload(self, name='login.jpg', content_type='image/jpeg', size=1024):
        return SimpleNamespace(name=name, content_type=content_type, size=size)

    def test_supported_image_extensions_are_accepted(self):
        self.assertEqual(_validate_upload(self._upload('bg.PNG', 'image/png')), '.png')
        self.assertEqual(_validate_upload(self._upload('bg.webp', 'image/webp')), '.webp')

    def test_non_image_upload_is_rejected(self):
        with self.assertRaises(BackgroundUploadError):
            _validate_upload(self._upload('malware.exe', 'application/octet-stream'))
        with self.assertRaises(BackgroundUploadError):
            _validate_upload(self._upload('notes.txt', 'text/plain'))

    def test_oversized_upload_is_rejected(self):
        with self.assertRaises(BackgroundUploadError):
            _validate_upload(self._upload(size=7 * 1024 * 1024))

    def test_missing_upload_is_rejected(self):
        with self.assertRaises(BackgroundUploadError):
            _validate_upload(None)
