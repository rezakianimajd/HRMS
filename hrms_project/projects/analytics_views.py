"""Phase 3 — Project Controls / Cost Analytics."""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from django.db.models import Sum

from projects.models import Project, WBSNode, CBSNode
from projects.cost_models import (
    BudgetLine, CommittedCost, CostTransaction, CostTransactionLine,
    ProgressStatement,
)


def _company(request):
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


def _sum(qs, field):
    return float(qs.aggregate(s=Sum(field))['s'] or 0)


def _project_or_400(request):
    project_id = request.query_params.get('project')
    if not project_id:
        return None
    qs = Project.objects.all()
    company = _company(request)
    if company:
        qs = qs.filter(company=company)
    return qs.filter(id=project_id).first()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def cost_summary(request):
    """Budget / Committed / Actual / Accrued / Forecast / Remaining / Variance."""
    project = _project_or_400(request)
    if not project:
        return Response({'error': 'project پارامتر الزامی است.'}, status=400)

    budget = _sum(BudgetLine.objects.filter(project=project), 'amount')
    committed = _sum(CommittedCost.objects.filter(project=project), 'amount')

    txs = CostTransaction.objects.filter(project=project)
    tx_ids = txs.values_list('id', flat=True)
    actual = _sum(
        CostTransactionLine.objects.filter(transaction_id__in=tx_ids),
        'net_amount',
    )
    accrued = _sum(ProgressStatement.objects.filter(project=project), 'net_payable')

    forecast = committed + actual  # simple forecast = committed + actual (future phases refine)
    remaining = max(0, budget - actual)
    variance = budget - actual

    return Response({
        'project_id': project.id,
        'project_code': project.code,
        'project_name': project.name,
        'budget': budget,
        'committed': committed,
        'actual': actual,
        'accrued': accrued,
        'forecast': forecast,
        'remaining': remaining,
        'variance': variance,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def cost_by_wbs(request):
    """Actual cost aggregated by WBS node for a project."""
    project = _project_or_400(request)
    if not project:
        return Response({'error': 'project پارامتر الزامی است.'}, status=400)

    wbs_nodes = WBSNode.objects.filter(project=project)
    result = []
    for w in wbs_nodes:
        actual = _sum(CostTransactionLine.objects.filter(wbs=w), 'net_amount')
        budget = _sum(BudgetLine.objects.filter(project=project, wbs=w), 'amount')
        committed = _sum(CommittedCost.objects.filter(project=project, wbs=w), 'amount')
        result.append({
            'wbs_id': w.id,
            'code': w.code,
            'name': w.name,
            'budget': budget,
            'committed': committed,
            'actual': actual,
            'variance': budget - actual,
        })
    return Response(result)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def cost_by_cbs(request):
    """Actual cost aggregated by CBS node for a project."""
    project = _project_or_400(request)
    if not project:
        return Response({'error': 'project پارامتر الزامی است.'}, status=400)

    # All CBS nodes are company-level; filter via lines belonging to project.
    txs = CostTransaction.objects.filter(project=project)
    tx_ids = txs.values_list('id', flat=True)
    lines = CostTransactionLine.objects.filter(transaction_id__in=tx_ids)

    cbs_nodes = CBSNode.objects.filter(company=_company(request)) if _company(request) else CBSNode.objects.all()
    result = []
    for c in cbs_nodes:
        actual = _sum(lines.filter(cbs=c), 'net_amount')
        result.append({
            'cbs_id': c.id,
            'code': c.code,
            'name': c.name,
            'actual': actual,
        })
    return Response(result)