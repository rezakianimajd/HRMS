"""تست‌های امنیتی ماژول مکاتبات: مجوز ریز، محرمانگی، اعتبارسنجی فایل و توکن دانلود.

همهٔ تست‌ها بدون دیتابیس اجرا می‌شوند (SimpleTestCase) و لایهٔ مجوز را با
``unittest.mock`` جایگزین می‌کنند؛ بنابراین روی ماشین بدون PostgreSQL هم سبزند.
"""
from types import SimpleNamespace
from unittest.mock import patch

from django.core.exceptions import PermissionDenied, ValidationError
from django.test import SimpleTestCase

from correspondences import permissions as perm
from correspondences import uploads
from correspondences.downloads import issue_token, read_token


def _user(**kwargs):
    base = {
        'is_authenticated': True,
        'is_superuser': False,
        'id': 7,
        'pk': 7,
        'username': 'reza',
        'profile': None,
        'get_full_name': lambda: 'رضا کیانی',
    }
    base.update(kwargs)
    return SimpleNamespace(**base)


def _fine(codes):
    return patch(
        'core.engines.permission_engine.fine_permissions_for',
        return_value={code: True for code in codes},
    )


def _legacy(permission):
    return patch(
        'core.engines.permission_engine.module_action_granted',
        side_effect=lambda user, module, actions: permission in actions,
    )


class FinePermissionTests(SimpleTestCase):
    """مجوز ریز per-action و per-direction."""

    def test_view_only_user_cannot_write(self):
        user = _user()
        with _fine({'correspondence.all.view'}):
            self.assertTrue(perm.has_permission(user, 'view'))
            self.assertFalse(perm.has_permission(user, 'create'))
            self.assertFalse(perm.has_permission(user, 'edit'))
            self.assertFalse(perm.has_permission(user, 'delete'))

    def test_direction_scoped_edit_is_not_shared(self):
        user = _user()
        with _fine({'correspondence.incoming.edit'}):
            self.assertTrue(perm.has_permission(user, 'edit', direction='incoming'))
            self.assertFalse(perm.has_permission(user, 'edit', direction='outgoing'))
            self.assertFalse(perm.has_permission(user, 'edit', direction='internal'))

    def test_menu_all_covers_every_direction(self):
        user = _user()
        with _fine({'correspondence.all.edit'}):
            for direction in ('incoming', 'outgoing', 'internal'):
                self.assertTrue(perm.has_permission(user, 'edit', direction=direction))

    def test_create_permission_also_allows_edit_fallback(self):
        user = _user()
        with _fine({'correspondence.new.create'}):
            self.assertTrue(perm.has_permission(user, 'edit', direction='incoming'))

    def test_approve_falls_back_to_edit(self):
        user = _user()
        with _fine({'correspondence.incoming.edit'}):
            self.assertTrue(perm.has_permission(user, 'approve', direction='incoming'))

    def test_delete_requires_delete_code(self):
        user = _user()
        with _fine({'correspondence.incoming.edit', 'correspondence.incoming.view'}):
            self.assertFalse(perm.has_permission(user, 'delete', direction='incoming'))

    def test_superuser_always_allowed(self):
        user = _user(is_superuser=True)
        with _fine(set()):
            self.assertTrue(perm.has_permission(user, 'delete', direction='incoming'))

    def test_anonymous_denied(self):
        user = SimpleNamespace(is_authenticated=False)
        self.assertFalse(perm.has_permission(user, 'view'))
        with self.assertRaises(PermissionDenied):
            perm.require(user, 'view')

    def test_legacy_role_user_keeps_working(self):
        """کاربر بدون کد ریز (نقش قدیمی) نباید قفل شود."""
        user = _user()
        with _fine(set()), _legacy('edit'):
            self.assertTrue(perm.has_permission(user, 'edit', direction='incoming'))
        with _fine(set()), _legacy('view'):
            self.assertFalse(perm.has_permission(user, 'delete', direction='incoming'))

    def test_require_raises_with_persian_message(self):
        user = _user()
        with _fine({'correspondence.all.view'}):
            with self.assertRaises(PermissionDenied) as context:
                perm.require(user, 'delete', label='حذف مکاتبات')
        self.assertIn('حذف', str(context.exception))

    def test_mapping_menus_are_separate_from_letter_menus(self):
        user = _user()
        with _fine({'correspondence.name-mapping.edit'}):
            self.assertTrue(perm.has_permission(user, 'edit', menus=perm.MAPPING_MENUS))
            self.assertFalse(perm.has_permission(user, 'edit', direction='incoming'))


