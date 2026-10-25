"""رویدادهای تقویمی ماژول پروژه (Phase 0).

همان امکانات و تجربهٔ «تقویم قراردادها»، اما برای پروژه‌ها:
  * شروع/پایان پروژه و شروع/پایان هر فاز
  * تراکنش هزینه، تعهد هزینه، صورت‌وضعیت پروژه
  * رویدادهای قراردادهای مرتبط (امضا، شروع، پایان، فاکتور، صورت‌وضعیت، پرداخت، الحاقیه، تضمین)
  * اسناد حسابداری مرتبط (پرداخت به پیمانکار در دفاتر)

همه در **یک درخواست** و بدون N+1 (`/api/projects/calendar/`) و همراه برچسب شمسی.
"""
from django.db.models import Q, Sum

from accounting.constants import REPORTABLE_DOCUMENT_STATUSES
from accounting.models import AccountingDocumentLine
from contracts.models import Addendum, Contract, Guarantee, Invoice, Payment, Statement
from contracts.numbering import display_statement_title
from projects.cost_models import CommittedCost, CostTransaction, ProgressStatement
from projects.jalali_utils import jalali_period_fields
from projects.models import Project, ProjectPhase

KINDS = [
    'project_start', 'project_end', 'phase_start', 'phase_end',
    'cost', 'commitment', 'revenue', 'ledger',
    'signing', 'start', 'end', 'invoice', 'statement', 'payment',
    'addendum', 'guarantee',
]

MAX_ROWS = 1500


def _company(request):
    return getattr(request, 'tenant', None) or getattr(request, 'company', None)


def _project_ref(project):
    return {
        'id': project.id, 'code': project.code, 'name': project.name,
        'status': project.status, 'status_display': project.get_status_display(),
    }


def _ev(eid, kind, date, title, subtitle, project, amount=None, currency='IRR',
        ref_table='', ref_id=None, contract_id=None, extra=None):
    """ساخت یک رویداد تقویمی (اگر تاریخ نداشته باشد None)."""
    if not date:
        return None
    period = jalali_period_fields(date)
    return {
        'id': eid,
        'kind': kind,
        'date': date.isoformat(),
        'month': period['month'],
        'month_short': period['month_short'],
        'month_label': period['month_label'],
        'jy': period['jy'], 'jm': period['jm'], 'jd': period['jd'],
        'title': title,
        'subtitle': subtitle,
        'amount': None if amount is None else float(amount),
        'currency': currency or 'IRR',
        'project': _project_ref(project),
        'contract_id': contract_id,
        'ref_table': ref_table,
        'ref_id': ref_id,
        'extra': extra or {},
    }


def _linked_project_ids(contract, pmap):
    """پروژه‌های مرتبط با یک قرارداد (پروژهٔ اصلی + تخصیص درصدی)."""
    ids = set()
    if contract.project_id in pmap:
        ids.add(contract.project_id)
    for row in (contract.project_allocations or []):
        try:
            pid = int(row.get('project'))
        except (TypeError, ValueError):
            continue
        if pid in pmap:
            ids.add(pid)
    return ids


def _currency_code(contract):
    return contract.currency.code if contract.currency_id else 'IRR'

def _project_events(projects):
    """شروع/پایان پروژه."""
    events = []
    for p in projects:
        label = f'{p.code} — {p.name}'
        events.append(_ev(
            f'proj-{p.id}-start', 'project_start', p.start_date,
            f'شروع پروژه {p.code}', label, p, ref_table='Project', ref_id=p.id,
        ))
        events.append(_ev(
            f'proj-{p.id}-end', 'project_end', p.end_date,
            f'پایان پروژه {p.code}',
            f'{label} · وضعیت: {p.get_status_display()}',
            p, ref_table='Project', ref_id=p.id,
        ))
    return [e for e in events if e]


def _phase_events(pmap, pids):
    """شروع/پایان فازهای پروژه."""
    events = []
    rows = ProjectPhase.objects.filter(project_id__in=pids).select_related('project').order_by('sequence')
    for ph in rows:
        project = pmap[ph.project_id]
        label = f'{project.code} — {ph.name}'
        events.append(_ev(
            f'phase-{ph.id}-start', 'phase_start', ph.start_date,
            f'شروع فاز {ph.name}', label, project, ref_table='ProjectPhase', ref_id=ph.id,
        ))
        events.append(_ev(
            f'phase-{ph.id}-end', 'phase_end', ph.end_date,
            f'پایان فاز {ph.name}', label, project, ref_table='ProjectPhase', ref_id=ph.id,
        ))
    return [e for e in events if e]


