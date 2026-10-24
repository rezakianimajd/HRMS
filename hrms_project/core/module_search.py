"""جستجوی ماژول‌محور برای نوار جستجوی کنار سایدبار.

هر provider با تحمل خطا اجرا می‌شود تا نبودِ یک جدول یا فیلد در محیط
استقرار، جستجوی بقیهٔ ماژول‌ها را متوقف نکند.
"""
from dataclasses import dataclass, field
from typing import Any, Callable
from urllib.parse import quote

from django.apps import apps
from django.db.models import Q

try:
    from core.engines.search_engine import SearchEngine
except Exception:  # noqa: BLE001
    SearchEngine = None


MODULE_ALIASES = {
    'hrms': 'hr', 'hr': 'hr', 'human-resources': 'hr',
    'contracts': 'contracts', 'contract': 'contracts',
    'projects': 'projects', 'project': 'projects',
    'accounting': 'accounting', 'payroll': 'payroll',
    'pettycash': 'pettycash', 'petty-cash': 'pettycash',
    'procurement': 'procurement', 'treasury': 'treasury',
    'documents': 'documents', 'document': 'documents',
    'document-management': 'documents',
    'correspondence': 'correspondence', 'correspondences': 'correspondence',
}

MODULE_LABELS = {
    'hr': 'منابع انسانی', 'contracts': 'مدیریت قراردادها', 'projects': 'مدیریت پروژه‌ها',
    'accounting': 'حسابداری', 'payroll': 'حقوق و دستمزد', 'pettycash': 'تنخواه',
    'procurement': 'خرید و تدارکات', 'treasury': 'خزانه‌داری',
    'documents': 'مدیریت اسناد و مدارک', 'correspondence': 'مکاتبات رسمی',
}

MODULE_COLORS = {
    'hr': '#db2777', 'contracts': '#f59e0b', 'projects': '#8b5cf6',
    'accounting': '#3b82f6', 'payroll': '#10b981', 'pettycash': '#f97316',
    'procurement': '#06b6d4', 'treasury': '#0f766e', 'documents': '#0d9488',
    'correspondence': '#0ea5e9',
}

RESULT_LIMIT = 6


def _first(obj: Any, *attrs: str, default: str = '') -> str:
    for attr in attrs:
        try:
            value = getattr(obj, attr, None)
        except Exception:  # noqa: BLE001
            value = None
        if value not in (None, ''):
            return str(value)
    return default


def _display(obj: Any, field_name: str, default: str = '') -> str:
    try:
        getter = getattr(obj, f'get_{field_name}_display', None)
        if callable(getter):
            return str(getter())
    except Exception:  # noqa: BLE001
        pass
    return _first(obj, field_name, default=default)


def _parts(*values: Any) -> str:
    return ' · '.join(str(value) for value in values if value not in (None, ''))


def _q(value: Any) -> str:
    return quote(str(value or ''), safe='')


def _row_value(row: Any, key: str, default: Any = '') -> Any:
    """Read a search result field from either a dict or a model instance."""
    if isinstance(row, dict):
        return row.get(key, default)
    try:
        return getattr(row, key, default)
    except Exception:  # noqa: BLE001
        return default


def _row_pk(row: Any):
    return _row_value(row, 'pk', None) or _row_value(row, 'id', None)


def _related_name(obj: Any, relation: str, *attrs: str) -> str:
    related = _row_value(obj, relation, None)
    return _first(related, *attrs) if related is not None else ''


@dataclass(frozen=True)
class SearchProvider:
    model: str
    fields: tuple
    path: Callable[[Any], str]
    title_fields: tuple = ()
    subtitle_fields: tuple = ()
    subtitle_display: str = ''
    icon: str = 'search'
    color: str = ''
    select_related: tuple = field(default_factory=tuple)


def _provider_title(provider: SearchProvider, obj: Any) -> str:
    if provider.title_fields:
        return _parts(*(_first(obj, name) for name in provider.title_fields))
    return str(obj)


