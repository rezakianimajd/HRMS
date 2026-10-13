"""تست موتور کدینگ حسابداری (والد-آگاه) — اجرا روی سرور (PostgreSQL).

بررسی می‌کند که کد پیشنهادی برای «حساب معین» بر پایهٔ **والد انتخاب‌شده** ساخته شود
و نوع حساب/ماهیت از والد یا گروه ارث ببرد (و به‌اشتباه «دارایی» نشود).
"""
from django.test import TestCase

from accounting.coding import next_code, resolve_inheritance, suggest_code
from accounting.maintenance import (
    analyze_account_types, infer_category_from_name, sync_account_types,
)
from accounting.annual_views import (
    _annual_payload, _balance_rows, _carry_sides, _persist_annual, _zero_sides,
)
from accounting.models import Account, AccountGroup, AccountType
from accounting.serializers import AccountSerializer
from core.models import Company


def make_company(schema_name='testco', name='شرکت تست'):
    company = Company(schema_name=schema_name, name=name)
    company.auto_create_schema = False
    company.save()
    return company


class CodingSuggestionTests(TestCase):

    def setUp(self):
        self.company = make_company()
        self.asset = AccountType.objects.create(
            company=self.company, code='1', name='دارایی', category='asset',
            default_nature='debit',
        )
        self.liability = AccountType.objects.create(
            company=self.company, code='2', name='بدهی', category='liability',
            default_nature='credit',
        )
        self.asset_general = Account.objects.create(
            company=self.company, code='1001', name='موجودی نقد و بانک',
            account_type=self.asset, level=1, nature='debit',
        )
        self.liab_general = Account.objects.create(
            company=self.company, code='2001', name='حساب‌های پرداختنی',
            account_type=self.liability, level=1, nature='credit',
        )

    def test_subsidiary_code_follows_selected_parent(self):
        payload = next_code(self.company, 'subsidiary', parent=self.liab_general)
        self.assertEqual(payload['code_basis'], 'parent')
        self.assertTrue(payload['code'].startswith('2001'))
        self.assertEqual(payload['parent_code'], '2001')
        self.assertEqual(payload['full_code'], f'2001 / {payload["code"]}')

    def test_type_and_nature_inherited_from_parent(self):
        payload = next_code(self.company, 'subsidiary', parent=self.liab_general)
        self.assertEqual(payload['account_type'], self.liability.id)
        self.assertEqual(payload['account_type_name'], 'بدهی')
        self.assertEqual(payload['account_type_category'], 'liability')
        self.assertEqual(payload['nature'], 'credit')
        self.assertEqual(payload['inherited_from'], 'parent')

    def test_next_subsidiary_skips_codes_already_used_for_parent(self):
        first = next_code(self.company, 'subsidiary', parent=self.asset_general)['code']
        Account.objects.create(
            company=self.company, code=first, name='زیرحساب یک', account_type=self.asset,
            level=2, nature='debit', parent=self.asset_general,
        )
        second = next_code(self.company, 'subsidiary', parent=self.asset_general)['code']
        self.assertNotEqual(first, second)
        self.assertTrue(second.startswith('1001'))

    def test_without_parent_falls_back_to_global_range(self):
        payload = next_code(self.company, 'subsidiary')
        self.assertEqual(payload['code_basis'], 'range')
        self.assertIsNone(payload['inherited_from'])
        self.assertFalse(payload['code'].startswith('2001'))

    def test_general_account_inherits_from_group(self):
        group = AccountGroup.objects.create(
            company=self.company, account_type=self.liability, code='210',
            name='بدهی‌های جاری', nature='credit',
        )
        payload = next_code(self.company, 'general', group=group)
        self.assertEqual(payload['inherited_from'], 'group')
        self.assertEqual(payload['account_type'], self.liability.id)
        self.assertEqual(payload['nature'], 'credit')
        self.assertEqual(payload['code_basis'], 'range')

    def test_parent_wins_over_group(self):
        group = AccountGroup.objects.create(
            company=self.company, account_type=self.asset, code='110',
            name='دارایی جاری', nature='debit',
        )
        account_type, nature, source = resolve_inheritance(self.liab_general, group)
        self.assertEqual(source, 'parent')
        self.assertEqual(account_type, self.liability)
        self.assertEqual(nature, 'credit')

    def test_suggest_code_backward_compatible(self):
        code = suggest_code(self.company, 'subsidiary', '2001')
        self.assertTrue(code.startswith('2001'))