def _cost_events(pmap, pids):
    """تراکنش هزینه، تعهد هزینه و صورت‌وضعیت پروژه."""
    events = []
    txs = (
        CostTransaction.objects.filter(project_id__in=pids, date__isnull=False)
        .select_related('project').annotate(total=Sum('lines__net_amount'))
        .order_by('date')[:MAX_ROWS]
    )
    for t in txs:
        project = pmap[t.project_id]
        events.append(_ev(
            f'cost-{t.id}', 'cost', t.date,
            f'تراکنش هزینه {t.number or t.id}',
            f'{project.code} — {project.name}' + (f' · {t.description[:60]}' if t.description else ''),
            project, amount=t.total or 0,
            currency=(t.currency.code if t.currency_id else (t.currency_code or 'IRR')),
            ref_table='CostTransaction', ref_id=t.id,
        ))

    for c in (
        CommittedCost.objects.filter(project_id__in=pids, date__isnull=False)
        .select_related('project').order_by('date')[:MAX_ROWS]
    ):
        project = pmap[c.project_id]
        events.append(_ev(
            f'commit-{c.id}', 'commitment', c.date,
            f'تعهد هزینه {c.reference or c.id}',
            f'{project.code} — {c.description or project.name}',
            project, amount=c.amount, ref_table='CommittedCost', ref_id=c.id,
        ))

    for s in (
        ProgressStatement.objects.filter(project_id__in=pids, date__isnull=False)
        .select_related('project').order_by('date')[:MAX_ROWS]
    ):
        project = pmap[s.project_id]
        events.append(_ev(
            f'prog-{s.id}', 'revenue', s.date,
            display_statement_title(s),
            f'{project.code} — {project.name} · قابل پرداخت: {float(s.net_payable or 0):,.0f}',
            project, amount=s.net_payable,
            ref_table='ProgressStatement', ref_id=s.id,
            extra={'gross': float(s.gross or 0), 'is_approved': bool(s.is_approved)},
        ))
    return [e for e in events if e]

def _contract_events(contracts, pmap):
    """رویدادهای قراردادهای مرتبط با پروژه‌ها — با ۵ کوئری دسته‌ای (بدون N+1)."""
    contract_ids = [c.id for c in contracts]
    if not contract_ids:
        return []

    def group(model, order_by='date'):
        out = {}
        rows = model.objects.filter(contract_id__in=contract_ids).order_by(order_by)
        for row in rows:
            out.setdefault(row.contract_id, []).append(row)
        return out

    addendums = group(Addendum)
    invoices = group(Invoice)
    statements = group(Statement)
    payments = group(Payment)
    # توجه: مدل Guarantee فیلد `date` ندارد → باید با `issue_date` مرتب شود.
    guarantees = group(Guarantee, order_by='issue_date')

    events = []
    for c in contracts:
        pids = _linked_project_ids(c, pmap)
        if not pids:
            continue
        cur = _currency_code(c)
        party = c.party.name if c.party_id else ''
        base = f'{c.subject} · {party or "—"}'
        c_num = c.number or c.id
        add_rows = addendums.get(c.id, [])
        last_end = max([a.new_end_date for a in add_rows if a.new_end_date], default=None)

        for pid in sorted(pids):
            project = pmap[pid]
            events.append(_ev(
                f'c-{c.id}-sign-{pid}', 'signing', c.signing_date,
                f'امضای قرارداد {c_num}', base, project, amount=c.amount, currency=cur,
                contract_id=c.id, ref_table='Contract', ref_id=c.id,
            ))
            events.append(_ev(
                f'c-{c.id}-start-{pid}', 'start', c.start_date,
                f'شروع قرارداد {c_num}', base, project, amount=c.amount, currency=cur,
                contract_id=c.id, ref_table='Contract', ref_id=c.id,
            ))
            events.append(_ev(
                f'c-{c.id}-end-{pid}', 'end', c.end_date,
                f'پایان قرارداد {c_num}',
                base + (f' · طبق الحاقیه تمدید تا {last_end}' if last_end and last_end != c.end_date else ''),
                project, amount=c.amount, currency=cur,
                contract_id=c.id, ref_table='Contract', ref_id=c.id,
            ))
            if last_end and last_end != c.end_date:
                events.append(_ev(
                    f'c-{c.id}-end-add-{pid}', 'end', last_end,
                    f'پایان تمدیدشده {c_num}', base, project, amount=c.amount, currency=cur,
                    contract_id=c.id, ref_table='Addendum',
                ))
            for x in invoices.get(c.id, []):
                events.append(_ev(
                    f'inv-{x.id}-{pid}', 'invoice', x.date,
                    f'فاکتور {x.number or x.id}', base, project, amount=x.total,
                    contract_id=c.id, ref_table='Invoice', ref_id=x.id,
                ))
            for x in statements.get(c.id, []):
                events.append(_ev(
                    f'stmt-{x.id}-{pid}', 'statement', x.date,
                    display_statement_title(x), base, project, amount=x.net_amount,
                    contract_id=c.id, ref_table='Statement', ref_id=x.id,
                ))
            for x in payments.get(c.id, []):
                events.append(_ev(
                    f'pay-{x.id}-{pid}', 'payment', x.date,
                    'پرداخت به پیمانکار',
                    base + (f' · {x.reference}' if x.reference else ''),
                    project, amount=x.amount,
                    currency=(x.currency.code if x.currency_id else cur),
                    contract_id=c.id, ref_table='Payment', ref_id=x.id,
                ))
            for x in add_rows:
                events.append(_ev(
                    f'add-{x.id}-{pid}', 'addendum', x.date,
                    f'الحاقیه {x.number or x.id}', base, project, amount=x.amount_change,
                    contract_id=c.id, ref_table='Addendum', ref_id=x.id,
                ))
            for g in guarantees.get(c.id, []):
                g_label = g.guarantee_type or ''
                events.append(_ev(
                    f'guar-{g.id}-{pid}', 'guarantee', g.issue_date,
                    f'صدور تضمین {g_label}', base, project, amount=g.amount,
                    contract_id=c.id, ref_table='Guarantee', ref_id=g.id,
                ))
                events.append(_ev(
                    f'guar-exp-{g.id}-{pid}', 'guarantee', g.expiry_date,
                    f'انقضای تضمین {g_label}', base, project, amount=g.amount,
                    contract_id=c.id, ref_table='Guarantee', ref_id=g.id,
                ))
    return [e for e in events if e]