def _provider_subtitle(provider: SearchProvider, obj: Any) -> str:
    values = [_first(obj, name) for name in provider.subtitle_fields]
    if provider.subtitle_display:
        values.append(_display(obj, provider.subtitle_display))
    return _parts(*values)


def _search_provider(provider: SearchProvider, query: str, company) -> list:
    try:
        model = apps.get_model(provider.model)
    except Exception:  # noqa: BLE001
        return []
    try:
        queryset = model.objects.all()
        try:
            model._meta.get_field('company')
            if company is not None:
                queryset = queryset.filter(company=company)
        except Exception:  # noqa: BLE001
            pass
        try:
            model._meta.get_field('is_active')
            queryset = queryset.filter(is_active=True)
        except Exception:  # noqa: BLE001
            pass
        if provider.select_related:
            queryset = queryset.select_related(*provider.select_related)

        condition = Q()
        for field_name in provider.fields:
            try:
                model._meta.get_field(field_name.split('__')[0])
                condition |= Q(**{f'{field_name}__icontains': query})
            except Exception:  # noqa: BLE001
                continue
        if not condition:
            return []
        queryset = queryset.filter(condition)
        try:
            queryset = queryset.order_by('-updated_at', '-created_at')
        except Exception:  # noqa: BLE001
            pass

        results = []
        for obj in queryset[:RESULT_LIMIT]:
            try:
                title = _provider_title(provider, obj)
                path = provider.path(obj)
            except Exception:  # noqa: BLE001
                continue
            if not title:
                continue
            try:
                section = str(model._meta.verbose_name_plural)
            except Exception:  # noqa: BLE001
                section = 'سایر'
            results.append({
                'id': f'{provider.model}-{obj.pk}',
                'type': provider.model.split('.')[-1].lower(),
                'title': str(title),
                'subtitle': _provider_subtitle(provider, obj),
                'path': str(path or '/dashboard'),
                'section': section,
                'icon': provider.icon,
                'color': provider.color,
            })
        return results
    except Exception:  # noqa: BLE001
        return []


PROVIDERS = {
    'contracts': [
        SearchProvider(
            'contracts.Contract',
            ('number', 'subject', 'party__name', 'project_name', 'tender_number'),
            path=lambda obj: f'/external-contracts/{obj.pk}',
            title_fields=('number', 'subject'), subtitle_fields=('party.name', 'project_name'),
            subtitle_display='status', icon='contract', color='#f59e0b',
            select_related=('party',),
        ),
        SearchProvider(
            'contracts.ContractParty',
            ('name', 'national_id', 'economic_code', 'registration_number', 'mobile', 'phone'),
            path=lambda obj: f'/contract-parties?q={_q(obj.name)}',
            title_fields=('name',), subtitle_fields=('national_id', 'mobile'),
            subtitle_display='party_type', icon='building', color='#0ea5e9',
        ),
        SearchProvider(
            'contracts.Invoice',
            ('number', 'subject', 'description', 'contract__subject', 'contract__number'),
            path=lambda obj: f'/contracts-invoices?contract={obj.contract_id}',
            title_fields=('number', 'subject'), subtitle_fields=('contract.subject',),
            subtitle_display='status', icon='invoice', color='#10b981',
            select_related=('contract',),
        ),
        SearchProvider(
            'contracts.Statement',
            ('number', 'description', 'contract__subject', 'contract__number'),
            path=lambda obj: f'/contracts-statements?contract={obj.contract_id}',
            title_fields=('number', 'contract.subject'), subtitle_fields=('contract.subject', 'contract.number'),
            icon='statement', color='#6366f1', select_related=('contract',),
        ),
        SearchProvider(
            'contracts.Payment',
            ('reference', 'note', 'contract__subject', 'contract__number'),
            path=lambda obj: f'/contracts-payments?contract={obj.contract_id}',
            title_fields=('reference', 'note'), subtitle_fields=('contract.subject',),
            subtitle_display='method', icon='payment', color='#8b5cf6',
            select_related=('contract',),
        ),
        SearchProvider(
            'contracts.Guarantee',
            ('number', 'bank', 'contract__subject', 'contract__number'),
            path=lambda obj: f'/contracts-guarantees?contract={obj.contract_id}',
            title_fields=('number',), subtitle_fields=('contract.subject', 'bank'),
            subtitle_display='guarantee_type', icon='guarantee', color='#ef4444',
            select_related=('contract',),
        ),
        SearchProvider(
            'contracts.Addendum',
            ('number', 'subject', 'contract__subject', 'contract__number'),
            path=lambda obj: f'/contracts-addendums?contract={obj.contract_id}',
            title_fields=('number', 'subject'), subtitle_fields=('contract.subject',),
            icon='document', color='#ec4899', select_related=('contract',),
        ),
        SearchProvider(
            'contracts.ContractDispute',
            ('title', 'description', 'contract__subject'),
            path=lambda obj: f'/contracts-disputes?contract={obj.contract_id}',
            title_fields=('title',), subtitle_fields=('contract.subject',),
            subtitle_display='status', icon='dispute', color='#7c3aed',
            select_related=('contract',),
        ),
        SearchProvider(
            'contracts.ContractDocument',
            ('title', 'contract__subject', 'contract__number'),
            path=lambda obj: f'/contracts-documents?contract={obj.contract_id}',
            title_fields=('title',), subtitle_fields=('contract.subject',),
            icon='document', color='#d97706', select_related=('contract',),
        ),
    ],
}

