"""Helpers for the in-app updater: storage paths, hashing, manifest & signature.

A package is a ``.zip`` or ``.tar.gz`` archive that contains at least:

* ``manifest.json`` — product, version, channel, notes, migrations, ...
* ``signature.ed25519`` *or* ``manifest.json.sig`` — Ed25519 signature of the
  **raw bytes** of ``manifest.json`` (Base64 raw public key in settings).

Packages are stored under ``settings.UPDATE_ROOT`` (default ``<repo>/updates``)
which lives **outside** ``MEDIA_ROOT`` so they can never be downloaded through
the public ``/media/`` URL.
"""
from __future__ import annotations

import base64
import hashlib
import json
import tarfile
import zipfile
from pathlib import Path

from django.conf import settings

MANIFEST_NAME = 'manifest.json'
SIGNATURE_NAMES = ('signature.ed25519', 'manifest.json.sig', 'manifest.sig')
SUPPORTED_SUFFIXES = ('.tar.gz', '.tgz', '.zip')
PRODUCT = 'kian-erp'


class UpdateError(Exception):
    """Raised when a package fails validation."""


def update_root() -> Path:
    """Return (and create) ``updates/{inbox,staging,archive}``."""
    root = Path(settings.UPDATE_ROOT)
    for name in ('inbox', 'staging', 'archive'):
        (root / name).mkdir(parents=True, exist_ok=True)
    return root


def upload_dir(upload_id: str) -> Path:
    path = update_root() / 'inbox' / upload_id
    path.mkdir(parents=True, exist_ok=True)
    return path


def archive_dir() -> Path:
    return update_root() / 'archive'


def max_package_bytes() -> int:
    return int(getattr(settings, 'UPDATE_MAX_PACKAGE_MB', 512)) * 1024 * 1024


def sha256_file(path) -> str:
    digest = hashlib.sha256()
    with open(path, 'rb') as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def _read_member(path: Path, name: str):
    """Return the bytes of ``name`` inside the archive without extracting it."""
    lower = str(path).lower()
    if lower.endswith('.zip'):
        with zipfile.ZipFile(path) as zf:
            try:
                return zf.read(name)
            except KeyError:
                return None
    if lower.endswith(('.tar.gz', '.tgz')):
        with tarfile.open(path, 'r:gz') as tf:
            try:
                member = tf.getmember(name)
            except KeyError:
                return None
            handle = tf.extractfile(member)
            return handle.read() if handle else None
    return None


def read_manifest(path: Path):
    """Return ``(manifest_dict, raw_bytes)`` or raise :class:`UpdateError`."""
    raw = _read_member(path, MANIFEST_NAME)
    if not raw:
        raise UpdateError('فایل manifest.json در بسته پیدا نشد.')
    try:
        manifest = json.loads(raw.decode('utf-8'))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise UpdateError('محتوای manifest.json معتبر نیست.') from exc
    if not isinstance(manifest, dict):
        raise UpdateError('ساختار manifest.json نامعتبر است.')
    return manifest, raw


def read_signature(path: Path):
    for name in SIGNATURE_NAMES:
        raw = _read_member(path, name)
        if raw:
            return raw
    return None


def configured_public_key() -> str:
    return (getattr(settings, 'UPDATE_PUBLIC_KEY', '') or '').strip()


def verify_signature(manifest_bytes: bytes, signature: bytes, public_key_b64: str) -> bool:
    """Verify an Ed25519 signature over the raw manifest bytes."""
    try:
        from cryptography.exceptions import InvalidSignature
        from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
    except ImportError:  # pragma: no cover — cryptography is a project dependency
        return False
    try:
        key = Ed25519PublicKey.from_public_bytes(base64.b64decode(public_key_b64))
    except Exception:  # noqa: BLE001 — کلید نامعتبر
        return False
    try:
        key.verify(signature, manifest_bytes)
        return True
    except InvalidSignature:
        return False


def version_tuple(value):
    parts = []
    for chunk in str(value or '').replace('-', '.').split('.'):
        parts.append(int(chunk) if chunk.isdigit() else 0)
    parts = parts[:3]
    return tuple(parts + [0] * (3 - len(parts)))


def validate_manifest(manifest: dict, current_version: str):
    """Return ``(errors, warnings)`` for a manifest against the running version."""
    errors, warnings = [], []

    product = manifest.get('product')
    if product and product != PRODUCT:
        errors.append(f'این بسته متعلق به محصول «{product}» است و برای Kian ERP نیست.')

    version = manifest.get('version')
    if not version:
        errors.append('نسخه در مانیفست تعیین نشده است.')
    elif version_tuple(version) <= version_tuple(current_version):
        errors.append(
            f'نسخهٔ بسته ({version}) باید از نسخهٔ فعلی ({current_version}) بزرگ‌تر باشد.'
        )

    min_from = manifest.get('min_app_version')
    if min_from and version_tuple(current_version) < version_tuple(min_from):
        errors.append(f'برای نصب این بسته ابتدا باید به نسخهٔ {min_from} ارتقا دهید.')

    requires = manifest.get('requires') or {}
    if requires.get('python'):
        from sys import version_info as py
        current_python = f'{py.major}.{py.minor}'
        minimum = str(requires['python']).lstrip('>= ').strip()
        if version_tuple(current_python) < version_tuple(minimum):
            warnings.append(
                f'این بسته به Python {minimum} نیاز دارد (نسخهٔ فعلی: {current_python}).'
            )

    if not manifest.get('migrations'):
        warnings.append('این بسته هیچ مهاجرت دیتابیسی ندارد؛ فقط کد/فرانت‌اند به‌روز می‌شود.')

    return errors, warnings


def inspect_package(path: Path, current_version: str) -> dict:
    """Read + verify a package and return a ready-to-store result dict."""
    manifest, manifest_bytes = read_manifest(path)
    signature = read_signature(path)
    public_key = configured_public_key()

    if public_key:
        if not signature or not verify_signature(manifest_bytes, signature, public_key):
            raise UpdateError('امضای دیجیتال بسته معتبر نیست (یا کلید عمومی مطابقت ندارد).')
        signature_status = 'valid'
    elif signature:
        signature_status = 'unverified'
    else:
        if not getattr(settings, 'UPDATE_ALLOW_UNSIGNED', True):
            raise UpdateError('بسته امضا ندارد و پذیرش بستهٔ بدون امضا غیرفعال است.')
        signature_status = 'unconfigured'

    errors, warnings = validate_manifest(manifest, current_version)
    if errors:
        raise UpdateError(' '.join(errors))

    return {
        'manifest': manifest,
        'version': str(manifest.get('version') or ''),
        'build_hash': str(manifest.get('build_hash') or ''),
        'channel': str(manifest.get('channel') or 'stable'),
        'notes': str(manifest.get('notes') or '').strip(),
        'signature_status': signature_status,
        'warnings': warnings,
    }

