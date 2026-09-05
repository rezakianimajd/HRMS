"""URL configuration for the Attendance module."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from attendance.views import AttendanceRecordViewSet

router = DefaultRouter()
router.register(r'attendance-records', AttendanceRecordViewSet, basename='attendance-record')

urlpatterns = [
    path('', include(router.urls)),
]