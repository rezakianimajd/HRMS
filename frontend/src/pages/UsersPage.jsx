import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Tabs, Tab, Avatar, Chip, FormControl, InputLabel,
  Select, MenuItem, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Alert, Stack, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, IconButton, Tooltip, CircularProgress, Switch,
  Grid, Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SecurityIcon from '@mui/icons-material/Security';
import PersonIcon from '@mui/icons-material/Person';
import SaveIcon from '@mui/icons-material/Save';
import AppsIcon from '@mui/icons-material/Apps';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';

const ROLE_LABELS = {
  super_admin: 'مدیر ارشد سیستم',
  hr_manager: 'مدیر منابع انسانی',
  hr_specialist: 'کارشناس منابع انسانی',
  department_head: 'مدیر دپارتمان',
  employee: 'کارمند',
};
const ROLE_COLORS = {
  super_admin: '#7c3aed',
  hr_manager: '#2563eb',
  hr_specialist: '#0ea5e9',
  department_head: '#f59e0b',
  employee: '#64748b',
};

const PERM_LABELS = {
  can_view_all_employees: 'مشاهده همه پرسنل',
  can_add_employee: 'افزودن پرسنل',
  can_change_employee: 'ویرایش پرسنل',
  can_delete_employee: 'حذف پرسنل',
  can_view_sensitive_data: 'مشاهده اطلاعات حساس',
  can_manage_documents: 'مدیریت مدارک',
  can_delete_documents: 'حذف مدارک',
  can_approve_leaves: 'تأیید مرخصی',
  can_edit_settings: 'ویرایش تنظیمات',
  can_manage_users: 'مدیریت کاربران',
  can_manage_roles: 'مدیریت نقش‌ها',
  can_manage_companies: 'مدیریت شرکت‌ها',
  can_view_audit_logs: 'مشاهده لاگ فعالیت',
};
const ROLE_KEYS = Object.keys(ROLE_LABELS);

const glass = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.78), rgba(255,255,255,0.42))',
  backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(255,255,255,0.7)',
  boxShadow: '0 18px 50px rgba(100,116,139,0.14)',
  borderRadius: '20px',
};

// A single selectable module card.
const ModuleCard = ({ app, checked, disabled, onToggle }) => (
  <Paper
    onClick={() => !disabled && onToggle(app)}
    sx={{
      p: 1.5, cursor: disabled ? 'default' : 'pointer', borderRadius: '14px',
      display: 'flex', alignItems: 'center', gap: 1.25,
      border: checked ? `2px solid ${app.color || '#6366f1'}` : '1px solid rgba(100,116,139,0.18)',
      background: checked ? `${app.color || '#6366f1'}14` : 'rgba(255,255,255,0.55)',
      opacity: disabled ? 0.45 : 1,
      transition: 'all 0.2s ease',
      '&:hover': { transform: disabled ? 'none' : 'translateY(-1px)', boxShadow: '0 10px 26px rgba(100,116,139,0.12)' },
    }}
  >
    <Avatar sx={{ width: 34, height: 34, bgcolor: app.color || '#6366f1', fontSize: 18, flexShrink: 0 }}>
      {app.icon || '📦'}
    </Avatar>
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography variant="body2" fontWeight={700} noWrap>{app.title}</Typography>
      <Typography variant="caption" color="textSecondary" noWrap>
        {app.is_coming_soon ? 'به‌زودی' : (app.description || app.slug)}
      </Typography>
    </Box>
    {checked ? <CheckCircleIcon fontSize="small" sx={{ color: app.color || '#6366f1' }} /> : <RadioButtonUncheckedIcon fontSize="small" sx={{ color: 'rgba(100,116,139,0.4)' }} />}
  </Paper>
);

