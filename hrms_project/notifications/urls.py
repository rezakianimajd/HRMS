"""URL configuration for the Notification Center module."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from notifications.views import NotificationViewSet, sync_now_view, test_send_view, send_now_view

router = DefaultRouter()
router.register(r'notifications', NotificationViewSet, basename='notification')

urlpatterns = [
    # Must be declared BEFORE the router include so 'sync' is not captured
    # by the detail route 'notifications/<pk>/'.
    path('notifications/sync/', sync_now_view, name='api-notifications-sync'),
    path('notifications/test-send/', test_send_view, name='api-notifications-test-send'),
    path('notifications/send/', send_now_view, name='api-notifications-send'),
    path('', include(router.urls)),
]