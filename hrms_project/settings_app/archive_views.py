"""
Views for the Storage & Archive system — سامانهٔ بایگانی فایل.

خروجی‌ها:
  GET    /settings/storage/overview/                 آمار کل + لیست پروفایل‌ها
  GET    /settings/storage/media-info/                اطلاعات پوشهٔ مدیا و فضای دیسک
  GET    /settings/storage/profiles/                  لیست پروفایل‌ها
  POST   /settings/storage/profiles/                  ایجاد پروفایل
  PATCH  /settings/storage/profiles/<id>/             ویرایش پروفایل
  DELETE /settings/storage/profiles/<id>/             حذف پروفایل
  POST   /settings/storage/profiles/<id>/build/       ساخت ساختار پوشه‌ها روی دیسک
  GET    /settings/storage/profiles/<id>/folders/     لیست پوشه‌های موجودیت‌ها
  POST   /settings/storage/profiles/<id>/folders/     ساخت پوشهٔ یک موجودیت
  DELETE /settings/storage/folders/<folder_id>/       حذف پوشهٔ یک موجودیت
  POST   /settings/storage/ensure/                    اطمینان از وجود پوشهٔ موجودیت (برای سایر ماژول‌ها)
"""
import os
import shutil
from datetime import datetime
from urllib.parse import quote

from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from settings_app.models import StorageProfile, ArchiveFolder, default_storage_profiles
from settings_app.serializers import StorageProfileSerializer, ArchiveFolderSerializer
from core.engines.archive_storage_engine import archive_engine, ArchiveStorageError
from settings_app.views import _get_company, _can_edit_settings


def _ensure_seed(company):
    """اگر شرکت هیچ پروفایلی ندارد، پروفایل‌های پیش‌فرض را می‌سازد."""
    if StorageProfile.objects.filter(company=company).exists():
        return
    for item in default_storage_profiles():
        StorageProfile.objects.get_or_create(
            company=company, module_key=item['module_key'],
            defaults={**item, 'company': company},
        )


