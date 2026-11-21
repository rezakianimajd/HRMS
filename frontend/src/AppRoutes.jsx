import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import useAuth from './core/hooks/useAuth';
import { useApplication } from './core/context/ApplicationContext';
import { getModuleLandingPath } from './core/constants/moduleIcons';
import Layout from './core/components/ui/Layout';
import WorkspacePageCache from './core/components/ui/WorkspacePageCache';
import Login from './pages/Login';
import DashboardPage from './pages/DashboardPage';
import EmployeeListPage from './pages/EmployeeListPage';
import EmployeeProfilePage from './pages/EmployeeProfilePage';
import EmployeeForm from './pages/EmployeeForm';
import PhonebookPage from './pages/PhonebookPage';
import AdvancedSearchPage from './pages/AdvancedSearchPage';
import ComingSoonPage from './pages/ComingSoonPage';
import AttendancePage from './pages/AttendancePage';
import LeavePage from './pages/LeavePage';
import RequestsPage from './pages/RequestsPage';
import PayslipsPage from './pages/PayslipsPage';
import PayrollPage from './pages/PayrollPage';
import FinanceReportsPage from './pages/FinanceReportsPage';
import BenefitsPage from './pages/BenefitsPage';
import DeductionsPage from './pages/DeductionsPage';
import UsersPage from './pages/UsersPage';
import AuditPage from './pages/AuditPage';
import DataImportPage from './pages/DataImportPage';
import AppearancePage from './pages/AppearancePage';
import CompanyDocumentsPage from './pages/CompanyDocumentsPage';
import DocumentManagementPage from './pages/DocumentManagementPage';
import DocumentManagementDashboardPage from './pages/contracts/DocumentManagementDashboardPage';
import DocumentManagementFoldersPage from './pages/contracts/DocumentManagementFoldersPage';
import DocumentManagementReportsPage from './pages/contracts/DocumentManagementReportsPage';
import DocumentManagementActivityPage from './pages/contracts/DocumentManagementActivityPage';
import ChatPage from './pages/chat/ChatPage';
import PlanningPage from './pages/planning/PlanningPage';
import OrgChartPage from './pages/OrgChartPage';
import DefinitionsPage from './pages/DefinitionsPage';
import DataEntryPage from './pages/DataEntryPage';
import CorrespondenceDashboardPage from './pages/correspondence/CorrespondenceDashboardPage';
import CorrespondenceLettersPage from './pages/correspondence/CorrespondenceLettersPage';
import CorrespondenceSettingsPage from './pages/correspondence/CorrespondenceSettingsPage';
import CorrespondenceNameMappingPage from './pages/correspondence/CorrespondenceNameMappingPage';
import CorrespondenceWorkdeskPage from './pages/correspondence/CorrespondenceWorkdeskPage';
import AssistantPage from './pages/AssistantPage';
import ScoringPage from './pages/ScoringPage';
import Settings from './modules/settings/Settings';
import SupplementaryInsurancePage from './pages/SupplementaryInsurancePage';
import FamilyReportPage from './pages/FamilyReportPage';
import EventsReportPage from './pages/EventsReportPage';
import LoansPage from './pages/LoansPage';
import CalendarPage from './pages/CalendarPage';
import AssetsPage from './pages/AssetsPage';
import LifecyclePage from './pages/LifecyclePage';
import ContractsPage from './pages/ContractsPage';
import BaleMessagingPage from './pages/BaleMessagingPage';
import RecruitmentPage from './pages/RecruitmentPage';
import AppraisalPage from './pages/AppraisalPage';
import AppSelectPage from './pages/AppSelectPage';
import ContractsDashboardPage from './pages/ContractsDashboardPage';
import ExternalContractsPage from './pages/ExternalContractsPage';
import ContractPartiesPage from './pages/ContractPartiesPage';
import ContractNewPage from './pages/ContractNewPage';
import ContractProfilePage from './pages/ContractProfilePage';
import GuaranteesPage from './pages/GuaranteesPage';
import ContractTemplatesPage from './pages/ContractTemplatesPage';
import ContractDraftsPage from './pages/ContractDraftsPage';
import ContractApprovalsPage from './pages/ContractApprovalsPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectsDashboardPage from './pages/ProjectsDashboardPage';
import ProjectCalendarPage from './pages/ProjectCalendarPage';
import ProjectSchedulePage from './pages/ProjectSchedulePage';
import ProjectChangeOrdersPage from './pages/ProjectChangeOrdersPage';
import ProjectCertificationPage from './pages/ProjectCertificationPage';
import ProjectRiskPage from './pages/ProjectRiskPage';
import ProjectQualityPage from './pages/ProjectQualityPage';
import ProjectsStructurePage from './pages/ProjectsStructurePage';
import ProjectsResourcesPage from './pages/ProjectsResourcesPage';
import ProjectsCostSourcesPage from './pages/ProjectsCostSourcesPage';
import ProjectsOBSPage from './pages/ProjectsOBSPage';
import ProjectDefinitionsPage from './pages/ProjectDefinitionsPage';
import ProjectTypesPage from './pages/ProjectTypesPage';
import ProjectProfilePage from './pages/ProjectProfilePage';
import PriceListPage from './pages/PriceListPage';
import CommercialPage from './pages/CommercialPage';
import CostDashboardPage from './pages/CostDashboardPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ContractFinancePage from './pages/ContractFinancePage';
import ContractDocumentsPage from './pages/ContractDocumentsPage';
import ContractExpiringPage from './pages/ContractExpiringPage';
import ContractGuaranteesMonitorPage from './pages/ContractGuaranteesMonitorPage';
import ContractsCompletenessPage from './pages/ContractsCompletenessPage';
import ContractDisputesPage from './pages/ContractDisputesPage';
import ContractCalendarPage from './pages/ContractCalendarPage';
import ContractTypesPage from './pages/ContractTypesPage';
import ContractAccountingMappingPage from './pages/ContractAccountingMappingPage';
import SupplierEvaluationsPage from './pages/SupplierEvaluationsPage';
import ContractWorkflowPage from './pages/ContractWorkflowPage';
import ContractInvoicesPage from './pages/ContractInvoicesPage';
import ContractPaymentsPage from './pages/ContractPaymentsPage';
import ContractAddendumsPage from './pages/ContractAddendumsPage';
import StatementEditorPage from './pages/contracts/StatementEditorPage';
import ContractDefinitionsPage from './pages/ContractDefinitionsPage';
import BenefitPaymentPage from './pages/BenefitPaymentPage';
import CompanyProfilePage from './pages/CompanyProfilePage';
import PettyCashPage from './pages/PettyCashPage';
import PettyCashExpensesPage from './pages/PettyCashExpensesPage';
import PettyCashExpenseNewPage from './pages/PettyCashExpenseNewPage';
import PettyCashCustodiansPage from './pages/PettyCashCustodiansPage';
import PettyCashPolicyPage from './pages/PettyCashPolicyPage';
import PettyCashLedgerPage from './pages/PettyCashLedgerPage';
import PettyCashCalendarPage from './pages/PettyCashCalendarPage';
import PettyCashRequestsPage from './pages/PettyCashRequestsPage';
import PettyCashSettlementsPage from './pages/PettyCashSettlementsPage';
import PettyCashPaymentsPage from './pages/PettyCashPaymentsPage';
import PettyCashSettingsPage from './pages/PettyCashSettingsPage';
import PettyCashDefinitionsPage from './pages/PettyCashDefinitionsPage';
import PettyCashReportsPage from './pages/PettyCashReportsPage';
import AccountingPage from './pages/AccountingPage';
import AccountingDocumentsPage from './pages/AccountingDocumentsPage';
import AccountingDocumentNewPage from './pages/AccountingDocumentNewPage';
import AccountingIntegrationPage from './pages/AccountingIntegrationPage';
import AccountingReportsPage from './pages/AccountingReportsPage';
import MatrixReportPage from './pages/accounting/reports/MatrixReportPage';
import TreeTrialBalancePage from './pages/accounting/reports/TreeTrialBalancePage';
import LedgerReviewPage from './pages/accounting/reports/LedgerReviewPage';
import BalanceSheetPage from './pages/accounting/reports/BalanceSheetPage';
import IncomeStatementPage from './pages/accounting/reports/IncomeStatementPage';
import CashFlowPage from './pages/accounting/reports/CashFlowPage';
import FinancialStatementsPage from './pages/accounting/reports/FinancialStatementsPage';
import OpeningDocumentPage from './pages/accounting/annual/OpeningDocumentPage';
import CloseAccountsPage from './pages/accounting/annual/CloseAccountsPage';
import ClosingDocumentPage from './pages/accounting/annual/ClosingDocumentPage';
import LegalBooksPage from './pages/accounting/annual/LegalBooksPage';
import VatLedgerPage from './pages/accounting/tax/VatLedgerPage';
import SeasonalReportPage from './pages/accounting/tax/SeasonalReportPage';
import OfficialLedgerPage from './pages/accounting/tax/OfficialLedgerPage';
import BiDashboardPage from './pages/accounting/tax/BiDashboardPage';
import AccountingFiscalPage from './pages/AccountingFiscalPage';
import AccountingSequencesPage from './pages/AccountingSequencesPage';
import AccountingReconciliationPage from './pages/AccountingReconciliationPage';
import AccountingApprovalPolicyPage from './pages/AccountingApprovalPolicyPage';
import AccountingDocumentSearchPage from './pages/AccountingDocumentSearchPage';
import AccountingFinalizePage from './pages/AccountingFinalizePage';
import AccountingControlPage from './pages/AccountingControlPage';
import AccountingCodingsPage from './pages/AccountingCodingsPage';
import CorrespondenceNumberingPage from './pages/correspondence/CorrespondenceNumberingPage';
import OrgPartiesPage from './pages/accounting/OrgPartiesPage';
import AccountingAccountTreePage from './pages/AccountingAccountTreePage';
import AccountGroupsPage from './pages/AccountGroupsPage';
import AccountsClassicPage from './pages/AccountsClassicPage';
import AuxiliaryAccountsPage from './pages/AuxiliaryAccountsPage';
import DataMappingPage from './pages/DataMappingPage';
import ProcurementPage from './pages/ProcurementPage';
import ProcurementSuppliersPage from './pages/procurement/ProcurementSuppliersPage';
import ProcurementItemsPage from './pages/procurement/ProcurementItemsPage';
import ProcurementRequestsPage from './pages/procurement/ProcurementRequestsPage';
import ProcurementOrdersPage from './pages/procurement/ProcurementOrdersPage';
import ProcurementReceiptsPage from './pages/procurement/ProcurementReceiptsPage';
import ProcurementInvoicesPage from './pages/procurement/ProcurementInvoicesPage';
import ProcurementPaymentsPage from './pages/procurement/ProcurementPaymentsPage';
import ProcurementInquiriesPage from './pages/procurement/ProcurementInquiriesPage';
import ProcurementInquiryComparisonPage from './pages/procurement/ProcurementInquiryComparisonPage';
import ProcurementProformaPage from './pages/procurement/ProcurementProformaPage';
import ProcurementGuaranteesPage from './pages/procurement/ProcurementGuaranteesPage';
import ProcurementAllocationsPage from './pages/procurement/ProcurementAllocationsPage';
import ProcurementSupplierProfilePage from './pages/procurement/ProcurementSupplierProfilePage';
import ProcurementProfilesPage from './pages/procurement/ProcurementProfilesPage';
import TreasuryPage from './pages/treasury/TreasuryPage';
import TreasuryBanksPage from './pages/treasury/TreasuryBanksPage';
import TreasuryBankBranchesPage from './pages/treasury/TreasuryBankBranchesPage';
import {
  TreasuryBankAccountsPage, TreasuryCashBoxesPage,
} from './pages/treasury/TreasuryBankAccountsPage';
import TreasuryTerminalsPage from './pages/treasury/TreasuryTerminalsPage';
import TreasuryPaymentMethodsPage from './pages/treasury/TreasuryPaymentMethodsPage';
import TreasuryNumberingPage from './pages/treasury/TreasuryNumberingPage';
import TreasuryVoucherBookPage from './pages/treasury/TreasuryVoucherBookPage';
import TreasuryBankOrdersPage from './pages/treasury/TreasuryBankOrdersPage';
import TreasuryPrintTemplatesPage from './pages/treasury/TreasuryPrintTemplatesPage';
import TreasuryReportsPage from './pages/treasury/TreasuryReportsPage';
import TreasuryReconciliationPage from './pages/treasury/TreasuryReconciliationPage';
import TreasuryVerifyPage from './pages/treasury/TreasuryVerifyPage';
import TreasuryPaymentOrdersPage from './pages/treasury/TreasuryPaymentOrdersPage';
import TreasuryApprovalRulesPage from './pages/treasury/TreasuryApprovalRulesPage';
import TreasuryTransactionsPage from './pages/treasury/TreasuryTransactionsPage';
import TreasuryPayablesPage from './pages/treasury/TreasuryPayablesPage';
import TreasuryCheckBooksPage from './pages/treasury/TreasuryCheckBooksPage';
import TreasuryReceivedChecksPage from './pages/treasury/TreasuryReceivedChecksPage';
import TreasuryIssuedChecksPage from './pages/treasury/TreasuryIssuedChecksPage';
import PaymentRequestsPage from './pages/treasury/PaymentRequestsPage';
import PaymentCommitmentsPage from './pages/treasury/PaymentCommitmentsPage';
import TreasuryReceiptsPage from './pages/treasury/TreasuryReceiptsPage';
import TreasuryAdvancesPage from './pages/treasury/TreasuryAdvancesPage';
import TreasuryTransfersPage from './pages/treasury/TreasuryTransfersPage';
import TreasuryGuaranteesPage from './pages/treasury/TreasuryGuaranteesPage';
import TreasuryForecastPage from './pages/treasury/TreasuryForecastPage';

