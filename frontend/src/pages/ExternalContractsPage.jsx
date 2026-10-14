import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Button, Chip, Avatar, CircularProgress, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl,
  InputLabel, Select, MenuItem, InputAdornment, IconButton, Tooltip, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import HandshakeIcon from '@mui/icons-material/Handshake';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import { formatPersianNumber, toPersianDigits } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import downloadFile from '../core/utils/downloadUtils';

const FONT = 'Vazirmatn, IRANSans, sans-serif';

// ارزهای «ریالی/تومانی» → واحد پول سمت چپ مبلغ؛ سایر ارزها (دلار، یورو، یوان و …) سمت راست
const isRialCurrency = (contract) => {
  const text = `${contract?.currency_name || ''} ${contract?.currency_symbol || ''} ${contract?.currency_code || ''}`;
  return /ریال|تومان|ريال|\bIRR\b|\bIRT\b|\bIRHR\b/i.test(text);
};
const currencyUnit = (contract) => contract?.currency_name || contract?.currency_symbol || 'ریال';

// روزهای باقی‌مانده تا پایان (مبتنی بر تاریخ مؤثر با الحاقیه؛ بر پایهٔ روز محلی)
const parseDay = (value) => {
  const parts = String(value || '').slice(0, 10).split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
};
const daysUntil = (value) => {
  const target = parseDay(value);
  if (!target) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / 86400000);
};
const remainMeta = (days) => {
  if (days === null) return { label: '—', color: '#64748b', bg: 'rgba(100,116,139,0.12)' };
  if (days < 0) return { label: `منقضی (${toPersianDigits(Math.abs(days))} روز)`, color: '#b91c1c', bg: 'rgba(239,68,68,0.12)' };
  if (days === 0) return { label: 'آخرین روز', color: '#b45309', bg: 'rgba(245,158,11,0.16)' };
  if (days <= 60) return { label: `${toPersianDigits(days)} روز`, color: '#b45309', bg: 'rgba(245,158,11,0.14)' };
  return { label: `${toPersianDigits(days)} روز`, color: '#047857', bg: 'rgba(16,185,129,0.14)' };
};

const headCellSx = {
  fontWeight: 800, fontSize: 12, color: '#334155', whiteSpace: 'nowrap',
  bgcolor: 'rgba(15,23,42,0.035)', borderBottom: '1px solid rgba(15,23,42,0.10)', py: 1.1,
};
const bodyCellSx = {
  whiteSpace: 'nowrap', fontSize: 12.5,
  borderBottom: '1px solid rgba(15,23,42,0.06)', py: 0.9,
};

const TYPE_LABELS = {
  construction: 'پیمانکاری / اجرا',
  purchase: 'خرید',
  tender: 'مناقصه',
  consulting: 'مشاوره',
  service: 'خدمات',
  other: 'سایر',
};

const STATUS_LABELS = {
  draft: 'پیش‌نویس',
  active: 'در حال اجرا',
  suspended: 'متوقف',
  completed: 'تکمیل شده',
  terminated: 'فسخ شده',
};

const STATUS_COLORS = {
  draft: '#64748b',
  active: '#10b981',
  suspended: '#f59e0b',
  completed: '#3b82f6',
  terminated: '#ef4444',
};

const TYPE_COLORS = {
  construction: '#f97316',
  purchase: '#10b981',
  tender: '#f59e0b',
  consulting: '#6366f1',
  service: '#0ea5e9',
  other: '#64748b',
};

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px',
    background: 'rgba(255,255,255,0.6)',
    '&:hover': { background: 'rgba(255,255,255,0.85)' },
    '&.Mui-focused': { background: '#fff', boxShadow: '0 0 0 4px rgba(245,158,11,0.12)' },
  },
};

