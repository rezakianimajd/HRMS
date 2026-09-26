import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import useAuth from './core/hooks/useAuth';
import Layout from './core/components/ui/Layout';
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
import FinanceReportsPage from './pages/FinanceReportsPage';
import BenefitsPage from './pages/BenefitsPage';
import DeductionsPage from './pages/DeductionsPage';
import UsersPage from './pages/UsersPage';
import AuditPage from './pages/AuditPage';
import DataImportPage from './pages/DataImportPage';
import AppearancePage from './pages/AppearancePage';
import CompanyDocumentsPage from './pages/CompanyDocumentsPage';
import OrgChartPage from './pages/OrgChartPage';
import DefinitionsPage from './pages/DefinitionsPage';
import DataEntryPage from './pages/DataEntryPage';
import CorrespondencesPage from './pages/CorrespondencesPage';
import AssistantPage from './pages/AssistantPage';
import ScoringPage from './pages/ScoringPage';
import Settings from './modules/settings/Settings';
import SupplementaryInsurancePage from './pages/SupplementaryInsurancePage';
import LoansPage from './pages/LoansPage';
import CalendarPage from './pages/CalendarPage';
import AssetsPage from './pages/AssetsPage';
import LifecyclePage from './pages/LifecyclePage';
import ContractsPage from './pages/ContractsPage';
import ManagementAnalyticsPage from './pages/ManagementAnalyticsPage';
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
import ProjectsPage from './pages/ProjectsPage';
import PriceListPage from './pages/PriceListPage';
import CommercialPage from './pages/CommercialPage';
import CostDashboardPage from './pages/CostDashboardPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ContractFinancePage from './pages/ContractFinancePage';
import ContractDocumentsPage from './pages/ContractDocumentsPage';
import ContractRiskPage from './pages/ContractRiskPage';
import ContractSettingsPage from './pages/ContractSettingsPage';
import { ContractInvoicesPage, ContractPaymentsPage, ContractAddendumsPage } from './pages/contracts/contractSubPages';
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
import AccountingPage from './pages/AccountingPage';
import AccountingDocumentsPage from './pages/AccountingDocumentsPage';
import AccountingDocumentNewPage from './pages/AccountingDocumentNewPage';
import AccountingIntegrationPage from './pages/AccountingIntegrationPage';
import AccountingReportsPage from './pages/AccountingReportsPage';
import AccountingSettingsPage from './pages/AccountingSettingsPage';
import MatrixReportPage from './pages/accounting/reports/MatrixReportPage';
import TreeTrialBalancePage from './pages/accounting/reports/TreeTrialBalancePage';
import LedgerReviewPage from './pages/accounting/reports/LedgerReviewPage';
import BalanceSheetPage from './pages/accounting/reports/BalanceSheetPage';
import IncomeStatementPage from './pages/accounting/reports/IncomeStatementPage';
import CashFlowPage from './pages/accounting/reports/CashFlowPage';
import FinancialStatementsPage from './pages/accounting/reports/FinancialStatementsPage';
import AccountingFiscalPage from './pages/AccountingFiscalPage';
import AccountingSequencesPage from './pages/AccountingSequencesPage';
import AccountingReconciliationPage from './pages/AccountingReconciliationPage';
import AccountingApprovalPolicyPage from './pages/AccountingApprovalPolicyPage';
import AccountingDocumentSearchPage from './pages/AccountingDocumentSearchPage';
import AccountingFinalizePage from './pages/AccountingFinalizePage';
import AccountingControlPage from './pages/AccountingControlPage';
import AccountingCodingsPage from './pages/AccountingCodingsPage';
import AccountGroupsPage from './pages/AccountGroupsPage';
import AccountsClassicPage from './pages/AccountsClassicPage';
import AuxiliaryAccountsPage from './pages/AuxiliaryAccountsPage';

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
 * Protected layout route - wraps content with Layout component.
 */
const ProtectedLayout = ({ children }) => (
  <ProtectedRoute>
    <Layout>{children}</Layout>
  </ProtectedRoute>
);

