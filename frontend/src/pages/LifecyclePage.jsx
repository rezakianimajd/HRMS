import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Button, IconButton, Chip, Avatar, Grid,
  Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel,
  Select, MenuItem, TextField, CircularProgress, Stack, Checkbox, LinearProgress,
  Tooltip, Alert, Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import LogoutIcon from '@mui/icons-material/Logout';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import {
  useChecklists, useCreateChecklist, useToggleChecklistItem,
  useUpdateChecklist, useDeleteChecklist, useAddChecklistItem, useDeleteChecklistItem,
} from '../core/hooks/useLifecycle';
import { useEmployees } from '../core/hooks/useEmployees';
import { toPersianDigits } from '../core/utils/numberUtils';

const KIND_META = {
  onboarding: { label: 'ورود / خوش‌آمدگویی', color: '#10b981', icon: <PersonAddAlt1Icon fontSize="small" /> },
  offboarding: { label: 'خروج / تسویه', color: '#ef4444', icon: <LogoutIcon fontSize="small" /> },
};

const DEFAULT_ONBOARDING_ITEMS = [
  'تکمیل مدارک هویتی و قرارداد',
  'تحویل تجهیزات (لپ‌تاپ / موبایل / میز)',
  'تعریف دسترسی نرم‌افزارها',
  'معرفی به تیم و سرپرست',
];

const DEFAULT_OFFBOARDING_ITEMS = [
  'تحویل اموال و تجهیزات',
  'تسویه مالی (حقوق، وام، مساعده)',
  'تسویه مرخصی مانده',
  'غیرفعال‌سازی دسترسی‌ها',
];

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px',
    background: 'rgba(255,255,255,0.6)',
    '&:hover': { background: 'rgba(255,255,255,0.85)' },
    '&.Mui-focused': { background: '#fff', boxShadow: '0 0 0 4px rgba(139,92,246,0.12)' },
  },
};

