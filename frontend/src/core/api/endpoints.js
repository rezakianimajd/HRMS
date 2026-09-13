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
  globalSearch: `${API_BASE}/search/global/`,
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
  notifications: {
    list: `${API_BASE}/notifications/`,
    unreadCount: `${API_BASE}/notifications/unread_count/`,
    markAllRead: `${API_BASE}/notifications/mark_all_read/`,
    markRead: (id) => `${API_BASE}/notifications/${id}/mark_read/`,
    sync: `${API_BASE}/notifications/sync/`,
    testSend: `${API_BASE}/notifications/test-send/`,
    send: `${API_BASE}/notifications/send/`,
  },
  assets: {
    list: `${API_BASE}/assets/`,
    detail: (id) => `${API_BASE}/assets/${id}/`,
    return: (id) => `${API_BASE}/assets/${id}/return_asset/`,
  },
  lifecycleChecklists: {
    list: `${API_BASE}/lifecycle-checklists/`,
    detail: (id) => `${API_BASE}/lifecycle-checklists/${id}/`,
    toggleItem: (id) => `${API_BASE}/lifecycle-checklists/${id}/toggle_item/`,
  },
  checklistItems: {
    list: `${API_BASE}/checklist-items/`,
  },
  calendarEvents: {
    list: `${API_BASE}/calendar-events/`,
    detail: (id) => `${API_BASE}/calendar-events/${id}/`,
    feed: `${API_BASE}/calendar/feed/`,
  },
  baleContacts: {
    list: `${API_BASE}/bale-contacts/`,
    detail: (id) => `${API_BASE}/bale-contacts/${id}/`,
  },
  baleTemplates: {
    list: `${API_BASE}/bale-templates/`,
    detail: (id) => `${API_BASE}/bale-templates/${id}/`,
  },
  baleSendLogs: {
    list: `${API_BASE}/bale-send-logs/`,
  },
  signatories: {
    list: `${API_BASE}/signatories/`,
    detail: (id) => `${API_BASE}/signatories/${id}/`,
  },
  managementSettings: {
    profile: `${API_BASE}/settings/company-profile/`,
    updateProfile: `${API_BASE}/settings/company-profile/update/`,
  },
  projects: {
    list: `${API_BASE}/projects/`,
    detail: (id) => `${API_BASE}/projects/${id}/`,
    projectTypes: `${API_BASE}/project-types/`,
    phases: `${API_BASE}/project-phases/`,
    wbs: `${API_BASE}/wbs-nodes/`,
    wbsTree: (projectId) => `${API_BASE}/wbs-nodes/tree/?project=${projectId}`,
    cbs: `${API_BASE}/cbs-nodes/`,
    cbsTree: `${API_BASE}/cbs-nodes/tree/`,
    resourceCategories: `${API_BASE}/resource-categories/`,
    resources: `${API_BASE}/resources/`,
    costSources: `${API_BASE}/cost-sources/`,
    obs: `${API_BASE}/obs-nodes/`,
    obsTree: (projectId) => `${API_BASE}/obs-nodes/tree/?project=${projectId}`,
    priceLists: `${API_BASE}/price-lists/`,
    priceListVersions: `${API_BASE}/price-list-versions/`,
    priceListChapters: `${API_BASE}/price-list-chapters/`,
    priceListItems: `${API_BASE}/price-list-items/`,
    contractItems: `${API_BASE}/contract-items/`,
    contractWbs: `${API_BASE}/contract-wbs/`,
    contractPriceBases: `${API_BASE}/contract-price-bases/`,
  },
  baleSchedules: {
    list: `${API_BASE}/bale-schedules/`,
    detail: (id) => `${API_BASE}/bale-schedules/${id}/`,
    cancel: (id) => `${API_BASE}/bale-schedules/${id}/cancel/`,
    runNow: (id) => `${API_BASE}/bale-schedules/${id}/run_now/`,
  },
  baleAudience: {
    recipients: `${API_BASE}/notifications/bale-recipients/`,
    bulkSend: `${API_BASE}/notifications/bale-bulk-send/`,
    resendFailed: `${API_BASE}/notifications/bale-resend-failed/`,
    segments: `${API_BASE}/notifications/bale-segments/`,
    importContacts: `${API_BASE}/notifications/bale-contacts-import/`,
  },
};

export default endpoints;