PROVIDERS['projects'] = [
    SearchProvider(
        'projects.Project',
        ('code', 'name', 'client', 'location', 'description'),
        path=lambda obj: f'/projects/{obj.pk}',
        title_fields=('code', 'name'), subtitle_fields=('client', 'location'),
        subtitle_display='status', icon='project', color='#8b5cf6',
        select_related=('project_type', 'manager'),
    ),
    SearchProvider(
        'projects.ProjectPhase',
        ('name', 'project__name', 'project__code'),
        path=lambda obj: f'/projects/{obj.project_id}',
        title_fields=('name',), subtitle_fields=('project.name',),
        icon='project', color='#a855f7', select_related=('project',),
    ),
    SearchProvider(
        'projects.WBSNode',
        ('code', 'name', 'project__name', 'project__code'),
        path=lambda obj: f'/projects/structure?project={obj.project_id}',
        title_fields=('code', 'name'), subtitle_fields=('project.name',),
        icon='structure', color='#0ea5e9', select_related=('project',),
    ),
    SearchProvider(
        'projects.Activity',
        ('code', 'name', 'project__name', 'project__code'),
        path=lambda obj: f'/projects/schedule?project={obj.project_id}',
        title_fields=('code', 'name'), subtitle_fields=('project.name',),
        icon='activity', color='#14b8a6', select_related=('project',),
    ),
    SearchProvider(
        'projects.Risk',
        ('number', 'title', 'description', 'project__name', 'project__code'),
        path=lambda obj: f'/projects/risks?project={obj.project_id}',
        title_fields=('number', 'title'), subtitle_fields=('project.name',),
        subtitle_display='severity', icon='risk', color='#ef4444',
        select_related=('project',),
    ),
    SearchProvider(
        'projects.Inspection',
        ('number', 'title', 'inspector_name', 'project__name'),
        path=lambda obj: f'/projects/quality?project={obj.project_id}',
        title_fields=('number', 'title'), subtitle_fields=('project.name', 'inspector_name'),
        subtitle_display='status', icon='quality', color='#0ea5e9',
        select_related=('project',),
    ),
    SearchProvider(
        'projects.ChangeOrder',
        ('number', 'title', 'description', 'project__name'),
        path=lambda obj: f'/projects/change-orders?project={obj.project_id}',
        title_fields=('number', 'title'), subtitle_fields=('project.name',),
        subtitle_display='status', icon='change', color='#ec4899',
        select_related=('project',),
    ),
    SearchProvider(
        'projects.PaymentCertificate',
        ('number', 'project__name', 'note'),
        path=lambda obj: f'/projects/certification?project={obj.project_id}',
        title_fields=('number',), subtitle_fields=('project.name',),
        subtitle_display='status', icon='certificate', color='#10b981',
        select_related=('project',),
    ),
]

