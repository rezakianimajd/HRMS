"""ساخت درخت WBS یک پروژه از «قالب WBS» (Phase 0).

پیش از این، `WBSTemplate` هیچ گره‌ای نداشت و عملاً بی‌اثر بود. اکنون هر قالب
می‌تواند درخت گره‌ها داشته باشد و این سرویس آن را روی یک پروژه پیاده می‌کند.
"""
from django.db import transaction
from django.db.models.deletion import ProtectedError

from projects.models import WBSNode, WBSTemplate, WBSTemplateNode


def _ordered_nodes(template):
    """گره‌ها به ترتیب درختی (والد قبل از فرزند) — مستقل از ترتیب رکوردها."""
    nodes = list(WBSTemplateNode.objects.filter(template=template).order_by('sequence', 'code'))
    by_parent = {}
    for node in nodes:
        by_parent.setdefault(node.parent_id, []).append(node)
    ordered = []

    def walk(parent_id):
        for node in by_parent.get(parent_id, []):
            ordered.append(node)
            walk(node.id)

    walk(None)
    # اگر گره‌های بی‌والد باقی ماندند (دیتای ناسالم)، در انتها اضافه شوند
    seen = {n.id for n in ordered}
    ordered.extend([n for n in nodes if n.id not in seen])
    return ordered


def _clear_existing(project):
    if not WBSNode.objects.filter(project=project).exists():
        return
    try:
        with transaction.atomic():
            WBSNode.objects.filter(project=project).delete()
    except ProtectedError as exc:
        raise ValueError(
            'ساختار فعلی پروژه در بودجه/هزینه/پیشرفت استفاده شده است و قابل حذف نیست؛ '
            'حالت «افزودن به ساختار موجود» را انتخاب کنید.'
        ) from exc


def apply_template(project, template_id, mode='append'):
    """پیاده‌سازی قالب روی پروژه.

    mode = 'replace' → ساختار موجود پاک و از قالب بازسازی می‌شود
    mode = 'append'  → گره‌های جدید اضافه و گره‌های هم‌کد به‌روزرسانی می‌شوند
    """
    template = WBSTemplate.objects.get(pk=template_id)
    ordered = _ordered_nodes(template)
    if not ordered:
        return {'created': 0, 'updated': 0, 'total_nodes': 0, 'mode': mode,
                'template': template.name, 'message': 'این قالب هیچ گره‌ای ندارد.'}

    if mode == 'replace':
        _clear_existing(project)

    created = 0
    updated = 0
    id_map = {}
    with transaction.atomic():
        for node in ordered:
            parent = id_map.get(node.parent_id) if node.parent_id else None
            existing = WBSNode.objects.filter(project=project, code=node.code).first()
            if existing:
                existing.name = node.name
                existing.node_type = node.node_type
                existing.sequence = node.sequence
                if node.description:
                    existing.description = node.description
                if parent is not None:
                    existing.parent = parent
                existing.save(update_fields=['name', 'node_type', 'sequence', 'description', 'parent'])
                id_map[node.id] = existing
                updated += 1
                continue
            wbs = WBSNode.objects.create(
                company=project.company, project=project, code=node.code, name=node.name,
                parent=parent, node_type=node.node_type, sequence=node.sequence,
                description=node.description,
            )
            id_map[node.id] = wbs
            created += 1

    return {
        'created': created,
        'updated': updated,
        'total_nodes': len(ordered),
        'mode': mode,
        'template': template.name,
        'template_id': template.id,
    }
