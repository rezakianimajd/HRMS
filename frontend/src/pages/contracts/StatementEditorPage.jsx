import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../core/api/axiosConfig';
import {
  Alert, Avatar, Box, Button, ButtonBase, Chip, CircularProgress, Dialog,
  DialogActions, DialogContent, DialogTitle, Divider, FormControl,
  FormControlLabel, Grid, IconButton, InputAdornment, InputLabel, MenuItem,
  Paper, Select, Snackbar, Stack, Switch, TextField, ToggleButton,
  ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DescriptionIcon from '@mui/icons-material/Description';
import DownloadIcon from '@mui/icons-material/Download';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import PaymentsIcon from '@mui/icons-material/Payments';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import RefreshIcon from '@mui/icons-material/Refresh';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import TableRowsIcon from '@mui/icons-material/TableRows';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import html2canvas from 'html2canvas';
import { formatPersianNumber, normalizeCurrencyLabel, toPersianDigits } from '../../core/utils/numberUtils';
import { getJalaliParts, toJalali } from '../../core/utils/dateUtils';
import JalaliDatePicker from '../../core/components/ui/JalaliDatePicker';
import ContractListPicker from '../../core/components/ui/ContractListPicker';
import MoneyInput from '../../core/components/ui/MoneyInput';
import PageHeader from '../../core/components/ui/PageHeader';
import useCompany from '../../core/hooks/useCompany';
import { KpiTile, ProgressBar, SurfaceCard, INK, MUTED, SOFT_BG } from '../accounting/AccountingDashboardUI';
import { ColumnChart } from '../../core/components/charts/Charts';
import { AttachmentPicker } from './AddendumWorkspaceUI';
import {
  ContractSnapshotCard, FinancialCoverageCard, StatusNav, StatementCard,
  StatementDetailDrawer, StatementLanding, StatementTable, STATEMENT_ACCENT,
  contractAmountOf, currencyFor, dateLabel, money, rowMetrics, statementStatus,
} from './StatementWorkspaceUI';

const COLOR = '#6366f1';
const COLOR_DARK = '#4f46e5';

const glass = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.70), rgba(255,255,255,0.34))',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(255,255,255,0.6)',
  boxShadow: '0 16px 44px rgba(99,102,241,0.14)',
  borderRadius: '16px',
};

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px',
    background: 'rgba(255,255,255,0.55)',
    transition: 'all .2s ease',
    '&:hover': { background: 'rgba(255,255,255,0.84)' },
    '&.Mui-focused': { background: 'rgba(255,255,255,0.95)', boxShadow: `0 0 0 3px ${COLOR}22` },
  },
};

const readonlyFieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px',
    background: 'rgba(99,102,241,0.07)',
    '& .MuiOutlinedInput-input': { fontWeight: 800, color: COLOR_DARK },
    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(99,102,241,0.25)' },
  },
};

const labelSx = { fontWeight: 700, color: COLOR_DARK, mb: 0.5, display: 'block', fontSize: 12 };

const num = (v) => Math.max(0, Number(v) || 0);

/* Reliable print: rasterize the live preview with html2canvas (so the output is
   pixel-identical to what the user sees) and print the resulting image on A4.
   No dependency on the app's CSS @media print rules, so nothing gets hidden. */
const printStatement = async () => {
  const node = document.getElementById('statement-print-area');
  if (!node) { window.print(); return; }

  let frame = document.getElementById('statement-print-frame');
  if (!frame) {
    frame = document.createElement('iframe');
    frame.id = 'statement-print-frame';
    frame.title = 'print';
    frame.style.position = 'fixed';
    frame.style.left = '0';
    frame.style.top = '0';
    frame.style.width = '794px';
    frame.style.height = '1123px';
    frame.style.border = '0';
    frame.style.visibility = 'hidden';
    frame.style.zIndex = '-1';
    document.body.appendChild(frame);
  }

  try {
    // Temporarily strip shadow/border so the printout is clean & professional.
    const prev = {
      boxShadow: node.style.boxShadow,
      border: node.style.border,
      borderRadius: node.style.borderRadius,
    };
    node.style.boxShadow = 'none';
    node.style.border = 'none';
    node.style.borderRadius = '0';

    try {
      const canvas = await html2canvas(node, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
      });

      // Compose onto a fixed A4 canvas so the result is ALWAYS a single page,
      // centered horizontally and top-aligned (white padding fills the rest).
      const A4_W = 794;   // 210mm @ 96dpi
      const A4_H = 1123;  // 297mm @ 96dpi
      const RATIO = 2;
      const a4 = document.createElement('canvas');
      a4.width = A4_W * RATIO;
      a4.height = A4_H * RATIO;
      const ctx = a4.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, a4.width, a4.height);

      // Safe margins so nothing is clipped at the paper edge (printers can't
      // print to the very edge), while keeping the content centered horizontally.
      const PAD_X = 40;    // horizontal margin (20px @1x ≈ 5mm)
      const PAD_TOP = 24;  // top margin (12px @1x ≈ 3mm)
      const availW = a4.width - PAD_X * 2;
      const availH = a4.height - PAD_TOP;
      const fit = Math.min(availW / canvas.width, availH / canvas.height);
      const w = canvas.width * fit;
      const h = canvas.height * fit;
      const x = (a4.width - w) / 2;
      const y = PAD_TOP;
      ctx.drawImage(canvas, x, y, w, h);

      const imgData = a4.toDataURL('image/png');

      const doc = frame.contentWindow.document;
      doc.open();
      doc.write(
        '<!DOCTYPE html><html dir="rtl" lang="fa"><head><meta charset="utf-8"><title>صورت‌وضعیت</title>' +
        '<style>' +
        '@page{size:A4;margin:0}' +
        'html,body{margin:0;padding:0;width:210mm;height:297mm;overflow:hidden;background:#fff}' +
        'img{position:fixed;top:0;left:0;width:210mm;height:297mm;display:block}' +
        '</style></head><body>' +
        '<img src="' + imgData + '" />' +
        '</body></html>'
      );
      doc.close();

      const img = frame.contentWindow.document.querySelector('img');
      const doPrint = () => {
        try { frame.contentWindow.focus(); frame.contentWindow.print(); }
        catch (e) { window.print(); }
      };
      if (img && !img.complete) img.onload = doPrint;
      else setTimeout(doPrint, 150);
    } finally {
      node.style.boxShadow = prev.boxShadow;
      node.style.border = prev.border;
      node.style.borderRadius = prev.borderRadius;
    }
  } catch (e) {
    window.print();
  }
};

