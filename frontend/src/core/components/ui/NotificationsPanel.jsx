import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Box, Button, ButtonBase, Chip, CircularProgress, InputAdornment, Tab, Tabs,
  TextField, Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import SearchIcon from '@mui/icons-material/Search';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import { toJalali } from '../../utils/dateUtils';
import { toPersianDigits } from '../../utils/numberUtils';
import {
  useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications,
  useUnreadNotificationsCount,
} from '../../hooks/useNotifications';

const CATEGORY_LABELS = {
  leave_request: 'درخواست مرخصی', hr_request: 'درخواست اداری',
  contract_expiry: 'پایان قرارداد', document_expiry: 'انقضای مدرک',
  leave_balance: 'مانده مرخصی', chat_message: 'پیام چت',
  chat_mention: 'منشن در چت', chat_member_added: 'افزودن به گفتگو',
  planning_share: 'اشتراک‌گذاری', planning_due: 'سررسید وظیفه',
};

const CATEGORY_COLORS = {
  leave_request: '#f59e0b', hr_request: '#6366f1', contract_expiry: '#ef4444',
  document_expiry: '#3b82f6', leave_balance: '#10b981', chat_message: '#0ea5e9',
  chat_mention: '#8b5cf6', chat_member_added: '#14b8a6',
  planning_share: '#6366f1', planning_due: '#f97316',
};

const TABS = [
  { key: 'all', label: 'همه' },
  { key: 'unread', label: 'خوانده‌نشده' },
  { key: 'requests', label: 'درخواست‌ها' },
  { key: 'messages', label: 'پیام‌ها' },
];

const categoryOf = (row) => CATEGORY_LABELS[row?.category] || row?.category_display || 'اعلان';
const colorOf = (row) => CATEGORY_COLORS[row?.category] || '#6366f1';

const NotificationsPanel = ({ onClose, onOpenChat, onOpenPlanning }) => {
  const navigate = useNavigate();
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const { data: notifications = [], isLoading } = useNotifications(50);
  const { data: unread = 0 } = useUnreadNotificationsCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const rows = Array.isArray(notifications) ? notifications : [];

  const filtered = useMemo(() => rows.filter((row) => {
    if (tab === 'unread' && row.is_read) return false;
    if (tab === 'requests' && !['hr_request', 'leave_request', 'letter_request'].includes(row.category)) return false;
    if (tab === 'messages' && !['chat_message', 'chat_mention', 'planning_share', 'planning_due'].includes(row.category)) return false;
    const text = `${row.title || ''} ${row.body || ''} ${categoryOf(row)}`;
    return !search.trim() || text.toLowerCase().includes(search.trim().toLowerCase());
  }), [rows, tab, search]);

  const openNotification = (row) => {
    if (!row.is_read) markRead.mutate(row.id);
    if (row.entity_type === 'employee' && row.entity_id) navigate(`/employees/${row.entity_id}`);
    else if (row.entity_type === 'leave_request') navigate('/leaves');
    else if (row.entity_type === 'hr_request') navigate('/requests');
    else if (row.entity_type === 'letter_request') navigate('/correspondence/workdesk?tab=requests');
    else if (row.entity_type === 'document') navigate('/documents');
    else if (row.entity_type === 'chat_conversation' && row.entity_id) {
      onClose?.();
      onOpenChat?.(row.entity_id);
    } else if (row.entity_type === 'planning_note' || row.entity_type === 'planning_task') {
      onClose?.();
      onOpenPlanning?.(0);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.15, minHeight: 0 }}>
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1, p: 1.2, flexWrap: 'wrap',
        borderRadius: 'var(--hrms-radius-large, 16px)',
        border: 'var(--hrms-border-card, 1px solid #e8edf4)',
        bgcolor: 'var(--hrms-region-card-bg, #ffffff)',
      }}>
        <Box sx={{
          width: 34, height: 34, borderRadius: '10px', display: 'grid', placeItems: 'center',
          bgcolor: alpha('#6366f1', 0.1), color: '#6366f1',
        }}>
          <NotificationsActiveIcon sx={{ fontSize: 19 }} />
        </Box>
        <Box>
          <Typography sx={{ fontSize: 12.5, fontWeight: 900 }}>اعلان‌ها</Typography>
          <Typography sx={{ fontSize: 10, color: 'text.secondary', mt: 0.15 }}>
            {unread ? `${toPersianDigits(unread)} اعلان خوانده‌نشده` : 'همهٔ اعلان‌ها خوانده شده‌اند'}
          </Typography>
        </Box>
        <Box sx={{ flex: 1 }} />
        <TextField
          size="small"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="جست‌وجو در اعلان‌ها…"
          sx={{ width: { xs: '100%', sm: 220 }, '& .MuiInputBase-root': { fontSize: 11, borderRadius: '9px' } }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16 }} /></InputAdornment>,
          }}
        />
        <Button size="small" startIcon={<DoneAllIcon />} disabled={!unread || markAllRead.isPending}
          onClick={() => markAllRead.mutate()}>
          خواندن همه
        </Button>
      </Box>

      <Tabs value={tab} onChange={(_event, value) => setTab(value)} variant="scrollable" scrollButtons="auto"
        sx={{ minHeight: 34, '& .MuiTab-root': { minHeight: 34, fontSize: 11, fontWeight: 800, py: 0.5 } }}>
        {TABS.map((item) => <Tab key={item.key} value={item.key} label={item.label} />)}
      </Tabs>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.65, minHeight: 0, overflowY: 'auto', pr: 0.2 }}>
        {isLoading ? (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress size={26} /></Box>
        ) : filtered.length ? filtered.map((row) => (
          <ButtonBase
            key={row.id}
            onClick={() => openNotification(row)}
            sx={{
              display: 'block', width: '100%', textAlign: 'right', borderRadius: '12px',
              p: 1.1, border: '1px solid',
              borderColor: row.is_read ? 'divider' : alpha(colorOf(row), 0.28),
              bgcolor: row.is_read ? 'transparent' : alpha(colorOf(row), 0.045),
              '&:hover': { borderColor: alpha(colorOf(row), 0.45), bgcolor: alpha(colorOf(row), 0.07) },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.85 }}>
              <Box sx={{
                width: 30, height: 30, borderRadius: '9px', display: 'grid', placeItems: 'center',
                bgcolor: alpha(colorOf(row), 0.1), color: colorOf(row), flexShrink: 0,
              }}>
                <MarkEmailReadIcon sx={{ fontSize: 16 }} />
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                  <Typography noWrap sx={{ fontSize: 11.8, fontWeight: row.is_read ? 700 : 900 }}>
                    {row.title}
                  </Typography>
                  <Box sx={{ flex: 1 }} />
                  {!row.is_read && <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: colorOf(row) }} />}
                  <Typography sx={{ fontSize: 9.5, color: 'text.disabled' }}>{toJalali(String(row.created_at).slice(0, 10))}</Typography>
                </Box>
                {row.body ? (
                  <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mt: 0.25, lineHeight: 1.7 }}>
                    {row.body}
                  </Typography>
                ) : null}
                <Chip size="small" label={categoryOf(row)} sx={{
                  mt: 0.55, height: 19, fontSize: 9.5, color: colorOf(row),
                  bgcolor: alpha(colorOf(row), 0.1),
                }} />
              </Box>
            </Box>
          </ButtonBase>
        )) : (
          <Alert severity="info" sx={{ borderRadius: '12px' }}>اعلانی با این فیلتر وجود ندارد.</Alert>
        )}
      </Box>
    </Box>
  );
};

export default NotificationsPanel;
