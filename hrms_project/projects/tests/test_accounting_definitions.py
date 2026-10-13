"""تست موتور «تعاریف اولیهٔ پروژه»: نگاشت کل/معین و تفصیل‌ها (نیازمند دیتابیس)."""
from datetime import date

from django.core.exceptions import ValidationError
from django.test import TestCase

from accounting.models import Account, AccountType, AuxiliaryAccount, AuxiliaryCategory
from contracts.models import Contract, ContractParty
from projects.accounting_definitions import (
    apply_template, build_coding, effective_definitions, project_auxiliary,
    resolve_definition,
)
from projects.cost_models import CostTransaction, CostTransactionLine
from projects.definition_models import (
    ProjectAccountDefinition, ProjectAccountDefinitionAux,
)
from projects.tests.base import ProjectTestMixin
from projects.models import ProjectType

SRC = ProjectAccountDefinitionAux.Source


class AccountDefinitionMixin(ProjectTestMixin):
    """ساخت حساب‌های کل/معین و تعریف‌های نگاشت برای تست."""

    def setUp(self):
        self.make_project()
        self.account_type = AccountType.objects.create(
            company=self.company, code='1', name='دارایی', category='asset',
        )
        self.general = Account.objects.create(
            company=self.company, code='1001', name='دارایی جاری',
            account_type=self.account_type, level=1,
        )
        self.subsidiary = Account.objects.create(
            company=self.company, code='100101', name='پروژه در جریان',
            account_type=self.account_type, parent=self.general, level=2,
        )
        self.foreign_general = Account.objects.create(
            company=self.company, code='2001', name='بدهی جاری',
            account_type=self.account_type, level=1,
        )
        self.category = AuxiliaryCategory.objects.create(
            company=self.company, code='PRJ', name='پروژه', source='project',
        )

    def make_definition(self, code='MAT', title='مصالح', kind='material',
                        scope='type', general=None, subsidiary=None, rules=None,
                        auto_create=True):
        payload = {
            'company': self.company, 'code': code, 'title': title, 'kind': kind,
            'general_account': general if general is not None else self.general,
            'subsidiary_account': subsidiary if subsidiary is not None else self.subsidiary,
            'auto_create_auxiliaries': auto_create,
        }
        if scope == 'type':
            payload['project_type'] = self.project_type
        else:
            payload['project'] = self.project
        definition = ProjectAccountDefinition.objects.create(**payload)
        for slot, source in (rules or {1: SRC.PROJECT, 2: SRC.NONE, 3: SRC.NONE}).items():
            ProjectAccountDefinitionAux.objects.create(
                company=self.company, definition=definition, slot=slot,
                source=source, category=self.category if source == SRC.PROJECT else None,
            )
        return definition


class EffectiveDefinitionTests(AccountDefinitionMixin, TestCase):

    def test_type_scope_applies_to_its_projects(self):
        definition = self.make_definition()
        rows = effective_definitions(self.company, self.project)
        self.assertEqual([row.pk for row in rows], [definition.pk])

    def test_project_definition_overrides_project_type(self):
        self.make_definition(code='MAT', title='مصالح نوع پروژه')
        override = self.make_definition(code='MAT', title='مصالح خاص پروژه', scope='project')
        rows = effective_definitions(self.company, self.project)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].pk, override.pk)
        self.assertEqual(rows[0].title, 'مصالح خاص پروژه')

    def test_other_project_type_definition_is_ignored(self):
        other = ProjectType.objects.create(company=self.company, name='بازرگانی', code='TRD')
        ProjectAccountDefinition.objects.create(
            company=self.company, code='MAT', title='مصالح بازرگانی',
            kind='material', project_type=other, subsidiary_account=self.subsidiary,
        )
        self.assertEqual(effective_definitions(self.company, self.project), [])

    def test_resolve_by_code_and_kind(self):
        definition = self.make_definition(code='LBR', kind='labor')
        self.assertEqual(
            resolve_definition(self.company, self.project, code='LBR').pk, definition.pk,
        )
        self.assertEqual(
            resolve_definition(self.company, self.project, kind='labor').pk, definition.pk,
        )
        self.assertIsNone(resolve_definition(self.company, self.project, code='ZZZ'))


