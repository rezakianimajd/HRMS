"""URLs ماژول برنامه‌ریزی شخصی (زیر ``/api/planning/``)."""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from planning.views import (
    NoteViewSet, PlanningGroupViewSet, PlanningSummaryAPIView, TaskViewSet,
)

router = DefaultRouter()
router.register(r'notes', NoteViewSet, basename='planning-note')
router.register(r'tasks', TaskViewSet, basename='planning-task')
router.register(r'groups', PlanningGroupViewSet, basename='planning-group')

urlpatterns = [
    path('summary/', PlanningSummaryAPIView.as_view(), name='planning-summary'),
    path('', include(router.urls)),
]
