import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Dialog, DialogContent, DialogTitle, IconButton, Tooltip, Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined';
import FolderSharedOutlinedIcon from '@mui/icons-material/FolderSharedOutlined';
import MoveToInboxOutlinedIcon from '@mui/icons-material/MoveToInboxOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import ContactPhoneOutlinedIcon from '@mui/icons-material/ContactPhoneOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useModulePalette } from '../../context/ModulePaletteContext';
import { ChatPanel } from '../../../pages/chat/ChatPage';
import { PlanningPanel } from '../../../pages/planning/PlanningPage';
import OrganizationalDocumentsPanel from '../../../pages/documents/OrganizationalDocumentsPanel';
import CorrespondenceWorkdeskPage from '../../../pages/correspondence/CorrespondenceWorkdeskPage';
import SettingsWorkspacePanel from './SettingsWorkspacePanel';
import NotificationsPanel from './NotificationsPanel';
import PhonebookPanel from '../../../pages/PhonebookPanel';

/**
 * «پنجرهٔ کاری» شناور: چت و برنامه‌ریزی روی هر صفحه‌ای بدون ترک آن صفحه باز می‌شوند.
 *
 * ناوبری صفحه را عوض نمی‌کند؛ فقط یک دیالوگ بزرگ روی همان صفحه باز می‌کند و با بستن
 * آن، کاربر دقیقاً همان‌جایی است که کار می‌کرد. مسیرهای `/chat` و `/planning` هم
 * همچنان به‌عنوان صفحهٔ کامل (deep link) کار می‌کنند.
 */
const WorkspaceDockContext = createContext(null);

export const useWorkspaceDock = () => useContext(WorkspaceDockContext) || {
  chatOpen: false,
  planningOpen: false,
  documentsOpen: false,
  openChat: () => {},
  closeChat: () => {},
  openPlanning: () => {},
  closePlanning: () => {},
  openDocuments: () => {},
  closeDocuments: () => {},
  openWorkdesk: () => {},
  closeWorkdesk: () => {},
  openSettings: () => {},
  closeSettings: () => {},
  openNotifications: () => {},
  closeNotifications: () => {},
  openPhonebook: () => {},
  closePhonebook: () => {},
};

const PANEL_META = {
  chat: {
    title: 'گفتگوی سازمانی',
    subtitle: 'پیام‌ها رمزنگاری‌شده‌اند؛ فقط اعضای هر گفتگو آن را می‌بینند',
    icon: ChatBubbleOutlineIcon,
    accent: '#0ea5e9',
    route: '/chat',
  },
  planning: {
    title: 'برنامه‌ریزی شخصی',
    subtitle: 'یادداشت‌ها و وظایف؛ قابل اشتراک با همکاران',
    icon: TaskAltOutlinedIcon,
    accent: '#6366f1',
    route: '/planning',
  },
  documents: {
    title: 'اسناد سازمانی',
    subtitle: 'پوشه‌بندی مدارک و مستندات شرکت',
    icon: FolderSharedOutlinedIcon,
    accent: '#2563eb',
    route: '/document-management/library?module=organization',
  },
  workdesk: {
    title: 'کارتابل من',
    subtitle: 'ارجاعات و درخواست‌های در انتظار اقدام',
    icon: MoveToInboxOutlinedIcon,
    accent: '#0f766e',
    route: '/my-workdesk',
  },
  settings: {
    title: 'تنظیمات',
    subtitle: 'تنظیمات عمومی و ماژول‌های در دسترس شما',
    icon: SettingsOutlinedIcon,
    accent: '#64748b',
    route: '/settings',
  },
  notifications: {
    title: 'اعلان‌ها',
    subtitle: 'درخواست‌ها، پیام‌ها و هشدارهای سازمانی',
    icon: NotificationsActiveIcon,
    accent: '#6366f1',
    route: null,
  },
  phonebook: {
    title: 'دفترچه تلفن',
    subtitle: 'شماره تماس طرف حساب‌های قرارداد و تأمین‌کنندگان خرید',
    icon: ContactPhoneOutlinedIcon,
    accent: '#7c3aed',
    route: null,
  },
};