class BuildCodingTests(AccountDefinitionMixin, TestCase):

    def test_project_auxiliary_is_created_and_reused(self):
        definition = self.make_definition()
        coding = build_coding(definition, project=self.project, create=True)
        self.assertTrue(coding['ready'])
        self.assertEqual(coding['general_account']['code'], '1001')
        self.assertEqual(coding['subsidiary_account']['code'], '100101')
        self.assertIsNotNone(coding['auxiliary_1'])
        self.assertEqual(coding['auxiliary_1']['aux_type'], 'project')
        self.assertEqual(len(coding['created_auxiliaries']), 1)
        self.assertIn('تفصیل 1', coding['preview'])

        again = build_coding(definition, project=self.project, create=True)
        self.assertEqual(again['created_auxiliaries'], [])
        self.assertEqual(again['auxiliary_1']['id'], coding['auxiliary_1']['id'])
        self.assertEqual(
            AuxiliaryAccount.objects.filter(company=self.company, project=self.project).count(), 1,
        )

    def test_create_false_reports_missing_auxiliary(self):
        definition = self.make_definition()
        coding = build_coding(definition, project=self.project, create=False)
        self.assertIsNone(coding['auxiliary_1'])
        self.assertTrue(any('موجود نیست' in warning for warning in coding['warnings']))
        self.assertFalse(
            AuxiliaryAccount.objects.filter(company=self.company, project=self.project).exists(),
        )

    def test_party_and_contract_auxiliaries(self):
        party = ContractParty.objects.create(company=self.company, name='پیمانکار الف')
        contract = Contract.objects.create(
            company=self.company, subject='قرارداد تست', party=party, project=self.project,
        )
        definition = self.make_definition(rules={1: SRC.PROJECT, 2: SRC.PARTY, 3: SRC.CONTRACT})
        coding = build_coding(
            definition, project=self.project, party=party, contract=contract, create=True,
        )
        self.assertEqual(coding['auxiliary_2']['aux_type'], 'party')
        self.assertEqual(coding['auxiliary_3']['aux_type'], 'contract')
        self.assertTrue(
            AuxiliaryAccount.objects.filter(company=self.company, party=party).exists(),
        )
        self.assertTrue(
            AuxiliaryAccount.objects.filter(company=self.company, contract=contract).exists(),
        )

    def test_warning_when_subsidiary_missing(self):
        definition = self.make_definition(subsidiary=None, general=None)
        coding = build_coding(definition, project=self.project)
        self.assertFalse(coding['ready'])
        self.assertTrue(any('حساب معین' in warning for warning in coding['warnings']))



class DefinitionValidationTests(AccountDefinitionMixin, TestCase):

    def test_subsidiary_must_be_under_general(self):
        definition = ProjectAccountDefinition(
            company=self.company, code='X', title='ناهمخوان', kind='expense',
            project_type=self.project_type, general_account=self.general,
            subsidiary_account=self.foreign_general,
        )
        self.assertFalse(definition.subsidiary_is_under_general())
        with self.assertRaises(ValidationError):
            definition.clean()

    def test_scope_is_required_and_unique(self):
        broken = ProjectAccountDefinition(
            company=self.company, code='Y', title='بی‌حوزه', kind='expense',
        )
        with self.assertRaises(ValidationError):
            broken.clean()

        both = ProjectAccountDefinition(
            company=self.company, code='Z', title='دوحوزه', kind='expense',
            project=self.project, project_type=self.project_type,
        )
        with self.assertRaises(ValidationError):
            both.clean()

    def test_coding_problems_reports_missing_pieces(self):
        definition = self.make_definition(subsidiary=None, general=None, rules={})
        problems = definition.coding_problems()
        self.assertTrue(any('حساب معین' in item for item in problems))
        self.assertTrue(any('تفصیلی' in item for item in problems))


class TemplateAndUsageTests(AccountDefinitionMixin, TestCase):

    def test_apply_template_creates_rows_and_skips_duplicates(self):
        rows = [
            {'code': 'MAT', 'title': 'مصالح', 'kind': 'material'},
            {'code': 'LBR', 'title': 'دستمزد', 'kind': 'labor'},
        ]
        result = apply_template(self.company, rows, project_type=self.project_type)
        self.assertEqual(sorted(result['created']), ['LBR', 'MAT'])
        self.assertEqual(
            ProjectAccountDefinition.objects.filter(company=self.company).count(), 2,
        )
        self.assertEqual(
            ProjectAccountDefinitionAux.objects.filter(definition__code='MAT').count(), 3,
        )
        again = apply_template(self.company, rows, project_type=self.project_type)
        self.assertEqual(again['created'], [])
        self.assertEqual(sorted(again['skipped']), ['LBR', 'MAT'])

    def test_cost_line_gets_coding_from_definition(self):
        from projects.cost_views import _apply_coding

        definition = self.make_definition()
        transaction = CostTransaction.objects.create(
            company=self.company, project=self.project, number='CT-1', date=date(2026, 5, 1),
        )
        line = CostTransactionLine.objects.create(
            company=self.company, transaction=transaction, description='خرید سیمان',
            amount=1_000_000, net_amount=1_000_000, account_definition=definition,
        )
        coding = build_coding(definition, project=self.project, create=True)
        _apply_coding(line, coding)
        line.save()
        line.refresh_from_db()
        self.assertEqual(line.account_id, self.subsidiary.pk)
        self.assertEqual(line.general_account_id, self.general.pk)
        self.assertIsNotNone(line.auxiliary_1_id)
        self.assertIn('معین', line.coding_note)
        self.assertEqual(line.auxiliary_1.project_id, self.project.pk)

    def test_project_auxiliary_helper_is_idempotent(self):
        first = project_auxiliary(self.company, self.project)
        second = project_auxiliary(self.company, self.project)
        self.assertEqual(first.pk, second.pk)
        self.assertEqual(first.aux_type, 'project')

