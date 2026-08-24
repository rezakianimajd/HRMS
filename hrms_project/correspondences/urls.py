from django.urls import path, include
from rest_framework.routers import DefaultRouter
from correspondences.views import (
    IncomingLetterViewSet, OutgoingLetterViewSet, AnnouncementViewSet, FormViewSet,
    OrganizationViewSet, OrganizationalLetterViewSet,
)

router = DefaultRouter()
router.register(r'incoming-letters', IncomingLetterViewSet, basename='incoming-letter')
router.register(r'outgoing-letters', OutgoingLetterViewSet, basename='outgoing-letter')
router.register(r'announcements', AnnouncementViewSet, basename='announcement')
router.register(r'forms', FormViewSet, basename='form')
router.register(r'organizations', OrganizationViewSet, basename='organization')
router.register(r'organizational-letters', OrganizationalLetterViewSet, basename='organizational-letter')

urlpatterns = [
    path('', include(router.urls)),
]