import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Alert, Autocomplete, Box, Button, Chip, CircularProgress, Grid, IconButton,
  MenuItem, Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import SaveIcon from '@mui/icons-material/Save';
import SendIcon from '@mui/icons-material/Send';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PostAddIcon from '@mui/icons-material/PostAdd';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { alpha, useTheme } from '@mui/material/styles';
import { formatPersianNumber, toPersianDigits, toEnglishDigits } from '../core/utils/numberUtils';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';
import PageHeader from '../core/components/ui/PageHeader';
import CodePickerDialog from '../core/components/ui/CodePickerDialog';
import InfoCard from '../core/components/ui/InfoCard';
import { useModulePalette } from '../core/context/ModulePaletteContext';
import { DEFAULT_TYPOGRAPHY } from '../core/theme/appearanceDefaults';
import { SurfaceCard, ProgressBar } from './accounting/AccountingDashboardUI';

const GREEN = '#0f766e';
const RED = '#e11d48';
const AMBER = '#d97706';
const CYAN = '#0891b2';
const VIOLET = '#6366f1';
const ROWS = 8;
const ROW_HEIGHT = 42;
const HEADER_HEIGHT = 32;
const GRID_HEIGHT = (ROWS * ROW_HEIGHT) + HEADER_HEIGHT;
const FONT = 'inherit';

const PAYMENT_METHODS = [
  { value: 'cash', label: 'نقد' },
  { value: 'card', label: 'کارت' },
  { value: 'bank_transfer', label: 'انتقال بانکی' },
  { value: 'cheque', label: 'چک' },
  { value: 'other', label: 'سایر' },
];

const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: '10px' } };

const today = () => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

const emptyLine = () => ({
  account: '', aux1: '', aux2: '', aux3: '',
  invoice_number: '', expense_date: today(), supplier: '', desc: '',
  debit: '', vat_amount: '', tax_amount: '', attachment: null,
});

const hasData = (line) => Boolean(
  line.account || line.debit || line.desc || line.invoice_number || line.supplier || line.attachment
);

const faSep = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const negative = raw.startsWith('-');
  const [int, dec] = raw.replace('-', '').split('.');
  const withSep = (int || '').replace(/\B(?=(\d{3})+(?!\d))/g, '٬');
  return `${negative ? '-' : ''}${toPersianDigits(withSep)}${dec ? `٫${toPersianDigits(dec)}` : ''}`;
};

const rowAccent = (active, color) => (active ? `inset -3px 0 0 ${color}` : 'none');

const Cell = React.forwardRef(({ children, center = false }, ref) => (
  <Box ref={ref} sx={{ px: 0.1, py: 0.1, display: 'flex', alignItems: 'center', justifyContent: center ? 'center' : 'flex-start', minWidth: 0 }}>
    {children}
  </Box>
));

const FaField = ({ value, onChange, placeholder = '', numeric = false, center = false, disabled = false }) => (
  <TextField
    size="small" fullWidth type="text" inputMode={numeric ? 'decimal' : 'text'} variant="standard"
    disabled={disabled}
    value={numeric ? faSep(value) : toPersianDigits(value == null ? '' : String(value))}
    onChange={(e) => {
      const eng = toEnglishDigits(e.target.value);
      onChange(numeric ? eng.replace(/[^0-9.]/g, '') : eng);
    }}
    placeholder={placeholder}
    InputProps={{ disableUnderline: true, sx: { fontFamily: FONT } }}
    inputProps={{ style: { textAlign: center ? 'center' : 'right', fontFamily: FONT } }}
  />
);

const MetaPill = ({ label, value, color }) => {
  const theme = useTheme();
  const { typography, getPalette } = useModulePalette();
  const type = { ...DEFAULT_TYPOGRAPHY, ...(typography || {}) };
  const pillColor = color || getPalette('pettycash')?.accent || '#f59e0b';
  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 0.65, minWidth: 0,
      bgcolor: alpha(pillColor, 0.05), border: `1px solid ${alpha(pillColor, 0.12)}`,
      borderRadius: '9px', px: 1, py: 0.45,
    }}>
      <Typography sx={{ fontSize: Math.max(type.bodySize - 4, 12), fontWeight: 800, color: pillColor, whiteSpace: 'nowrap' }}>{label}</Typography>
      <Typography sx={{ fontSize: Math.max(type.bodySize - 3, 12), fontWeight: 700, color: theme.palette.text.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value || '—'}</Typography>
    </Box>
  );
};

