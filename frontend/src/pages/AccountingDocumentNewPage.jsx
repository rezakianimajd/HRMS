import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import fetchAllPages from '../core/api/fetchAllPages';
import {
  Alert, Autocomplete, Box, Button, Checkbox, Chip, CircularProgress, FormControl,
  Grid, IconButton, InputLabel, LinearProgress, MenuItem, Select, Stack, TextField,
  Tooltip, Typography,
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import DescriptionIcon from '@mui/icons-material/Description';
import BoltIcon from '@mui/icons-material/Bolt';
import ChecklistIcon from '@mui/icons-material/Checklist';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import TuneIcon from '@mui/icons-material/Tune';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LockIcon from '@mui/icons-material/Lock';
import UndoIcon from '@mui/icons-material/Undo';
import { formatPersianNumber, toPersianDigits, toEnglishDigits } from '../core/utils/numberUtils';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';
import PageHeader from '../core/components/ui/PageHeader';
import CodePickerDialog from '../core/components/ui/CodePickerDialog';
import DocumentIssuesDialog from '../core/components/accounting/DocumentIssuesDialog';
import {
  SurfaceCard, ProgressBar, CARD_BORDER, INK, MUTED, SOFT_BG,
} from './accounting/AccountingDashboardUI';

const COLOR = '#2563eb';
const COLOR_DARK = '#1d4ed8';
const GREEN = '#0f766e';
const RED = '#e11d48';
const AMBER = '#d97706';
const CYAN = '#0891b2';
const VIOLET = '#6366f1';
const ROWS = 8;
const FONT = 'Vazirmatn, IRANSans, sans-serif';

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '10px', background: '#ffffff',
    '&.Mui-focused': { background: '#ffffff' },
  },
};

const STATUS_META = {
  draft: { label: 'پیش‌نویس', color: '#64748b' },
  submitted: { label: 'در انتظار تأیید', color: '#f59e0b' },
  approved: { label: 'تأییدشده', color: COLOR },
  posted: { label: 'ثبت‌شده', color: GREEN },
  locked: { label: 'قفل‌شده', color: VIOLET },
  reversed: { label: 'برگشت‌خورده', color: RED },
};

const INVOICE_TYPES = [
  { value: 'sale', label: 'فروش کالا / خدمات' },
  { value: 'purchase', label: 'خرید کالا / خدمات' },
  { value: 'import', label: 'واردات' },
  { value: 'export', label: 'صادرات' },
  { value: 'service', label: 'قرارداد خدمت' },
  { value: 'none', label: 'نامشخص' },
];

const today = () => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

const empty = () => ({
  account: '', aux1: '', aux2: '', aux3: '',
  invoice_number: '', invoice_type: 'none',
  party_tax_id: '', party_national_id: '', party_postal_code: '',
  vat_amount: '', desc: '', maturity_date: '',
  debit: '', credit: '', season_flag: false,
  cost_center: '', project: '', contract: '', employee: '',
  currency: '', exchange_rate: '', reference: '',
});

const hasData = (line) => Boolean(
  line.account || line.desc || line.debit || line.credit || line.vat_amount
  || line.aux1 || line.aux2 || line.aux3 || line.invoice_number
  || line.cost_center || line.project || line.contract || line.employee || line.reference,
);

const faSep = (value) => {
  if (value == null || value === '') return '';
  const num = String(value);
  const negative = num.startsWith('-');
  const [int, dec] = num.replace('-', '').split('.');
  const withSep = int.replace(/\B(?=(\d{3})+(?!\d))/g, '٬');
  return toPersianDigits((negative ? '-' : '') + withSep + (dec != null ? `.${dec}` : ''));
};

const lineGross = (line) => {
  const debit = Number(line.debit) || 0;
  const credit = Number(line.credit) || 0;
  const vat = Number(line.vat_amount) || 0;
  if (debit && !credit) return { debit: debit + vat, credit: 0 };
  if (credit && !debit) return { debit: 0, credit: credit + vat };
  return { debit, credit };
};

const totalsOf = (rows) => rows.reduce((acc, line) => {
  const gross = lineGross(line);
  return {
    debit: acc.debit + gross.debit,
    credit: acc.credit + gross.credit,
    vat: acc.vat + (Number(line.vat_amount) || 0),
  };
}, { debit: 0, credit: 0, vat: 0 });

const lineNetFromApi = (line) => {
  const debit = Number(line.debit) || 0;
  const credit = Number(line.credit) || 0;
  const gross = debit || credit;
  const vat = Number(line.vat_amount) || 0;
  const base = Number(line.base_amount) || 0;
  if (base > 0 && vat > 0 && (base === debit || base === credit)) {
    return Math.max(0, gross - vat);
  }
  return base > 0 ? base : Math.max(0, gross - vat);
};

const rowAccent = (active) => (active ? `inset -3px 0 0 ${COLOR}` : 'none');

const Cell = React.forwardRef(({ children, center = false }, ref) => (
  <Box ref={ref} sx={{ px: 0.25, py: 0.25, display: 'flex', alignItems: 'center', justifyContent: center ? 'center' : 'flex-start', minWidth: 0 }}>
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
    InputProps={{ disableUnderline: true, sx: { fontSize: 13.5, fontFamily: FONT } }}
    inputProps={{ style: { textAlign: center ? 'center' : 'right', fontFamily: FONT } }}
  />
);

const MoneyValue = ({ value, unit = true, size = 13, color = INK, weight = 900 }) => (
  <Box component="span" sx={{ fontFamily: FONT, direction: 'rtl', unicodeBidi: 'isolate', fontVariantNumeric: 'tabular-nums', fontSize: size, fontWeight: weight, color, whiteSpace: 'nowrap' }}>
    {formatPersianNumber(value)}
    {unit ? <Box component="span" sx={{ mr: 0.45, fontSize: 9, fontWeight: 500, color: MUTED }}>ریال</Box> : null}
  </Box>
);

const MetaPill = ({ label, value, color = COLOR }) => (
  <Box sx={{
    display: 'flex', alignItems: 'center', gap: 0.65, minWidth: 0,
    bgcolor: `${color}08`, border: `1px solid ${color}1f`,
    borderRadius: '9px', px: 1, py: 0.45,
  }}>
    <Typography sx={{ fontSize: 9.5, fontWeight: 800, color, whiteSpace: 'nowrap' }}>{label}</Typography>
    <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: INK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value || '—'}</Typography>
  </Box>
);

const Kbd = ({ children }) => (
  <Box component="kbd" sx={{
    fontFamily: FONT, fontSize: 9, fontWeight: 800, color: '#475569',
    bgcolor: '#f1f5f9', border: '1px solid #dbe4ee', borderBottomWidth: 2,
    borderRadius: '5px', px: 0.55, py: 0.15, minWidth: 20, textAlign: 'center',
  }}>{children}</Box>
);

const BalanceMetric = ({ label, value, color = INK, strong = false }) => (
  <Box sx={{ p: 1, borderRadius: '10px', bgcolor: SOFT_BG, border: `1px solid ${CARD_BORDER}` }}>
    <Typography sx={{ fontSize: 9.5, color: MUTED, fontWeight: 700, mb: 0.35 }}>{label}</Typography>
    <MoneyValue value={value} color={color} size={strong ? 15 : 12.5} />
  </Box>
);

