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

      {/* Protected routes with layout */}
      <Route path="/dashboard" element={<ProtectedLayout><DashboardPage /></ProtectedLayout>} />
      <Route path="/search" element={<ProtectedLayout><AdvancedSearchPage /></ProtectedLayout>} />
      <Route path="/phonebook" element={<ProtectedLayout><PhonebookPage /></ProtectedLayout>} />
      {/* /reports moved into dashboard (ReportsPage embedded). Kept as a redirect for
          backward-compatible bookmarks/old links. */}
      <Route path="/reports" element={<Navigate to="/dashboard" replace />} />
      <Route path="/payslips" element={<ProtectedLayout><ComingSoonPage /></ProtectedLayout>} />
      <Route path="/finance-reports" element={<ProtectedLayout><ComingSoonPage /></ProtectedLayout>} />
      <Route path="/org-chart" element={<ProtectedLayout><OrgChartPage /></ProtectedLayout>} />
      <Route path="/definitions" element={<ProtectedLayout><DefinitionsPage /></ProtectedLayout>} />
      <Route path="/data-entry" element={<ProtectedLayout><DataEntryPage /></ProtectedLayout>} />
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
      <Route path="/leaves" element={<ProtectedLayout><ComingSoonPage /></ProtectedLayout>} />
      <Route path="/requests" element={<ProtectedLayout><ComingSoonPage /></ProtectedLayout>} />
      <Route path="/benefits" element={<ProtectedLayout><ComingSoonPage /></ProtectedLayout>} />
      <Route path="/contracts" element={<ProtectedLayout><ComingSoonPage /></ProtectedLayout>} />
      <Route path="/documents" element={<ProtectedLayout><CompanyDocumentsPage /></ProtectedLayout>} />
      <Route path="/users" element={<ProtectedLayout><ComingSoonPage /></ProtectedLayout>} />
      <Route path="/audit" element={<ProtectedLayout><ComingSoonPage /></ProtectedLayout>} />

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default AppRoutes;