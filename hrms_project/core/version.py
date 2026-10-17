"""Single source of truth for the Kian ERP version.

The value is read (in order) from:
  1. the ``APP_VERSION`` environment variable,
  2. ``<repo>/VERSION``,
  3. ``<repo>/hrms_project/VERSION``,
and finally falls back to ``0.0.0`` so the system never crashes on a missing file.
"""
from __future__ import annotations

import os
from pathlib import Path

PRODUCT = 'kian-erp'
PRODUCT_NAME_FA = 'کیان ERP'
PRODUCT_NAME_EN = 'Kian ERP'

_HERE = Path(__file__).resolve()
_CANDIDATES = (
    _HERE.parents[2] / 'VERSION',      # <repo>/VERSION
    _HERE.parents[1] / 'VERSION',      # <repo>/hrms_project/VERSION
)


def _read_version() -> str:
    env_value = (os.environ.get('APP_VERSION') or '').strip()
    if env_value:
        return env_value
    for path in _CANDIDATES:
        try:
            raw = path.read_text(encoding='utf-8').strip()
        except OSError:
            continue
        if raw:
            return raw.splitlines()[0].strip()
    return '0.0.0'


VERSION = _read_version()
BUILD_HASH = (os.environ.get('APP_BUILD_HASH') or '').strip()


def version_info() -> dict:
    """Serialisable snapshot used by the API and the UI footer."""
    return {
        'product': PRODUCT,
        'product_name_fa': PRODUCT_NAME_FA,
        'product_name_en': PRODUCT_NAME_EN,
        'version': VERSION,
        'build_hash': BUILD_HASH,
    }
