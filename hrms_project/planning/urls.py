"""URLs ماژول برنامه‌ریزی شخصی (زیر ``/api/planning/``)."""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from planning.views import (
    NoteViewSet, PlanningCalendarAPIView, PlanningEventViewSet, PlanningGroupViewSet,
    PlanningSummaryAPIView, TaskViewSet,
)

router = DefaultRouter()
router.register(r'notes', NoteViewSet, basename='planning-note')
router.register(r'tasks', TaskViewSet, basename='planning-task')
router.register(r'groups', PlanningGroupViewSet, basename='planning-group')
router.register(r'events', PlanningEventViewSet, basename='planning-event')

urlpatterns = [
    path('summary/', PlanningSummaryAPIView.as_view(), name='planning-summary'),
    path('calendar/', PlanningCalendarAPIView.as_view(), name='planning-calendar'),
    path('', include(router.urls)),
]
