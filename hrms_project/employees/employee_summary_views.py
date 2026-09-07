"""Employee summary — one aggregated endpoint for the employee profile overview.

Combines the scattered HR facets (assets, loans, checklists, penalties,
supplementary insurance, contract versions) into a single round-trip.
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response


def _company(request):
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def employee_summary(request, employee_id):
    from employees.models import Employee, EmployeePenalty, ContractVersion, SupplementaryInsurance
    from lifecycle.models import Asset, LifecycleChecklist
    from payroll.models import EmployeeLoan

    company = _company(request)
    emp = Employee.objects.filter(id=employee_id).first()
    if not emp:
        return Response({'error': 'کارمند یافت نشد.'}, status=404)

    base_q = {'employee': emp}
    if company:
        base_q['company'] = company

    # Assets
    assets_qs = Asset.objects.filter(is_active=True, **base_q).select_related('employee')
    assets = [{
        'id': a.id,
        'name': a.name,
        'asset_type': a.get_asset_type_display(),
        'serial_number': a.serial_number,
        'status': a.get_status_display(),
        'assigned_date': a.assigned_date.isoformat() if a.assigned_date else None,
        'returned_date': a.returned_date.isoformat() if a.returned_date else None,
    } for a in assets_qs]

    # Loans
    loans_qs = EmployeeLoan.objects.filter(is_active=True, **base_q)
    loans = [{
        'id': l.id,
        'loan_type': l.get_loan_type_display(),
        'amount': float(l.amount or 0),
        'installment_count': l.installment_count,
        'installment_amount': float(l.installment_amount or 0),
        'status': l.get_status_display(),
        'grant_date': l.grant_date.isoformat() if l.grant_date else None,
        'due_date': l.due_date.isoformat() if l.due_date else None,
    } for l in loans_qs]

    # Checklists
    checklists_qs = LifecycleChecklist.objects.filter(is_active=True, **base_q).prefetch_related('items')
    checklists = []
    for c in checklists_qs:
        items = list(c.items.all())
        done = sum(1 for i in items if i.is_completed)
        checklists.append({
            'id': c.id,
            'kind': c.kind,
            'kind_display': c.get_kind_display(),
            'total': len(items),
            'completed': done,
            'progress': round(done / len(items) * 100, 0) if items else 0,
        })

    # Penalties
    penalties_qs = EmployeePenalty.objects.filter(**base_q)
    penalties = [{
        'id': p.id,
        'amount': float(p.amount or 0),
        'reason': p.reason,
        'date': p.date.isoformat() if p.date else None,
    } for p in penalties_qs]

    # Supplementary insurance
    ins_qs = SupplementaryInsurance.objects.filter(**base_q)
    insurance = [{
        'id': i.id,
        'insurance_name': i.insurance_name,
        'plan': i.plan,
        'insurance_type': i.insurance_type,
        'start_date': i.start_date.isoformat() if i.start_date else None,
        'end_date': i.end_date.isoformat() if i.end_date else None,
        'monthly_amount': float(i.monthly_amount or 0),
        'dependents_count': i.dependents.count(),
    } for i in ins_qs]

    # Contract versions
    contracts_qs = ContractVersion.objects.filter(is_active=True, **base_q).select_related('contract_type')
    contracts = [{
        'id': c.id,
        'version': c.version,
        'year': c.year,
        'contract_type': c.contract_type.name if c.contract_type else '',
        'start_date': c.start_date.isoformat() if c.start_date else None,
        'end_date': c.end_date.isoformat() if c.end_date else None,
        'base_salary': float(c.base_salary or 0),
        'signed_by': c.signed_by,
    } for c in contracts_qs]

    return Response({
        'employee_id': emp.id,
        'full_name': emp.full_name,
        'assets': assets,
        'loans': loans,
        'checklists': checklists,
        'penalties': penalties,
        'insurance': insurance,
        'contracts': contracts,
    })