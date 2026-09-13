import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Tabs, Tab, Avatar, Chip, FormControl, InputLabel,
  Select, MenuItem, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Alert, Stack, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, IconButton, Tooltip, CircularProgress, Switch,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SecurityIcon from '@mui/icons-material/Security';
import PersonIcon from '@mui/icons-material/Person';
import SaveIcon from '@mui/icons-material/Save';

const ROLE_LABELS = {
  super_admin: 'ظ…ط¯غŒط± ط§ط±ط´ط¯ ط³غŒط³طھظ…',
  hr_manager: 'ظ…ط¯غŒط± ظ…ظ†ط§ط¨ط¹ ط§ظ†ط³ط§ظ†غŒ',
  hr_specialist: 'ع©ط§ط±ط´ظ†ط§ط³ ظ…ظ†ط§ط¨ط¹ ط§ظ†ط³ط§ظ†غŒ',
  department_head: 'ظ…ط¯غŒط± ط¯ظ¾ط§ط±طھظ…ط§ظ†',
  employee: 'ع©ط§ط±ظ…ظ†ط¯',
};
const ROLE_COLORS = {
  super_admin: '#7c3aed',
  hr_manager: '#2563eb',
  hr_specialist: '#0ea5e9',
  department_head: '#f59e0b',
  employee: '#64748b',
};

const PERM_LABELS = {
  can_view_all_employees: 'ظ…ط´ط§ظ‡ط¯ظ‡ ظ‡ظ…ظ‡ ظ¾ط±ط³ظ†ظ„',
  can_add_employee: 'ط§ظپط²ظˆط¯ظ† ظ¾ط±ط³ظ†ظ„',
  can_change_employee: 'ظˆغŒط±ط§غŒط´ ظ¾ط±ط³ظ†ظ„',
  can_delete_employee: 'ط­ط°ظپ ظ¾ط±ط³ظ†ظ„',
  can_view_sensitive_data: 'ظ…ط´ط§ظ‡ط¯ظ‡ ط§ط·ظ„ط§ط¹ط§طھ ط­ط³ط§ط³',
  can_manage_documents: 'ظ…ط¯غŒط±غŒطھ ظ…ط¯ط§ط±ع©',
  can_delete_documents: 'ط­ط°ظپ ظ…ط¯ط§ط±ع©',
  can_approve_leaves: 'طھط£غŒغŒط¯ ظ…ط±ط®طµغŒ',
  can_edit_settings: 'ظˆغŒط±ط§غŒط´ طھظ†ط¸غŒظ…ط§طھ',
  can_manage_users: 'ظ…ط¯غŒط±غŒطھ ع©ط§ط±ط¨ط±ط§ظ†',
  can_manage_roles: 'ظ…ط¯غŒط±غŒطھ ظ†ظ‚ط´â€Œظ‡ط§',
  can_manage_companies: 'ظ…ط¯غŒط±غŒطھ ط´ط±ع©طھâ€Œظ‡ط§',
  can_view_audit_logs: 'ظ…ط´ط§ظ‡ط¯ظ‡ ظ„ط§ع¯ ظپط¹ط§ظ„غŒطھ',
};
const ROLE_KEYS = Object.keys(ROLE_LABELS);

