from django.urls import path, include
from rest_framework.routers import DefaultRouter
from appraisal.views import AppraisalCycleViewSet, AppraisalRecordViewSet

router = DefaultRouter()
router.register(r'appraisal-cycles', AppraisalCycleViewSet, basename='appraisal-cycle')
router.register(r'appraisal-records', AppraisalRecordViewSet, basename='appraisal-record')

urlpatterns = [
    path('', include(router.urls)),
]