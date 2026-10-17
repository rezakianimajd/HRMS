"""Maintenance-mode flag shared between the web app and the privileged updater.

The flag is a small JSON file under ``settings.UPDATE_ROOT`` so that the
root-owned updater can enable/disable maintenance without touching the DB, and
the web process can read it cheaply (values are cached for a couple of seconds).
"""
from __future__ import annotations

import json
import os
import time
from pathlib import Path

from django.conf import settings
from django.utils import timezone

CACHE_SECONDS = 2.0
_cache = {'at': 0.0, 'data': None}


def maintenance_file() -> Path:
    return Path(settings.UPDATE_ROOT) / 'maintenance.json'


def read_maintenance(force: bool = False):
    """Return the maintenance payload or ``None`` when the system is live."""
    now = time.time()
    if not force and _cache['data'] is not None and (now - _cache['at']) < CACHE_SECONDS:
        return _cache['data']

    data = None
    path = maintenance_file()
    try:
        with open(path, 'r', encoding='utf-8') as handle:
            payload = json.load(handle)
        if isinstance(payload, dict) and payload.get('active'):
            data = payload
    except (OSError, ValueError):
        data = None

    _cache['at'] = now
    _cache['data'] = data
    return data


def write_maintenance(message: str, *, version: str = '', ends_at=None) -> dict:
    payload = {
        'active': True,
        'message': message,
        'version': version,
        'started_at': timezone.now().isoformat(),
        'ends_at': ends_at.isoformat() if ends_at else None,
    }
    path = maintenance_file()
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix('.tmp')
    with open(tmp, 'w', encoding='utf-8') as handle:
        json.dump(payload, handle, ensure_ascii=False)
    os.replace(tmp, path)
    _cache['at'] = 0.0
    _cache['data'] = payload
    return payload


def clear_maintenance() -> None:
    try:
        maintenance_file().unlink()
    except OSError:
        pass
    _cache['at'] = 0.0
    _cache['data'] = None
