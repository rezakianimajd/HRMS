"""تست‌های برند شرکت برای آیکن تب مرورگر (بدون دیتابیس)."""
from types import SimpleNamespace
from unittest import mock

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory

from core.views import company_branding_payload, company_branding_view


def _logo(url):
    """شبیه‌سازی ImageField با فایل موجود."""
    return SimpleNamespace(url=url)


class CompanyBrandingPayloadTests(SimpleTestCase):
    def test_profile_logo_wins_over_company_logo(self):
        company = SimpleNamespace(name='شرکت نمونه', logo=_logo('/media/company_logos/c.png'))
        profile = SimpleNamespace(
            legal_name='موسسه مدیریت راهبردی خاتم پاسارگاد',
            logo=_logo('/media/company_logos/p.png'),
            updated_at=None,
        )

        payload = company_branding_payload(company, profile)

        self.assertEqual(payload['logo_url'], '/media/company_logos/p.png')
        self.assertEqual(payload['favicon_url'], '/media/company_logos/p.png')
        self.assertEqual(payload['legal_name'], 'موسسه مدیریت راهبردی خاتم پاسارگاد')
        self.assertEqual(payload['name'], 'موسسه مدیریت راهبردی خاتم پاسارگاد')
        self.assertIsNone(payload['version'])

    def test_company_logo_is_used_when_profile_has_none(self):
        company = SimpleNamespace(name='کیان', logo=_logo('/media/company_logos/c.png'))
        profile = SimpleNamespace(legal_name='', logo=None, updated_at=None)

        payload = company_branding_payload(company, profile)

        self.assertEqual(payload['logo_url'], '/media/company_logos/c.png')
        self.assertEqual(payload['name'], 'کیان')

    def test_missing_logo_returns_null_icon(self):
        company = SimpleNamespace(name='کیان', logo=None)
        profile = SimpleNamespace(legal_name='', logo=None, updated_at=None)

        payload = company_branding_payload(company, profile)

        self.assertIsNone(payload['logo_url'])
        self.assertIsNone(payload['favicon_url'])

    def test_version_from_updated_at_is_appended_to_favicon_url(self):
        stamp = SimpleNamespace(timestamp=lambda: 1700000000.75)
        company = SimpleNamespace(name='کیان', logo=None)
        profile = SimpleNamespace(
            legal_name='کیان', logo=_logo('/media/company_logos/p.png'), updated_at=stamp,
        )

        payload = company_branding_payload(company, profile)

        self.assertEqual(payload['version'], 1700000000)
        self.assertEqual(payload['favicon_url'], '/media/company_logos/p.png?v=1700000000')

    def test_broken_logo_field_is_ignored(self):
        class BrokenLogo:
            @property
            def url(self):
                raise ValueError('no file')

        company = SimpleNamespace(name='کیان', logo=BrokenLogo())
        profile = SimpleNamespace(legal_name='', logo=BrokenLogo(), updated_at=None)

        payload = company_branding_payload(company, profile)

        self.assertIsNone(payload['logo_url'])
        self.assertIsNone(payload['favicon_url'])

    def test_without_company_or_profile_returns_empty_branding(self):
        payload = company_branding_payload(None, None)

        self.assertEqual(payload['name'], '')
        self.assertEqual(payload['legal_name'], '')
        self.assertIsNone(payload['logo_url'])


class CompanyBrandingViewTests(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

    def test_public_schema_returns_empty_branding(self):
        request = self.factory.get('/api/company/branding/')

        with mock.patch(
            'django.db.connection.tenant',
            SimpleNamespace(schema_name='public'),
            create=True,
        ):
            response = company_branding_view(request)

        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data['logo_url'])
        self.assertIsNone(response.data['favicon_url'])

    def test_tenant_domain_returns_company_logo(self):
        tenant = SimpleNamespace(
            id=1,
            schema_name='kpsmi',
            name='موسسه مدیریت راهبردی خاتم پاسارگاد',
            logo=_logo('/media/company_logos/kpsmi.png'),
        )
        branding = {
            'name': 'موسسه مدیریت راهبردی خاتم پاسارگاد',
            'legal_name': 'موسسه مدیریت راهبردی خاتم پاسارگاد',
            'logo_url': '/media/company_logos/kpsmi.png',
            'favicon_url': '/media/company_logos/kpsmi.png',
            'version': None,
        }
        request = self.factory.get('/api/company/branding/')

        with mock.patch('django.db.connection.tenant', tenant, create=True), \
                mock.patch('core.views.load_company_branding', return_value=branding) as loader:
            response = company_branding_view(request)

        loader.assert_called_once_with(tenant)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['favicon_url'], '/media/company_logos/kpsmi.png')
