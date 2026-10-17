"""In-app update endpoints (Kian ERP).

Phase 1 covers: uploading a signed package (chunked, resumable), verifying it
and keeping a history. Applying a package stays disabled (``APPLY_ENABLED``)
until the privileged updater service of phase 2 is installed on the server.
"""
import shutil
import uuid
from datetime import timedelta
from pathlib import Path

from django.conf import settings
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core import updates_service as svc
from core.maintenance import read_maintenance
from core.models import (
    AppRelease, SystemBroadcast, UpdateRun, UpdateSchedule, UpdateSettings, UpdateUpload,
)
from core.update_notify import notify_event
from core.version import VERSION
from core.views import _public_schema

# Phase 2: the privileged `hrms-update.service` must be installed on the server.
APPLY_ENABLED = True


def _can_manage(user):
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    profile = getattr(user, 'profile', None)
    return bool(profile and profile.is_super_admin) or bool(
        profile and profile.can_manage_updates
    )


def _release_payload(release):
    manifest = release.manifest or {}
    warnings = manifest.get('validation_warnings') or []
    return {
        'id': release.id,
        'version': release.version,
        'build_hash': release.build_hash,
        'channel': release.channel,
        'notes': release.notes,
        'status': release.status,
        'status_display': release.get_status_display(),
        'signature_status': release.signature_status,
        'sha256': release.sha256,
        'size': release.size,
        'file_name': release.file_name,
        'created_at': release.created_at,
        'uploaded_by': release.uploaded_by.username if release.uploaded_by else '',
        'migrations': manifest.get('migrations') or [],
        'min_app_version': manifest.get('min_app_version') or '',
        'rollback_safe': bool(manifest.get('rollback_safe', True)),
        'warnings': warnings,
    }


