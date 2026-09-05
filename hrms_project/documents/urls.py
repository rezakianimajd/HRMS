from django.urls import path, include
from rest_framework.routers import DefaultRouter
from documents.views import DocumentViewSet, DocumentTypeViewSet, OrganizationDocumentViewSet

router = DefaultRouter()
router.register(r'documents', DocumentViewSet, basename='document')
router.register(r'organization-documents', OrganizationDocumentViewSet, basename='organization-document')

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
    path('', include(router.urls)),
]