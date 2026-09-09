from django.urls import path, include
from rest_framework.routers import DefaultRouter
from recruitment.views import JobRequisitionViewSet, CandidateViewSet, InterviewViewSet

router = DefaultRouter()
router.register(r'job-requisitions', JobRequisitionViewSet, basename='job-requisition')
router.register(r'candidates', CandidateViewSet, basename='candidate')
router.register(r'interviews', InterviewViewSet, basename='interview')

urlpatterns = [
    path('', include(router.urls)),
]