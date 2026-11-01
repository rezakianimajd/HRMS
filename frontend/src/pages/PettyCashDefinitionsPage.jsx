import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Paper, Button, CircularProgress, Stack, Chip, TextField, MenuItem, Dialog,
  DialogTitle, DialogContent, DialogActions, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Tooltip, Alert, Grid, Typography, Switch, Divider,
  FormControlLabel, Autocomplete, Checkbox,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import GroupsIcon from '@mui/icons-material/Groups';
import ShieldIcon from '@mui/icons-material/Shield';
import SaveIcon from '@mui/icons-material/Save';
import PageHeader from '../core/components/ui/PageHeader';

const COLOR = '#0ea5e9';
const COLOR_DARK = '#0284c7';

const glass = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.72), rgba(255,255,255,0.34))',
  backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)',
  border: '1px solid rgba(255,255,255,0.6)',
  boxShadow: '0 14px 40px rgba(14,165,233,0.12)', borderRadius: '16px',
};

const ROLES = [
  { value: 'custodian', label: 'تنخواه‌دار' },
  { value: 'assistant', label: 'کمک‌تنخواه‌دار' },
];

const ROLE_COLORS = { custodian: '#0ea5e9', assistant: '#8b5cf6' };

const emptyForm = () => ({
  employee: null,
  role: 'custodian',
  supervisor: '',
  funds: [],
  can_create_expense: true,
  can_view_reports: false,
  can_approve: false,
  note: '',
});

