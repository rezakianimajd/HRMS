"""API ماژول برنامه‌ریزی شخصی (یادداشت‌ها و وظایف)."""
from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from planning import services
from planning.models import Note, PlanningGroup, PlanningGroupMember, PlanningShare, Task
from planning.serializers import (
    NoteSerializer, PlanningGroupSerializer, PlanningShareSerializer, TaskSerializer,
)


def _company(request):
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


class PlanningBaseViewSet(viewsets.ModelViewSet):
    """پایه: مالک را خودکار می‌گذارد و دسترسی را از سرویس می‌گیرد."""

    permission_classes = [IsAuthenticated]
    item_kind = PlanningShare.ItemKind.NOTE

    def perform_create(self, serializer):
        serializer.save(company=_company(self.request), owner=self.request.user)

    def _ensure(self, instance, edit=True):
        user = self.request.user
        allowed = (
            services.can_edit(user, self.item_kind, instance.pk) if edit
            else services.can_view(user, self.item_kind, instance.pk)
        )
        if not allowed:
            raise PermissionDenied('دسترسی به این آیتم را ندارید.')

    def perform_update(self, serializer):
        self._ensure(serializer.instance, edit=True)
        serializer.save()

    def perform_destroy(self, instance):
        if instance.owner_id != getattr(self.request.user, 'pk', None) and not getattr(
            self.request.user, 'is_superuser', False,
        ):
            raise PermissionDenied('فقط مالک می‌تواند حذف کند.')
        PlanningShare.objects.filter(
            item_kind=self.item_kind, item_id=instance.pk,
        ).delete()
        instance.delete()

    def _is_owner(self, item):
        return bool(
            item.owner_id == getattr(self.request.user, 'pk', None)
            or getattr(self.request.user, 'is_superuser', False)
        )

    @action(detail=True, methods=['post'], url_path='share')
    def share(self, request, pk=None):
        item = self.get_object()
        if not self._is_owner(item):
            raise PermissionDenied('فقط مالک می‌تواند به اشتراک بگذارد.')
        permission = request.data.get('permission') or PlanningShare.Permission.VIEW
        if permission not in dict(PlanningShare.Permission.choices):
            permission = PlanningShare.Permission.VIEW
        users = request.data.get('users') or request.data.get('user_ids') or []
        if isinstance(users, str):
            users = [part for part in users.split(',') if part.strip()]
        shares = services.share_item(
            _company(request), item, self.item_kind, request.user,
            user_ids=users, permission=permission,
        )
        return Response({
            'shared': PlanningShareSerializer(shares, many=True).data,
            'is_shared': item.is_shared,
        })

    @action(detail=True, methods=['delete'], url_path=r'share/(?P<user_id>[0-9]+)')
    def unshare(self, request, pk=None, user_id=None):
        item = self.get_object()
        if not self._is_owner(item):
            raise PermissionDenied('فقط مالک می‌تواند اشتراک را حذف کند.')
        services.unshare_item(_company(request), item, self.item_kind, user_id)
        return Response(status=status.HTTP_204_NO_CONTENT)


class NoteViewSet(PlanningBaseViewSet):
    serializer_class = NoteSerializer
    item_kind = PlanningShare.ItemKind.NOTE

    def get_queryset(self):
        user = self.request.user
        scope = (self.request.query_params.get('scope') or 'mine').lower()
        qs = services.notes_for_scope(user, scope).select_related('owner').order_by(
            '-is_pinned', '-updated_at',
        )
        params = self.request.query_params
        query = (params.get('q') or params.get('search') or '').strip()
        if query:
            qs = qs.filter(
                Q(title__icontains=query) | Q(related_label__icontains=query)
                | Q(tags__icontains=query),
            )
        return qs