def _lookup_keys(condition):
    """کلیدهای lookup یک شرط Q (بدون ارزیابی زیرکوئری‌ها)."""
    keys = []
    stack = [condition]
    while stack:
        node = stack.pop()
        children = getattr(node, 'children', None)
        if children is None:
            continue
        for child in children:
            if hasattr(child, 'children'):
                stack.append(child)
            elif isinstance(child, tuple):
                keys.append(child[0])
    return keys


class ConfidentialityTests(SimpleTestCase):
    """نامهٔ محرمانه/سری فقط برای مجازها."""

    @staticmethod
    def _letter(confidentiality='normal'):
        return SimpleNamespace(
            confidentiality=confidentiality, created_by_id=1, drafter_id=2,
            entered_by_id=3, direction='incoming', pk=11,
        )

    def test_normal_letter_is_visible(self):
        self.assertTrue(perm.can_read_confidential(_user(), self._letter('normal')))

    def test_stranger_cannot_read_confidential(self):
        user = _user(id=99, pk=99)
        with _fine({'correspondence.all.view'}), patch(
            'correspondences.models.LetterReferral.objects',
        ) as referrals:
            referrals.filter.return_value.filter.return_value.exists.return_value = False
            self.assertFalse(perm.can_read_confidential(user, self._letter('secret')))

    def test_creator_can_read_confidential(self):
        user = _user(id=1, pk=1)
        self.assertTrue(perm.can_read_confidential(user, self._letter('confidential')))

    def test_approver_can_read_confidential(self):
        user = _user(id=99, pk=99)
        with _fine({'correspondence.all.approve'}), patch(
            'correspondences.models.LetterReferral.objects',
        ) as referrals:
            referrals.filter.return_value.filter.return_value.exists.return_value = False
            self.assertTrue(perm.can_read_confidential(user, self._letter('secret')))

    def test_filter_is_empty_for_superuser(self):
        condition = perm.confidential_letter_filter(_user(is_superuser=True))
        self.assertEqual(_lookup_keys(condition), [])

    def test_filter_excludes_confidential_for_stranger(self):
        user = _user(id=99, pk=99)
        with _fine({'correspondence.all.view'}):
            condition = perm.confidential_letter_filter(user)
        keys = _lookup_keys(condition)
        self.assertIn('confidentiality__in', keys)
        self.assertIn('created_by_id', keys)
        self.assertIn('pk__in', keys)

    def test_anonymous_filter_only_shows_normal_letters(self):
        condition = perm.confidential_letter_filter(SimpleNamespace(is_authenticated=False))
        self.assertEqual(_lookup_keys(condition), ['confidentiality__in'])


class UploadValidationTests(SimpleTestCase):
    """اعتبارسنجی پسوند/حجم و نام‌گذاری امن پیوست."""

    @staticmethod
    def _upload(name, size=1024):
        return SimpleNamespace(name=name, size=size)

    def test_allowed_pdf_passes(self):
        self.assertIsNotNone(uploads.validate_attachment(self._upload('scan.PDF')))

    def test_html_is_rejected(self):
        with self.assertRaises(ValidationError):
            uploads.validate_attachment(self._upload('evil.html'))

    def test_svg_is_rejected(self):
        with self.assertRaises(ValidationError):
            uploads.validate_attachment(self._upload('logo.svg'))

    def test_unknown_extension_is_rejected(self):
        with self.assertRaises(ValidationError):
            uploads.validate_attachment(self._upload('payload.exe'))

    def test_empty_file_is_rejected(self):
        with self.assertRaises(ValidationError):
            uploads.validate_attachment(self._upload('empty.pdf', size=0))

    def test_oversized_file_is_rejected(self):
        limit = uploads.max_bytes()
        with self.assertRaises(ValidationError):
            uploads.validate_attachment(self._upload('big.pdf', size=limit + 1))

    def test_missing_file_is_rejected(self):
        with self.assertRaises(ValidationError):
            uploads.validate_attachment(None)

    def test_inline_only_for_safe_extensions(self):
        self.assertTrue(uploads.is_inline_safe('a/b/scan.pdf'))
        self.assertTrue(uploads.is_inline_safe('photo.JPG'))
        self.assertFalse(uploads.is_inline_safe('sheet.xlsx'))
        self.assertFalse(uploads.is_inline_safe('page.html'))

    def test_stored_filename_is_sanitized(self):
        name = uploads.stored_filename(self._upload('../../etc/pa:ss<wd>.pdf'))
        self.assertNotIn('/', name)
        self.assertNotIn('<', name)
        self.assertTrue(name.lower().endswith('.pdf'))

    def test_content_type_guess(self):
        self.assertEqual(uploads.content_type_of('x.pdf'), 'application/pdf')