/**
 * Application routes configuration.
 */
const AppRoutes = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/app-select" element={<AppSelectPage />} />
      <Route path="/coming-soon" element={<ProtectedLayout><ComingSoonPage /></ProtectedLayout>} />

      {/* Protected routes with layout */}
      <Route path="/dashboard" element={<ProtectedLayout><DashboardPage /></ProtectedLayout>} />
      <Route path="/search" element={<ProtectedLayout><AdvancedSearchPage /></ProtectedLayout>} />
      <Route path="/phonebook" element={<ProtectedLayout><PhonebookPage /></ProtectedLayout>} />
      {/* /reports moved into dashboard (ReportsPage embedded). Kept as a redirect for
          backward-compatible bookmarks/old links. */}
      <Route path="/reports" element={<Navigate to="/dashboard" replace />} />
      <Route path="/payslips" element={<ProtectedLayout><PayslipsPage /></ProtectedLayout>} />
      <Route path="/finance-reports" element={<ProtectedLayout><FinanceReportsPage /></ProtectedLayout>} />
      <Route path="/org-chart" element={<ProtectedLayout><OrgChartPage /></ProtectedLayout>} />
      <Route path="/definitions" element={<ProtectedLayout><DefinitionsPage /></ProtectedLayout>} />
      <Route path="/company-profile" element={<ProtectedLayout><CompanyProfilePage /></ProtectedLayout>} />
      <Route path="/data-entry" element={<Navigate to="/payslips" replace />} />
      <Route path="/correspondences" element={<ProtectedLayout><CorrespondencesPage /></ProtectedLayout>} />
      <Route path="/assistant" element={<ProtectedLayout><AssistantPage /></ProtectedLayout>} />
      <Route path="/scoring" element={<ProtectedLayout><ScoringPage /></ProtectedLayout>} />
      <Route path="/employees" element={<ProtectedLayout><EmployeeListPage /></ProtectedLayout>} />
      <Route path="/employees/new" element={<ProtectedLayout><EmployeeForm /></ProtectedLayout>} />
      <Route path="/employees/:id" element={<ProtectedLayout><EmployeeProfilePage /></ProtectedLayout>} />
      <Route path="/employees/:id/edit" element={<ProtectedLayout><EmployeeForm /></ProtectedLayout>} />
      <Route path="/orgchart/*" element={<ProtectedLayout><OrgChartPage /></ProtectedLayout>} />
      <Route path="/settings/*" element={<ProtectedLayout><Settings /></ProtectedLayout>} />

      {/* Under-development modules (professional placeholders until shipped) */}
      {/* legacy routes removed - import cleanup */}
      <Route path="/insurance" element={<ProtectedLayout><SupplementaryInsurancePage /></ProtectedLayout>} />
      <Route path="/loans" element={<ProtectedLayout><LoansPage /></ProtectedLayout>} />
      <Route path="/attendance" element={<ProtectedLayout><AttendancePage /></ProtectedLayout>} />
      <Route path="/leaves" element={<ProtectedLayout><LeavePage /></ProtectedLayout>} />
      <Route path="/requests" element={<ProtectedLayout><RequestsPage /></ProtectedLayout>} />
      <Route path="/calendar" element={<ProtectedLayout><CalendarPage /></ProtectedLayout>} />
      <Route path="/assets" element={<ProtectedLayout><AssetsPage /></ProtectedLayout>} />
      <Route path="/lifecycle" element={<ProtectedLayout><LifecyclePage /></ProtectedLayout>} />
      <Route path="/benefits" element={<ProtectedLayout><BenefitsPage /></ProtectedLayout>} />
      <Route path="/benefit-payments" element={<ProtectedLayout><BenefitPaymentPage /></ProtectedLayout>} />
      <Route path="/petty-cash/custodians" element={<ProtectedLayout><PettyCashCustodiansPage /></ProtectedLayout>} />
      <Route path="/petty-cash/policies" element={<ProtectedLayout><PettyCashPolicyPage /></ProtectedLayout>} />
      <Route path="/petty-cash/ledger" element={<ProtectedLayout><PettyCashLedgerPage /></ProtectedLayout>} />
      <Route path="/petty-cash/calendar" element={<ProtectedLayout><PettyCashCalendarPage /></ProtectedLayout>} />
      <Route path="/petty-cash/expenses" element={<ProtectedLayout><PettyCashExpensesPage /></ProtectedLayout>} />
      <Route path="/petty-cash/expenses/new" element={<ProtectedLayout><PettyCashExpenseNewPage /></ProtectedLayout>} />
      <Route path="/petty-cash/:tab" element={<ProtectedLayout><PettyCashPage /></ProtectedLayout>} />
      <Route path="/petty-cash" element={<ProtectedLayout><PettyCashPage /></ProtectedLayout>} />
      <Route path="/accounting/documents" element={<ProtectedLayout><AccountingDocumentsPage /></ProtectedLayout>} />
      <Route path="/accounting/documents/new" element={<ProtectedLayout><AccountingDocumentNewPage /></ProtectedLayout>} />
      <Route path="/accounting/documents/:id/edit" element={<ProtectedLayout><AccountingDocumentNewPage /></ProtectedLayout>} />
      <Route path="/accounting/integration" element={<ProtectedLayout><AccountingIntegrationPage /></ProtectedLayout>} />
      <Route path="/accounting/reports" element={<ProtectedLayout><AccountingReportsPage /></ProtectedLayout>} />
      <Route path="/accounting/reports/matrix" element={<ProtectedLayout><MatrixReportPage /></ProtectedLayout>} />
      <Route path="/accounting/reports/tree-trial-balance" element={<ProtectedLayout><TreeTrialBalancePage /></ProtectedLayout>} />
      <Route path="/accounting/reports/ledger-review" element={<ProtectedLayout><LedgerReviewPage /></ProtectedLayout>} />
      <Route path="/accounting/reports/balance-sheet" element={<ProtectedLayout><BalanceSheetPage /></ProtectedLayout>} />
      <Route path="/accounting/reports/income-statement" element={<ProtectedLayout><IncomeStatementPage /></ProtectedLayout>} />
      <Route path="/accounting/reports/cash-flow" element={<ProtectedLayout><CashFlowPage /></ProtectedLayout>} />
      <Route path="/accounting/reports/financial-statements" element={<ProtectedLayout><FinancialStatementsPage /></ProtectedLayout>} />
      <Route path="/accounting/settings" element={<ProtectedLayout><AccountingSettingsPage /></ProtectedLayout>} />
      <Route path="/accounting/fiscal" element={<ProtectedLayout><AccountingFiscalPage /></ProtectedLayout>} />
      <Route path="/accounting/sequences" element={<ProtectedLayout><AccountingSequencesPage /></ProtectedLayout>} />
      <Route path="/accounting/reconciliation" element={<ProtectedLayout><AccountingReconciliationPage /></ProtectedLayout>} />
      <Route path="/accounting/approval-policies" element={<ProtectedLayout><AccountingApprovalPolicyPage /></ProtectedLayout>} />
      <Route path="/accounting/documents/search" element={<ProtectedLayout><AccountingDocumentSearchPage /></ProtectedLayout>} />
      <Route path="/accounting/documents/finalize" element={<ProtectedLayout><AccountingFinalizePage /></ProtectedLayout>} />
      <Route path="/accounting/documents/control" element={<ProtectedLayout><AccountingControlPage /></ProtectedLayout>} />
      <Route path="/accounting/codings/:kind" element={<ProtectedLayout><AccountingCodingsPage /></ProtectedLayout>} />
      <Route path="/accounting/groups" element={<ProtectedLayout><AccountGroupsPage /></ProtectedLayout>} />
      <Route path="/accounting/accounts/:kind" element={<ProtectedLayout><AccountsClassicPage /></ProtectedLayout>} />
      <Route path="/accounting/auxiliary" element={<ProtectedLayout><AuxiliaryAccountsPage /></ProtectedLayout>} />
      <Route path="/accounting/*" element={<ProtectedLayout><AccountingPage /></ProtectedLayout>} />
      <Route path="/deductions" element={<ProtectedLayout><DeductionsPage /></ProtectedLayout>} />
      <Route path="/contracts" element={<ProtectedLayout><ContractsPage /></ProtectedLayout>} />
      <Route path="/contracts-dashboard" element={<ProtectedLayout><ContractsDashboardPage /></ProtectedLayout>} />
      <Route path="/external-contracts" element={<ProtectedLayout><ExternalContractsPage /></ProtectedLayout>} />
      <Route path="/contract-parties" element={<ProtectedLayout><ContractPartiesPage /></ProtectedLayout>} />
      <Route path="/contracts/new" element={<ProtectedLayout><ContractNewPage /></ProtectedLayout>} />
      <Route path="/contracts/:id/edit" element={<ProtectedLayout><ContractNewPage /></ProtectedLayout>} />
      <Route path="/external-contracts/:id" element={<ProtectedLayout><ContractProfilePage /></ProtectedLayout>} />
      <Route path="/contracts-guarantees" element={<ProtectedLayout><GuaranteesPage /></ProtectedLayout>} />
      <Route path="/contracts-finance" element={<ProtectedLayout><ContractFinancePage /></ProtectedLayout>} />
      <Route path="/contracts-invoices" element={<ProtectedLayout><ContractInvoicesPage /></ProtectedLayout>} />
      <Route path="/contracts-statements" element={<ProtectedLayout><StatementEditorPage /></ProtectedLayout>} />
      <Route path="/contracts-payments" element={<ProtectedLayout><ContractPaymentsPage /></ProtectedLayout>} />
      <Route path="/contracts-addendums" element={<ProtectedLayout><ContractAddendumsPage /></ProtectedLayout>} />
      <Route path="/contracts-documents" element={<ProtectedLayout><ContractDocumentsPage /></ProtectedLayout>} />
      <Route path="/contracts-risk" element={<ProtectedLayout><ContractRiskPage /></ProtectedLayout>} />
      <Route path="/contracts-settings" element={<ProtectedLayout><ContractSettingsPage /></ProtectedLayout>} />
      <Route path="/contracts-definitions" element={<ProtectedLayout><ContractDefinitionsPage /></ProtectedLayout>} />
      <Route path="/projects" element={<ProtectedLayout><ProjectsPage /></ProtectedLayout>} />
      <Route path="/projects/price-lists" element={<ProtectedLayout><PriceListPage /></ProtectedLayout>} />
      <Route path="/projects/commercial" element={<ProtectedLayout><CommercialPage /></ProtectedLayout>} />
      <Route path="/projects/cost" element={<ProtectedLayout><CostDashboardPage /></ProtectedLayout>} />
      <Route path="/projects/reports" element={<ProtectedLayout><AnalyticsPage /></ProtectedLayout>} />
      <Route path="/management-analytics" element={<ProtectedLayout><ManagementAnalyticsPage /></ProtectedLayout>} />
      <Route path="/bale-messaging" element={<ProtectedLayout><BaleMessagingPage /></ProtectedLayout>} />
      <Route path="/recruitment" element={<ProtectedLayout><RecruitmentPage /></ProtectedLayout>} />
      <Route path="/appraisal" element={<ProtectedLayout><AppraisalPage /></ProtectedLayout>} />
      <Route path="/documents" element={<ProtectedLayout><CompanyDocumentsPage /></ProtectedLayout>} />
      <Route path="/users" element={<ProtectedLayout><UsersPage /></ProtectedLayout>} />
      <Route path="/audit" element={<ProtectedLayout><AuditPage /></ProtectedLayout>} />
      <Route path="/data-import" element={<ProtectedLayout><DataImportPage /></ProtectedLayout>} />
      <Route path="/appearance" element={<ProtectedLayout><AppearancePage /></ProtectedLayout>} />

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default AppRoutes;