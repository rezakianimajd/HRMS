#!/usr/bin/env python3
"""Kian ERP privileged updater.

Executed as **root** by ``hrms-update.service`` (triggered by
``hrms-update.path`` when ``<UPDATE_ROOT>/queue/request.json`` appears):

    countdown → maintenance ON → DB dump → code snapshot → extract package
    → copy code → pip install wheels → migrate_schemas → swap build
    → refresh /static → restart services → health check → maintenance OFF

Any failure restores the code snapshot and keeps the system usable.
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tarfile
import time
import traceback
import zipfile
from datetime import datetime
from pathlib import Path

try:  # POSIX only — the updater runs on Linux, but keep local imports working
    import fcntl
except ImportError:  # pragma: no cover
    fcntl = None

APP_DIR = Path(os.environ.get('KIAN_APP_DIR', '/opt/hrms'))
APP_USER = os.environ.get('KIAN_APP_USER', 'hrms')
VENV = Path(os.environ.get('KIAN_VENV', str(APP_DIR / 'venv')))
BACKUP_DIR = Path(os.environ.get('KIAN_BACKUP_DIR', '/var/backups/hrms'))
STATIC_DIR = Path(os.environ.get('KIAN_STATIC_DIR', '/var/www/hrms/static'))
SERVICES = os.environ.get('KIAN_SERVICES', 'gunicorn celery-worker celery-beat').split()
HEALTH_URL = os.environ.get('KIAN_HEALTH_URL', 'http://127.0.0.1/api/health/')
UPDATE_ROOT = Path(os.environ.get('UPDATE_ROOT', str(APP_DIR / 'updates')))
DJANGO_DIR = APP_DIR / 'hrms_project'
LOG_PREFIX = '[kian-updater]'

_maintenance = None


def log(message: str) -> None:
    print(f'{LOG_PREFIX} {datetime.now().isoformat(timespec="seconds")} {message}', flush=True)


def run(cmd, *, as_user=True, cwd=None, check=True, env=None, timeout=None):
    """Run a shell command (as the application user unless told otherwise)."""
    if isinstance(cmd, str):
        cmd = ['bash', '-lc', cmd]
    if as_user:
        cmd = ['sudo', '-u', APP_USER, '-H'] + list(cmd)
    log('$ ' + ' '.join(str(part) for part in cmd))
    result = subprocess.run(
        cmd, cwd=str(cwd) if cwd else None, capture_output=True, text=True,
        env=env, timeout=timeout,
    )
    if result.stdout.strip():
        log(result.stdout.strip()[-4000:])
    if result.returncode != 0:
        log('STDERR: ' + (result.stderr.strip()[-4000:] or '(empty)'))
        if check:
            raise RuntimeError(f'command failed ({result.returncode}): {" ".join(cmd)}')
    return result


def load_env() -> dict:
    env = dict(os.environ)
    env_file = APP_DIR / '.env'
    if env_file.exists():
        for raw in env_file.read_text(encoding='utf-8').splitlines():
            line = raw.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            key, value = line.split('=', 1)
            env.setdefault(key.strip(), value.strip().strip('"').strip("'"))
    env['DJANGO_SETTINGS_MODULE'] = 'hrms_project.settings.production'
    env['PYTHONPATH'] = str(DJANGO_DIR)
    return env


def setup_django():
    sys.path.insert(0, str(DJANGO_DIR))
    os.environ.update(load_env())
    import django  # noqa: PLC0415
    django.setup()
    from django.conf import settings  # noqa: PLC0415
    global _maintenance
    from core import maintenance  # noqa: PLC0415
    _maintenance = maintenance
    log(f'settings loaded (MEDIA_ROOT={settings.MEDIA_ROOT})')


def update_run(run_id, **fields):
    """Patch an UpdateRun row; bookkeeping must never break the update."""
    try:
        from core.models import UpdateRun  # noqa: PLC0415
        from django.utils import timezone  # noqa: PLC0415
        run_obj = UpdateRun.objects.filter(pk=run_id).first()
        if not run_obj:
            return
        if 'step' in fields:
            name, status = fields.pop('step')
            steps = list(run_obj.steps or [])
            steps.append({'name': name, 'status': status, 'at': timezone.now().isoformat()})
            run_obj.steps = steps
            fields['steps'] = steps
        for key, value in fields.items():
            setattr(run_obj, key, value)
        run_obj.save()
    except Exception:  # noqa: BLE001
        log('WARN: could not update UpdateRun: ' + traceback.format_exc(limit=2))


def set_maintenance(active: bool, message: str = '', version: str = ''):
    if _maintenance is None:
        return
    try:
        if active:
            _maintenance.write_maintenance(message, version=version)
        else:
            _maintenance.clear_maintenance()
    except Exception:  # noqa: BLE001
        log('WARN: maintenance flag error: ' + traceback.format_exc(limit=2))


def broadcast(title, message, level='info', action='none'):
    try:
        from core.models import SystemBroadcast  # noqa: PLC0415
        SystemBroadcast.objects.filter(is_active=True, level='maintenance').update(is_active=False)
        SystemBroadcast.objects.create(title=title, message=message, level=level, action=action)
    except Exception:  # noqa: BLE001
        log('WARN: broadcast failed: ' + traceback.format_exc(limit=2))


def notify(subject, message):
    """Email/Bale notification — never raises."""
    try:
        from core.update_notify import notify_event  # noqa: PLC0415
        result = notify_event(subject, message)
        log(f'notified: {result}')
    except Exception:  # noqa: BLE001
        log('WARN: notification failed: ' + traceback.format_exc(limit=2))


def mark_schedule(run_id, status):
    """Close the matching UpdateSchedule row (done/failed)."""
    try:
        from core.models import UpdateSchedule  # noqa: PLC0415
        UpdateSchedule.objects.filter(queued_run_id=run_id).update(status=status)
    except Exception:  # noqa: BLE001
        log('WARN: could not update schedule: ' + traceback.format_exc(limit=2))


def prune_artifacts():
    """Keep only the newest N code snapshots and DB dumps."""
    keep = 3
    try:
        from core.models import UpdateSettings  # noqa: PLC0415
        keep = max(1, int(UpdateSettings.load().keep_releases or 3))
    except Exception:  # noqa: BLE001
        pass

    for pattern in ('code_*.tar.gz', 'preupdate_*.dump'):
        files = sorted(
            BACKUP_DIR.glob(pattern), key=lambda item: item.stat().st_mtime, reverse=True,
        )
        for old in files[keep:]:
            try:
                old.unlink()
                log(f'pruned {old.name}')
            except OSError:
                pass


def safe_extract(archive: Path, target: Path) -> None:
    """Extract zip/tar archives while refusing entries outside ``target``."""
    target = target.resolve()
    target.mkdir(parents=True, exist_ok=True)

    if archive.name.lower().endswith('.zip'):
        with zipfile.ZipFile(archive) as zf:
            for member in zf.infolist():
                destination = (target / member.filename).resolve()
                if not str(destination).startswith(str(target)):
                    raise RuntimeError(f'unsafe path in package: {member.filename}')
            zf.extractall(target)
        return

    with tarfile.open(archive, 'r:*') as tf:
        for member in tf.getmembers():
            destination = (target / member.name).resolve()
            if not str(destination).startswith(str(target)):
                raise RuntimeError(f'unsafe path in package: {member.name}')
            if member.issym() or member.islnk():
                raise RuntimeError(f'links are not allowed in packages: {member.name}')
        tf.extractall(target)


# --------------------------------------------------------------------------- #
# Low-level operations
# --------------------------------------------------------------------------- #
def backup_database(db_path: Path, env: dict) -> None:
    db_name = env.get('DB_NAME', 'hrms_db')
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    run(['sudo', '-u', 'postgres', 'pg_dump', '-Fc', '-f', str(db_path), db_name],
        as_user=False, env=env, timeout=1800)


def snapshot_code(code_path: Path) -> None:
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    run([
        'tar', '-czf', str(code_path),
        '--exclude', '__pycache__', '--exclude', '*.pyc',
        '-C', str(APP_DIR), 'hrms_project', 'frontend/build', 'VERSION',
    ], as_user=False, timeout=900)


def copy_code(staging: Path) -> list:
    """Merge the staged backend/build over the live tree."""
    copied = []
    backend = staging / 'hrms_project'
    if backend.is_dir():
        shutil.copytree(backend, APP_DIR / 'hrms_project', dirs_exist_ok=True)
        copied.append('hrms_project')

    build = staging / 'frontend/build'
    if build.is_dir():
        target = APP_DIR / 'frontend/build'
        old = APP_DIR / 'frontend/build.old'
        shutil.rmtree(old, ignore_errors=True)
        if target.exists():
            shutil.move(str(target), str(old))
        shutil.copytree(build, target)
        shutil.rmtree(old, ignore_errors=True)
        copied.append('frontend/build')

    version_file = staging / 'VERSION'
    if version_file.exists():
        shutil.copy2(version_file, APP_DIR / 'VERSION')
        copied.append('VERSION')

    run(['chown', '-R', f'{APP_USER}:{APP_USER}',
         str(APP_DIR / 'hrms_project'), str(APP_DIR / 'frontend/build')],
        as_user=False)
    run(['bash', '-lc',
         f'find {DJANGO_DIR} -name __pycache__ -type d -prune -exec rm -rf {{}} + 2>/dev/null; true'],
        as_user=False)
    return copied


def install_wheels(staging: Path) -> None:
    wheels = staging / 'wheels'
    if not wheels.is_dir() or not any(wheels.glob('*.whl')):
        log('no wheels in package — skipping pip install')
        return
    run([
        str(VENV / 'bin/pip'), 'install', '--no-index', '--find-links', str(wheels),
        '-r', str(DJANGO_DIR / 'requirements.txt'),
    ], timeout=1800)


def run_migrations() -> None:
    command = (
        f'cd {DJANGO_DIR} && set -a && . {APP_DIR}/.env && set +a && '
        f'DJANGO_SETTINGS_MODULE=hrms_project.settings.production '
        f'{VENV}/bin/python manage.py migrate_schemas --noinput'
    )
    run(command, timeout=3600)


def refresh_static() -> None:
    run(['bash', '-lc',
         f'cp -a {APP_DIR}/frontend/build/static/. {STATIC_DIR}/ && '
         f'chown -R {APP_USER}:{APP_USER} {STATIC_DIR}'])
    # keep the 5 newest bundles only (their .map files are several MB each)
    run(['bash', '-lc',
         f'cd {STATIC_DIR}/js && ls -1t main.*.js 2>/dev/null | tail -n +6 | xargs -r rm -f; '
         f'cd {STATIC_DIR}/js && ls -1t main.*.js.map 2>/dev/null | tail -n +6 | xargs -r rm -f; '
         f'cd {STATIC_DIR}/js && ls -1t main.*.js.LICENSE.txt 2>/dev/null | tail -n +6 | xargs -r rm -f; '
         f'cd {STATIC_DIR}/css && ls -1t main.*.css 2>/dev/null | tail -n +6 | xargs -r rm -f; '
         f'cd {STATIC_DIR}/css && ls -1t main.*.css.map 2>/dev/null | tail -n +6 | xargs -r rm -f'],
        as_user=False)


def restart_services() -> None:
    run(['systemctl', 'restart', *SERVICES], as_user=False, check=False)
    run(['systemctl', 'reload', 'nginx'], as_user=False, check=False)


def health_check(timeout: int = 120) -> bool:
    import urllib.request  # noqa: PLC0415
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(HEALTH_URL, timeout=5) as response:
                if response.status == 200:
                    log('health check OK')
                    return True
        except Exception:  # noqa: BLE001
            time.sleep(3)
    log('health check FAILED')
    return False


def restore_code(code_snapshot: Path) -> None:
    run(['tar', '-xzf', str(code_snapshot), '-C', str(APP_DIR)], as_user=False)
    run(['chown', '-R', f'{APP_USER}:{APP_USER}',
         str(APP_DIR / 'hrms_project'), str(APP_DIR / 'frontend/build')],
        as_user=False)



# --------------------------------------------------------------------------- #
# Apply / rollback
# --------------------------------------------------------------------------- #
def _now():
    from django.utils import timezone  # noqa: PLC0415
    return timezone.now()


def apply_release(data):
    from core.models import AppRelease, SystemBroadcast, UpdateRun  # noqa: PLC0415

    run_id = data['run_id']
    artifact = Path(data['artifact'])
    version = data.get('version', '')
    from_version = data.get('from_version', '')
    countdown = int(data.get('countdown_seconds') or 0)
    env = load_env()
    stamp = datetime.now().strftime('%Y%m%d%H%M%S')

    log(f'apply {from_version} -> {version} (run {run_id})')
    update_run(run_id, status=UpdateRun.Status.RUNNING, step=('queued', 'done'))

    if countdown > 0:
        log(f'waiting {countdown}s for users to log out')
        time.sleep(countdown)
    update_run(run_id, step=('countdown', 'done'))

    set_maintenance(True, 'سیستم در حال به‌روزرسانی است؛ لطفاً چند لحظه صبر کنید.', version)
    update_run(run_id, step=('maintenance', 'done'))

    if not artifact.exists():
        raise RuntimeError(f'artifact not found: {artifact}')

    staging = UPDATE_ROOT / 'staging' / f'run-{run_id}'
    shutil.rmtree(staging, ignore_errors=True)
    safe_extract(artifact, staging)
    update_run(run_id, step=('extract', 'done'))

    db_dump = BACKUP_DIR / f'preupdate_{version or "unknown"}_{stamp}.dump'
    code_snapshot = BACKUP_DIR / f'code_{from_version or "unknown"}_{stamp}.tar.gz'
    backup_database(db_dump, env)
    snapshot_code(code_snapshot)
    update_run(
        run_id,
        backup_path=json.dumps({'db': str(db_dump), 'code': str(code_snapshot)}),
        step=('backup', 'done'),
    )

    try:
        copied = copy_code(staging)
        log('copied: ' + (', '.join(copied) if copied else 'nothing'))
        update_run(run_id, step=('copy-code', 'done'))

        install_wheels(staging)
        update_run(run_id, step=('wheels', 'done'))

        run_migrations()
        update_run(run_id, step=('migrate', 'done'))

        refresh_static()
        update_run(run_id, step=('static', 'done'))

        restart_services()
        update_run(run_id, step=('restart', 'done'))

        if not health_check():
            raise RuntimeError('health check failed after restart')
    except Exception:
        log('apply failed — restoring previous code')
        try:
            restore_code(code_snapshot)
            restart_services()
            health_check(90)
        except Exception:  # noqa: BLE001
            log('MANUAL INTERVENTION REQUIRED — rollback failed:')
            log(traceback.format_exc())
        raise

    try:
        release = AppRelease.objects.filter(pk=data.get('release_id')).first()
        if release:
            release.status = AppRelease.Status.APPLIED
            release.save(update_fields=['status'])
    except Exception:  # noqa: BLE001
        log('WARN: could not mark release as applied')

    update_run(run_id, status=UpdateRun.Status.SUCCESS, finished_at=_now(),
               step=('completed', 'done'))
    broadcast(
        f'به‌روزرسانی به نسخهٔ {version} انجام شد',
        'سیستم به‌روزرسانی شد. لطفاً صفحه را بازخوانی کنید و دوباره وارد شوید.',
        SystemBroadcast.Level.SUCCESS, SystemBroadcast.Action.RELOAD,
    )
    mark_schedule(run_id, 'done')
    notify(
        f'به‌روزرسانی به نسخهٔ {version} انجام شد',
        f'ارتقا از {from_version} به {version} با موفقیت انجام شد.\n'
        f'درخواست‌دهنده: {data.get("requested_by") or "system"}',
    )
    prune_artifacts()
    log('update applied successfully')



def do_rollback(data):
    from core.models import SystemBroadcast, UpdateRun  # noqa: PLC0415

    run_id = data['run_id']
    run_obj = UpdateRun.objects.filter(pk=run_id).first()
    if not run_obj:
        raise RuntimeError(f'run {run_id} not found')

    countdown = int(data.get('countdown_seconds') or 0)
    if countdown > 0:
        time.sleep(countdown)

    set_maintenance(True, 'در حال بازگردانی نسخهٔ قبلی؛ لطفاً چند لحظه صبر کنید.', '')

    snapshot = {}
    if (run_obj.backup_path or '').startswith('{'):
        try:
            snapshot = json.loads(run_obj.backup_path)
        except ValueError:
            snapshot = {}

    code_snapshot = Path(snapshot.get('code', ''))
    if not code_snapshot.exists():
        raise RuntimeError(f'code snapshot not found: {code_snapshot}')

    restore_code(code_snapshot)
    restart_services()
    if not health_check(120):
        raise RuntimeError('health check failed after rollback')

    run_obj.status = UpdateRun.Status.ROLLED_BACK
    run_obj.finished_at = _now()
    run_obj.save(update_fields=['status', 'finished_at'])

    broadcast(
        'بازگشت به نسخهٔ قبلی انجام شد',
        'سیستم به نسخهٔ قبلی بازگردانده شد. لطفاً صفحه را بازخوانی کنید.',
        SystemBroadcast.Level.WARNING, SystemBroadcast.Action.RELOAD,
    )
    notify(
        'بازگشت به نسخهٔ قبلی انجام شد',
        f'اجرای #{run_id} بازگردانده شد (اسنپ‌شات: {code_snapshot.name}).',
    )
    log('rollback completed')


# --------------------------------------------------------------------------- #
# Entry point
# --------------------------------------------------------------------------- #
def main(argv=None) -> int:
    import argparse  # noqa: PLC0415

    parser = argparse.ArgumentParser(description='Kian ERP privileged updater')
    parser.add_argument('--request', default=str(UPDATE_ROOT / 'queue' / 'request.json'))
    args = parser.parse_args(argv)
    request_path = Path(args.request)

    UPDATE_ROOT.mkdir(parents=True, exist_ok=True)
    lock_path = UPDATE_ROOT / 'updater.lock'
    with open(lock_path, 'w', encoding='utf-8') as lock:
        if fcntl is not None:
            try:
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError:
                log('another update is already running — request ignored')
                return 2

        if not request_path.exists():
            log(f'no request file at {request_path}')
            return 0

        raw = request_path.read_text(encoding='utf-8')
        processed = UPDATE_ROOT / 'queue' / 'processed'
        processed.mkdir(parents=True, exist_ok=True)
        stamp = datetime.now().strftime('%Y%m%d%H%M%S')
        shutil.move(str(request_path), str(processed / f'request-{stamp}.json'))

        try:
            data = json.loads(raw)
        except ValueError:
            log('invalid request JSON — aborted')
            return 1

        setup_django()
        try:
            action = data.get('action')
            if action == 'apply':
                apply_release(data)
            elif action == 'rollback':
                do_rollback(data)
            else:
                log(f'unknown action: {action}')
                return 1
            return 0
        except Exception as exc:  # noqa: BLE001
            log('UPDATE FAILED:\n' + traceback.format_exc())
            update_run(data.get('run_id'), status='failed', error=str(exc)[:2000],
                       finished_at=_now())
            mark_schedule(data.get('run_id'), 'failed')
            broadcast('به‌روزرسانی ناموفق بود', f'خطا: {exc}', 'warning', 'none')
            notify('به‌روزرسانی ناموفق بود', f'خطا: {exc}')
            return 1
        finally:
            set_maintenance(False)


if __name__ == '__main__':
    raise SystemExit(main())

