"""Views for the Projects module."""
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from projects.models import (
    ProjectType, Project, ProjectPhase, WBSNode, WBSTemplate, CBSNode,
    ResourceCategory, Resource, CostSource, OBSNode,
)
from projects.serializers import (
    ProjectTypeSerializer, ProjectSerializer, ProjectPhaseSerializer,
    WBSNodeSerializer, WBSTemplateSerializer, CBSNodeSerializer,
    ResourceCategorySerializer, ResourceSerializer, CostSourceSerializer,
    OBSNodeSerializer,
)


def _company(request):
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


class BaseProjectViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        qs = super().get_queryset()
        company = _company(self.request)
        if company:
            qs = qs.filter(company=company)
        return qs

    def perform_create(self, serializer):
        company = _company(self.request)
        serializer.save(company=company)


class ProjectTypeViewSet(BaseProjectViewSet):
    serializer_class = ProjectTypeSerializer
    queryset = ProjectType.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'code']
    ordering = ['name']


class ProjectViewSet(BaseProjectViewSet):
    serializer_class = ProjectSerializer
    queryset = Project.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['code', 'name', 'client']
    ordering = ['code']

    def get_queryset(self):
        qs = super().get_queryset().select_related('project_type', 'manager')
        status = self.request.query_params.get('status')
        if status:
            qs = qs.filter(status=status)
        project_type = self.request.query_params.get('project_type')
        if project_type:
            qs = qs.filter(project_type_id=project_type)
        return qs


class ProjectPhaseViewSet(BaseProjectViewSet):
    serializer_class = ProjectPhaseSerializer
    queryset = ProjectPhase.objects.all()

    def get_queryset(self):
        qs = super().get_queryset()
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs


class WBSNodeViewSet(BaseProjectViewSet):
    serializer_class = WBSNodeSerializer
    queryset = WBSNode.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['code', 'name']
    ordering = ['sequence', 'code']

    def get_queryset(self):
        qs = super().get_queryset()
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs

    @action(detail=False, methods=['get'])
    def tree(self, request):
        """Full nested WBS for a project."""
        project_id = request.query_params.get('project')
        if not project_id:
            return Response({'error': 'project پارامتر الزامی است.'}, status=400)
        roots = self.get_queryset().filter(project_id=project_id, parent__isnull=True)
        return Response(WBSNodeSerializer(roots, many=True).data)


class WBSTemplateViewSet(BaseProjectViewSet):
    serializer_class = WBSTemplateSerializer
    queryset = WBSTemplate.objects.all()


class CBSNodeViewSet(BaseProjectViewSet):
    serializer_class = CBSNodeSerializer
    queryset = CBSNode.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['code', 'name']
    ordering = ['sequence', 'code']

    @action(detail=False, methods=['get'])
    def tree(self, request):
        roots = self.get_queryset().filter(parent__isnull=True)
        return Response(CBSNodeSerializer(roots, many=True).data)


class ResourceCategoryViewSet(BaseProjectViewSet):
    serializer_class = ResourceCategorySerializer
    queryset = ResourceCategory.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'code']
    ordering = ['name']


class ResourceViewSet(BaseProjectViewSet):
    serializer_class = ResourceSerializer
    queryset = Resource.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['code', 'name']
    ordering = ['code']

    def get_queryset(self):
        qs = super().get_queryset().select_related('category')
        category_id = self.request.query_params.get('category')
        if category_id:
            qs = qs.filter(category_id=category_id)
        return qs


class CostSourceViewSet(BaseProjectViewSet):
    serializer_class = CostSourceSerializer
    queryset = CostSource.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['code', 'name']
    ordering = ['code']


class OBSNodeViewSet(BaseProjectViewSet):
    serializer_class = OBSNodeSerializer
    queryset = OBSNode.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['code', 'name']
    ordering = ['sequence', 'code']

    def get_queryset(self):
        qs = super().get_queryset()
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs

    @action(detail=False, methods=['get'])
    def tree(self, request):
        project_id = request.query_params.get('project')
        roots = self.get_queryset().filter(parent__isnull=True)
        if project_id:
            roots = roots.filter(project_id=project_id)
        return Response(OBSNodeSerializer(roots, many=True).data)