/**
 * API Endpoints configuration for HRMS.
 * Centralized endpoint definitions for all API calls.
 */

const API_BASE = '';  // axiosInstance already has baseURL

const endpoints = {
  // Authentication
  auth: {
    login: `${API_BASE}/auth/login/`,
    logout: `${API_BASE}/auth/logout/`,
    me: `${API_BASE}/auth/me/`,
  },

  // Companies
  companies: {
    list: `${API_BASE}/companies/`,
    detail: (id) => `${API_BASE}/companies/${id}/`,
    current: `${API_BASE}/companies/current/`,
    switch: `${API_BASE}/companies/switch/`,
  },

  // Languages
  languages: {
    list: `${API_BASE}/languages/`,
    current: `${API_BASE}/languages/current/`,
    switch: `${API_BASE}/languages/switch/`,
  },

  // Audit Logs
  auditLogs: `${API_BASE}/audit-logs/`,

  // Future HR module endpoints (placeholder)
  employees: {
    list: `${API_BASE}/employees/`,
    detail: (id) => `${API_BASE}/employees/${id}/`,
  },
  documents: {
    list: `${API_BASE}/documents/`,
    detail: (id) => `${API_BASE}/documents/${id}/`,
  },
  leaves: {
    list: `${API_BASE}/leaves/`,
    detail: (id) => `${API_BASE}/leaves/${id}/`,
  },
  attendance: {
    list: `${API_BASE}/attendance/`,
    detail: (id) => `${API_BASE}/attendance/${id}/`,
  },
  payroll: {
    list: `${API_BASE}/payroll/`,
    detail: (id) => `${API_BASE}/payroll/${id}/`,
  },
  orgchart: `${API_BASE}/orgchart/`,
  settings: `${API_BASE}/settings/`,
};

export default endpoints;