/**
 * هدایت صفحهٔ خانه به داشبورد همان ماژول فعال (نه همیشه داشبورد منابع انسانی).
 * مثال: در ماژول مکاتبات، «/» به «/correspondence» می‌رود.
 */
const ModuleHomeRedirect = () => {
  const { currentApp } = useApplication();
  return <Navigate to={getModuleLandingPath(currentApp?.slug)} replace />;
};


/**
 * Protected route wrapper - redirects to login if not authenticated.
 */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return <div className="loading-container">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

/**
 * Route elements keep this wrapper for backward compatibility; the real
 * Layout is mounted once in `AppRoutes` so changing pages does not destroy
 * layout state. Auth is enforced by `ProtectedRoute` at the top level.
 */
const ProtectedLayout = ({ children }) => children;

/**
 * Application routes configuration.
 */
const PROTECTED_ROUTES = [
    <Route key="/coming-soon" path="/coming-soon" element={<ProtectedLayout><ComingSoonPage /></ProtectedLayout>} />,
    <Route key="/dashboard" path="/dashboard" element={<ProtectedLayout><DashboardPage /></ProtectedLayout>} />,
    <Route key="/search" path="/search" element={<ProtectedLayout><AdvancedSearchPage /></ProtectedLayout>} />,
    <Route key="/phonebook" path="/phonebook" element={<ProtectedLayout><PhonebookPage /></ProtectedLayout>} />,
    <Route key="/reports" path="/reports" element={<Navigate to="/dashboard" replace />} />,
    <Route key="/payslips" path="/payslips" element={<ProtectedLayout><PayslipsPage /></ProtectedLayout>} />,
    <Route key="/payroll" path="/payroll" element={<ProtectedLayout><PayrollPage /></ProtectedLayout>} />,
    <Route key="/payroll/attendance-import" path="/payroll/attendance-import" element={<ProtectedLayout><AttendancePage pageTitle="دریافت کارکرد (ساعت زنی)" pageSubtitle="دریافت و ثبت ساعت کارکرد پرسنل برای محاسبهٔ حقوق" /></ProtectedLayout>} />,
    <Route key="/payroll/*" path="/payroll/*" element={<ProtectedLayout><PayrollPage /></ProtectedLayout>} />,
    <Route key="/finance-reports" path="/finance-reports" element={<ProtectedLayout><FinanceReportsPage /></ProtectedLayout>} />,
    <Route key="/org-chart" path="/org-chart" element={<ProtectedLayout><OrgChartPage /></ProtectedLayout>} />,
    <Route key="/definitions" path="/definitions" element={<ProtectedLayout><DefinitionsPage /></ProtectedLayout>} />,
    <Route key="/company-profile" path="/company-profile" element={<ProtectedLayout><CompanyProfilePage /></ProtectedLayout>} />,
    <Route key="/data-entry" path="/data-entry" element={<Navigate to="/payslips" replace />} />,
    <Route key="/correspondences" path="/correspondences" element={<Navigate to="/correspondence" replace />} />,
    <Route key="/correspondence" path="/correspondence" element={<ProtectedLayout><CorrespondenceDashboardPage /></ProtectedLayout>} />,
    <Route key="/correspondence/letters" path="/correspondence/letters" element={<ProtectedLayout><CorrespondenceLettersPage mode="all" /></ProtectedLayout>} />,
    <Route key="/my-workdesk" path="/my-workdesk" element={<ProtectedLayout><CorrespondenceWorkdeskPage /></ProtectedLayout>} />,
    <Route key="/correspondence/workdesk" path="/correspondence/workdesk" element={<ProtectedLayout><CorrespondenceWorkdeskPage /></ProtectedLayout>} />,
    <Route key="/correspondence/incoming" path="/correspondence/incoming" element={<ProtectedLayout><CorrespondenceLettersPage mode="incoming" /></ProtectedLayout>} />,
    <Route key="/correspondence/outgoing" path="/correspondence/outgoing" element={<ProtectedLayout><CorrespondenceLettersPage mode="outgoing" /></ProtectedLayout>} />,
    <Route key="/correspondence/internal" path="/correspondence/internal" element={<ProtectedLayout><CorrespondenceLettersPage mode="internal" /></ProtectedLayout>} />,
    <Route key="/correspondence/drafts" path="/correspondence/drafts" element={<ProtectedLayout><CorrespondenceLettersPage mode="drafts" /></ProtectedLayout>} />,
    <Route key="/correspondence/referrals" path="/correspondence/referrals" element={<ProtectedLayout><CorrespondenceLettersPage mode="referrals" /></ProtectedLayout>} />,
    <Route key="/correspondence/overdue" path="/correspondence/overdue" element={<ProtectedLayout><CorrespondenceLettersPage mode="overdue" /></ProtectedLayout>} />,
    <Route key="/correspondence/archive" path="/correspondence/archive" element={<ProtectedLayout><CorrespondenceLettersPage mode="archive" /></ProtectedLayout>} />,
    <Route key="/correspondence/settings" path="/correspondence/settings" element={<ProtectedLayout><CorrespondenceSettingsPage /></ProtectedLayout>} />,
    <Route key="/correspondence/name-mapping" path="/correspondence/name-mapping" element={<ProtectedLayout><CorrespondenceNameMappingPage /></ProtectedLayout>} />,
    <Route key="/settings/correspondence-numbering" path="/settings/correspondence-numbering" element={<ProtectedLayout><CorrespondenceNumberingPage /></ProtectedLayout>} />,
    <Route key="/assistant" path="/assistant" element={<ProtectedLayout><AssistantPage /></ProtectedLayout>} />,
    <Route key="/scoring" path="/scoring" element={<ProtectedLayout><ScoringPage /></ProtectedLayout>} />,
    <Route key="/employees" path="/employees" element={<ProtectedLayout><EmployeeListPage /></ProtectedLayout>} />,
    <Route key="/employees/new" path="/employees/new" element={<ProtectedLayout><EmployeeForm /></ProtectedLayout>} />,
    <Route key="/employees/:id" path="/employees/:id" element={<ProtectedLayout><EmployeeProfilePage /></ProtectedLayout>} />,
    <Route key="/employees/:id/edit" path="/employees/:id/edit" element={<ProtectedLayout><EmployeeForm /></ProtectedLayout>} />,
    <Route key="/orgchart/*" path="/orgchart/*" element={<ProtectedLayout><OrgChartPage /></ProtectedLayout>} />,
    <Route key="/settings/*" path="/settings/*" element={<ProtectedLayout><Settings /></ProtectedLayout>} />,
    <Route key="/insurance" path="/insurance" element={<ProtectedLayout><SupplementaryInsurancePage /></ProtectedLayout>} />,
    <Route key="/reports/family" path="/reports/family" element={<ProtectedLayout><FamilyReportPage /></ProtectedLayout>} />,
    <Route key="/reports/events" path="/reports/events" element={<ProtectedLayout><EventsReportPage /></ProtectedLayout>} />,
    <Route key="/insurance/dependents" path="/insurance/dependents" element={<ProtectedLayout><FamilyReportPage /></ProtectedLayout>} />,
    <Route key="/loans" path="/loans" element={<ProtectedLayout><LoansPage /></ProtectedLayout>} />,
    <Route key="/attendance" path="/attendance" element={<ProtectedLayout><AttendancePage /></ProtectedLayout>} />,
    <Route key="/leaves" path="/leaves" element={<ProtectedLayout><LeavePage /></ProtectedLayout>} />,
    <Route key="/requests" path="/requests" element={<ProtectedLayout><RequestsPage /></ProtectedLayout>} />,
    <Route key="/calendar" path="/calendar" element={<ProtectedLayout><CalendarPage /></ProtectedLayout>} />,
    <Route key="/assets" path="/assets" element={<ProtectedLayout><AssetsPage /></ProtectedLayout>} />,
    <Route key="/lifecycle" path="/lifecycle" element={<ProtectedLayout><LifecyclePage /></ProtectedLayout>} />,
    <Route key="/benefits" path="/benefits" element={<ProtectedLayout><BenefitsPage /></ProtectedLayout>} />,
    <Route key="/benefit-payments" path="/benefit-payments" element={<ProtectedLayout><BenefitPaymentPage /></ProtectedLayout>} />,
    <Route key="/petty-cash/custodians" path="/petty-cash/custodians" element={<ProtectedLayout><PettyCashCustodiansPage /></ProtectedLayout>} />,
    <Route key="/petty-cash/policies" path="/petty-cash/policies" element={<ProtectedLayout><PettyCashPolicyPage /></ProtectedLayout>} />,
    <Route key="/petty-cash/ledger" path="/petty-cash/ledger" element={<ProtectedLayout><PettyCashLedgerPage /></ProtectedLayout>} />,
    <Route key="/petty-cash/calendar" path="/petty-cash/calendar" element={<ProtectedLayout><PettyCashCalendarPage /></ProtectedLayout>} />,
    <Route key="/petty-cash/expenses" path="/petty-cash/expenses" element={<ProtectedLayout><PettyCashExpensesPage /></ProtectedLayout>} />,
    <Route key="/petty-cash/expenses/new" path="/petty-cash/expenses/new" element={<ProtectedLayout><PettyCashExpenseNewPage /></ProtectedLayout>} />,
    <Route key="/petty-cash/expenses/:id/edit" path="/petty-cash/expenses/:id/edit" element={<ProtectedLayout><PettyCashExpenseNewPage /></ProtectedLayout>} />,
    <Route key="/petty-cash/requests" path="/petty-cash/requests" element={<ProtectedLayout><PettyCashRequestsPage /></ProtectedLayout>} />,
    <Route key="/petty-cash/settlements" path="/petty-cash/settlements" element={<ProtectedLayout><PettyCashSettlementsPage /></ProtectedLayout>} />,
    <Route key="/petty-cash/payments" path="/petty-cash/payments" element={<ProtectedLayout><PettyCashPaymentsPage /></ProtectedLayout>} />,
    <Route key="/petty-cash/settings" path="/petty-cash/settings" element={<ProtectedLayout><PettyCashSettingsPage /></ProtectedLayout>} />,
    <Route key="/petty-cash/definitions" path="/petty-cash/definitions" element={<ProtectedLayout><PettyCashDefinitionsPage /></ProtectedLayout>} />,
    <Route key="/petty-cash/reports" path="/petty-cash/reports" element={<ProtectedLayout><PettyCashReportsPage /></ProtectedLayout>} />,
    <Route key="/petty-cash/reports/:report" path="/petty-cash/reports/:report" element={<ProtectedLayout><PettyCashReportsPage /></ProtectedLayout>} />,
    <Route key="/petty-cash/:tab" path="/petty-cash/:tab" element={<ProtectedLayout><PettyCashPage /></ProtectedLayout>} />,
    <Route key="/petty-cash" path="/petty-cash" element={<ProtectedLayout><PettyCashPage /></ProtectedLayout>} />,
    <Route key="/accounting/documents" path="/accounting/documents" element={<ProtectedLayout><AccountingDocumentsPage /></ProtectedLayout>} />,
    <Route key="/accounting/document-new" path="/accounting/document-new" element={<ProtectedLayout><AccountingDocumentNewPage /></ProtectedLayout>} />,
    <Route key="/accounting/documents/new" path="/accounting/documents/new" element={<Navigate to="/accounting/document-new" replace />} />,
    <Route key="/accounting/documents/:id/edit" path="/accounting/documents/:id/edit" element={<ProtectedLayout><AccountingDocumentNewPage /></ProtectedLayout>} />,
    <Route key="/accounting/integration" path="/accounting/integration" element={<ProtectedLayout><AccountingIntegrationPage /></ProtectedLayout>} />,
    <Route key="/accounting/reports" path="/accounting/reports" element={<ProtectedLayout><AccountingReportsPage /></ProtectedLayout>} />,
    <Route key="/accounting/reports/matrix" path="/accounting/reports/matrix" element={<ProtectedLayout><MatrixReportPage /></ProtectedLayout>} />,
    <Route key="/accounting/reports/tree-trial-balance" path="/accounting/reports/tree-trial-balance" element={<ProtectedLayout><TreeTrialBalancePage /></ProtectedLayout>} />,
    <Route key="/accounting/reports/ledger-review" path="/accounting/reports/ledger-review" element={<ProtectedLayout><LedgerReviewPage /></ProtectedLayout>} />,
    <Route key="/accounting/reports/balance-sheet" path="/accounting/reports/balance-sheet" element={<ProtectedLayout><BalanceSheetPage /></ProtectedLayout>} />,
    <Route key="/accounting/reports/income-statement" path="/accounting/reports/income-statement" element={<ProtectedLayout><IncomeStatementPage /></ProtectedLayout>} />,
    <Route key="/accounting/reports/cash-flow" path="/accounting/reports/cash-flow" element={<ProtectedLayout><CashFlowPage /></ProtectedLayout>} />,
    <Route key="/accounting/reports/financial-statements" path="/accounting/reports/financial-statements" element={<ProtectedLayout><FinancialStatementsPage /></ProtectedLayout>} />,
    <Route key="/accounting/annual/opening-document" path="/accounting/annual/opening-document" element={<ProtectedLayout><OpeningDocumentPage /></ProtectedLayout>} />,
    <Route key="/accounting/annual/close-accounts" path="/accounting/annual/close-accounts" element={<ProtectedLayout><CloseAccountsPage /></ProtectedLayout>} />,
    <Route key="/accounting/annual/closing-document" path="/accounting/annual/closing-document" element={<ProtectedLayout><ClosingDocumentPage /></ProtectedLayout>} />,
    <Route key="/accounting/annual/legal-books" path="/accounting/annual/legal-books" element={<ProtectedLayout><LegalBooksPage /></ProtectedLayout>} />,
    <Route key="/accounting/tax/vat-ledger" path="/accounting/tax/vat-ledger" element={<ProtectedLayout><VatLedgerPage /></ProtectedLayout>} />,
    <Route key="/accounting/tax/seasonal" path="/accounting/tax/seasonal" element={<ProtectedLayout><SeasonalReportPage /></ProtectedLayout>} />,
    <Route key="/accounting/tax/official-ledger" path="/accounting/tax/official-ledger" element={<ProtectedLayout><OfficialLedgerPage /></ProtectedLayout>} />,
    <Route key="/accounting/tax/bi-dashboard" path="/accounting/tax/bi-dashboard" element={<ProtectedLayout><BiDashboardPage /></ProtectedLayout>} />,
    <Route key="/accounting/settings" path="/accounting/settings" element={<Navigate to="/settings?tab=accounting" replace />} />,
    <Route key="/accounting/fiscal" path="/accounting/fiscal" element={<ProtectedLayout><AccountingFiscalPage /></ProtectedLayout>} />,
    <Route key="/accounting/sequences" path="/accounting/sequences" element={<ProtectedLayout><AccountingSequencesPage /></ProtectedLayout>} />,
    <Route key="/accounting/reconciliation" path="/accounting/reconciliation" element={<ProtectedLayout><AccountingReconciliationPage /></ProtectedLayout>} />,
    <Route key="/accounting/approval-policies" path="/accounting/approval-policies" element={<ProtectedLayout><AccountingApprovalPolicyPage /></ProtectedLayout>} />,
    <Route key="/accounting/documents/search" path="/accounting/documents/search" element={<ProtectedLayout><AccountingDocumentSearchPage /></ProtectedLayout>} />,
    <Route key="/accounting/documents/finalize" path="/accounting/documents/finalize" element={<ProtectedLayout><AccountingFinalizePage /></ProtectedLayout>} />,
    <Route key="/accounting/documents/control" path="/accounting/documents/control" element={<ProtectedLayout><AccountingControlPage /></ProtectedLayout>} />,
    <Route key="/accounting/codings/:kind" path="/accounting/codings/:kind" element={<ProtectedLayout><AccountingCodingsPage /></ProtectedLayout>} />,
    <Route key="/accounting/org-parties" path="/accounting/org-parties" element={<ProtectedLayout><OrgPartiesPage /></ProtectedLayout>} />,
    <Route key="/accounting/accounts-tree" path="/accounting/accounts-tree" element={<ProtectedLayout><AccountingAccountTreePage /></ProtectedLayout>} />,
    <Route key="/accounting/groups" path="/accounting/groups" element={<ProtectedLayout><AccountGroupsPage /></ProtectedLayout>} />,
    <Route key="/accounting/accounts/:kind" path="/accounting/accounts/:kind" element={<ProtectedLayout><AccountsClassicPage /></ProtectedLayout>} />,
    <Route key="/accounting/auxiliary" path="/accounting/auxiliary" element={<ProtectedLayout><AuxiliaryAccountsPage /></ProtectedLayout>} />,
    <Route key="/accounting/datamapping" path="/accounting/datamapping" element={<ProtectedLayout><DataMappingPage /></ProtectedLayout>} />,
    <Route key="/accounting/*" path="/accounting/*" element={<ProtectedLayout><AccountingPage /></ProtectedLayout>} />,
    <Route key="/procurement" path="/procurement" element={<ProtectedLayout><ProcurementPage /></ProtectedLayout>} />,
    <Route key="/procurement/suppliers" path="/procurement/suppliers" element={<ProtectedLayout><ProcurementSuppliersPage /></ProtectedLayout>} />,
    <Route key="/procurement/items" path="/procurement/items" element={<ProtectedLayout><ProcurementItemsPage /></ProtectedLayout>} />,
    <Route key="/procurement/requests" path="/procurement/requests" element={<ProtectedLayout><ProcurementRequestsPage /></ProtectedLayout>} />,
    <Route key="/procurement/orders" path="/procurement/orders" element={<ProtectedLayout><ProcurementOrdersPage /></ProtectedLayout>} />,
    <Route key="/procurement/receipts" path="/procurement/receipts" element={<ProtectedLayout><ProcurementReceiptsPage /></ProtectedLayout>} />,
    <Route key="/procurement/invoices" path="/procurement/invoices" element={<ProtectedLayout><ProcurementInvoicesPage /></ProtectedLayout>} />,
    <Route key="/procurement/payments" path="/procurement/payments" element={<ProtectedLayout><ProcurementPaymentsPage /></ProtectedLayout>} />,
    <Route key="/procurement/inquiries" path="/procurement/inquiries" element={<ProtectedLayout><ProcurementInquiriesPage /></ProtectedLayout>} />,
    <Route key="/procurement/inquiries/:id/comparison" path="/procurement/inquiries/:id/comparison" element={<ProtectedLayout><ProcurementInquiryComparisonPage /></ProtectedLayout>} />,
    <Route key="/procurement/proforma" path="/procurement/proforma" element={<ProtectedLayout><ProcurementProformaPage /></ProtectedLayout>} />,
    <Route key="/procurement/guarantees" path="/procurement/guarantees" element={<ProtectedLayout><ProcurementGuaranteesPage /></ProtectedLayout>} />,
    <Route key="/procurement/allocations" path="/procurement/allocations" element={<ProtectedLayout><ProcurementAllocationsPage /></ProtectedLayout>} />,
    <Route key="/procurement/supplier-profile" path="/procurement/supplier-profile" element={<ProtectedLayout><ProcurementSupplierProfilePage /></ProtectedLayout>} />,
    <Route key="/procurement/profiles" path="/procurement/profiles" element={<ProtectedLayout><ProcurementProfilesPage /></ProtectedLayout>} />,
    <Route key="/treasury" path="/treasury" element={<ProtectedLayout><TreasuryPage /></ProtectedLayout>} />,
    <Route key="/treasury/entities" path="/treasury/entities" element={<ProtectedLayout><TreasuryBankAccountsPage /></ProtectedLayout>} />,
    <Route key="/treasury/payment-orders" path="/treasury/payment-orders" element={<ProtectedLayout><TreasuryPaymentOrdersPage /></ProtectedLayout>} />,
    <Route key="/treasury/approval-rules" path="/treasury/approval-rules" element={<ProtectedLayout><TreasuryApprovalRulesPage /></ProtectedLayout>} />,
    <Route key="/treasury/accounts" path="/treasury/accounts" element={<ProtectedLayout><TreasuryBankAccountsPage /></ProtectedLayout>} />,
    <Route key="/treasury/cashboxes" path="/treasury/cashboxes" element={<ProtectedLayout><TreasuryCashBoxesPage /></ProtectedLayout>} />,
    <Route key="/treasury/banks" path="/treasury/banks" element={<ProtectedLayout><TreasuryBanksPage /></ProtectedLayout>} />,
    <Route key="/treasury/bank-branches" path="/treasury/bank-branches" element={<ProtectedLayout><TreasuryBankBranchesPage /></ProtectedLayout>} />,
    <Route key="/treasury/terminals" path="/treasury/terminals" element={<ProtectedLayout><TreasuryTerminalsPage /></ProtectedLayout>} />,
    <Route key="/treasury/payment-methods" path="/treasury/payment-methods" element={<ProtectedLayout><TreasuryPaymentMethodsPage /></ProtectedLayout>} />,
    <Route key="/treasury/numbering" path="/treasury/numbering" element={<ProtectedLayout><TreasuryNumberingPage /></ProtectedLayout>} />,
    <Route key="/treasury/voucher-book" path="/treasury/voucher-book" element={<ProtectedLayout><TreasuryVoucherBookPage /></ProtectedLayout>} />,
    <Route key="/treasury/bank-orders" path="/treasury/bank-orders" element={<ProtectedLayout><TreasuryBankOrdersPage /></ProtectedLayout>} />,
    <Route key="/treasury/print-templates" path="/treasury/print-templates" element={<ProtectedLayout><TreasuryPrintTemplatesPage /></ProtectedLayout>} />,
    <Route key="/treasury/reports" path="/treasury/reports" element={<ProtectedLayout><TreasuryReportsPage /></ProtectedLayout>} />,
    <Route key="/treasury/reconciliation" path="/treasury/reconciliation" element={<ProtectedLayout><TreasuryReconciliationPage /></ProtectedLayout>} />,
    <Route key="/treasury/verify" path="/treasury/verify" element={<ProtectedLayout><TreasuryVerifyPage /></ProtectedLayout>} />,
    <Route key="/treasury/transactions" path="/treasury/transactions" element={<ProtectedLayout><TreasuryTransactionsPage /></ProtectedLayout>} />,
    <Route key="/treasury/payables" path="/treasury/payables" element={<ProtectedLayout><TreasuryPayablesPage /></ProtectedLayout>} />,
    <Route key="/treasury/checkbooks" path="/treasury/checkbooks" element={<ProtectedLayout><TreasuryCheckBooksPage /></ProtectedLayout>} />,
    <Route key="/treasury/received-checks" path="/treasury/received-checks" element={<ProtectedLayout><TreasuryReceivedChecksPage /></ProtectedLayout>} />,
    <Route key="/treasury/issued-checks" path="/treasury/issued-checks" element={<ProtectedLayout><TreasuryIssuedChecksPage /></ProtectedLayout>} />,
    <Route key="/treasury/payment-requests" path="/treasury/payment-requests" element={<ProtectedLayout><PaymentRequestsPage /></ProtectedLayout>} />,
    <Route key="/treasury/payment-commitments" path="/treasury/payment-commitments" element={<ProtectedLayout><PaymentCommitmentsPage /></ProtectedLayout>} />,
    <Route key="/treasury/receipts" path="/treasury/receipts" element={<ProtectedLayout><TreasuryReceiptsPage /></ProtectedLayout>} />,
    <Route key="/treasury/advances" path="/treasury/advances" element={<ProtectedLayout><TreasuryAdvancesPage /></ProtectedLayout>} />,
    <Route key="/treasury/transfers" path="/treasury/transfers" element={<ProtectedLayout><TreasuryTransfersPage /></ProtectedLayout>} />,
    <Route key="/treasury/guarantees" path="/treasury/guarantees" element={<ProtectedLayout><TreasuryGuaranteesPage /></ProtectedLayout>} />,
    <Route key="/treasury/forecast" path="/treasury/forecast" element={<ProtectedLayout><TreasuryForecastPage /></ProtectedLayout>} />,
    <Route key="/deductions" path="/deductions" element={<ProtectedLayout><DeductionsPage /></ProtectedLayout>} />,
    <Route key="/contracts" path="/contracts" element={<ProtectedLayout><ContractsPage /></ProtectedLayout>} />,
    <Route key="/contracts-dashboard" path="/contracts-dashboard" element={<ProtectedLayout><ContractsDashboardPage /></ProtectedLayout>} />,
    <Route key="/external-contracts" path="/external-contracts" element={<ProtectedLayout><ExternalContractsPage /></ProtectedLayout>} />,
    <Route key="/contract-parties" path="/contract-parties" element={<ProtectedLayout><ContractPartiesPage /></ProtectedLayout>} />,
    <Route key="/contracts/new" path="/contracts/new" element={<ProtectedLayout><ContractNewPage /></ProtectedLayout>} />,
    <Route key="/contracts/:id/edit" path="/contracts/:id/edit" element={<ProtectedLayout><ContractNewPage /></ProtectedLayout>} />,
    <Route key="/external-contracts/:id" path="/external-contracts/:id" element={<ProtectedLayout><ContractProfilePage /></ProtectedLayout>} />,
    <Route key="/contracts-guarantees" path="/contracts-guarantees" element={<ProtectedLayout><GuaranteesPage /></ProtectedLayout>} />,
    <Route key="/contracts-templates" path="/contracts-templates" element={<ProtectedLayout><ContractTemplatesPage /></ProtectedLayout>} />,
    <Route key="/contracts-drafts" path="/contracts-drafts" element={<ProtectedLayout><ContractDraftsPage /></ProtectedLayout>} />,
    <Route key="/contracts-approvals" path="/contracts-approvals" element={<ProtectedLayout><ContractApprovalsPage /></ProtectedLayout>} />,
    <Route key="/contracts-finance" path="/contracts-finance" element={<ProtectedLayout><ContractFinancePage /></ProtectedLayout>} />,
    <Route key="/contracts-invoices" path="/contracts-invoices" element={<ProtectedLayout><ContractInvoicesPage /></ProtectedLayout>} />,
    <Route key="/contracts-statements" path="/contracts-statements" element={<ProtectedLayout><StatementEditorPage /></ProtectedLayout>} />,
    <Route key="/contracts-payments" path="/contracts-payments" element={<ProtectedLayout><ContractPaymentsPage /></ProtectedLayout>} />,
    <Route key="/contracts-addendums" path="/contracts-addendums" element={<ProtectedLayout><ContractAddendumsPage /></ProtectedLayout>} />,
    <Route key="/contracts-documents" path="/contracts-documents" element={<ProtectedLayout><ContractDocumentsPage /></ProtectedLayout>} />,
    <Route key="/contracts-expiring" path="/contracts-expiring" element={<ProtectedLayout><ContractExpiringPage /></ProtectedLayout>} />,
    <Route key="/contracts-guarantees-monitor" path="/contracts-guarantees-monitor" element={<ProtectedLayout><ContractGuaranteesMonitorPage /></ProtectedLayout>} />,
    <Route key="/contracts-completeness" path="/contracts-completeness" element={<ProtectedLayout><ContractsCompletenessPage /></ProtectedLayout>} />,
    <Route key="/contracts-disputes" path="/contracts-disputes" element={<ProtectedLayout><ContractDisputesPage /></ProtectedLayout>} />,
    <Route key="/contracts-calendar" path="/contracts-calendar" element={<ProtectedLayout><ContractCalendarPage /></ProtectedLayout>} />,
    <Route key="/contracts-settings" path="/contracts-settings" element={<ProtectedLayout><ContractTypesPage /></ProtectedLayout>} />,
    <Route key="/contracts-accounting-mapping" path="/contracts-accounting-mapping" element={<ProtectedLayout><ContractAccountingMappingPage /></ProtectedLayout>} />,
    <Route key="/contracts-evaluations" path="/contracts-evaluations" element={<ProtectedLayout><SupplierEvaluationsPage /></ProtectedLayout>} />,
    <Route key="/contracts-workflow" path="/contracts-workflow" element={<ProtectedLayout><ContractWorkflowPage /></ProtectedLayout>} />,
    <Route key="/contracts-definitions" path="/contracts-definitions" element={<ProtectedLayout><ContractDefinitionsPage /></ProtectedLayout>} />,
    <Route key="/projects" path="/projects" element={<ProtectedLayout><ProjectsPage /></ProtectedLayout>} />,
    <Route key="/projects/dashboard" path="/projects/dashboard" element={<ProtectedLayout><ProjectsDashboardPage /></ProtectedLayout>} />,
    <Route key="/projects/calendar" path="/projects/calendar" element={<ProtectedLayout><ProjectCalendarPage /></ProtectedLayout>} />,
    <Route key="/projects/schedule" path="/projects/schedule" element={<ProtectedLayout><ProjectSchedulePage /></ProtectedLayout>} />,
    <Route key="/projects/risks" path="/projects/risks" element={<ProtectedLayout><ProjectRiskPage /></ProtectedLayout>} />,
    <Route key="/projects/quality" path="/projects/quality" element={<ProtectedLayout><ProjectQualityPage /></ProtectedLayout>} />,
    <Route key="/projects/change-orders" path="/projects/change-orders" element={<ProtectedLayout><ProjectChangeOrdersPage /></ProtectedLayout>} />,
    <Route key="/projects/certification" path="/projects/certification" element={<ProtectedLayout><ProjectCertificationPage /></ProtectedLayout>} />,
    <Route key="/projects/structure" path="/projects/structure" element={<ProtectedLayout><ProjectsStructurePage /></ProtectedLayout>} />,
    <Route key="/projects/resources" path="/projects/resources" element={<ProtectedLayout><ProjectsResourcesPage /></ProtectedLayout>} />,
    <Route key="/projects/cost-sources" path="/projects/cost-sources" element={<ProtectedLayout><ProjectsCostSourcesPage /></ProtectedLayout>} />,
    <Route key="/projects/obs" path="/projects/obs" element={<ProtectedLayout><ProjectsOBSPage /></ProtectedLayout>} />,
    <Route key="/projects/types" path="/projects/types" element={<ProtectedLayout><ProjectTypesPage /></ProtectedLayout>} />,
    <Route key="/projects/definitions" path="/projects/definitions" element={<ProtectedLayout><ProjectDefinitionsPage /></ProtectedLayout>} />,
    <Route key="/projects/:id" path="/projects/:id" element={<ProtectedLayout><ProjectProfilePage /></ProtectedLayout>} />,
    <Route key="/projects/price-lists" path="/projects/price-lists" element={<ProtectedLayout><PriceListPage /></ProtectedLayout>} />,
    <Route key="/projects/commercial" path="/projects/commercial" element={<ProtectedLayout><CommercialPage /></ProtectedLayout>} />,
    <Route key="/projects/cost" path="/projects/cost" element={<ProtectedLayout><CostDashboardPage /></ProtectedLayout>} />,
    <Route key="/projects/reports" path="/projects/reports" element={<ProtectedLayout><AnalyticsPage /></ProtectedLayout>} />,
    <Route key="/management-analytics" path="/management-analytics" element={<Navigate to="/dashboard?tab=people" replace />} />,
    <Route key="/chat" path="/chat" element={<ProtectedLayout><ChatPage /></ProtectedLayout>} />,
    <Route key="/planning" path="/planning" element={<ProtectedLayout><PlanningPage /></ProtectedLayout>} />,
    <Route key="/bale-messaging" path="/bale-messaging" element={<ProtectedLayout><BaleMessagingPage /></ProtectedLayout>} />,
    <Route key="/recruitment" path="/recruitment" element={<ProtectedLayout><RecruitmentPage /></ProtectedLayout>} />,
    <Route key="/appraisal" path="/appraisal" element={<ProtectedLayout><AppraisalPage /></ProtectedLayout>} />,
    <Route key="/documents" path="/documents" element={<ProtectedLayout><CompanyDocumentsPage /></ProtectedLayout>} />,
    <Route key="/document-management" path="/document-management" element={<ProtectedLayout><DocumentManagementDashboardPage /></ProtectedLayout>} />,
    <Route key="/document-management/library" path="/document-management/library" element={<ProtectedLayout><DocumentManagementPage /></ProtectedLayout>} />,
    <Route key="/document-management/folders" path="/document-management/folders" element={<ProtectedLayout><DocumentManagementFoldersPage /></ProtectedLayout>} />,
    <Route key="/document-management/reports" path="/document-management/reports" element={<ProtectedLayout><DocumentManagementReportsPage /></ProtectedLayout>} />,
    <Route key="/document-management/activity" path="/document-management/activity" element={<ProtectedLayout><DocumentManagementActivityPage /></ProtectedLayout>} />,
    <Route key="/users" path="/users" element={<ProtectedLayout><UsersPage /></ProtectedLayout>} />,
    <Route key="/audit" path="/audit" element={<ProtectedLayout><AuditPage /></ProtectedLayout>} />,
    <Route key="/data-import" path="/data-import" element={<ProtectedLayout><DataImportPage /></ProtectedLayout>} />,
    <Route key="/appearance" path="/appearance" element={<ProtectedLayout><AppearancePage /></ProtectedLayout>} />,
    <Route key="/" path="/" element={<ModuleHomeRedirect />} />,
    <Route key="*" path="*" element={<ModuleHomeRedirect />} />,
];

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/app-select" element={<AppSelectPage />} />
      <Route
        path="*"
        element={(
          <ProtectedRoute>
            <Layout>
              <WorkspacePageCache routes={PROTECTED_ROUTES} />
            </Layout>
          </ProtectedRoute>
        )}
      />
    </Routes>
  );
};

export default AppRoutes;