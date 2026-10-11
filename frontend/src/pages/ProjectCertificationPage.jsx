import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControl, Grid, IconButton, InputLabel, MenuItem, Paper, Select,
  Stack, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Tabs, TextField, Tooltip, Typography,
} from '@mui/material';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import AddIcon from '@mui/icons-material/Add';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import VerifiedIcon from '@mui/icons-material/Verified';
import PaymentsIcon from '@mui/icons-material/Payments';
import PostAddIcon from '@mui/icons-material/PostAdd';
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
const SHEET_STATUS = {
  draft: { label: 'پیش‌نویس', color: '#64748b' },
  submitted: { label: 'ارسال‌شده', color: '#f59e0b' },
  checked: { label: 'تأیید مشاور', color: '#0ea5e9' },
  approved: { label: 'تأیید کارفرما', color: '#10b981' },
  rejected: { label: 'رد شده', color: '#ef4444' },
  certified: { label: 'گواهی‌شده', color: '#8b5cf6' },
  cancelled: { label: 'لغو شده', color: '#94a3b8' },
};
const CERT_STATUS = {
  draft: { label: 'پیش‌نویس', color: '#64748b' },
  issued: { label: 'صادرشده', color: '#0ea5e9' },
  paid: { label: 'پرداخت‌شده', color: '#10b981' },
  cancelled: { label: 'لغو شده', color: '#94a3b8' },
};
const KIND_LABELS = {
  labor: 'حقوق و دستمزد', equipment: 'ماشین‌آلات و تجهیزات',
  material: 'مواد و مصالح', other: 'سایر',
};

const emptySheet = () => ({
  project: '', contract: '', number: '', title: '', description: '', date: '',
  period_from: '', period_to: '', retention_percent: '', insurance_amount: '',
  tax_amount: '', other_deductions: '',
  lines: [{ description: '', unit: '', unit_price: '', previous_quantity: '', current_quantity: '', amount: '' }],
});

const emptyAllocation = () => ({
  project: '', wbs: '', kind: 'labor', title: '', date: '', quantity: '', unit: 'ساعت', rate: '', amount: '',
});

