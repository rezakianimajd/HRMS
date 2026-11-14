"""تست‌های عکس پرسنلی: نسخهٔ نمایشی (WebP شارپ) و توکن دسترسی (بدون دیتابیس)."""
import os
import tempfile

from django.test import SimpleTestCase, override_settings

from employees import photo_service
from employees.photo_tokens import sign_employee, verify_employee_token


class PhotoTokenTests(SimpleTestCase):
    def test_round_trip(self):
        token = sign_employee(12)
        self.assertTrue(verify_employee_token(token, 12))
        self.assertTrue(verify_employee_token(token, '12'))

    def test_other_employee_is_rejected(self):
        self.assertFalse(verify_employee_token(sign_employee(12), 13))

    def test_invalid_tokens(self):
        for value in ('', None, 'garbage', sign_employee(12)[:-3]):
            self.assertFalse(verify_employee_token(value, 12))


class SizeClampTests(SimpleTestCase):
    def test_clamps_between_min_and_max(self):
        self.assertEqual(photo_service.clamp_size('4'), photo_service.MIN_SIZE)
        self.assertEqual(photo_service.clamp_size(5000), photo_service.MAX_SIZE)
        self.assertEqual(photo_service.clamp_size('160'), 160)

    def test_default_for_invalid_values(self):
        for value in (None, '', 'abc', object()):
            self.assertEqual(photo_service.clamp_size(value), photo_service.DEFAULT_SIZE)


class FakePhoto:
    def __init__(self, path, name, url):
        self.path = path
        self.name = name
        self.url = url


class FakeEmployee:
    def __init__(self, pk, photo=None):
        self.pk = pk
        self.photo = photo


class FakeRequest:
    def build_absolute_uri(self, path):
        return f'http://hrms.local{path}'


@override_settings(MEDIA_ROOT=tempfile.gettempdir())
class RenderPhotoTests(SimpleTestCase):
    size = 1200

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        from PIL import Image

        cls.tmp = tempfile.TemporaryDirectory()
        cls.source = os.path.join(cls.tmp.name, 'source.jpg')
        image = Image.new('RGB', (cls.size, cls.size), (30, 90, 160))
        image.save(cls.source, format='JPEG', quality=90)

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()
        super().tearDownClass()

    def _open(self, data):
        from PIL import Image
        import io

        buffer = io.BytesIO(data)
        return Image.open(buffer)

    def test_render_resizes_to_requested_side_as_webp(self):
        data = photo_service.render_photo(self.source, 96)
        with self._open(data) as image:
            self.assertEqual(image.format, 'WEBP')
            self.assertEqual(max(image.size), 96)
            self.assertEqual(image.mode, 'RGB')

    def test_render_never_upscales(self):
        data = photo_service.render_photo(self.source, 512)
        with self._open(data) as image:
            self.assertEqual(max(image.size), 512)

    def test_photo_thumbnail_is_cached_on_disk(self):
        photo = FakePhoto(self.source, 'employees/1/photo.jpg',
                          '/media/employees/1/photo.jpg')
        employee = FakeEmployee(1, photo)
        first = photo_service.photo_thumbnail(employee, 64)
        target = photo_service.cache_path(employee.pk, photo.name, 64)
        self.assertTrue(target.exists())
        self.assertEqual(target.read_bytes(), first)
        self.assertEqual(photo_service.photo_thumbnail(employee, 64), first)

    def test_cache_path_is_versioned(self):
        current = photo_service.cache_path(1, 'employees/1/photo.jpg', 64)
        legacy = photo_service.cache_path(1, 'employees/1/photo.jpg', 64, version='legacy')
        self.assertNotEqual(current, legacy)
        self.assertTrue(current.name.endswith('_64.webp'))

    def test_source_media_uses_real_format_not_extension(self):
        photo = FakePhoto(self.source, 'employees/1/photo.png',
                          '/media/employees/1/photo.png')
        content_type, extension = photo_service.source_media(FakeEmployee(1, photo))
        self.assertEqual(content_type, 'image/jpeg')
        self.assertEqual(extension, '.jpg')


class PhotoUrlTests(SimpleTestCase):
    def test_without_photo_returns_empty(self):
        self.assertEqual(photo_service.photo_url(FakeEmployee(1), FakeRequest()), '')

    def test_missing_file_falls_back_to_media_url(self):
        photo = FakePhoto('/nowhere/missing.jpg', 'employees/1/missing.jpg',
                          '/media/employees/1/missing.jpg')
        url = photo_service.photo_url(FakeEmployee(1, photo), FakeRequest())
        self.assertEqual(url, 'http://hrms.local/media/employees/1/missing.jpg')

    def test_existing_file_returns_signed_thumbnail_url(self):
        with tempfile.TemporaryDirectory() as folder:
            path = os.path.join(folder, 'photo.jpg')
            with open(path, 'wb') as handle:
                handle.write(b'not-a-real-image')
            photo = FakePhoto(path, 'employees/9/photo.jpg', '/media/employees/9/photo.jpg')
            employee = FakeEmployee(9, photo)
            url = photo_service.photo_url(employee, FakeRequest(), size=160)
            full_url = photo_service.photo_full_url(employee, FakeRequest())
        self.assertIn('/api/employees/9/photo/', url)
        self.assertIn('size=160', url)
        self.assertIn('t=', url)
        self.assertIn('v=', url)
        self.assertIn(f'cv={photo_service.RENDER_VERSION}', url)
        token = url.split('t=')[1].split('&')[0]
        self.assertTrue(verify_employee_token(token, 9))
        self.assertIn('full=1', full_url)
        self.assertNotIn('size=', full_url)