/* ------------------------------------------------------------------ */
/* A4-style statement preview                                          */
/* ------------------------------------------------------------------ */
const StatementPreview = ({ form, contract, company, currencies, rate: rateProp }) => {
  const rate = num(rateProp) || 1;
  const addendums = contract?.addendums || [];
  const baseAmount = num(contract?.amount);
  const totalAddendumChange = addendums.reduce((s, a) => s + num(a.amount_change), 0);
  const contractAmount = baseAmount + totalAddendumChange;
  const lastAddendum = addendums.length
    ? addendums.reduce((m, a) => (a.date > m.date ? a : m), addendums[0])
    : null;
  const endDateWithAddendum = lastAddendum?.new_end_date || contract?.end_date;

  const additions = Array.isArray(form.additions) ? form.additions : [];
  const deductions = Array.isArray(form.deductions) ? form.deductions : [];
  const additionsTotal = additions.reduce((s, a) => s + num(a.amount), 0);
  const deductionsTotal = deductions.reduce((s, d) => s + num(d?.amount), 0);
  const cumulativeThis = num(form.amount);
  const cumulativePrev = num(form.cumulative_previous_amount);
  const workDone = cumulativeThis - cumulativePrev;
  const netAmount = workDone + additionsTotal - deductionsTotal;

  const cur = currencies.find((c) => String(c.id) === String(form.currency)) || null;
  const currencyLabel = normalizeCurrencyLabel(cur?.name || cur?.symbol);
  const fx = (v) => (rate > 1 ? v / rate : null);

  return (
    <Box id="statement-print-area" dir="rtl" sx={{
      background: '#ffffff', borderRadius: '16px', p: 2,
      boxShadow: '0 20px 54px rgba(15,23,42,0.16)', border: '1px solid rgba(15,23,42,0.06)',
      position: 'relative', overflow: 'hidden',
      '&::before': { content: '""', position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% -10%, ${COLOR}1f, transparent 55%)`, pointerEvents: 'none' },
    }}>
      {/* Top-centered logo + company title (from primary definitions) */}
      <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', pb: 1 }}>
        {company?.logo_url ? (
          <Box component="img" src={company.logo_url} alt="logo"
            sx={{ width: 46, height: 46, borderRadius: '12px', objectFit: 'contain', background: '#fff', border: `1px solid ${COLOR}22`, boxShadow: `0 4px 12px ${COLOR}1f` }} />
        ) : (
          <Box sx={{ width: 46, height: 46, borderRadius: '12px', background: `linear-gradient(135deg, ${COLOR}, ${COLOR_DARK})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 12px ${COLOR}55` }}>
            <Typography fontWeight={900} color="#fff" fontSize={22}>{company?.name?.[0] || 'ش'}</Typography>
          </Box>
        )}
        <Typography variant="subtitle1" fontWeight={900} sx={{ color: '#1e293b', mt: 0.4, textAlign: 'center', fontSize: 15 }}>
          {company?.name || 'نام شرکت'}
        </Typography>
      </Box>

      <Divider sx={{ borderStyle: 'dashed', borderColor: `${COLOR}44`, my: 1 }} />

      {/* Section 1: statement number + date + currency */}
      <Grid container spacing={1.5}>
        <Grid item xs={4}><Field label="شماره صورت‌وضعیت" value={form.number || '—'} /></Grid>
        <Grid item xs={4}><Field label="تاریخ" value={form.date ? toJalali(form.date) : '—'} /></Grid>
        <Grid item xs={4}><Field label="واحد ارز" value={currencyLabel || '—'} /></Grid>
      </Grid>

      <Divider sx={{ borderStyle: 'dashed', borderColor: `${COLOR}44`, my: 1 }} />

      {/* Section 2: contract / party info */}
      <Grid container spacing={1.5}>
        <Grid item xs={6}><Field label="نام پیمانکار" value={contract?.party_name || '—'} /></Grid>
        <Grid item xs={6}><Field label="شماره قرارداد" value={contract?.number || '—'} /></Grid>
        <Grid item xs={12}><Field label="موضوع قرارداد" value={contract?.subject || '—'} /></Grid>
        <Grid item xs={6}><Field label="تاریخ شروع" value={contract?.start_date ? toJalali(contract.start_date) : '—'} /></Grid>
        <Grid item xs={6}><Field label="تاریخ پایان" value={endDateWithAddendum ? toJalali(endDateWithAddendum) : '—'} /></Grid>
        <Grid item xs={6}><Field label="آخرین الحاقیه" value={lastAddendum?.date ? toJalali(lastAddendum.date) : '—'} /></Grid>
        <Grid item xs={6}><Field label="مبلغ قرارداد" value={`${formatPersianNumber(contractAmount)} ${currencyLabel || 'ریال'}`} strong color={COLOR_DARK} /></Grid>
      </Grid>

      <Divider sx={{ borderStyle: 'dashed', borderColor: `${COLOR}44`, my: 1 }} />

      {/* Section 3: financial breakdown */}
      <Box sx={{ borderRadius: '12px', p: 2, background: `linear-gradient(135deg, ${COLOR}0e, ${COLOR}05)`, border: `1px solid ${COLOR}22` }}>
        <Row label="مبلغ تجمعی این صورت‌وضعیت" value={cumulativeThis} strong foreign={fx(cumulativeThis)} foreignSymbol={currencyLabel} />
        <Row label="مبلغ تجمعی صورت‌وضعیت قبلی" value={cumulativePrev} foreign={fx(cumulativePrev)} foreignSymbol={currencyLabel} />
        <Row label="کارکرد دوره" value={workDone} highlight foreign={fx(workDone)} foreignSymbol={currencyLabel} />
      </Box>

      {/* Additions */}
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#059669', mb: 0.5 }}>اضافات</Typography>
        {additions.length === 0 ? (
          <Typography variant="caption" color="textSecondary">افزودنی ثبت نشده</Typography>
        ) : (
          additions.map((a, i) => <Row key={i} label={a.description || 'اضافه'} value={num(a.amount)} foreign={fx(num(a.amount))} foreignSymbol={currencyLabel} />)
        )}
        <Box sx={{ borderTop: '1px solid #34d39933', mt: 0.5, pt: 0.5 }}>
          <Row label="جمع اضافات" value={additionsTotal} green strong foreign={fx(additionsTotal)} foreignSymbol={currencyLabel} />
        </Box>
      </Box>

      {/* Deductions */}
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#b91c1c', mb: 0.5 }}>کسورات</Typography>
        {deductions.length === 0 ? (
          <Typography variant="caption" color="textSecondary">کسوری ثبت نشده</Typography>
        ) : (
          deductions.map((d, i) => <Row key={i} label={d.title || 'کسور'} value={num(d.amount)} foreign={fx(num(d.amount))} foreignSymbol={currencyLabel} />)
        )}
        <Box sx={{ borderTop: '1px solid #fca5a533', mt: 0.5, pt: 0.5 }}>
          <Row label="جمع کسورات" value={deductionsTotal} red strong foreign={fx(deductionsTotal)} foreignSymbol={currencyLabel} />
        </Box>
      </Box>

      <Divider sx={{ my: 1, borderStyle: 'dashed', borderColor: `${COLOR}44` }} />

      {/* Net payable */}
      <Box sx={{ borderRadius: '12px', p: 1.2, background: 'linear-gradient(135deg,#10b98114,#0ea5e912)', border: '1px solid #10b98140' }}>
        <Typography variant="caption" color="textSecondary" sx={{ display: 'block', textAlign: 'center', mb: 0.8 }}>مبلغ قابل پرداخت این دوره</Typography>
        <Grid container spacing={1}>
          <Grid item xs={6}>
            <Box sx={{ borderRadius: '10px', p: 1, background: '#05966912', border: '1px solid #05966933', textAlign: 'center' }}>
              <Typography variant="caption" color="textSecondary">ریال</Typography>
              <Typography variant="body1" fontWeight={900} sx={{ color: '#059669', direction: 'rtl', fontSize: 15 }}>{formatPersianNumber(netAmount)}</Typography>
            </Box>
          </Grid>
          <Grid item xs={6}>
            <Box sx={{ borderRadius: '10px', p: 1, background: '#4338ca0f', border: '1px solid #4338ca33', textAlign: 'center' }}>
              <Typography variant="caption" color="textSecondary">{currencyLabel || 'ارز'}</Typography>
              <Typography variant="body1" fontWeight={900} sx={{ color: '#4338ca', direction: 'rtl', fontSize: 15 }}>{fx(netAmount) != null ? formatPersianNumber(fx(netAmount)) : '—'}</Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Signatures */}
      <Grid container spacing={2} sx={{ mt: 1.5 }}>
        {['تهیه‌کننده', 'تأییدکننده', 'مدیر مالی'].map((s) => (
          <Grid item xs={4} key={s}>
            <Box sx={{ textAlign: 'center' }}>
              <Box sx={{ height: 26, borderBottom: `1px dashed ${COLOR}55`, mb: 0.5 }} />
              <Typography variant="caption" color="textSecondary">{s}</Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

const Row = ({ label, value, strong, red, green, highlight, foreign, foreignSymbol }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, py: 0.35, px: 1, mb: 0.35, borderRadius: '8px', background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(15,23,42,0.05)' }}>
    <Typography variant="caption" color="textSecondary" sx={{ whiteSpace: 'nowrap', fontSize: 11 }}>{label}</Typography>
    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
      <Typography variant="body2" fontWeight={strong || highlight ? 800 : 700} fontSize={13}
        sx={{ direction: 'rtl', color: red ? '#b91c1c' : green ? '#059669' : highlight ? '#0ea5e9' : strong ? COLOR_DARK : 'text.primary' }}>
        {formatPersianNumber(value)}
      </Typography>
      {foreign != null && (
        <Typography variant="caption" color="textSecondary" sx={{ direction: 'rtl', whiteSpace: 'nowrap', fontSize: 11 }}>
          ≈ {formatPersianNumber(foreign)} {foreignSymbol || ''}
        </Typography>
      )}
    </Box>
  </Box>
);

const Field = ({ label, value, strong, color }) => (
  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, minWidth: 0 }}>
    <Typography variant="caption" color="textSecondary" sx={{ whiteSpace: 'nowrap', fontSize: 11 }}>{label}:</Typography>
    <Typography variant="body2" fontWeight={strong ? 800 : 700} sx={{ color: color || '#1e293b', fontSize: 13 }} noWrap>{value}</Typography>
  </Box>
);

/* ------------------------------------------------------------------ */
/* Main editor page                                                    */
/* ------------------------------------------------------------------ */
const MONTH_NAMES = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
const GREEN = '#0f766e';
const AMBER = '#b45309';
const BLUE = '#2563eb';
const compactMoney = (value, currency = '') => {
  const amount = Number(value) || 0;
  if (Math.abs(amount) >= 1000000000) return `${formatPersianNumber((amount / 1000000000).toFixed(1))} میلیارد ${currency}`.trim();
  if (Math.abs(amount) >= 1000000) return `${formatPersianNumber((amount / 1000000).toFixed(1))} میلیون ${currency}`.trim();
  return `${formatPersianNumber(amount)} ${currency}`.trim();
};
const todayIso = () => new Date().toISOString().slice(0, 10);
const asArray = (value) => (Array.isArray(value) ? value : value?.results || []);

const StatementEditorPage = () => {
  const qc = useQueryClient();
  const theme = useTheme();
  const navigate = useNavigate();
  const { currentCompany } = useCompany();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlContract = searchParams.get('contract') || '';
  const [contractId, setContractId] = useState(urlContract);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [view, setView] = useState('cards');
  const [detail, setDetail] = useState(null);
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({});
  const [rateOverride, setRateOverride] = useState('');
  const [printPending, setPrintPending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const { data: companyProfile } = useQuery({
    queryKey: ['company-profile'],
    queryFn: () => axiosInstance.get('/settings/company-profile/').then((response) => response.data),
  });
  const company = {
    name: companyProfile?.company_name || companyProfile?.legal_name || currentCompany?.name || '',
    code: currentCompany?.code || '',
    logo_url: companyProfile?.logo_url || currentCompany?.logo_url || null,
  };

  const { data: contracts, isLoading: contractsLoading } = useQuery({
    queryKey: ['external-contracts', 'statement-workspace'],
    queryFn: () => axiosInstance.get('/external-contracts/', { params: { page_size: 500 } }).then((response) => response.data),
  });
  const contractList = asArray(contracts);

  const { data: statementsData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['contract-statements'],
    queryFn: () => axiosInstance.get('/contract-statements/', { params: { page_size: 500 } }).then((response) => response.data),
  });
  const allStatements = asArray(statementsData);

  const { data: contractDetail } = useQuery({
    queryKey: ['contract-statement-detail', contractId],
    queryFn: () => axiosInstance.get(`/external-contracts/${contractId}/`).then((response) => response.data),
    enabled: Boolean(contractId),
  });

  const { data: additionsDef } = useQuery({ queryKey: ['additions'], queryFn: () => axiosInstance.get('/additions/').then((response) => response.data) });
  const { data: deductionsDef } = useQuery({ queryKey: ['deductions'], queryFn: () => axiosInstance.get('/deductions/').then((response) => response.data) });
  const { data: currencies } = useQuery({ queryKey: ['currencies'], queryFn: () => axiosInstance.get('/currencies/').then((response) => response.data) });
  const additionList = asArray(additionsDef);
  const deductionList = asArray(deductionsDef);
  const currencyList = asArray(currencies);

  const { data: paymentsData, isLoading: paymentsLoading } = useQuery({
    queryKey: ['contract-statement-payments', contractId],
    queryFn: () => axiosInstance.get('/contract-payments/', { params: { contract: contractId, page_size: 500 } }).then((response) => response.data),
    enabled: Boolean(contractId),
  });
  const payments = asArray(paymentsData);

  const selectedContract = contractDetail
    || contractList.find((contract) => String(contract.id) === String(contractId))
    || null;
  const scopedList = useMemo(
    () => (contractId ? allStatements.filter((row) => String(row.contract) === String(contractId)) : []),
    [allStatements, contractId],
  );
  const currenciesById = useMemo(
    () => currencyList.reduce((map, currency) => ({ ...map, [String(currency.id)]: currency }), {}),
    [currencyList],
  );
  const currencyLabel = normalizeCurrencyLabel(
    selectedContract?.currency_name || selectedContract?.currency_symbol
    || currenciesById[String(selectedContract?.currency)]?.name || 'ریال',
  );
  const selectedContractAmount = contractAmountOf(selectedContract);
  const lastStatement = useMemo(
    () => [...scopedList].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))[0] || null,
    [scopedList],
  );

  const counts = useMemo(() => {
    const next = { all: scopedList.length, approved: 0, pending: 0 };
    scopedList.forEach((row) => {
      if (row.is_approved) next.approved += 1;
      else next.pending += 1;
    });
    return next;
  }, [scopedList]);

  const totals = useMemo(() => {
    const metrics = scopedList.map((row) => rowMetrics(row));
    const net = metrics.reduce((sum, item) => sum + item.net, 0);
    const work = metrics.reduce((sum, item) => sum + item.work, 0);
    const cumulative = lastStatement ? rowMetrics(lastStatement).amount : 0;
    const paid = payments
      .filter((payment) => payment.statement)
      .reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
    return {
      net, work, cumulative, paid,
      outstanding: Math.max(0, net - paid),
      approvedCount: counts.approved,
      pendingCount: counts.pending,
      overContract: Math.max(0, cumulative - selectedContractAmount),
    };
  }, [scopedList, payments, counts, selectedContractAmount, lastStatement]);
  const contractProgress = selectedContractAmount > 0 ? Math.min(100, (totals.cumulative / selectedContractAmount) * 100) : 0;

  const statementCountByContract = useMemo(
    () => allStatements.reduce((acc, row) => {
      const key = String(row.contract);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {}),
    [allStatements],
  );

  const pendingRows = useMemo(
    () => [...allStatements]
      .filter((row) => !row.is_approved)
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
      .slice(0, 6),
    [allStatements],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    let result = scopedList.filter((row) => {
      if (statusFilter === 'approved' && !row.is_approved) return false;
      if (statusFilter === 'pending' && row.is_approved) return false;
      if (!query) return true;
      return [row.number, row.contract_subject, row.description, ...(row.documents || []).map((doc) => doc.title)]
        .some((value) => String(value || '').toLowerCase().includes(query));
    });
    result = [...result].sort((a, b) => {
      if (sortBy === 'amount') return Number(b.amount || 0) - Number(a.amount || 0);
      if (sortBy === 'net') return rowMetrics(b).net - rowMetrics(a).net;
      if (sortBy === 'work') return rowMetrics(b).work - rowMetrics(a).work;
      return String(b.date || '').localeCompare(String(a.date || ''));
    });
    return result;
  }, [scopedList, search, statusFilter, sortBy]);

  const monthlyData = useMemo(() => {
    const buckets = new Map();
    scopedList.forEach((row) => {
      if (!row.date) return;
      const parts = getJalaliParts(row.date);
      if (!parts) return;
      const key = `${parts[0]}-${String(parts[1]).padStart(2, '0')}`;
      buckets.set(key, (buckets.get(key) || 0) + rowMetrics(row).net);
    });
    return [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, value]) => {
        const month = Number(key.split('-')[1]);
        return { label: MONTH_NAMES[month - 1] || key, value };
      });
  }, [scopedList]);

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['contract-statements'] });
    qc.invalidateQueries({ queryKey: ['contract-statement-payments', contractId] });
    qc.invalidateQueries({ queryKey: ['external-contracts'] });
  };

  const sanitizeStatement = (payload) => {
    const additions = (Array.isArray(payload.additions) ? payload.additions : [])
      .map((item) => ({ ...item, percent: Number(item.percent) || 0, amount: Number(item.amount) || 0 }));
    const deductions = (Array.isArray(payload.deductions) ? payload.deductions : [])
      .map((item) => ({ ...item, percent: Number(item.percent) || 0, amount: Number(item.amount) || 0 }));
    const amount = Math.max(0, Number(payload.amount) || 0);
    const previous = Math.max(0, Number(payload.cumulative_previous_amount) || 0);
    const work = Math.max(0, amount - previous);
    const valueAddedTax = Math.max(0, Number(payload.value_added_tax) || 0);
    const otherAdditions = Math.max(0, Number(payload.other_additions) || 0);
    const additionsTotal = additions.reduce((sum, item) => sum + item.amount, 0) + valueAddedTax + otherAdditions;
    const deductionsTotal = deductions.reduce((sum, item) => sum + item.amount, 0);
    return {
      contract: Number(payload.contract) || null,
      number: payload.number || '',
      date: payload.date || null,
      amount,
      cumulative_previous_amount: previous,
      work_done: work,
      value_added_tax: valueAddedTax,
      other_additions: otherAdditions,
      additions: additions.map(({ code, description, percent, amount: itemAmount }) => ({ code, description, percent, amount: itemAmount })),
      additions_total: additionsTotal,
      deductions: deductions.map(({ title, description, percent, amount: itemAmount, note }) => ({ title, description, percent, amount: itemAmount, note })),
      deductions_total: deductionsTotal,
      net_amount: work + additionsTotal - deductionsTotal,
      currency: payload.currency || null,
      exchange_rate: Number(rate) || null,
      is_approved: Boolean(payload.is_approved),
      description: payload.description || '',
    };
  };

  const uploadStatementFiles = async (statementId, contract, files = []) => {
    await Promise.all(files.map((file) => {
      const body = new FormData();
      body.append('contract', contract);
      body.append('statement', statementId);
      body.append('title', (file.name.replace(/\.[^.]+$/, '') || 'مدرک صورت‌وضعیت').slice(0, 200));
      body.append('file', file);
      return axiosInstance.post('/contract-documents/', body);
    }));
  };

  const save = useMutation({
    mutationFn: async (payload) => {
      const clean = sanitizeStatement(payload);
      const response = payload.id
        ? await axiosInstance.patch(`/contract-statements/${payload.id}/`, clean)
        : await axiosInstance.post('/contract-statements/', clean);
      const statementId = response.data?.id || payload.id;
      let uploadError = '';
      if (payload.pendingFiles?.length) {
        try {
          await uploadStatementFiles(statementId, clean.contract, payload.pendingFiles);
        } catch (uploadFailure) {
          const data = uploadFailure.response?.data;
          uploadError = typeof data === 'string'
            ? data
            : (data?.file?.[0] || data?.statement?.[0] || data?.detail || 'بارگذاری مدارک انجام نشد');
        }
      }
      return { response, uploadError };
    },
    onSuccess: ({ uploadError }) => {
      invalidateAll();
      setDialog(false);
      setForm({});
      setRateOverride('');
      setError('');
      setToast(uploadError
        ? `صورت‌وضعیت ذخیره شد اما بارگذاری مدارک ناقص بود: ${uploadError}`
        : 'صورت‌وضعیت و مدارک ذخیره شدند');
    },
    onError: (event) => {
      const data = event.response?.data;
      const first = typeof data === 'string'
        ? data
        : Array.isArray(data)
          ? data[0]
          : data && Object.values(data).flat()[0];
      setError(typeof first === 'string' ? first : 'ذخیره صورت‌وضعیت انجام نشد.');
    },
  });

  const toggleApproval = useMutation({
    mutationFn: (row) => axiosInstance.patch(`/contract-statements/${row.id}/`, { is_approved: !row.is_approved }),
    onSuccess: (_data, row) => {
      invalidateAll();
      setDetail(null);
      setToast(row.is_approved ? 'تأیید صورت‌وضعیت لغو شد' : 'صورت‌وضعیت تأیید شد');
    },
    onError: () => setToast('تغییر وضعیت تأیید انجام نشد'),
  });

  const remove = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/contract-statements/${id}/`),
    onSuccess: () => {
      invalidateAll();
      setConfirmDelete(null);
      setDetail(null);
      setToast('صورت‌وضعیت حذف شد');
    },
    onError: () => setToast('حذف صورت‌وضعیت انجام نشد'),
  });

  const removeDocument = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/contract-documents/${id}/`),
    onSuccess: (_data, id) => {
      setForm((previous) => ({
        ...previous,
        documents: (previous.documents || []).filter((document) => document.id !== id),
      }));
      invalidateAll();
      setToast('مدرک پیوست حذف شد');
    },
    onError: () => setError('حذف مدرک پیوست انجام نشد'),
  });

  useEffect(() => { setContractId(urlContract); }, [urlContract]);

  useEffect(() => {
    setSearch('');
    setStatusFilter('all');
    setSortBy('newest');
    setView('cards');
    setDetail(null);
  }, [contractId]);

  useEffect(() => {
    if (dialog && printPending) {
      const timer = setTimeout(() => { printStatement(); setPrintPending(false); }, 550);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [dialog, printPending]);

  const selectContract = (contract) => {
    const next = String(contract.id);
    setContractId(next);
    setSearchParams({ contract: next });
  };
  const clearContract = () => {
    setContractId('');
    setSearchParams({});
  };
  const selectContractById = (id) => {
    const target = contractList.find((contract) => String(contract.id) === String(id));
    if (target) selectContract(target);
  };

  const setField = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));

  const additions = Array.isArray(form.additions) ? form.additions : [];
  const deductions = Array.isArray(form.deductions) ? form.deductions : [];
  const valueAddedTax = num(form.value_added_tax);
  const otherAdditions = num(form.other_additions);
  const additionsTotal = additions.reduce((sum, item) => sum + num(item.amount), 0) + valueAddedTax + otherAdditions;
  const previewAdditions = [
    ...additions,
    ...(valueAddedTax ? [{ description: 'ارزش افزوده', amount: valueAddedTax }] : []),
    ...(otherAdditions ? [{ description: 'سایر اضافات', amount: otherAdditions }] : []),
  ];
  const deductionsTotal = deductions.reduce((sum, item) => sum + num(item.amount), 0);
  const cumulativePrev = num(form.cumulative_previous_amount);
  const cumulativeThis = num(form.amount);
  const workDone = Math.max(0, cumulativeThis - cumulativePrev);
  const netAmount = workDone + additionsTotal - deductionsTotal;
  const formCurrency = currencyList.find((currency) => String(currency.id) === String(form.currency)) || null;
  const formCurrencyLabel = normalizeCurrencyLabel(
    formCurrency?.name || formCurrency?.symbol || currencyLabel,
  );
  const baseRate = num(formCurrency?.exchange_rate || 1);
  const rate = rateOverride !== '' && rateOverride != null ? num(rateOverride) : baseRate;
  const formContract = contractList.find((contract) => String(contract.id) === String(form.contract))
    || (String(form.contract) === String(contractId) ? selectedContract : null);
  const formContractAmount = contractAmountOf(formContract);
  const overContract = formContractAmount > 0 && cumulativeThis > formContractAmount;
  const progress = formContractAmount > 0 ? Math.min(100, (cumulativeThis / formContractAmount) * 100) : 0;

  const openNew = () => {
    const previousAmount = lastStatement ? num(lastStatement.amount) : 0;
    setForm({
      contract: contractId,
      number: '',
      date: todayIso(),
      amount: previousAmount,
      cumulative_previous_amount: previousAmount,
      currency: selectedContract?.currency || '',
      value_added_tax: 0,
      other_additions: 0,
      additions: [],
      deductions: [],
      documents: [],
      pendingFiles: [],
      is_approved: false,
      description: '',
    });
    setRateOverride('');
    setError('');
    setDetail(null);
    setDialog(true);
  };

  const openEdit = (row) => {
    setForm({
      ...row,
      contract: String(row.contract || ''),
      amount: Number(row.amount || 0),
      cumulative_previous_amount: Number(row.cumulative_previous_amount || 0),
      value_added_tax: Number(row.value_added_tax || 0),
      other_additions: Number(row.other_additions || 0),
      additions: Array.isArray(row.additions) ? row.additions : [],
      deductions: Array.isArray(row.deductions) ? row.deductions : [],
      documents: Array.isArray(row.documents) ? row.documents : [],
      pendingFiles: [],
      is_approved: Boolean(row.is_approved),
    });
    setRateOverride(row.exchange_rate != null && row.exchange_rate !== '' ? String(row.exchange_rate) : '');
    setError('');
    setDetail(null);
    setDialog(true);
  };

  const openPrint = (row) => {
    setPrintPending(true);
    openEdit(row);
  };

  const closeEditor = () => {
    if (save.isPending) return;
    setDialog(false);
    setForm({});
    setRateOverride('');
    setError('');
    setPrintPending(false);
  };

  const addDeduction = () => setField('deductions', [...deductions, { title: '', amount: 0, percent: 0 }]);
  const removeDeduction = (index) => setField('deductions', deductions.filter((_, current) => current !== index));
  const updateDeduction = (index, key, value) => {
    setField('deductions', deductions.map((item, current) => (current === index ? { ...item, [key]: value } : item)));
  };
  const chooseDeduction = (definition) => {
    const percent = Number(definition.default_percent || 0);
    setField('deductions', [...deductions, {
      title: definition.description || definition.code,
      percent,
      amount: Math.round((cumulativeThis * percent) / 100),
    }]);
  };

  const addAddition = () => setField('additions', [...additions, { code: '', description: '', percent: 0, amount: 0 }]);
  const removeAddition = (index) => setField('additions', additions.filter((_, current) => current !== index));
  const updateAddition = (index, key, value) => {
    setField('additions', additions.map((item, current) => (current === index ? { ...item, [key]: value } : item)));
  };
  const chooseAddition = (definition) => {
    const percent = Number(definition.default_percent || 0);
    setField('additions', [...additions, {
      code: definition.code,
      description: definition.description,
      percent,
      amount: Math.round((cumulativeThis * percent) / 100),
    }]);
  };

  const addFiles = (files) => {
    const accepted = [];
    let rejection = '';
    (files || []).forEach((file) => {
      const ext = String(file.name || '').toLowerCase().split('.').pop();
      if (!['pdf', 'jpg', 'jpeg', 'png', 'webp', 'xls', 'xlsx', 'doc', 'docx', 'zip', 'rar'].includes(ext)) {
        rejection = 'فرمت‌های مجاز: PDF، تصویر، اکسل، Word و ZIP.';
        return;
      }
      if (Number(file.size) > 25 * 1024 * 1024) {
        rejection = 'حجم هر فایل نباید بیشتر از ۲۵ مگابایت باشد.';
        return;
      }
      accepted.push(file);
    });
    if (accepted.length) {
      setField('pendingFiles', [...(form.pendingFiles || []), ...accepted].slice(0, 10));
    }
    if (rejection) setError(rejection);
  };
  const removePendingFile = (index) => setField('pendingFiles', (form.pendingFiles || []).filter((_, current) => current !== index));

  const submit = () => {
    if (!form.contract) { setError('قرارداد مرتبط را انتخاب کنید.'); return; }
    if (!form.date) { setError('تاریخ صورت‌وضعیت را وارد کنید.'); return; }
    if (cumulativeThis < cumulativePrev) {
      setError('مبلغ تجمعی این صورت‌وضعیت نمی‌تواند کمتر از مبلغ تجمعی دوره قبل باشد.');
      return;
    }
    setError('');
    save.mutate(form);
  };

  const exportCsv = () => {
    const headers = ['شماره', 'تاریخ', 'مبلغ تجمعی', 'کارکرد دوره', 'اضافات', 'کسورات', 'قابل پرداخت', 'وضعیت', 'توضیحات'];
    const rows = filtered.map((row) => {
      const metrics = rowMetrics(row);
      return [
        row.number || '', row.date || '', metrics.amount, metrics.work,
        metrics.additionsTotal, metrics.deductionsTotal, metrics.net,
        row.is_approved ? 'تأیید شده' : 'در انتظار', row.description || '',
      ];
    });
    const csv = [headers, ...rows]
      .map((cells) => cells.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `contract-statements-${contractId || 'all'}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  if (isLoading || contractsLoading) {
    return <Box sx={{ py: 9, textAlign: 'center' }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ pb: 1 }}>
      <PageHeader
        icon={<ReceiptLongIcon />}
        title="صورت‌وضعیت‌های قرارداد"
        badge={(
          <Chip size="small" label={contractId ? `${formatPersianNumber(scopedList.length)} صورت‌وضعیت` : 'مدیریت صورت‌وضعیت‌ها'}
            sx={{ height: 23, fontWeight: 800, bgcolor: alpha(STATEMENT_ACCENT, 0.08), color: STATEMENT_ACCENT }} />
        )}
        actions={(
          <>
            {contractId ? (
              <Tooltip title="به‌روزرسانی">
                <span>
                  <Button variant="outlined" disabled={isFetching} onClick={() => { refetch(); qc.invalidateQueries({ queryKey: ['contract-statement-payments', contractId] }); }} sx={{ minWidth: 40, px: 1 }}>
                    <RefreshIcon fontSize="small" />
                  </Button>
                </span>
              </Tooltip>
            ) : null}
            {contractId ? <Button variant="outlined" startIcon={<DescriptionIcon />} onClick={() => navigate(`/external-contracts/${contractId}`)}>پرونده</Button> : null}
            {contractId ? <Button variant="outlined" startIcon={<PrintOutlinedIcon />} onClick={() => window.print()}>چاپ</Button> : null}
            {contractId ? <Button variant="outlined" startIcon={<DownloadIcon />} onClick={exportCsv}>خروجی</Button> : null}
            {contractId ? <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>صورت‌وضعیت جدید</Button> : null}
          </>
        )}
      />

      {!contractId ? (
        <StatementLanding
          contractList={contractList}
          list={allStatements}
          pendingRows={pendingRows}
          counts={{ approved: allStatements.filter((row) => row.is_approved).length }}
          totalNet={allStatements.reduce((sum, row) => sum + rowMetrics(row).net, 0)}
          currency={normalizeCurrencyLabel(
            contractList.find((contract) => String(contract.id) === String(allStatements[0]?.contract))?.currency_name || 'ریال',
          )}
          accent={STATEMENT_ACCENT}
          onSelect={selectContract}
          onSelectContract={selectContractById}
        />
      ) : (
        <Grid container spacing={1.5}>
          <Grid item xs={12} lg={3} sx={{ order: { xs: 2, lg: 1 } }}>
            <Stack spacing={1.5} sx={{ position: { lg: 'sticky' }, top: 16 }}>
              <ContractSnapshotCard contract={selectedContract} currency={currencyLabel} accent={STATEMENT_ACCENT}
                onBack={clearContract} statementCount={scopedList.length} />
              <FinancialCoverageCard totals={totals} currency={currencyLabel} isLoading={paymentsLoading} accent={STATEMENT_ACCENT} />
              <StatusNav counts={counts} active={statusFilter} onChange={setStatusFilter} accent={STATEMENT_ACCENT} />
            </Stack>
          </Grid>

          <Grid item xs={12} lg={9} sx={{ order: { xs: 1, lg: 2 } }}>
            <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
              <Grid item xs={6} md={3}>
                <KpiTile icon={ReceiptLongIcon} label="تعداد صورت‌وضعیت" value={formatPersianNumber(counts.all)} suffix="مورد" color={STATEMENT_ACCENT} hint={`${formatPersianNumber(counts.pending)} در انتظار تأیید`} />
              </Grid>
              <Grid item xs={6} md={3}>
                <KpiTile icon={PaymentsIcon} label="مجموع قابل پرداخت" value={compactMoney(totals.net, currencyLabel)} color={GREEN} hint={`${formatPersianNumber(counts.approved)} تأییدشده`} size={16} />
              </Grid>
              <Grid item xs={6} md={3}>
                <KpiTile icon={EventAvailableIcon} label="پرداخت‌شده" value={compactMoney(totals.paid, currencyLabel)} color={BLUE} hint={`مانده ${compactMoney(totals.outstanding, currencyLabel)}`} size={16} />
              </Grid>
              <Grid item xs={6} md={3}>
                <KpiTile icon={TrendingUpIcon} label="کارکرد تجمعی" value={compactMoney(totals.cumulative, currencyLabel)} color={AMBER} hint={`پیشرفت قرارداد ${toPersianDigits(contractProgress.toFixed(0))}٪`} size={16} />
              </Grid>
            </Grid>

            <Paper elevation={0} sx={{ p: 1.25, mb: 1.5, borderRadius: '16px', border: `1px solid ${theme.palette.divider}` }}>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
                <TextField size="small" placeholder="جست‌وجو در شماره، قرارداد، توضیحات…"
                  value={search} onChange={(event) => setSearch(event.target.value)}
                  sx={{ minWidth: { xs: '100%', sm: 220 }, flex: 1 }}
                  InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
                <FormControl size="small" sx={{ minWidth: 145 }}>
                  <InputLabel>وضعیت</InputLabel>
                  <Select value={statusFilter} label="وضعیت" onChange={(event) => setStatusFilter(event.target.value)}>
                    <MenuItem value="all">همه ({formatPersianNumber(counts.all)})</MenuItem>
                    <MenuItem value="approved">تأییدشده ({formatPersianNumber(counts.approved)})</MenuItem>
                    <MenuItem value="pending">در انتظار ({formatPersianNumber(counts.pending)})</MenuItem>
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 125 }}>
                  <InputLabel>ترتیب</InputLabel>
                  <Select value={sortBy} label="ترتیب" onChange={(event) => setSortBy(event.target.value)}>
                    <MenuItem value="newest">جدیدترین</MenuItem>
                    <MenuItem value="amount">بیشترین مبلغ</MenuItem>
                    <MenuItem value="net">بیشترین قابل پرداخت</MenuItem>
                    <MenuItem value="work">بیشترین کارکرد</MenuItem>
                  </Select>
                </FormControl>
                <ToggleButtonGroup size="small" exclusive value={view} onChange={(_event, value) => value && setView(value)}>
                  <ToggleButton value="cards" aria-label="نمای کارت" sx={{ px: 1 }}><Tooltip title="کارت"><ViewModuleIcon fontSize="small" /></Tooltip></ToggleButton>
                  <ToggleButton value="table" aria-label="نمای جدول" sx={{ px: 1 }}><Tooltip title="جدول"><TableRowsIcon fontSize="small" /></Tooltip></ToggleButton>
                </ToggleButtonGroup>
                <Button variant="contained" startIcon={<AddIcon />} onClick={openNew} sx={{ display: { xs: 'none', md: 'flex' } }}>صورت‌وضعیت جدید</Button>
              </Stack>
            </Paper>

            {overContract > 0 ? (
              <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mb: 1, borderRadius: '11px', py: 0.2 }}>
                <Typography sx={{ fontSize: 9.5 }}>مبلغ تجمعی صورت‌وضعیت‌ها از مبلغ قرارداد بیشتر است ({money(overContract, currencyLabel)}).</Typography>
              </Alert>
            ) : null}

            {!filtered.length ? (
              <Paper elevation={0} sx={{ p: 5, borderRadius: '16px', border: `1px dashed ${theme.palette.divider}`, textAlign: 'center' }}>
                <ReceiptLongIcon sx={{ fontSize: 36, color: theme.palette.text.disabled, mb: 1 }} />
                <Typography sx={{ fontSize: 11, fontWeight: 800, color: INK }}>صورت‌وضعیتی با این مشخصات ثبت نشده است.</Typography>
                <Typography sx={{ fontSize: 9, color: MUTED, mt: 0.4 }}>اولین صورت‌وضعیت را ثبت کنید تا پوشش مالی و روند شکل بگیرد.</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={openNew} sx={{ mt: 1.5 }}>ثبت صورت‌وضعیت جدید</Button>
              </Paper>
            ) : view === 'cards' ? (
              <Grid container spacing={1.5}>
                {filtered.map((row) => (
                  <Grid item xs={12} md={6} xl={4} key={row.id}>
                    <StatementCard row={row} contractAmount={selectedContractAmount} currency={currencyLabel} accent={STATEMENT_ACCENT}
                      onView={setDetail} onEdit={openEdit} onDelete={setConfirmDelete} onPrint={openPrint}
                      onApprove={(selected) => toggleApproval.mutate(selected)} />
                  </Grid>
                ))}
              </Grid>
            ) : (
              <StatementTable rows={filtered} contractAmount={selectedContractAmount} currency={currencyLabel}
                onView={setDetail} onEdit={openEdit} onDelete={setConfirmDelete} onPrint={openPrint}
                onApprove={(selected) => toggleApproval.mutate(selected)} />
            )}

            <Box sx={{ mt: 1.5 }}>
              <SurfaceCard title="روند صورت‌وضعیت‌ها" icon={TrendingUpIcon} color={STATEMENT_ACCENT}
                action={<Chip size="small" label={`${formatPersianNumber(monthlyData.length)} ماه`} sx={{ height: 20, fontSize: 7.7, bgcolor: alpha(STATEMENT_ACCENT, 0.07), color: STATEMENT_ACCENT }} />}>
                {monthlyData.some((item) => item.value > 0) ? (
                  <ColumnChart data={monthlyData} color={STATEMENT_ACCENT} height={150} />
                ) : (
                  <Box sx={{ py: 3, textAlign: 'center', color: MUTED, fontSize: 9.4 }}>داده‌ای برای نمایش روند وجود ندارد.</Box>
                )}
              </SurfaceCard>
            </Box>
          </Grid>
        </Grid>
      )}

      <StatementDetailDrawer row={detail} contract={selectedContract} currency={currencyLabel}
        onClose={() => setDetail(null)} onEdit={openEdit} onDelete={setConfirmDelete}
        onPrint={openPrint} onApprove={(selected) => toggleApproval.mutate(selected)} />

      <StatementEditorDialog
        open={dialog}
        onClose={closeEditor}
        form={form}
        setForm={setForm}
        contract={formContract || selectedContract}
        company={company}
        currencyList={currencyList}
        additionList={additionList}
        deductionList={deductionList}
        additions={additions}
        previewAdditions={previewAdditions}
        deductions={deductions}
        additionsTotal={additionsTotal}
        deductionsTotal={deductionsTotal}
        cumulativePrev={cumulativePrev}
        cumulativeThis={cumulativeThis}
        workDone={workDone}
        netAmount={netAmount}
        rate={rate}
        rateOverride={rateOverride}
        setRateOverride={setRateOverride}
        baseRate={baseRate}
        formCurrencyLabel={formCurrencyLabel}
        overContract={overContract}
        progress={progress}
        error={error}
        setError={setError}
        saving={save.isPending}
        onSave={submit}
        onAddFiles={addFiles}
        onRemovePending={removePendingFile}
        onRemoveDocument={(document) => {
          if (window.confirm(`مدرک «${document.title || 'پیوست'}» حذف شود؟`)) removeDocument.mutate(document.id);
        }}
        onAddAddition={addAddition}
        onRemoveAddition={removeAddition}
        onUpdateAddition={updateAddition}
        onChooseAddition={chooseAddition}
        onAddDeduction={addDeduction}
        onRemoveDeduction={removeDeduction}
        onUpdateDeduction={updateDeduction}
        onChooseDeduction={chooseDeduction}
      />

      <Dialog open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900, fontSize: 14 }}>حذف صورت‌وضعیت</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ borderRadius: '10px' }}>
            صورت‌وضعیت {confirmDelete?.number || (confirmDelete ? `#${confirmDelete.id}` : 'انتخاب‌شده')} حذف شود؟ این عملیات قابل بازگشت نیست.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>انصراف</Button>
          <Button color="error" variant="contained" disabled={remove.isPending} onClick={() => remove.mutate(confirmDelete.id)}>
            {remove.isPending ? <CircularProgress size={18} color="inherit" /> : 'حذف'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(toast)} autoHideDuration={3400} onClose={() => setToast('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={toast.includes('نشد') ? 'error' : 'success'} onClose={() => setToast('')}>{toast}</Alert>
      </Snackbar>
    </Box>
  );
};

