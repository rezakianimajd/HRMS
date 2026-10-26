import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Button, Chip, CircularProgress, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl,
  InputLabel, Select, MenuItem, InputAdornment, IconButton, Tooltip, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Grid,
} from '@mui/material';
import HandshakeIcon from '@mui/icons-material/Handshake';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ScheduleIcon from '@mui/icons-material/Schedule';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import { formatPersianNumber, toPersianDigits, normalizeCurrencyLabel } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import downloadFile from '../core/utils/downloadUtils';
import PageHeader from '../core/components/ui/PageHeader';
import InfoCard from '../core/components/ui/InfoCard';
import { useDesignTokens } from '../core/context/DesignTokenContext';
import { withAlpha } from '../core/utils/colorUtils';

const FONT = 'Vazirmatn, IRANSans, sans-serif';

// واحد ارز (نام ارز؛ در نبود نام، نماد و در نهایت «ریال»)
const currencyUnit = (contract) => normalizeCurrencyLabel(contract?.currency_name || contract?.currency_symbol);

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
  // پس‌زمینهٔ مات (بدون شفافیت) تا هنگام اسکرول محتوای جدول از زیر هدر دیده نشود
  backgroundColor: '#f1f5f9',
  borderBottom: '1px solid rgba(15,23,42,0.14)',
  py: 1.1,
};
const bodyCellSx = {
  whiteSpace: 'nowrap', fontSize: 12.5,
  borderBottom: '1px solid rgba(15,23,42,0.06)', py: 0.9,
};
// تراز صریح (inline) تا قاعدهٔ سراسری «[dir=rtl] .MuiTableCell-root» بازنویسی نکند
const CENTER = { textAlign: 'center' };
const RIGHT = { textAlign: 'right' };

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

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '10px',
    backgroundColor: 'background.paper',
    '&:hover': { backgroundColor: 'background.paper' },
    '&.Mui-focused': { backgroundColor: 'background.paper' },
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

  /* ---- توکن‌های جدول از استودیوی تم (خط جداکننده، تراز هدر، قاب کارت) ---- */
  const { tokens } = useDesignTokens();
  const tableTokens = tokens?.tables || {};
  const tableFrame = tableTokens.frame !== 'plain';
  const headerAlign = tableTokens.headerAlign || 'center';
  const headerTextAlign = headerAlign === 'start' ? 'right' : (headerAlign === 'end' ? 'left' : 'center');
  const singleLine = tableTokens.singleLine !== false;
  const dividerStyle = tableTokens.dividerStyle && tableTokens.dividerStyle !== 'none'
    ? tableTokens.dividerStyle
    : tableTokens.dividerStyle === 'none' ? 'none' : 'solid';
  const dividerColor = withAlpha(
    tableTokens.dividerColor || tokens?.colors?.divider || '#e2e8f0',
    Number(tableTokens.dividerOpacity ?? 100) / 100,
  );
  const tableDivider = dividerStyle === 'none' ? 'none' : `1px ${dividerStyle} ${dividerColor}`;
  const cellPadding = tableTokens.variant === 'compact' ? 6 : tableTokens.variant === 'spacious' ? 12 : (tableTokens.cellPadding ?? 8);
  const tableFrameSx = tableFrame ? {
    mx: `${Number(tableTokens.frameMarginX ?? 16)}px`,
    p: `${Number(tableTokens.framePadding ?? 12)}px`,
  } : {};

  const { data: contracts, isLoading } = useQuery({
    queryKey: ['external-contracts'],
    queryFn: async () => {
      // صفحه‌بندی پیش‌فرض بک‌اند ۱۰۰ ردیف است؛ برای آمار و جدول، همهٔ صفحات را می‌خوانیم.
      const pageSize = 1000;
      const first = await axiosInstance.get('/external-contracts/', { params: { page_size: pageSize } });
      const payload = first.data;
      if (Array.isArray(payload)) return payload;

      const results = [...(payload?.results || [])];
      const total = Number(payload?.count || results.length);
      const pages = Math.ceil(total / pageSize);
      for (let page = 2; page <= pages; page += 1) {
        const response = await axiosInstance.get('/external-contracts/', {
          params: { page, page_size: pageSize },
        });
        results.push(...(response.data?.results || []));
      }
      return results;
    },
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

  const overview = {
    total: contractList.length,
    active: contractList.filter(c => c.status === 'active').length,
    expiring: contractList.filter(c => {
      const days = daysUntil(c.effective_end_date || c.end_date);
      return days !== null && days >= 0 && days <= 60;
    }).length,
    amount: contractList.reduce((sum, c) => sum + Number(c.effective_amount ?? c.amount ?? 0), 0),
  };

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
      <PageHeader
        icon={<HandshakeIcon />}
        title="قراردادهای برون‌سازمانی"
        actions={(
          <>
            <Tooltip title="خروجی اکسل چندشیتی: قراردادها، مفاد و شرایط، پروژه‌ها، پیش‌پرداخت‌ها، ضمانت‌ها، تضمین‌ها، فاکتورها، صورت‌وضعیت‌ها، پرداخت‌ها، الحاقیه‌ها و اختلافات">
              <span>
                <Button variant="outlined" startIcon={exporting ? <CircularProgress size={16} /> : <DownloadIcon />}
                  disabled={exporting} onClick={exportExcel}>
                  {exporting ? 'در حال تهیه…' : 'خروجی اکسل'}
                </Button>
              </span>
            </Tooltip>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/contracts/new')}>
              قرارداد جدید
            </Button>
          </>
        )}
      />

      {msg && <Alert severity={msgOk ? 'success' : 'error'} sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}

      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        <Grid item xs={6} md={3}>
          <InfoCard icon={<HandshakeIcon />} color="#f59e0b" label="کل قراردادها"
            value={toPersianDigits(overview.total)} suffix="قرارداد" />
        </Grid>
        <Grid item xs={6} md={3}>
          <InfoCard icon={<CheckCircleRoundedIcon />} color="#10b981" label="در حال اجرا"
            value={toPersianDigits(overview.active)} suffix="قرارداد" />
        </Grid>
        <Grid item xs={6} md={3}>
          <InfoCard icon={<ScheduleIcon />} color="#f97316" label="رو به انقضا"
            value={toPersianDigits(overview.expiring)} suffix="تا ۶۰ روز" />
        </Grid>
        <Grid item xs={6} md={3}>
          <InfoCard icon={<AccountBalanceIcon />} color="#3b82f6" label="جمع مبالغ"
            value={formatPersianNumber(overview.amount)} suffix="ریال" />
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 1.25, mb: 2, borderRadius: '16px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', boxShadow: 'none' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} useFlexGap>
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
          <Paper sx={{ ...tableFrameSx, py: 6, textAlign: 'center', borderRadius: '16px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', boxShadow: 'none' }}><CircularProgress /></Paper>
        ) : filtered.length === 0 ? (
          <Paper sx={{ ...tableFrameSx, py: 7, textAlign: 'center', borderRadius: '16px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', boxShadow: 'none' }}>
            <Typography color="textSecondary">قراردادی ثبت نشده است.</Typography>
          </Paper>
        ) : (
          <Paper
            sx={{
              ...tableFrameSx,
              borderRadius: 'var(--hrms-table-radius, 16px)',
              overflow: 'hidden',
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              boxShadow: 'none',
            }}
          >
            <TableContainer sx={{ maxHeight: 'calc(100vh - 430px)' }}>
              <Table
                size="small"
                stickyHeader
                sx={{
                  minWidth: 1400,
                  '& td, & th': {
                    px: 1.25,
                    py: `${cellPadding}px`,
                    whiteSpace: singleLine ? 'nowrap' : 'normal',
                    borderBottom: tableDivider,
                    textOverflow: singleLine ? 'ellipsis' : 'clip',
                  },
                  '& thead th': {
                    textAlign: `${headerTextAlign} !important`,
                    minWidth: `${Number(tableTokens.columnMinWidth ?? 110)}px`,
                  },
                  '& tbody td': { height: `${Number(tableTokens.rowHeight ?? 38)}px` },
                }}
              >
                <TableHead>
                  <TableRow>
                    <TableCell align="center" style={CENTER} sx={{ ...headCellSx, width: 110 }}>شماره قرارداد</TableCell>
                    <TableCell align="center" style={CENTER} sx={{ ...headCellSx, width: 175 }}>طرف حساب</TableCell>
                    <TableCell align="center" style={CENTER} sx={{ ...headCellSx, width: 285 }}>موضوع قرارداد</TableCell>
                    <TableCell align="center" style={CENTER} sx={{ ...headCellSx, width: 150 }}>نوع قرارداد</TableCell>
                    <TableCell align="center" style={CENTER} sx={{ ...headCellSx, width: 112 }}>وضعیت</TableCell>
                    <TableCell align="center" style={CENTER} sx={{ ...headCellSx, width: 108 }}>تاریخ شروع</TableCell>
                    <TableCell align="center" style={CENTER} sx={{ ...headCellSx, width: 108 }}>تاریخ پایان</TableCell>
                    <TableCell align="center" style={CENTER} sx={{ ...headCellSx, width: 150 }}>مانده (روز تا پایان)</TableCell>
                    <TableCell align="center" style={CENTER} sx={{ ...headCellSx, width: 195 }}>مبلغ قرارداد (با الحاقیه)</TableCell>
                    <TableCell align="center" style={CENTER} sx={{ ...headCellSx, width: 126 }}>عملیات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map(c => {
                    const amount = c.effective_amount ?? c.amount ?? 0;
                    const baseAmount = c.amount ?? 0;
                    const endEffective = c.effective_end_date || c.end_date;
                    const extended = Boolean(c.effective_end_date && c.end_date
                      && String(c.effective_end_date).slice(0, 10) !== String(c.end_date).slice(0, 10));
                    const remain = remainMeta(daysUntil(endEffective));
                    return (
                      <TableRow
                        key={c.id} hover
                        onClick={() => navigate(`/external-contracts/${c.id}`)}
                        sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'rgba(245,158,11,0.05)' } }}
                      >
                        <TableCell align="center" style={CENTER} sx={bodyCellSx}>
                          <Typography sx={{ fontFamily: FONT, fontWeight: 800, fontSize: 12.5, color: '#334155' }}>
                            {toPersianDigits(c.number || '—')}
                          </Typography>
                        </TableCell>
                        <TableCell align="right" style={RIGHT} sx={{ ...bodyCellSx, maxWidth: 170 }}>
                          <Tooltip title={c.party_name || ''}>
                            <Typography fontWeight={700} color="#7c2d12" noWrap sx={{ fontSize: 12 }}>
                              {c.party_name || '—'}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell align="right" style={RIGHT} sx={{ ...bodyCellSx, maxWidth: 285 }}>
                          <Tooltip title={c.subject || ''}>
                            <Typography fontWeight={800} noWrap sx={{ color: '#0f172a', fontSize: 12 }}>
                              {c.subject || '—'}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell align="center" style={CENTER} sx={bodyCellSx}>
                          <Typography variant="caption" noWrap sx={{ color: '#475569', fontWeight: 700, fontSize: 12 }}>
                            {typeLabel(c)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center" style={CENTER} sx={bodyCellSx}>
                          <Chip size="small" label={STATUS_LABELS[c.status] || '—'}
                            sx={{
                              bgcolor: `${STATUS_COLORS[c.status] || '#64748b'}18`,
                              color: STATUS_COLORS[c.status] || '#64748b',
                              fontWeight: 800, fontSize: 12, height: 22,
                            }} />
                        </TableCell>
                        <TableCell align="center" style={CENTER} sx={bodyCellSx}>
                          <Typography variant="caption" sx={{ fontFamily: FONT, color: '#334155', fontWeight: 700 }}>
                            {c.start_date ? toJalali(c.start_date) : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell align="center" style={CENTER} sx={bodyCellSx}>
                          <Typography variant="caption" sx={{
                            fontFamily: FONT, fontWeight: extended ? 800 : 700,
                            color: extended ? '#047857' : '#334155',
                          }}>
                            {endEffective ? toJalali(endEffective) : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell align="center" style={CENTER} sx={bodyCellSx}>
                          <Chip size="small" label={remain.label}
                            sx={{ bgcolor: remain.bg, color: remain.color, fontWeight: 800, fontSize: 12, height: 22 }} />
                        </TableCell>
                        <TableCell align="center" style={CENTER} sx={bodyCellSx}>
                          <Tooltip title={`پایه: ${formatPersianNumber(baseAmount)}${Number(amount) !== Number(baseAmount)
                            ? ` | تغییر الحاقیه: ${formatPersianNumber(Number(amount) - Number(baseAmount))}` : ''}`}>
                            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                              <Typography sx={{
                                fontFamily: FONT, fontWeight: 800, fontSize: 13.5, color: '#b45309',
                                whiteSpace: 'nowrap',
                              }}>
                                {formatPersianNumber(amount)}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                {currencyUnit(c)}
                              </Typography>
                            </Box>
                          </Tooltip>
                        </TableCell>
                        <TableCell align="center" style={CENTER} sx={bodyCellSx} onClick={e => e.stopPropagation()}>
                          <Stack direction="row" spacing={0.25} justifyContent="center">
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


