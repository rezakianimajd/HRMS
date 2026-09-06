import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Tabs, Tab, Avatar, Chip, FormControl, InputLabel,
  Select, MenuItem, CircularProgress, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Alert, Stack, IconButton, Tooltip,
} from '@mui/material';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import HistoryIcon from '@mui/icons-material/History';
import { formatPersianNumber } from '../core/utils/numberUtils';

const ROLE_COLORS = {
  super_admin: '#7c3aed',
  hr_manager: '#2563eb',
  hr_specialist: '#0ea5e9',
  department_head: '#f59e0b',
  employee: '#64748b',
};
const ROLES = Object.keys(ROLE_COLORS);

/* P5: Users & Roles + Audit log — single workspace */
const UsersPage = ({ initialTab = 0 }) => {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState(initialTab);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const { data: users, isLoading } = useQuery({
    queryKey: ['core-users'],
    queryFn: () => axiosInstance.get('/users/').then(r => r.data),
  });
  const { data: logs, isLoading: auditLoading } = useQuery({
    queryKey: ['core-audit'],
    queryFn: () => axiosInstance.get('/audit-logs/').then(r => r.data),
  });
  const list = Array.isArray(users) ? users : [];
  const audit = Array.isArray(logs) ? logs : [];

  const roleMutation = useMutation({
    mutationFn: ({ id, role }) => axiosInstance.post(`/users/${id}/role/`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['core-users'] });
      setMsg('نقش کاربر بهروزرسانی شد.');
      setTimeout(() => setMsg(''), 2500);
    },
    onError: (e) => setErr(e.response?.data?.error || 'خطا در تغییر نقش'),
  });

  return (
    <Box>
      <Paper sx={{
        p: 3, mb: 2.5, borderRadius: 3,
        background: 'linear-gradient(120deg, rgba(100,116,139,0.10), rgba(100,116,139,0.02), rgba(255,255,255,0.3))',
        border: '1px solid rgba(100,116,139,0.18)',
        display: 'flex', alignItems: 'center', gap: 2,
      }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #64748b, #475569)', boxShadow: '0 8px 24px rgba(100,116,139,0.35)' }}>
          <AdminPanelSettingsIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box>
          <Typography variant="h6" fontWeight={800}>کاربران، نقشها و فعالیتها</Typography>
          <Typography variant="body2" color="textSecondary">مدیریت نقش دسترسی کاربران و پیگیری دفترچه فعالیت</Typography>
        </Box>
      </Paper>

      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tab icon={<AdminPanelSettingsIcon />} iconPosition="start" label="کاربران و نقشها" />
        <Tab icon={<HistoryIcon />} iconPosition="start" label="دفترچه فعالیت (Audit)" />
      </Tabs>

      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}
      {msg && <Alert severity="success" sx={{ mb: 2 }}>{msg}</Alert>}

      {tab === 0 && (
        <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
          {isLoading ? (
            <Box sx={{ p: 5, textAlign: 'center' }}><CircularProgress /></Box>
          ) : list.length === 0 ? (
            <Box sx={{ p: 5, textAlign: 'center' }}><Typography color="textSecondary">کاربری یافت نشد</Typography></Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'rgba(100,116,139,0.06)' }}>
                    <TableCell sx={{ fontWeight: 700 }}>کاربر</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>نام کاربری</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>ایمیل</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>سوپر یوزر</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>نقش</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {list.map(u => (
                    <TableRow key={u.id} hover>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: ROLE_COLORS[u.role] || '#64748b', fontSize: 14 }}>
                            {(u.first_name?.charAt(0) || u.username?.charAt(0) || 'U')}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>{u.first_name} {u.last_name}</Typography>
                            <Typography variant="caption" color="textSecondary">@{u.username}</Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>{u.username}</TableCell>
                      <TableCell>{u.email || '—'}</TableCell>
                      <TableCell>{u.is_superuser ? <Chip size="small" color="secondary" label="بله" /> : '—'}</TableCell>
                      <TableCell sx={{ minWidth: 180 }}>
                        <FormControl fullWidth size="small">
                          <InputLabel>نقش</InputLabel>
                          <Select
                            value={u.role}
                            label="نقش"
                            onChange={e => roleMutation.mutate({ id: u.id, role: e.target.value })}
                          >
                            {ROLES.map(r => (
                              <MenuItem key={r} value={r}>
                                {/* minimal label map */}
                                {r === 'super_admin' ? 'مدیر ارشد سیستم' :
                                 r === 'hr_manager' ? 'مدیر منابع انسانی' :
                                 r === 'hr_specialist' ? 'کارشناس منابع انسانی' :
                                 r === 'department_head' ? 'مدیر دپارتمان' : 'کارمند'}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {tab === 1 && (
        <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
          {auditLoading ? (
            <Box sx={{ p: 5, textAlign: 'center' }}><CircularProgress /></Box>
          ) : audit.length === 0 ? (
            <Box sx={{ p: 5, textAlign: 'center' }}><Typography color="textSecondary">فعالیتی ثبت نشده است</Typography></Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'rgba(100,116,139,0.06)' }}>
                    <TableCell sx={{ fontWeight: 700 }}>کاربر</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>اقدام</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>مدل</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>شرح</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>تاریخ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {audit.map((l, i) => (
                    <TableRow key={l.id || i} hover>
                      <TableCell>{l.user || '—'}</TableCell>
                      <TableCell><Chip size="small" label={l.action || '—'} variant="outlined" /></TableCell>
                      <TableCell>{l.model_name || '—'}</TableCell>
                      <TableCell sx={{ maxWidth: 280 }}>
                        <Typography variant="body2" noWrap>{l.description || ''}</Typography>
                      </TableCell>
                      <TableCell>{l.timestamp ? String(l.timestamp).slice(0, 16) : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default UsersPage;