PROVIDERS['accounting'] = [
    SearchProvider(
        'accounting.Account',
        ('code', 'name'),
        path=lambda obj: f'/accounting/accounts-tree?q={_q(obj.code or obj.name)}',
        title_fields=('code', 'name'), subtitle_fields=('group.name',),
        icon='account', color='#3b82f6', select_related=('group',),
    ),
    SearchProvider(
        'accounting.AuxiliaryAccount',
        ('code', 'name'),
        path=lambda obj: f'/accounting/auxiliary?q={_q(obj.code or obj.name)}',
        title_fields=('code', 'name'), subtitle_fields=('category.name',),
        icon='tags', color='#f59e0b', select_related=('category',),
    ),
    SearchProvider(
        'accounting.AccountingDocument',
        ('number', 'description', 'reference', 'journal__name'),
        path=lambda obj: f'/accounting/documents/search?q={_q(obj.number)}',
        title_fields=('number',), subtitle_fields=('description', 'journal.name'),
        subtitle_display='status', icon='accounting', color='#10b981',
        select_related=('journal',),
    ),
    SearchProvider(
        'accounting.Journal',
        ('code', 'name'),
        path=lambda obj: f'/settings?tab=accounting&q={_q(obj.name)}',
        title_fields=('code', 'name'), subtitle_fields=('description',),
        icon='book', color='#6366f1',
    ),
    SearchProvider(
        'accounting.CostCenter',
        ('code', 'name'),
        path=lambda obj: f'/accounting/codings/costcenters?q={_q(obj.code or obj.name)}',
        title_fields=('code', 'name'), subtitle_fields=('description',),
        icon='cost', color='#8b5cf6',
    ),
]

PROVIDERS['payroll'] = [
    SearchProvider(
        'payroll.SalaryRecord',
        ('employee__first_name', 'employee__last_name', 'employee__employee_id'),
        path=lambda obj: f'/payslips?q={_q(_first(obj, "employee.employee_id"))}',
        title_fields=('employee.full_name',), subtitle_fields=('year', 'month'),
        icon='payroll', color='#10b981', select_related=('employee',),
    ),
    SearchProvider(
        'payroll.BenefitRecord',
        ('employee__first_name', 'employee__last_name', 'employee__employee_id', 'benefit_type'),
        path=lambda obj: f'/benefits?q={_q(_first(obj, "employee.employee_id"))}',
        title_fields=('employee.full_name',), subtitle_fields=('year', 'month'),
        subtitle_display='benefit_type', icon='payroll', color='#0ea5e9',
        select_related=('employee',),
    ),
    SearchProvider(
        'payroll.EmployeeLoan',
        ('employee__first_name', 'employee__last_name', 'employee__employee_id'),
        path=lambda obj: f'/loans?q={_q(_first(obj, "employee.employee_id"))}',
        title_fields=('employee.full_name',), subtitle_fields=('amount',),
        subtitle_display='loan_type', icon='loan', color='#f59e0b',
        select_related=('employee',),
    ),
    SearchProvider(
        'payroll.EmployeeTransaction',
        ('employee__first_name', 'employee__last_name', 'employee__employee_id', 'title', 'description', 'reference_number'),
        path=lambda obj: f'/payslips?q={_q(_first(obj, "employee.employee_id"))}',
        title_fields=('title', 'employee.full_name'), subtitle_fields=('period', 'description'),
        subtitle_display='transaction_type', icon='payroll', color='#8b5cf6',
        select_related=('employee',),
    ),
]

