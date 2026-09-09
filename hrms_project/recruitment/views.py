"""Views for the Recruitment module."""
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response

from employees.models import Employee
from recruitment.models import JobRequisition, Candidate, Interview
from recruitment.serializers import (
    JobRequisitionSerializer, CandidateSerializer, InterviewSerializer,
)


def _company(request):
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


class BaseRecruitmentViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        qs = super().get_queryset()
        company = _company(self.request)
        if company:
            qs = qs.filter(company=company)
        return qs

    def perform_create(self, serializer):
        company = _company(self.request)
        serializer.save(company=company)


class JobRequisitionViewSet(BaseRecruitmentViewSet):
    serializer_class = JobRequisitionSerializer
    queryset = JobRequisition.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'requested_by']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = super().get_queryset().prefetch_related('candidates__interviews')
        return qs


class CandidateViewSet(BaseRecruitmentViewSet):
    serializer_class = CandidateSerializer
    queryset = Candidate.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['first_name', 'last_name', 'mobile', 'email']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = super().get_queryset().prefetch_related('interviews')
        requisition_id = self.request.query_params.get('requisition')
        if requisition_id:
            qs = qs.filter(requisition_id=requisition_id)
        stage = self.request.query_params.get('stage')
        if stage:
            qs = qs.filter(stage=stage)
        return qs

    @action(detail=True, methods=['post'])
    def move_stage(self, request, pk=None):
        """Advance or reject a candidate to a new stage."""
        cand = self.get_object()
        stage = request.data.get('stage')
        if stage and stage in dict(Candidate.Stage.choices):
            cand.stage = stage
            cand.save(update_fields=['stage', 'updated_at'])
            return Response(CandidateSerializer(cand, context={'request': request}).data)
        return Response({'error': 'مرحله نامعتبر است'}, status=400)

    @action(detail=True, methods=['post'])
    def hire(self, request, pk=None):
        """Convert a candidate into an employee (one-click hire)."""
        from employees.serializers import EmployeeCreateSerializer

        cand = self.get_object()
        company = _company(request)

        # Build employee payload from candidate + linked requisition.
        req = cand.requisition
        payload = {
            'first_name': cand.first_name,
            'last_name': cand.last_name,
            'national_id': cand.national_id or '',
            'mobile': cand.mobile or '',
            'email': cand.email or '',
            'employee_id': (request.data.get('employee_id') or '').strip(),
            'hire_date': request.data.get('hire_date'),
            'department': req.department_id if req and req.department_id else None,
            'job_title': req.job_title_id if req and req.job_title_id else None,
            'work_location': req.work_location_id if req and req.work_location_id else None,
            'contract_type': request.data.get('contract_type'),
            'status': request.data.get('status', 'active'),
            'gender': request.data.get('gender', ''),
            'birth_date': request.data.get('birth_date'),
            'marital_status': request.data.get('marital_status', ''),
        }

        serializer = EmployeeCreateSerializer(data=payload)
        serializer.is_valid(raise_exception=True)

        existing = Employee.objects.filter(company=company, national_id=(cand.national_id or '')).first()

        if cand.national_id and existing:
            emp = existing
        else:
            emp = serializer.save(company=company)

        cand.stage = Candidate.Stage.HIRED
        cand.save(update_fields=['stage', 'updated_at'])

        return Response({'employee_id': emp.id, 'full_name': emp.full_name}, status=status.HTTP_201_CREATED)


class InterviewViewSet(BaseRecruitmentViewSet):
    serializer_class = InterviewSerializer
    queryset = Interview.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['interviewer']
    ordering = ['-interview_date']