import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Paper, Button, CircularProgress, Stack, Chip, TextField, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Alert, Grid,
  Typography, Divider,
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import RefreshIcon from '@mui/icons-material/Refresh';
import { formatPersianNumber } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';
import PageHeader from '../core/components/ui/PageHeader';

const COLOR = '#0ea5e9';
const COLOR_DARK = '#0284c7';

const glass = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.72), rgba(255,255,255,0.34))',
  backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)',
  border: '1px solid rgba(255,255,255,0.6)',
  boxShadow: '0 14px 40px rgba(14,165,233,0.12)', borderRadius: '16px',
};

const money = (value) => formatPersianNumber(Number(value || 0));
const pct = (value) => `${Number(value || 0).toLocaleString('fa-IR')}٪`;

const REPORT_DEFS = {
  details: {
    label: 'گزارش دهی جزئیات',
    endpoint: '/petty-cash-reports/details/',
    filters: ['range', 'fund', 'custodian', 'status', 'kind'],
    columns: [
      { key: 'date', label: 'تاریخ', date: true },
      { key: 'type', label: 'نوع' },
      { key: 'number', label: 'شماره' },
      { key: 'fund', label: 'تنخواه' },
      { key: 'custodian', label: 'تنخواه‌دار' },
      { key: 'project', label: 'پروژه' },
      { key: 'description', label: 'شرح' },
      { key: 'status', label: 'وضعیت' },
      { key: 'amount', label: 'مبلغ', money: true },
    ],
  },
  summary: {
    label: 'وضعیت تنخواه‌ها',
    endpoint: '/petty-cash-reports/summary/',
    filters: [],
    columns: [
      { key: 'code', label: 'کد' },
      { key: 'title', label: 'عنوان تنخواه' },
      { key: 'custodian', label: 'تنخواه‌دار' },
      { key: 'kind', label: 'نوع' },
      { key: 'limit', label: 'سقف', money: true },
      { key: 'balance', label: 'مانده نقد', money: true },
      { key: 'unsettled_documents', label: 'اسناد تسویه‌نشده', money: true },
      { key: 'target_amount', label: 'مبلغ هدف', money: true },
      { key: 'is_balanced', label: 'کنترل ثابت', bool: true },
      { key: 'is_near_limit', label: 'نزدیک سقف', bool: true },
    ],
  },
  cashflow: {
    label: 'گردش دریافت و پرداخت',
    endpoint: '/petty-cash-reports/cashflow/',
    filters: ['range', 'fund', 'custodian'],
    totals: true,
    columns: [
      { key: 'date', label: 'تاریخ', date: true },
      { key: 'fund', label: 'تنخواه' },
      { key: 'entry_type', label: 'نوع', map: { credit: 'دریافت', debit: 'پرداخت' } },
      { key: 'amount', label: 'مبلغ', money: true },
      { key: 'title', label: 'عنوان' },
      { key: 'payment_method', label: 'روش پرداخت' },
      { key: 'reference', label: 'شماره سند' },
      { key: 'counterparty', label: 'طرف حساب' },
    ],
  },
  'by-category': {
    label: 'هزینه به تفکیک سرفصل',
    endpoint: '/petty-cash-reports/by-category/',
    filters: ['range', 'fund', 'custodian'],
    columns: [
      { key: 'category', label: 'دسته‌بندی' },
      { key: 'account_code', label: 'کد معین' },
      { key: 'account', label: 'سرفصل' },
      { key: 'total', label: 'مبلغ', money: true },
      { key: 'count', label: 'تعداد سطر' },
    ],
  },
  'by-project': {
    label: 'هزینه به تفکیک پروژه',
    endpoint: '/petty-cash-reports/by-project/',
    filters: ['range'],
    columns: [
      { key: 'project_code', label: 'کد پروژه' },
      { key: 'project', label: 'پروژه' },
      { key: 'cost_center', label: 'مرکز هزینه' },
      { key: 'total', label: 'مبلغ', money: true },
      { key: 'count', label: 'تعداد سطر' },
    ],
  },
  custodians: {
    label: 'عملکرد تنخواه‌داران',
    endpoint: '/petty-cash-reports/custodian-performance/',
    filters: ['range'],
    columns: [
      { key: 'custodian', label: 'تنخواه‌دار' },
      { key: 'employee_id', label: 'کد پرسنلی' },
      { key: 'funds', label: 'تعداد تنخواه' },
      { key: 'balance', label: 'مانده', money: true },
      { key: 'statements', label: 'تعداد صورت' },
      { key: 'spent', label: 'مصرف تأییدشده', money: true },
      { key: 'overdue', label: 'تسویه معوق', danger: true },
    ],
  },
  'credit-vs-usage': {
    label: 'اعتبار در برابر مصرف',
    endpoint: '/petty-cash-reports/credit-vs-usage/',
    filters: [],
    columns: [
      { key: 'title', label: 'تنخواه' },
      { key: 'custodian', label: 'تنخواه‌دار' },
      { key: 'limit', label: 'اعتبار/سقف', money: true },
      { key: 'spent', label: 'مصرف', money: true },
      { key: 'balance', label: 'مانده', money: true },
      { key: 'usage_percent', label: 'درصد مصرف', percent: true },
    ],
  },
  overdue: {
    label: 'تسویه‌های معوق',
    endpoint: '/petty-cash-reports/overdue/',
    filters: [],
    columns: [
      { key: 'number', label: 'شماره صورت' },
      { key: 'fund', label: 'تنخواه' },
      { key: 'custodian', label: 'تنخواه‌دار' },
      { key: 'due_date', label: 'مهلت تسویه', date: true },
      { key: 'days_late', label: 'روز تأخیر', danger: true },
      { key: 'total', label: 'مبلغ', money: true },
    ],
  },
  settlements: {
    label: 'تاریخچهٔ تسویه‌ها',
    endpoint: '/petty-cash-reports/settlements/',
    filters: ['range', 'fund', 'custodian'],
    columns: [
      { key: 'number', label: 'شماره' },
      { key: 'date', label: 'تاریخ', date: true },
      { key: 'fund', label: 'تنخواه' },
      { key: 'custodian', label: 'تنخواه‌دار' },
      { key: 'cash_counted', label: 'نقد شمارش‌شده', money: true },
      { key: 'expenses_total', label: 'هزینهٔ تأییدشده', money: true },
      { key: 'returned_amount', label: 'برگشت وجه', money: true },
      { key: 'shortage', label: 'کسری', money: true, danger: true },
      { key: 'overage', label: 'اضافه', money: true, warn: true },
      { key: 'recharge_amount', label: 'شارژ مجدد', money: true },
    ],
  },
  compliance: {
    label: 'کنترل مستندات',
    endpoint: '/petty-cash-reports/compliance-summary/',
    filters: [],
    columns: [],
  },
};

