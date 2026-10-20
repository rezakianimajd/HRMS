from django.urls import path, include
from rest_framework.routers import DefaultRouter
from documents.views import DocumentViewSet, DocumentTypeViewSet, OrganizationDocumentViewSet
from documents.management_views import (
    DocumentActivityViewSet, DocumentFolderViewSet, DocumentManagementStatsAPIView,
    DocumentManagementSyncAPIView, ManagedDocumentViewSet,
)

router = DefaultRouter()
router.register(r'documents', DocumentViewSet, basename='document')
router.register(r'organization-documents', OrganizationDocumentViewSet, basename='organization-document')

management_router = DefaultRouter()
management_router.register(r'folders', DocumentFolderViewSet, basename='document-folder')
management_router.register(r'documents', ManagedDocumentViewSet, basename='managed-document')
management_router.register(r'activities', DocumentActivityViewSet, basename='document-activity')

urlpatterns = [
    # Document types CRUD (must come before the router to avoid `documents/{pk}` swallowing "types")
    path(
        'documents/types/',
        DocumentTypeViewSet.as_view({'get': 'list', 'post': 'create'}),
        name='document-type-list',
    ),
    path(
        'documents/types/<int:pk>/',
        DocumentTypeViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}),
        name='document-type-detail',
    ),
    path('document-management/stats/', DocumentManagementStatsAPIView.as_view(), name='document-management-stats'),
    path('document-management/sync-storage/', DocumentManagementSyncAPIView.as_view(), name='document-management-sync-storage'),
    path('document-management/', include(management_router.urls)),
    path('', include(router.urls)),
]