const ProjectCertificationPage = () => {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const projectId = params.get('project') || '';
  const [tab, setTab] = useState(0);
  const [message, setMessage] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetForm, setSheetForm] = useState(emptySheet());
  const [allocOpen, setAllocOpen] = useState(false);
  const [allocForm, setAllocForm] = useState(emptyAllocation());

  const { data: projects } = useQuery({
    queryKey: ['cert-projects'],
    queryFn: () => axiosInstance.get('/projects/', { params: { page_size: 500 } }).then(r => r.data),
  });
  const projectList = Array.isArray(projects) ? projects : projects?.results || [];

  useEffect(() => {
    if (!projectId && projectList.length) {
      setParams({ project: String(projectList[0].id) }, { replace: true });
    }
  }, [projectId, projectList, setParams]);

  const { data: contracts } = useQuery({
    queryKey: ['cert-contracts', projectId],
    queryFn: () => axiosInstance.get('/external-contracts/', { params: { project: projectId, page_size: 200 } }).then(r => r.data),
    enabled: !!projectId,
  });
  const contractList = Array.isArray(contracts) ? contracts : contracts?.results || [];

  const { data: sheets, isLoading: loadingSheets } = useQuery({
    queryKey: ['measurement-sheets', projectId],
    queryFn: () => axiosInstance.get('/measurement-sheets/', { params: { project: projectId, page_size: 300 } }).then(r => r.data),
    enabled: !!projectId,
  });
  const sheetList = Array.isArray(sheets) ? sheets : sheets?.results || [];

  const { data: certificates } = useQuery({
    queryKey: ['payment-certificates', projectId],
    queryFn: () => axiosInstance.get('/payment-certificates/', { params: { project: projectId, page_size: 300 } }).then(r => r.data),
    enabled: !!projectId,
  });
  const certList = Array.isArray(certificates) ? certificates : certificates?.results || [];

  const { data: allocations } = useQuery({
    queryKey: ['cost-allocations', projectId],
    queryFn: () => axiosInstance.get('/cost-allocations/', { params: { project: projectId, page_size: 300 } }).then(r => r.data),
    enabled: !!projectId,
  });
  const allocList = Array.isArray(allocations) ? allocations : allocations?.results || [];

  const { data: allocSummary } = useQuery({
    queryKey: ['cost-allocations-summary', projectId],
    queryFn: () => axiosInstance.get('/cost-allocations/summary/', { params: { project: projectId } }).then(r => r.data),
    enabled: !!projectId,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['measurement-sheets'] });
    qc.invalidateQueries({ queryKey: ['payment-certificates'] });
    qc.invalidateQueries({ queryKey: ['cost-allocations'] });
    qc.invalidateQueries({ queryKey: ['cost-allocations-summary'] });
  };

  const createSheet = useMutation({
    mutationFn: (payload) => axiosInstance.post('/measurement-sheets/', payload).then(r => r.data),
    onSuccess: (data) => {
      setMessage({
        type: 'success',
        text: `صورتجلسهٔ ${data.number} ثبت شد — جمع کارکرد ${money(data.gross_amount)}، قابل پرداخت ${money(data.net_amount)}`,
      });
      setSheetOpen(false);
      setSheetForm(emptySheet());
      invalidate();
    },
    onError: (err) => setMessage({ type: 'error', text: err?.response?.data?.detail || 'ثبت صورتجلسه ناموفق بود.' }),
  });

  const sheetAction = useMutation({
    mutationFn: ({ id, action, note }) => axiosInstance
      .post(`/measurement-sheets/${id}/${action}/`, { note: note || '' }).then(r => r.data),
    onSuccess: (data) => {
      setMessage({
        type: 'success',
        text: `وضعیت صورتجلسهٔ ${data.number}: ${(SHEET_STATUS[data.status] || {}).label || data.status}`,
      });
      invalidate();
    },
    onError: (err) => setMessage({ type: 'error', text: err?.response?.data?.detail || 'عملیات ناموفق بود.' }),
  });

  const certifySheet = useMutation({
    mutationFn: (id) => axiosInstance.post(`/measurement-sheets/${id}/certify/`, {}).then(r => r.data),
    onSuccess: (data) => {
      setMessage({
        type: 'success',
        text: `گواهی ${data.number} صادر شد — قابل پرداخت ${money(data.net_payable)}`
          + (data.statement ? ' و صورت‌وضعیت قرارداد ساخته شد.' : '.'),
      });
      invalidate();
    },
    onError: (err) => setMessage({ type: 'error', text: err?.response?.data?.detail || 'صدور گواهی ناموفق بود.' }),
  });

  const certAction = useMutation({
    mutationFn: ({ id, action, body }) => axiosInstance
      .post(`/payment-certificates/${id}/${action}/`, body || {}).then(r => r.data),
    onSuccess: (data, variables) => {
      setMessage({
        type: 'success',
        text: variables.action === 'pay'
          ? `پرداخت گواهی ${data.number} ثبت شد (پرداخت‌شده: ${money(data.paid_amount)})`
          : `گواهی ${data.number} صادر شد.`,
      });
      invalidate();
    },
    onError: (err) => setMessage({ type: 'error', text: err?.response?.data?.detail || 'عملیات گواهی ناموفق بود.' }),
  });

  const createAllocation = useMutation({
    mutationFn: (payload) => axiosInstance.post('/cost-allocations/', payload).then(r => r.data),
    onSuccess: (data) => {
      setMessage({ type: 'success', text: `تخصیص «${data.title}» ثبت شد.` });
      setAllocOpen(false);
      setAllocForm(emptyAllocation());
      invalidate();
    },
    onError: (err) => setMessage({ type: 'error', text: err?.response?.data?.detail || 'ثبت تخصیص ناموفق بود.' }),
  });

  const postAllocation = useMutation({
    mutationFn: (id) => axiosInstance.post(`/cost-allocations/${id}/post/`, {}).then(r => r.data),
    onSuccess: (data) => {
      setMessage({ type: 'success', text: `تخصیص در تراکنش هزینهٔ ${data.number} ثبت شد.` });
      invalidate();
    },
    onError: (err) => setMessage({ type: 'error', text: err?.response?.data?.detail || 'ثبت هزینه ناموفق بود.' }),
  });

  const setSheetLine = (index, patch) => setSheetForm((prev) => ({
    ...prev, lines: prev.lines.map((line, i) => (i === index ? { ...line, ...patch } : line)),
  }));
  const addSheetLine = () => setSheetForm((prev) => ({
    ...prev,
    lines: [...prev.lines, { description: '', unit: '', unit_price: '', previous_quantity: '', current_quantity: '', amount: '' }],
  }));
  const removeSheetLine = (index) => setSheetForm((prev) => ({
    ...prev, lines: prev.lines.filter((_, i) => i !== index),
  }));

  const saveSheet = () => {
    if (!sheetForm.project || !sheetForm.number) {
      setMessage({ type: 'error', text: 'پروژه و شمارهٔ صورتجلسه الزامی است.' });
      return;
    }
    const lines = sheetForm.lines
      .filter((line) => line.description || line.current_quantity || line.amount)
      .map((line) => ({
        description: line.description || '',
        unit: line.unit || '',
        unit_price: Number(line.unit_price || 0),
        previous_quantity: Number(line.previous_quantity || 0),
        current_quantity: Number(line.current_quantity || 0),
        cumulative_quantity: Number(line.previous_quantity || 0) + Number(line.current_quantity || 0),
        amount: Number(line.amount || (Number(line.current_quantity || 0) * Number(line.unit_price || 0))),
      }));
    createSheet.mutate({
      project: Number(sheetForm.project),
      contract: sheetForm.contract ? Number(sheetForm.contract) : null,
      number: sheetForm.number,
      title: sheetForm.title,
      description: sheetForm.description,
      date: sheetForm.date || null,
      period_from: sheetForm.period_from || null,
      period_to: sheetForm.period_to || null,
      retention_percent: Number(sheetForm.retention_percent || 0),
      insurance_amount: Number(sheetForm.insurance_amount || 0),
      tax_amount: Number(sheetForm.tax_amount || 0),
      other_deductions: Number(sheetForm.other_deductions || 0),
      lines,
    });
  };

  const saveAllocation = () => {
    if (!allocForm.project || !allocForm.title || !allocForm.date) {
      setMessage({ type: 'error', text: 'پروژه، عنوان و تاریخ الزامی است.' });
      return;
    }
    createAllocation.mutate({
      project: Number(allocForm.project),
      wbs: allocForm.wbs ? Number(allocForm.wbs) : null,
      kind: allocForm.kind,
      title: allocForm.title,
      date: allocForm.date,
      quantity: Number(allocForm.quantity || 0),
      unit: allocForm.unit || '',
      rate: Number(allocForm.rate || 0),
      amount: Number(allocForm.amount || (Number(allocForm.quantity || 0) * Number(allocForm.rate || 0))),
    });
  };

  return (
    <Box>
      <Paper sx={{
        p: 2.5, mb: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        background: 'linear-gradient(120deg, rgba(16,185,129,0.12), rgba(139,92,246,0.07), rgba(255,255,255,0.3))',
        border: '1px solid rgba(16,185,129,0.18)', borderRadius: '12px',
      }}>
        <FactCheckIcon sx={{ fontSize: 40, color: '#047857' }} />
        <Box sx={{ flex: 1, minWidth: 220 }}>
          <Typography variant="h6" fontWeight={800} color="#065f46">
            صورتجلسات اندازه‌گیری، گواهی پرداخت و تخصیص هزینه
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 0.5 }} flexWrap="wrap" useFlexGap>
            <Chip size="small" label={`${toPersianDigits(sheetList.length)} صورتجلسه`}
              sx={{ fontWeight: 700, bgcolor: 'rgba(16,185,129,0.12)', color: '#047857' }} />
            <Chip size="small" label={`${toPersianDigits(certList.length)} گواهی`}
              sx={{ fontWeight: 700, bgcolor: 'rgba(139,92,246,0.12)', color: '#6d28d9' }} />
            <Chip size="small" label={`جمع تخصیص‌ها: ${money(allocSummary?.total)}`}
              sx={{ fontWeight: 700, bgcolor: 'rgba(14,165,233,0.12)', color: '#0369a1' }} />
            <Chip size="small" label={`ثبت‌نشده در هزینه: ${toPersianDigits(allocSummary?.pending_count || 0)}`}
              color={(allocSummary?.pending_count || 0) ? 'warning' : 'success'} sx={{ fontWeight: 700 }} />
          </Stack>
        </Box>
        <FormControl size="small" sx={{ minWidth: 250 }}>
          <InputLabel>پروژه</InputLabel>
          <Select value={projectId} label="پروژه" onChange={e => setParams({ project: e.target.value })}>
            {projectList.map(p => (
              <MenuItem key={p.id} value={String(p.id)}>{p.code} — {p.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        {tab === 0 ? (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setSheetOpen(true)}
            sx={{ borderRadius: '12px', background: 'linear-gradient(135deg,#10b981,#0ea5e9)' }}>
            صورتجلسهٔ جدید
          </Button>
        ) : tab === 2 ? (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAllocOpen(true)}
            sx={{ borderRadius: '12px', background: 'linear-gradient(135deg,#0ea5e9,#8b5cf6)' }}>
            تخصیص هزینه
          </Button>
        ) : null}
      </Paper>

      {message ? (
        <Alert severity={message.type} sx={{ mb: 2, borderRadius: '10px' }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      ) : null}

      <Paper sx={{ p: 1, mb: 1.5, borderRadius: '12px' }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} variant="scrollable" scrollButtons="auto"
          sx={{ '& .MuiTab-root': { fontFamily: FONT, fontWeight: 700, fontSize: 13.5 } }}>
          <Tab label={`صورتجلسات اندازه‌گیری (${toPersianDigits(sheetList.length)})`} />
          <Tab label={`گواهی‌های پرداخت (${toPersianDigits(certList.length)})`} />
          <Tab label={`تخصیص هزینهٔ منابع (${toPersianDigits(allocList.length)})`} />
        </Tabs>
      </Paper>
      {tab === 0 && (
        <Paper sx={{ p: 1.5, borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.7)' }}>
          {loadingSheets ? (
            <Box textAlign="center" py={6}><CircularProgress /></Box>
          ) : sheetList.length === 0 ? (
            <Typography variant="body2" color="textSecondary" textAlign="center" py={4} sx={{ fontFamily: FONT }}>
              صورتجلسه‌ای ثبت نشده است.
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={headSx}>شماره</TableCell>
                    <TableCell sx={headSx}>عنوان</TableCell>
                    <TableCell sx={headSx}>تاریخ</TableCell>
                    <TableCell sx={headSx}>جمع کارکرد</TableCell>
                    <TableCell sx={headSx}>حسن انجام کار</TableCell>
                    <TableCell sx={headSx}>کسورات دیگر</TableCell>
                    <TableCell sx={headSx}>قابل پرداخت</TableCell>
                    <TableCell sx={headSx}>وضعیت</TableCell>
                    <TableCell sx={headSx}>گردش کار</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sheetList.map((row) => {
                    const meta = SHEET_STATUS[row.status] || { label: row.status, color: '#64748b' };
                    const otherDeductions = Number(row.insurance_amount || 0)
                      + Number(row.tax_amount || 0) + Number(row.other_deductions || 0);
                    return (
                      <TableRow key={row.id} hover>
                        <TableCell sx={{ ...numSx, fontWeight: 800 }}>{toPersianDigits(row.number)}</TableCell>
                        <TableCell sx={{ fontFamily: FONT, maxWidth: 240 }}>{row.title || '—'}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          {row.date_jalali || toJalali(row.date)}
                        </TableCell>
                        <TableCell sx={{ ...numSx, fontWeight: 700 }}>{money(row.gross_amount)}</TableCell>
                        <TableCell sx={numSx}>{money(row.retention_amount)}</TableCell>
                        <TableCell sx={numSx}>{money(otherDeductions)}</TableCell>
                        <TableCell sx={{ ...numSx, fontWeight: 800, color: '#047857' }}>
                          {money(row.net_amount)}
                        </TableCell>
                        <TableCell>
                          <Chip size="small" label={meta.label}
                            sx={{ fontFamily: FONT, fontWeight: 700, bgcolor: `${meta.color}1a`, color: meta.color }} />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.25} justifyContent="center">
                            {row.status === 'draft' ? (
                              <Tooltip title="ارسال">
                                <IconButton size="small"
                                  onClick={() => sheetAction.mutate({ id: row.id, action: 'submit' })}>
                                  <SendIcon fontSize="small" sx={{ color: '#f59e0b' }} />
                                </IconButton>
                              </Tooltip>
                            ) : null}
                            {row.status === 'submitted' ? (
                              <Tooltip title="تأیید مشاور">
                                <IconButton size="small"
                                  onClick={() => sheetAction.mutate({ id: row.id, action: 'check' })}>
                                  <CheckCircleIcon fontSize="small" sx={{ color: '#0ea5e9' }} />
                                </IconButton>
                              </Tooltip>
                            ) : null}
                            {row.status === 'checked' ? (
                              <Tooltip title="تأیید کارفرما">
                                <IconButton size="small"
                                  onClick={() => sheetAction.mutate({ id: row.id, action: 'approve' })}>
                                  <CheckCircleIcon fontSize="small" sx={{ color: '#10b981' }} />
                                </IconButton>
                              </Tooltip>
                            ) : null}
                            {(row.status === 'submitted' || row.status === 'checked') ? (
                              <Tooltip title="رد">
                                <IconButton size="small" onClick={() => sheetAction.mutate({
                                  id: row.id, action: 'reject', note: 'رد شد',
                                })}>
                                  <CancelIcon fontSize="small" sx={{ color: '#ef4444' }} />
                                </IconButton>
                              </Tooltip>
                            ) : null}
                            {row.status === 'approved' ? (
                              <Tooltip title="صدور گواهی پرداخت">
                                <IconButton size="small" onClick={() => certifySheet.mutate(row.id)}>
                                  <VerifiedIcon fontSize="small" sx={{ color: '#8b5cf6' }} />
                                </IconButton>
                              </Tooltip>
                            ) : null}
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
      )}

      {tab === 1 && (
        <Paper sx={{ p: 1.5, borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.7)' }}>
          {certList.length === 0 ? (
            <Typography variant="body2" color="textSecondary" textAlign="center" py={4} sx={{ fontFamily: FONT }}>
              گواهی پرداختی ثبت نشده است. از تب «صورتجلسات»، یک صورتجلسهٔ تأییدشده را «گواهی» کنید.
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={headSx}>شماره</TableCell>
                    <TableCell sx={headSx}>قرارداد</TableCell>
                    <TableCell sx={headSx}>صورتجلسه</TableCell>
                    <TableCell sx={headSx}>تاریخ</TableCell>
                    <TableCell sx={headSx}>سررسید</TableCell>
                    <TableCell sx={headSx}>کارکرد</TableCell>
                    <TableCell sx={headSx}>کسورات</TableCell>
                    <TableCell sx={headSx}>قابل پرداخت</TableCell>
                    <TableCell sx={headSx}>پرداخت‌شده</TableCell>
                    <TableCell sx={headSx}>وضعیت</TableCell>
                    <TableCell sx={headSx}>اقدام</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {certList.map((row) => {
                    const meta = CERT_STATUS[row.status] || { label: row.status, color: '#64748b' };
                    return (
                      <TableRow key={row.id} hover>
                        <TableCell sx={{ ...numSx, fontWeight: 800 }}>{toPersianDigits(row.number)}</TableCell>
                        <TableCell sx={{ fontFamily: FONT }}>{row.contract_number || '—'}</TableCell>
                        <TableCell sx={{ fontFamily: FONT }}>{row.sheet_number || '—'}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          {row.date_jalali || toJalali(row.date)}
                        </TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          {row.due_date_jalali || toJalali(row.due_date)}
                        </TableCell>
                        <TableCell sx={numSx}>{money(row.gross)}</TableCell>
                        <TableCell sx={numSx}>{money(row.deductions)}</TableCell>
                        <TableCell sx={{ ...numSx, fontWeight: 800, color: '#047857' }}>
                          {money(row.net_payable)}
                        </TableCell>
                        <TableCell sx={{ ...numSx, color: '#0e7490' }}>{money(row.paid_amount)}</TableCell>
                        <TableCell>
                          <Chip size="small" label={meta.label}
                            sx={{ fontFamily: FONT, fontWeight: 700, bgcolor: `${meta.color}1a`, color: meta.color }} />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.25} justifyContent="center">
                            {row.status === 'draft' ? (
                              <Tooltip title="صدور گواهی">
                                <IconButton size="small"
                                  onClick={() => certAction.mutate({ id: row.id, action: 'issue' })}>
                                  <VerifiedIcon fontSize="small" sx={{ color: '#0ea5e9' }} />
                                </IconButton>
                              </Tooltip>
                            ) : null}
                            {(row.status === 'issued' || row.status === 'draft') ? (
                              <Tooltip title="ثبت پرداخت کامل مانده">
                                <IconButton size="small" onClick={() => certAction.mutate({
                                  id: row.id,
                                  action: 'pay',
                                  body: { amount: Number(row.net_payable) - Number(row.paid_amount) },
                                })}>
                                  <PaymentsIcon fontSize="small" sx={{ color: '#10b981' }} />
                                </IconButton>
                              </Tooltip>
                            ) : null}
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
      )}
      {tab === 2 && (
        <Paper sx={{ p: 1.5, borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.7)' }}>
          {allocList.length === 0 ? (
            <Typography variant="body2" color="textSecondary" textAlign="center" py={4} sx={{ fontFamily: FONT }}>
              تخصیص هزینه‌ای ثبت نشده است.
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={headSx}>عنوان</TableCell>
                    <TableCell sx={headSx}>نوع</TableCell>
                    <TableCell sx={headSx}>WBS / فعالیت</TableCell>
                    <TableCell sx={headSx}>کارمند / منبع</TableCell>
                    <TableCell sx={headSx}>تاریخ</TableCell>
                    <TableCell sx={headSx}>مقدار</TableCell>
                    <TableCell sx={headSx}>نرخ</TableCell>
                    <TableCell sx={headSx}>مبلغ</TableCell>
                    <TableCell sx={headSx}>وضعیت</TableCell>
                    <TableCell sx={headSx}>اقدام</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {allocList.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell sx={{ fontFamily: FONT, maxWidth: 240 }}>{row.title}</TableCell>
                      <TableCell sx={{ fontFamily: FONT }}>{KIND_LABELS[row.kind] || row.kind}</TableCell>
                      <TableCell sx={{ fontFamily: FONT }}>
                        {row.wbs_name || row.activity_code || '—'}
                      </TableCell>
                      <TableCell sx={{ fontFamily: FONT }}>
                        {row.employee_name || row.resource_name || '—'}
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {row.date_jalali || toJalali(row.date)}
                      </TableCell>
                      <TableCell sx={numSx}>
                        {toPersianDigits(row.quantity)} {row.unit || ''}
                      </TableCell>
                      <TableCell sx={numSx}>{money(row.rate)}</TableCell>
                      <TableCell sx={{ ...numSx, fontWeight: 700 }}>{money(row.amount)}</TableCell>
                      <TableCell>
                        <Chip size="small" color={row.posted ? 'success' : 'warning'}
                          label={row.posted ? 'ثبت‌شده در هزینه' : 'در انتظار ثبت'} sx={{ fontWeight: 700 }} />
                      </TableCell>
                      <TableCell>
                        {row.posted ? (
                          <Typography variant="caption" color="textSecondary" sx={{ fontFamily: FONT }}>
                            #{toPersianDigits(row.cost_transaction)}
                          </Typography>
                        ) : (
                          <Tooltip title="تبدیل به هزینهٔ واقعی پروژه">
                            <IconButton size="small" onClick={() => postAllocation.mutate(row.id)}>
                              <PostAddIcon fontSize="small" sx={{ color: '#8b5cf6' }} />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}
      {/* ---------- دیالوگ ثبت صورتجلسهٔ اندازه‌گیری ---------- */}
      <Dialog open={sheetOpen} onClose={() => setSheetOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontFamily: FONT, fontWeight: 800 }}>ثبت صورتجلسهٔ اندازه‌گیری</DialogTitle>
        <DialogContent sx={{ mt: 1 }}>
          <Grid container spacing={1.5}>
            <Grid item xs={12} md={4}>
              <FormControl size="small" fullWidth>
                <InputLabel>پروژه *</InputLabel>
                <Select value={sheetForm.project} label="پروژه *"
                  onChange={e => setSheetForm(p => ({ ...p, project: e.target.value }))}>
                  {projectList.map(p => (
                    <MenuItem key={p.id} value={String(p.id)}>{p.code} — {p.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl size="small" fullWidth>
                <InputLabel>قرارداد</InputLabel>
                <Select value={sheetForm.contract} label="قرارداد"
                  onChange={e => setSheetForm(p => ({ ...p, contract: e.target.value }))}>
                  <MenuItem value="">— بدون قرارداد —</MenuItem>
                  {contractList.map(c => (
                    <MenuItem key={c.id} value={String(c.id)}>{c.number} — {c.subject}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField size="small" fullWidth label="شمارهٔ صورتجلسه *" value={sheetForm.number}
                onChange={e => setSheetForm(p => ({ ...p, number: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={8}>
              <TextField size="small" fullWidth label="عنوان" value={sheetForm.title}
                onChange={e => setSheetForm(p => ({ ...p, title: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={4}>
              <JalaliDatePicker fullWidth label="تاریخ" value={sheetForm.date}
                onChange={(g) => setSheetForm(p => ({ ...p, date: g }))} />
            </Grid>
            <Grid item xs={12} md={3}>
              <JalaliDatePicker fullWidth label="از تاریخ" value={sheetForm.period_from}
                onChange={(g) => setSheetForm(p => ({ ...p, period_from: g }))} />
            </Grid>
            <Grid item xs={12} md={3}>
              <JalaliDatePicker fullWidth label="تا تاریخ" value={sheetForm.period_to}
                onChange={(g) => setSheetForm(p => ({ ...p, period_to: g }))} />
            </Grid>
            <Grid item xs={6} md={2}>
              <TextField size="small" fullWidth label="٪ حسن انجام کار" value={sheetForm.retention_percent}
                onChange={e => setSheetForm(p => ({ ...p, retention_percent: e.target.value }))} />
            </Grid>
            <Grid item xs={6} md={2}>
              <TextField size="small" fullWidth label="بیمه" value={sheetForm.insurance_amount}
                onChange={e => setSheetForm(p => ({ ...p, insurance_amount: e.target.value }))} />
            </Grid>
            <Grid item xs={6} md={2}>
              <TextField size="small" fullWidth label="مالیات" value={sheetForm.tax_amount}
                onChange={e => setSheetForm(p => ({ ...p, tax_amount: e.target.value }))} />
            </Grid>
            <Grid item xs={6} md={2}>
              <TextField size="small" fullWidth label="سایر کسورات" value={sheetForm.other_deductions}
                onChange={e => setSheetForm(p => ({ ...p, other_deductions: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField size="small" fullWidth multiline rows={2} label="توضیحات" value={sheetForm.description}
                onChange={e => setSheetForm(p => ({ ...p, description: e.target.value }))} />
            </Grid>
          </Grid>
          <Typography variant="subtitle2" fontWeight={800} sx={{ mt: 2, mb: 0.75 }}>
            خطوط اندازه‌گیری (مقدار این دوره × نرخ = مبلغ)
          </Typography>
          {sheetForm.lines.map((line, index) => (
            <Stack key={index} direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 1 }}>
              <TextField size="small" fullWidth label="شرح" value={line.description}
                onChange={e => setSheetLine(index, { description: e.target.value })} />
              <TextField size="small" sx={{ width: 80 }} label="واحد" value={line.unit}
                onChange={e => setSheetLine(index, { unit: e.target.value })} />
              <TextField size="small" sx={{ width: 110 }} label="نرخ واحد" value={line.unit_price}
                onChange={e => setSheetLine(index, { unit_price: e.target.value })} />
              <TextField size="small" sx={{ width: 105 }} label="مقدار قبلی" value={line.previous_quantity}
                onChange={e => setSheetLine(index, { previous_quantity: e.target.value })} />
              <TextField size="small" sx={{ width: 120 }} label="مقدار این دوره" value={line.current_quantity}
                onChange={e => setSheetLine(index, { current_quantity: e.target.value })} />
              <TextField size="small" sx={{ width: 125 }} label="مبلغ" value={line.amount}
                onChange={e => setSheetLine(index, { amount: e.target.value })} />
              <IconButton size="small" onClick={() => removeSheetLine(index)}>
                <DeleteIcon fontSize="small" sx={{ color: '#ef4444' }} />
              </IconButton>
            </Stack>
          ))}
          <Button size="small" startIcon={<AddIcon />} onClick={addSheetLine}>افزودن خط</Button>

        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSheetOpen(false)}>انصراف</Button>
          <Button variant="contained" onClick={saveSheet} disabled={createSheet.isPending}
            sx={{ background: 'linear-gradient(135deg,#10b981,#0ea5e9)' }}>
            ثبت صورتجلسه
          </Button>
        </DialogActions>
      </Dialog>
      {/* ---------- دیالوگ ثبت تخصیص هزینه ---------- */}
      <Dialog open={allocOpen} onClose={() => setAllocOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontFamily: FONT, fontWeight: 800 }}>ثبت تخصیص هزینهٔ منابع</DialogTitle>
        <DialogContent sx={{ mt: 1 }}>
          <Grid container spacing={1.5}>
            <Grid item xs={12} sm={6}>
              <FormControl size="small" fullWidth>
                <InputLabel>پروژه *</InputLabel>
                <Select value={allocForm.project} label="پروژه *"
                  onChange={e => setAllocForm(p => ({ ...p, project: e.target.value }))}>
                  {projectList.map(p => (
                    <MenuItem key={p.id} value={String(p.id)}>{p.code} — {p.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl size="small" fullWidth>
                <InputLabel>نوع</InputLabel>
                <Select value={allocForm.kind} label="نوع"
                  onChange={e => setAllocForm(p => ({ ...p, kind: e.target.value }))}>
                  {Object.entries(KIND_LABELS).map(([key, label]) => (
                    <MenuItem key={key} value={key}>{label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={8}>
              <TextField size="small" fullWidth label="عنوان *" value={allocForm.title}
                onChange={e => setAllocForm(p => ({ ...p, title: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <JalaliDatePicker fullWidth label="تاریخ *" value={allocForm.date}
                onChange={(g) => setAllocForm(p => ({ ...p, date: g }))} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField size="small" fullWidth label="مقدار" value={allocForm.quantity}
                onChange={e => setAllocForm(p => ({ ...p, quantity: e.target.value }))} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField size="small" fullWidth label="واحد" value={allocForm.unit}
                onChange={e => setAllocForm(p => ({ ...p, unit: e.target.value }))} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField size="small" fullWidth label="نرخ واحد" value={allocForm.rate}
                onChange={e => setAllocForm(p => ({ ...p, rate: e.target.value }))} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField size="small" fullWidth label="مبلغ" value={allocForm.amount}
                onChange={e => setAllocForm(p => ({ ...p, amount: e.target.value }))} />
            </Grid>
          </Grid>
          <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1 }}>
            مبلغ خالی = مقدار × نرخ واحد. پس از ثبت، با دکمهٔ «ثبت در هزینه» به تراکنش هزینهٔ پروژه تبدیل می‌شود.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAllocOpen(false)}>انصراف</Button>
          <Button variant="contained" onClick={saveAllocation} disabled={createAllocation.isPending}
            sx={{ background: 'linear-gradient(135deg,#0ea5e9,#8b5cf6)' }}>
            ثبت تخصیص
          </Button>
        </DialogActions>
      </Dialog>




    </Box>
  );
};

export default ProjectCertificationPage;

