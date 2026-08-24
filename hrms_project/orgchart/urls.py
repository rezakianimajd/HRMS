"""URLs for the Org Chart module."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from orgchart.views import OrgChartViewSet

router = DefaultRouter()
router.register(r'positions', OrgChartViewSet, basename='position')

urlpatterns = [
    path('org-chart/', include(router.urls)),
]