const PettyCashDefinitionsPage = () => {
  const qc = useQueryClient();
  const [msg, setMsg] = useState(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const { data: custodians, isLoading } = useQuery({
    queryKey: ['pc-custodian-definitions'],
    queryFn: () => axiosInstance.get('/petty-cash-custodians/').then(r => r.data),
  });
  const { data: options } = useQuery({
    queryKey: ['pc-custodian-options'],
    queryFn: () => axiosInstance.get('/petty-cash-custodians/options/').then(r => r.data),
  });
  const { data: settings } = useQuery({
    queryKey: ['pc-settings'],
    queryFn: () => axiosInstance.get('/petty-cash-settings/current/').then(r => r.data),
  });
  const { data: accessSummary } = useQuery({
    queryKey: ['pc-access-summary'],
    queryFn: () => axiosInstance.get('/petty-cash-settings/access_summary/').then(r => r.data),
  });
  const { data: employees } = useQuery({
    queryKey: ['pc-employees-picker'],
    queryFn: () => axiosInstance.get('/employees/', { params: { page_size: 500 } }).then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });
  const { data: users } = useQuery({
    queryKey: ['pc-users-picker'],
    queryFn: () => axiosInstance.get('/users/').then(r => r.data),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const list = Array.isArray(custodians) ? custodians : custodians?.results || [];
  const employeeList = Array.isArray(employees) ? employees : employees?.results || [];
  const userList = Array.isArray(users) ? users : [];
  const fundOptions = options?.funds || [];
  const supervisors = options?.supervisors || [];
  const isSenior = accessSummary?.is_senior_manager ?? options?.is_senior_manager ?? false;

  const [visibility, setVisibility] = useState(null);
  const [seniorManagers, setSeniorManagers] = useState(null);

  const currentVisibility = visibility ?? settings?.restrict_visibility ?? true;
  const currentSeniors = useMemo(() => {
    if (seniorManagers) return seniorManagers;
    return (settings?.senior_manager_ids || []).map(String);
  }, [seniorManagers, settings]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['pc-custodian-definitions'] });
    qc.invalidateQueries({ queryKey: ['pc-custodian-options'] });
    qc.invalidateQueries({ queryKey: ['pc-access-summary'] });
    qc.invalidateQueries({ queryKey: ['pc-settings'] });
  };
  const onError = (e) => setMsg({ ok: false, text: e.response?.data?.error || e.response?.data?.detail || 'خطا در انجام عملیات' });

  const saveSettings = useMutation({
    mutationFn: (payload) => axiosInstance.patch('/petty-cash-settings/current/', payload),
    onSuccess: () => { refresh(); setMsg({ ok: true, text: 'تنظیمات دسترسی ذخیره شد' }); },
    onError,
  });

  const saveCustodian = useMutation({
    mutationFn: ({ id, payload }) => (
      id
        ? axiosInstance.patch(`/petty-cash-custodians/${id}/`, payload)
        : axiosInstance.post('/petty-cash-custodians/', payload)
    ),
    onSuccess: () => {
      refresh();
      setOpen(false);
      setEditing(null);
      setForm(emptyForm());
      setMsg({ ok: true, text: 'تعریف تنخواه‌دار ذخیره شد' });
    },
    onError,
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, is_active }) => axiosInstance.patch(`/petty-cash-custodians/${id}/`, { is_active }),
    onSuccess: refresh,
    onError,
  });

  const openCreate = () => { setEditing(null); setForm(emptyForm()); setOpen(true); };
  const openEdit = (row) => {
    setEditing(row);
    setForm({
      employee: row.employee,
      role: row.role,
      supervisor: row.supervisor || '',
      funds: (row.funds || []).map(String),
      can_create_expense: row.can_create_expense,
      can_view_reports: row.can_view_reports,
      can_approve: row.can_approve,
      note: row.note || '',
    });
    setOpen(true);
  };

  const submitForm = () => {
    if (!form.employee) { setMsg({ ok: false, text: 'انتخاب پرسنل الزامی است.' }); return; }
    saveCustodian.mutate({
      id: editing?.id,
      payload: {
        employee: form.employee,
        role: form.role,
        supervisor: form.role === 'assistant' && form.supervisor ? form.supervisor : null,
        funds: form.funds,
        can_create_expense: form.can_create_expense,
        can_view_reports: form.can_view_reports,
        can_approve: form.can_approve,
        note: form.note,
      },
    });
  };

  const employeeOption = (id) => employeeList.find(e => String(e.id) === String(id)) || null;
  const employeeLabel = (e) => (e ? `${e.first_name || ''} ${e.last_name || ''}`.trim() || e.employee_id || `#${e.id}` : '');


  return (
    <Box>
      <PageHeader
        icon={<GroupsIcon />}
        title="تعاریف اولیهٔ تنخواه"
        actions={(
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip label={`${list.length} تعریف`} color="primary" variant="outlined" />
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} disabled={!isSenior}
              sx={{ background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, borderRadius: '12px' }}>
              افزودن تنخواه‌دار
            </Button>
          </Stack>
        )}
      />

      {msg && (
        <Alert severity={msg.ok ? 'success' : 'error'} sx={{ mb: 2, borderRadius: '12px' }} onClose={() => setMsg(null)}>
          {msg.text}
        </Alert>
      )}

      {!isSenior && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: '12px' }}>
          تعریف و ویرایش تنخواه‌داران فقط توسط مدیر ارشد سیستم انجام می‌شود؛ شما تنها تعریف خودتان را می‌بینید.
        </Alert>
      )}

      <Paper sx={{ ...glass, p: 2, mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <ShieldIcon sx={{ color: COLOR_DARK }} />
          <Typography variant="subtitle1" fontWeight={800} sx={{ color: COLOR_DARK }}>
            کنترل دسترسی و محرمانگی
          </Typography>
        </Stack>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          با فعال بودن محدودسازی، هر تنخواه‌دار فقط تنخواه‌های خودش را می‌بیند و کمک‌تنخواه‌دار
          تنها تنخواه‌های تخصیص‌یافته و تنخواه‌های تنخواه‌دار مسئول را مشاهده می‌کند.
          مدیر ارشد سیستم و کاربران انتخاب‌شده در فهرست زیر، همهٔ تنخواه‌ها را می‌بینند.
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <FormControlLabel
              disabled={!isSenior}
              control={<Switch checked={!!currentVisibility} onChange={(e) => setVisibility(e.target.checked)} />}
              label={<Typography variant="body2" fontWeight={700}>محدودسازی دسترسی تنخواه‌داران</Typography>}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Autocomplete
              multiple disableCloseOnSelect
              disabled={!isSenior || !userList.length}
              options={userList}
              getOptionLabel={(u) => `${u.first_name || ''} ${u.last_name || ''} (${u.username})`.trim()}
              isOptionEqualToValue={(a, b) => String(a.id) === String(b.id)}
              value={userList.filter(u => currentSeniors.includes(String(u.id)))}
              onChange={(_, value) => setSeniorManagers(value.map(u => String(u.id)))}
              renderInput={(params) => (
                <TextField {...params} size="small" label="مدیران ارشد ناظر (دسترسی کامل)" placeholder="افزودن کاربر…" />
              )}
              renderOption={(props, option, { selected }) => (
                <li {...props} key={option.id}>
                  <Checkbox size="small" checked={selected} sx={{ mr: 1 }} />
                  {`${option.first_name || ''} ${option.last_name || ''} (${option.username})`}
                </li>
              )}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <Button fullWidth variant="contained" startIcon={<SaveIcon />} disabled={!isSenior || saveSettings.isPending}
              onClick={() => saveSettings.mutate({
                restrict_visibility: !!currentVisibility,
                senior_manager_ids: currentSeniors.map(Number),
              })}
              sx={{ background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, borderRadius: '12px' }}>
              ذخیره
            </Button>
          </Grid>
        </Grid>
        {!userList.length && (
          <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1 }}>
            فهرست کاربران برای شما قابل مشاهده نیست؛ محدودسازی را می‌توانید از همین صفحه خاموش/روشن کنید.
          </Typography>
        )}
      </Paper>


      <Paper sx={{ ...glass, p: 1.5 }}>
        {isLoading ? <Box textAlign="center" py={4}><CircularProgress /></Box> : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>پرسنل</TableCell><TableCell>کد پرسنلی</TableCell><TableCell>واحد</TableCell>
                  <TableCell>نقش</TableCell><TableCell>تنخواه‌دار مسئول</TableCell>
                  <TableCell>تنخواه‌های مجاز</TableCell><TableCell>دسترسی‌ها</TableCell>
                  <TableCell>کاربر سیستم</TableCell><TableCell>وضعیت</TableCell><TableCell>عملیات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {list.length === 0 ? (
                  <TableRow><TableCell colSpan={10} align="center">تعریفی ثبت نشده است</TableCell></TableRow>
                ) : list.map(row => (
                  <TableRow key={row.id} hover>
                    <TableCell sx={{ fontWeight: 700 }}>{row.employee_name}</TableCell>
                    <TableCell>{row.employee_code || '—'}</TableCell>
                    <TableCell>{row.department_name || '—'}</TableCell>
                    <TableCell>
                      <Chip size="small" label={row.role_display}
                        sx={{
                          bgcolor: `${ROLE_COLORS[row.role] || COLOR}18`,
                          color: ROLE_COLORS[row.role] || COLOR, fontWeight: 700,
                        }} />
                    </TableCell>
                    <TableCell>{row.supervisor_name || '—'}</TableCell>
                    <TableCell>
                      {row.funds_titles?.length
                        ? row.funds_titles.map(f => f.title).join('، ')
                        : <Typography variant="caption" color="textSecondary">تنخواه‌های خودش</Typography>}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {row.can_create_expense && <Chip size="small" label="ثبت هزینه" variant="outlined" />}
                        {row.can_approve && <Chip size="small" label="تأیید" color="success" variant="outlined" />}
                        {row.can_view_reports && <Chip size="small" label="گزارش" color="info" variant="outlined" />}
                      </Stack>
                    </TableCell>
                    <TableCell>{row.user_username || <Typography variant="caption" color="textSecondary">خودکار</Typography>}</TableCell>
                    <TableCell>
                      <Chip size="small" clickable={isSenior}
                        label={row.is_active === false ? 'غیرفعال' : 'فعال'}
                        color={row.is_active === false ? 'default' : 'success'}
                        onClick={() => isSenior && toggleActive.mutate({ id: row.id, is_active: row.is_active === false })}
                        sx={{ fontWeight: 700 }} />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="ویرایش">
                        <span>
                          <IconButton size="small" color="primary" disabled={!isSenior} onClick={() => openEdit(row)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>


      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle sx={{ fontWeight: 800, color: COLOR_DARK }}>
          {editing ? 'ویرایش تعریف تنخواه‌دار' : 'تعریف تنخواه‌دار جدید'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={6}>
              <Autocomplete
                options={employeeList}
                value={employeeOption(form.employee)}
                getOptionLabel={employeeLabel}
                isOptionEqualToValue={(a, b) => String(a.id) === String(b.id)}
                onChange={(_, value) => setForm(prev => ({ ...prev, employee: value?.id || null }))}
                renderInput={(params) => (
                  <TextField {...params} size="small" label="پرسنل" placeholder="جستجوی نام یا کد پرسنلی…" />
                )}
                disabled={!!editing}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField select fullWidth size="small" label="نقش" value={form.role}
                onChange={(e) => setForm(prev => ({ ...prev, role: e.target.value, supervisor: '' }))}>
                {ROLES.map(r => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
              </TextField>
            </Grid>
            {form.role === 'assistant' && (
              <Grid item xs={12} md={6}>
                <TextField select fullWidth size="small" label="تنخواه‌دار مسئول" value={form.supervisor}
                  onChange={(e) => setForm(prev => ({ ...prev, supervisor: e.target.value }))}>
                  <MenuItem value="">—</MenuItem>
                  {supervisors.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                </TextField>
              </Grid>
            )}
            <Grid item xs={12}>
              <Autocomplete
                multiple disableCloseOnSelect
                options={fundOptions}
                value={fundOptions.filter(f => form.funds.includes(String(f.id)))}
                getOptionLabel={(f) => `${f.code} · ${f.title}`}
                isOptionEqualToValue={(a, b) => String(a.id) === String(b.id)}
                onChange={(_, value) => setForm(prev => ({ ...prev, funds: value.map(f => String(f.id)) }))}
                renderInput={(params) => (
                  <TextField {...params} size="small"
                    label="تنخواه‌های مجاز (خالی = تنخواه‌هایی که خودش تنخواه‌دار آن‌ها است)" />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <Divider />
              <Grid container spacing={1} sx={{ mt: 0.5 }}>
                <Grid item xs={12} md={4}>
                  <FormControlLabel
                    control={<Switch checked={!!form.can_create_expense}
                      onChange={(e) => setForm(prev => ({ ...prev, can_create_expense: e.target.checked }))} />}
                    label={<Typography variant="body2">ثبت صورت هزینه</Typography>}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControlLabel
                    control={<Switch checked={!!form.can_approve}
                      onChange={(e) => setForm(prev => ({ ...prev, can_approve: e.target.checked }))} />}
                    label={<Typography variant="body2">تأیید صورت هزینه</Typography>}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControlLabel
                    control={<Switch checked={!!form.can_view_reports}
                      onChange={(e) => setForm(prev => ({ ...prev, can_view_reports: e.target.checked }))} />}
                    label={<Typography variant="body2">مشاهدهٔ گزارش‌ها</Typography>}
                  />
                </Grid>
              </Grid>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="توضیحات" value={form.note}
                onChange={(e) => setForm(prev => ({ ...prev, note: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <Alert severity="info" sx={{ borderRadius: '12px' }}>
                اتصال کاربر سیستم به‌صورت خودکار از پروندهٔ پرسنلی انجام می‌شود؛ اگر پرسنل به کاربری
                متصل نباشد، دسترسی تنخواه برای او فعال نمی‌شود.
              </Alert>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpen(false)} color="inherit">انصراف</Button>
          <Button variant="contained" onClick={submitForm} disabled={saveCustodian.isPending}
            sx={{ background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, borderRadius: '12px' }}>
            {saveCustodian.isPending ? <CircularProgress size={20} /> : 'ذخیره'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PettyCashDefinitionsPage;

