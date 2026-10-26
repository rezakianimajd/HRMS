"""تست‌های ظاهر صفحهٔ ورود (تصویر پس‌زمینه، رنگ پوشش و رنگ متن).

این تست‌ها روی توابع خالصِ اعتبارسنجی اجرا می‌شوند و به دیتابیس نیاز ندارند.
"""
from types import SimpleNamespace

from django.test import SimpleTestCase

from settings_app.login_branding import (
    DEFAULT_LOGIN_BRANDING,
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

    def test_unsafe_background_urls_are_rejected(self):
        for value in ('javascript:alert(1)', 'data:image/svg+xml;base64,AAA', 'https://x/y.png" onload="alert(1)'):
            self.assertEqual(sanitize_login_branding({'background_url': value})['background_url'], '')

    def test_safe_background_urls_are_kept(self):
        for value in ('/media/login_branding/company_1/a.jpg', 'https://cdn.example.com/a.jpg', '//cdn.example.com/a.jpg'):
            self.assertEqual(sanitize_login_branding({'background_url': value})['background_url'], value)

    def test_unknown_keys_are_dropped(self):
        result = sanitize_login_branding({'overlay_color': '#000000', 'hack': '<script>'})
        self.assertEqual(set(result.keys()), set(DEFAULT_LOGIN_BRANDING.keys()))


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