PROVIDERS['pettycash'] = [
    SearchProvider(
        'pettycash.PettyCashFund',
        ('code', 'title', 'description', 'custodian__first_name', 'custodian__last_name'),
        path=lambda obj: f'/petty-cash/custodians?q={_q(obj.code or obj.title)}',
        title_fields=('code', 'title'), subtitle_fields=('custodian.full_name',),
        subtitle_display='status', icon='cash', color='#f97316',
        select_related=('custodian',),
    ),
    SearchProvider(
        'pettycash.PettyCashTransaction',
        ('title', 'description', 'fund__title', 'fund__code'),
        path=lambda obj: f'/petty-cash/ledger?q={_q(obj.title)}',
        title_fields=('title',), subtitle_fields=('fund.title', 'amount'),
        subtitle_display='entry_type', icon='cash', color='#0ea5e9',
        select_related=('fund',),
    ),
    SearchProvider(
        'pettycash.PettyCashExpenseStatement',
        ('number', 'description', 'fund__title', 'custodian__first_name', 'custodian__last_name'),
        path=lambda obj: f'/petty-cash/expenses?q={_q(obj.number)}',
        title_fields=('number',), subtitle_fields=('fund.title', 'custodian.full_name'),
        subtitle_display='status', icon='statement', color='#8b5cf6',
        select_related=('fund', 'custodian'),
    ),
]

PROVIDERS['procurement'] = [
    SearchProvider(
        'procurement.Supplier',
        ('code', 'name', 'national_id', 'mobile', 'phone', 'email'),
        path=lambda obj: f'/procurement/suppliers?q={_q(obj.name)}',
        title_fields=('code', 'name'), subtitle_fields=('national_id', 'mobile'),
        subtitle_display='status', icon='supplier', color='#06b6d4',
    ),
    SearchProvider(
        'procurement.Item',
        ('code', 'name', 'description'),
        path=lambda obj: f'/procurement/items?q={_q(obj.name)}',
        title_fields=('code', 'name'), subtitle_fields=('description',),
        subtitle_display='status', icon='item', color='#10b981',
    ),
    SearchProvider(
        'procurement.PurchaseRequest',
        ('number', 'description'),
        path=lambda obj: f'/procurement/requests?q={_q(obj.number)}',
        title_fields=('number',), subtitle_fields=('description',),
        subtitle_display='status', icon='request', color='#3b82f6',
    ),
    SearchProvider(
        'procurement.PurchaseOrder',
        ('number', 'supplier__name'),
        path=lambda obj: f'/procurement/orders?q={_q(obj.number)}',
        title_fields=('number', 'supplier.name'), subtitle_fields=('supplier.name',),
        subtitle_display='status', icon='order', color='#8b5cf6',
        select_related=('supplier',),
    ),
    SearchProvider(
        'procurement.PurchaseInvoice',
        ('number', 'supplier__name', 'description'),
        path=lambda obj: f'/procurement/invoices?q={_q(obj.number)}',
        title_fields=('number',), subtitle_fields=('supplier.name',),
        subtitle_display='status', icon='invoice', color='#ef4444',
        select_related=('supplier',),
    ),
]

PROVIDERS['treasury'] = [
    SearchProvider(
        'treasury.TreasuryEntity',
        ('code', 'name', 'account_number', 'sheba_number'),
        path=lambda obj: f'/treasury/entities?q={_q(obj.code or obj.name)}',
        title_fields=('code', 'name'), subtitle_fields=('account_number',),
        subtitle_display='entity_type', icon='bank', color='#0f766e',
    ),
    SearchProvider(
        'treasury.TreasuryTransaction',
        ('number', 'party', 'description', 'entity__name'),
        path=lambda obj: f'/treasury/transactions?q={_q(obj.number or obj.party)}',
        title_fields=('number', 'party'), subtitle_fields=('party', 'entity.name'),
        subtitle_display='direction', icon='treasury', color='#3b82f6',
        select_related=('entity',),
    ),
    SearchProvider(
        'treasury.ReceivedCheck',
        ('number', 'bank_name', 'party', 'description'),
        path=lambda obj: f'/treasury/received-checks?q={_q(obj.number)}',
        title_fields=('number',), subtitle_fields=('party', 'bank_name'),
        subtitle_display='status', icon='check', color='#10b981',
    ),
    SearchProvider(
        'treasury.IssuedCheck',
        ('number', 'party', 'description'),
        path=lambda obj: f'/treasury/issued-checks?q={_q(obj.number)}',
        title_fields=('number',), subtitle_fields=('party',),
        subtitle_display='status', icon='check', color='#ef4444',
    ),
    SearchProvider(
        'treasury.PaymentRequest',
        ('number', 'title', 'description'),
        path=lambda obj: f'/treasury/payment-requests?q={_q(obj.number or obj.title)}',
        title_fields=('number', 'title'), subtitle_fields=('description',),
        subtitle_display='status', icon='request', color='#8b5cf6',
    ),
    SearchProvider(
        'treasury.Receipt',
        ('number', 'description', 'party__name'),
        path=lambda obj: f'/treasury/receipts?q={_q(obj.number)}',
        title_fields=('number', 'description'), subtitle_fields=('party.name',),
        subtitle_display='status', icon='receipt', color='#0ea5e9',
        select_related=('party',),
    ),
]

