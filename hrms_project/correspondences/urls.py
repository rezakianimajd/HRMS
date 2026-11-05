from django.urls import path, include
from rest_framework.routers import DefaultRouter
from correspondences.views import (
    IncomingLetterViewSet, OutgoingLetterViewSet, AnnouncementViewSet, FormViewSet,
    OrganizationViewSet, OrganizationalLetterViewSet,
    LetterViewSet, LetterCategoryViewSet, LetterSeriesViewSet, CorrespondentViewSet,
    LetterReferralViewSet, LetterAttachmentViewSet,
    LetterRequestViewSet, LetterRequestTypeViewSet, CorrespondenceNameAliasViewSet,
)

router = DefaultRouter()
router.register(r'incoming-letters', IncomingLetterViewSet, basename='incoming-letter')
router.register(r'outgoing-letters', OutgoingLetterViewSet, basename='outgoing-letter')
router.register(r'announcements', AnnouncementViewSet, basename='announcement')
router.register(r'forms', FormViewSet, basename='form')
router.register(r'organizations', OrganizationViewSet, basename='organization')
router.register(r'organizational-letters', OrganizationalLetterViewSet, basename='organizational-letter')

# مکاتبات اداری حرفه‌ای (دفتر وارده/صادره، ارجاع، پیوست، انواع و شماره‌گذاری)
router.register(r'letters', LetterViewSet, basename='letter')
router.register(r'letter-categories', LetterCategoryViewSet, basename='letter-category')
router.register(r'letter-series', LetterSeriesViewSet, basename='letter-series')
router.register(r'correspondents', CorrespondentViewSet, basename='correspondent')
router.register(r'correspondence-name-aliases', CorrespondenceNameAliasViewSet,
                basename='correspondence-name-alias')
router.register(r'letter-referrals', LetterReferralViewSet, basename='letter-referral')
router.register(r'letter-attachments', LetterAttachmentViewSet, basename='letter-attachment')
router.register(r'letter-request-types', LetterRequestTypeViewSet, basename='letter-request-type')
router.register(r'letter-requests', LetterRequestViewSet, basename='letter-request')

urlpatterns = [
    path('', include(router.urls)),
]