def _serialize(profile, request):
    return StorageProfileSerializer(profile, context={'request': request}).data


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def storage_overview(request):
    """آمار کل بایگانی شرکت در همهٔ ماژول‌ها."""
    company = _get_company(request)
    if not company:
        return Response({'error': 'شرکت جاری یافت نشد'}, status=404)

    _ensure_seed(company)
    profiles = list(StorageProfile.objects.filter(company=company))

    include_company = profiles[0].include_company if profiles else True
    overview = archive_engine.overview(company.id, profiles, include_company)
    overview['profiles'] = [_serialize(p, request) for p in profiles]
    overview['media_root'] = archive_engine.media_root
    return Response(overview)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def media_info(request):
    """اطلاعات پوشهٔ مدیا و فضای آزاد دیسک."""
    company = _get_company(request)
    if not company:
        return Response({'error': 'شرکت جاری یافت نشد'}, status=404)

    root = archive_engine.media_root
    try:
        usage = shutil.disk_usage(root if os.path.isdir(root) else os.path.dirname(root))
        disk = {
            'total': usage.total, 'used': usage.used, 'free': usage.free,
            'percent_used': round(usage.used / usage.total * 100, 2) if usage.total else 0,
        }
    except Exception:
        disk = None

    total, files = archive_engine.dir_size(archive_engine.archive_root)
    return Response({
        'media_root': root,
        'archive_root': archive_engine.archive_root,
        'archive_exists': os.path.isdir(archive_engine.archive_root),
        'archive_size': total,
        'archive_files': files,
        'writable': os.access(root, os.W_OK) if os.path.exists(root) else False,
        'disk': disk,
    })


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def storage_profiles(request):
    """لیست (GET) و ایجاد (POST) پروفایل‌های بایگانی."""
    company = _get_company(request)
    if not company:
        return Response({'error': 'شرکت جاری یافت نشد'}, status=404)

    if request.method == 'GET':
        _ensure_seed(company)
        profiles = StorageProfile.objects.filter(company=company)
        return Response([_serialize(p, request) for p in profiles])

    if not _can_edit_settings(request.user):
        return Response({'error': 'دسترسی غیرمجاز'}, status=403)

    serializer = StorageProfileSerializer(data=request.data, context={'request': request})
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    module_key = serializer.validated_data.get('module_key')
    if StorageProfile.objects.filter(company=company, module_key=module_key).exists():
        return Response({'error': f'ماژولی با کلید «{module_key}» از قبل وجود دارد.'}, status=400)

    profile = serializer.save(company=company)

    if profile.is_active:
        try:
            archive_engine.ensure_profile_structure(company.id, profile)
        except ArchiveStorageError as exc:
            return Response(
                {'error': f'پروفایل ثبت شد اما ساخت پوشه ناموفق بود: {exc}'}, status=201
            )

    return Response(_serialize(profile, request), status=201)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def storage_profile_detail(request, profile_id):
    """جزئیات/ویرایش/حذف یک پروفایل بایگانی."""
    company = _get_company(request)
    if not company:
        return Response({'error': 'شرکت جاری یافت نشد'}, status=404)

    profile = StorageProfile.objects.filter(company=company, id=profile_id).first()
    if not profile:
        return Response({'error': 'پروفایل یافت نشد'}, status=404)

    if request.method == 'GET':
        return Response(_serialize(profile, request))

    if not _can_edit_settings(request.user):
        return Response({'error': 'دسترسی غیرمجاز'}, status=403)

    if request.method == 'PATCH':
        serializer = StorageProfileSerializer(
            profile, data=request.data, partial=True, context={'request': request},
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        profile = serializer.save()
        try:
            archive_engine.ensure_profile_structure(company.id, profile)
        except ArchiveStorageError:
            pass
        return Response(_serialize(profile, request))

    # DELETE → فقط اگر پوشه خالی باشد (جلوگیری از حذف دادهٔ واقعی)
    stats = archive_engine.module_stats(company.id, profile)
    if stats['file_count'] > 0:
        return Response(
            {'error': f"این ماژول {stats['file_count']} فایل دارد؛ ابتدا آن‌ها را منتقل کنید."},
            status=400,
        )
    profile.delete()
    return Response({'deleted': True})



@api_view(['POST'])
@permission_classes([IsAuthenticated])
def storage_profile_build(request, profile_id):
    """
    ساخت ساختار پوشه‌های یک ماژول روی دیسک.

    اگر در بدنهٔ درخواست `entities` لیستی از آبجکت‌ها بیاید، برای هر موجودیت
    نیز پوشهٔ اختصاصی ساخته می‌شود. مثال:
        {"entities": [{"type": "employee", "id": 12, "fields": {"code": "1001", "last_name": "احمدی"}}]}
    """
    company = _get_company(request)
    profile = StorageProfile.objects.filter(company=company, id=profile_id).first()
    if not profile:
        return Response({'error': 'پروفایل یافت نشد'}, status=404)

    try:
        result = archive_engine.ensure_profile_structure(company.id, profile)
    except ArchiveStorageError as exc:
        return Response({'error': str(exc)}, status=400)

    created_entities = []
    for ent in (request.data.get('entities') or []):
        fields = ent.get('fields') or {}
        label = archive_engine.render_pattern(
            profile.entity_folder_pattern, fields
        ) or fields.get('name') or str(ent.get('id') or '')
        try:
            info = archive_engine.ensure_entity_folder(
                company.id, profile.root_folder, label,
                subfolders=profile.subfolders,
                include_company=profile.include_company,
            )
        except ArchiveStorageError as exc:
            created_entities.append({'entity_id': ent.get('id'), 'error': str(exc)})
            continue

        ArchiveFolder.objects.update_or_create(
            company=company, profile=profile,
            entity_type=ent.get('type') or 'generic',
            entity_id=str(ent.get('id') or '') or None,
            defaults={'label': info['folder'], 'relative_path': info['relative_path']},
        )
        created_entities.append({
            'entity_id': ent.get('id'), 'folder': info['folder'],
            'relative_path': info['relative_path'], 'created': info['created'],
        })

    result['entities'] = created_entities
    return Response(result)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def storage_profile_folders(request, profile_id):
    """
    GET  → فهرست پوشه‌های موجودیت‌های یک ماژول روی دیسک.
    POST → ساخت پوشهٔ یک موجودیت جدید.
    """
    company = _get_company(request)
    profile = StorageProfile.objects.filter(company=company, id=profile_id).first()
    if not profile:
        return Response({'error': 'پروفایل یافت نشد'}, status=404)

    if request.method == 'GET':
        folders = archive_engine.list_entity_folders(company.id, profile)
        registered = {
            f.relative_path: f
            for f in ArchiveFolder.objects.filter(company=company, profile=profile)
        }
        for row in folders:
            rec = registered.get(row['relative_path'])
            row['record_id'] = rec.id if rec else None
            row['entity_type'] = rec.entity_type if rec else None
            row['entity_id'] = rec.entity_id if rec else None
        return Response({
            'profile_id': profile.id,
            'module_name': profile.module_name,
            'module_path': os.path.join(
                os.path.basename(archive_engine.company_root(company.id, profile.include_company)),
                profile.root_folder,
            ),
            'folders': folders,
            'subfolders': profile.subfolders,
        })

    if not _can_edit_settings(request.user):
        return Response({'error': 'دسترسی غیرمجاز'}, status=403)

    label = (request.data.get('label') or '').strip()
    if not label:
        return Response({'error': 'نام پوشه الزامی است'}, status=400)

    try:
        info = archive_engine.ensure_entity_folder(
            company.id, profile.root_folder, label,
            subfolders=profile.subfolders,
            include_company=profile.include_company,
        )
    except ArchiveStorageError as exc:
        return Response({'error': str(exc)}, status=400)

    ArchiveFolder.objects.update_or_create(
        company=company, profile=profile,
        entity_type=request.data.get('entity_type') or 'generic',
        entity_id=str(request.data.get('entity_id') or '') or None,
        defaults={'label': info['folder'], 'relative_path': info['relative_path']},
    )
    return Response(info, status=201)



@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def storage_folder_delete(request, folder_id):
    """حذف پوشهٔ یک موجودیت (دیسک + رکورد)."""
    company = _get_company(request)
    if not _can_edit_settings(request.user):
        return Response({'error': 'دسترسی غیرمجاز'}, status=403)

    record = ArchiveFolder.objects.filter(company=company, id=folder_id).first()
    if not record:
        return Response({'error': 'پوشه یافت نشد'}, status=404)

    stats = archive_engine.dir_size(archive_engine.resolve(record.relative_path))
    if stats[1] > 0 and request.query_params.get('force') != '1':
        return Response(
            {'error': f'این پوشه {stats[1]} فایل دارد؛ برای حذف اجباری از force=1 استفاده کنید.'},
            status=400,
        )

    try:
        archive_engine.delete_folder(record.relative_path)
    except ArchiveStorageError as exc:
        return Response({'error': str(exc)}, status=400)

    record.delete()
    return Response({'deleted': True})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def storage_ensure_entity(request):
    """
    اطمینان از وجود پوشهٔ یک موجودیت — برای استفادهٔ سایر ماژول‌ها
    (پرسنل، قرارداد، پروژه و ...).

    بدنهٔ درخواست:
        {
          "module_key": "hr.employees",
          "entity_type": "employee",
          "entity_id": 123,
          "label": "1001_احمدی",          # یا fields برای ساخت خودکار
          "fields": {"code": "1001", "last_name": "احمدی"}
        }
    """
    company = _get_company(request)
    if not company:
        return Response({'error': 'شرکت جاری یافت نشد'}, status=404)

    module_key = request.data.get('module_key')
    profile = StorageProfile.objects.filter(company=company, module_key=module_key).first()
    if not profile:
        return Response({'error': f'پروفایل ماژول «{module_key}» یافت نشد'}, status=404)

    fields = request.data.get('fields') or {}
    label = (request.data.get('label') or '').strip()
    if not label:
        label = archive_engine.render_pattern(profile.entity_folder_pattern, fields)

    if not label:
        return Response({'error': 'نام پوشه قابل تعیین نبود؛ label یا fields بفرستید.'}, status=400)

    try:
        info = archive_engine.ensure_entity_folder(
            company.id, profile.root_folder, label,
            subfolders=profile.subfolders,
            include_company=profile.include_company,
        )
    except ArchiveStorageError as exc:
        return Response({'error': str(exc)}, status=400)

    ArchiveFolder.objects.update_or_create(
        company=company, profile=profile,
        entity_type=request.data.get('entity_type') or 'generic',
        entity_id=str(request.data.get('entity_id') or '') or None,
        defaults={'label': info['folder'], 'relative_path': info['relative_path']},
    )
    return Response(info)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def storage_profile_reset(request, profile_id):
    """حذف رکوردهای ثبت‌شدهٔ پوشه‌های یک پروفایل (بدون حذف فایل‌های دیسک)."""
    company = _get_company(request)
    if not _can_edit_settings(request.user):
        return Response({'error': 'دسترسی غیرمجاز'}, status=403)

    profile = StorageProfile.objects.filter(company=company, id=profile_id).first()
    if not profile:
        return Response({'error': 'پروفایل یافت نشد'}, status=404)

    count, _ = ArchiveFolder.objects.filter(company=company, profile=profile).delete()
    return Response({'removed': count})


# --------------------------------------------------------------------------- #
# مرور و مدیریت فایل‌ها (پنل تنظیمات → ذخیره‌سازی و فایل‌ها)
# --------------------------------------------------------------------------- #
def _archive_relative(path):
    """مسیر داده‌شده (نسبت به archive/) را به مسیر نسبی MEDIA_ROOT تبدیل می‌کند."""
    clean = str(path or '').strip().strip('/\\')
    return f'{archive_engine.archive_prefix}/{clean}'.rstrip('/')


def _browse_payload(company, rel):
    """فهرست زیرپوشه‌ها و فایل‌های یک مسیر از بایگانی را برمی‌گرداند."""
    absolute = archive_engine.resolve(_archive_relative(rel))
    if not os.path.isdir(absolute):
        raise ArchiveStorageError('مسیر یافت نشد.')

    dirs, files, total = [], [], 0
    try:
        entries = list(os.scandir(absolute))
    except OSError as exc:
        raise ArchiveStorageError(f'خواندن پوشه ناموفق بود: {exc}') from exc

    media_url = str(settings.MEDIA_URL or '/media/')
    if not media_url.startswith(('http://', 'https://', '/')):
        media_url = f'/{media_url}'

    for entry in entries:
        if entry.name.startswith('.'):
            continue
        child_rel = f'{rel}/{entry.name}'.strip('/')
        try:
            info = entry.stat()
            if entry.is_dir():
                size, count = archive_engine.dir_size(entry.path)
                dirs.append({
                    'name': entry.name,
                    'path': child_rel,
                    'file_count': count,
                    'size': size,
                    'modified': datetime.fromtimestamp(info.st_mtime).isoformat(),
                })
            else:
                total += info.st_size
                files.append({
                    'name': entry.name,
                    'path': child_rel,
                    'size': info.st_size,
                    'modified': datetime.fromtimestamp(info.st_mtime).isoformat(),
                    'url': f"{media_url.rstrip('/')}/{quote(_archive_relative(child_rel))}",
                })
        except OSError:
            continue

    dirs.sort(key=lambda row: row['name'].lower())
    files.sort(key=lambda row: row['name'].lower())

    # شناسهٔ رکورد پوشه‌های ثبت‌شده (برای امکان حذف از پنل)
    registered = {
        str(rec.relative_path).replace('\\', '/'): rec.id
        for rec in ArchiveFolder.objects.filter(company=company)
    }
    for row in dirs:
        row['record_id'] = registered.get(_archive_relative(row['path']))

    return {
        'path': rel,
        'prefix': archive_engine.archive_prefix,
        'parent': '/'.join(rel.split('/')[:-1]) if rel else None,
        'dirs': dirs,
        'files': files,
        'dir_count': len(dirs),
        # مجموع بازگشتی (زیرپوشه‌ها + فایل‌های همین سطح) برای نمایش خلاصه
        'file_count': len(files) + sum(row['file_count'] for row in dirs),
        'total_size': total + sum(row['size'] for row in dirs),
    }


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def storage_browse(request):
    """
    مرور پوشه‌ها و فایل‌های داخل بایگانی.

    پارامتر: ``?path=company_1/employees/1001_احمدی`` (نسبت به پوشهٔ archive)
    خروجی: زیرپوشه‌ها، فایل‌ها (با حجم/تاریخ/لینک دانلود) و مسیر والد.
    """
    company = _get_company(request)
    if not company:
        return Response({'error': 'شرکت جاری یافت نشد'}, status=404)

    rel = str(request.query_params.get('path') or '').strip().strip('/\\')
    try:
        return Response(_browse_payload(company, rel))
    except ArchiveStorageError as exc:
        return Response({'error': str(exc)}, status=400)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def storage_file_delete(request):
    """حذف یک فایل از بایگانی (فقط داخل پوشهٔ archive)."""
    company = _get_company(request)
    if not company:
        return Response({'error': 'شرکت جاری یافت نشد'}, status=404)
    if not _can_edit_settings(request.user):
        return Response({'error': 'دسترسی غیرمجاز'}, status=403)

    rel = request.query_params.get('path') or (request.data or {}).get('path')
    if not rel:
        return Response({'error': 'مسیر فایل الزامی است'}, status=400)

    try:
        absolute = archive_engine.resolve(_archive_relative(rel))
    except ArchiveStorageError as exc:
        return Response({'error': str(exc)}, status=400)

    if not os.path.isfile(absolute):
        return Response({'error': 'فایل یافت نشد.'}, status=404)

    try:
        os.remove(absolute)
    except OSError as exc:
        return Response({'error': f'حذف ناموفق بود: {exc}'}, status=400)

    return Response({'deleted': True, 'path': rel})