class DownloadTokenTests(SimpleTestCase):
    """توکن امضاشدهٔ دانلود پیوست."""

    def test_round_trip(self):
        user = _user()
        token = issue_token(user, 42)
        self.assertTrue(token)
        self.assertEqual(read_token(token), (user.pk, 42))

    def test_invalid_token_is_rejected(self):
        self.assertIsNone(read_token('not-a-token'))
        self.assertIsNone(read_token(''))

    def test_tampered_token_is_rejected(self):
        token = issue_token(_user(), 42)
        tampered = f'{token[:-2]}xx'
        self.assertIsNone(read_token(tampered))

    def test_anonymous_gets_no_token(self):
        self.assertEqual(issue_token(SimpleNamespace(is_authenticated=False), 5), '')

    def test_missing_user_gets_no_token(self):
        self.assertEqual(issue_token(None, 5), '')


class ViewsetPermissionMatrixTests(SimpleTestCase):
    """ماتریس مجوز ویوست‌ها باید همهٔ عمل‌های حساس را پوشش دهد."""

    def test_letter_matrix_covers_write_actions(self):
        from correspondences.views import LetterViewSet

        for action in ('create', 'update', 'partial_update', 'destroy', 'refer',
                       'register', 'archive', 'close', 'comment', 'reply',
                       'export_excel', 'quick_party'):
            self.assertIn(action, LetterViewSet.permission_matrix, action)

    def test_attachment_matrix_covers_upload_and_delete(self):
        from correspondences.views import LetterAttachmentViewSet

        self.assertEqual(LetterAttachmentViewSet.permission_matrix['create'][0], 'edit')
        self.assertEqual(LetterAttachmentViewSet.permission_matrix['destroy'][0], 'delete')

    def test_alias_apply_requires_edit(self):
        from correspondences.views import CorrespondenceNameAliasViewSet

        self.assertEqual(
            CorrespondenceNameAliasViewSet.permission_matrix['apply'][0], 'edit',
        )
        self.assertEqual(
            CorrespondenceNameAliasViewSet.permission_matrix['apply_all'][0], 'edit',
        )

    def test_requests_approval_requires_approve(self):
        from correspondences.views import LetterRequestViewSet

        for action in ('approve', 'reject'):
            self.assertEqual(
                LetterRequestViewSet.permission_matrix[action][0], 'approve', action,
            )

    def test_referral_personal_actions_are_not_module_gated(self):
        """کارتابل/مشاهده/یادداشت ارجاع باید برای صاحب ارجاع بدون مجوز ماژول باز باشد."""
        from correspondences.views import LetterReferralViewSet

        for action in ('cartable', 'seen', 'note', 'instruction', 'complete'):
            self.assertNotIn(action, LetterReferralViewSet.permission_matrix, action)

    def test_download_action_exists_on_attachment_viewset(self):
        from correspondences.views import LetterAttachmentViewSet

        self.assertTrue(hasattr(LetterAttachmentViewSet, 'download'))

    def test_download_url_is_exposed_on_attachment_serializers(self):
        from correspondences.serializers import (
            LetterAttachmentBriefSerializer, LetterAttachmentSerializer,
        )

        self.assertIn('download_url', LetterAttachmentSerializer.Meta.fields)
        self.assertIn('preview_url', LetterAttachmentSerializer.Meta.fields)
        self.assertIn('preview_url', LetterAttachmentBriefSerializer.Meta.fields)
