"""Backup engine: create/list/restore tenant data backups."""
import json
from datetime import datetime
from pathlib import Path

from django.apps import apps
from django.conf import settings
from django.core.management import call_command
from django.db import models as django_models

from core.management.commands.import_tenant_data import Command as ImportCommand

try:
    from django_tenants.utils import schema_context
except ImportError:  # pragma: no cover - dev fallback
    import contextlib

    @contextlib.contextmanager
    def schema_context(schema):
        yield


MODEL_LABELS = ImportCommand.MODEL_LABELS


class BackupEngine:
    """Creates, lists, and restores per-company JSON backups."""

    @staticmethod
    def _schema_manager(company):
        return schema_context(company.schema_name)

    @staticmethod
    def get_backup_dir(company):
        base = Path(settings.MEDIA_ROOT) / 'backups' / f'company_{company.id}'
        base.mkdir(parents=True, exist_ok=True)
        return base

    @staticmethod
    def _serialize_object(obj):
        """Serialize one model instance, including FK pks and M2M pk lists."""
        fields = {}
        for f in obj._meta.fields:  # concrete fields (excludes M2M)
            if f.name == 'id':
                continue
            val = getattr(obj, f.name)
            if f.is_relation:
                fields[f.name] = val.pk if val is not None else None
            elif isinstance(f, (django_models.DateField, django_models.DateTimeField)):
                fields[f.name] = val.isoformat() if val is not None else None
            else:
                fields[f.name] = val

        for f in obj._meta.many_to_many:
            fields[f.name] = list(getattr(obj, f.name).values_list('pk', flat=True))

        return {'model': obj._meta.label_lower, 'pk': obj.pk, 'fields': fields}

    @staticmethod
    def create_backup(company):
        """Dump all tenant business data for the company into a JSON file."""
        objects = []
        counts = {}

        with BackupEngine._schema_manager(company):
            for label in MODEL_LABELS:
                model = apps.get_model(label)
                qs = list(model.objects.filter(company=company))
                counts[label] = len(qs)
                for obj in qs:
                    objects.append(BackupEngine._serialize_object(obj))

        payload = {
            'company_code': company.code,
            'schema': company.schema_name,
            'created_at': datetime.now().isoformat(),
            'object_count': len(objects),
            'objects': objects,
        }

        filename = f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        path = BackupEngine.get_backup_dir(company) / filename
        path.write_text(json.dumps(payload, ensure_ascii=False), encoding='utf-8')

        return {'filename': path.name, 'path': str(path), 'counts': counts}

    @staticmethod
    def list_backups(company):
        """List backups for a company, newest first."""
        directory = BackupEngine.get_backup_dir(company)
        result = []
        for f in sorted(directory.glob('backup_*.json'), reverse=True):
            stat = f.stat()
            result.append({
                'filename': f.name,
                'size': stat.st_size,
                'created_at': datetime.fromtimestamp(stat.st_mtime).isoformat(),
            })
        return result

    @staticmethod
    def wipe_tenant_data(company):
        """Delete all tenant business data (keeps company & users)."""
        total = 0
        with BackupEngine._schema_manager(company):
            for label in reversed(MODEL_LABELS):
                model = apps.get_model(label)
                qs = model.objects.filter(company=company)
                total += qs.count()
                qs.delete()
        return total

    @staticmethod
    def restore_backup(company, filename):
        """Wipe current tenant data, then restore from a backup file."""
        directory = BackupEngine.get_backup_dir(company)
        path = directory / filename
        if not path.exists():
            raise FileNotFoundError(f'Backup not found: {filename}')

        BackupEngine.wipe_tenant_data(company)

        # Reuse the existing import command (handles FK remapping + M2M).
        call_command(
            'import_tenant_data',
            str(path),
            schema=company.schema_name,
            company_code=company.code,
        )
        return {'message': 'بازیابی بکاپ با موفقیت انجام شد', 'filename': filename}