const UsersPage = () => {
  const qc = useQueryClient();
  const [tab, setTab] = useState(0);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [openAdd, setOpenAdd] = useState(false);
  const [draft, setDraft] = useState({ username: '', email: '', password: '', first_name: '', last_name: '', role: 'employee' });

  const { data: users, isLoading } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => axiosInstance.get('/users/').then(r => r.data),
  });
  const { data: roles, isLoading: rolesLoading } = useQuery({
    queryKey: ['users-roles'],
    queryFn: () => axiosInstance.get('/users/roles/').then(r => r.data),
  });
  const userList = Array.isArray(users) ? users : [];
  const roleList = Array.isArray(roles) ? roles : [];

  const setRoleMutation = useMutation({
    mutationFn: ({ id, role }) => axiosInstance.post(`/users/${id}/role/`, { role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users-list'] });
    },
    onError: (e) => setErr(e.response?.data?.error || 'ط®ط·ط§ ط¯ط± طھط؛غŒغŒط± ظ†ظ‚ط´'),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => axiosInstance.post(`/users/${id}/delete/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users-list'] });
      setMsg('ع©ط§ط±ط¨ط± ط؛غŒط±ظپط¹ط§ظ„ ط´ط¯.');
      setTimeout(() => setMsg(''), 2500);
    },
    onError: (e) => setErr(e.response?.data?.error || 'ط®ط·ط§ ط¯ط± ط­ط°ظپ ع©ط§ط±ط¨ط±'),
  });
  const createMutation = useMutation({
    mutationFn: (body) => axiosInstance.post('/users/create/', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users-list'] });
      setOpenAdd(false);
      setDraft({ username: '', email: '', password: '', first_name: '', last_name: '', role: 'employee' });
      setMsg('ع©ط§ط±ط¨ط± ط³ط§ط®طھظ‡ ط´ط¯.');
      setTimeout(() => setMsg(''), 2500);
    },
    onError: (e) => setErr(e.response?.data?.error || 'ط®ط·ط§ ط¯ط± ط³ط§ط®طھ ع©ط§ط±ط¨ط±'),
  });

  // role local editable permission maps
  const [permEdits, setPermEdits] = useState({});

  return (
    <Box>
      {/* Page header */}
      <Paper sx={{
        p: 3, mb: 2.5, borderRadius: '10px',
        background: 'linear-gradient(120deg, rgba(100,116,139,0.10), rgba(100,116,139,0.02), rgba(255,255,255,0.3))',
        border: '1px solid rgba(100,116,139,0.18)',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #64748b, #475569)', boxShadow: '0 8px 24px rgba(100,116,139,0.35)' }}>
            <AdminPanelSettingsIcon sx={{ color: '#fff', fontSize: 28 }} />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight={800}>ع©ط§ط±ط¨ط±ط§ظ† ظˆ ظ†ظ‚ط´â€Œظ‡ط§</Typography>
            <Typography variant="body2" color="textSecondary">
              ظ…ط¯غŒط±غŒطھ ع©ط§ط±ط¨ط±ط§ظ†طŒ طھط®طµغŒطµ ظ†ظ‚ط´ ظˆ ط³ظپط§ط±ط´غŒâ€Œط³ط§ط²غŒ ظ…ط¬ظˆط²ظ‡ط§غŒ ظ‡ط± ظ†ظ‚ط´
            </Typography>
          </Box>
        </Box>
      </Paper>

      {(msg || err) && (
        <Alert severity={err ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => { setMsg(''); setErr(''); }}>
          {err || msg}
        </Alert>
      )}

      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tab icon={<PersonIcon />} iconPosition="start" label="ع©ط§ط±ط¨ط±ط§ظ†" />
        <Tab icon={<SecurityIcon />} iconPosition="start" label="ظ†ظ‚ط´â€Œظ‡ط§ ظˆ ظ…ط¬ظˆط²ظ‡ط§" />
      </Tabs>

      {/* ---------- TAB USERS ---------- */}
      {tab === 0 && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.5 }}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setErr(''); setOpenAdd(true); }}
              sx={{ background: 'linear-gradient(135deg, #64748b, #475569)', borderRadius: '10px' }}>
              ط§ظپط²ظˆط¯ظ† ع©ط§ط±ط¨ط±
            </Button>
          </Box>
          <Paper variant="outlined" sx={{ borderRadius: '10px', overflow: 'hidden' }}>
            {isLoading ? (
              <Box sx={{ p: 5, textAlign: 'center' }}><CircularProgress /></Box>
            ) : userList.length === 0 ? (
              <Box sx={{ p: 5, textAlign: 'center' }}><Typography color="textSecondary">ع©ط§ط±ط¨ط±غŒ غŒط§ظپطھ ظ†ط´ط¯</Typography></Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'rgba(100,116,139,0.06)' }}>
                      <TableCell sx={{ fontWeight: 700 }}>ع©ط§ط±ط¨ط±</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>ظ†ط§ظ… ع©ط§ط±ط¨ط±غŒ</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>ط§غŒظ…غŒظ„</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>ط³ظˆظ¾ط± غŒظˆط²ط±</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>ظ†ظ‚ط´ (ط¯ط± ط§غŒظ† ط³طھظˆظ† ظ‚ط§ط¨ظ„ طھط؛غŒغŒط±)</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>ط¹ظ…ظ„غŒط§طھ</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {userList.map(u => (
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
                        <TableCell>{u.email || 'â€”'}</TableCell>
                        <TableCell>{u.is_superuser ? <Chip size="small" color="secondary" label="ط¨ظ„ظ‡" /> : 'â€”'}</TableCell>
                        <TableCell sx={{ minWidth: 180 }}>
                          <FormControl fullWidth size="small">
                            <InputLabel>ظ†ظ‚ط´</InputLabel>
                            <Select
                              value={u.role}
                              label="ظ†ظ‚ط´"
                              onChange={e => setRoleMutation.mutate({ id: u.id, role: e.target.value })}
                            >
                              {ROLE_KEYS.map(r => <MenuItem key={r} value={r}>{ROLE_LABELS[r]}</MenuItem>)}
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell>
                          <Tooltip title="ط؛غŒط±ظپط¹ط§ظ„ ع©ط±ط¯ظ†">
                            <IconButton size="small" color="error" onClick={() => {
                              if (window.confirm(`ع©ط§ط±ط¨ط± آ«${u.username}آ» ط؛غŒط±ظپط¹ط§ظ„ ط´ظˆط¯طں`)) deleteMutation.mutate(u.id);
                            }}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </>
      )}

      {/* ---------- TAB ROLES & PERMISSIONS ---------- */}
      {tab === 1 && (
        <Box>
          {rolesLoading ? (
            <Box sx={{ p: 5, textAlign: 'center' }}><CircularProgress /></Box>
          ) : (
            <Stack spacing={2}>
              {roleList.map(role => (
                <Paper key={role.role} variant="outlined" sx={{ p: 2, borderRadius: '10px',
                  border: `1px solid ${(ROLE_COLORS[role.role] || '#64748b')}22`,
                  background: `linear-gradient(160deg, ${(ROLE_COLORS[role.role] || '#64748b')}0a, rgba(255,255,255,0.4))`,
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                    <Avatar sx={{ width: 30, height: 30, mr: 1, bgcolor: ROLE_COLORS[role.role] || '#64748b', fontSize: 13 }}>
                      {role.label.charAt(0)}
                    </Avatar>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1 }}>{role.label}</Typography>
                    <Button size="small" variant="contained" startIcon={<SaveIcon fontSize="small" />}
                      sx={{ background: ROLE_COLORS[role.role] || '#64748b' }}
                      onClick={() => {
                        const perms = (permEdits[role.role] && Object.keys(permEdits[role.role]).length)
                          ? permEdits[role.role] : role.permissions;
                        axiosInstance.post(`/users/roles/${role.role}/save/`, { permissions: perms }).then(() => {
                          qc.invalidateQueries({ queryKey: ['users-roles'] });
                          setMsg('ظ…ط¬ظˆط²ظ‡ط§ ط°ط®غŒط±ظ‡ ط´ط¯.');
                          setTimeout(() => setMsg(''), 2500);
                        }).catch(e => setErr(e.response?.data?.error || 'ط®ط·ط§ ط¯ط± ط°ط®غŒط±ظ‡ ظ…ط¬ظˆط²ظ‡ط§'));
                      }}>
                      ط°ط®غŒط±ظ‡
                    </Button>
                  </Box>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 1 }}>
                    {Object.keys(role.permissions).map(key => (
                      <Box key={key} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 0.5 }}>
                        <Typography variant="body2">{PERM_LABELS[key] || key}</Typography>
                        <Switch
                          size="small"
                          checked={permEdits[role.role]?.[key] ?? role.permissions[key]}
                          onChange={(_, v) =>
                            setPermEdits(p => ({ ...p, [role.role]: { ...(p[role.role] || role.permissions), [key]: v } }))
                          }
                        />
                      </Box>
                    ))}
                  </Box>
                </Paper>
              ))}
            </Stack>
          )}
        </Box>
      )}

      {/* Dialog add user */}
      <Dialog open={openAdd} onClose={() => setOpenAdd(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: '#475569' }}>ط§ظپط²ظˆط¯ظ† ع©ط§ط±ط¨ط± ط¬ط¯غŒط¯</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <TextField fullWidth size="small" label="ظ†ط§ظ… ع©ط§ط±ط¨ط±غŒ *" value={draft.username}
            onChange={e => setDraft(p => ({ ...p, username: e.target.value }))} />
          <TextField fullWidth size="small" label="ط§غŒظ…غŒظ„" value={draft.email}
            onChange={e => setDraft(p => ({ ...p, email: e.target.value }))} />
          <TextField fullWidth size="small" label="ط±ظ…ط² ط¹ط¨ظˆط± *" type="password" value={draft.password}
            onChange={e => setDraft(p => ({ ...p, password: e.target.value }))} />
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
            <TextField fullWidth size="small" label="ظ†ط§ظ…" value={draft.first_name}
              onChange={e => setDraft(p => ({ ...p, first_name: e.target.value }))} />
            <TextField fullWidth size="small" label="ظ†ط§ظ… ط®ط§ظ†ظˆط§ط¯ع¯غŒ" value={draft.last_name}
              onChange={e => setDraft(p => ({ ...p, last_name: e.target.value }))} />
          </Stack>
          <FormControl fullWidth size="small">
            <InputLabel>ظ†ظ‚ط´</InputLabel>
            <Select value={draft.role} label="ظ†ظ‚ط´" onChange={e => setDraft(p => ({ ...p, role: e.target.value }))}>
              {ROLE_KEYS.map(r => <MenuItem key={r} value={r}>{ROLE_LABELS[r]}</MenuItem>)}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAdd(false)}>ط§ظ†طµط±ط§ظپ</Button>
          <Button variant="contained" sx={{ background: 'linear-gradient(135deg, #64748b, #475569)' }}
            disabled={!draft.username || !draft.password}
            onClick={() => createMutation.mutate(draft)}>
            ط³ط§ط®طھ ع©ط§ط±ط¨ط±
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UsersPage;