"""
Views for the OrgChart module.
"""
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count
from orgchart.models import Position
from orgchart.serializers import PositionSerializer
from employees.models import Employee


class OrgChartViewSet(viewsets.ModelViewSet):
    """API for organizational chart management with full CRUD."""
    permission_classes = [IsAuthenticated]
    serializer_class = PositionSerializer

    def get_queryset(self):
        company = getattr(self.request, 'tenant', None) or getattr(self.request, 'company', None)
        qs = Position.objects.filter(is_active=True).select_related('department', 'parent').prefetch_related('occupants')
        if company:
            qs = qs.filter(company=company)
        return qs

    def perform_create(self, serializer):
        company = getattr(self.request, 'tenant', None) or getattr(self.request, 'company', None)
        serializer.save(company=company)

    @action(detail=False, methods=['get'])
    def list_all(self, request):
        """Flat list of all positions (for dropdowns)."""
        qs = self.get_queryset()
        return Response([{
            'id': p.id, 'title': p.title, 'code': p.code, 'level': p.level,
            'parent_id': p.parent_id, 'department_id': p.department_id,
        } for p in qs])

    @action(detail=False, methods=['get'])
    def tree(self, request):
        """Get the full organizational tree."""
        company = getattr(request, 'tenant', None) or getattr(request, 'company', None)
        root_positions = Position.objects.filter(parent__isnull=True, is_active=True)
        if company:
            root_positions = root_positions.filter(company=company)
        data = [self._build_node(p, company) for p in root_positions]
        return Response(data)

    def _build_node(self, position, company):
        employees = position.occupants.filter(is_active=True)
        if company:
            employees = employees.filter(company=company)
        children = Position.objects.filter(parent=position, is_active=True)
        if company:
            children = children.filter(company=company)
        return {
            'id': position.id,
            'title': position.title,
            'code': position.code,
            'level': position.level,
            'parent_id': position.parent_id,
            'department_id': position.department_id,
            'department_name': position.department.name if position.department else '',
            'employees': [{'id': e.id, 'full_name': e.full_name, 'employee_id': e.employee_id} for e in employees[:20]],
            'children': [self._build_node(c, company) for c in children],
        }

    @action(detail=False, methods=['get'], url_path='department/(?P<department_id>[^/.]+)')
    def by_department(self, request, department_id=None):
        company = getattr(request, 'tenant', None) or getattr(request, 'company', None)
        qs = Position.objects.filter(department_id=department_id, is_active=True)
        if company:
            qs = qs.filter(company=company)
        root = qs.filter(parent__isnull=True).first()
        if root:
            return Response(self._build_node(root, company))
        return Response(None)

    @action(detail=True, methods=['put'])
    def move(self, request, pk=None):
        """Move a position under a new parent (admin only)."""
        position = self.get_object()
        new_parent_id = request.data.get('new_parent_id')
        if new_parent_id:
            position.parent_id = new_parent_id
            position.save()
        return Response({'message': 'Position moved successfully.'})

    @action(detail=False, methods=['get'])
    def empty_positions(self, request):
        """Get positions without employees."""
        company = getattr(request, 'tenant', None) or getattr(request, 'company', None)
        qs = Position.objects.filter(is_active=True).annotate(emp_count=Count('occupants'))
        if company:
            qs = qs.filter(company=company)
        empty = qs.filter(emp_count=0)
        return Response([{'id': p.id, 'title': p.title, 'code': p.code, 'department_name': p.department.name if p.department else ''} for p in empty])

    @action(detail=True, methods=['post'])
    def set_occupants(self, request, pk=None):
        """Set the list of employees occupying this position."""
        position = self.get_object()
        occupant_ids = request.data.get('occupant_ids', [])
        position.occupants.set(occupant_ids)
        return Response({'message': 'نفرات جایگاه با موفقیت به‌روزرسانی شدند'})

    @action(detail=True, methods=['get'])
    def occupants(self, request, pk=None):
        """Get occupants of a position."""
        position = self.get_object()
        return Response([{'id': e.id, 'full_name': e.full_name, 'employee_id': e.employee_id}
                         for e in position.occupants.filter(is_active=True)])
