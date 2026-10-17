#!/usr/bin/env python3
"""Build (and optionally sign) a Kian ERP update package.

Examples
--------
    # one-time: create a signing key and print the public key for .env
    python scripts/build_update_package.py --generate-key

    # build + sign a package
    python scripts/build_update_package.py --version 1.0.1 \
        --notes "رفع اشکال بایگانی" --key update_key.pem

The resulting ``dist/kian-erp-<version>.zip`` is what you upload in
Settings → System Updates.
"""
from __future__ import annotations

import argparse
import base64
import json
import re
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BACKEND_EXCLUDED = {
    '__pycache__', 'media', 'static', 'logs', '.git', 'node_modules',
    'venv', 'env', '.venv', '.pytest_cache', '.mypy_cache',
}
BUILD_EXCLUDED = {'__pycache__', '.git', 'node_modules'}
EXCLUDED_SUFFIXES = {'.pyc', '.pyo', '.log'}


def read_version() -> str:
    try:
        return (ROOT / 'VERSION').read_text(encoding='utf-8').strip().splitlines()[0]
    except (OSError, IndexError):
        return '0.0.0'


def build_hash() -> str:
    index = ROOT / 'frontend' / 'build' / 'index.html'
    try:
        match = re.search(r'main\.([a-z0-9]+)\.js', index.read_text(encoding='utf-8'))
        return match.group(1) if match else ''
    except OSError:
        return ''


def iter_files(base: Path, excluded):
    for path in base.rglob('*'):
        if path.is_dir():
            continue
        if any(part in excluded for part in path.relative_to(base).parts):
            continue
        if path.suffix.lower() in EXCLUDED_SUFFIXES:
            continue
        yield path


def generate_key(path: Path) -> None:
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

    key = Ed25519PrivateKey.generate()
    path.write_bytes(key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ))
    public_raw = key.public_key().public_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PublicFormat.Raw,
    )
    public_b64 = base64.b64encode(public_raw).decode()
    print(f'[ok] private key written to {path}')
    print('[..] add this to the server .env:')
    print(f'     UPDATE_PUBLIC_KEY={public_b64}')


def sign_manifest(manifest_bytes: bytes, key_path: Path) -> bytes:
    from cryptography.hazmat.primitives import serialization

    private_key = serialization.load_pem_private_key(key_path.read_bytes(), password=None)
    return private_key.sign(manifest_bytes)


def main() -> int:
    parser = argparse.ArgumentParser(description='Build a Kian ERP update package')
    parser.add_argument('--version', default=read_version())
    parser.add_argument('--channel', default='stable')
    parser.add_argument('--min-app-version', default=read_version())
    parser.add_argument('--notes', default='')
    parser.add_argument('--migrations', default='', help='comma separated, e.g. core.0014,documents.0005')
    parser.add_argument('--key', help='Ed25519 private key (PEM) used to sign the manifest')
    parser.add_argument('--generate-key', action='store_true')
    parser.add_argument('--output-dir', default=str(ROOT / 'dist'))
    args = parser.parse_args()

    if args.generate_key:
        generate_key(ROOT / (args.key or 'update_key.pem'))
        return 0

    backend = ROOT / 'hrms_project'
    build = ROOT / 'frontend' / 'build'
    wheels = ROOT / '_transfer' / 'wheels'

    if not (build / 'index.html').exists():
        print('[error] frontend/build/index.html not found — run `npm run build` first')
        return 1

    manifest = {
        'product': 'kian-erp',
        'version': args.version,
        'channel': args.channel,
        'build_hash': build_hash(),
        'min_app_version': args.min_app_version,
        'migrations': [item.strip() for item in args.migrations.split(',') if item.strip()],
        'rollback_safe': True,
        'requires': {'python': '>=3.12', 'postgres': '>=16'},
        'notes': args.notes,
        'created_at': datetime.now(timezone.utc).isoformat(),
    }
    manifest_bytes = json.dumps(manifest, ensure_ascii=False, indent=2).encode('utf-8')

    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    package = out_dir / f'kian-erp-{args.version}.zip'

    print(f'[..] packaging {args.version} -> {package}')
    with zipfile.ZipFile(package, 'w', zipfile.ZIP_DEFLATED) as archive:
        archive.writestr('manifest.json', manifest_bytes)
        if args.key:
            archive.writestr('signature.ed25519', sign_manifest(manifest_bytes, Path(args.key)))
        archive.writestr('VERSION', f'{args.version}\n')

        for name, base, excluded in (
            ('hrms_project', backend, BACKEND_EXCLUDED),
            ('frontend/build', build, BUILD_EXCLUDED),
        ):
            for path in iter_files(base, excluded):
                archive.write(path, f'{name}/{path.relative_to(base).as_posix()}')

        if wheels.is_dir():
            for wheel in wheels.glob('*.whl'):
                archive.write(wheel, f'wheels/{wheel.name}')

    size_mb = package.stat().st_size / (1024 * 1024)
    print(f'[ok] {package} ({size_mb:.1f} MB)')
    if not args.key:
        print('[..] unsigned package — accepted only when UPDATE_ALLOW_UNSIGNED=True')
    return 0


if __name__ == '__main__':
    sys.exit(main())