def _ledger_events(pmap, pids, contract_ids):
    """اسناد حسابداری مرتبط (پرداخت/دریافت در دفاتر) — یک رویداد per سند و پروژه."""
    scope = Q(project_id__in=pids)
    scope |= Q(contract_id__in=contract_ids) if contract_ids else Q(pk__in=[])
    lines = (
        AccountingDocumentLine.objects
        .filter(document__status__in=REPORTABLE_DOCUMENT_STATUSES, document__date__isnull=False)
        .filter(scope)
        .select_related('document', 'contract')
        .order_by('document__date')[:MAX_ROWS * 2]
    )
    buckets = {}
    for line in lines:
        project = pmap.get(line.project_id)
        if project is None and line.contract_id:
            ids = _linked_project_ids(line.contract, pmap) if line.contract else set()
            project = pmap.get(sorted(ids)[0]) if ids else None
        if project is None:
            continue
        key = (line.document_id, project.id)
        bucket = buckets.setdefault(key, {
            'document': line.document, 'project': project,
            'debit': 0.0, 'credit': 0.0, 'desc': '',
        })
        bucket['debit'] += float(line.debit or 0)
        bucket['credit'] += float(line.credit or 0)
        if not bucket['desc']:
            bucket['desc'] = (line.description or line.document.description or '')[:70]

    events = []
    for (doc_id, pid), bucket in buckets.items():
        doc = bucket['document']
        events.append(_ev(
            f'ledger-{doc_id}-{pid}', 'ledger', doc.date,
            f'سند حسابداری {doc.number or doc_id}',
            f"{bucket['project'].code} — {bucket['desc'] or 'اسناد مرتبط با پروژه'}",
            bucket['project'], amount=bucket['debit'] - bucket['credit'],
            ref_table='AccountingDocument', ref_id=doc_id,
            extra={'debit': bucket['debit'], 'credit': bucket['credit'], 'status': doc.status},
        ))
    return [e for e in events if e]


def build_calendar_events(request):
    """ساخت پاسخ تقویم پروژه‌ها با فیلترهای اختیاری (project / kinds / date_from / date_to)."""
    company = _company(request)
    qs = Project.objects.all()
    if company:
        qs = qs.filter(company=company)
    project_id = request.query_params.get('project')
    if project_id:
        qs = qs.filter(id=project_id)
    if request.query_params.get('include_programs') not in ('1', 'true', 'True'):
        qs = qs.filter(is_program=False)

    projects = list(qs.order_by('code'))
    if not projects:
        return {'count': 0, 'kinds': KINDS, 'counts': {}, 'events': [], 'projects': []}

    pmap = {p.id: p for p in projects}
    pids = list(pmap)

    cq = Contract.objects.filter(Q(project_id__in=pids) | Q(project_allocations__len__gt=0))
    if company:
        cq = cq.filter(company=company)
    contracts = [c for c in cq.select_related('party', 'currency') if _linked_project_ids(c, pmap)]

    events = []
    events += _project_events(projects)
    events += _phase_events(pmap, pids)
    events += _cost_events(pmap, pids)
    events += _contract_events(contracts, pmap)
    events += _ledger_events(pmap, pids, [c.id for c in contracts])

    kinds_param = request.query_params.get('kinds')
    kinds = {k.strip() for k in kinds_param.split(',') if k.strip()} if kinds_param else None
    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')
    if kinds:
        events = [e for e in events if e['kind'] in kinds]
    if date_from:
        events = [e for e in events if e['date'] >= date_from]
    if date_to:
        events = [e for e in events if e['date'] <= date_to]

    events.sort(key=lambda e: (e['date'], e['kind']))
    limit_param = request.query_params.get('limit')
    if limit_param and str(limit_param).isdigit():
        events = events[:int(limit_param)]

    counts = {}
    for e in events:
        counts[e['kind']] = counts.get(e['kind'], 0) + 1

    return {
        'count': len(events),
        'kinds': KINDS,
        'counts': counts,
        'projects': [{'id': p.id, 'code': p.code, 'name': p.name} for p in projects],
        'events': events,
    }