const UsersPage = () => {
  const qc = useQueryClient();
  const [tab, setTab] = useState(0);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [openAdd, setOpenAdd] = useState(false);
  const [draft, setDraft] = useState({ username: '', email: '', password: '', first_name: '', last_name: '', role: 'employee', application_ids: [] });
  const [permEdits, setPermEdits] = useState({});
  const [roleAppEdits, setRoleAppEdits] = useState({});
  const [moduleUser, setModuleUser] = useState(null);
  const [moduleSel, setModuleSel] = useState([]);

  const { data: users, isLoading } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => axiosInstance.get('/users/').then(r => r.data),
  });
  const { data: roles, isLoading: rolesLoading } = useQuery({
    queryKey: ['users-roles'],
    queryFn: () => axiosInstance.get('/users/roles/').then(r => r.data),
  });
  const { data: catalog, isLoading: catalogLoading } = useQuery({
    queryKey: ['apps-catalog'],
    queryFn: () => axiosInstance.get('/applications/catalog/').then(r => r.data),
  });
  const userList = Array.isArray(users) ? users : [];
  const roleList = Array.isArray(roles) ? roles : [];
  const appList = Array.isArray(catalog) ? catalog : [];

  const setRoleMutation = useMutation({
    mutationFn: ({ id, role }) => axiosInstance.post(`/users/${id}/role/`, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users-list'] }),
    onError: (e) => setErr(e.response?.data?.error || 'خطا در تغییر نقش'),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => axiosInstance.post(`/users/${id}/delete/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users-list'] });
      setMsg('کاربر غیرفعال شد.');
      setTimeout(() => setMsg(''), 2500);
    },
    onError: (e) => setErr(e.response?.data?.error || 'خطا در حذف کاربر'),
  });
  const createMutation = useMutation({
    mutationFn: (body) => axiosInstance.post('/users/create/', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users-list'] });
      setOpenAdd(false);
      setDraft({ username: '', email: '', password: '', first_name: '', last_name: '', role: 'employee', application_ids: [] });
      setMsg('کاربر ساخته شد.');
      setTimeout(() => setMsg(''), 2500);
    },
    onError: (e) => setErr(e.response?.data?.error || 'خطا در ساخت کاربر'),
  });
  const setAppsMutation = useMutation({
    mutationFn: ({ id, application_ids }) => axiosInstance.post(`/users/${id}/applications/`, { application_ids }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users-list'] });
      setModuleUser(null);
      setMsg('دسترسی ماژول‌ها ذخیره شد.');
      setTimeout(() => setMsg(''), 2500);
    },
    onError: (e) => setErr(e.response?.data?.error || 'خطا در ذخیره دسترسی ماژول‌ها'),
  });

  const openModuleDialog = (u) => {
    setModuleUser(u);
    setModuleSel(u.applications || []);
  };

  const roleAppChecked = (role) => {
    const v = roleAppEdits[role.role] !== undefined ? roleAppEdits[role.role] : role.applications;
    if (v === '*') return null; // all selected
    return new Set(v || []);
  };
  const toggleRoleApp = (role, slug) => {
    setRoleAppEdits(p => {
      const cur = p[role.role] !== undefined ? p[role.role] : role.applications;
      const set = cur === '*' ? new Set(appList.map(a => a.slug)) : new Set(cur || []);
      if (set.has(slug)) set.delete(slug); else set.add(slug);
      return { ...p, [role.role]: Array.from(set) };
    });
  };

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
            <Typography variant="h6" fontWeight={800}>کاربران، نقش‌ها و ماژول‌ها</Typography>
            <Typography variant="body2" color="textSecondary">
              مدیریت کاربران، تخصیص نقش، دسترسی ماژول‌ها و سفارشی‌سازی مجوزهای هر نقش
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
        <Tab icon={<PersonIcon />} iconPosition="start" label="کاربران" />
        <Tab icon={<AppsIcon />} iconPosition="start" label="نقش‌ها و دسترسی ماژول‌ها" />
        <Tab icon={<SecurityIcon />} iconPosition="start" label="مجوزهای ریز" />
      </Tabs>

      {/* ---------- TAB USERS ---------- */}
      {tab === 0 && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.5 }}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setErr(''); setOpenAdd(true); }}
              sx={{ background: 'linear-gradient(135deg, #64748b, #475569)', borderRadius: '10px' }}>
              افزودن کاربر
            </Button>
          </Box>
          <Paper variant="outlined" sx={{ borderRadius: '10px', overflow: 'hidden' }}>
            {isLoading ? (
              <Box sx={{ p: 5, textAlign: 'center' }}><CircularProgress /></Box>
            ) : userList.length === 0 ? (
              <Box sx={{ p: 5, textAlign: 'center' }}><Typography color="textSecondary">کاربری یافت نشد</Typography></Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'rgba(100,116,139,0.06)' }}>
                      <TableCell sx={{ fontWeight: 700 }}>کاربر</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>نام کاربری</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>نقش</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>دسترسی ماژول‌ها</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>عملیات</TableCell>
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
                        <TableCell sx={{ minWidth: 170 }}>
                          <FormControl fullWidth size="small">
                            <InputLabel>نقش</InputLabel>
                            <Select value={u.role} label="نقش" onChange={e => setRoleMutation.mutate({ id: u.id, role: e.target.value })}>
                              {ROLE_KEYS.map(r => <MenuItem key={r} value={r}>{ROLE_LABELS[r]}</MenuItem>)}
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" sx={{ maxWidth: 360 }}>
                            {(u.applications || []).length === 0
                              ? <Chip size="small" label="طبق نقش" variant="outlined" />
                              : (u.applications || []).map(id => {
                                  const app = appList.find(a => a.id === id);
                                  return app ? (
                                    <Chip key={id} size="small" label={app.title}
                                      sx={{ bgcolor: `${app.color || '#6366f1'}22`, color: '#475569', fontWeight: 600, fontSize: 11 }} />
                                  ) : null;
                                })}
                            <Tooltip title="ویرایش دسترسی ماژول‌ها">
                              <IconButton size="small" onClick={() => openModuleDialog(u)}>
                                <AppsIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Tooltip title="غیرفعال کردن">
                            <IconButton size="small" color="error" onClick={() => {
                              if (window.confirm(`کاربر «${u.username}» غیرفعال شود؟`)) deleteMutation.mutate(u.id);
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

      {/* ---------- TAB ROLES & MODULE ACCESS ---------- */}
      {tab === 1 && (
        <Box>
          {rolesLoading || catalogLoading ? (
            <Box sx={{ p: 5, textAlign: 'center' }}><CircularProgress /></Box>
          ) : (
            <Stack spacing={2.5}>
              {roleList.map(role => {
                const checkedSet = roleAppChecked(role);
                const isAll = checkedSet === null;
                return (
                  <Paper key={role.role} sx={{ ...glass, p: 2.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar sx={{ width: 36, height: 36, mr: 1.5, bgcolor: ROLE_COLORS[role.role] || '#64748b', fontSize: 15 }}>
                        {role.label.charAt(0)}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" fontWeight={800}>{role.label}</Typography>
                        <Typography variant="caption" color="textSecondary">
                          {isAll ? 'دسترسی به تمام ماژول‌ها' : `${(roleAppEdits[role.role] !== undefined ? roleAppEdits[role.role] : role.applications)?.length || 0} ماژول`}
                        </Typography>
                      </Box>
                      <Button size="small" variant="contained" startIcon={<SaveIcon fontSize="small" />} disabled={role.role === 'super_admin'}
                        sx={{ background: ROLE_COLORS[role.role] || '#64748b' }}
                        onClick={() => {
                          const apps = roleAppEdits[role.role] !== undefined ? roleAppEdits[role.role] : role.applications;
                          axiosInstance.post(`/users/roles/${role.role}/save/`, { permissions: role.permissions, applications: apps }).then(() => {
                            qc.invalidateQueries({ queryKey: ['users-roles'] });
                            setMsg('دسترسی ماژول‌ها ذخیره شد.');
                            setTimeout(() => setMsg(''), 2500);
                          }).catch(e => setErr(e.response?.data?.error || 'خطا در ذخیره'));
                        }}>
                        ذخیره
                      </Button>
                    </Box>
                    {role.role === 'super_admin' ? (
                      <Alert severity="info" sx={{ borderRadius: '12px' }}>نقش «مدیر ارشد سیستم» به صورت خودکار به تمام ماژول‌ها دسترسی کامل دارد و قابل تغییر نیست.</Alert>
                    ) : (
                      <Grid container spacing={1.5}>
                        {appList.map(app => {
                          const checked = isAll || (checkedSet && checkedSet.has(app.slug));
                          return (
                            <Grid item xs={12} sm={6} md={4} key={app.id}>
                              <ModuleCard app={app} checked={!!checked} onToggle={(a) => toggleRoleApp(role, a.slug)} />
                            </Grid>
                          );
                        })}
                      </Grid>
                    )}
                  </Paper>
                );
              })}
            </Stack>
          )}
        </Box>
      )}

      {/* ---------- TAB FINE PERMISSIONS ---------- */}
      {tab === 2 && (
        <Box>
          {rolesLoading ? (
            <Box sx={{ p: 5, textAlign: 'center' }}><CircularProgress /></Box>
          ) : (
            <Stack spacing={2}>
              {roleList.map(role => (
                <Paper key={role.role} variant="outlined" sx={{ p: 2, borderRadius: '12px',
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
                        const apps = roleAppEdits[role.role] !== undefined ? roleAppEdits[role.role] : role.applications;
                        axiosInstance.post(`/users/roles/${role.role}/save/`, { permissions: perms, applications: apps }).then(() => {
                          qc.invalidateQueries({ queryKey: ['users-roles'] });
                          setMsg('مجوزها ذخیره شد.');
                          setTimeout(() => setMsg(''), 2500);
                        }).catch(e => setErr(e.response?.data?.error || 'خطا در ذخیره مجوزها'));
                      }}>
                      ذخیره
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
        <DialogTitle sx={{ color: '#475569' }}>افزودن کاربر جدید</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <TextField fullWidth size="small" label="نام کاربری *" value={draft.username}
            onChange={e => setDraft(p => ({ ...p, username: e.target.value }))} />
          <TextField fullWidth size="small" label="ایمیل" value={draft.email}
            onChange={e => setDraft(p => ({ ...p, email: e.target.value }))} />
          <TextField fullWidth size="small" label="رمز عبور *" type="password" value={draft.password}
            onChange={e => setDraft(p => ({ ...p, password: e.target.value }))} />
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
            <TextField fullWidth size="small" label="نام" value={draft.first_name}
              onChange={e => setDraft(p => ({ ...p, first_name: e.target.value }))} />
            <TextField fullWidth size="small" label="نام خانوادگی" value={draft.last_name}
              onChange={e => setDraft(p => ({ ...p, last_name: e.target.value }))} />
          </Stack>
          <FormControl fullWidth size="small">
            <InputLabel>نقش</InputLabel>
            <Select value={draft.role} label="نقش" onChange={e => setDraft(p => ({ ...p, role: e.target.value }))}>
              {ROLE_KEYS.map(r => <MenuItem key={r} value={r}>{ROLE_LABELS[r]}</MenuItem>)}
            </Select>
          </FormControl>
          <Divider sx={{ my: 0.5 }} />
          <Typography variant="body2" fontWeight={700} color="textSecondary">دسترسی ماژول‌ها (اختیاری — خالی یعنی طبق نقش)</Typography>
          <Grid container spacing={1}>
            {appList.map(app => {
              const checked = draft.application_ids.includes(app.id);
              return (
                <Grid item xs={6} key={app.id}>
                  <ModuleCard app={app} checked={checked} onToggle={() => setDraft(p => ({
                    ...p,
                    application_ids: checked ? p.application_ids.filter(i => i !== app.id) : [...p.application_ids, app.id],
                  }))} />
                </Grid>
              );
            })}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAdd(false)}>انصراف</Button>
          <Button variant="contained" sx={{ background: 'linear-gradient(135deg, #64748b, #475569)' }}
            disabled={!draft.username || !draft.password}
            onClick={() => createMutation.mutate(draft)}>
            ساخت کاربر
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog edit module access */}
      <Dialog open={!!moduleUser} onClose={() => setModuleUser(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ color: '#475569' }}>
          دسترسی ماژول‌های «{moduleUser?.username}»
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 1.5 }}>
            ماژول‌هایی که این کاربر مستقیم به آن‌ها دسترسی دارد. (نقش: {ROLE_LABELS[moduleUser?.role] || '—'})
          </Typography>
          <Grid container spacing={1.5}>
            {appList.map(app => {
              const checked = moduleSel.includes(app.id);
              return (
                <Grid item xs={12} sm={6} md={4} key={app.id}>
                  <ModuleCard app={app} checked={checked} onToggle={() => setModuleSel(p => checked ? p.filter(i => i !== app.id) : [...p, app.id])} />
                </Grid>
              );
            })}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModuleUser(null)}>انصراف</Button>
          <Button variant="contained" startIcon={<SaveIcon />}
            sx={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
            onClick={() => setAppsMutation.mutate({ id: moduleUser.id, application_ids: moduleSel })}>
            ذخیره
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UsersPage;