// سلول کد قابل تایپ دستی + باز کردن دیالوگ با Space
const CodeInput = ({ code, options, onMatch, onOpenPicker, placeholder = '…', disabled = false }) => {
  const [draft, setDraft] = useState('');
  useEffect(() => { setDraft(code ? String(code) : ''); }, [code]);

  const commit = () => {
    const eng = toEnglishDigits(draft);
    if (!eng) { setDraft(code ? String(code) : ''); return; }
    const opt = options.find((o) => String(o.code) === eng);
    if (opt) onMatch(opt.id);
    else setDraft(code ? String(code) : '');
  };

  return (
    <TextField
      size="small" fullWidth variant="standard" disabled={disabled}
      value={toPersianDigits(draft)}
      onChange={(e) => setDraft(toEnglishDigits(e.target.value))}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === ' ') { e.preventDefault(); onOpenPicker(); }
        else if (e.key === 'Enter') { e.preventDefault(); commit(); e.target.blur(); }
      }}
      onBlur={commit}
      placeholder={placeholder}
      InputProps={{ disableUnderline: true, sx: { fontSize: 13.5, fontFamily: FONT } }}
      inputProps={{ style: { textAlign: 'center', fontFamily: FONT } }}
    />
  );
};

const LookupSelect = ({ label, options, value, onChange, getOptionLabel, disabled = false, required = false }) => (
  <Autocomplete
    size="small" options={options} disabled={disabled}
    value={options.find((o) => String(o.id) === String(value)) || null}
    onChange={(_, option) => onChange(option ? option.id : '')}
    getOptionLabel={getOptionLabel}
    isOptionEqualToValue={(option, selected) => String(option.id) === String(selected?.id)}
    renderInput={(params) => (
      <TextField {...params} size="small" label={label} required={required}
        InputLabelProps={{ ...params.InputLabelProps, shrink: true }} />
    )}
    sx={fieldSx}
  />
);


const AccountingDocumentNewPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const qc = useQueryClient();

  const [header, setHeader] = useState({
    number: '',
    ref_no: '',
    date: today(),
    description: '',
    journal: '',
    fiscal_year: location.state?.fiscal_year != null ? String(location.state.fiscal_year) : '',
  });
  const [lines, setLines] = useState(() => Array.from({ length: ROWS }, () => empty()));
  const [msg, setMsg] = useState(location.state?.flash
    ? { ok: location.state.flashOk !== false, text: location.state.flash }
    : null);
  const [saving, setSaving] = useState(false);
  const [activeRow, setActiveRow] = useState(0);
  const [picker, setPicker] = useState(null);
  const [issuesOpen, setIssuesOpen] = useState(false);
  const [numberTouched, setNumberTouched] = useState(false);
  const defaultsApplied = useRef(false);

  const { data: fyData } = useQuery({
    queryKey: ['doc-fiscal-years'],
    queryFn: () => axiosInstance.get('/accounting/documents/fiscal_years/').then((r) => r.data),
  });
  const { data: journalsRaw, isError: journalsError } = useQuery({
    queryKey: ['doc-journal-options'],
    queryFn: () => fetchAllPages('/accounting/journals/'),
  });
  const { data: accountsRaw } = useQuery({
    queryKey: ['doc-account-options'],
    queryFn: () => fetchAllPages('/accounting/accounts/', { kind: 'subsidiary' }),
  });
  const { data: auxiliariesRaw } = useQuery({
    queryKey: ['doc-auxiliary-options'],
    queryFn: () => fetchAllPages('/accounting/auxiliary-accounts/'),
  });
  const { data: sequencesRaw } = useQuery({
    queryKey: ['doc-sequence-options'],
    queryFn: () => fetchAllPages('/accounting/sequences/'),
  });
  const {
    data: existingDoc, isLoading: docLoading, isError: docError, refetch: refetchDoc,
  } = useQuery({
    queryKey: ['accounting-document', id],
    queryFn: () => axiosInstance.get(`/accounting/documents/${id}/`).then((r) => r.data),
    enabled: isEdit,
  });

  const pickList = (payload) => (Array.isArray(payload) ? payload : payload?.results || []);
  const journalList = useMemo(() => pickList(journalsRaw), [journalsRaw]);
  const activeJournals = useMemo(() => journalList.filter((j) => j.is_active !== false), [journalList]);
  const accountList = useMemo(() => pickList(accountsRaw), [accountsRaw]);
  const allAuxList = useMemo(() => pickList(auxiliariesRaw), [auxiliariesRaw]);
  const auxList = useMemo(() => allAuxList.filter((a) => a.is_active !== false), [allAuxList]);
  const sequenceList = useMemo(() => pickList(sequencesRaw), [sequencesRaw]);
  const yearOptions = useMemo(() => fyData?.years || [], [fyData]);
  // برای سند جدید، سال جاری (یا جدیدترین سال باز) پیش‌فرض است؛ نه صرفاً آخرین سال دارای سند.
  const defaultYearId = useMemo(() => {
    const current = yearOptions.find((y) => y.is_current);
    if (current) return String(current.id);
    const open = yearOptions.find((y) => y.status === 'open');
    if (open) return String(open.id);
    return fyData?.default != null ? String(fyData.default) : '';
  }, [yearOptions, fyData]);

  const accountById = useMemo(
    () => new Map(accountList.map((a) => [String(a.id), a])),
    [accountList],
  );
  const auxById = useMemo(
    () => new Map(allAuxList.map((a) => [String(a.id), a])),
    [allAuxList],
  );
  const postableAccounts = useMemo(
    () => accountList.filter((a) => a.is_postable !== false && a.is_active !== false),
    [accountList],
  );

  const defaultJournalId = useMemo(() => {
    if (!activeJournals.length) return '';
    const seq = sequenceList.find((s) => (
      String(s.fiscal_year || '') === defaultYearId && !s.branch && s.journal
      && activeJournals.some((j) => String(j.id) === String(s.journal))
    ));
    return seq?.journal || activeJournals[0]?.id || '';
  }, [activeJournals, sequenceList, defaultYearId]);

  const matchingSeq = useMemo(() => sequenceList.find((s) => (
    String(s.journal || '') === String(header.journal || '')
    && String(s.fiscal_year || '') === String(header.fiscal_year || '')
    && !s.branch
  )), [sequenceList, header.journal, header.fiscal_year]);

  const suggestedNumber = matchingSeq
    ? `${matchingSeq.prefix || ''}${String(matchingSeq.next_number || 1).padStart(matchingSeq.padding || 5, '0')}`
    : '';

  // پیش‌فرض‌ها فقط یک بار (سال مالی جاری/آخرین سال دارای سند + روزنامهٔ Sequence)
  useEffect(() => {
    if (isEdit || defaultsApplied.current || !fyData) return;
    if (journalsRaw === undefined && !journalsError) return;
    setHeader((prev) => ({
      ...prev,
      fiscal_year: prev.fiscal_year || defaultYearId,
      journal: prev.journal || defaultJournalId,
    }));
    defaultsApplied.current = true;
  }, [isEdit, fyData, journalsRaw, journalsError, defaultYearId, defaultJournalId]);

  // اگر تاریخ سند بیرون از بازهٔ سال مالی انتخاب‌شده باشد، به نزدیک‌ترین مرز منتقل می‌شود
  useEffect(() => {
    if (isEdit || !header.date || !header.fiscal_year) return;
    const year = yearOptions.find((y) => String(y.id) === String(header.fiscal_year));
    if (!year) return;
    if (header.date < year.start_date || header.date > year.end_date) {
      const next = header.date < year.start_date ? year.start_date : year.end_date;
      setHeader((prev) => (prev.date === next ? prev : { ...prev, date: next }));
    }
  }, [isEdit, header.date, header.fiscal_year, yearOptions]);

  useEffect(() => {
    if (isEdit || numberTouched) return;
    setHeader((prev) => (prev.number === suggestedNumber ? prev : { ...prev, number: suggestedNumber }));
  }, [isEdit, numberTouched, suggestedNumber]);

  useEffect(() => {
    if (!existingDoc) return;
    setHeader({
      number: existingDoc.number || '',
      ref_no: existingDoc.reference || '',
      date: existingDoc.date,
      description: existingDoc.description || '',
      journal: existingDoc.journal || '',
      fiscal_year: existingDoc.fiscal_year || '',
    });
    setNumberTouched(true);
    const loaded = (existingDoc.lines || []).map((line) => {
      const debit = Number(line.debit) || 0;
      const credit = Number(line.credit) || 0;
      const net = lineNetFromApi(line);
      return {
        account: line.account || '',
        aux1: line.auxiliary_1 || line.auxiliary || '',
        aux2: line.auxiliary_2 || '',
        aux3: line.auxiliary_3 || '',
        invoice_number: line.invoice_number || '',
        invoice_type: line.invoice_type || 'none',
        party_tax_id: line.party_tax_id || '',
        party_national_id: line.party_national_id || '',
        party_postal_code: line.party_postal_code || '',
        vat_amount: Number(line.vat_amount) ? String(line.vat_amount) : '',
        desc: line.description || '',
        maturity_date: line.maturity_date || '',
        debit: debit ? String(net) : '',
        credit: credit ? String(net) : '',
        season_flag: Boolean(line.season_flag),
        cost_center: line.cost_center || '',
        project: line.project || '',
        contract: line.contract || '',
        employee: line.employee || '',
        currency: line.currency || '',
        exchange_rate: line.exchange_rate || '',
        reference: line.reference || '',
      };
    });
    setLines(loaded.length ? loaded : Array.from({ length: ROWS }, () => empty()));
    setActiveRow(0);
  }, [existingDoc]);

  const status = existingDoc?.status || 'draft';
  const statusMeta = STATUS_META[status] || STATUS_META.draft;
  const editable = !isEdit || Boolean(existingDoc && existingDoc.status === 'draft' && !existingDoc.is_locked);
  const openIssuesCount = existingDoc?.open_issues_count || 0;

  // ابعاد تحلیلی فقط زمانی بارگذاری می‌شوند که حساب نیازمند آن‌ها باشد یا مقدار داشته باشند
  const needCostCenter = lines.some((l) => l.cost_center || accountById.get(String(l.account))?.requires_cost_center);
  const needProject = lines.some((l) => l.project || accountById.get(String(l.account))?.requires_project);
  const needContract = lines.some((l) => l.contract || accountById.get(String(l.account))?.requires_contract);
  const needEmployee = lines.some((l) => l.employee || accountById.get(String(l.account))?.requires_employee);

  const fetchLookup = async (url) => {
    const response = await axiosInstance.get(url, { params: { page_size: 500 } });
    return Array.isArray(response.data) ? response.data : response.data?.results || [];
  };
  const { data: costCenters = [] } = useQuery({
    queryKey: ['doc-cost-center-options'], queryFn: () => fetchLookup('/accounting/cost-centers/'), enabled: needCostCenter,
  });
  const { data: projects = [] } = useQuery({
    queryKey: ['doc-project-options'], queryFn: () => fetchLookup('/projects/'), enabled: needProject,
  });
  const { data: contracts = [] } = useQuery({
    queryKey: ['doc-contract-options'], queryFn: () => fetchLookup('/external-contracts/'), enabled: needContract,
  });
  const { data: employees = [] } = useQuery({
    queryKey: ['doc-employee-options'], queryFn: () => fetchLookup('/employees/'), enabled: needEmployee,
  });

  const active = lines[activeRow] || empty();
  const activeAccount = accountById.get(String(active.account)) || null;
  const activeAuxs = ['aux1', 'aux2', 'aux3'].map((key) => auxById.get(String(active[key])) || null);
  const activeGross = lineGross(active);

  const totals = useMemo(() => totalsOf(lines), [lines]);
  const totalDebit = totals.debit;
  const totalCredit = totals.credit;
  const vatTotal = totals.vat;
  const diff = totalDebit - totalCredit;
  const totalBalanceOk = Math.abs(diff) < 0.001;
  const filledCount = lines.filter(hasData).length;
  const maxSide = Math.max(totalDebit, totalCredit);
  const balancePct = maxSide > 0 ? (Math.min(totalDebit, totalCredit) / maxSide) * 100 : 0;
  const hasAmounts = totalDebit > 0 || totalCredit > 0;
  const balanceColor = filledCount === 0 ? COLOR : totalBalanceOk ? GREEN : RED;
  const balanceLabel = filledCount === 0 ? 'آماده ورود' : totalBalanceOk ? 'متوازن' : 'نیازمند اصلاح';

  const rowIssues = (index) => {
    const line = lines[index];
    if (!line || !hasData(line)) return [];
    const issues = [];
    const account = accountById.get(String(line.account));
    const debit = Number(line.debit) || 0;
    const credit = Number(line.credit) || 0;
    const vat = Number(line.vat_amount) || 0;
    if (!line.account) issues.push({ text: 'حساب معین انتخاب نشده است', hard: true });
    if (debit && credit) issues.push({ text: 'هم بدهکار و هم بستانکار وارد شده است', hard: true });
    if (!debit && !credit && !vat) issues.push({ text: 'مبلغ آرتیکل خالی است', hard: true });
    if (account) {
      if (account.is_active === false) issues.push({ text: 'حساب غیرفعال است', hard: false });
      if (account.is_postable === false) issues.push({ text: 'حساب قابل سندخور نیست', hard: false });
      if (account.requires_party && !(line.aux1 || line.aux2 || line.aux3)) {
        issues.push({ text: 'طرف/تفصیلی برای این حساب الزامی است', hard: false });
      }
      if (account.requires_cost_center && !line.cost_center) issues.push({ text: 'مرکز هزینه الزامی است', hard: false });
      if (account.requires_project && !line.project) issues.push({ text: 'پروژه الزامی است', hard: false });
      if (account.requires_contract && !line.contract) issues.push({ text: 'قرارداد الزامی است', hard: false });
      if (account.requires_employee && !line.employee) issues.push({ text: 'پرسنل الزامی است', hard: false });
    }
    if (line.season_flag) {
      if (!line.invoice_number) issues.push({ text: 'شماره فاکتور برای معاملات فصلی الزامی است', hard: false });
      if (!line.invoice_type || line.invoice_type === 'none') issues.push({ text: 'نوع معامله را انتخاب کنید', hard: false });
      if (!line.party_tax_id && !line.party_national_id) issues.push({ text: 'شناسهٔ طرف معامله ثبت نشده است', hard: false });
    }
    return issues;
  };

  const warningRows = lines.map((_, index) => rowIssues(index));
  const warningCount = warningRows.reduce((sum, items) => sum + items.length, 0);
  const hardWarningCount = warningRows.reduce((sum, items) => sum + items.filter((i) => i.hard).length, 0);

  const dimensionFields = [
    { key: 'cost_center', label: 'مرکز هزینه', options: costCenters, required: activeAccount?.requires_cost_center, getOptionLabel: (o) => `${o.code || ''} — ${o.name || ''}` },
    { key: 'project', label: 'پروژه', options: projects, required: activeAccount?.requires_project, getOptionLabel: (o) => `${o.code || ''} — ${o.name || ''}` },
    { key: 'contract', label: 'قرارداد', options: contracts, required: activeAccount?.requires_contract, getOptionLabel: (o) => `${o.number || o.code || ''} — ${o.subject || o.name || ''}` },
    { key: 'employee', label: 'پرسنل', options: employees, required: activeAccount?.requires_employee, getOptionLabel: (o) => o.full_name || `${o.first_name || ''} ${o.last_name || ''}`.trim() },
  ].filter((field) => field.required || active[field.key]);

  const showTaxDetails = Boolean(active.season_flag || Number(active.vat_amount));
  const showDetails = Boolean(hasData(active) || activeAccount);

  const setHeaderField = (key, value) => {
    if (!editable) return;
    if (key === 'number') setNumberTouched(true);
    setHeader((prev) => ({ ...prev, [key]: value }));
  };

  const setLine = (index, key, value) => {
    if (!editable) return;
    setLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  };

  const setAccount = (index, accountId) => {
    if (!editable) return;
    setLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], account: accountId, aux1: '', aux2: '', aux3: '' };
      return next;
    });
  };

  const toggleSeason = (index, checked) => {
    if (!editable) return;
    setLines((prev) => {
      const next = [...prev];
      const line = { ...next[index], season_flag: checked };
      if (checked && (!line.invoice_type || line.invoice_type === 'none')) {
        line.invoice_type = (Number(line.credit) || 0) > 0 ? 'sale' : 'purchase';
      }
      next[index] = line;
      return next;
    });
  };

  const addRow = () => {
    if (!editable) return;
    setLines((prev) => [...prev, empty()]);
    setActiveRow(lines.length);
  };

  const removeRow = (index) => {
    if (!editable) return;
    setLines((prev) => (prev.length > ROWS
      ? prev.filter((_, i) => i !== index)
      : prev.map((line, i) => (i === index ? empty() : line))));
    setActiveRow((prev) => Math.max(0, Math.min(prev, Math.max(lines.length - 2, 0))));
  };

  useEffect(() => {
    const onKey = (event) => {
      if (!event.target || !event.target.tagName || !editable) return;
      const tag = event.target.tagName.toLowerCase();
      const isInput = tag === 'input' || tag === 'textarea';
      const inGrid = Boolean(event.target.closest && event.target.closest('[data-doc-grid="1"]'));
      if (event.ctrlKey && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        const source = { ...lines[activeRow], account: '', aux1: '', aux2: '', aux3: '' };
        setLines((prev) => [...prev, source]);
        setActiveRow(lines.length);
      } else if (event.key === 'F2') {
        event.preventDefault();
        setPicker({ row: activeRow, slot: 'account' });
      } else if (event.key === 'F3') {
        event.preventDefault();
        setPicker({ row: activeRow, slot: 'aux1' });
      } else if (event.key === 'Enter' && isInput && inGrid) {
        event.preventDefault();
        setActiveRow((prev) => Math.min(prev + 1, lines.length - 1));
      } else if (event.key === 'F9') {
        event.preventDefault();
        const others = lines.filter((_, index) => index !== activeRow);
        const otherTotals = totalsOf(others);
        const gap = otherTotals.debit - otherTotals.credit;
        setLines((prev) => {
          const next = [...prev];
          const line = { ...next[activeRow], vat_amount: '' };
          if (gap > 0) { line.credit = String(gap); line.debit = ''; }
          else { line.debit = String(Math.abs(gap)); line.credit = ''; }
          next[activeRow] = line;
          return next;
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeRow, editable, lines]);

  const openPicker = (row, slot) => {
    if (!editable) return;
    setPicker({ row, slot });
  };

  const pickerOptions = () => {
    if (!picker) return [];
    if (picker.slot === 'account') return postableAccounts;
    const account = accountById.get(String(lines[picker.row]?.account));
    const categoryKey = { aux1: 'auxiliary_category_1', aux2: 'auxiliary_category_2', aux3: 'auxiliary_category_3' }[picker.slot];
    const categoryId = account ? account[categoryKey] : null;
    return categoryId ? auxList.filter((a) => String(a.category) === String(categoryId)) : [];
  };

  const canSave = editable && filledCount > 0 && hasAmounts && totalBalanceOk && hardWarningCount === 0;
  const saveHint = !editable
    ? 'این سند در وضعیت جاری قابل ویرایش نیست'
    : filledCount === 0
      ? 'حداقل یک آرتیکل با مبلغ وارد کنید'
      : !hasAmounts
        ? 'مبلغ بدهکار یا بستانکار را وارد کنید'
        : !totalBalanceOk
          ? 'تا زمان رفع مغایرت بدهکار و بستانکار، ذخیره غیرفعال است'
          : hardWarningCount > 0
            ? 'ردیف‌های دارای خطا را اصلاح کنید'
            : 'ذخیره سند';

  const buildLinePayload = (line, index) => {
    const debit = Number(line.debit) || 0;
    const credit = Number(line.credit) || 0;
    const vat = Number(line.vat_amount) || 0;
    const net = debit || credit || 0;
    return {
      line_no: index + 1,
      account: line.account || null,
      auxiliary: line.aux1 || null,
      auxiliary_1: line.aux1 || null,
      auxiliary_2: line.aux2 || null,
      auxiliary_3: line.aux3 || null,
      description: line.desc || '',
      maturity_date: line.maturity_date || null,
      currency: line.currency || null,
      exchange_rate: Number(line.exchange_rate) || 1,
      reference: line.reference || '',
      debit: debit ? net + vat : 0,
      credit: credit ? net + vat : 0,
      base_amount: net,
      vat_amount: vat,
      vat_rate: net > 0 && vat > 0 ? Number(((vat / net) * 100).toFixed(2)) : 0,
      invoice_number: line.invoice_number || '',
      invoice_type: line.invoice_type || 'none',
      party_tax_id: line.party_tax_id || '',
      party_national_id: line.party_national_id || '',
      party_postal_code: line.party_postal_code || '',
      season_flag: Boolean(line.season_flag),
      cost_center: line.cost_center || null,
      project: line.project || null,
      contract: line.contract || null,
      employee: line.employee || null,
    };
  };

  const submit = async (andSubmit = false) => {
    if (!editable) return;
    setMsg(null);
    if (!canSave) { setMsg({ ok: false, text: saveHint }); return; }
    if (andSubmit && warningCount > 0) {
      setMsg({ ok: false, text: 'برای ارسال، ابتدا هشدارهای ردیف‌های سند را رفع کنید.' });
      return;
    }

    const payloadLines = lines
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => hasData(line))
      .map(({ line, index }) => buildLinePayload(line, index));

    if (payloadLines.length === 0) { setMsg({ ok: false, text: 'حداقل یک آرتیکل وارد کنید' }); return; }

    const payload = {
      number: header.number || null,
      description: header.description || '',
      date: header.date,
      fiscal_year: header.fiscal_year || null,
      journal: header.journal || null,
      reference: header.ref_no || '',
      lines: payloadLines,
    };
    if (!isEdit) payload.status = 'draft';

    setSaving(true);
    let saved = null;
    try {
      if (isEdit) {
        const response = await axiosInstance.patch(`/accounting/documents/${id}/`, payload);
        saved = response.data;
        if (andSubmit) await axiosInstance.post(`/accounting/documents/${id}/submit/`);
        qc.setQueryData(['accounting-document', id], saved);
        refetchDoc();
      } else {
        const response = await axiosInstance.post('/accounting/documents/', payload);
        saved = response.data;
        if (andSubmit && saved?.id) await axiosInstance.post(`/accounting/documents/${saved.id}/submit/`);
      }
      qc.invalidateQueries({ queryKey: ['accounting-documents'] });
      qc.invalidateQueries({ queryKey: ['doc-stats'] });
      qc.invalidateQueries({ queryKey: ['accounting-dashboard-rich'] });
      const flash = andSubmit ? 'سند ذخیره و برای تأیید ارسال شد' : 'سند با موفقیت ذخیره شد';
      if (!isEdit && saved?.id) {
        navigate(`/accounting/documents/${saved.id}/edit`, { replace: true, state: { flash } });
      } else {
        setMsg({ ok: true, text: flash });
      }
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
      const errorText = text || 'خطا در ذخیره سند';
      // اگر سند ساخته شده اما مرحلهٔ بعد (مثلاً ارسال) شکست خورده، از ساخت دوباره جلوگیری کن
      if (!isEdit && saved?.id) {
        navigate(`/accounting/documents/${saved.id}/edit`, {
          replace: true,
          state: { flash: `سند ذخیره شد، اما ادامهٔ عملیات ناموفق بود: ${errorText}`, flashOk: false },
        });
        return;
      }
      setMsg({ ok: false, text: errorText });
    } finally {
      setSaving(false);
    }
  };

  const workflow = useMutation({
    mutationFn: (act) => axiosInstance.post(`/accounting/documents/${id}/${act}/`).then((r) => r.data),
    onSuccess: (data, act) => {
      qc.invalidateQueries({ queryKey: ['accounting-documents'] });
      qc.invalidateQueries({ queryKey: ['doc-stats'] });
      qc.invalidateQueries({ queryKey: ['accounting-dashboard-rich'] });
      if (act === 'reverse' && data?.id) {
        navigate(`/accounting/documents/${data.id}/edit`, {
          replace: true,
          state: { flash: `سند برگشتی ${data.number || data.id} ایجاد شد` },
        });
        return;
      }
      qc.setQueryData(['accounting-document', id], data);
      refetchDoc();
      setMsg({ ok: true, text: 'وضعیت سند با موفقیت به‌روزرسانی شد' });
    },
    onError: (e) => setMsg({ ok: false, text: e.response?.data?.error || 'خطا در تغییر وضعیت سند' }),
  });

  const runWorkflow = (act) => {
    if (!isEdit) return;
    if (['post_document', 'lock', 'reverse'].includes(act)) {
      const message = act === 'reverse'
        ? 'سند برگشت داده شود؟ سند قرینهٔ ثبت‌شده ایجاد می‌شود.'
        : act === 'post_document'
          ? 'سند به‌صورت نهایی ثبت و قفل شود؟ پس از ثبت فقط با برگشت سند قابل اصلاح است.'
          : 'سند قفل شود؟';
      if (!window.confirm(message)) return;
    }
    workflow.mutate(act);
  };

  const gridCols = '34px 30px 0.7fr 0.52fr 0.52fr 0.52fr 0.8fr 1.55fr 0.8fr 0.8fr 0.8fr 34px';
  const HEADERS = ['ردیف', 'شمول', 'معین', 'تفصیل۱', 'تفصیل۲', 'تفصیل۳', 'شماره فاکتور', 'شرح', 'بدهکار', 'ارزش افزوده', 'بستانکار', ''];
  const activeNet = Number(active.debit) || Number(active.credit) || 0;
  const activeVatRate = activeNet > 0 && Number(active.vat_amount) > 0
    ? (Number(active.vat_amount) / activeNet) * 100
    : 0;

  return (
    <Box sx={{ pb: 1 }}>
      <PageHeader
        icon={<DescriptionIcon />}
        title={isEdit ? 'ویرایش سند' : 'سند جدید'}
        badge={(
          <Stack direction="row" spacing={0.75} useFlexGap alignItems="center">
            {header.number ? <Chip size="small" label={`شماره ${toPersianDigits(header.number)}`} sx={{ height: 24, fontWeight: 800, bgcolor: '#eff6ff', color: COLOR_DARK }} /> : null}
            <Chip size="small" label={statusMeta.label} sx={{ height: 24, fontWeight: 800, bgcolor: `${statusMeta.color}12`, color: statusMeta.color }} />
            {!editable ? <Chip size="small" icon={<LockIcon sx={{ fontSize: '13px !important' }} />} label="فقط مشاهده" sx={{ height: 24, fontWeight: 800, bgcolor: '#f8fafc', color: MUTED }} /> : null}
          </Stack>
        )}
        sx={{ mb: 1.5, py: 1 }}
        actions={(
          <>
            {editable ? (
              <>
                <Tooltip title={saveHint}>
                  <span>
                    <Button size="small" startIcon={<SaveIcon />} onClick={() => submit(false)} variant="contained" disabled={saving || workflow.isPending || !canSave}>
                      {saving ? <CircularProgress size={16} color="inherit" /> : (isEdit ? 'به‌روزرسانی' : 'ذخیره سند')}
                    </Button>
                  </span>
                </Tooltip>
                <Button size="small" startIcon={<SendIcon />} onClick={() => submit(true)} variant="outlined" disabled={saving || workflow.isPending || !canSave}>
                  ذخیره و ارسال
                </Button>
              </>
            ) : null}
            {isEdit && status === 'submitted' ? (
              <Button size="small" startIcon={<CheckCircleIcon />} onClick={() => runWorkflow('approve')} variant="contained" color="success" disabled={workflow.isPending || saving}>تأیید سند</Button>
            ) : null}
            {isEdit && (status === 'submitted' || status === 'approved') ? (
              <Button size="small" startIcon={<LockIcon />} onClick={() => runWorkflow('post_document')} variant="contained" color="info" disabled={workflow.isPending || saving}>ثبت نهایی</Button>
            ) : null}
            {isEdit && status === 'posted' ? (
              <Button size="small" startIcon={<LockIcon />} onClick={() => runWorkflow('lock')} variant="outlined" disabled={workflow.isPending || saving}>قفل سند</Button>
            ) : null}
            {isEdit && (status === 'posted' || status === 'locked') ? (
              <Button size="small" startIcon={<UndoIcon />} onClick={() => runWorkflow('reverse')} variant="outlined" color="warning" disabled={workflow.isPending || saving}>برگشت سند</Button>
            ) : null}
            <Button size="small" startIcon={<ChecklistIcon />} variant="outlined"
              color={openIssuesCount > 0 ? 'error' : 'primary'}
              onClick={() => {
                if (!isEdit) { setMsg({ ok: false, text: 'ابتدا سند را ذخیره کنید، سپس می‌توانید نواقص را ثبت و رفع کنید.' }); return; }
                setIssuesOpen(true);
              }}>
              رفع نقص{openIssuesCount > 0 ? ` (${toPersianDigits(openIssuesCount)})` : ''}
            </Button>
            <Button size="small" startIcon={<ArrowForwardIcon />} variant="outlined"
              onClick={() => navigate('/accounting/documents', { state: header.fiscal_year ? { fiscal_year: header.fiscal_year } : undefined })}>
              بازگشت
            </Button>
          </>
        )}
      />

      {isEdit && docLoading ? <LinearProgress sx={{ mb: 1.5, height: 2, borderRadius: 1 }} /> : null}
      {isEdit && docError ? (
        <Alert severity="error" sx={{ mb: 1.5, borderRadius: '12px' }}
          action={<Button size="small" onClick={() => refetchDoc()}>تلاش دوباره</Button>}>
          دریافت اطلاعات سند ناموفق بود.
        </Alert>
      ) : null}
      {isEdit && existingDoc && !editable ? (
        <Alert severity="info" sx={{ mb: 1.5, borderRadius: '12px' }}>
          این سند در وضعیت «{statusMeta.label}» است و فقط قابل مشاهده است. ویرایش فقط برای سند پیش‌نویس مجاز است.
        </Alert>
      ) : null}
      {msg && <Alert severity={msg.ok ? 'success' : 'error'} onClose={() => setMsg(null)} sx={{ mb: 1.25, borderRadius: '12px', fontSize: 12.5 }}>{msg.text}</Alert>}

      <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
        <Grid item xs={12} lg={8}>
          <SurfaceCard title="مشخصات سند" icon={DescriptionIcon} color={COLOR} sx={{ height: '100%' }}
            action={<Chip size="small" label={isEdit ? 'سند موجود' : 'سند جدید'} sx={{ height: 22, fontSize: 9.5, fontWeight: 800, bgcolor: '#eff6ff', color: COLOR_DARK }} />}>
            <Box sx={{
              display: 'grid', gap: 1.25,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' },
            }}>
              <TextField size="small" label="شماره سند" value={toPersianDigits(header.number)} disabled={!editable}
                onChange={(e) => setHeaderField('number', toEnglishDigits(e.target.value))} sx={fieldSx}
                placeholder="خودکار"
                InputProps={{ endAdornment: editable ? (
                  <Tooltip title={suggestedNumber ? `شماره پیشنهادی: ${toPersianDigits(suggestedNumber)}` : 'شماره خودکار هنگام ذخیره'}>
                    <span>
                      <IconButton size="small" disabled={!suggestedNumber}
                        onClick={() => { setNumberTouched(false); setHeader((prev) => ({ ...prev, number: suggestedNumber })); }}>
                        <BoltIcon fontSize="small" color="primary" />
                      </IconButton>
                    </span>
                  </Tooltip>
                ) : undefined }} />
              <TextField size="small" label="شماره عطف" value={header.ref_no} disabled={!editable}
                onChange={(e) => setHeaderField('ref_no', e.target.value)} sx={fieldSx} />
              <JalaliDatePicker noHelper label="تاریخ سند" value={header.date} disabled={!editable}
                onChange={(value) => setHeaderField('date', value)} sx={{ ...fieldSx, width: '100%' }} />
              <Autocomplete size="small" options={yearOptions} disabled={!editable}
                getOptionLabel={(option) => option.name || ''}
                value={yearOptions.find((y) => String(y.id) === String(header.fiscal_year)) || null}
                onChange={(_, option) => {
                  setHeaderField('fiscal_year', option ? option.id : '');
                  setNumberTouched(false);
                }}
                isOptionEqualToValue={(option, selected) => String(option.id) === String(selected?.id)}
                renderInput={(params) => <TextField {...params} size="small" label="سال مالی" />}
                sx={{ ...fieldSx, minWidth: 0 }} />
              <Autocomplete size="small" options={journalList} disabled={!editable}
                getOptionLabel={(option) => option.name || ''}
                getOptionDisabled={(option) => option.is_active === false}
                value={journalList.find((j) => String(j.id) === String(header.journal)) || null}
                onChange={(_, option) => {
                  setHeaderField('journal', option ? option.id : '');
                  setNumberTouched(false);
                }}
                isOptionEqualToValue={(option, selected) => String(option.id) === String(selected?.id)}
                renderInput={(params) => <TextField {...params} size="small" label="دفتر روزنامه" />}
                sx={{ ...fieldSx, minWidth: 0 }} />
              <TextField size="small" label="شرح سند" value={header.description} disabled={!editable}
                onChange={(e) => setHeaderField('description', e.target.value)}
                placeholder="موضوع یا علت صدور سند"
                sx={{ ...fieldSx, gridColumn: { xs: 'auto', sm: '1 / -1', lg: '1 / -1' } }} />
            </Box>
            <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mt: 1.25 }}>
              <MetaPill label="سال" value={yearOptions.find((y) => String(y.id) === String(header.fiscal_year))?.name} />
              <MetaPill label="روزنامه" value={journalList.find((j) => String(j.id) === String(header.journal))?.name} color={CYAN} />
              <MetaPill label="تهیه‌کننده" value={existingDoc?.created_by_name || existingDoc?.prepared_by_name} color={VIOLET} />
              {suggestedNumber && header.number !== suggestedNumber ? (
                <Tooltip title="شمارهٔ بعدی این Sequence">
                  <Box><MetaPill label="پیشنهاد" value={toPersianDigits(suggestedNumber)} color={AMBER} /></Box>
                </Tooltip>
              ) : null}
            </Stack>
          </SurfaceCard>
        </Grid>

        <Grid item xs={12} lg={4}>
          <SurfaceCard title="تراز سند" icon={SwapVertIcon} color={balanceColor} sx={{ height: '100%' }}
            action={<Chip size="small" label={balanceLabel}
              sx={{ height: 22, fontSize: 9.5, fontWeight: 800, bgcolor: `${balanceColor}12`, color: balanceColor }} />}>
            <Stack direction="row" alignItems="center" spacing={1} useFlexGap sx={{ mb: 1.25 }}>
              <Box sx={{ width: 34, height: 34, borderRadius: '10px', bgcolor: `${balanceColor}10`, color: balanceColor, border: `1px solid ${balanceColor}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {filledCount === 0 ? <SwapVertIcon sx={{ fontSize: 19 }} /> : totalBalanceOk ? <CheckCircleOutlineIcon sx={{ fontSize: 19 }} /> : <WarningAmberIcon sx={{ fontSize: 19 }} />}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 900, color: balanceColor }}>
                  {filledCount === 0 ? 'در انتظار ورود آرتیکل‌ها' : totalBalanceOk ? 'سند متوازن است' : 'سند توازن ندارد'}
                </Typography>
                <Typography sx={{ fontSize: 9.5, color: MUTED, mt: 0.1 }}>
                  {filledCount === 0 ? 'بدهکار و بستانکار باید برابر باشند' : `اختلاف: ${formatPersianNumber(Math.abs(diff))} ریال`}
                </Typography>
              </Box>
            </Stack>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
              <BalanceMetric label="جمع بدهکار (ناخالص)" value={totalDebit} color={COLOR_DARK} />
              <BalanceMetric label="جمع بستانکار (ناخالص)" value={totalCredit} color={GREEN} />
            </Box>

            <Box sx={{ mt: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
              <BalanceMetric label="ارزش افزوده" value={vatTotal} color={AMBER} />
              <BalanceMetric label="اختلاف تراز" value={Math.abs(diff)} color={totalBalanceOk ? GREEN : RED} strong />
            </Box>

            <Box sx={{ mt: 0.85 }}>
              <ProgressBar value={balancePct} color={filledCount === 0 ? COLOR : totalBalanceOk ? GREEN : AMBER} height={6} />
            </Box>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 0.85 }}>
              <Typography sx={{ fontSize: 9, color: MUTED }}>آرتیکل‌های تکمیل‌شده: {toPersianDigits(filledCount)} از {toPersianDigits(lines.length)}</Typography>
              <Typography sx={{ fontSize: 9, color: MUTED }}>هشدار: {toPersianDigits(warningCount)}</Typography>
            </Stack>
            <Typography sx={{ mt: 0.85, fontSize: 9, color: MUTED, lineHeight: 1.8 }}>
              مبلغ ارزش افزوده به همان طرف آرتیکل (بدهکار یا بستانکار) افزوده می‌شود و مبلغ خالص در «مبلغ پایه» ذخیره می‌گردد.
            </Typography>
          </SurfaceCard>
        </Grid>
      </Grid>

      <SurfaceCard
        title="آرتیکل‌های سند"
        icon={ReceiptLongIcon}
        color={COLOR}
        contentSx={{ p: 0 }}
        action={(
          <Stack direction="row" spacing={0.75} useFlexGap alignItems="center">
            {warningCount > 0 ? (
              <Chip size="small" icon={<WarningAmberIcon sx={{ fontSize: 14 }} />} label={`${toPersianDigits(warningCount)} هشدار`}
                sx={{ height: 23, fontSize: 9.5, fontWeight: 800, bgcolor: '#fffbeb', color: '#b45309' }} />
            ) : null}
            <Chip size="small" label={`${toPersianDigits(filledCount)} آرتیکل`}
              sx={{ height: 23, fontSize: 9.5, fontWeight: 800, bgcolor: '#eff6ff', color: COLOR_DARK }} />
            {editable ? (
              <>
                <Button size="small" startIcon={<AddCircleIcon />} onClick={addRow} sx={{ minWidth: 0, fontSize: 10.5 }}>افزودن ردیف</Button>
                <Button size="small" startIcon={<RemoveCircleIcon />} onClick={() => removeRow(lines.length - 1)} color="error" sx={{ minWidth: 0, fontSize: 10.5 }}>حذف آخرین</Button>
              </>
            ) : null}
          </Stack>
        )}
      >
        <Box data-doc-grid="1" sx={{ overflowX: 'auto', overflowY: 'auto', maxHeight: { xs: 420, lg: 'calc(100vh - 470px)' }, minHeight: 260 }}>
          <Box sx={{ minWidth: 1320 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: gridCols, position: 'sticky', top: 0, zIndex: 3, bgcolor: '#f8fafc', borderBottom: `1px solid ${CARD_BORDER}` }}>
              {HEADERS.map((label, index) => (
                <Box key={index} sx={{ px: 0.8, py: 1, fontWeight: 800, fontSize: 10, color: '#334155', borderLeft: index ? '1px solid #eef2f7' : 'none', whiteSpace: 'nowrap', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT }}>{label}</Box>
              ))}
            </Box>

            {lines.map((line, index) => {
              const account = accountById.get(String(line.account));
              const slots = [
                { key: 'aux1', catId: account?.auxiliary_category_1 },
                { key: 'aux2', catId: account?.auxiliary_category_2 },
                { key: 'aux3', catId: account?.auxiliary_category_3 },
              ];
              const issues = warningRows[index] || [];
              return (
                <Box key={index} onClick={() => setActiveRow(index)}
                  sx={{
                    display: 'grid', gridTemplateColumns: gridCols, alignItems: 'center',
                    borderBottom: '1px solid #eef2f7',
                    bgcolor: activeRow === index ? '#eff6ff' : 'transparent',
                    boxShadow: rowAccent(activeRow === index),
                    '&:hover': { bgcolor: activeRow === index ? '#e8f1ff' : '#fbfdff' },
                    minHeight: 48, transition: 'background-color .12s ease',
                  }}>
                  <Stack alignItems="center" justifyContent="center" spacing={0.1}>
                    {issues.length ? (
                      <Tooltip title={issues.map((item) => item.text).join(' · ')}>
                        <WarningAmberIcon sx={{ fontSize: 13, color: issues.some((i) => i.hard) ? RED : AMBER, cursor: 'help' }} />
                      </Tooltip>
                    ) : null}
                    <Typography sx={{ fontFamily: FONT, fontSize: 10, fontWeight: 800, color: activeRow === index ? COLOR_DARK : MUTED }}>{toPersianDigits(index + 1)}</Typography>
                  </Stack>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Tooltip title="شامل معاملات فصلی و ارزش افزوده">
                      <span>
                        <Checkbox size="small" disabled={!editable}
                          sx={{ p: 0.15, '& .MuiSvgIcon-root': { fontSize: 15 } }}
                          checked={line.season_flag}
                          onChange={(e) => toggleSeason(index, e.target.checked)} />
                      </span>
                    </Tooltip>
                  </Box>
                  <Tooltip title={account ? `${account.code} — ${account.name}` : 'انتخاب معین (F2 یا Space)'}>
                    <Cell>
                      <CodeInput
                        code={account?.code || ''}
                        options={postableAccounts}
                        onMatch={(accountId) => setAccount(index, accountId)}
                        onOpenPicker={() => openPicker(index, 'account')}
                        disabled={!editable}
                      />
                    </Cell>
                  </Tooltip>
                  {slots.map((slot) => {
                    const aux = auxById.get(String(line[slot.key]));
                    const options = slot.catId ? auxList.filter((a) => String(a.category) === String(slot.catId)) : [];
                    return (
                      <Tooltip key={slot.key} title={aux ? `${aux.code} — ${aux.name}` : slot.catId ? 'انتخاب تفصیل (Space)' : 'این معین تفصیل ندارد'}>
                        <Cell>
                          <CodeInput
                            code={aux?.code || ''}
                            options={options}
                            onMatch={(auxId) => setLine(index, slot.key, auxId)}
                            onOpenPicker={() => slot.catId && openPicker(index, slot.key)}
                            placeholder={!line.account ? '…' : slot.catId ? '…' : '—'}
                            disabled={!editable || !slot.catId}
                          />
                        </Cell>
                      </Tooltip>
                    );
                  })}
                  <Cell center><FaField center value={line.invoice_number} disabled={!editable} onChange={(value) => setLine(index, 'invoice_number', value)} /></Cell>
                  <Cell>
                    <TextField size="small" fullWidth variant="standard" disabled={!editable}
                      value={line.desc} onChange={(e) => setLine(index, 'desc', e.target.value)}
                      placeholder="شرح آرتیکل"
                      InputProps={{ disableUnderline: true, sx: { fontSize: 13.5, fontFamily: FONT } }}
                      inputProps={{ style: { textAlign: 'right', fontFamily: FONT } }} />
                  </Cell>
                  <Cell center><FaField numeric center value={line.debit} disabled={!editable} onChange={(value) => setLine(index, 'debit', value)} /></Cell>
                  <Cell center><FaField numeric center value={line.vat_amount} disabled={!editable} onChange={(value) => setLine(index, 'vat_amount', value)} /></Cell>
                  <Cell center><FaField numeric center value={line.credit} disabled={!editable} onChange={(value) => setLine(index, 'credit', value)} /></Cell>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {editable ? (
                      <Tooltip title="حذف / پاک کردن ردیف">
                        <IconButton size="small" sx={{ p: 0.25 }} color="error"
                          onClick={(event) => { event.stopPropagation(); removeRow(index); }}>
                          <DeleteIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Tooltip>
                    ) : null}
                  </Box>
                </Box>
              );
            })}

            <Box sx={{ px: 1.5, py: 1.1, borderTop: `1px solid ${CARD_BORDER}`, bgcolor: '#fbfdff', display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'center', flex: 1, minWidth: 0 }}>
                <Chip size="small" label={`ردیف فعال ${toPersianDigits(activeRow + 1)}`} sx={{ height: 23, fontSize: 9.5, fontWeight: 800, bgcolor: '#eff6ff', color: COLOR_DARK }} />
                <MetaPill label="معین" value={activeAccount ? `${activeAccount.code} — ${activeAccount.name}` : '—'} />
                {['تفصیل ۱', 'تفصیل ۲', 'تفصیل ۳'].map((label, index) => (
                  <MetaPill key={label} label={label} value={activeAuxs[index] ? `${activeAuxs[index].code} — ${activeAuxs[index].name}` : '—'} color={activeAuxs[index] ? GREEN : MUTED} />
                ))}
                <MetaPill label="جمع ردیف" value={formatPersianNumber(activeGross.debit || activeGross.credit)} color={CYAN} />
              </Box>
              {editable ? (
                <Stack direction="row" spacing={0.55} useFlexGap alignItems="center">
                  <KeyboardIcon sx={{ fontSize: 15, color: MUTED }} />
                  <Typography sx={{ fontSize: 9, color: MUTED, ml: 0.2 }}>میان‌بر:</Typography>
                  <Kbd>F2</Kbd><Typography sx={{ fontSize: 8.5, color: MUTED }}>معین</Typography>
                  <Kbd>F3</Kbd><Typography sx={{ fontSize: 8.5, color: MUTED }}>تفصیل</Typography>
                  <Kbd>F9</Kbd><Typography sx={{ fontSize: 8.5, color: MUTED }}>متوازن‌سازی</Typography>
                  <Kbd>Ctrl+D</Kbd><Typography sx={{ fontSize: 8.5, color: MUTED }}>تکثیر ردیف</Typography>
                </Stack>
              ) : null}
            </Box>
          </Box>
        </Box>
      </SurfaceCard>


      {showDetails ? (
        <SurfaceCard
          title={`جزئیات ردیف ${toPersianDigits(activeRow + 1)}`}
          icon={TuneIcon}
          color={VIOLET}
          sx={{ mt: 1.5 }}
          action={activeVatRate > 0 ? (
            <Chip size="small" label={`نرخ ارزش افزوده: ${toPersianDigits(activeVatRate.toFixed(1))}٪`}
              sx={{ height: 22, fontSize: 9.5, fontWeight: 800, bgcolor: '#fffbeb', color: '#b45309' }} />
          ) : null}
        >
          <Box sx={{
            display: 'grid', gap: 1.25,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' },
          }}>
            <JalaliDatePicker noHelper label="تاریخ سررسید (اختیاری)" value={active.maturity_date} disabled={!editable}
              onChange={(value) => setLine(activeRow, 'maturity_date', value)}
              sx={{ ...fieldSx, width: '100%' }} />
            {dimensionFields.map((field) => (
              <LookupSelect
                key={field.key}
                label={field.label}
                options={field.options}
                value={active[field.key]}
                onChange={(value) => setLine(activeRow, field.key, value)}
                getOptionLabel={field.getOptionLabel}
                disabled={!editable}
                required={Boolean(field.required)}
              />
            ))}
            {showTaxDetails ? (
              <>
                <FormControl size="small" sx={fieldSx}>
                  <InputLabel>نوع معامله</InputLabel>
                  <Select value={active.invoice_type || 'none'} label="نوع معامله" disabled={!editable}
                    onChange={(e) => setLine(activeRow, 'invoice_type', e.target.value)}>
                    {INVOICE_TYPES.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
                  </Select>
                </FormControl>
                <TextField size="small" label="شماره اقتصادی طرف" value={active.party_tax_id} disabled={!editable}
                  onChange={(e) => setLine(activeRow, 'party_tax_id', e.target.value)} sx={fieldSx} />
                <TextField size="small" label="شناسه ملی / کد ملی طرف" value={active.party_national_id} disabled={!editable}
                  onChange={(e) => setLine(activeRow, 'party_national_id', e.target.value)} sx={fieldSx} />
                <TextField size="small" label="کد پستی طرف" value={active.party_postal_code} disabled={!editable}
                  onChange={(e) => setLine(activeRow, 'party_postal_code', e.target.value)} sx={fieldSx} />
              </>
            ) : null}
          </Box>
          {!dimensionFields.length && !showTaxDetails ? (
            <Typography sx={{ mt: 1, fontSize: 10, color: MUTED }}>
              این ردیف ابعاد تحلیلی یا اطلاعات فصلی اضافی نیاز ندارد.
            </Typography>
          ) : null}
          {activeAccount && (activeAccount.requires_party || activeAccount.requires_cost_center
            || activeAccount.requires_project || activeAccount.requires_contract || activeAccount.requires_employee) ? (
            <Typography sx={{ mt: 1, fontSize: 9.5, color: AMBER }}>
              این حساب الزامات تکمیلی دارد؛ فیلدهای ستاره‌دار باید پیش از ثبت نهایی تکمیل شوند.
            </Typography>
          ) : null}
        </SurfaceCard>
      ) : null}

      <CodePickerDialog
        open={Boolean(picker)}
        title={picker?.slot === 'account' ? 'انتخاب کد معین' : 'انتخاب تفصیل'}
        options={pickerOptions()}
        color={COLOR_DARK}
        onClose={() => setPicker(null)}
        onSelect={(option) => {
          if (!picker) return;
          if (picker.slot === 'account') setAccount(picker.row, option.id);
          else setLine(picker.row, picker.slot, option.id);
        }}
      />

      <DocumentIssuesDialog
        document={{ id, number: header.number }}
        open={issuesOpen}
        onClose={() => setIssuesOpen(false)}
      />
    </Box>
  );
};

export default AccountingDocumentNewPage;