def _run_payload(run):
    return {
        'id': run.id,
        'from_version': run.from_version,
        'to_version': run.to_version,
        'status': run.status,
        'status_display': run.get_status_display(),
        'steps': run.steps or [],
        'error': run.error,
        'backup_path': run.backup_path,
        'started_by': run.started_by.username if run.started_by else '',
        'started_at': run.started_at,
        'finished_at': run.finished_at,
    }


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@_public_schema
def updates_status(request):
    """Everything the update panel needs for its first render."""
    config = UpdateSettings.load()
    try:
        usage = shutil.disk_usage(svc.update_root())
        disk_free = usage.free
    except OSError:
        disk_free = None

    last_run = UpdateRun.objects.first()
    active_upload = (
        UpdateUpload.objects.filter(
            created_by=request.user, status=UpdateUpload.Status.OPEN,
        ).order_by('-created_at').first()
    )

    return Response({
        'current_version': VERSION,
        'can_manage': _can_manage(request.user),
        'apply_enabled': APPLY_ENABLED,
        'channel': config.channel,
        'countdown_seconds': config.logout_countdown_seconds,
        'signature_required': bool(svc.configured_public_key()),
        'allow_unsigned': bool(getattr(settings, 'UPDATE_ALLOW_UNSIGNED', True)),
        'max_package_mb': svc.max_package_bytes() // (1024 * 1024),
        'update_root': str(svc.update_root()),
        'disk_free': disk_free,
        'releases': [_release_payload(item) for item in AppRelease.objects.all()[:20]],
        'schedules': [
            _schedule_payload(item)
            for item in UpdateSchedule.objects.select_related('release', 'created_by')[:10]
        ],
        'last_run': _run_payload(last_run) if last_run else None,
        'maintenance': read_maintenance(),
        'queue_pending': (svc.update_root() / 'queue' / 'request.json').exists(),
        'active_upload': {
            'upload_id': active_upload.upload_id,
            'file_name': active_upload.file_name,
            'total_size': active_upload.total_size,
            'received_bytes': active_upload.received_bytes,
            'chunk_size': active_upload.chunk_size,
        } if active_upload else None,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@_public_schema
def upload_init(request):
    """Start a chunked upload session."""
    if not _can_manage(request.user):
        return Response({'error': 'دسترسی غیرمجاز'}, status=403)

    raw_name = str(request.data.get('file_name') or '').strip()
    file_name = Path(raw_name).name
    try:
        total_size = int(request.data.get('total_size') or 0)
    except (TypeError, ValueError):
        total_size = 0

    if not file_name:
        return Response({'error': 'نام فایل الزامی است.'}, status=400)
    if not file_name.lower().endswith(svc.SUPPORTED_SUFFIXES):
        return Response(
            {'error': 'فرمت بسته باید یکی از zip، tar.gz یا tgz باشد.'}, status=400,
        )
    if total_size <= 0:
        return Response({'error': 'حجم فایل نامعتبر است.'}, status=400)
    max_bytes = svc.max_package_bytes()
    if total_size > max_bytes:
        return Response(
            {'error': f'حجم بسته بیشتر از حد مجاز ({max_bytes // (1024 * 1024)} مگابایت) است.'},
            status=400,
        )

    try:
        free = shutil.disk_usage(svc.update_root()).free
        if free < total_size * 3:
            return Response({'error': 'فضای دیسک کافی نیست (حداقل ۳ برابر حجم بسته لازم است).'}, status=400)
    except OSError:
        pass

    upload_id = uuid.uuid4().hex
    upload = UpdateUpload.objects.create(
        upload_id=upload_id,
        file_name=file_name,
        total_size=total_size,
        created_by=request.user,
    )
    svc.upload_dir(upload_id)
    return Response({
        'upload_id': upload_id,
        'chunk_size': upload.chunk_size,
        'received_bytes': 0,
    }, status=201)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
@_public_schema
def upload_chunk(request, upload_id):
    """Receive one chunk (multipart field ``chunk`` + ``index``)."""
    if not _can_manage(request.user):
        return Response({'error': 'دسترسی غیرمجاز'}, status=403)

    upload = get_object_or_404(UpdateUpload, upload_id=upload_id)
    if upload.status != UpdateUpload.Status.OPEN:
        return Response({'error': 'این آپلود بسته شده است.'}, status=400)

    chunk = request.FILES.get('chunk')
    if not chunk:
        return Response({'error': 'بخش فایل ارسال نشده است.'}, status=400)
    try:
        index = int(request.data.get('index', 0))
    except (TypeError, ValueError):
        return Response({'error': 'شمارهٔ بخش نامعتبر است.'}, status=400)

    directory = svc.upload_dir(upload_id)
    part_path = directory / f'part-{index:05d}'
    with open(part_path, 'wb') as handle:
        for piece in chunk.chunks():
            handle.write(piece)

    received = sum(item.stat().st_size for item in directory.glob('part-*'))
    if received > upload.total_size * 1.05:
        shutil.rmtree(directory, ignore_errors=True)
        upload.status = UpdateUpload.Status.ABORTED
        upload.save(update_fields=['status', 'updated_at'])
        return Response({'error': 'حجم دریافتی از حجم اعلام‌شده بیشتر شد؛ آپلود لغو شد.'}, status=400)

    upload.received_bytes = received
    upload.save(update_fields=['received_bytes', 'updated_at'])
    return Response({
        'upload_id': upload_id,
        'index': index,
        'received_bytes': received,
        'total_size': upload.total_size,
    })


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
@_public_schema
def upload_abort(request, upload_id):
    """Abort an upload session and delete its temporary parts."""
    if not _can_manage(request.user):
        return Response({'error': 'دسترسی غیرمجاز'}, status=403)

    upload = get_object_or_404(UpdateUpload, upload_id=upload_id)
    shutil.rmtree(svc.upload_dir(upload_id), ignore_errors=True)
    upload.status = UpdateUpload.Status.ABORTED
    upload.save(update_fields=['status', 'updated_at'])
    return Response({'aborted': True})



@api_view(['POST'])
@permission_classes([IsAuthenticated])
@_public_schema
def upload_complete(request, upload_id):
    """Assemble the chunks, verify the package and register a release."""
    if not _can_manage(request.user):
        return Response({'error': 'دسترسی غیرمجاز'}, status=403)

    upload = get_object_or_404(UpdateUpload, upload_id=upload_id)
    if upload.status != UpdateUpload.Status.OPEN:
        return Response({'error': 'این آپلود قبلاً بسته شده است.'}, status=400)

    directory = svc.upload_dir(upload_id)
    parts = sorted(directory.glob('part-*'))
    if not parts:
        return Response({'error': 'هیچ بخشی از فایل دریافت نشده است.'}, status=400)

    assembled = directory / upload.file_name
    with open(assembled, 'wb') as output:
        for part in parts:
            with open(part, 'rb') as source:
                shutil.copyfileobj(source, output)

    size = assembled.stat().st_size
    if upload.total_size and abs(size - upload.total_size) > 1024:
        return Response(
            {'error': f'فایل ناقص است ({size} از {upload.total_size} بایت).'},
            status=400,
        )

    digest = svc.sha256_file(assembled)
    expected = str(request.data.get('sha256') or '').strip().lower()
    if expected and expected != digest:
        return Response({'error': 'چکسام فایل با مقدار اعلام‌شده مطابقت ندارد.'}, status=400)

    try:
        info = svc.inspect_package(assembled, VERSION)
    except svc.UpdateError as exc:
        return Response({'error': str(exc)}, status=400)

    suffixes = ''.join(Path(upload.file_name).suffixes) or '.pkg'
    archived = svc.archive_dir() / f"{info['version']}-{upload_id[:8]}{suffixes}"
    shutil.move(str(assembled), str(archived))
    shutil.rmtree(directory, ignore_errors=True)

    manifest = dict(info['manifest'])
    manifest['validation_warnings'] = info['warnings']

    release = AppRelease.objects.create(
        version=info['version'],
        build_hash=info['build_hash'],
        channel=info['channel'],
        notes=info['notes'],
        manifest=manifest,
        artifact_path=str(archived),
        file_name=upload.file_name,
        sha256=digest,
        size=size,
        signature_status=info['signature_status'],
        status=AppRelease.Status.VERIFIED,
        uploaded_by=request.user,
    )

    upload.status = UpdateUpload.Status.COMPLETE
    upload.received_bytes = size
    upload.save(update_fields=['status', 'received_bytes', 'updated_at'])

    return Response(
        {'release': _release_payload(release), 'warnings': info['warnings']},
        status=201,
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@_public_schema
def releases_list(request):
    """Uploaded packages, newest first."""
    if not _can_manage(request.user):
        return Response({'error': 'دسترسی غیرمجاز'}, status=403)
    return Response([_release_payload(item) for item in AppRelease.objects.all()[:50]])


@api_view(['GET', 'DELETE'])
@permission_classes([IsAuthenticated])
@_public_schema
def release_detail(request, release_id):
    """Inspect or delete one uploaded package."""
    if not _can_manage(request.user):
        return Response({'error': 'دسترسی غیرمجاز'}, status=403)

    release = get_object_or_404(AppRelease, pk=release_id)
    if request.method == 'GET':
        return Response(_release_payload(release))

    if release.status == AppRelease.Status.APPLIED:
        return Response({'error': 'این بسته نصب شده است و قابل حذف نیست.'}, status=400)

    try:
        Path(release.artifact_path).unlink(missing_ok=True)
    except OSError:
        pass
    release.delete()
    return Response({'deleted': True})



@api_view(['POST'])
@permission_classes([IsAuthenticated])
@_public_schema
def release_apply(request, release_id):
    """
    Queue a release for installation.

    The privileged ``hrms-update.service`` (systemd path unit) picks the request
    up from ``<UPDATE_ROOT>/queue/request.json`` and performs the whole run.
    """
    if not _can_manage(request.user):
        return Response({'error': 'دسترسی غیرمجاز'}, status=403)

    release = get_object_or_404(AppRelease, pk=release_id)
    if not APPLY_ENABLED:
        return Response({
            'error': 'سرویس به‌روزرسان روی سرور نصب نشده است (hrms-update.service).',
            'apply_enabled': False,
        }, status=503)

    if release.status == AppRelease.Status.APPLIED:
        return Response({'error': 'این نسخه قبلاً نصب شده است.'}, status=400)

    artifact = Path(release.artifact_path)
    if not artifact.exists():
        return Response({'error': 'فایل بسته روی سرور پیدا نشد؛ دوباره بارگذاری کنید.'}, status=400)

    active = UpdateRun.objects.filter(status=UpdateRun.Status.RUNNING).first()
    if active:
        return Response(
            {'error': 'یک عملیات به‌روزرسانی دیگر در حال اجراست.', 'run_id': active.id},
            status=409,
        )

    queue_file = svc.update_root() / 'queue' / 'request.json'
    if queue_file.exists():
        return Response({'error': 'درخواست دیگری در صف اجرا است؛ چند لحظه صبر کنید.'}, status=409)

    config = UpdateSettings.load()
    if (release.channel and config.channel and release.channel != config.channel
            and str(request.data.get('force', '')).lower() not in ('1', 'true', 'yes')):
        return Response({
            'error': (
                f'کانال بسته ({release.channel}) با کانال سیستم ({config.channel}) متفاوت است. '
                'کانال را در تنظیمات به‌روزرسانی تغییر دهید یا نصب اجباری را انتخاب کنید.'
            ),
            'channel_mismatch': True,
        }, status=400)

    try:
        run, broadcast = svc.enqueue_apply(release, user=request.user)
    except Exception as exc:  # noqa: BLE001
        return Response({'error': f'ثبت درخواست ناموفق بود: {exc}'}, status=500)

    notify_event(
        'به‌روزرسانی در صف اجرا قرار گرفت',
        f'نسخهٔ {release.version} توسط {request.user.username} برای نصب ثبت شد.',
    )

    return Response({
        'run': _run_payload(run),
        'countdown_seconds': int(config.logout_countdown_seconds or 60),
        'broadcast_id': broadcast.id,
        'message': 'درخواست نصب ثبت شد؛ سرویس به‌روزرسان تا لحظاتی آن را آغاز می‌کند.',
    }, status=202)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@_public_schema
def run_rollback(request, run_id):
    """Ask the privileged updater to restore the code snapshot of a run."""
    if not _can_manage(request.user):
        return Response({'error': 'دسترسی غیرمجاز'}, status=403)

    run = get_object_or_404(UpdateRun, pk=run_id)
    if run.status != UpdateRun.Status.SUCCESS:
        return Response({'error': 'فقط یک اجرای موفق قابل بازگشت است.'}, status=400)
    if UpdateRun.objects.filter(status=UpdateRun.Status.RUNNING).exists():
        return Response({'error': 'یک عملیات دیگر در حال اجراست.'}, status=409)

    queue_file = svc.update_root() / 'queue' / 'request.json'
    if queue_file.exists():
        return Response({'error': 'درخواست دیگری در صف اجرا است.'}, status=409)

    now = timezone.now()
    SystemBroadcast.objects.create(
        title='بازگشت به نسخهٔ قبلی',
        message='سیستم برای بازگردانی نسخهٔ قبلی به‌زودی بسته می‌شود. لطفاً کار خود را ذخیره کنید.',
        level=SystemBroadcast.Level.MAINTENANCE,
        action=SystemBroadcast.Action.LOGOUT,
        starts_at=now + timedelta(seconds=30),
        expires_at=now + timedelta(hours=1),
    )

    svc.enqueue_request({
        'action': 'rollback',
        'run_id': run.id,
        'requested_by': request.user.username,
        'requested_at': now.isoformat(),
        'countdown_seconds': 30,
    })
    notify_event(
        'بازگشت به نسخهٔ قبلی در صف اجرا قرار گرفت',
        f'درخواست بازگشت توسط {request.user.username} ثبت شد.',
    )
    return Response({'queued': True, 'run_id': run.id}, status=202)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@_public_schema
def runs_list(request):
    """Update execution history."""
    if not _can_manage(request.user):
        return Response({'error': 'دسترسی غیرمجاز'}, status=403)
    return Response([_run_payload(item) for item in UpdateRun.objects.all()[:50]])


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@_public_schema
def run_detail(request, run_id):
    """Live progress of one update run (polled by the UI)."""
    if not _can_manage(request.user):
        return Response({'error': 'دسترسی غیرمجاز'}, status=403)
    run = get_object_or_404(UpdateRun, pk=run_id)
    return Response(_run_payload(run))




# --------------------------------------------------------------------------- #
# Settings & scheduling (phase 3)
# --------------------------------------------------------------------------- #
def _settings_payload(config):
    return {
        'channel': config.channel,
        'logout_countdown_seconds': config.logout_countdown_seconds,
        'keep_releases': config.keep_releases,
        'notify_email': config.notify_email,
        'notify_bale': config.notify_bale,
        'notify_emails': config.notify_emails or [],
        'notify_bale_chat_ids': config.notify_bale_chat_ids or [],
        'bale_configured': bool((getattr(settings, 'UPDATE_BALE_TOKEN', '') or '').strip()),
    }


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
@_public_schema
def update_settings_view(request):
    """Read or update the global updater configuration."""
    if not _can_manage(request.user):
        return Response({'error': 'دسترسی غیرمجاز'}, status=403)

    config = UpdateSettings.load()

    if request.method == 'PATCH':
        if 'channel' in request.data:
            channel = str(request.data.get('channel') or '').strip()
            if channel not in ('stable', 'beta'):
                return Response({'error': 'کانال باید stable یا beta باشد.'}, status=400)
            config.channel = channel

        try:
            if 'logout_countdown_seconds' in request.data:
                config.logout_countdown_seconds = max(
                    10, min(int(request.data['logout_countdown_seconds']), 600),
                )
            if 'keep_releases' in request.data:
                config.keep_releases = max(1, min(int(request.data['keep_releases']), 20))
        except (TypeError, ValueError):
            return Response({'error': 'مقدار عددی نامعتبر است.'}, status=400)

        for flag in ('notify_email', 'notify_bale'):
            if flag in request.data:
                setattr(config, flag, bool(request.data[flag]))

        if 'notify_emails' in request.data:
            values = request.data['notify_emails'] or []
            if isinstance(values, str):
                values = [item.strip() for item in values.split(',') if item.strip()]
            config.notify_emails = [str(item).strip() for item in values if str(item).strip()]

        if 'notify_bale_chat_ids' in request.data:
            values = request.data['notify_bale_chat_ids'] or []
            if isinstance(values, str):
                values = [item.strip() for item in values.split(',') if item.strip()]
            config.notify_bale_chat_ids = [str(item).strip() for item in values if str(item).strip()]

        config.save()

    return Response(_settings_payload(config))


def _schedule_payload(schedule):
    return {
        'id': schedule.id,
        'release_id': schedule.release_id,
        'version': schedule.release.version if schedule.release else '',
        'scheduled_for': schedule.scheduled_for,
        'status': schedule.status,
        'status_display': schedule.get_status_display(),
        'note': schedule.note,
        'queued_run': schedule.queued_run_id,
        'created_by': schedule.created_by.username if schedule.created_by else '',
        'created_at': schedule.created_at,
    }


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@_public_schema
def schedules_view(request):
    """List scheduled updates or schedule a release."""
    if not _can_manage(request.user):
        return Response({'error': 'دسترسی غیرمجاز'}, status=403)

    if request.method == 'GET':
        items = UpdateSchedule.objects.select_related('release', 'created_by')[:50]
        return Response([_schedule_payload(item) for item in items])

    release_id = request.data.get('release_id')
    release = get_object_or_404(AppRelease, pk=release_id)

    raw = request.data.get('scheduled_for')
    when = parse_datetime(str(raw)) if raw else None
    if when is None:
        return Response({'error': 'زمان اجرا نامعتبر است (مثال: 2026-10-20T02:00:00).'}, status=400)
    if timezone.is_naive(when):
        when = timezone.make_aware(when)
    if when <= timezone.now():
        return Response({'error': 'زمان اجرا باید در آینده باشد.'}, status=400)

    if UpdateSchedule.objects.filter(status=UpdateSchedule.Status.PENDING).exists():
        return Response({'error': 'یک زمان‌بندی در انتظار اجرا وجود دارد.'}, status=409)

    config = UpdateSettings.load()
    if (release.channel and config.channel and release.channel != config.channel
            and str(request.data.get('force', '')).lower() not in ('1', 'true', 'yes')):
        return Response({
            'error': f'کانال بسته ({release.channel}) با کانال سیستم ({config.channel}) متفاوت است.',
            'channel_mismatch': True,
        }, status=400)

    schedule = UpdateSchedule.objects.create(
        release=release,
        scheduled_for=when,
        created_by=request.user,
        note=str(request.data.get('note') or ''),
    )
    return Response(_schedule_payload(schedule), status=201)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
@_public_schema
def schedule_cancel(request, schedule_id):
    """Cancel a pending schedule."""
    if not _can_manage(request.user):
        return Response({'error': 'دسترسی غیرمجاز'}, status=403)

    schedule = get_object_or_404(UpdateSchedule, pk=schedule_id)
    if schedule.status != UpdateSchedule.Status.PENDING:
        return Response({'error': 'فقط زمان‌بندی در انتظار قابل لغو است.'}, status=400)

    schedule.status = UpdateSchedule.Status.CANCELLED
    schedule.save(update_fields=['status'])
    return Response({'cancelled': True})