class CodingHealthSyncTests(TestCase):
    """رفع «ناهمگونی نوع حساب»: حساب زیر گروه بدهی که نوعش دارایی ثبت شده."""

    def setUp(self):
        self.company = make_company(schema_name='testco2')
        self.asset = AccountType.objects.create(
            company=self.company, code='1', name='دارایی', category='asset',
            default_nature='debit',
        )
        self.liability = AccountType.objects.create(
            company=self.company, code='2', name='بدهی', category='liability',
            default_nature='credit',
        )
        self.liab_group = AccountGroup.objects.create(
            company=self.company, account_type=self.liability, code='210',
            name='بدهی جاری', nature='credit',
        )
        self.broken = Account.objects.create(
            company=self.company, code='21001', name='حساب‌های پرداختنی تجاری',
            account_type=self.asset, level=1, nature='debit', group=self.liab_group,
        )

    def test_infer_category_from_name(self):
        self.assertEqual(infer_category_from_name('حساب‌های پرداختنی تجاری'), 'liability')
        self.assertEqual(infer_category_from_name('بهای تمام‌شده کالای فروش رفته'), 'cost_of_sales')
        self.assertIsNone(infer_category_from_name('چیز نامشخص'))

    def test_analyze_reports_group_based_mismatch(self):
        report = analyze_account_types(self.company)
        self.assertEqual(report['accounts_total'], 1)
        self.assertEqual(report['accounts_mismatched'], 1)
        row = report['changes'][0]
        self.assertEqual(row['source'], 'group')
        self.assertEqual(row['current_category'], 'asset')
        self.assertEqual(row['new_category'], 'liability')
        self.assertFalse(report['applied'])

    def test_analyze_detects_group_name_conflict(self):
        self.liab_group.account_type = self.asset
        self.liab_group.save(update_fields=['account_type'])
        report = analyze_account_types(self.company, fix_groups=True)
        self.assertEqual(len(report['groups_to_fix']), 1)
        self.assertEqual(report['groups_to_fix'][0]['to_category'], 'liability')
        self.assertEqual(report['changes'][0]['source'], 'group')

    def test_group_expected_category_uses_ancestor_name(self):
        """گروهِ بدون کلیدواژه، طبقه را از نام گروهِ بالادستی می‌گیرد."""
        child = AccountGroup.objects.create(
            company=self.company, account_type=self.asset, code='210-1',
            name='تجاری', nature='credit', parent=self.liab_group,
        )
        account = Account.objects.create(
            company=self.company, code='21001001', name='پرداختنی الف',
            account_type=self.asset, level=2, nature='debit', group=child,
        )
        report = analyze_account_types(self.company)
        rows = {row['id']: row for row in report['changes']}
        self.assertEqual(rows[account.id]['new_category'], 'liability')
        self.assertIn(rows[account.id]['source'], ('ancestor_name', 'group'))
        group_report = {g['code']: g for g in report['groups_report']}
        self.assertEqual(group_report['210-1']['expected_category'], 'liability')

    def test_account_name_inference_when_group_missing(self):
        AccountType.objects.create(
            company=self.company, code='5', name='هزینه', category='expense',
            default_nature='debit',
        )
        account = Account.objects.create(
            company=self.company, code='3001', name='هزینه‌های اداری',
            account_type=self.asset, level=2, nature='debit',
        )
        report = analyze_account_types(self.company)
        rows = {row['id']: row for row in report['changes']}
        self.assertEqual(rows[account.id]['source'], 'account_name')
        self.assertEqual(rows[account.id]['new_category'], 'expense')

    def test_parent_chain_is_fixed_top_down(self):
        """والد اشتباه در همان اجرا اصلاح می‌شود و فرزند از والدِ **اصلاح‌شده** ارث می‌برد."""
        general = Account.objects.create(
            company=self.company, code='2100', name='بدهی‌های جاری',
            account_type=self.asset, level=1, nature='debit', group=self.liab_group,
        )
        child = Account.objects.create(
            company=self.company, code='210000001', name='پرداختنی ب',
            account_type=self.asset, level=2, nature='debit', parent=general,
        )
        report = sync_account_types(self.company)
        general.refresh_from_db()
        child.refresh_from_db()
        self.assertEqual(general.account_type_id, self.liability.id)
        self.assertEqual(child.account_type_id, self.liability.id)
        self.assertEqual(report['accounts_updated'], 2)

    def test_sync_applies_type_and_nature(self):
        report = sync_account_types(self.company)
        self.assertTrue(report['applied'])
        self.assertEqual(report['accounts_updated'], 1)
        self.broken.refresh_from_db()
        self.assertEqual(self.broken.account_type_id, self.liability.id)
        self.assertEqual(self.broken.nature, 'credit')
        self.assertEqual(analyze_account_types(self.company)['accounts_mismatched'], 0)

    def test_sync_with_fix_groups_repairs_group_too(self):
        self.liab_group.account_type = self.asset
        self.liab_group.save(update_fields=['account_type'])
        report = sync_account_types(self.company, fix_groups=True)
        self.assertEqual(report['groups_updated'], 1)
        self.liab_group.refresh_from_db()
        self.broken.refresh_from_db()
        self.assertEqual(self.liab_group.account_type_id, self.liability.id)
        self.assertEqual(self.broken.account_type_id, self.liability.id)

    def test_sync_is_noop_when_consistent(self):
        self.broken.account_type = self.liability
        self.broken.nature = 'credit'
        self.broken.save(update_fields=['account_type', 'nature'])
        report = sync_account_types(self.company)
        self.assertEqual(report['accounts_updated'], 0)
        self.assertEqual(report['accounts_mismatched'], 0)

    def test_parent_type_wins_over_group(self):
        parent = Account.objects.create(
            company=self.company, code='2001', name='حساب‌های پرداختنی',
            account_type=self.liability, level=1, nature='credit',
        )
        child = Account.objects.create(
            company=self.company, code='200100001', name='پرداختنی الف',
            account_type=self.asset, level=2, nature='debit',
            parent=parent, group=self.liab_group,
        )
        report = analyze_account_types(self.company)
        rows = {row['id']: row for row in report['changes']}
        self.assertEqual(rows[child.id]['source'], 'parent')
        self.assertEqual(rows[child.id]['new_category'], 'liability')

    def test_locked_account_is_skipped_by_sync(self):
        """رکورد دستی (coding_locked) نباید بازنویسی شود، اما با force پیشنهاد داده می‌شود."""
        self.broken.coding_locked = True
        self.broken.save(update_fields=['coding_locked'])
        report = analyze_account_types(self.company)
        self.assertEqual(report['accounts_mismatched'], 0)
        self.assertEqual(report['locked_accounts'], 1)
        forced = analyze_account_types(self.company, force=True)
        self.assertEqual(forced['accounts_mismatched'], 1)

    def test_manual_type_and_nature_are_preserved(self):
        """تصمیم دستی کاربر (نوع/ماهیت) با اجرای سینک تغییر نمی‌کند."""
        self.broken.account_type = self.liability
        self.broken.nature = 'credit'
        self.broken.coding_locked = True
        self.broken.save(update_fields=['account_type', 'nature', 'coding_locked'])
        report = sync_account_types(self.company)
        self.assertEqual(report['accounts_updated'], 0)
        self.broken.refresh_from_db()
        self.assertEqual(self.broken.account_type_id, self.liability.id)
        self.assertEqual(self.broken.nature, 'credit')

    def test_locked_group_type_wins_over_name_heuristic(self):
        """گروهِ دستی (قفل): نوع کاربر مبناست، نه حدس از نام؛ حساب‌هایش هم دست‌نخورده."""
        self.liab_group.account_type = self.asset
        self.liab_group.coding_locked = True
        self.liab_group.save(update_fields=['account_type', 'coding_locked'])
        report = analyze_account_types(self.company, fix_groups=True)
        self.assertEqual(len(report['groups_to_fix']), 0)
        self.assertEqual(report['accounts_mismatched'], 0)
        forced = analyze_account_types(self.company, fix_groups=True, force=True)
        self.assertEqual(len(forced['groups_to_fix']), 1)
        self.assertEqual(forced['accounts_mismatched'], 1)

    def test_equity_keywords_cover_profit_and_loss(self):
        self.assertEqual(infer_category_from_name('سود (زیان)'), 'equity')
        self.assertEqual(infer_category_from_name('سود و زیان انباشته'), 'equity')
        self.assertEqual(infer_category_from_name('زیان انباشته'), 'equity')

    def test_serializer_flags_type_mismatch(self):
        data = AccountSerializer(self.broken).data
        self.assertTrue(data['type_mismatch'])
        self.assertEqual(data['group_type_category'], 'liability')