PROVIDERS['documents'] = [
    SearchProvider(
        'documents.ManagedDocument',
        ('title', 'description', 'tags', 'reference_number', 'owner_department', 'issuing_authority', 'folder__name'),
        path=lambda obj: f'/document-management/library?q={_q(obj.title)}',
        title_fields=('title',), subtitle_fields=('folder.name', 'owner_department'),
        subtitle_display='document_type', icon='document', color='#0d9488',
        select_related=('folder',),
    ),
    SearchProvider(
        'documents.DocumentFolder',
        ('name', 'code', 'description'),
        path=lambda obj: f'/document-management/library?folder={obj.pk}',
        title_fields=('name', 'code'), subtitle_fields=('parent.name',),
        icon='folder', color='#0f766e', select_related=('parent',),
    ),
]

PROVIDERS['correspondence'] = [
    SearchProvider(
        'correspondences.IncomingLetter',
        ('number', 'subject', 'sender', 'description'),
        path=lambda obj: f'/correspondences?q={_q(obj.subject)}',
        title_fields=('number', 'subject'), subtitle_fields=('sender',),
        subtitle_display='status', icon='mail', color='#0ea5e9',
    ),
    SearchProvider(
        'correspondences.OutgoingLetter',
        ('number', 'subject', 'receiver', 'description'),
        path=lambda obj: f'/correspondences?q={_q(obj.subject)}',
        title_fields=('number', 'subject'), subtitle_fields=('receiver',),
        subtitle_display='status', icon='mail', color='#06b6d4',
    ),
    SearchProvider(
        'correspondences.Announcement',
        ('title',),
        path=lambda obj: f'/correspondences?q={_q(obj.title)}',
        title_fields=('title',), icon='announcement', color='#f59e0b',
    ),
    SearchProvider(
        'correspondences.Organization',
        ('name', 'code', 'phone', 'address'),
        path=lambda obj: f'/correspondences?q={_q(obj.name)}',
        title_fields=('name', 'code'), subtitle_fields=('phone',),
        icon='building', color='#8b5cf6',
    ),
]