const StatementEditorDialog = ({
  open, onClose, form, setForm, contract, company, currencyList, additionList, deductionList,
  additions, previewAdditions, deductions, additionsTotal, deductionsTotal, cumulativePrev, cumulativeThis,
  workDone, netAmount, rate, rateOverride, setRateOverride, baseRate, formCurrencyLabel,
  overContract, progress, error, setError, saving, onSave, onAddFiles, onRemovePending,
  onRemoveDocument, onAddAddition, onRemoveAddition, onUpdateAddition, onChooseAddition,
  onAddDeduction, onRemoveDeduction, onUpdateDeduction, onChooseDeduction,
}) => {
  const theme = useTheme();
  const update = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const documents = Array.isArray(form.documents) ? form.documents : [];
  const pendingFiles = Array.isArray(form.pendingFiles) ? form.pendingFiles : [];
  const totalDocs = documents.length + pendingFiles.length;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth
      PaperProps={{ sx: { maxHeight: '94vh', borderRadius: '18px' } }}>
      <DialogTitle sx={{
        display: 'flex', alignItems: 'center', gap: 1.2, px: 2.5, py: 1.7,
        background: 'linear-gradient(120deg, rgba(99,102,241,0.13), rgba(14,165,233,0.06), rgba(255,255,255,0.5))',
        borderBottom: `1px solid ${alpha(STATEMENT_ACCENT, 0.14)}`,
      }}>
        <Avatar sx={{ width: 42, height: 42, bgcolor: STATEMENT_ACCENT, color: '#fff' }}><ReceiptLongIcon /></Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 900, color: INK }}>{form.id ? 'ویرایش صورت‌وضعیت' : 'ثبت صورت‌وضعیت جدید'}</Typography>
          <Typography noWrap sx={{ fontSize: 8.8, color: MUTED }}>{contract?.subject || 'قرارداد'} · {form.number || 'شماره‌گذاری خودکار'}</Typography>
        </Box>
        <Chip size="small" label={form.is_approved ? 'تأیید شده' : 'در انتظار تأیید'}
          sx={{ height: 22, fontSize: 8.3, fontWeight: 800, bgcolor: form.is_approved ? '#ecfdf5' : '#fffbeb', color: form.is_approved ? '#0f766e' : '#b45309' }} />
        <Tooltip title="چاپ پیش‌نمایش"><IconButton onClick={printStatement} sx={{ color: '#0f766e' }}><PrintOutlinedIcon /></IconButton></Tooltip>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 2.2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {error ? <Alert severity="error" onClose={() => setError('')} sx={{ borderRadius: '10px', fontSize: 10 }}>{error}</Alert> : null}
        {overContract ? (
          <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ borderRadius: '10px', py: 0.2 }}>
            <Typography sx={{ fontSize: 9.5 }}>مبلغ تجمعی واردشده از مبلغ قرارداد بیشتر است.</Typography>
          </Alert>
        ) : null}

        <Box sx={{
          display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1.5fr 1fr 1fr 1fr' }, gap: 0.7,
          p: 1, borderRadius: '12px', bgcolor: SOFT_BG, border: '1px solid #e8eef2',
        }}>
          <Box><Typography sx={{ fontSize: 7.7, color: MUTED }}>قرارداد</Typography><Typography noWrap sx={{ fontSize: 9.2, fontWeight: 800, color: INK }}>{contract?.subject || '—'}</Typography></Box>
          <Box><Typography sx={{ fontSize: 7.7, color: MUTED }}>مبلغ قابل پرداخت</Typography><Typography noWrap sx={{ fontSize: 9.8, fontWeight: 900, color: netAmount ? '#0f766e' : MUTED }}>{money(netAmount, formCurrencyLabel)}</Typography></Box>
          <Box><Typography sx={{ fontSize: 7.7, color: MUTED }}>پیشرفت</Typography><Typography sx={{ fontSize: 9.8, fontWeight: 900, color: STATEMENT_ACCENT }}>{toPersianDigits(progress.toFixed(0))}٪</Typography></Box>
          <Box><Typography sx={{ fontSize: 7.7, color: MUTED }}>مدارک</Typography><Typography sx={{ fontSize: 9.8, fontWeight: 900, color: totalDocs ? BLUE : MUTED }}>{formatPersianNumber(totalDocs)} فایل</Typography></Box>
        </Box>

        <Grid container spacing={1.5}>
          <Grid item xs={12} md={7}>
            <Stack spacing={1.5}>
              <Box>
                <Typography sx={{ fontSize: 10.5, fontWeight: 900, color: INK, mb: 0.7 }}>اطلاعات پایه</Typography>
                <Grid container spacing={1.1}>
                  <Grid item xs={12} sm={6}><TextField size="small" fullWidth label="شماره صورت‌وضعیت" value={form.number || ''} onChange={(event) => update('number', event.target.value)} placeholder="مثلاً ST-1405-01" /></Grid>
                  <Grid item xs={12} sm={6}><JalaliDatePicker fullWidth label="تاریخ صورت‌وضعیت" value={form.date || ''} onChange={(value) => update('date', value)} /></Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl size="small" fullWidth>
                      <InputLabel>واحد ارز</InputLabel>
                      <Select value={form.currency || ''} label="واحد ارز" onChange={(event) => { update('currency', event.target.value); setRateOverride(''); }}>
                        {currencyList.map((currency) => <MenuItem key={currency.id} value={currency.id}>{normalizeCurrencyLabel(currency.name || currency.symbol)} ({currency.code})</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField size="small" fullWidth type="number" label="نرخ تبدیل به ریال" value={rateOverride}
                      placeholder={formatPersianNumber(baseRate)} onChange={(event) => setRateOverride(event.target.value)} />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel control={<Switch checked={Boolean(form.is_approved)} onChange={(event) => update('is_approved', event.target.checked)} />}
                      label={<Typography sx={{ fontSize: 9.5, fontWeight: 800, color: INK }}>این صورت‌وضعیت تأیید شده است</Typography>} />
                  </Grid>
                </Grid>
              </Box>

              <Divider />
              <Box>
                <Typography sx={{ fontSize: 10.5, fontWeight: 900, color: INK, mb: 0.7 }}>کارکرد و مبالغ</Typography>
                <Grid container spacing={1.1}>
                  <Grid item xs={12} sm={6}><MoneyInput size="small" fullWidth label="مبلغ تجمعی این صورت‌وضعیت" value={form.amount ?? 0} onChange={(value) => update('amount', value)} /></Grid>
                  <Grid item xs={12} sm={6}><MoneyInput size="small" fullWidth label="مبلغ تجمعی دوره قبل" value={cumulativePrev} onChange={() => {}} InputProps={{ readOnly: true }} /></Grid>
                  <Grid item xs={12} sm={6}><MoneyInput size="small" fullWidth label="کارکرد این دوره (خودکار)" value={workDone} onChange={() => {}} InputProps={{ readOnly: true }} /></Grid>
                  <Grid item xs={12} sm={6}><MoneyInput size="small" fullWidth label="معادل ریال کارکرد" value={workDone * rate} onChange={() => {}} InputProps={{ readOnly: true }} /></Grid>
                </Grid>
                <Box sx={{ mt: 1, p: 1.1, borderRadius: '12px', bgcolor: alpha('#0f766e', 0.05), border: `1px solid ${alpha('#0f766e', 0.16)}` }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                    <Box><Typography sx={{ fontSize: 8.4, color: MUTED }}>مبلغ قابل پرداخت این دوره</Typography><Typography sx={{ fontSize: 16, fontWeight: 900, color: '#0f766e' }}>{money(netAmount, formCurrencyLabel)}</Typography></Box>
                    <Box sx={{ textAlign: 'left' }}><Typography sx={{ fontSize: 8.4, color: MUTED }}>معادل ارزی</Typography><Typography sx={{ fontSize: 12, fontWeight: 900, color: '#4338ca' }}>{rate > 0 ? formatPersianNumber(netAmount / rate) : '—'} {formCurrencyLabel}</Typography></Box>
                  </Stack>
                </Box>
              </Box>

              <Divider />
              <Box>
                <Stack direction="row" alignItems="center" sx={{ mb: 0.6 }}>
                  <Typography sx={{ flex: 1, fontSize: 10.5, fontWeight: 900, color: '#0f766e' }}>اضافات</Typography>
                  <Chip size="small" label={money(additionsTotal, formCurrencyLabel)} sx={{ height: 19, fontSize: 7.8, bgcolor: '#ecfdf5', color: '#0f766e' }} />
                </Stack>
                <Grid container spacing={0.8} sx={{ mb: 0.8 }}>
                  <Grid item xs={12} sm={6}><MoneyInput size="small" fullWidth label="ارزش افزوده" value={form.value_added_tax ?? 0} onChange={(value) => update('value_added_tax', value)} /></Grid>
                  <Grid item xs={12} sm={6}><MoneyInput size="small" fullWidth label="سایر اضافات" value={form.other_additions ?? 0} onChange={(value) => update('other_additions', value)} /></Grid>
                </Grid>
                {additions.map((item, index) => (
                  <Grid container spacing={0.55} alignItems="center" key={`addition-${index}`} sx={{ mb: 0.55 }}>
                    <Grid item xs={12} sm={5}><TextField size="small" fullWidth placeholder="شرح اضافه" value={item.description || ''} onChange={(event) => onUpdateAddition(index, 'description', event.target.value)} /></Grid>
                    <Grid item xs={4} sm={2}><TextField size="small" fullWidth type="number" placeholder="٪" value={item.percent ?? 0} onChange={(event) => onUpdateAddition(index, 'percent', event.target.value)} /></Grid>
                    <Grid item xs={6} sm={4}><MoneyInput size="small" fullWidth placeholder="مبلغ" value={item.amount ?? 0} onChange={(value) => onUpdateAddition(index, 'amount', value)} /></Grid>
                    <Grid item xs={2} sm={1}><IconButton size="small" color="error" onClick={() => onRemoveAddition(index)}><RemoveCircleIcon fontSize="small" /></IconButton></Grid>
                  </Grid>
                ))}
                {additionList.length ? (
                  <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mb: 0.7 }}>
                    {additionList.map((definition) => (
                      <Chip key={definition.id} size="small" label={definition.description || definition.code} onClick={() => onChooseAddition(definition)}
                        sx={{ height: 20, fontSize: 7.9, bgcolor: '#ecfdf5', color: '#0f766e' }} />
                    ))}
                  </Stack>
                ) : null}
                <Button size="small" startIcon={<AddCircleIcon />} onClick={onAddAddition} sx={{ color: '#0f766e', fontSize: 8.7 }}>افزودن اضافه</Button>
              </Box>

              <Divider />
              <Box>
                <Stack direction="row" alignItems="center" sx={{ mb: 0.6 }}>
                  <Typography sx={{ flex: 1, fontSize: 10.5, fontWeight: 900, color: '#be123c' }}>کسورات</Typography>
                  <Chip size="small" label={money(deductionsTotal, formCurrencyLabel)} sx={{ height: 19, fontSize: 7.8, bgcolor: '#fff1f2', color: '#be123c' }} />
                </Stack>
                {deductions.map((item, index) => (
                  <Grid container spacing={0.55} alignItems="center" key={`deduction-${index}`} sx={{ mb: 0.55 }}>
                    <Grid item xs={12} sm={5}><TextField size="small" fullWidth placeholder="عنوان کسور" value={item.title || ''} onChange={(event) => onUpdateDeduction(index, 'title', event.target.value)} /></Grid>
                    <Grid item xs={4} sm={2}><TextField size="small" fullWidth type="number" placeholder="٪" value={item.percent ?? 0} onChange={(event) => onUpdateDeduction(index, 'percent', event.target.value)} /></Grid>
                    <Grid item xs={6} sm={4}><MoneyInput size="small" fullWidth placeholder="مبلغ" value={item.amount ?? 0} onChange={(value) => onUpdateDeduction(index, 'amount', value)} /></Grid>
                    <Grid item xs={2} sm={1}><IconButton size="small" color="error" onClick={() => onRemoveDeduction(index)}><RemoveCircleIcon fontSize="small" /></IconButton></Grid>
                  </Grid>
                ))}
                {deductionList.length ? (
                  <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mb: 0.7 }}>
                    {deductionList.map((definition) => (
                      <Chip key={definition.id} size="small" label={definition.description || definition.code} onClick={() => onChooseDeduction(definition)}
                        sx={{ height: 20, fontSize: 7.9, bgcolor: '#fff1f2', color: '#be123c' }} />
                    ))}
                  </Stack>
                ) : null}
                <Button size="small" startIcon={<AddCircleIcon />} onClick={onAddDeduction} sx={{ color: '#be123c', fontSize: 8.7 }}>افزودن کسور</Button>
              </Box>

              <Divider />
              <Box>
                <Typography sx={{ fontSize: 10.5, fontWeight: 900, color: INK, mb: 0.7 }}>مدارک و پیوست‌ها</Typography>
                <AttachmentPicker
                  documents={documents}
                  pendingFiles={pendingFiles}
                  onAdd={onAddFiles}
                  onRemovePending={onRemovePending}
                  onRemoveDocument={onRemoveDocument}
                  accent={STATEMENT_ACCENT}
                  buttonLabel="افزودن مدرک صورت‌وضعیت"
                  emptyText="صورت‌وضعیت امضاشده، تأییدیه، فاکتور یا مدارک پشتیبان را اینجا پیوست کنید."
                  documentLabel="صورت‌وضعیت"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.xls,.xlsx,.doc,.docx,.zip,.rar"
                  hint="PDF، تصویر، اکسل، Word یا ZIP · حداکثر ۲۵ مگابایت"
                  icon={InsertDriveFileIcon}
                />
              </Box>

              <Divider />
              <TextField size="small" fullWidth multiline rows={2} label="توضیحات" value={form.description || ''}
                onChange={(event) => update('description', event.target.value)} />
            </Stack>
          </Grid>

          <Grid item xs={12} md={5}>
            <Box sx={{ position: { md: 'sticky' }, top: 0 }}>
              <StatementPreview form={{ ...form, amount: cumulativeThis, cumulative_previous_amount: cumulativePrev, work_done: workDone, additions: previewAdditions, deductions }}
                contract={contract} company={company} currencies={currencyList} rate={rate} />
            </Box>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 2.4, py: 1.4, borderTop: `1px solid ${theme.palette.divider}` }}>
        <Button onClick={onClose} sx={{ fontSize: 9.5 }}>انصراف</Button>
        <Button variant="contained" onClick={onSave} disabled={saving || !form.contract || !form.date}
          startIcon={saving ? <CircularProgress size={15} sx={{ color: '#fff' }} /> : <SaveIcon />}
          sx={{ fontSize: 9.5, px: 2.5, bgcolor: STATEMENT_ACCENT, '&:hover': { bgcolor: '#4f46e5' } }}>
          {saving ? 'در حال ذخیره…' : 'ذخیره صورت‌وضعیت'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StatementEditorPage;
