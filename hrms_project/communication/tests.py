"""تست‌های واحد ماژول گفتگوی سازمانی (بدون دیتابیس)."""
from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase, override_settings

from communication import crypto
from communication import permissions as chat_permissions
from communication import services, uploads
from communication.realtime import DatabaseEventPublisher, _publisher


class CryptoLayerTests(SimpleTestCase):
    """رمزنگاری بدنه + ایندکس کور جست‌وجو."""

    @override_settings(SECRET_KEY='unit-test-secret-key')
    def test_body_round_trip(self):
        plain = 'صورت‌وضعیت #SP-1405-004 بررسی شد.'
        cipher = crypto.encrypt_body(plain)
        self.assertNotEqual(cipher, plain)
        self.assertEqual(crypto.decrypt_body(cipher), plain)

    @override_settings(SECRET_KEY='unit-test-secret-key')
    def test_blind_index_is_stable_and_opaque(self):
        first = crypto.blind_index('قرارداد 1405/125 تایید شد')
        second = crypto.blind_index('قرارداد 1405/125 تایید شد')
        self.assertEqual(first, second)
        self.assertNotIn('قرارداد', first)
        self.assertNotIn('1405', first)

    @override_settings(SECRET_KEY='unit-test-secret-key')
    def test_persian_digits_are_normalized_for_search(self):
        self.assertEqual(
            crypto.blind_index('قرارداد ۱۴۰۵/۱۲۵'),
            crypto.blind_index('قرارداد 1405/125'),
        )

    @override_settings(SECRET_KEY='unit-test-secret-key')
    def test_query_digests_only_include_words(self):
        digests = crypto.query_digests('قرارداد ۱۲۵')
        self.assertEqual(len(digests), 2)
        self.assertTrue(all(len(item) == 20 for item in digests))

    def test_clean_body_truncates_and_strips(self):
        self.assertEqual(crypto.clean_body('  hello \x00 '), 'hello')
        self.assertEqual(len(crypto.clean_body('x' * (crypto.MAX_BODY_LENGTH + 50))),
                         crypto.MAX_BODY_LENGTH)

    def test_preview_of_collapses_whitespace(self):
        self.assertEqual(crypto.preview_of('سلام\n\nدنیا  ', 30), 'سلام دنیا')


class UploadRulesTests(SimpleTestCase):
    """اعتبارسنجی پیوست و مسیر بایگانی."""

    def _upload(self, name, size=1024):
        return SimpleNamespace(name=name, size=size)

    def test_allowed_and_blocked_extensions(self):
        uploads.validate_upload(self._upload('scan.pdf'))
        uploads.validate_upload(self._upload('sheet.xlsx'))
        for name in ('evil.exe', 'x.svg', 'payload.html', 'no-extension'):
            with self.assertRaises(Exception):
                uploads.validate_upload(self._upload(name))

    def test_size_limit_is_enforced(self):
        with override_settings(CHAT_ATTACHMENT_MAX_MB=1):
            with self.assertRaises(Exception):
                uploads.validate_upload(self._upload('big.pdf', 2 * 1024 * 1024))

    def test_kind_detection(self):
        self.assertEqual(uploads.kind_of('photo.JPG'), 'image')
        self.assertEqual(uploads.kind_of('signed.pdf'), 'pdf')
        self.assertEqual(uploads.kind_of('bundle.zip'), 'archive')
        self.assertEqual(uploads.kind_of('notes.txt'), 'document')

    def test_upload_path_uses_archive_layout(self):
        instance = SimpleNamespace(company_id=7, conversation_id=12)
        path = uploads.chat_attachment_upload_path(instance, 'report.pdf')
        self.assertTrue(path.startswith('archive/company_7/chat/12/'))
        self.assertTrue(path.endswith('.pdf'))


class ChatPermissionTests(SimpleTestCase):
    """کلید گفتگوی خصوصی و بررسی دسترسی ماژول‌های ارجاع‌شده."""

    def test_direct_key_is_order_independent(self):
        self.assertEqual(services.direct_key_for(4, 9), services.direct_key_for(9, 4))

    def test_can_read_module_allows_superuser(self):
        user = SimpleNamespace(is_superuser=True, is_authenticated=True, pk=1)
        self.assertTrue(chat_permissions.can_read_module(user, 'contracts'))

    def test_can_read_module_respects_granted_codes(self):
        user = SimpleNamespace(is_superuser=False, is_authenticated=True, pk=2)
        with patch('core.engines.permission_engine.fine_permissions_for',
                   return_value={'contracts.contracts.view': True}):
            self.assertTrue(chat_permissions.can_read_module(user, 'contracts'))
        with patch('core.engines.permission_engine.fine_permissions_for',
                   return_value={'correspondence.letters.view': True}):
            self.assertFalse(chat_permissions.can_read_module(user, 'contracts'))

    def test_can_read_module_defaults_to_true_without_fine_permissions(self):
        user = SimpleNamespace(is_superuser=False, is_authenticated=True, pk=3)
        with patch('core.engines.permission_engine.fine_permissions_for',
                   return_value={}):
            self.assertTrue(chat_permissions.can_read_module(user, 'projects'))

    def test_publisher_defaults_to_database_outbox(self):
        self.assertIsInstance(_publisher(), DatabaseEventPublisher)


class EntitySearchTests(SimpleTestCase):
    """جست‌وجوی رکوردهای ماژول‌ها برای الصاق در چت."""

    def test_object_id_strips_type_prefix(self):
        from communication.entity_search import _object_id

        self.assertEqual(
            _object_id({'id': 'document-1524', 'type': 'document'}), '1524',
        )
        self.assertEqual(
            _object_id({'id': 'contract-77', 'type': 'contract'}), '77',
        )

    def test_entity_to_ref_keeps_only_safe_fields(self):
        from communication.entity_search import entity_to_ref

        ref = entity_to_ref({
            'module': 'contracts', 'object_type': 'contract', 'object_id': '125',
            'label': 'قرارداد 1405/125', 'url': '/external-contracts/125',
            'icon': 'contract', 'color': '#f59e0b',
        })
        self.assertEqual(ref, {
            'module': 'contracts', 'object_type': 'contract', 'object_id': '125',
            'label': 'قرارداد 1405/125', 'url': '/external-contracts/125',
        })

    def test_entity_to_ref_requires_module(self):
        from communication.entity_search import entity_to_ref

        self.assertIsNone(entity_to_ref({'label': 'بدون ماژول'}))
        self.assertIsNone(entity_to_ref(None))

    def test_short_query_returns_nothing(self):
        from communication.entity_search import search_entities

        user = SimpleNamespace(pk=1, is_superuser=True, is_authenticated=True)
        self.assertEqual(search_entities(user, 'ق'), [])

    def test_search_only_uses_readable_modules(self):
        from communication.entity_search import search_entities

        user = SimpleNamespace(pk=2, is_superuser=False, is_authenticated=True)
        payload = {
            'module_label': 'قراردادها',
            'results': [{
                'id': 'contract-1', 'type': 'contract', 'title': 'قرارداد 125',
                'subtitle': 'شرکت الف', 'path': '/external-contracts/1',
            }],
        }
        with patch('communication.entity_search.can_read_module',
                   side_effect=lambda _user, module: module == 'contracts'), \
                patch('core.module_search.module_search', return_value=payload) as engine:
            rows = search_entities(user, 'قرارداد')
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]['module'], 'contracts')
        self.assertEqual(rows[0]['object_id'], '1')
        self.assertEqual(engine.call_count, 1)
