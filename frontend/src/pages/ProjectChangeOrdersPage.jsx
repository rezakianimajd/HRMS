import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControl, Grid, IconButton, InputLabel, MenuItem, Paper, Select,
  Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField,
  Tooltip, Typography,
} from '@mui/material';
import HistoryEduIcon from '@mui/icons-material/HistoryEdu';
import AddIcon from '@mui/icons-material/Add';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import DeleteIcon from '@mui/icons-material/Delete';
import { formatPersianNumber, toPersianDigits } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';

const FONT = 'Vazirmatn, IRANSans, sans-serif';
const money = (v) => formatPersianNumber(v || 0);
const numSx = { direction: 'ltr', textAlign: 'center !important', whiteSpace: 'nowrap', fontFamily: FONT };
const headSx = {
  fontWeight: 800, whiteSpace: 'nowrap', fontSize: 12.5,
  textAlign: 'center !important', bgcolor: 'rgba(248,250,252,0.9)',
};
const STATUS_STYLE = {
  draft: { label: 'پیش‌نویس', color: '#64748b' },
  submitted: { label: 'در انتظار تأیید', color: '#f59e0b' },
  approved: { label: 'تأییدشده', color: '#10b981' },
  rejected: { label: 'رد شده', color: '#ef4444' },
  applied: { label: 'اعمال‌شده', color: '#8b5cf6' },
  cancelled: { label: 'لغو شده', color: '#94a3b8' },
};
const CAUSES = [
  ['owner', 'درخواست کارفرما'], ['design', 'تغییر طراحی'], ['site', 'شرایط کارگاه'],
  ['regulation', 'الزامات قانونی'], ['scope', 'تغییر دامنه'], ['other', 'سایر'],
];

const emptyForm = () => ({
  project: '', number: '', title: '', subject: '', cause: 'other',
  cost_impact: '', time_impact_days: '', request_date: '', description: '',
  lines: [{ description: '', unit: '', quantity: '', unit_price: '', amount: '' }],
});