class AnnualOperationTests(TestCase):
    """عملیات سالانه: انتقال مانده تا آخرین تفصیل + پیش‌نمایش + پیش‌نویس قابل ویرایش."""

    def setUp(self):
        from datetime import date as _date
        from types import SimpleNamespace

        from accounting.models import (
            AccountingDocument, AccountingDocumentLine, AuxiliaryAccount, FiscalYear,
        )
        from django.http import QueryDict

        self.SimpleNamespace = SimpleNamespace
        self.QueryDict = QueryDict
        self.AccountingDocument = AccountingDocument
        self.AccountingDocumentLine = AccountingDocumentLine
        self.FiscalYear = FiscalYear

        self.company = make_company(schema_name='testco3')
        self.expense = AccountType.objects.create(
            company=self.company, code='5', name='هزینه', category='expense', default_nature='debit',
        )
        self.asset = AccountType.objects.create(
            company=self.company, code='1', name='دارایی', category='asset', default_nature='debit',
        )
        self.general = Account.objects.create(
            company=self.company, code='5001', name='هزینه‌های اداری',
            account_type=self.expense, level=1, nature='debit',
        )
        self.sub = Account.objects.create(
            company=self.company, code='500100001', name='هزینه چاپ و تکثیر',
            account_type=self.expense, level=2, nature='debit', parent=self.general,
        )
        self.bank = Account.objects.create(
            company=self.company, code='1001', name='موجودی نقد و بانک',
            account_type=self.asset, level=1, nature='debit',
        )
        self.aux = AuxiliaryAccount.objects.create(
            company=self.company, code='A-1', name='چاپخانه الف',
            aux_type='supplier', account=self.sub,
        )
        self.year = FiscalYear.objects.create(
            company=self.company, name='1403', start_date=_date(2024, 3, 20),
            end_date=_date(2025, 3, 20), status='open', is_current=True,
        )
        self.prev = FiscalYear.objects.create(
            company=self.company, name='1402', start_date=_date(2023, 3, 21),
            end_date=_date(2024, 3, 19), status='closed',
        )
        self.doc = AccountingDocument.objects.create(
            company=self.company, fiscal_year=self.prev, date=_date(2024, 1, 10),
            description='هزینه چاپ', status='posted',
        )
        self.AccountingDocumentLine.objects.create(
            document=self.doc, company=self.company, account=self.sub, auxiliary_1=self.aux,
            debit=1500, credit=0, line_no=1,
        )
        self.AccountingDocumentLine.objects.create(
            document=self.doc, company=self.company, account=self.bank,
            debit=0, credit=1500, line_no=2,
        )

    def _request(self, params, method='POST'):
        request = self.SimpleNamespace(
            tenant=self.company,
            company=self.company,
            query_params=self.QueryDict(''),
            data=params,
            method=method,
        )
        return request

    def test_balance_rows_keep_last_auxiliary(self):
        """ماندهٔ هر حساب به تفکیک «آخرین تفصیل» تجمیع می‌شود (نه فقط کد معین)."""
        rows = _balance_rows(self.company, self.prev, ('expense',))
        self.assertEqual(len(rows), 1)
        row = rows[0]
        self.assertEqual(row['account'].id, self.sub.id)
        self.assertEqual(row['deepest_aux'].id, self.aux.id)
        self.assertAlmostEqual(row['net'], 1500)

    def test_opening_preview_lines_include_auxiliary(self):
        data, error = _annual_payload(self._request({'fiscal_year': self.year.id}), 'opening')
        self.assertIsNone(error)
        self.assertTrue(data['lines'])
        expense_line = next(l for l in data['lines'] if l['account'] == self.sub.id)
        self.assertEqual(expense_line['auxiliary_1'], self.aux.id)
        self.assertIn('چاپخانه الف', expense_line['auxiliary_path'])
        self.assertAlmostEqual(expense_line['debit'], 1500)
        self.assertTrue(data['totals']['is_balanced'])
        self.assertEqual(data['default_date'], self.year.start_date.isoformat())

    def test_annual_date_can_be_customized(self):
        data, error = _annual_payload(
            self._request({'fiscal_year': self.year.id, 'date': '2024-04-05'}), 'opening',
        )
        self.assertIsNone(error)
        self.assertEqual(data['date'], '2024-04-05')

    def test_create_opening_as_editable_draft(self):
        request = self._request({
            'fiscal_year': self.year.id,
            'status': 'draft',
            'create': 1,
            'lines': [
                {'account': self.sub.id, 'auxiliary_1': self.aux.id, 'debit': 1500, 'credit': 0},
                {'account': self.bank.id, 'debit': 0, 'credit': 1500},
            ],
        })
        payload, error, status = _persist_annual(request, 'opening', request.data)
        self.assertIsNone(error)
        self.assertEqual(status, 201)
        doc = self.AccountingDocument.objects.get(
            company=self.company, source_module='annual', source_type='opening',
        )
        self.assertEqual(doc.status, 'draft')
        self.assertFalse(doc.is_locked)
        self.assertEqual(doc.lines.count(), 2)
        aux_line = doc.lines.get(account=self.sub)
        self.assertEqual(aux_line.auxiliary_1_id, self.aux.id)

    def test_closing_zeroes_liability(self):
        """اختتامیه باید بدهی را بستانکار نکند، بلکه بدهکار کند (صفر شدن)."""
        (debit, credit), (target_debit, target_credit) = _zero_sides('liability', 500)
        self.assertEqual((debit, credit), (500, 0))
        self.assertEqual((target_debit, target_credit), (0, 500))

    def test_carry_sides_use_absolute_amounts(self):
        self.assertEqual(_carry_sides('equity', -300), (300, 0))
        self.assertEqual(_carry_sides('asset', -200), (0, 200))

    def _memorandum_pair(self):
        """حساب‌های انتظامی دوطرفه (انتظامی بدهکار ↔ انتظامی بستانکار) + اسناد سال."""
        from datetime import date as _date

        from accounting.models import AccountingDocument, AccountingDocumentLine

        memo_type = AccountType.objects.create(
            company=self.company, code='7', name='انتظامی', category='memorandum', default_nature='debit',
        )
        debit_account = Account.objects.create(
            company=self.company, code='7001', name='اسناد تضمینی نزد بانک',
            account_type=memo_type, level=1, nature='debit',
        )
        credit_account = Account.objects.create(
            company=self.company, code='7002', name='طرف اسناد تضمینی',
            account_type=memo_type, level=1, nature='credit',
        )
        doc = AccountingDocument.objects.create(
            company=self.company, fiscal_year=self.prev, date=_date(2024, 2, 1),
            description='ثبت اسناد تضمینی', status='posted',
        )
        AccountingDocumentLine.objects.create(
            document=doc, company=self.company, account=debit_account,
            debit=9000, credit=0, line_no=1,
        )
        AccountingDocumentLine.objects.create(
            document=doc, company=self.company, account=credit_account,
            debit=0, credit=9000, line_no=2,
        )
        return debit_account, credit_account

    def test_closing_covers_memorandum_accounts(self):
        """سند اختتامیه باید حساب‌های انتظامی را هم صفر کند (قبلاً باز می‌ماندند)."""
        debit_account, credit_account = self._memorandum_pair()
        data, error = _annual_payload(self._request({'fiscal_year': self.year.id}), 'closing')
        self.assertIsNone(error)
        memo_ids = {l['account'] for l in data['lines'] if l['category'] == 'memorandum'}
        self.assertEqual(memo_ids, {debit_account.id, credit_account.id})
        self.assertEqual(data['memorandum']['lines'], 2)
        self.assertTrue(data['memorandum']['is_balanced'])
        self.assertTrue(data['totals']['is_balanced'])
        self.assertTrue(any('انتظامی' in n for n in data['notes']))
        # هر دو حساب انتظامی برگشت خورده‌اند (مانده صفر می‌شود)
        debit_row = next(l for l in data['lines'] if l['account'] == debit_account.id)
        credit_row = next(l for l in data['lines'] if l['account'] == credit_account.id)
        self.assertEqual((debit_row['debit'], debit_row['credit']), (0, 9000))
        self.assertEqual((credit_row['debit'], credit_row['credit']), (9000, 0))

    def test_opening_carries_memorandum_balances(self):
        debit_account, credit_account = self._memorandum_pair()
        data, error = _annual_payload(self._request({'fiscal_year': self.year.id}), 'opening')
        self.assertIsNone(error)
        memo_ids = {l['account'] for l in data['lines'] if l['category'] == 'memorandum'}
        self.assertEqual(memo_ids, {debit_account.id, credit_account.id})
        self.assertTrue(data['totals']['is_balanced'])

    def test_closing_compensates_unbalanced_memorandum(self):
        """اگر جمع انتظامی‌ها متوازن نباشد، اختلاف با حساب هدف جبران و اعلام می‌شود."""
        from datetime import date as _date

        from accounting.models import AccountingDocument, AccountingDocumentLine

        memo_type = AccountType.objects.create(
            company=self.company, code='7', name='انتظامی', category='memorandum', default_nature='debit',
        )
        only_debit = Account.objects.create(
            company=self.company, code='7003', name='امانی‌ها',
            account_type=memo_type, level=1, nature='debit',
        )
        doc = AccountingDocument.objects.create(
            company=self.company, fiscal_year=self.year, date=_date(2024, 6, 1),
            description='امانی', status='posted',
        )
        AccountingDocumentLine.objects.create(
            document=doc, company=self.company, account=only_debit, debit=800, credit=0, line_no=1,
        )
        data, error = _annual_payload(self._request({'fiscal_year': self.year.id}), 'closing')
        self.assertIsNone(error)
        self.assertFalse(data['memorandum']['is_balanced'])
        self.assertTrue(data['totals']['is_balanced'])
        self.assertTrue(any('متوازن نیست' in n for n in data['notes']))

    def test_opening_ignores_previous_year_closing_entry(self):
        """مانده‌ها «پیش از بستن» محاسبه می‌شوند تا افتتاحیهٔ سال بعد خالی درنیاید."""
        from datetime import date as _date

        from accounting.models import AccountingDocument, AccountingDocumentLine, FiscalYear

        # ماندهٔ دارایی ۵۰۰ در سال مبدأ (به‌علاوهٔ ۱۵۰۰ بستانکار setUp → ماندهٔ ۱۰۰۰ بستانکار)
        AccountingDocumentLine.objects.create(
            document=self.doc, company=self.company, account=self.bank,
            debit=500, credit=0, line_no=3,
        )
        # سند اختتامیهٔ همان سال که مانده را صفر می‌کند (باید در محاسبه لحاظ نشود)
        closing_doc = AccountingDocument.objects.create(
            company=self.company, fiscal_year=self.prev, date=self.prev.end_date,
            description='سند اختتامیه', status='posted',
            source_module='annual', source_type='closing', source_id=f'closing-{self.prev.id}',
        )
        AccountingDocumentLine.objects.create(
            document=closing_doc, company=self.company, account=self.bank,
            debit=1000, credit=0, line_no=1,
        )

        next_year = FiscalYear.objects.create(
            company=self.company, name='1404', start_date=_date(2025, 3, 21),
            end_date=_date(2026, 3, 20), status='draft',
        )
        data, error = _annual_payload(self._request({'fiscal_year': next_year.id}), 'opening')
        self.assertIsNone(error)
        bank_line = next(l for l in data['lines'] if l['account'] == self.bank.id)
        # ماندهٔ واقعی ۱۰۰۰ بستانکار است (نه صفر) تا در سال جدید منتقل شود
        self.assertEqual((bank_line['debit'], bank_line['credit']), (0, 1000))
        self.assertTrue(any('پیش از بستن' in n for n in data['notes']))

    def test_memorandum_side_inferred_when_nature_unset(self):
        """حساب انتظامی با ماهیت «مهم نیست» → سمت درست از گردش واقعی حساب استنتاج می‌شود."""
        from datetime import date as _date

        from accounting.models import AccountingDocument, AccountingDocumentLine

        memo_type = AccountType.objects.create(
            company=self.company, code='7', name='انتظامی', category='memorandum', default_nature='none',
        )
        account = Account.objects.create(
            company=self.company, code='7005', name='امانی بدون ماهیت',
            account_type=memo_type, level=1, nature='none',
        )
        doc = AccountingDocument.objects.create(
            company=self.company, fiscal_year=self.prev, date=_date(2024, 2, 2),
            description='امانی', status='posted',
        )
        AccountingDocumentLine.objects.create(
            document=doc, company=self.company, account=account, debit=400, credit=0, line_no=1,
        )
        rows = _balance_rows(self.company, self.prev, ('memorandum',))
        row = next(r for r in rows if r['account'].id == account.id)
        self.assertEqual(row['nature'], 'debit')
        data, error = _annual_payload(self._request({'fiscal_year': self.year.id}), 'opening')
        self.assertIsNone(error)
        line = next(l for l in data['lines'] if l['account'] == account.id)
        self.assertEqual((line['debit'], line['credit']), (400, 0))

    def test_warns_when_memorandum_accounts_use_wrong_category(self):
        """حساب با نام انتظامی که دستهٔ نوعش انتظامی نیست → هشدار راهنما."""
        Account.objects.create(
            company=self.company, code='8001', name='تعهدات انتظامی',
            account_type=self.asset, level=1, nature='debit',
        )
        data, error = _annual_payload(self._request({'fiscal_year': self.year.id}), 'opening')
        self.assertIsNone(error)
        self.assertTrue(any('انتظامی' in w and 'کدینگ' in w for w in data['warnings']))


