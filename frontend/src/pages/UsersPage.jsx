import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, Chip, FormControl, InputLabel,
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
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import { formatPersianNumber } from '../core/utils/numberUtils';
import { PageHeader, TabsCard, SURFACE, SOFT } from '../core/components/settings/settingsUi';

const ROLE_LABELS = {
  super_admin: 'مدیر ارشد سیستم',
  hr_manager: 'مدیر منابع انسانی',
  hr_specialist: 'کارشناس منابع انسانی',
  department_head: 'مدیر دپارتمان',
  employee: 'کارمند',
};
const ROLE_COLORS = {
  super_admin: SOFT.violet,
  hr_manager: SOFT.indigo,
  hr_specialist: SOFT.blue,
  department_head: SOFT.amber,
  employee: SOFT.slate,
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

const glass = { ...SURFACE };

// A single selectable module card.
const ModuleCard = ({ app, checked, disabled, onToggle }) => (
  <Paper
    onClick={() => !disabled && onToggle(app)}
    sx={{
      p: 1.25, cursor: disabled ? 'default' : 'pointer', borderRadius: '12px',
      display: 'flex', alignItems: 'center', gap: 1, height: '100%',
      border: '1px solid', borderColor: checked ? `${app.color || SOFT.indigo}66` : 'divider',
      bgcolor: checked ? `${app.color || SOFT.indigo}12` : 'background.paper',
      opacity: disabled ? 0.45 : 1,
      transition: 'all .18s ease',
    }}
  >
    <Avatar variant="rounded" sx={{ width: 30, height: 30, borderRadius: '9px', bgcolor: `${app.color || SOFT.indigo}1f`, color: app.color || SOFT.indigo, fontSize: 15, flexShrink: 0 }}>
      {app.icon || '📦'}
    </Avatar>
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography sx={{ fontSize: 11.5, fontWeight: 800 }} noWrap>{app.title}</Typography>
      <Typography sx={{ fontSize: 9.5, color: 'text.secondary' }} noWrap>
        {app.is_coming_soon ? 'به‌زودی' : (app.description || app.slug)}
      </Typography>
    </Box>
    {checked ? <CheckCircleIcon sx={{ fontSize: 17, color: app.color || SOFT.indigo }} /> : <RadioButtonUncheckedIcon sx={{ fontSize: 17, color: 'rgba(100,116,139,0.4)' }} />}
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
  const [viewUser, setViewUser] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({
    username: '', first_name: '', last_name: '', email: '',
    role: 'employee', application_ids: [],
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => axiosInstance.get('/users/').then(r => r.data),
  });
  const { data: roles, isLoading: rolesLoading } = useQuery({
    queryKey: ['users-roles'],
    queryFn: () => axiosInstance.get('/users/roles/').then(r => r.data),
  });
  const { data: catalog } = useQuery({
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
  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => axiosInstance.post(`/users/${id}/update/`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users-list'] });
      qc.invalidateQueries({ queryKey: ['users-roles'] });
      setEditUser(null);
      setMsg('اطلاعات کاربر به‌روزرسانی شد.');
      setTimeout(() => setMsg(''), 2500);
    },
    onError: (e) => setErr(e.response?.data?.error || 'خطا در ویرایش کاربر'),
  });

  const openEditUser = (u) => {
    setEditUser(u);
    setEditForm({
      username: u.username || '',
      first_name: u.first_name || '',
      last_name: u.last_name || '',
      email: u.email || '',
      role: u.role || 'employee',
      application_ids: [...(u.applications || [])],
    });
    setErr('');
  };

  return (
    <Box>
      <PageHeader
        icon={<AdminPanelSettingsIcon />}
        title="کاربران، نقش‌ها و ماژول‌ها"
        color={SOFT.slate}
        actions={(
          <Button
            variant="contained" startIcon={<AddIcon />}
            onClick={() => { setErr(''); setOpenAdd(true); }}
            sx={{
              bgcolor: SOFT.slate, borderRadius: '9px', boxShadow: 'none',
              fontSize: 11.5, '&:hover': { bgcolor: '#8494a8' },
            }}
          >
            افزودن کاربر
          </Button>
        )}
      />

      {(msg || err) && (
        <Alert severity={err ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => { setMsg(''); setErr(''); }}>
          {err || msg}
        </Alert>
      )}

      <TabsCard
        tabs={[
          { key: 'users', label: 'کاربران', icon: <PersonIcon /> },
          { key: 'perms', label: 'مجوزهای ریز', icon: <SecurityIcon /> },
        ]}
        value={tab}
        onChange={setTab}
        activeColor={SOFT.slate}
      />

      {/* ---------- TAB USERS ---------- */}
      {tab === 0 && (
        <>
          <Paper variant="outlined" sx={{ ...SURFACE, overflow: 'hidden' }}>
            {isLoading ? (
              <Box sx={{ p: 5, textAlign: 'center' }}><CircularProgress /></Box>
            ) : userList.length === 0 ? (
              <Box sx={{ p: 5, textAlign: 'center' }}><Typography color="textSecondary">کاربری یافت نشد</Typography></Box>
            ) : (
              <TableContainer>
                <Table size="small" sx={{ '& td': { fontSize: 11, py: 1 } }}>
                  <TableHead>
                    <TableRow sx={{ '& th': { bgcolor: 'rgba(100,116,139,0.05)', fontSize: 10.5, fontWeight: 800 } }}>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>کاربر</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>نام کاربری</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>نقش</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>دسترسی ماژول‌ها</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>عملیات</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {userList.map(u => (
                      <TableRow key={u.id} hover>
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={1.25} useFlexGap>
                            <Avatar sx={{ width: 30, height: 30, fontSize: 12, fontWeight: 800, bgcolor: `${ROLE_COLORS[u.role] || SOFT.slate}1f`, color: ROLE_COLORS[u.role] || SOFT.slate }}>
                              {(u.first_name?.charAt(0) || u.username?.charAt(0) || 'U')}
                            </Avatar>
                            <Box>
                              <Typography sx={{ fontSize: 11.5, fontWeight: 700 }}>{u.first_name} {u.last_name}</Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell>{u.username}</TableCell>
                        <TableCell align="center" sx={{ minWidth: 150 }}>
                          <FormControl fullWidth size="small" sx={{
                            '& .MuiInputLabel-root': { fontSize: 11 },
                            '& .MuiSelect-select': { fontSize: 11, py: 0.75 },
                          }}>
                            <InputLabel>نقش</InputLabel>
                            <Select value={u.role} label="نقش" onChange={e => setRoleMutation.mutate({ id: u.id, role: e.target.value })}>
                              {ROLE_KEYS.map(r => <MenuItem key={r} value={r}>{ROLE_LABELS[r]}</MenuItem>)}
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell align="center">
                          {u.is_superuser ? (
                            <Chip size="small" label="همهٔ ماژول‌ها"
                              sx={{ height: 20, fontSize: 10, fontWeight: 800, bgcolor: `${SOFT.violet}1f`, color: SOFT.violet }} />
                          ) : (u.applications || []).length > 0 ? (
                            <Chip size="small" label={`${formatPersianNumber((u.applications || []).length)} ماژول`}
                              sx={{ height: 20, fontSize: 10, fontWeight: 800, bgcolor: `${SOFT.indigo}1f`, color: SOFT.indigo }} />
                          ) : (
                            <Chip size="small" label="طبق نقش" variant="outlined"
                              sx={{ height: 20, fontSize: 10, fontWeight: 700 }} />
                          )}
                        </TableCell>
                        <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                          <Tooltip title="مشاهدهٔ مشخصات">
                            <IconButton size="small" onClick={() => setViewUser(u)}
                              sx={{ color: SOFT.blue, '&:hover': { bgcolor: `${SOFT.blue}14` } }}>
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="ویرایش کاربر">
                            <IconButton size="small" onClick={() => openEditUser(u)}
                              sx={{ color: SOFT.indigo, '&:hover': { bgcolor: `${SOFT.indigo}14` } }}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
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

      {/* ---------- TAB FINE PERMISSIONS ---------- */}
      {tab === 1 && (
        <Box>
          {rolesLoading ? (
            <Box sx={{ p: 5, textAlign: 'center' }}><CircularProgress /></Box>
          ) : (
            <Stack spacing={2}>
              {roleList.map(role => (
                <Paper key={role.role} variant="outlined" sx={{ ...SURFACE, p: 1.75 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                    <Avatar sx={{ width: 28, height: 28, mr: 1, fontSize: 11, fontWeight: 800, bgcolor: `${ROLE_COLORS[role.role] || SOFT.slate}1f`, color: ROLE_COLORS[role.role] || SOFT.slate }}>
                      {role.label.charAt(0)}
                    </Avatar>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 800, flex: 1 }}>{role.label}</Typography>
                    <Button size="small" variant="contained" startIcon={<SaveIcon fontSize="small" />}
                      sx={{ bgcolor: ROLE_COLORS[role.role] || SOFT.slate, boxShadow: 'none', fontSize: 10.5 }}
                      onClick={() => {
                        const perms = (permEdits[role.role] && Object.keys(permEdits[role.role]).length)
                          ? permEdits[role.role] : role.permissions;
                        const apps = role.applications;
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
                        <Typography sx={{ fontSize: 11 }}>{PERM_LABELS[key] || key}</Typography>
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
          <Button variant="contained" sx={{ bgcolor: SOFT.slate, boxShadow: 'none', '&:hover': { bgcolor: '#8494a8' } }}
            disabled={!draft.username || !draft.password}
            onClick={() => createMutation.mutate(draft)}>
            ساخت کاربر
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog view user */}
      <Dialog open={!!viewUser} onClose={() => setViewUser(null)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: '18px' } }}>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 900 }}>مشخصات کاربر</DialogTitle>
        <DialogContent dividers>
          {viewUser && (
            <Stack spacing={1.25}>
              <Stack direction="row" spacing={1.25} alignItems="center" useFlexGap sx={{ mb: 1 }}>
                <Avatar sx={{
                  width: 42, height: 42, fontSize: 16, fontWeight: 800,
                  bgcolor: `${ROLE_COLORS[viewUser.role] || SOFT.slate}1f`,
                  color: ROLE_COLORS[viewUser.role] || SOFT.slate,
                }}>
                  {(viewUser.first_name?.charAt(0) || viewUser.username?.charAt(0) || 'U')}
                </Avatar>
                <Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 800 }}>
                    {viewUser.first_name} {viewUser.last_name}
                  </Typography>
                  <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>@{viewUser.username}</Typography>
                </Box>
              </Stack>
              {[
                ['نام کاربری', viewUser.username],
                ['ایمیل', viewUser.email || '—'],
                ['نقش', ROLE_LABELS[viewUser.role] || viewUser.role || '—'],
                ['دسترسی ماژول‌ها', viewUser.is_superuser
                  ? 'همهٔ ماژول‌ها'
                  : `${formatPersianNumber((viewUser.applications || []).length)} ماژول`],
                ['وضعیت', viewUser.is_active ? 'فعال' : 'غیرفعال'],
              ].map(([key, value]) => (
                <Stack key={key} direction="row" justifyContent="space-between"
                  sx={{ py: 0.5, borderBottom: '1px dashed', borderColor: 'divider' }}>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{key}</Typography>
                  <Typography sx={{ fontSize: 11.5, fontWeight: 700 }}>{value}</Typography>
                </Stack>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewUser(null)}>بستن</Button>
          <Button variant="contained" startIcon={<EditIcon />}
            sx={{ bgcolor: SOFT.indigo, boxShadow: 'none', '&:hover': { bgcolor: '#6f7ecb' } }}
            onClick={() => { const current = viewUser; setViewUser(null); openEditUser(current); }}>
            ویرایش
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog edit user */}
      <Dialog open={!!editUser} onClose={() => setEditUser(null)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: '18px' } }}>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 900 }}>ویرایش کاربر</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <TextField fullWidth size="small" label="نام کاربری *" value={editForm.username}
            onChange={e => setEditForm(p => ({ ...p, username: e.target.value }))} />
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
            <TextField fullWidth size="small" label="نام" value={editForm.first_name}
              onChange={e => setEditForm(p => ({ ...p, first_name: e.target.value }))} />
            <TextField fullWidth size="small" label="نام خانوادگی" value={editForm.last_name}
              onChange={e => setEditForm(p => ({ ...p, last_name: e.target.value }))} />
          </Stack>
          <TextField fullWidth size="small" label="ایمیل" value={editForm.email}
            onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} />
          <FormControl fullWidth size="small">
            <InputLabel>نقش</InputLabel>
            <Select value={editForm.role} label="نقش"
              onChange={e => setEditForm(p => ({ ...p, role: e.target.value }))}>
              {ROLE_KEYS.map(r => <MenuItem key={r} value={r}>{ROLE_LABELS[r]}</MenuItem>)}
            </Select>
          </FormControl>
          <Divider sx={{ my: 0.5 }} />
          <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: 'text.secondary' }}>
            دسترسی ماژول‌ها (خالی یعنی طبق نقش)
          </Typography>
          <Grid container spacing={1}>
            {appList.map(app => {
              const checked = editForm.application_ids.includes(app.id);
              return (
                <Grid item xs={12} sm={6} key={app.id}>
                  <ModuleCard app={app} checked={checked} onToggle={() => setEditForm(p => ({
                    ...p,
                    application_ids: checked
                      ? p.application_ids.filter(i => i !== app.id)
                      : [...p.application_ids, app.id],
                  }))} />
                </Grid>
              );
            })}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditUser(null)}>انصراف</Button>
          <Button variant="contained" startIcon={<SaveIcon />}
            disabled={!editForm.username || updateMutation.isLoading}
            sx={{ bgcolor: SOFT.indigo, boxShadow: 'none', '&:hover': { bgcolor: '#6f7ecb' } }}
            onClick={() => updateMutation.mutate({ id: editUser.id, body: editForm })}>
            ذخیره تغییرات
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default UsersPage;