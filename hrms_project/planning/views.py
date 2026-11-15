"""API ماژول برنامه‌ریزی شخصی (یادداشت‌ها و وظایف)."""
from django.db.models import Case, Count, IntegerField, Q, Value, When
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from planning import calendar_range, query, services
from planning.models import (
    Note, PlanningEvent, PlanningGroup, PlanningGroupMember, PlanningShare, Task,
)
from planning.serializers import (
    NoteSerializer, PlanningEventSerializer, PlanningGroupSerializer, PlanningShareSerializer,
    TaskSerializer,
)


def _company(request):
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


class PlanningBaseViewSet(viewsets.ModelViewSet):
    """پایه: مالک را خودکار می‌گذارد و دسترسی را از سرویس می‌گیرد."""

    permission_classes = [IsAuthenticated]
    item_kind = PlanningShare.ItemKind.NOTE

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['item_kind'] = self.item_kind
        return context

    def _with_relations(self, queryset):
        """روابط لازم سریالایزر (مالک/گروه‌های مسئول) بدون N+1."""
        queryset = queryset.select_related('owner')
        if self.item_kind == PlanningShare.ItemKind.TASK:
            queryset = queryset.prefetch_related('assignee_groups')
        return queryset

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
        params = self.request.query_params
        scope = (params.get('scope') or 'mine').lower()
        queryset = services.notes_for_scope(self.request.user, scope)
        filters = query.note_filters(params)
        if filters:
            queryset = queryset.filter(**filters)
        term = query.search_term(params)
        if term:
            queryset = queryset.filter(
                Q(title__icontains=term) | Q(related_label__icontains=term)
                | Q(tags__icontains=term),
            )
        return self._with_relations(queryset).order_by(
            *query.note_ordering(params.get('ordering')),
        )


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
        params = self.request.query_params
        scope = (params.get('scope') or 'mine').lower()
        queryset = services.tasks_for_scope(self.request.user, scope)
        filters = query.task_filters(params, today=timezone.localdate())
        if filters:
            queryset = queryset.filter(**filters)
            if 'assignee_groups__id__in' in filters:
                queryset = queryset.distinct()
        term = query.search_term(params)
        if term:
            queryset = queryset.filter(
                Q(title__icontains=term) | Q(related_label__icontains=term)
                | Q(tags__icontains=term),
            )
        ordering = query.task_ordering(params.get('ordering'))
        if 'priority_rank' in ordering:
            queryset = queryset.annotate(priority_rank=Case(
                When(priority=Task.Priority.URGENT, then=Value(0)),
                When(priority=Task.Priority.HIGH, then=Value(1)),
                When(priority=Task.Priority.NORMAL, then=Value(2)),
                default=Value(3), output_field=IntegerField(),
            ))
        return self._with_relations(queryset).order_by(*ordering)

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
        queryset = PlanningGroup.objects.filter(company=_company(self.request))
        if not getattr(self.request.user, 'is_superuser', False):
            queryset = queryset.filter(created_by=self.request.user)
        return queryset.prefetch_related('member_rows__user')

    def perform_create(self, serializer):
        group = serializer.save(company=_company(self.request), created_by=self.request.user)
        self._sync_members(group)

    def perform_update(self, serializer):
        group = serializer.save()
        self._sync_members(group)

    def perform_destroy(self, instance):
        owner_id = instance.created_by_id
        if owner_id not in (None, getattr(self.request.user, 'pk', None)) and not getattr(
            self.request.user, 'is_superuser', False,
        ):
            raise PermissionDenied('فقط سازندهٔ گروه می‌تواند آن را حذف کند.')
        instance.delete()

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