export const WorkspaceDockProvider = ({ children }) => {
  const navigate = useNavigate();
  const { getPalette } = useModulePalette();
  const [chatState, setChatState] = useState({ open: false, conversation: '' });
  const [planningState, setPlanningState] = useState({ open: false, tab: 0 });
  const [documentsState, setDocumentsState] = useState({ open: false });
  const [workdeskState, setWorkdeskState] = useState({ open: false });
  const [settingsState, setSettingsState] = useState({ open: false });
  const [notificationsState, setNotificationsState] = useState({ open: false });
  const [phonebookState, setPhonebookState] = useState({ open: false });

  const openChat = useCallback((conversation = '') => {
    setChatState({ open: true, conversation: conversation ? String(conversation) : '' });
  }, []);
  const closeChat = useCallback(() => setChatState((previous) => ({ ...previous, open: false })), []);
  const openPlanning = useCallback((tab = 0) => {
    setPlanningState({ open: true, tab: Number(tab) || 0 });
  }, []);
  const closePlanning = useCallback(
    () => setPlanningState((previous) => ({ ...previous, open: false })),
    [],
  );
  const openDocuments = useCallback(() => setDocumentsState({ open: true }), []);
  const closeDocuments = useCallback(
    () => setDocumentsState((previous) => ({ ...previous, open: false })),
    [],
  );
  const openWorkdesk = useCallback(() => setWorkdeskState({ open: true }), []);
  const closeWorkdesk = useCallback(
    () => setWorkdeskState((previous) => ({ ...previous, open: false })), [],
  );
  const openSettings = useCallback(() => setSettingsState({ open: true }), []);
  const closeSettings = useCallback(
    () => setSettingsState((previous) => ({ ...previous, open: false })), [],
  );
  const openNotifications = useCallback(() => setNotificationsState({ open: true }), []);
  const closeNotifications = useCallback(
    () => setNotificationsState((previous) => ({ ...previous, open: false })), [],
  );
  const openPhonebook = useCallback(() => setPhonebookState({ open: true }), []);
  const closePhonebook = useCallback(
    () => setPhonebookState((previous) => ({ ...previous, open: false })), [],
  );

  const value = useMemo(() => ({
    chatOpen: chatState.open,
    planningOpen: planningState.open,
    documentsOpen: documentsState.open,
    workdeskOpen: workdeskState.open,
    settingsOpen: settingsState.open,
    notificationsOpen: notificationsState.open,
    phonebookOpen: phonebookState.open,
    openChat,
    closeChat,
    openPlanning,
    closePlanning,
    openDocuments,
    closeDocuments,
    openWorkdesk,
    closeWorkdesk,
    openSettings,
    closeSettings,
    openNotifications,
    closeNotifications,
    openPhonebook,
    closePhonebook,
  }), [
    chatState.open, planningState.open, documentsState.open, workdeskState.open,
    settingsState.open, notificationsState.open, phonebookState.open,
    openChat, closeChat, openPlanning, closePlanning, openDocuments, closeDocuments,
    openWorkdesk, closeWorkdesk, openSettings, closeSettings, openNotifications, closeNotifications,
    openPhonebook, closePhonebook,
  ]);

  const goFullPage = (kind) => {
    if (kind === 'chat') closeChat();
    else if (kind === 'planning') closePlanning();
    else if (kind === 'documents') closeDocuments();
    else if (kind === 'workdesk') closeWorkdesk();
    else if (kind === 'settings') closeSettings();
    else closeNotifications();
    navigate(PANEL_META[kind].route);
  };

  const renderShell = (kind, open, onClose, children) => {
    const meta = PANEL_META[kind];
    const Icon = meta.icon;
    const accent = getPalette(kind)?.accent || meta.accent;
    return (
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="xl"
        fullWidth
        keepMounted={false}
        PaperProps={{
          sx: {
            height: '92vh', maxHeight: '92vh', width: 'calc(100vw - 40px)', maxWidth: '1700px',
            m: 2, borderRadius: '18px', overflow: 'hidden',
            border: '1px solid', borderColor: 'divider',
            boxShadow: 'var(--hrms-shadow-dialog, 0 24px 60px rgba(15,23,42,0.25))',
          },
        }}
        sx={{ '& .MuiDialog-container': { alignItems: 'center' } }}
      >
        <DialogTitle sx={{
          px: 1.75, py: 1.1, borderBottom: '1px solid', borderColor: 'divider',
          display: 'flex', alignItems: 'center', gap: 1, minWidth: 0,
        }}>
          <Box sx={{
            width: 32, height: 32, borderRadius: '10px', display: 'grid', placeItems: 'center',
            bgcolor: alpha(accent, 0.12), color: accent, flexShrink: 0,
          }}>
            <Icon sx={{ fontSize: 18 }} />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography noWrap sx={{ fontSize: 13, fontWeight: 900 }}>{meta.title}</Typography>
            <Typography noWrap sx={{ fontSize: 10, color: 'text.secondary' }}>{meta.subtitle}</Typography>
          </Box>
          {meta.route ? (
            <Tooltip title="باز کردن در صفحهٔ کامل">
              <IconButton size="small" aria-label={`باز کردن ${meta.title} در صفحهٔ کامل`}
                onClick={() => goFullPage(kind)}>
                <OpenInNewIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          ) : null}
          <Tooltip title="بستن">
            <IconButton size="small" aria-label={`بستن ${meta.title}`} onClick={onClose}>
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </DialogTitle>
        <DialogContent sx={{ p: 0, overflow: 'hidden', display: 'flex', minHeight: 0, minWidth: 0 }}>
          <Box sx={{
            flex: 1, minHeight: 0, minWidth: 0, display: 'flex',
            flexDirection: 'column', overflowY: 'auto', overflowX: 'hidden', p: 1.25,
          }}>
            {children}
          </Box>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <WorkspaceDockContext.Provider value={value}>
      {children}
      {renderShell('chat', chatState.open, closeChat, chatState.open ? (
        <ChatPanel
          embedded
          syncUrl={false}
          height="calc(92vh - 150px)"
          initialConversationId={chatState.conversation}
        />
      ) : null)}
      {renderShell('planning', planningState.open, closePlanning, planningState.open ? (
        <PlanningPanel embedded initialTab={planningState.tab} />
      ) : null)}
      {renderShell('documents', documentsState.open, closeDocuments, documentsState.open ? (
        <OrganizationalDocumentsPanel />
      ) : null)}
      {renderShell('workdesk', workdeskState.open, closeWorkdesk, workdeskState.open ? (
        <CorrespondenceWorkdeskPage />
      ) : null)}
      {renderShell('settings', settingsState.open, closeSettings, settingsState.open ? (
        <SettingsWorkspacePanel onNavigate={(path) => { closeSettings(); navigate(path); }} />
      ) : null)}
      {renderShell('notifications', notificationsState.open, closeNotifications, notificationsState.open ? (
        <NotificationsPanel onClose={closeNotifications} onOpenChat={openChat} onOpenPlanning={openPlanning} />
      ) : null)}
      {renderShell('phonebook', phonebookState.open, closePhonebook, phonebookState.open ? (
        <PhonebookPanel />
      ) : null)}
    </WorkspaceDockContext.Provider>
  );
};

export default WorkspaceDockProvider;