const LifecyclePage = () => {
  const qc = useQueryClient();
  const [tab, setTab] = useState('onboarding');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ employee: '', kind: 'onboarding', items: [] });
  const [viewChecklist, setViewChecklist] = useState(null);
  const [editChecklist, setEditChecklist] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [customInput, setCustomInput] = useState('');
  const [msg, setMsg] = useState('');

  const { data, isLoading } = useChecklists({ kind: tab });
  const { data: employees } = useEmployees({ is_active: true });
  const empList = Array.isArray(employees) ? employees : employees?.results || [];

  const createMutation = useCreateChecklist();
  const toggleMutation = useToggleChecklistItem();
  const updateMutation = useUpdateChecklist();
  const deleteMutation = useDeleteChecklist();
  const addItemMutation = useAddChecklistItem();
  const deleteItemMutation = useDeleteChecklistItem();

  const items = Array.isArray(data) ? data : data?.results || [];

  const counts = {
    total: items.length,
    completed: items.filter(c => (c.progress ?? 0) >= 100).length,
    inProgress: items.filter(c => (c.progress ?? 0) > 0 && (c.progress ?? 0) < 100).length,
  };

  const openAdd = () => {
    const defaults = tab === 'onboarding' ? DEFAULT_ONBOARDING_ITEMS : DEFAULT_OFFBOARDING_ITEMS;
    setForm({ employee: '', kind: tab, items: [...defaults] });
    setCustomInput('');
    setOpen(true);
  };

  const toggleDefaultItem = (item) => {
    setForm((p) => {
      const exists = p.items.includes(item);
      return { ...p, items: exists ? p.items.filter((x) => x !== item) : [...p.items, item] };
    });
  };

  const addCustomItem = () => {
    const title = customInput.trim();
    if (!title) return;
    setForm(p => ({ ...p, items: [...p.items, title] }));
    setCustomInput('');
  };

  const removeCustomItem = (item) => {
    setForm(p => ({ ...p, items: p.items.filter(x => x !== item) }));
  };

  const doCreate = async () => {
    const finalItems = [...form.items];
    try {
      const checklist = await createMutation.mutateAsync({ employee: form.employee, kind: form.kind });
      const cid = checklist.id;
      for (const title of finalItems) {
        await axiosInstance.post('/checklist-items/', { checklist: cid, title });
      }
      qc.invalidateQueries({ queryKey: ['lifecycle-checklists'] });
      setOpen(false);
      setMsg('چک‌لیست ایجاد شد.');
      setTimeout(() => setMsg(''), 2500);
    } catch (e) {
      setMsg('خطا در ایجاد چک‌لیست');
      setTimeout(() => setMsg(''), 2500);
    }
  };

  const doAddItem = () => {
    const title = newItemTitle.trim();
    if (!title || !editChecklist) return;
    addItemMutation.mutate({ checklistId: editChecklist.id, title }, {
      onSuccess: () => { setNewItemTitle(''); },
    });
  };

  const doDeleteItem = (itemId) => {
    deleteItemMutation.mutate(itemId);
  };

  const doUpdateChecklist = () => {
    if (!editChecklist) return;
    updateMutation.mutate(
      { id: editChecklist.id, data: { employee: editChecklist.employee, kind: editChecklist.kind, progress_note: editChecklist.progress_note || '' } },
      {
        onSuccess: () => { setEditChecklist(null); setMsg('چک‌لیست ویرایش شد.'); setTimeout(() => setMsg(''), 2500); },
      }
    );
  };

  const doDelete = () => {
    deleteMutation.mutate(deleteId, {
      onSuccess: () => { setDeleteId(null); setMsg('چک‌لیست حذف شد.'); setTimeout(() => setMsg(''), 2500); },
    });
  };

  return (
    <Box>
      {/* Header */}
      <Paper sx={{
        p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        background: 'linear-gradient(120deg, rgba(139,92,246,0.10), rgba(236,72,153,0.05), rgba(255,255,255,0.3))',
        border: '1px solid rgba(139,92,246,0.16)', borderRadius: '12px',
      }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', boxShadow: '0 8px 24px rgba(139,92,246,0.35)' }}>
          <PlaylistAddCheckIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 220 }}>
          <Typography variant="h6" fontWeight={800} color="#6d28d9">ورود و خروج (Onboarding / Offboarding)</Typography>
          <Typography variant="body2" color="textSecondary">چک‌لیست ورود و خروج کارکنان به‌صورت گردش‌کار استاندارد و قابل انجام</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}
          sx={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', borderRadius: '10px', px: 2.5, whiteSpace: 'nowrap' }}>
          چک‌لیست جدید
        </Button>
      </Paper>

      {msg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}

      {/* KPI cards */}
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        {[
          { label: 'کل چک‌لیست‌ها', value: counts.total, color: '#8b5cf6' },
          { label: 'تکمیل‌شده', value: counts.completed, color: '#10b981' },
          { label: 'در حال انجام', value: counts.inProgress, color: '#f59e0b' },
        ].map(k => (
          <Grid item xs={6} sm={4} key={k.label}>
            <Paper sx={{
              p: 2, borderRadius: '16px', textAlign: 'center',
              background: `linear-gradient(160deg, ${k.color}16, rgba(255,255,255,0.7))`,
              border: `1px solid ${k.color}26`, boxShadow: `0 4px 16px ${k.color}0d`,
              transition: 'all 0.2s ease', '&:hover': { transform: 'translateY(-3px)', boxShadow: `0 14px 30px ${k.color}1f` },
            }}>
              <Typography variant="h4" fontWeight={900} sx={{ color: k.color, direction: 'ltr' }}>{toPersianDigits(k.value)}</Typography>
              <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700 }}>{k.label}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Tabs */}
      <Paper sx={{ p: 1, mb: 2, borderRadius: '12px', background: 'rgba(255,255,255,0.6)' }}>
        <Stack direction="row" spacing={1}>
          {Object.entries(KIND_META).map(([k, m]) => (
            <Button key={k} variant={tab === k ? 'contained' : 'outlined'} startIcon={m.icon}
              onClick={() => setTab(k)}
              sx={tab === k ? { background: `linear-gradient(135deg, ${m.color}, ${m.color}bb)`, borderRadius: '10px' } : { borderRadius: '10px' }}>
              {m.label}
            </Button>
          ))}
        </Stack>
      </Paper>

      {/* Checklists */}
      {isLoading ? (
        <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress /></Box>
      ) : items.length === 0 ? (
        <Paper sx={{ py: 6, textAlign: 'center', borderRadius: '12px', background: 'rgba(255,255,255,0.6)' }}>
          <PlaylistAddCheckIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1.5 }} />
          <Typography color="textSecondary">چک‌لیستی ثبت نشده است.</Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {items.map((c) => {
            const km = KIND_META[c.kind] || KIND_META.onboarding;
            const done = (c.items || []).filter((i) => i.is_completed).length;
            const total = (c.items || []).length;
            const pct = total ? Math.round((done / total) * 100) : 0;
            return (
              <Grid item xs={12} md={6} key={c.id}>
                <Paper sx={{ p: 2, borderRadius: '14px', background: 'rgba(255,255,255,0.6)', border: `1px solid ${km.color}25`, borderTop: `3px solid ${km.color}`, transition: 'all 0.2s ease', '&:hover': { boxShadow: '0 8px 24px rgba(139,92,246,0.12)' } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                      <CircularProgress variant="determinate" value={pct} size={56} thickness={5}
                        sx={{ color: km.color, '& .MuiCircularProgress-circle': { strokeLinecap: 'round' } }} />
                      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography variant="caption" fontWeight={800} sx={{ color: km.color }}>{toPersianDigits(pct)}٪</Typography>
                      </Box>
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body1" fontWeight={800} noWrap>{c.employee_name || `پرسنل #${c.employee}`}</Typography>
                      <Typography variant="caption" color="textSecondary" display="block">
                        {c.employee_code ? `${toPersianDigits(c.employee_code)} · ` : ''}{c.kind_display}
                      </Typography>
                      <Typography variant="caption" color="textSecondary" display="block">
                        {toPersianDigits(done)} از {toPersianDigits(total)} مورد انجام شده
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={0.25}>
                      <Tooltip title="مشاهده جزئیات">
                        <IconButton size="small" color="info" onClick={() => setViewChecklist(c)}><VisibilityIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title="ویرایش">
                        <IconButton size="small" color="primary" onClick={() => setEditChecklist({ id: c.id, employee: c.employee, kind: c.kind, progress_note: c.progress_note || '', items: c.items })}><EditIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title="حذف">
                        <IconButton size="small" color="error" onClick={() => setDeleteId(c.id)}><DeleteIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    </Stack>
                  </Box>

                  <LinearProgress variant="determinate" value={pct} sx={{ height: 6, borderRadius: '10px', mt: 1.5, mb: 1, bgcolor: `${km.color}15`, '& .MuiLinearProgress-bar': { bgcolor: km.color } }} />

                  <Stack spacing={0.25}>
                    {(c.items || []).map((it) => (
                      <Box key={it.id} onClick={() => toggleMutation.mutate({ checklistId: c.id, itemId: it.id })}
                        sx={{
                          display: 'flex', alignItems: 'center', gap: 1, py: 0.5, cursor: 'pointer',
                          borderRadius: '10px', px: 0.5, '&:hover': { background: `${km.color}0a` },
                        }}>
                        {it.is_completed ? (
                          <CheckCircleIcon fontSize="small" sx={{ color: km.color }} />
                        ) : (
                          <CheckBoxOutlineBlankIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                        )}
                        <Typography variant="body2" sx={{
                          textDecoration: it.is_completed ? 'line-through' : 'none',
                          color: it.is_completed ? 'text.secondary' : 'text.primary',
                        }}>
                          {it.title}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Create dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: '#6d28d9', borderBottom: '1px solid rgba(139,92,246,0.15)' }}>
          چک‌لیست جدید
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={2.5}>
            {/* بخش ۱: نوع چک‌لیست */}
            <Box>
              <Typography variant="subtitle2" fontWeight={800} color="#6d28d9" mb={1}>نوع چک‌لیست</Typography>
              <Grid container spacing={1.5}>
                {Object.entries(KIND_META).map(([k, m]) => {
                  const active = form.kind === k;
                  return (
                    <Grid item xs={12} sm={6} key={k}>
                      <Paper onClick={() => setForm(p => ({ ...p, kind: k, items: k === 'onboarding' ? [...DEFAULT_ONBOARDING_ITEMS] : [...DEFAULT_OFFBOARDING_ITEMS] }))}
                        sx={{
                          p: 1.75, cursor: 'pointer', borderRadius: '12px',
                          display: 'flex', alignItems: 'center', gap: 1.5,
                          border: active ? `2px solid ${m.color}` : '1px solid rgba(100,116,139,0.2)',
                          background: active ? `${m.color}14` : 'rgba(255,255,255,0.6)',
                          boxShadow: active ? `0 6px 20px ${m.color}30` : 'none',
                          transition: 'all 0.2s ease',
                        }}>
                        <Avatar sx={{ width: 40, height: 40, bgcolor: m.color }}>{m.icon}</Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" fontWeight={800} sx={{ color: active ? m.color : 'text.primary' }}>{m.label}</Typography>
                          <Typography variant="caption" color="textSecondary">
                            {k === 'onboarding' ? `${DEFAULT_ONBOARDING_ITEMS.length} مورد پیش‌فرض` : `${DEFAULT_OFFBOARDING_ITEMS.length} مورد پیش‌فرض`}
                          </Typography>
                        </Box>
                        {active && <CheckCircleIcon sx={{ color: m.color }} />}
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>

            <Divider />

            {/* بخش ۲: پرسنل */}
            <Box>
              <Typography variant="subtitle2" fontWeight={800} color="#6d28d9" mb={1}>پرسنل</Typography>
              <FormControl fullWidth size="small" sx={fieldSx}>
                <InputLabel>پرسنل *</InputLabel>
                <Select value={form.employee || ''} label="پرسنل *" onChange={(e) => setForm((p) => ({ ...p, employee: e.target.value }))}>
                  {empList.map((e) => <MenuItem key={e.id} value={e.id}>{e.full_name} ({e.employee_id})</MenuItem>)}
                </Select>
              </FormControl>
            </Box>

            <Divider />

            {/* بخش ۳: اقلام چک‌لیست */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle2" fontWeight={800} color="#6d28d9">اقلام چک‌لیست</Typography>
                <Chip size="small" label={`${toPersianDigits(form.items.length)} مورد`} sx={{ fontWeight: 800, bgcolor: 'rgba(139,92,246,0.1)', color: '#6d28d9' }} />
              </Box>

              {/* اقلام پیش‌فرض */}
              <Stack spacing={0.25}>
                {(form.kind === 'onboarding' ? DEFAULT_ONBOARDING_ITEMS : DEFAULT_OFFBOARDING_ITEMS).map((item) => {
                  const checked = form.items.includes(item);
                  return (
                    <Box key={item} onClick={() => toggleDefaultItem(item)}
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 1, py: 0.5, px: 0.5, cursor: 'pointer',
                        borderRadius: '10px', '&:hover': { background: 'rgba(139,92,246,0.06)' },
                      }}>
                      <Checkbox size="small" checked={checked} color="primary" onChange={() => toggleDefaultItem(item)} />
                      <Typography variant="body2" sx={{ textDecoration: !checked ? 'line-through' : 'none', color: checked ? 'text.primary' : 'text.disabled' }}>
                        {item}
                      </Typography>
                    </Box>
                  );
                })}
              </Stack>

              {/* اقلام سفارشی اضافه‌شده */}
              {form.items.filter(i => !(form.kind === 'onboarding' ? DEFAULT_ONBOARDING_ITEMS : DEFAULT_OFFBOARDING_ITEMS).includes(i)).map(item => (
                <Box key={item} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5, px: 0.5, borderRadius: '10px', background: 'rgba(236,72,153,0.05)', mt: 0.25 }}>
                  <Checkbox size="small" checked color="primary" onChange={() => removeCustomItem(item)} />
                  <Typography variant="body2" sx={{ flex: 1 }}>{item}</Typography>
                  <Tooltip title="حذف مورد">
                    <IconButton size="small" color="error" onClick={() => removeCustomItem(item)}><DeleteIcon fontSize="small" /></IconButton>
                  </Tooltip>
                </Box>
              ))}

              {/* افزودن مورد سفارشی */}
              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                <TextField size="small" fullWidth label="افزودن مورد سفارشی" value={customInput} sx={fieldSx}
                  onChange={(e) => setCustomInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomItem(); } }} />
                <Button variant="outlined" startIcon={<AddCircleIcon />} onClick={addCustomItem}
                  sx={{ borderRadius: '10px', whiteSpace: 'nowrap', color: '#ec4899', borderColor: '#ec4899' }}>افزودن</Button>
              </Box>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)}>انصراف</Button>
          <Button variant="contained" disabled={!form.employee || form.items.length === 0} onClick={doCreate}
            sx={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', borderRadius: '10px', px: 3 }}>
            ایجاد چک‌لیست ({toPersianDigits(form.items.length)} مورد)
          </Button>
        </DialogActions>
      </Dialog>


      {/* View dialog */}
      <Dialog open={!!viewChecklist} onClose={() => setViewChecklist(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: '#6d28d9', borderBottom: '1px solid rgba(139,92,246,0.15)' }}>جزئیات چک‌لیست</DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {viewChecklist && (() => {
            const km = KIND_META[viewChecklist.kind] || KIND_META.onboarding;
            const done = (viewChecklist.items || []).filter(i => i.is_completed).length;
            const total = (viewChecklist.items || []).length;
            return (
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar sx={{ width: 48, height: 48, bgcolor: km.color }}>{km.icon}</Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" fontWeight={800}>{viewChecklist.employee_name || `پرسنل #${viewChecklist.employee}`}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {viewChecklist.employee_code ? `${toPersianDigits(viewChecklist.employee_code)} · ` : ''}{viewChecklist.kind_display}
                    </Typography>
                  </Box>
                  <Chip size="small" label={`${toPersianDigits(done)}/${toPersianDigits(total)}`} sx={{ fontWeight: 800 }} />
                </Box>
                <LinearProgress variant="determinate" value={total ? Math.round((done / total) * 100) : 0} sx={{ height: 8, borderRadius: '10px', bgcolor: `${km.color}15`, '& .MuiLinearProgress-bar': { bgcolor: km.color } }} />
                <Divider />
                <Stack spacing={0.5}>
                  {(viewChecklist.items || []).map(it => (
                    <Box key={it.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {it.is_completed ? <CheckCircleIcon fontSize="small" sx={{ color: km.color }} /> : <CheckBoxOutlineBlankIcon fontSize="small" sx={{ color: 'text.disabled' }} />}
                      <Typography variant="body2" sx={{ textDecoration: it.is_completed ? 'line-through' : 'none' }}>{it.title}</Typography>
                    </Box>
                  ))}
                </Stack>
                {viewChecklist.progress_note && (
                  <>
                    <Divider />
                    <Box>
                      <Typography variant="caption" color="textSecondary" display="block">توضیح پیشرفت</Typography>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{viewChecklist.progress_note}</Typography>
                    </Box>
                  </>
                )}
              </Stack>
            );
          })()}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="contained" onClick={() => setViewChecklist(null)}
            sx={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', borderRadius: '10px', px: 3 }}>بستن</Button>
        </DialogActions>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editChecklist} onClose={() => setEditChecklist(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: '#6d28d9', borderBottom: '1px solid rgba(139,92,246,0.15)' }}>ویرایش چک‌لیست</DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {editChecklist && (
            <Stack spacing={2}>
              <FormControl fullWidth size="small" sx={fieldSx}>
                <InputLabel>نوع</InputLabel>
                <Select value={editChecklist.kind} label="نوع" onChange={(e) => setEditChecklist(p => ({ ...p, kind: e.target.value }))}>
                  {Object.entries(KIND_META).map(([k, m]) => <MenuItem key={k} value={k}>{m.label}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small" sx={fieldSx}>
                <InputLabel>پرسنل *</InputLabel>
                <Select value={editChecklist.employee || ''} label="پرسنل *" onChange={(e) => setEditChecklist(p => ({ ...p, employee: e.target.value }))}>
                  {empList.map((e) => <MenuItem key={e.id} value={e.id}>{e.full_name} ({e.employee_id})</MenuItem>)}
                </Select>
              </FormControl>
              <TextField size="small" fullWidth label="توضیح پیشرفت" multiline rows={2} value={editChecklist.progress_note || ''} sx={fieldSx}
                onChange={(e) => setEditChecklist(p => ({ ...p, progress_note: e.target.value }))} />

              <Divider />

              <Typography variant="subtitle2" fontWeight={800} color="#6d28d9">اقلام چک‌لیست</Typography>
              <Stack spacing={0.5}>
                {(editChecklist.items || []).map(it => (
                  <Box key={it.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ flex: 1 }}>{it.title}</Typography>
                    <Tooltip title="حذف مورد">
                      <IconButton size="small" color="error" onClick={() => doDeleteItem(it.id)}><DeleteIcon fontSize="small" /></IconButton>
                    </Tooltip>
                  </Box>
                ))}
              </Stack>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField size="small" fullWidth label="مورد جدید" value={newItemTitle} sx={fieldSx}
                  onChange={(e) => setNewItemTitle(e.target.value)} />
                <Button variant="outlined" startIcon={<AddCircleIcon />} onClick={doAddItem} sx={{ borderRadius: '10px', whiteSpace: 'nowrap' }}>افزودن</Button>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditChecklist(null)}>انصراف</Button>
          <Button variant="contained" onClick={doUpdateChecklist}
            sx={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', borderRadius: '10px', px: 3 }}>ذخیره تغییرات</Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: '#b91c1c', fontWeight: 800 }}>حذف چک‌لیست</DialogTitle>
        <DialogContent>
          <Typography variant="body2">آیا از حذف این چک‌لیست اطمینان دارید؟ همه اقلام آن نیز حذف می‌شوند.</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteId(null)}>انصراف</Button>
          <Button variant="contained" color="error" onClick={doDelete}>حذف</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LifecyclePage;