class PlanningCalendarAPIView(APIView):
    """دادهٔ تقویم شخصی: وظایف دارای سررسید، یادداشت‌های همان روز و رویدادها.

    هر بخش با **یک** کوئری گرفته می‌شود و دامنهٔ دید (فقط من/اشتراکی/همه) روی
    وظایف و یادداشت‌ها اعمال می‌شود؛ رویدادها همیشه شخصی‌اند.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        params = request.query_params
        start_date, end_date = calendar_range.calendar_range(
            params.get('start'), params.get('end'), timezone.localdate(),
        )
        scope = (params.get('scope') or 'mine').lower()

        tasks = services.tasks_for_scope(request.user, scope).filter(
            due_date__range=(start_date, end_date),
        ).order_by('due_date', 'due_time', 'id')
        notes = services.notes_for_scope(request.user, scope).filter(
            created_at__date__range=(start_date, end_date),
        ).order_by('-created_at')
        events = PlanningEvent.objects.filter(
            company=_company(request), owner=request.user,
            date__range=(start_date, end_date),
        ).select_related('task', 'note').order_by('date', 'start_time', 'id')

        term = query.search_term(params)
        if term:
            tasks = tasks.filter(title__icontains=term)
            notes = notes.filter(title__icontains=term)
            events = events.filter(title__icontains=term)

        task_rows = [
            {
                'id': task.pk,
                'title': task.title,
                'status': task.status,
                'priority': task.priority,
                'due_date': task.due_date.isoformat(),
                'due_time': task.due_time.strftime('%H:%M') if task.due_time else '',
            }
            for task in tasks
        ]

        note_rows = [
            {
                'id': note.pk,
                'title': note.title,
                'color': note.color or '',
                'date': timezone.localtime(note.created_at).date().isoformat(),
            }
            for note in notes
        ]

        event_rows = PlanningEventSerializer(
            events, many=True, context={'request': request},
        ).data

        return Response({
            'start': start_date.isoformat(),
            'end': end_date.isoformat(),
            'tasks': task_rows,
            'notes': note_rows,
            'events': event_rows,
            'counts': {
                'tasks': len(task_rows),
                'notes': len(note_rows),
                'events': len(event_rows),
            },
        })


class PlanningEventViewSet(viewsets.ModelViewSet):
    """رویدادهای تقویم شخصی (همیشه خصوصی برای مالک)."""

    serializer_class = PlanningEventSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        params = self.request.query_params
        queryset = PlanningEvent.objects.filter(
            company=_company(self.request), owner=self.request.user,
        ).select_related('task', 'note')
        date_from = calendar_range.parse_iso_date(params.get('date_from'))
        date_to = calendar_range.parse_iso_date(params.get('date_to'))
        if date_from:
            queryset = queryset.filter(date__gte=date_from)
        if date_to:
            queryset = queryset.filter(date__lte=date_to)
        task_id = query.int_list(params.get('task'))
        if task_id:
            queryset = queryset.filter(task_id__in=task_id)
        note_id = query.int_list(params.get('note'))
        if note_id:
            queryset = queryset.filter(note_id__in=note_id)
        term = query.search_term(params)
        if term:
            queryset = queryset.filter(title__icontains=term)
        return queryset.order_by('date', 'start_time', 'id')

    def perform_create(self, serializer):
        serializer.save(company=_company(self.request), owner=self.request.user)


class PlanningSummaryAPIView(APIView):
    """خلاصهٔ برنامه‌ریزی برای نشان سایدبار/داشبورد و نوار شاخص صفحه.

    شمارنده‌ها در چند کوئری تجمیعی گرفته می‌شوند (بدون N+1) و محاسبهٔ نهایی در
    ``planning.query.summary_payload`` انجام می‌شود.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        today = timezone.localdate()
        notes = services.notes_for_scope(user, 'mine')
        note_stats = notes.aggregate(
            total=Count('pk'), pinned=Count('pk', filter=Q(is_pinned=True)),
        )
        tasks = services.tasks_for_scope(user, 'mine')
        status_counts = {
            row['status']: row['total']
            for row in tasks.order_by().values('status').annotate(total=Count('pk'))
        }
        open_tasks = tasks.exclude(status__in=(Task.Status.DONE, Task.Status.CANCELLED))
        payload = query.summary_payload(
            note_total=note_stats['total'] or 0,
            note_pinned=note_stats['pinned'] or 0,
            status_counts=status_counts,
            due_today=open_tasks.filter(due_date=today).count(),
            overdue=open_tasks.filter(due_date__lt=today).count(),
            shared_notes=services.notes_for_scope(user, 'shared').count(),
            shared_tasks=services.tasks_for_scope(user, 'shared').count(),
            today=today,
        )
        return Response(payload)

