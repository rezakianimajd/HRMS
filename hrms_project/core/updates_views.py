"""In-app update endpoints (Kian ERP).

Phase 1 covers: uploading a signed package (chunked, resumable), verifying it
and keeping a history. Applying a package stays disabled (``APPLY_ENABLED``)
until the privileged updater service of phase 2 is installed on the server.
"""
import shutil
import uuid
from pathlib import Path

from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core import updates_service as svc
from core.models import AppRelease, UpdateRun, UpdateSettings, UpdateUpload
from core.version import VERSION
from core.views import _public_schema

# Phase 2 flips this on once the privileged `hrms-update.service` exists.
APPLY_ENABLED = False


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
        'signature_required': bool(svc.configured_public_key()),
        'allow_unsigned': bool(getattr(settings, 'UPDATE_ALLOW_UNSIGNED', True)),
        'max_package_mb': svc.max_package_bytes() // (1024 * 1024),
        'update_root': str(svc.update_root()),
        'disk_free': disk_free,
        'releases': [_release_payload(item) for item in AppRelease.objects.all()[:20]],
        'last_run': _run_payload(last_run) if last_run else None,
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

    Disabled until the privileged updater service (phase 2) is installed; the
    UI hides the button when ``apply_enabled`` is false.
    """
    if not _can_manage(request.user):
        return Response({'error': 'دسترسی غیرمجاز'}, status=403)

    release = get_object_or_404(AppRelease, pk=release_id)
    if not APPLY_ENABLED:
        return Response({
            'error': 'نصب خودکار هنوز فعال نشده است؛ سرویس به‌روزرسان باید روی سرور نصب شود.',
            'apply_enabled': False,
        }, status=503)

    active = UpdateRun.objects.filter(status=UpdateRun.Status.RUNNING).first()
    if active:
        return Response({'error': 'یک عملیات به‌روزرسانی دیگر در حال اجراست.'}, status=409)

    run = UpdateRun.objects.create(
        release=release,
        from_version=VERSION,
        to_version=release.version,
        started_by=request.user,
    )
    return Response({'run': _run_payload(run)}, status=202)


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