const cellValue = (row, col) => {
  const value = row?.[col.key];
  if (value === null || value === undefined || value === '') return '—';
  if (col.date) return toJalali(value);
  if (col.money) return money(value);
  if (col.percent) return pct(value);
  if (col.bool) {
    return <Chip size="small" label={value ? 'بله' : 'خیر'} color={value ? 'success' : 'default'} sx={{ fontWeight: 700 }} />;
  }
  if (col.map) return col.map[value] || value;
  return value;
};

const PettyCashReportsPage = () => {
  const { report } = useParams();
  const key = REPORT_DEFS[report] ? report : 'details';
  const def = REPORT_DEFS[key];

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [fund, setFund] = useState('');
  const [custodian, setCustodian] = useState('');
  const [status, setStatus] = useState('');
  const [kind, setKind] = useState('statements');

  const { data: funds } = useQuery({
    queryKey: ['pc-funds-list'],
    queryFn: () => axiosInstance.get('/petty-cash-funds/').then(r => r.data),
  });
  const fundList = Array.isArray(funds) ? funds : funds?.results || [];

  const uses = (name) => (def.filters || []).includes(name);
  const buildParams = () => {
    const p = {};
    if (uses('range')) {
      if (dateFrom) p.date_from = dateFrom;
      if (dateTo) p.date_to = dateTo;
    }
    if (uses('fund') && fund) p.fund = fund;
    if (uses('custodian') && custodian) p.custodian = custodian;
    if (uses('status') && status) p.status = status;
    if (uses('kind')) { p.kind = kind; }
    return p;
  };
  const params = buildParams();

  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ['pc-report', key, params],
    queryFn: () => axiosInstance.get(def.endpoint, { params }).then(r => r.data),
  });

  const rows = Array.isArray(data) ? data : data?.results || [];
  const totals = data?.totals;
  const counts = data?.counts;

  const complianceSections = key === 'compliance' ? [
    { title: 'صورت‌های فاقد پیوست', rows: data?.missing_document || [], cols: ['number', 'date', 'fund', 'status', 'amount'] },
    { title: 'مغایرت مبلغ سطر', rows: data?.amount_mismatch || [], cols: ['number', 'line', 'expected', 'actual'] },
    { title: 'خارج از سقف پرداخت', rows: data?.over_limit || [], cols: ['number', 'date', 'amount'] },
  ] : [];

  return (
    <Box>
      <PageHeader
        icon={<AssessmentIcon />}
        title={def.label}
        badge={<Chip label="گزارشات تنخواه" color="primary" variant="outlined" sx={{ fontWeight: 700 }} />}
        actions={(
          <Stack direction="row" spacing={1} alignItems="center">
            <Button variant="outlined" size="small" startIcon={<RefreshIcon />} onClick={() => refetch()} disabled={isFetching}>
              به‌روزرسانی
            </Button>
          </Stack>
        )}
      />

      {(uses('range') || uses('fund') || uses('status') || uses('kind')) && (
        <Paper sx={{ ...glass, p: 1.5, mb: 2 }}>
          <Grid container spacing={1.5} alignItems="center">
            {uses('kind') && (
              <Grid item xs={12} md={2}>
                <TextField select fullWidth size="small" label="نوع ریز" value={kind} onChange={(e) => setKind(e.target.value)}>
                  <MenuItem value="statements">صورت‌های هزینه</MenuItem>
                  <MenuItem value="transactions">حرکات مالی</MenuItem>
                </TextField>
              </Grid>
            )}
            {uses('range') && (
              <>
                <Grid item xs={12} md={2}>
                  <JalaliDatePicker label="از تاریخ" value={dateFrom} onChange={setDateFrom} />
                </Grid>
                <Grid item xs={12} md={2}>
                  <JalaliDatePicker label="تا تاریخ" value={dateTo} onChange={setDateTo} />
                </Grid>
              </>
            )}
            {uses('fund') && (
              <Grid item xs={12} md={2}>
                <TextField select fullWidth size="small" label="تنخواه" value={fund} onChange={(e) => setFund(e.target.value)}>
                  <MenuItem value="">همه</MenuItem>
                  {fundList.map(f => <MenuItem key={f.id} value={f.id}>{f.title}</MenuItem>)}
                </TextField>
              </Grid>
            )}
            {uses('custodian') && (
              <Grid item xs={12} md={2}>
                <TextField fullWidth size="small" type="number" label="شناسه تنخواه‌دار" value={custodian}
                  onChange={(e) => setCustodian(e.target.value)} />
              </Grid>
            )}
            {uses('status') && (
              <Grid item xs={12} md={2}>
                <TextField select fullWidth size="small" label="وضعیت" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <MenuItem value="">همه</MenuItem>
                  <MenuItem value="draft">پیش‌نویس</MenuItem>
                  <MenuItem value="submitted">ارسال‌شده</MenuItem>
                  <MenuItem value="approved">تأییدشده</MenuItem>
                  <MenuItem value="posted">ثبت نهایی</MenuItem>
                  <MenuItem value="rejected">برگشت‌خورده</MenuItem>
                </TextField>
              </Grid>
            )}
            <Grid item xs={12} md={2}>
              <Button fullWidth variant="text" onClick={() => {
                setDateFrom(''); setDateTo(''); setFund(''); setCustodian(''); setStatus(''); setKind('statements');
              }}>
                پاک‌کردن فیلترها
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }}>
          خطا در دریافت گزارش: {error.response?.data?.error || error.message}
        </Alert>
      )}

      {totals && (
        <Grid container spacing={1.5} sx={{ mb: 2 }}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ ...glass, p: 1.5 }}>
              <Typography variant="caption" color="textSecondary">تعداد ردیف</Typography>
              <Typography variant="h6" fontWeight={800}>{money(totals.count)}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ ...glass, p: 1.5 }}>
              <Typography variant="caption" color="textSecondary">جمع مبلغ</Typography>
              <Typography variant="h6" fontWeight={800} color={COLOR_DARK}>{money(totals.amount)} ریال</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ ...glass, p: 1.5 }}>
              <Typography variant="caption" color="textSecondary">تعداد نمایش‌داده‌شده</Typography>
              <Typography variant="h6" fontWeight={800}>{money(rows.length)}</Typography>
            </Paper>
          </Grid>
        </Grid>
      )}


      <Paper sx={{ ...glass, p: 1.5 }}>
        {isLoading ? <Box textAlign="center" py={5}><CircularProgress /></Box> : key === 'compliance' ? (
          <Box>
            <Stack direction="row" spacing={1} sx={{ mb: 1.5 }} flexWrap="wrap" useFlexGap>
              <Chip color="error" variant="outlined" label={`فاقد پیوست: ${money(counts?.missing_document || 0)}`} />
              <Chip color="warning" variant="outlined" label={`مغایرت مبلغ: ${money(counts?.amount_mismatch || 0)}`} />
              <Chip color="secondary" variant="outlined" label={`خارج از سقف: ${money(counts?.over_limit || 0)}`} />
            </Stack>
            <Divider sx={{ mb: 1.5 }} />
            {complianceSections.map(section => (
              <Box key={section.title} sx={{ mb: 2 }}>
                <Typography variant="subtitle2" fontWeight={800} sx={{ color: COLOR_DARK, mb: 1 }}>
                  {section.title} ({money(section.rows.length)})
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>{section.cols.map(c => <TableCell key={c}>{c}</TableCell>)}</TableRow>
                    </TableHead>
                    <TableBody>
                      {section.rows.length === 0 ? (
                        <TableRow><TableCell colSpan={section.cols.length} align="center">موردی وجود ندارد</TableCell></TableRow>
                      ) : section.rows.slice(0, 100).map((row, idx) => (
                        <TableRow key={idx} hover>
                          {section.cols.map(c => (
                            <TableCell key={c}>
                              {['amount', 'expected', 'actual'].includes(c) ? money(row[c]) : (row[c] ?? '—')}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            ))}
          </Box>
        ) : (
          <TableContainer sx={{ maxHeight: 620 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  {def.columns.map(col => <TableCell key={col.key}>{col.label}</TableCell>)}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={def.columns.length} align="center">داده‌ای برای نمایش وجود ندارد</TableCell>
                  </TableRow>
                ) : rows.map((row, idx) => (
                  <TableRow key={row.id || idx} hover>
                    {def.columns.map(col => (
                      <TableCell
                        key={col.key}
                        sx={{
                          fontWeight: col.money ? 700 : 400,
                          color: (col.danger && Number(row[col.key]))
                            ? '#ef4444'
                            : ((col.warn && Number(row[col.key])) ? '#f59e0b' : 'inherit'),
                        }}
                      >
                        {cellValue(row, col)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
};

export default PettyCashReportsPage;