const ProjectChangeOrdersPage = () => {
  const qc = useQueryClient();
  const [projectFilter, setProjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [message, setMessage] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState(emptyForm());

  const { data: projects } = useQuery({
    queryKey: ['co-projects'],
    queryFn: () => axiosInstance.get('/projects/', { params: { page_size: 500 } }).then(r => r.data),
  });
  const projectList = Array.isArray(projects) ? projects : projects?.results || [];

  const { data: rows, isLoading } = useQuery({
    queryKey: ['change-orders', projectFilter, statusFilter],
    queryFn: () => axiosInstance.get('/change-orders/', {
      params: {
        page_size: 300,
        project: projectFilter || undefined,
        status: statusFilter || undefined,
      },
    }).then(r => r.data),
  });
  const list = Array.isArray(rows) ? rows : rows?.results || [];

  const { data: summary } = useQuery({
    queryKey: ['change-orders-summary', projectFilter],
    queryFn: () => axiosInstance.get('/change-orders/summary/', {
      params: { project: projectFilter || undefined },
    }).then(r => r.data),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['change-orders'] });
    qc.invalidateQueries({ queryKey: ['change-orders-summary'] });
  };

  const createCo = useMutation({
    mutationFn: (payload) => axiosInstance.post('/change-orders/', payload).then(r => r.data),
    onSuccess: (data) => {
      setMessage({ type: 'success', text: `تغییر «${data.number}» ثبت شد.` });
      setCreateOpen(false);
      setForm(emptyForm());
      invalidate();
    },
    onError: (err) => setMessage({ type: 'error', text: err?.response?.data?.detail || 'ثبت تغییر ناموفق بود.' }),
  });

  const submitCo = useMutation({
    mutationFn: (id) => axiosInstance.post(`/change-orders/${id}/submit/`, {}).then(r => r.data),
    onSuccess: (data) => {
      setMessage({ type: 'success', text: `تغییر ${data.number} برای تأیید ارسال شد.` });
      invalidate();
    },
    onError: (err) => setMessage({ type: 'error', text: err?.response?.data?.detail || 'ارسال ناموفق بود.' }),
  });

  const decideCo = useMutation({
    mutationFn: ({ id, approve, comment }) => axiosInstance
      .post(`/change-orders/${id}/${approve ? 'approve' : 'reject'}/`, { comment: comment || '' })
      .then(r => r.data),
    onSuccess: (data) => {
      setMessage({
        type: 'success',
        text: `وضعیت تغییر ${data.number}: ${STATUS_STYLE[data.status]?.label || data.status}`,
      });
      invalidate();
    },
    onError: (err) => setMessage({ type: 'error', text: err?.response?.data?.detail || 'تصمیم ثبت نشد.' }),
  });

  const applyCo = useMutation({
    mutationFn: (id) => axiosInstance.post(`/change-orders/${id}/apply/`, { create_addendum: true }).then(r => r.data),
    onSuccess: (data) => {
      setMessage({
        type: 'success',
        text: `تغییر ${data.number} اعمال شد — ${toPersianDigits(data.budget_lines)} ردیف بودجه، `
          + `اثر زمانی ${toPersianDigits(data.time_impact_days)} روز`
          + (data.addendum_id ? '، الحاقیهٔ قرارداد ایجاد شد.' : '.'),
      });
      invalidate();
    },
    onError: (err) => setMessage({ type: 'error', text: err?.response?.data?.detail || 'اعمال تغییر ناموفق بود.' }),
  });

  const totals = useMemo(() => ({
    count: summary?.count ?? list.length,
    cost: summary?.total_cost_impact ?? 0,
    days: summary?.total_time_impact_days ?? 0,
    pending: summary?.pending_count ?? 0,
    applied: summary?.applied_count ?? 0,
  }), [summary, list]);

  const setLine = (index, patch) => setForm((prev) => ({
    ...prev,
    lines: prev.lines.map((line, i) => (i === index ? { ...line, ...patch } : line)),
  }));
  const addLine = () => setForm((prev) => ({
    ...prev,
    lines: [...prev.lines, { description: '', unit: '', quantity: '', unit_price: '', amount: '' }],
  }));
  const removeLine = (index) => setForm((prev) => ({
    ...prev, lines: prev.lines.filter((_, i) => i !== index),
  }));

  const saveCo = () => {
    const payload = {
      project: Number(form.project),
      number: form.number,
      title: form.title,
      subject: form.subject,
      cause: form.cause,
      cost_impact: Number(form.cost_impact || 0),
      time_impact_days: Number(form.time_impact_days || 0),
      request_date: form.request_date || null,
      description: form.description,
    };
    if (!payload.project || !payload.number || !payload.title) {
      setMessage({ type: 'error', text: 'پروژه، شمارهٔ تغییر و عنوان الزامی است.' });
      return;
    }
    const payloadLines = form.lines
      .filter((line) => line.description || line.amount || line.quantity)
      .map((line) => ({
        description: line.description || '',
        unit: line.unit || '',
        quantity: Number(line.quantity || 0),
        unit_price: Number(line.unit_price || 0),
        amount: Number(line.amount || (Number(line.quantity || 0) * Number(line.unit_price || 0))),
      }));
    createCo.mutate({ ...payload, lines: payloadLines });
  };

  return (
    <Box>
      <Paper sx={{
        p: 2.5, mb: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        background: 'linear-gradient(120deg, rgba(236,72,153,0.12), rgba(139,92,246,0.07), rgba(255,255,255,0.3))',
        border: '1px solid rgba(236,72,153,0.18)', borderRadius: '12px',
      }}>
        <HistoryEduIcon sx={{ fontSize: 40, color: '#be185d' }} />
        <Box sx={{ flex: 1, minWidth: 220 }}>
          <Typography variant="h6" fontWeight={800} color="#9d174d">تغییرات پروژه (Change Order)</Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 0.5 }} flexWrap="wrap" useFlexGap>
            <Chip size="small" label={`${toPersianDigits(totals.count)} تغییر`}
              sx={{ fontWeight: 700, bgcolor: 'rgba(236,72,153,0.12)', color: '#9d174d' }} />
            <Chip size="small" label={`جمع اثر ریالی: ${money(totals.cost)}`}
              sx={{ fontWeight: 700, bgcolor: 'rgba(139,92,246,0.12)', color: '#6d28d9' }} />
            <Chip size="small" label={`جمع اثر زمانی: ${toPersianDigits(totals.days)} روز`}
              sx={{ fontWeight: 700, bgcolor: 'rgba(14,165,233,0.12)', color: '#0369a1' }} />
            <Chip size="small" label={`در انتظار تأیید: ${toPersianDigits(totals.pending)}`}
              sx={{ fontWeight: 700, bgcolor: 'rgba(245,158,11,0.16)', color: '#b45309' }} />
            <Chip size="small" label={`اعمال‌شده: ${toPersianDigits(totals.applied)}`}
              color="success" sx={{ fontWeight: 700 }} />
          </Stack>
        </Box>
        <FormControl size="small" sx={{ minWidth: 230 }}>
          <InputLabel>پروژه</InputLabel>
          <Select value={projectFilter} label="پروژه" onChange={e => setProjectFilter(e.target.value)}>
            <MenuItem value="">همهٔ پروژه‌ها</MenuItem>
            {projectList.map(p => (
              <MenuItem key={p.id} value={String(p.id)}>{p.code} — {p.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 170 }}>
          <InputLabel>وضعیت</InputLabel>
          <Select value={statusFilter} label="وضعیت" onChange={e => setStatusFilter(e.target.value)}>
            <MenuItem value="">همه</MenuItem>
            {Object.entries(STATUS_STYLE).map(([key, meta]) => (
              <MenuItem key={key} value={key}>{meta.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}
          sx={{ borderRadius: '12px', background: 'linear-gradient(135deg,#ec4899,#8b5cf6)' }}>
          تغییر جدید
        </Button>
      </Paper>

      {message ? (
        <Alert severity={message.type} sx={{ mb: 2, borderRadius: '10px' }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      ) : null}

      <Paper sx={{ p: 1.5, borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.7)' }}>
        {isLoading ? (
          <Box textAlign="center" py={6}><CircularProgress /></Box>
        ) : list.length === 0 ? (
          <Typography variant="body2" color="textSecondary" textAlign="center" py={4} sx={{ fontFamily: FONT }}>
            تغییری ثبت نشده است.
          </Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={headSx}>شماره</TableCell>
                  <TableCell sx={headSx}>عنوان</TableCell>
                  <TableCell sx={headSx}>پروژه</TableCell>
                  <TableCell sx={headSx}>علت</TableCell>
                  <TableCell sx={headSx}>اثر ریالی</TableCell>
                  <TableCell sx={headSx}>اثر زمانی</TableCell>
                  <TableCell sx={headSx}>تاریخ درخواست</TableCell>
                  <TableCell sx={headSx}>وضعیت</TableCell>
                  <TableCell sx={headSx}>اقدامات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {list.map((row) => {
                  const meta = STATUS_STYLE[row.status] || { label: row.status, color: '#64748b' };
                  const causeLabel = (CAUSES.find(([key]) => key === row.cause) || [null, row.cause])[1];
                  return (
                    <TableRow key={row.id} hover>
                      <TableCell sx={{ ...numSx, fontWeight: 800 }}>{toPersianDigits(row.number)}</TableCell>
                      <TableCell sx={{ fontFamily: FONT, maxWidth: 260 }}>
                        <Typography variant="body2" fontWeight={700} sx={{ fontFamily: FONT }}>{row.title}</Typography>
                        {row.subject ? (
                          <Typography variant="caption" color="textSecondary" sx={{ fontFamily: FONT }}>
                            {row.subject}
                          </Typography>
                        ) : null}
                      </TableCell>
                      <TableCell sx={{ fontFamily: FONT }}>{row.project_code || row.project_name}</TableCell>
                      <TableCell sx={{ fontFamily: FONT }}>{causeLabel}</TableCell>
                      <TableCell sx={{ ...numSx, fontWeight: 700 }}>{money(row.cost_impact)}</TableCell>
                      <TableCell sx={numSx}>{toPersianDigits(row.time_impact_days)} روز</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{toJalali(row.request_date)}</TableCell>
                      <TableCell>
                        <Chip size="small" label={meta.label}
                          sx={{ fontFamily: FONT, fontWeight: 700, bgcolor: `${meta.color}1a`, color: meta.color }} />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.25} justifyContent="center" alignItems="center">
                          {row.status === 'draft' ? (
                            <Tooltip title="ارسال برای تأیید">
                              <IconButton size="small" onClick={() => submitCo.mutate(row.id)}>
                                <SendIcon fontSize="small" sx={{ color: '#f59e0b' }} />
                              </IconButton>
                            </Tooltip>
                          ) : null}
                          {row.status === 'submitted' ? (
                            <React.Fragment>
                              <Tooltip title="تأیید">
                                <IconButton size="small" onClick={() => decideCo.mutate({
                                  id: row.id, approve: true, comment: 'تأیید',
                                })}>
                                  <CheckCircleIcon fontSize="small" sx={{ color: '#10b981' }} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="رد">
                                <IconButton size="small" onClick={() => decideCo.mutate({
                                  id: row.id, approve: false, comment: 'رد شد',
                                })}>
                                  <CancelIcon fontSize="small" sx={{ color: '#ef4444' }} />
                                </IconButton>
                              </Tooltip>
                            </React.Fragment>
                          ) : null}
                          {row.status === 'approved' && !row.applied ? (
                            <Tooltip title="اعمال تغییر (بودجه + زمان + الحاقیه)">
                              <IconButton size="small" onClick={() => applyCo.mutate(row.id)}>
                                <PlaylistAddCheckIcon fontSize="small" sx={{ color: '#8b5cf6' }} />
                              </IconButton>
                            </Tooltip>
                          ) : null}
                          <Button size="small" onClick={() => setDetail(row)}
                            sx={{ fontFamily: FONT, minWidth: 0 }}>
                            جزئیات
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

      </Paper>
      {/* ---------- دیالوگ ثبت تغییر ---------- */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontFamily: FONT, fontWeight: 800 }}>ثبت تغییر پروژه</DialogTitle>
        <DialogContent sx={{ mt: 1 }}>
          <Grid container spacing={1.5}>
            <Grid item xs={12} md={4}>
              <FormControl size="small" fullWidth>
                <InputLabel>پروژه *</InputLabel>
                <Select value={form.project} label="پروژه *"
                  onChange={e => setForm(p => ({ ...p, project: e.target.value }))}>
                  {projectList.map(p => (
                    <MenuItem key={p.id} value={String(p.id)}>{p.code} — {p.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField size="small" fullWidth label="شمارهٔ تغییر *" value={form.number}
                onChange={e => setForm(p => ({ ...p, number: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl size="small" fullWidth>
                <InputLabel>علت</InputLabel>
                <Select value={form.cause} label="علت"
                  onChange={e => setForm(p => ({ ...p, cause: e.target.value }))}>
                  {CAUSES.map(([key, label]) => <MenuItem key={key} value={key}>{label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={8}>
              <TextField size="small" fullWidth label="عنوان تغییر *" value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={4}>
              <JalaliDatePicker fullWidth label="تاریخ درخواست" value={form.request_date}
                onChange={(g) => setForm(p => ({ ...p, request_date: g }))} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField size="small" fullWidth label="اثر ریالی (ریال)" value={form.cost_impact}
                onChange={e => setForm(p => ({ ...p, cost_impact: e.target.value }))}
                inputProps={{ style: { direction: 'ltr', textAlign: 'center' } }} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField size="small" fullWidth label="اثر زمانی (روز)" value={form.time_impact_days}
                onChange={e => setForm(p => ({ ...p, time_impact_days: e.target.value }))}
                inputProps={{ style: { direction: 'ltr', textAlign: 'center' } }} />
            </Grid>
            <Grid item xs={12}>
              <TextField size="small" fullWidth label="موضوع" value={form.subject}
                onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField size="small" fullWidth multiline rows={2} label="شرح تغییر" value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            </Grid>
          </Grid>

          <Typography variant="subtitle2" fontWeight={800} sx={{ mt: 2, mb: 0.75, fontFamily: FONT }}>
            خطوط اثر (اختیاری — در زمان اعمال، ردیف بودجه ساخته می‌شود)
          </Typography>
          {form.lines.map((line, index) => (
            <Stack key={index} direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 1 }}>
              <TextField size="small" fullWidth label="شرح" value={line.description}
                onChange={e => setLine(index, { description: e.target.value })} />
              <TextField size="small" sx={{ width: 110 }} label="واحد" value={line.unit}
                onChange={e => setLine(index, { unit: e.target.value })} />
              <TextField size="small" sx={{ width: 120 }} label="مقدار" value={line.quantity}
                onChange={e => setLine(index, { quantity: e.target.value })}
                inputProps={{ style: { direction: 'ltr', textAlign: 'center' } }} />
              <TextField size="small" sx={{ width: 140 }} label="نرخ واحد" value={line.unit_price}
                onChange={e => setLine(index, { unit_price: e.target.value })}
                inputProps={{ style: { direction: 'ltr', textAlign: 'center' } }} />
              <TextField size="small" sx={{ width: 150 }} label="مبلغ" value={line.amount}
                onChange={e => setLine(index, { amount: e.target.value })}
                inputProps={{ style: { direction: 'ltr', textAlign: 'center' } }} />
              <IconButton size="small" onClick={() => removeLine(index)}>
                <DeleteIcon fontSize="small" sx={{ color: '#ef4444' }} />
              </IconButton>
            </Stack>
          ))}
          <Button size="small" startIcon={<AddIcon />} onClick={addLine} sx={{ fontFamily: FONT }}>
            افزودن خط
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)} sx={{ fontFamily: FONT }}>انصراف</Button>
          <Button variant="contained" onClick={saveCo} disabled={createCo.isPending}
            sx={{ fontFamily: FONT, background: 'linear-gradient(135deg,#ec4899,#8b5cf6)' }}>
            ثبت تغییر
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---------- دیالوگ جزئیات و گردش تغییر ---------- */}
      <Dialog open={Boolean(detail)} onClose={() => setDetail(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontFamily: FONT, fontWeight: 800 }}>
          {detail ? `${detail.number} — ${detail.title}` : ''}
        </DialogTitle>
        <DialogContent>
          {detail ? (
            <Box>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
                <Chip size="small" label={(STATUS_STYLE[detail.status] || {}).label || detail.status}
                  sx={{
                    fontWeight: 700,
                    bgcolor: `${(STATUS_STYLE[detail.status] || {}).color || '#64748b'}1a`,
                    color: (STATUS_STYLE[detail.status] || {}).color || '#64748b',
                  }} />
                <Chip size="small" label={`پروژه: ${detail.project_code || detail.project_name}`}
                  sx={{ fontWeight: 700 }} />
                <Chip size="small" label={`اثر ریالی: ${money(detail.cost_impact)}`}
                  sx={{ fontWeight: 700, bgcolor: 'rgba(139,92,246,0.12)', color: '#6d28d9' }} />
                <Chip size="small" label={`اثر زمانی: ${toPersianDigits(detail.time_impact_days)} روز`}
                  sx={{ fontWeight: 700, bgcolor: 'rgba(14,165,233,0.12)', color: '#0369a1' }} />
                <Chip size="small" label={`درخواست: ${toJalali(detail.request_date)}`} sx={{ fontWeight: 700 }} />
                {detail.decided_date ? (
                  <Chip size="small" label={`تصمیم: ${toJalali(detail.decided_date)}`} sx={{ fontWeight: 700 }} />
                ) : null}
                {detail.applied ? <Chip size="small" color="success" label="اعمال‌شده" /> : null}
              </Stack>

              {detail.description ? (
                <Typography variant="body2" sx={{ fontFamily: FONT, mb: 1.5 }}>{detail.description}</Typography>
              ) : null}

              <Typography variant="subtitle2" fontWeight={800} sx={{ fontFamily: FONT, mb: 0.5 }}>
                خطوط اثر
              </Typography>
              {(detail.lines || []).length === 0 ? (
                <Typography variant="caption" color="textSecondary" sx={{ fontFamily: FONT }}>
                  خطی ثبت نشده است.
                </Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={headSx}>شرح</TableCell>
                      <TableCell sx={headSx}>واحد</TableCell>
                      <TableCell sx={headSx}>مقدار</TableCell>
                      <TableCell sx={headSx}>نرخ واحد</TableCell>
                      <TableCell sx={headSx}>مبلغ</TableCell>
                      <TableCell sx={headSx}>WBS</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(detail.lines || []).map((line) => (
                      <TableRow key={line.id}>
                        <TableCell sx={{ fontFamily: FONT }}>{line.description || '—'}</TableCell>
                        <TableCell sx={{ fontFamily: FONT }}>{line.unit || '—'}</TableCell>
                        <TableCell sx={numSx}>{toPersianDigits(line.quantity)}</TableCell>
                        <TableCell sx={numSx}>{money(line.unit_price)}</TableCell>
                        <TableCell sx={{ ...numSx, fontWeight: 700 }}>{money(line.amount)}</TableCell>
                        <TableCell sx={{ fontFamily: FONT }}>{line.wbs_name || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              <Typography variant="subtitle2" fontWeight={800} sx={{ fontFamily: FONT, mt: 2, mb: 0.5 }}>
                گردش تغییر
              </Typography>
              {(detail.approvals || []).length === 0 ? (
                <Typography variant="caption" color="textSecondary" sx={{ fontFamily: FONT }}>
                  گردشی ثبت نشده است.
                </Typography>
              ) : (
                <Stack spacing={0.75}>
                  {(detail.approvals || []).map((row) => (
                    <Paper key={row.id} sx={{ p: 1, borderRadius: '10px', bgcolor: 'rgba(139,92,246,0.06)' }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip size="small" label={row.action_display} sx={{ fontWeight: 700 }} />
                        <Typography variant="caption" sx={{ fontFamily: FONT }}>
                          {row.actor_name || 'سیستم'}
                        </Typography>
                        <Box sx={{ flex: 1 }} />
                        <Typography variant="caption" color="textSecondary" sx={{ fontFamily: FONT }}>
                          {row.created_jalali || toJalali((row.created_at || '').slice(0, 10))}
                        </Typography>
                      </Stack>
                      {row.comment ? (
                        <Typography variant="caption" sx={{ fontFamily: FONT, display: 'block', mt: 0.25 }}>
                          {row.comment}
                        </Typography>
                      ) : null}
                    </Paper>
                  ))}
                </Stack>
              )}
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetail(null)} sx={{ fontFamily: FONT }}>بستن</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default ProjectChangeOrdersPage;
