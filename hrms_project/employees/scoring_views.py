"""Employee scoring endpoints."""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from employees.models import Employee
from employees.engines.scoring_engine import ScoringEngine


def _get_company(request):
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def employee_scores(request):
    """Score all active employees (weighted multi-criteria) and return sorted."""
    company = _get_company(request)
    qs = Employee.objects.select_related(
        'department', 'job_title', 'work_location', 'contract_type'
    )
    if company:
        qs = qs.filter(company=company, is_active=True)

    employees = list(qs)
    engine = ScoringEngine()
    scored = engine.score_all(employees, company=company)

    top_n = int(request.query_params.get('top', 0))
    if top_n > 0:
        scored = scored[:top_n]

    return Response({'results': scored, 'count': len(scored)})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def employee_score_detail(request, employee_id):
    """Score a single employee."""
    company = _get_company(request)
    qs = Employee.objects.select_related(
        'department', 'job_title', 'work_location', 'contract_type'
    )
    if company:
        qs = qs.filter(company=company)
    emp = qs.filter(id=employee_id).first()
    if not emp:
        return Response({'error': 'پرسنل یافت نشد'}, status=404)

    engine = ScoringEngine()
    return Response(engine.score_employee(emp, company=company))