const CodeInput = ({ code, options, onMatch, onOpenPicker, placeholder = '…', disabled = false }) => {
  const [draft, setDraft] = useState('');
  useEffect(() => { setDraft(code ? String(code) : ''); }, [code]);

  const commit = () => {
    const eng = toEnglishDigits(draft).trim();
    if (!eng) {
      if (code) onMatch('');
      else setDraft('');
      return;
    }
    const opt = options.find((o) => String(o.code) === eng);
    if (opt) onMatch(opt.id);
    else setDraft(code ? String(code) : '');
  };

  return (
    <TextField
      size="small" fullWidth variant="standard" disabled={disabled}
      value={toPersianDigits(draft)}
      onChange={(e) => {
        const next = toEnglishDigits(e.target.value);
        setDraft(next);
        if (!next.trim() && code) onMatch('');
      }}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === ' ') { e.preventDefault(); onOpenPicker(); }
        else if (e.key === 'Enter') { e.preventDefault(); commit(); e.target.blur(); }
      }}
      onBlur={commit}
      placeholder={placeholder}
      InputProps={{ disableUnderline: true, sx: { fontFamily: FONT } }}
      inputProps={{ style: { textAlign: 'center', fontFamily: FONT } }}
    />
  );
};


const PettyCashExpenseNewPage = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const theme = useTheme();
  const { typography, getPalette } = useModulePalette();
  const type = { ...DEFAULT_TYPOGRAPHY, ...(typography || {}) };
  const accent = getPalette('pettycash')?.accent || '#f59e0b';
  const CARD_BORDER = theme.palette.divider;
  const MUTED = theme.palette.text.secondary;
  const gridFont = Math.max(type.bodySize - 3, 12);
  const amountColumn = Math.max(130, Math.ceil(type.bodySize * 10));

  const [header, setHeader] = useState({
    fund: '', date: today(), description: '', project: '', cost_center: '', payment_method: 'cash',
  });
  const [lines, setLines] = useState(() => Array.from({ length: ROWS }, emptyLine));
  const [activeRow, setActiveRow] = useState(0);
  const [picker, setPicker] = useState(null);
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);
  const gridRef = useRef(null);

  const { data: funds } = useQuery({
    queryKey: ['pc-funds-list'],
    queryFn: () => axiosInstance.get('/petty-cash-funds/').then((r) => r.data),
  });
  const { data: accounts } = useQuery({
    queryKey: ['pc-accounts'],
    queryFn: () => axiosInstance.get('/accounting/accounts/', { params: { kind: 'subsidiary' } }).then((r) => r.data),
  });
  const { data: auxs } = useQuery({
    queryKey: ['pc-aux'],
    queryFn: () => axiosInstance.get('/accounting/auxiliary-accounts/').then((r) => r.data),
  });
  const { data: projects } = useQuery({
    queryKey: ['pc-projects'],
    queryFn: () => axiosInstance.get('/projects/', { params: { page_size: 300 } }).then((r) => r.data),
    retry: false,
  });
  const { data: costCenters } = useQuery({
    queryKey: ['pc-cost-centers'],
    queryFn: () => axiosInstance.get('/accounting/cost-centers/').then((r) => r.data),
    retry: false,
  });

  const fundList = Array.isArray(funds) ? funds : funds?.results || [];
  const accountList = (Array.isArray(accounts) ? accounts : accounts?.results || [])
    .filter((a) => ['asset', 'expense', 'cost_of_sales'].includes(a.account_type_category));
  const auxList = Array.isArray(auxs) ? auxs : auxs?.results || [];
  const projectList = Array.isArray(projects) ? projects : projects?.results || [];
  const costCenterList = Array.isArray(costCenters) ? costCenters : costCenters?.results || [];

  const fund = fundList.find((f) => String(f.id) === String(header.fund));
  const accountById = new Map(accountList.map((a) => [String(a.id), a]));
  const auxById = new Map(auxList.map((a) => [String(a.id), a]));
  const costCenterById = new Map(costCenterList.map((c) => [String(c.id), c]));

  const setHeaderField = (key, value) => setHeader((prev) => ({ ...prev, [key]: value }));
  const setLine = (index, key, value) => setLines((prev) => {
    const next = [...prev];
    next[index] = { ...next[index], [key]: value };
    return next;
  });
  const setAccount = (index, accountId) => setLines((prev) => {
    const next = [...prev];
    next[index] = { ...next[index], account: accountId, aux1: '', aux2: '', aux3: '' };
    return next;
  });
  const addRow = () => {
    setLines((prev) => [...prev, emptyLine()]);
    setActiveRow(lines.length);
  };
  const removeRow = (index) => {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
    setActiveRow((prev) => Math.max(0, Math.min(prev, lines.length - 2)));
  };

  const filledLines = lines.filter(hasData);
  const totalGross = filledLines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
  const totalVat = filledLines.reduce((sum, line) => sum + (Number(line.vat_amount) || 0), 0);
  const totalTax = filledLines.reduce((sum, line) => sum + (Number(line.tax_amount) || 0), 0);
  const totalNet = Math.max(totalGross - totalVat - totalTax, 0);
  const filledCount = filledLines.length;

  const rowIssues = (line) => {
    const issues = [];
    if (!line.account) issues.push({ text: 'کد معین انتخاب نشده است', hard: true });
    if (!(Number(line.debit) > 0)) issues.push({ text: 'مبلغ ردیف صفر است', hard: true });
    if (!line.invoice_number) issues.push({ text: 'شماره فاکتور خالی است', hard: false });
    if (!line.attachment) issues.push({ text: 'پیوست فاکتور/رسید ندارد', hard: false });
    return issues;
  };
  const issueCount = filledLines.reduce((sum, line) => sum + (rowIssues(line).length ? 1 : 0), 0);
  const canSave = Boolean(header.fund) && filledCount > 0 && filledLines.every((l) => l.account && Number(l.debit) > 0);

  const pickerOptions = () => {
    if (!picker) return [];
    if (picker.slot === 'account') return accountList;
    if (picker.slot === 'cost_center') return costCenterList;
    const account = accountById.get(String(lines[picker.row]?.account));
    const catKey = { aux1: 'auxiliary_category_1', aux2: 'auxiliary_category_2', aux3: 'auxiliary_category_3' }[picker.slot];
    const categoryId = account ? account[catKey] : null;
    return categoryId ? auxList.filter((a) => String(a.category) === String(categoryId)) : [];
  };
  const openPicker = (row, slot) => setPicker({ row, slot });


  const submit = async (andSubmit) => {
    if (!header.fund) { setMsg({ ok: false, text: 'تنخواه را انتخاب کنید.' }); return; }
    if (!filledCount) { setMsg({ ok: false, text: 'حداقل یک ردیف هزینه لازم است.' }); return; }
    if (!canSave) { setMsg({ ok: false, text: 'ردیف‌های ناقص (کد معین یا مبلغ) را تکمیل کنید.' }); return; }

    const fd = new FormData();
    fd.append('fund', header.fund);
    fd.append('date', header.date);
    fd.append('description', header.description || '');
    if (header.project) fd.append('project', header.project);
    if (header.cost_center) fd.append('cost_center', header.cost_center);
    fd.append('payment_method', header.payment_method);
    filledLines.forEach((line, idx) => {
      const gross = Number(line.debit) || 0;
      const vat = Number(line.vat_amount) || 0;
      const tax = Number(line.tax_amount) || 0;
      fd.append(`lines[${idx}].account`, line.account || '');
      fd.append(`lines[${idx}].auxiliary_1`, line.aux1 || '');
      fd.append(`lines[${idx}].auxiliary_2`, line.aux2 || '');
      fd.append(`lines[${idx}].auxiliary_3`, line.aux3 || '');
      fd.append(`lines[${idx}].invoice_number`, line.invoice_number || '');
      fd.append(`lines[${idx}].supplier`, line.supplier || '');
      fd.append(`lines[${idx}].expense_date`, line.expense_date || header.date);
      fd.append(`lines[${idx}].description`, line.desc || '');
      fd.append(`lines[${idx}].debit`, gross);
      fd.append(`lines[${idx}].vat_amount`, vat);
      fd.append(`lines[${idx}].tax_amount`, tax);
      fd.append(`lines[${idx}].net_amount`, Math.max(gross - vat - tax, 0));
      if (line.attachment) fd.append(`lines[${idx}].attachment`, line.attachment);
    });

    setSaving(true);
    try {
      const response = await axiosInstance.post('/petty-cash-expense-statements/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const created = response.data;
      if (andSubmit && created?.id) {
        await axiosInstance.post(`/petty-cash-expense-statements/${created.id}/submit/`);
      }
      qc.invalidateQueries({ queryKey: ['petty-expenses'] });
      navigate('/petty-cash/expenses', {
        state: { flash: andSubmit ? 'صورت هزینه ذخیره و برای تأیید ارسال شد' : 'صورت هزینه ذخیره شد' },
      });
    } catch (e) {
      const data = e.response?.data;
      let text = data?.error || data?.detail;
      if (!text && data && typeof data === 'object') {
        const parts = [];
        const walk = (obj, path = '') => {
          Object.entries(obj || {}).forEach(([key, value]) => {
            const label = path ? `${path}.${key}` : key;
            if (Array.isArray(value)) parts.push(`${label}: ${value.map(String).join('، ')}`);
            else if (value && typeof value === 'object') walk(value, label);
            else if (value !== null && value !== undefined && value !== '') parts.push(`${label}: ${value}`);
          });
        };
        walk(data);
        text = parts.join(' | ');
      }
      setMsg({ ok: false, text: text || 'خطا در ذخیره صورت هزینه' });
    } finally {
      setSaving(false);
    }
  };

  const activeLine = lines[activeRow] || emptyLine();
  const activeAccount = accountById.get(String(activeLine.account));
  const activeAuxs = ['aux1', 'aux2', 'aux3'].map((key) => auxById.get(String(activeLine[key])));
  const headerCostCenter = costCenterById.get(String(header.cost_center));
  const activeGross = Number(activeLine.debit) || 0;

  const gridCols = `40px 92px 74px 74px 74px 96px 112px minmax(130px, 1fr) minmax(170px, 1.5fr) ${amountColumn}px ${amountColumn}px 46px`;
  const gridMinWidth = 40 + 92 + (74 * 3) + 96 + 112 + 130 + 170 + (amountColumn * 2) + 46;
  const HEADERS = ['ردیف', 'معین', 'تفصیل۱', 'تفصیل۲', 'تفصیل۳', 'شماره فاکتور', 'تاریخ هزینه', 'فروشنده', 'شرح هزینه', 'مبلغ کل', 'ارزش افزوده', 'پیوست'];


  return (
    <Box sx={{ pb: 1 }}>
      <PageHeader
        icon={<PostAddIcon />}
        title="صورت ریز هزینه جدید"
        badge={(
          <Stack direction="row" spacing={0.75} useFlexGap alignItems="center">
            <Chip size="small" label={fund ? `تنخواه: ${fund.title}` : 'تنخواه انتخاب نشده'}
              sx={{ height: 24, fontWeight: 800, bgcolor: alpha(accent, 0.08), color: fund ? accent : MUTED }} />
            {filledCount ? <Chip size="small" label={`${toPersianDigits(filledCount)} ردیف`} sx={{ height: 24, fontWeight: 800 }} /> : null}
          </Stack>
        )}
        sx={{ mb: 1.5, py: 1 }}
        actions={(
          <>
            <Button size="small" startIcon={<ArrowForwardIcon />} variant="outlined" onClick={() => navigate('/petty-cash/expenses')}>
              بازگشت
            </Button>
            <Button size="small" startIcon={<SaveIcon />} variant="contained" disabled={saving || !canSave} onClick={() => submit(false)}>
              {saving ? <CircularProgress size={16} color="inherit" /> : 'ذخیره پیش‌نویس'}
            </Button>
            <Button size="small" startIcon={<SendIcon />} variant="contained" color="success" disabled={saving || !canSave} onClick={() => submit(true)}>
              ذخیره و ارسال
            </Button>
          </>
        )}
      />

      {msg && (
        <Alert severity={msg.ok ? 'success' : 'error'} onClose={() => setMsg(null)}
          sx={{ mb: 1.25, borderRadius: '12px', fontSize: Math.max(type.bodySize - 1, 12.5) }}>
          {msg.text}
        </Alert>
      )}


      <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
        <Grid item xs={12} lg={8}>
          <SurfaceCard title="مشخصات صورت هزینه" icon={ReceiptLongIcon} color={accent} sx={{ height: '100%' }}>
            <Box sx={{
              display: 'grid', gap: 1.25,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' },
            }}>
              <Autocomplete size="small" options={fundList}
                getOptionLabel={(option) => `${option.code || ''} — ${option.title || ''}`}
                value={fundList.find((f) => String(f.id) === String(header.fund)) || null}
                onChange={(_, option) => setHeaderField('fund', option ? option.id : '')}
                isOptionEqualToValue={(a, b) => String(a.id) === String(b.id)}
                renderInput={(params) => <TextField {...params} size="small" label="تنخواه" />}
                sx={{ minWidth: 0 }} />
              <JalaliDatePicker noHelper label="تاریخ صورت" value={header.date}
                onChange={(value) => setHeaderField('date', value)} sx={{ ...fieldSx, width: '100%' }} />
              <TextField size="small" label="شماره صورت" value="خودکار" InputProps={{ readOnly: true }} sx={fieldSx} />
              <Autocomplete size="small" options={projectList}
                getOptionLabel={(option) => `${option.code || ''} — ${option.name || ''}`}
                value={projectList.find((p) => String(p.id) === String(header.project)) || null}
                onChange={(_, option) => setHeaderField('project', option ? option.id : '')}
                isOptionEqualToValue={(a, b) => String(a.id) === String(b.id)}
                renderInput={(params) => <TextField {...params} size="small" label="پروژه" />}
                sx={{ minWidth: 0 }} />
              <TextField size="small" select label="روش پرداخت" value={header.payment_method}
                onChange={(e) => setHeaderField('payment_method', e.target.value)} sx={fieldSx}>
                {PAYMENT_METHODS.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}
              </TextField>
              <TextField size="small" label="مرکز هزینه" value={costCenterById.get(String(header.cost_center))?.name || ''}
                onClick={() => openPicker(-1, 'cost_center')} placeholder="انتخاب…"
                sx={{ ...fieldSx, cursor: 'pointer' }} InputProps={{ readOnly: true }} />
              <TextField size="small" label="شرح صورت" value={header.description}
                onChange={(e) => setHeaderField('description', e.target.value)}
                placeholder="موضوع یا علت ثبت صورت هزینه"
                sx={{ ...fieldSx, gridColumn: { xs: 'auto', sm: '1 / -1', lg: 'span 3' } }} />
            </Box>
          </SurfaceCard>
        </Grid>

        <Grid item xs={12} lg={4}>
          <SurfaceCard title="خلاصهٔ مبالغ" icon={InfoOutlinedIcon} color={accent} sx={{ height: '100%' }}>
            <Grid container spacing={1}>
              <Grid item xs={6}><InfoCard icon={<ReceiptLongIcon />} label="مبلغ کل" value={formatPersianNumber(totalGross)} suffix="ریال" color={accent} /></Grid>
              <Grid item xs={6}><InfoCard icon={<AddCircleOutlineIcon />} label="ارزش افزوده" value={formatPersianNumber(totalVat + totalTax)} suffix="ریال" color={AMBER} /></Grid>
              <Grid item xs={6}><InfoCard icon={<RemoveCircleOutlineIcon />} label="مبلغ خالص" value={formatPersianNumber(totalNet)} suffix="ریال" color={GREEN} /></Grid>
              <Grid item xs={6}><InfoCard icon={<ReceiptLongIcon />} label="مانده تنخواه" value={fund ? formatPersianNumber(fund.balance) : '—'} suffix="ریال" color={CYAN} /></Grid>
            </Grid>
            <Box sx={{ mt: 1 }}>
              <ProgressBar value={(filledCount / ROWS) * 100} color={issueCount ? AMBER : GREEN} height={6} />
            </Box>
            <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
              <Chip size="small" label={`${toPersianDigits(filledCount)} ردیف`} sx={{ height: 23, fontWeight: 800 }} />
              {issueCount ? (
                <Chip size="small" icon={<WarningAmberIcon sx={{ fontSize: 14 }} />} label={`${toPersianDigits(issueCount)} هشدار`}
                  sx={{ height: 23, fontWeight: 800, bgcolor: '#fffbeb', color: '#b45309' }} />
              ) : null}
            </Stack>
          </SurfaceCard>
        </Grid>
      </Grid>


      <SurfaceCard
        title="ردیف‌های هزینه"
        icon={ReceiptLongIcon}
        color={accent}
        contentSx={{ p: 0 }}
        action={(
          <Stack direction="row" spacing={0.75} useFlexGap alignItems="center">
            {issueCount ? (
              <Chip size="small" icon={<WarningAmberIcon sx={{ fontSize: 14 }} />} label={`${toPersianDigits(issueCount)} هشدار`}
                sx={{ height: 23, fontSize: gridFont, fontWeight: 800, bgcolor: '#fffbeb', color: '#b45309' }} />
            ) : null}
            <Tooltip title="افزودن ردیف">
              <IconButton size="small" color="primary" onClick={addRow}>
                <AddCircleOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="حذف ردیف انتخاب‌شده">
              <IconButton size="small" color="error" onClick={() => removeRow(activeRow)}>
                <RemoveCircleOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        )}
      >
        <Box ref={gridRef} sx={{ overflowX: 'auto', overflowY: 'auto', height: GRID_HEIGHT }}>
          <Box sx={{ minWidth: gridMinWidth }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: gridCols, height: HEADER_HEIGHT, position: 'sticky', top: 0, zIndex: 3, bgcolor: theme.palette.background.paper, borderBottom: `1px solid ${CARD_BORDER}` }}>
              {HEADERS.map((label, index) => (
                <Box key={index} sx={{
                  px: 0.7, fontWeight: 800, fontSize: gridFont, color: theme.palette.text.primary,
                  borderLeft: index ? `1px solid ${theme.palette.divider}` : 'none', whiteSpace: 'nowrap',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT,
                }}>{label}</Box>
              ))}
            </Box>

            {lines.map((line, index) => {
              const account = accountById.get(String(line.account));
              const slots = [
                { key: 'aux1', catId: account?.auxiliary_category_1 },
                { key: 'aux2', catId: account?.auxiliary_category_2 },
                { key: 'aux3', catId: account?.auxiliary_category_3 },
              ];
              const issues = rowIssues(line);
              return (
                <Box key={index} onClick={() => setActiveRow(index)}
                  sx={{
                    display: 'grid', gridTemplateColumns: gridCols, alignItems: 'center',
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    bgcolor: activeRow === index ? alpha(accent, 0.08) : 'transparent',
                    boxShadow: rowAccent(activeRow === index, accent),
                    '&:hover': { bgcolor: activeRow === index ? alpha(accent, 0.12) : theme.palette.action.hover },
                    height: ROW_HEIGHT, transition: 'background-color .12s ease',
                  }}>
                  <Stack alignItems="center" justifyContent="center" spacing={0.1}>
                    {issues.length ? (
                      <Tooltip title={issues.map((item) => item.text).join(' · ')}>
                        <WarningAmberIcon sx={{ fontSize: 13, color: issues.some((i) => i.hard) ? RED : AMBER, cursor: 'help' }} />
                      </Tooltip>
                    ) : null}
                    <Typography sx={{ fontFamily: FONT, fontSize: gridFont, fontWeight: 800, color: activeRow === index ? accent : MUTED }}>
                      {toPersianDigits(index + 1)}
                    </Typography>
                  </Stack>

                  <Tooltip title="کد معین (Space برای انتخاب)">
                    <Cell>
                      <CodeInput
                        code={account?.code || ''}
                        options={accountList}
                        onMatch={(accountId) => setAccount(index, accountId)}
                        onOpenPicker={() => openPicker(index, 'account')}
                        placeholder="…"
                      />
                    </Cell>
                  </Tooltip>


                  {slots.map((slot) => (
                    <Tooltip key={slot.key} title={slot.catId ? 'تفصیل (Space برای انتخاب)' : 'ابتدا کد معین را انتخاب کنید'}>
                      <Cell>
                        <CodeInput
                          code={auxById.get(String(line[slot.key]))?.code || ''}
                          options={auxList.filter((a) => String(a.category) === String(slot.catId))}
                          onMatch={(auxId) => setLine(index, slot.key, auxId)}
                          onOpenPicker={() => slot.catId && openPicker(index, slot.key)}
                          placeholder={slot.catId ? '…' : '—'}
                          disabled={!slot.catId}
                        />
                      </Cell>
                    </Tooltip>
                  ))}

                  <Cell>
                    <FaField value={line.invoice_number} placeholder="شماره فاکتور"
                      onChange={(value) => setLine(index, 'invoice_number', value)} />
                  </Cell>
                  <Cell>
                    <JalaliDatePicker noHelper value={line.expense_date}
                      onChange={(value) => setLine(index, 'expense_date', value)}
                      sx={{ width: '100%', '& .MuiInputBase-root': { height: 32, fontSize: gridFont } }} />
                  </Cell>
                  <Cell>
                    <TextField size="small" fullWidth variant="standard" value={line.supplier}
                      onChange={(e) => setLine(index, 'supplier', e.target.value)} placeholder="فروشنده"
                      InputProps={{ disableUnderline: true, sx: { fontFamily: FONT } }}
                      inputProps={{ style: { textAlign: 'right', fontFamily: FONT } }} />
                  </Cell>
                  <Cell>
                    <TextField size="small" fullWidth variant="standard" value={line.desc}
                      onChange={(e) => setLine(index, 'desc', e.target.value)} placeholder="شرح هزینه"
                      InputProps={{ disableUnderline: true, sx: { fontFamily: FONT } }}
                      inputProps={{ style: { textAlign: 'right', fontFamily: FONT } }} />
                  </Cell>
                  <Cell center><FaField numeric center value={line.debit} onChange={(value) => setLine(index, 'debit', value)} /></Cell>
                  <Cell center><FaField numeric center value={line.vat_amount} onChange={(value) => setLine(index, 'vat_amount', value)} /></Cell>
                  <Cell center>
                    <input type="file" hidden id={`pc-att-${index}`}
                      onChange={(e) => setLine(index, 'attachment', e.target.files?.[0] || null)} />
                    <Tooltip title={line.attachment ? line.attachment.name : 'پیوست فاکتور/رسید'}>
                      <IconButton size="small" component="label" htmlFor={`pc-att-${index}`}
                        color={line.attachment ? 'success' : 'default'}>
                        <AttachFileIcon sx={{ fontSize: 17 }} />
                      </IconButton>
                    </Tooltip>
                  </Cell>
                </Box>
              );
            })}
          </Box>
        </Box>
      </SurfaceCard>

      <SurfaceCard title="شناسه‌های ردیف انتخاب‌شده" icon={InfoOutlinedIcon} color={accent} sx={{ mt: 1.5 }}>
        <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" alignItems="center">
          <Chip size="small" label={`ردیف ${toPersianDigits(activeRow + 1)}`}
            sx={{ height: 23, fontSize: gridFont, fontWeight: 800, bgcolor: alpha(accent, 0.08), color: accent }} />
          <MetaPill label="معین" value={activeAccount ? `${activeAccount.code} — ${activeAccount.name}` : '—'} />
          {['تفصیل ۱', 'تفصیل ۲', 'تفصیل ۳'].map((label, index) => (
            <MetaPill key={label} label={label}
              value={activeAuxs[index] ? `${activeAuxs[index].code} — ${activeAuxs[index].name}` : '—'}
              color={activeAuxs[index] ? GREEN : MUTED} />
          ))}
          <MetaPill label="مرکز هزینهٔ صورت" value={headerCostCenter ? `${headerCostCenter.code} — ${headerCostCenter.name}` : '—'}
            color={headerCostCenter ? VIOLET : MUTED} />
          <MetaPill label="جمع ردیف" value={formatPersianNumber(activeGross)} color={CYAN} />
        </Stack>
      </SurfaceCard>

      <CodePickerDialog
        open={Boolean(picker)}
        title={picker?.slot === 'account'
          ? 'انتخاب کد معین'
          : picker?.slot === 'cost_center' ? 'انتخاب مرکز هزینه' : 'انتخاب تفصیل'}
        options={pickerOptions()}
        color={accent}
        onClose={() => setPicker(null)}
        onSelect={(option) => {
          if (!picker) return;
          if (picker.row < 0) setHeaderField('cost_center', option.id);
          else if (picker.slot === 'account') setAccount(picker.row, option.id);
          else setLine(picker.row, picker.slot, option.id);
          setPicker(null);
        }}
      />
    </Box>
  );
};

export default PettyCashExpenseNewPage;

