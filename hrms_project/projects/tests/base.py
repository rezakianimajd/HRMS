"""ابزارهای مشترک تست‌های ماژول پروژه (Phase 0)."""
from core.models import Company
from projects.models import Project, ProjectType


def make_company(schema_name='testco', name='شرکت تست'):
    """ساخت مستأجر بدون اجرای DDL اسکیما (مناسب محیط تست)."""
    company = Company(schema_name=schema_name, name=name)
    company.auto_create_schema = False
    company.save()
    return company


class ProjectTestMixin:
    """ساخت سریع پروژه و دادهٔ پایه برای تست."""

    def make_project(self, code='P-1', name='پروژهٔ تست', schema_name='testco'):
        self.company = make_company(schema_name=schema_name)
        self.project_type = ProjectType.objects.create(
            company=self.company, name='عمرانی', code='CIV',
        )
        self.project = Project.objects.create(
            company=self.company, code=code, name=name, project_type=self.project_type,
        )
        return self.project

    def make_contract(self, **kwargs):
        from contracts.models import Contract, ContractParty

        party = kwargs.pop('party', None)
        if party is None:
            party = ContractParty.objects.create(company=self.company, name='پیمانکار تست')
        defaults = {
            'company': self.company,
            'subject': kwargs.pop('subject', 'قرارداد تست'),
            'party': party,
            'project': self.project,
        }
        defaults.update(kwargs)
        return Contract.objects.create(**defaults)
