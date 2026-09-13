from django.urls import path, include
from rest_framework.routers import DefaultRouter
from projects.views import (
    ProjectTypeViewSet, ProjectViewSet, ProjectPhaseViewSet, WBSNodeViewSet,
    WBSTemplateViewSet, CBSNodeViewSet, ResourceCategoryViewSet, ResourceViewSet,
    CostSourceViewSet, OBSNodeViewSet,
)

router = DefaultRouter()
router.register(r'project-types', ProjectTypeViewSet, basename='project-type')
router.register(r'projects', ProjectViewSet, basename='project')
router.register(r'project-phases', ProjectPhaseViewSet, basename='project-phase')
router.register(r'wbs-nodes', WBSNodeViewSet, basename='wbs-node')
router.register(r'wbs-templates', WBSTemplateViewSet, basename='wbs-template')
router.register(r'cbs-nodes', CBSNodeViewSet, basename='cbs-node')
router.register(r'resource-categories', ResourceCategoryViewSet, basename='resource-category')
router.register(r'resources', ResourceViewSet, basename='resource')
router.register(r'cost-sources', CostSourceViewSet, basename='cost-source')
router.register(r'obs-nodes', OBSNodeViewSet, basename='obs-node')

urlpatterns = [
    path('', include(router.urls)),
]