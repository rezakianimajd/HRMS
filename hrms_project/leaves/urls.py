"""URL configuration for the Leaves module."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from leaves.views import LeaveRequestViewSet

router = DefaultRouter()
router.register(r'leave-requests', LeaveRequestViewSet, basename='leave-request')

urlpatterns = [
    path('', include(router.urls)),
]