class TaskViewSet(PlanningBaseViewSet):
    serializer_class = TaskSerializer
    item_kind = PlanningShare.ItemKind.TASK

    @staticmethod
    def _id_list(value):
        if value in (None, '', 'null'):
            return []
        if isinstance(value, (list, tuple)):
            return [str(item) for item in value]
        return [part for part in str(value).split(',') if part.strip()]

    def _apply_assignments(self, task):
        """محول‌کردن به افراد/گروه‌ها بعد از ساخت/ویرایش (اختیاری)."""
        data = self.request.data
        if 'assignees' not in data and 'groups' not in data:
            return
        services.assign_task(
            _company(self.request), task, self.request.user,
            user_ids=self._id_list(data.get('assignees')),
            group_ids=self._id_list(data.get('groups')),
        )

    def perform_create(self, serializer):
        serializer.save(company=_company(self.request), owner=self.request.user)
        self._apply_assignments(serializer.instance)

    def perform_update(self, serializer):
        self._ensure(serializer.instance, edit=True)
        serializer.save()
        self._apply_assignments(serializer.instance)

    def get_queryset(self):
        user = self.request.user
        params = self.request.query_params
        scope = (params.get('scope') or 'mine').lower()
        qs = services.tasks_for_scope(user, scope).select_related('owner')
        state = params.get('status')
        if state in ('todo', 'doing', 'done', 'cancelled'):
            qs = qs.filter(status=state)
        elif params.get('open') in ('1', 'true'):
            qs = qs.exclude(status__in=(Task.Status.DONE, Task.Status.CANCELLED))
        if params.get('due') in ('1', 'true'):
            from django.utils import timezone

            qs = qs.filter(due_date__lte=timezone.localdate()).exclude(
                status__in=(Task.Status.DONE, Task.Status.CANCELLED),
            )
        query = (params.get('q') or params.get('search') or '').strip()
        if query:
            qs = qs.filter(Q(title__icontains=query) | Q(related_label__icontains=query))
        return qs.order_by('-is_pinned', 'status', 'due_date', '-created_at')

    @action(detail=True, methods=['post'], url_path='toggle')
    def toggle(self, request, pk=None):
        task = self.get_object()
        self._ensure(task, edit=True)
        if task.status == Task.Status.DONE:
            task.status = Task.Status.TODO
        else:
            task.status = Task.Status.DONE
        task.save(update_fields=['status', 'completed_at', 'updated_at'])
        return Response(self.get_serializer(task).data)


class PlanningGroupViewSet(viewsets.ModelViewSet):
    """گروه‌های برنامه‌ریزی برای محول‌کردن سریع وظیفه به چند نفر."""

    serializer_class = PlanningGroupSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = PlanningGroup.objects.filter(company=_company(self.request))
        if getattr(self.request.user, 'is_superuser', False):
            return qs.prefetch_related('member_rows')
        return qs.filter(created_by=self.request.user).prefetch_related('member_rows')

    def perform_create(self, serializer):
        group = serializer.save(company=_company(self.request), created_by=self.request.user)
        self._sync_members(group)

    def perform_update(self, serializer):
        group = serializer.save()
        self._sync_members(group)

    @staticmethod
    def _id_list(value):
        if value in (None, '', 'null'):
            return []
        if isinstance(value, (list, tuple)):
            return [int(item) for item in value if str(item).strip().isdigit()]
        return [int(part) for part in str(value).split(',') if part.strip().isdigit()]

    def _sync_members(self, group):
        data = self.request.data
        if 'members' not in data:
            return
        from django.contrib.auth import get_user_model

        ids = self._id_list(data.get('members'))
        users = get_user_model().objects.filter(pk__in=ids, is_active=True)
        PlanningGroupMember.objects.filter(group=group).exclude(
            user_id__in=[user.pk for user in users],
        ).delete()
        for user in users:
            PlanningGroupMember.objects.get_or_create(
                company=group.company, group=group, user=user,
            )


class PlanningSummaryAPIView(APIView):
    """خلاصهٔ برنامه‌ریزی برای نشان سایدبار/داشبورد."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.utils import timezone

        user = request.user
        notes = services.notes_for_scope(user, 'mine')
        tasks = services.tasks_for_scope(user, 'mine')
        today = timezone.localdate()
        open_states = (Task.Status.DONE, Task.Status.CANCELLED)
        return Response({
            'notes': notes.count(),
            'shared_notes': services.notes_for_scope(user, 'shared').count(),
            'tasks': tasks.count(),
            'open_tasks': tasks.exclude(status__in=open_states).count(),
            'done_tasks': tasks.filter(status=Task.Status.DONE).count(),
            'due_today': tasks.filter(due_date=today).exclude(status__in=open_states).count(),
            'overdue': tasks.filter(due_date__lt=today).exclude(status__in=open_states).count(),
            'shared_tasks': services.tasks_for_scope(user, 'shared').count(),
        })