def _hr_results(query: str, company) -> list:
    if SearchEngine is None:
        return []
    try:
        data = SearchEngine.global_search(query, company)
    except Exception:  # noqa: BLE001
        return []
    if not isinstance(data, dict):
        return []

    color = MODULE_COLORS['hr']
    results = []
    for row in data.get('employees', [])[:RESULT_LIMIT]:
        employee_pk = _row_pk(row)
        employee_name = _row_value(row, 'full_name') or _first(row, 'first_name', 'last_name') or 'پرسنل'
        results.append({
            'id': f"employee-{employee_pk}", 'type': 'employee',
            'title': employee_name,
            'subtitle': _parts(
                _row_value(row, 'department_name') or _related_name(row, 'department', 'name'),
                _row_value(row, 'job_title_name') or _related_name(row, 'job_title', 'name'),
            ),
            'path': f"/employees/{employee_pk}", 'section': 'پرسنل',
            'icon': 'person', 'color': color,
        })
    for row in data.get('documents', [])[:RESULT_LIMIT]:
        document_pk = _row_pk(row)
        document_employee = _row_value(row, 'employee', None)
        employee_pk = _row_pk(document_employee) if not isinstance(document_employee, (int, str)) else document_employee
        title = _row_value(row, 'title') or _first(row, 'name', 'subject') or 'مدرک'
        results.append({
            'id': f"document-{document_pk}", 'type': 'document', 'title': title,
            'subtitle': _parts(
                _row_value(row, 'document_type_name') or _related_name(row, 'document_type', 'name'),
                _row_value(row, 'employee_name') or _row_value(document_employee, 'full_name'),
            ),
            'path': f'/employees/{employee_pk}' if employee_pk else f'/document-management/library?q={_q(title)}',
            'section': 'مدارک', 'icon': 'document', 'color': '#14b8a6',
        })
    for row in data.get('letters', [])[:RESULT_LIMIT]:
        subject = _row_value(row, 'subject') or _row_value(row, 'number') or 'نامه'
        results.append({
            'id': f"letter-{_row_value(row, 'kind')}-{_row_pk(row)}", 'type': 'letter',
            'title': subject, 'subtitle': _parts(_row_value(row, 'number'), _row_value(row, 'counterparty')),
            'path': f'/correspondences?q={_q(subject)}', 'section': 'نامه‌ها',
            'icon': 'mail', 'color': '#06b6d4',
        })
    for row in data.get('hr_requests', [])[:RESULT_LIMIT]:
        results.append({
            'id': f"hr-request-{_row_pk(row)}", 'type': 'hr-request',
            'title': _row_value(row, 'employee_name') or 'درخواست اداری',
            'subtitle': _parts(_row_value(row, 'request_type'), _row_value(row, 'status')),
            'path': f'/requests?q={_q(_row_value(row, "request_type") or _row_value(row, "employee_name"))}',
            'section': 'درخواست‌های اداری', 'icon': 'request', 'color': '#8b5cf6',
        })
    for row in data.get('leave_requests', [])[:RESULT_LIMIT]:
        results.append({
            'id': f"leave-{_row_pk(row)}", 'type': 'leave-request',
            'title': _row_value(row, 'employee_name') or 'مرخصی',
            'subtitle': _parts(_row_value(row, 'leave_type'), _row_value(row, 'status')),
            'path': f'/leaves?q={_q(_row_value(row, "leave_type") or _row_value(row, "employee_name"))}',
            'section': 'مرخصی‌ها', 'icon': 'leave', 'color': '#f59e0b',
        })
    for row in data.get('salary_records', [])[:RESULT_LIMIT]:
        results.append({
            'id': f"salary-{_row_pk(row)}", 'type': 'salary-record',
            'title': _row_value(row, 'employee_name') or 'فیش حقوق',
            'subtitle': _parts(_row_value(row, 'period'), 'فیش حقوق'),
            'path': f'/payslips?q={_q(_row_value(row, "employee_name"))}', 'section': 'فیش‌های حقوق',
            'icon': 'payroll', 'color': '#10b981',
        })
    return results

def module_search(query: str, module: str, company=None) -> dict:
    """جستجوی یکپارچهٔ رکوردهای اصلی یک ماژول."""
    query = str(query or '').strip()
    raw_module = str(module or '').strip().lower()
    module_key = MODULE_ALIASES.get(raw_module, raw_module)
    if module_key not in MODULE_LABELS:
        module_key = ''
    if len(query) < 2:
        return {
            'module': module_key,
            'module_label': MODULE_LABELS.get(module_key, module_key),
            'query': query,
            'results': [],
            'sections': [],
        }

    results = _hr_results(query, company) if module_key == 'hr' else []
    for provider in PROVIDERS.get(module_key, []):
        results.extend(_search_provider(provider, query, company))

    seen = set()
    unique_results = []
    for row in results:
        key = (row.get('type'), row.get('id'), row.get('path'))
        if key in seen:
            continue
        seen.add(key)
        unique_results.append(row)

    sections = []
    for row in unique_results:
        section = row.get('section') or 'سایر'
        existing = next((item for item in sections if item['label'] == section), None)
        if existing:
            existing['count'] += 1
        else:
            sections.append({
                'label': section, 'count': 1,
                'icon': row.get('icon'), 'color': row.get('color'),
            })

    return {
        'module': module_key,
        'module_label': MODULE_LABELS.get(module_key, module_key),
        'query': query,
        'results': unique_results,
        'sections': sections,
    }
