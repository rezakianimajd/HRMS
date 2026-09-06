"""URL configuration for the Employee Lifecycle module."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from lifecycle.views import (
    AssetViewSet, LifecycleChecklistViewSet,
    ChecklistItemViewSet, CalendarEventViewSet, calendar_feed,
)

router = DefaultRouter()
router.register(r'assets', AssetViewSet, basename='asset')
router.register(r'lifecycle-checklists', LifecycleChecklistViewSet, basename='lifecycle-checklist')
router.register(r'checklist-items', ChecklistItemViewSet, basename='checklist-item')
router.register(r'calendar-events', CalendarEventViewSet, basename='calendar-event')

urlpatterns = [
    path('calendar/feed/', calendar_feed, name='api-calendar-feed'),
    path('', include(router.urls)),
]