const ExternalContractsPage = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [msg, setMsg] = useState('');
  const [msgOk, setMsgOk] = useState(true);
  const [exporting, setExporting] = useState(false);

  const { data: contracts, isLoading } = useQuery({
    queryKey: ['external-contracts'],
    queryFn: () => axiosInstance.get('/external-contracts/').then(r => r.data),
  });
  const contractList = Array.isArray(contracts) ? contracts : contracts?.results || [];

  const { data: typeMasters } = useQuery({
    queryKey: ['contract-types-master'],
    queryFn: () => axiosInstance.get('/contract-types-master/').then(r => r.data),
  });
  const typeMasterList = Array.isArray(typeMasters) ? typeMasters : typeMasters?.results || [];

  // نوع قرارداد از «نوع پیکربندی‌شده» خوانده می‌شود؛ اگر خالی بود، نوع ثابت.
  const typeLabel = (c) => c.contract_type_master_name || TYPE_LABELS[c.contract_type] || c.contract_type || '—';

  const remove = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/external-contracts/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['external-contracts'] });
      setDeleteId(null);
      setMsg('قرارداد حذف شد.');
      setTimeout(() => setMsg(''), 2500);
    },
  });

  const filtered = contractList.filter(c =>
    (!search || (c.subject || '').includes(search) || (c.party_name || '').includes(search) || (c.number || '').includes(search)) &&
    (!statusFilter || c.status === statusFilter) &&
    (!typeFilter || String(c.contract_type_master) === String(typeFilter))
  );

  // خروجی اکسل جامع: تک‌شیت و یک ردیف برای هر قرارداد (همهٔ آیتم‌ها در ستون‌های همان ردیف)
  const exportExcel = async () => {
    if (exporting) return;
    setExporting(true);
    setMsg('');
    setMsgOk(true);
    try {
      await downloadFile('/external-contracts/export-excel/', {
        params: {
          ...(search ? { search } : {}),
          ...(statusFilter ? { status: statusFilter } : {}),
          ...(typeFilter ? { contract_type_master: typeFilter } : {}),
        },
        fallbackName: 'contracts.xlsx',
      });
      setMsg('فایل اکسل تهیه و دانلود شد.');
    } catch (e) {
      setMsg(`خطا در تهیهٔ فایل اکسل: ${e?.message || 'نامشخص'}`);
      setMsgOk(false);
    } finally {
      setExporting(false);
      setTimeout(() => setMsg(''), 4000);
    }
  };

  return (
    <Box>
      {/* Header */}
      <Paper sx={{
        p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        background: 'linear-gradient(120deg, rgba(245,158,11,0.10), rgba(249,115,22,0.05), rgba(255,255,255,0.3))',
        border: '1px solid rgba(245,158,11,0.16)', borderRadius: '12px',
      }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #f59e0b, #f97316)', boxShadow: '0 8px 24px rgba(245,158,11,0.4)' }}>
          <HandshakeIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 220 }}>
          <Typography variant="h6" fontWeight={800} color="#b45309">قراردادهای برون‌سازمانی</Typography>
          <Typography variant="body2" color="textSecondary">پیمانکاری، خرید، مناقصه + فاکتور، صورت‌وضعیت، الحاقیه، تضمین و پرداخت</Typography>
        </Box>
        <Tooltip title="خروجی اکسل چندشیتی: قراردادها، مفاد و شرایط، پروژه‌ها، پیش‌پرداخت‌ها، ضمانت‌ها، تضمین‌ها، فاکتورها، صورت‌وضعیت‌ها، پرداخت‌ها، الحاقیه‌ها و اختلافات">
          <span>
            <Button variant="outlined" startIcon={exporting ? <CircularProgress size={16} /> : <DownloadIcon />}
              disabled={exporting} onClick={exportExcel}
              sx={{ borderRadius: '10px', px: 2, whiteSpace: 'nowrap' }}>
              {exporting ? 'در حال تهیه…' : 'خروجی اکسل'}
            </Button>
          </span>
        </Tooltip>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/contracts/new')}
          sx={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', borderRadius: '10px', px: 2.5, whiteSpace: 'nowrap' }}>
          قرارداد جدید
        </Button>
      </Paper>

      {msg && <Alert severity={msgOk ? 'success' : 'error'} sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}

      {/* Filters */}
      <Paper sx={{ p: 1.5, mb: 2, borderRadius: '12px', background: 'rgba(255,255,255,0.6)' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField size="small" placeholder="جستجوی موضوع / طرف / شماره…" value={search} onChange={e => setSearch(e.target.value)}
            sx={{ flex: 1, ...fieldSx }} InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 170 } }}>
            <InputLabel>وضعیت</InputLabel>
            <Select value={statusFilter || ''} label="وضعیت" onChange={e => setStatusFilter(e.target.value)}>
              <MenuItem value="">همه</MenuItem>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 170 } }}>
            <InputLabel>نوع</InputLabel>
            <Select value={typeFilter || ''} label="نوع" onChange={e => setTypeFilter(e.target.value)}>
              <MenuItem value="">همه</MenuItem>
              {typeMasterList.map(t => <MenuItem key={t.id} value={t.id}>{t.name}{t.code ? ` (${t.code})` : ''}</MenuItem>)}
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {/* فهرست قراردادها — جدول یک‌ردیفی و خوانا */}
      <Box>
        {isLoading ? (
          <Paper sx={{ py: 6, textAlign: 'center', borderRadius: '16px' }}><CircularProgress /></Paper>
        ) : filtered.length === 0 ? (
          <Paper sx={{ py: 7, textAlign: 'center', borderRadius: '16px', background: 'rgba(255,255,255,0.55)' }}>
            <Typography color="textSecondary">قراردادی ثبت نشده است.</Typography>
          </Paper>
        ) : (
          <Paper sx={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(100,116,139,0.14)' }}>
            <TableContainer sx={{ maxHeight: 'calc(100vh - 330px)' }}>
              <Table size="small" stickyHeader sx={{ '& td, & th': { px: 1.25 } }}>
                <TableHead>
                  <TableRow>
                    <TableCell align="center" sx={{ ...headCellSx, width: 110 }}>شماره قرارداد</TableCell>
                    <TableCell align="center" sx={headCellSx}>طرف حساب</TableCell>
                    <TableCell align="center" sx={headCellSx}>نام قرارداد</TableCell>
                    <TableCell align="center" sx={{ ...headCellSx, width: 130 }}>نوع قرارداد</TableCell>
                    <TableCell align="center" sx={{ ...headCellSx, width: 120 }}>وضعیت اجرا</TableCell>
                    <TableCell align="center" sx={{ ...headCellSx, width: 195 }}>تاریخ شروع و پایان</TableCell>
                    <TableCell align="center" sx={{ ...headCellSx, width: 155 }}>مانده (روز تا پایان)</TableCell>
                    <TableCell align="center" sx={{ ...headCellSx, width: 230 }}>مبلغ قرارداد (با الحاقیه)</TableCell>
                    <TableCell align="center" sx={{ ...headCellSx, width: 140 }}>عملیات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map(c => {
                    const typeColor = TYPE_COLORS[c.contract_type] || '#64748b';
                    const statusColor = STATUS_COLORS[c.status] || '#64748b';
                    const amount = c.effective_amount ?? c.amount ?? 0;
                    const baseAmount = c.amount ?? 0;
                    const changedByAddendum = c.effective_amount != null
                      && Number(c.effective_amount) !== Number(baseAmount);
                    const rial = isRialCurrency(c);
                    const unit = (
                      <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {currencyUnit(c)}
                      </Typography>
                    );
                    const amountText = (
                      <Typography sx={{
                        fontFamily: FONT, fontWeight: 800, fontSize: 13.5, color: '#b45309',
                        whiteSpace: 'nowrap',
                      }}>
                        {formatPersianNumber(amount)}
                      </Typography>
                    );
                    const endEffective = c.effective_end_date || c.end_date;
                    const remain = remainMeta(daysUntil(endEffective));
                    const extended = Boolean(c.effective_end_date && c.end_date
                      && String(c.effective_end_date).slice(0, 10) !== String(c.end_date).slice(0, 10));
                    return (
                      <TableRow
                        key={c.id} hover
                        onClick={() => navigate(`/external-contracts/${c.id}`)}
                        sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'rgba(245,158,11,0.05)' } }}
                      >
                        <TableCell align="center" sx={bodyCellSx}>
                          <Typography sx={{ fontFamily: FONT, fontWeight: 800, fontSize: 12.5, color: '#334155' }}>
                            {toPersianDigits(c.number || '—')}
                          </Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ ...bodyCellSx, maxWidth: 190 }}>
                          <Tooltip title={c.party_name || ''}>
                            <Typography variant="body2" fontWeight={700} color="#7c2d12" noWrap>
                              {c.party_name || '—'}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell align="right" sx={{ ...bodyCellSx, maxWidth: 320 }}>
                          <Tooltip title={c.subject || ''}>
                            <Typography variant="body2" fontWeight={800} noWrap sx={{ color: '#0f172a' }}>
                              {c.subject || '—'}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell align="center" sx={bodyCellSx}>
                          <Chip size="small" label={typeLabel(c)}
                            sx={{ bgcolor: `${typeColor}18`, color: typeColor, fontWeight: 700, fontSize: 10, height: 20 }} />
                        </TableCell>
                        <TableCell align="center" sx={bodyCellSx}>
                          <Chip size="small" label={STATUS_LABELS[c.status] || c.status || '—'}
                            sx={{ bgcolor: `${statusColor}18`, color: statusColor, fontWeight: 700, fontSize: 10, height: 20 }} />
                        </TableCell>

                        <TableCell align="center" sx={bodyCellSx}>
                          <Typography variant="caption" sx={{ fontFamily: FONT, color: '#334155', fontWeight: 700 }}>
                            {c.start_date ? toJalali(c.start_date) : '—'}
                          </Typography>
                          <Typography component="span" variant="caption" sx={{ color: '#94a3b8', mx: 0.75 }}>←</Typography>
                          <Typography variant="caption" sx={{
                            fontFamily: FONT, fontWeight: extended ? 800 : 700,
                            color: extended ? '#047857' : '#334155',
                          }}>
                            {c.end_date ? toJalali(c.end_date) : '—'}
                          </Typography>
                          {extended && (
                            <Typography variant="caption" sx={{ display: 'block', color: '#047857', fontWeight: 700 }}>
                              مؤثر با الحاقیه: {toJalali(c.effective_end_date)}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="center" sx={bodyCellSx}>
                          <Chip size="small" label={remain.label}
                            sx={{ bgcolor: remain.bg, color: remain.color, fontWeight: 800, fontSize: 11, height: 22 }} />
                          {extended && (
                            <Typography variant="caption" sx={{ display: 'block', color: '#047857', fontWeight: 700, mt: 0.25 }}>
                              تمدیدشده
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="center" sx={bodyCellSx}>
                          <Tooltip title={`پایه: ${formatPersianNumber(baseAmount)}${changedByAddendum
                            ? ` | تغییر الحاقیه: ${formatPersianNumber(amount - baseAmount)}` : ''}`}>
                            <Stack direction="row" alignItems="center" justifyContent="flex-start" spacing={0.5}>
                              {rial ? [amountText, unit] : [unit, amountText]}
                            </Stack>
                          </Tooltip>
                          {changedByAddendum && (
                            <Typography variant="caption" sx={{ display: 'block', color: '#047857', fontWeight: 700, mt: 0.25 }}>
                              با الحاقیه (پایه: {formatPersianNumber(baseAmount)})
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell sx={bodyCellSx} onClick={e => e.stopPropagation()}>
                          <Stack direction="row" spacing={0.25} justifyContent="flex-start">
                            <Tooltip title="مشاهده پرونده"><IconButton size="small" color="info"
                              onClick={() => navigate(`/external-contracts/${c.id}`)}><VisibilityIcon fontSize="small" /></IconButton></Tooltip>
                            <Tooltip title="ویرایش"><IconButton size="small" color="primary"
                              onClick={() => navigate(`/contracts/${c.id}/edit`)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                            <Tooltip title="حذف"><IconButton size="small" color="error"
                              onClick={() => setDeleteId(c.id)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}
      </Box>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: '#b91c1c', fontWeight: 800 }}>حذف قرارداد</DialogTitle>
        <DialogContent>
          <Typography variant="body2">آیا از حذف این قرارداد اطمینان دارید؟ اسناد، فاکتورها و پرداخت‌های مرتبط نیز حذف می‌شوند.</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteId(null)}>انصراف</Button>
          <Button variant="contained" color="error" onClick={() => remove.mutate(deleteId)}>حذف</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExternalContractsPage;


