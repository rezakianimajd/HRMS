import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Autocomplete, Box, Button, FormControl, IconButton, InputLabel,
  MenuItem, Paper, Select, Snackbar, Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import CalendarViewMonthIcon from '@mui/icons-material/CalendarViewMonth';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import PrintIcon from '@mui/icons-material/Print';
import RuleOutlinedIcon from '@mui/icons-material/RuleOutlined';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../../../core/api/axiosConfig';
import PageHeader from '../../../core/components/ui/PageHeader';
import MoneyInput from '../../../core/components/ui/MoneyInput';
import { MUTED } from '../../accounting/AccountingDashboardUI';
import { formatPersianNumber, toEnglishDigits, toPersianDigits } from '../../../core/utils/numberUtils';
import { toJalali, getJalaliParts, toGregorian } from '../../../core/utils/dateUtils';
import {
  ModuleTable, ModuleToolbar, useModuleTheme, useRowHeight,
} from '../../contracts/contractModuleUi';

const API_BASE = '/accounting/tax/seasonal-reports';

const QUARTERS = [
  { value: 1, label: 'سه‌ماهه اول (بهار)' },
  { value: 2, label: 'سه‌ماهه دوم (تابستان)' },
  { value: 3, label: 'سه‌ماهه سوم (پاییز)' },
  { value: 4, label: 'سه‌ماهه چهارم (زمستان)' },
];
const KINDS = [1, 2, 3, 4, 5];
const STATUSES = [
  { value: 'registered', label: 'درج شده در سامانه' },
  { value: 'pending', label: 'درج نشده' },
];

const ROWS_KEY = (yearKey, quarter) => `hrms.seasonal.rows.${yearKey}.q${quarter}`;
const PARTIES_KEY = 'hrms.seasonal.parties';
const SETTINGS_KEY = 'hrms.seasonal.settings';

const emptyRow = () => ({
  id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  name: '', economicCode: '', nationalId: '', postalCode: '', city: '', address: '',
  description: '', amount: '', vat: '', kind: 1, invoiceDate: '', invoiceNo: '',
  status: 'pending',
});

const num = (value) => Number(toEnglishDigits(String(value ?? '')).replace(/[^\d.-]/g, '')) || 0;
const totalOf = (row) => num(row.amount) + num(row.vat);
const normalizeName = (value) => String(value || '').trim().replace(/\s+/g, ' ');
const isEmpty = (value) => !String(value ?? '').trim();

/* ردیف خالی (ردیف آمادهٔ ورود) */
const TEXT_FIELDS = [
  'name', 'economicCode', 'nationalId', 'postalCode', 'city', 'address',
  'description', 'amount', 'vat', 'invoiceNo', 'invoiceDate',
];
const isBlankRow = (row) => TEXT_FIELDS.every((field) => isEmpty(row[field]));

const jalaliText = (value) => {
  if (!value) return '';
  const jalali = toJalali(value);
  return jalali === '—' ? '' : jalali;
};

/* نگاشت ردیف API ↔ جدول */
const rowFromApi = (item) => ({
  id: item.id,
  name: item.name || '',
  economicCode: item.economic_code || '',
  nationalId: item.national_id || '',
  postalCode: item.postal_code || '',
  city: item.city || '',
  address: item.address || '',
  description: item.goods_service_desc || '',
  amount: item.amount ? String(Number(item.amount)) : '',
  vat: item.vat ? String(Number(item.vat)) : '',
  kind: item.kind || 1,
  invoiceDate: item.invoice_date || '',
  invoiceNo: item.invoice_no || '',
  status: item.moadian_status || 'pending',
});

const rowToApi = (row) => ({
  id: typeof row.id === 'number' ? row.id : null,
  name: row.name || '',
  economic_code: row.economicCode || '',
  national_id: row.nationalId || '',
  postal_code: row.postalCode || '',
  city: row.city || '',
  address: row.address || '',
  goods_service_desc: row.description || '',
  amount: num(row.amount),
  vat: num(row.vat),
  kind: Number(row.kind) || 1,
  invoice_date: row.invoiceDate || null,
  invoice_no: row.invoiceNo || '',
  moadian_status: row.status === 'registered' ? 'registered' : 'pending',
});

/* نگاشت ردیف قدیمی localStorage (بدون شماره اقتصادی/کد پستی) */
const legacyRow = (row) => ({ ...emptyRow(), ...row });

const readJson = (key, fallback) => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || 'null');
    return parsed ?? fallback;
  } catch (error) {
    return fallback;
  }
};
const writeJson = (key, value) => {
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch (error) { /* noop */ }
};

/* اعتبارسنجی محلی (وقتی API سرور در دسترس نیست) — همان قواعد سمت سرور */
const localValidate = (rows, periodStart, periodEnd) => {
  const issues = [];
  const seen = new Map();
  rows.forEach((row, index) => {
    if (isBlankRow(row)) return;
    const lineNo = index + 1;
    const push = (field, level, message) => issues.push({
      row_id: row.id, row_no: lineNo, row_name: row.name, field, level, message,
    });
    if (!row.name) push('name', 'error', 'نام طرف معامله الزامی است.');
    if (!num(row.amount) && !num(row.vat)) push('amount', 'error', 'مبلغ معامله باید بزرگ‌تر از صفر باشد.');
    if (num(row.vat) > num(row.amount)) push('vat', 'error', 'مالیات بر ارزش افزوده از مبلغ معامله بیشتر است.');
    if (!row.economicCode) push('economicCode', 'warning', 'شماره اقتصادی ثبت نشده است.');
    else if (toEnglishDigits(row.economicCode).length !== 11) push('economicCode', 'error', 'شماره اقتصادی باید ۱۱ رقم باشد.');
    if (!row.postalCode) push('postalCode', 'warning', 'کد پستی طرف معامله ثبت نشده است.');
    else if (toEnglishDigits(row.postalCode).length !== 10) push('postalCode', 'error', 'کد پستی باید ۱۰ رقم باشد.');
    if (!row.invoiceNo) push('invoiceNo', 'warning', 'شماره فاکتور وارد نشده است.');
    if (!row.invoiceDate) push('invoiceDate', 'warning', 'تاریخ فاکتور وارد نشده است.');
    else if (periodStart && periodEnd && (row.invoiceDate < periodStart || row.invoiceDate > periodEnd)) {
      push('invoiceDate', 'error', 'تاریخ فاکتور بیرون از بازهٔ این فصل است.');
    }
    if (!row.description) push('description', 'warning', 'شرح کالا یا خدمات وارد نشده است.');
    if (row.status !== 'registered') push('status', 'warning', 'این فاکتور در سامانه مودیان درج نشده است.');
    if (row.invoiceNo) {
      const key = `${normalizeName(row.invoiceNo)}|${row.economicCode}`;
      if (seen.has(key)) push('invoiceNo', 'error', `شماره فاکتور تکراری با ردیف ${toPersianDigits(seen.get(key))} ثبت شده است.`);
      else seen.set(key, lineNo);
    }
  });
  const errors = issues.filter((issue) => issue.level === 'error').length;
  return {
    issues,
    summary: {
      rows: rows.filter((row) => !isBlankRow(row)).length,
      errors,
      warnings: issues.length - errors,
    },
  };
};


/* سلول متنی فشرده برای ورود سریع */
const CellTextField = ({ value, onChange, placeholder, title, sx, ...rest }) => (
  <TextField
    fullWidth
    variant="standard"
    value={value ?? ''}
    onChange={(event) => onChange(event.target.value)}
    placeholder={placeholder}
    title={title}
    sx={{
      '& .MuiInputBase-root': { minHeight: 26 },
      '& .MuiInputBase-input': { py: 0.25, px: 0.25 },
      '& .MuiInput-underline:before': { borderBottomColor: 'transparent' },
      '& .MuiInput-underline:hover:before': { borderBottomColor: 'rgba(148,163,184,0.6)' },
      ...(sx || {}),
    }}
    {...rest}
  />
);

const CellSelect = ({ value, onChange, options, ariaLabel, sx, fontSize }) => (
  <Select
    variant="standard"
    value={value}
    onChange={(event) => onChange(event.target.value)}
    disableUnderline
    inputProps={{ 'aria-label': ariaLabel }}
    sx={{
      width: '100%',
      '& .MuiSelect-select': { py: 0.25, px: 0.25, display: 'flex', justifyContent: 'center' },
      ...(sx || {}),
    }}
  >
    {options.map((option) => (
      <MenuItem key={option.value} value={option.value} sx={{ fontSize: fontSize || undefined }}>
        {option.label}
      </MenuItem>
    ))}
  </Select>
);

/* ورودی کد/شماره با نمایش ارقام فارسی و ذخیرهٔ ارقام لاتین */
const DigitField = ({ value, onChange, placeholder, numeric, maxLength, sx }) => (
  <CellTextField
    value={toPersianDigits(value ?? '')}
    onChange={(raw) => {
      const latin = toEnglishDigits(String(raw ?? ''));
      const cleaned = numeric ? latin.replace(/[^\d]/g, '') : latin;
      onChange(maxLength ? cleaned.slice(0, maxLength) : cleaned);
    }}
    placeholder={placeholder}
    inputProps={{ inputMode: numeric ? 'numeric' : 'text', dir: 'ltr', style: { textAlign: 'center' } }}
    sx={sx}
  />
);

/* تاریخ فاکتور: ورودی شمسی با ارقام فارسی، ذخیرهٔ میلادی برای گزارش */
const DateCell = ({ value, onChange, sx }) => {
  const [text, setText] = useState(value ? toJalali(value) : '');
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) setText(value ? toJalali(value) : '');
  }, [value]);

  const handleChange = (raw) => {
    let latin = toEnglishDigits(String(raw ?? '')).replace(/[^\d/]/g, '');
    if (!latin.includes('/') && latin.length === 8) {
      latin = `${latin.slice(0, 4)}/${latin.slice(4, 6)}/${latin.slice(6)}`;
    }
    setText(toPersianDigits(latin));
    const parts = latin.split('/');
    if (parts.length === 3 && /^\d{4}$/.test(parts[0]) && /^\d{1,2}$/.test(parts[1]) && /^\d{1,2}$/.test(parts[2])) {
      const gregorian = toGregorian(latin);
      if (/^\d{4}-\d{2}-\d{2}$/.test(gregorian)) onChange(gregorian);
    }
  };

  const handleBlur = () => {
    focusedRef.current = false;
    setText(value ? toJalali(value) : '');
  };

  return (
    <CellTextField
      value={text}
      onChange={handleChange}
      onFocus={() => { focusedRef.current = true; }}
      onBlur={handleBlur}
      placeholder={toPersianDigits('1405/01/01')}
      inputProps={{ inputMode: 'numeric', style: { textAlign: 'center' } }}
      sx={sx}
    />
  );
};

/* نقطهٔ رنگی وضعیت سامانهٔ مودیان */
const StatusDot = ({ registered }) => (
  <Box
    component="span"
    role="img"
    data-status={registered ? 'registered' : 'pending'}
    aria-label={registered ? 'درج شده در سامانه مودیان' : 'درج نشده در سامانه مودیان'}
    sx={{
      display: 'inline-block',
      width: 10,
      height: 10,
      borderRadius: '50%',
      bgcolor: registered ? '#16a34a' : '#dc2626',
      boxShadow: registered ? '0 0 0 3px rgba(22,163,74,0.16)' : '0 0 0 3px rgba(220,38,38,0.16)',
    }}
  />
);

const StatusCell = ({ value, onChange, sx, fontSize }) => (
  <Select
    variant="standard"
    value={value}
    onChange={(event) => onChange(event.target.value)}
    disableUnderline
    IconComponent={() => null}
    title={value === 'registered' ? 'درج شده در سامانه مودیان' : 'درج نشده در سامانه مودیان'}
    renderValue={(selected) => (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
        <StatusDot registered={selected === 'registered'} />
      </Box>
    )}
    inputProps={{ 'aria-label': 'وضعیت در سامانه مودیان' }}
    sx={{
      width: '100%',
      '& .MuiSelect-select': { py: 0.4, px: 0, display: 'flex', justifyContent: 'center' },
      ...(sx || {}),
    }}
  >
    {STATUSES.map((option) => (
      <MenuItem key={option.value} value={option.value} sx={{ gap: 1, fontSize: fontSize || undefined }}>
        <StatusDot registered={option.value === 'registered'} />
        {option.label}
      </MenuItem>
    ))}
  </Select>
);


const SeasonalReportPage = () => {
  const moduleTheme = useModuleTheme();
  const [yearKey, setYearKey] = useState(() => readJson(SETTINGS_KEY, {}).yearKey || '');
  const [quarter, setQuarter] = useState(() => readJson(SETTINGS_KEY, {}).quarter || 1);
  const [rows, setRows] = useState([emptyRow()]);
  const [parties] = useState(() => readJson(PARTIES_KEY, []));
  const [loadedKey, setLoadedKey] = useState('');
  const [reportId, setReportId] = useState(null);
  const [mode, setMode] = useState('loading');            // api | local
  const [saveState, setSaveState] = useState('idle');     // idle | saving | saved | error
  const [period, setPeriod] = useState({ start: '', end: '' });
  const [issues, setIssues] = useState([]);
  const [toast, setToast] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [kindFilter, setKindFilter] = useState('all');
  const [sortBy, setSortBy] = useState('entry');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const savedPayloadRef = useRef('');

  const { data: fiscalYears, isFetched: fiscalYearsFetched } = useQuery({
    queryKey: ['fiscal-years-for-seasonal'],
    queryFn: () => axiosInstance.get('/accounting/fiscal-years/').then((response) => response.data),
    staleTime: 10 * 60 * 1000,
    retry: false,
  });
  const years = useMemo(() => {
    const list = Array.isArray(fiscalYears) ? fiscalYears : fiscalYears?.results || [];
    if (!list.length) {
      if (!fiscalYearsFetched) return [];
      const parts = getJalaliParts(new Date().toISOString().slice(0, 10));
      const current = parts ? parts[0] : 1404;
      return [0, -1, -2].map((offset) => ({
        value: `jalali-${current + offset}`,
        label: toPersianDigits(current + offset),
        start: '',
        end: '',
      }));
    }
    return list.map((item) => ({
      value: String(item.id),
      label: toPersianDigits(item.name || item.title || `سال مالی ${item.id}`),
      start: item.start_date || '',
      end: item.end_date || '',
    }));
  }, [fiscalYears, fiscalYearsFetched]);

  /* سال مالی پیش‌فرض: سال جاری شمسی یا نزدیک‌ترین سال باز */
  useEffect(() => {
    if (yearKey || !years.length) return;
    const jalaliParts = getJalaliParts(new Date().toISOString().slice(0, 10));
    const jalaliYear = jalaliParts ? toPersianDigits(jalaliParts[0]) : '';
    const today = new Date().toISOString().slice(0, 10);
    const current = (jalaliYear ? years.find((item) => String(item.label).includes(jalaliYear)) : null)
      || years.find((item) => item.end && String(item.end) >= today)
      || years[0];
    setYearKey(current?.value || '');
  }, [years, yearKey]);

  useEffect(() => {
    writeJson(SETTINGS_KEY, { yearKey, quarter });
  }, [yearKey, quarter]);

  /* بارگذاری گزارش دوره: از سرور، و در نبود سرور از حافظهٔ محلی */
  useEffect(() => {
    if (!yearKey) { setRows([emptyRow()]); setLoadedKey(''); return undefined; }
    const key = `${yearKey}|${quarter}`;
    let cancelled = false;
    setMode('loading');
    setIssues([]);

    const fallbackToLocal = () => {
      if (cancelled) return;
      const saved = readJson(ROWS_KEY(yearKey, quarter), []);
      const list = (Array.isArray(saved) ? saved.map(legacyRow) : []);
      while (list.length && isBlankRow(list[list.length - 1])) list.pop();
      setRows([...list, emptyRow()]);
      setReportId(null);
      setMode('local');
      setLoadedKey(key);
      setPeriod({ start: '', end: '' });
    };

    axiosInstance.get(`${API_BASE}/current/`, { params: { fiscal_year: yearKey, quarter } })
      .then(({ data }) => {
        if (cancelled) return;
        setReportId(data.id);
        setPeriod({ start: data.period_start || '', end: data.period_end || '' });
        const serverRows = (data.transactions || []).map(rowFromApi);
        if (!serverRows.length) {
          /* مهاجرت یک‌بارهٔ ردیف‌های محلی به سرور */
          const legacy = readJson(ROWS_KEY(yearKey, quarter), []);
          const migrated = (Array.isArray(legacy) ? legacy.map(legacyRow) : [])
            .filter((row) => !isBlankRow(row));
          if (migrated.length) {
            setRows([...migrated, emptyRow()]);
            setMode('api');
            setLoadedKey(key);
            savedPayloadRef.current = '';
            return;
          }
        }
        setRows([...serverRows, emptyRow()]);
        setMode('api');
        setLoadedKey(key);
        savedPayloadRef.current = JSON.stringify((data.transactions || []).map(rowToApi));
      })
      .catch(fallbackToLocal);

    return () => { cancelled = true; };
  }, [yearKey, quarter]);


  /* ذخیرهٔ خودکار: سرور (با debounce) یا حافظهٔ محلی */
  const filledForSave = useMemo(() => rows.filter((row) => !isBlankRow(row)), [rows]);
  useEffect(() => {
    if (!yearKey || loadedKey !== `${yearKey}|${quarter}` || mode === 'loading') return undefined;
    writeJson(ROWS_KEY(yearKey, quarter), rows);

    if (mode !== 'api' || !reportId) {
      setSaveState('saved');
      return undefined;
    }

    const payload = filledForSave.map(rowToApi);
    const serialized = JSON.stringify(payload);
    if (serialized === savedPayloadRef.current) return undefined;

    setSaveState('saving');
    const timer = window.setTimeout(() => {
      axiosInstance.post(`${API_BASE}/${reportId}/rows/`, { rows: payload })
        .then(({ data }) => {
          savedPayloadRef.current = JSON.stringify((data.transactions || []).map(rowToApi));
          setSaveState('saved');
          const serverRows = (data.transactions || []).map(rowFromApi);
          setRows((previous) => {
            /* شناسه‌های سرور را جایگزین می‌کنیم تا ذخیره‌های بعدی «ویرایش» شوند */
            const tail = previous.filter((row) => isBlankRow(row)).slice(-1);
            if (serverRows.length !== previous.filter((row) => !isBlankRow(row)).length) return previous;
            return [...serverRows, ...(tail.length ? tail : [emptyRow()])];
          });
        })
        .catch(() => {
          setSaveState('error');
          setToast('ذخیره در سرور انجام نشد؛ نسخهٔ محلی نگه داشته شد.');
        });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [rows, yearKey, quarter, loadedKey, mode, reportId, filledForSave]);

  /* ردیف بعدی همیشه خودکار ساخته می‌شود */
  useEffect(() => {
    setRows((previous) => (
      previous.length && !isBlankRow(previous[previous.length - 1])
        ? [...previous, emptyRow()]
        : previous
    ));
  }, [rows]);

  const updateCell = (id, field, value) => {
    setRows((previous) => previous.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  /* انتخاب طرف معامله از پیشنهادها: شماره اقتصادی/شناسه ملی/کد پستی/شهر/آدرس پر می‌شود */
  const applyParty = (id, party) => {
    setRows((previous) => previous.map((row) => (row.id === id ? {
      ...row,
      name: party.name,
      economicCode: row.economicCode || party.economicCode || '',
      nationalId: row.nationalId || party.nationalId || '',
      postalCode: row.postalCode || party.postalCode || '',
      city: row.city || party.city || '',
      address: row.address || party.address || '',
    } : row)));
  };

  const removeRow = (id) => setRows((previous) => previous.filter((row) => row.id !== id));

  const duplicateRow = (id) => {
    setRows((previous) => {
      const index = previous.findIndex((row) => row.id === id);
      if (index === -1) return previous;
      const copy = { ...previous[index], id: emptyRow().id, invoiceNo: '' };
      return [...previous.slice(0, index + 1), copy, ...previous.slice(index + 1)];
    });
    setToast('ردیف کپی شد — شماره فاکتور را وارد کنید');
  };


  /* ردیف‌های دارای داده و نگاشت شمارهٔ پایدار ردیف */
  const filledRows = useMemo(() => rows.filter((row) => !isBlankRow(row)), [rows]);
  const indexById = useMemo(() => {
    const map = new Map();
    filledRows.forEach((row, index) => map.set(row.id, index));
    return map;
  }, [filledRows]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = filledRows;
    if (term) {
      list = list.filter((row) => [
        row.name, row.city, row.address, row.nationalId, row.economicCode,
        row.description, row.invoiceNo,
      ].some((value) => String(value ?? '').toLowerCase().includes(term)));
    }
    if (statusFilter !== 'all') list = list.filter((row) => row.status === statusFilter);
    if (kindFilter !== 'all') list = list.filter((row) => String(row.kind) === String(kindFilter));
    const sorted = [...list];
    if (sortBy === 'amount') sorted.sort((a, b) => num(b.amount) - num(a.amount));
    else if (sortBy === 'total') sorted.sort((a, b) => totalOf(b) - totalOf(a));
    else if (sortBy === 'name') sorted.sort((a, b) => String(a.name).localeCompare(String(b.name), 'fa'));
    else sorted.sort((a, b) => (indexById.get(a.id) ?? 0) - (indexById.get(b.id) ?? 0));
    return sorted;
  }, [filledRows, search, statusFilter, kindFilter, sortBy, indexById]);

  const editingLive = !search.trim() && statusFilter === 'all' && kindFilter === 'all' && sortBy === 'entry';
  const displayRows = useMemo(() => {
    if (!editingLive) return filteredRows;
    const tail = rows[rows.length - 1];
    return tail && isBlankRow(tail) ? [...filteredRows, tail] : filteredRows;
  }, [editingLive, filteredRows, rows]);

  const activeFilterCount = (statusFilter !== 'all' ? 1 : 0) + (kindFilter !== 'all' ? 1 : 0);
  const statusLabelOf = (value) => (value === 'registered' ? 'درج شده' : 'درج نشده');
  const activeChips = [
    ...(statusFilter !== 'all'
      ? [{ key: 'status', label: `وضعیت: ${statusLabelOf(statusFilter)}`, clear: () => setStatusFilter('all') }]
      : []),
    ...(kindFilter !== 'all'
      ? [{ key: 'kind', label: `نوع: ${toPersianDigits(kindFilter)}`, clear: () => setKindFilter('all') }]
      : []),
  ];
  const filterOptions = [
    { label: 'وضعیت سامانه', value: statusFilter, onChange: setStatusFilter, options: [
      { value: 'all', label: `همه (${toPersianDigits(filledRows.length)})` },
      { value: 'registered', label: `درج شده (${toPersianDigits(filledRows.filter((row) => row.status === 'registered').length)})` },
      { value: 'pending', label: `درج نشده (${toPersianDigits(filledRows.filter((row) => row.status !== 'registered').length)})` },
    ] },
    { label: 'نوع', value: kindFilter, onChange: setKindFilter, options: [
      { value: 'all', label: 'همه' },
      ...KINDS.map((kind) => ({ value: String(kind), label: `نوع ${toPersianDigits(kind)}` })),
    ] },
  ];

  const totals = useMemo(() => filledRows.reduce((acc, row) => ({
    amount: acc.amount + num(row.amount),
    vat: acc.vat + num(row.vat),
    total: acc.total + totalOf(row),
    registered: acc.registered + (row.status === 'registered' ? 1 : 0),
  }), { amount: 0, vat: 0, total: 0, registered: 0 }), [filledRows]);

  const issuesByRow = useMemo(() => {
    const map = new Map();
    issues.forEach((issue) => {
      const key = String(issue.row_id);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(issue);
    });
    return map;
  }, [issues]);
  const errorCount = issues.filter((issue) => issue.level === 'error').length;
  const warningCount = issues.length - errorCount;
  const issuesForRow = (row) => issuesByRow.get(String(row.id)) || [];
  const rowHasError = (row) => issuesForRow(row).some((issue) => issue.level === 'error');

  const pageSize = moduleTheme.tableTheme.rowsPerPage;
  const { ref: tableRef, rowHeight, tableHeight } = useRowHeight(
    moduleTheme.tableTheme, Math.min(displayRows.length || 8, pageSize),
  );
  const yearLabel = years.find((item) => item.value === String(yearKey))?.label || 'سال مالی';
  const quarterLabel = QUARTERS.find((item) => item.value === quarter)?.label || '';

  const cellFontPx = moduleTheme.tableTheme.cell.fontSize;
  const cellInputSx = useMemo(() => {
    const size = `${cellFontPx}px`;
    return {
      '& .MuiInputBase-root': { fontSize: size, minHeight: 26 },
      '& .MuiInputBase-input': { fontSize: size, py: 0.25, px: 0.25 },
      '& .MuiSelect-select': { fontSize: size, py: 0.25, px: 0.25 },
      '& .MuiInput-underline:before': { borderBottomColor: 'transparent' },
    };
  }, [cellFontPx]);


  /* اعتبارسنجی: سرور (رسمی) یا محلی */
  const runValidation = () => {
    if (mode === 'api' && reportId) {
      setSaveState('saving');
      axiosInstance.post(`${API_BASE}/${reportId}/validate/`)
        .then(({ data }) => {
          setIssues(data.issues || []);
          const summary = data.summary || {};
          setToast(
            summary.errors
              ? `${toPersianDigits(summary.errors)} خطا و ${toPersianDigits(summary.warnings || 0)} هشدار یافت شد`
              : `بدون خطا — ${toPersianDigits(summary.warnings || 0)} هشدار`,
          );
        })
        .catch(() => setToast('اعتبارسنجی سرور انجام نشد؛ اعتبارسنجی محلی اجرا شد.'))
        .finally(() => setSaveState('idle'));
      return;
    }
    const result = localValidate(filledRows, period.start, period.end);
    setIssues(result.issues);
    setToast(
      result.summary.errors
        ? `${toPersianDigits(result.summary.errors)} خطا و ${toPersianDigits(result.summary.warnings)} هشدار یافت شد`
        : `بدون خطا — ${toPersianDigits(result.summary.warnings)} هشدار`,
    );
  };

  /* خروجی اکسل: از سرور (سه‌شیتی رسمی) یا تولید محلی */
  const exportExcel = () => {
    if (mode === 'api' && reportId) {
      axiosInstance.get(`${API_BASE}/${reportId}/export/`, { responseType: 'blob' })
        .then((response) => {
          const blob = new Blob([response.data], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = `seasonal-${yearKey || 'year'}-q${quarter}.xlsx`;
          document.body.appendChild(link);
          link.click();
          link.remove();
          URL.revokeObjectURL(link.href);
          setToast('فایل اکسل رسمی ساخته شد');
        })
        .catch(() => setToast('خروجی سرور در دسترس نیست.'));
      return;
    }

    const headers = [
      'ردیف', 'شماره اقتصادی طرف معامله', 'شناسه ملی / کد ملی', 'نام و نام خانوادگی / نام شرکت',
      'کد پستی', 'شهر', 'آدرس', 'شرح کالا / خدمات', 'مبلغ (ریال)',
      'مالیات بر ارزش افزوده', 'جمع کل', 'نوع معامله', 'تاریخ فاکتور', 'شماره فاکتور',
      'وضعیت سامانه مودیان',
    ];
    const escape = (value) => String(value ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const body = filledRows.map((row, index) => `
      <tr>
        <td>${index + 1}</td>
        <td style="mso-number-format:'\\@'">${escape(row.economicCode)}</td>
        <td style="mso-number-format:'\\@'">${escape(row.nationalId)}</td>
        <td>${escape(row.name)}</td>
        <td style="mso-number-format:'\\@'">${escape(row.postalCode)}</td>
        <td>${escape(row.city)}</td>
        <td>${escape(row.address)}</td>
        <td>${escape(row.description)}</td>
        <td>${num(row.amount)}</td>
        <td>${num(row.vat)}</td>
        <td>${totalOf(row)}</td>
        <td>${escape(row.kind)}</td>
        <td style="mso-number-format:'\\@'">${escape(jalaliText(row.invoiceDate))}</td>
        <td style="mso-number-format:'\\@'">${escape(row.invoiceNo)}</td>
        <td>${row.status === 'registered' ? 'درج‌شده در سامانه' : 'درج‌نشده'}</td>
      </tr>`).join('');
    const html = `<html dir="rtl"><head><meta charset="utf-8" />
      <style>table{border-collapse:collapse;font-family:Tahoma}td,th{border:1px solid #999;padding:4px;font-size:11px}
      th{background:#f1f5f9}</style></head><body>
      <h3>صورت معاملات فصلی — ${escape(yearLabel)} — ${escape(quarterLabel)}</h3>
      <table><thead><tr>${headers.map((header) => `<th>${header}</th>`).join('')}</tr></thead>
      <tbody>${body}</tbody>
      <tfoot><tr><td colspan="8">جمع کل</td><td>${totals.amount}</td><td>${totals.vat}</td>
      <td>${totals.total}</td><td colspan="4"></td></tr></tfoot></table></body></html>`;
    const blob = new Blob([`\uFEFF${html}`], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `seasonal-transactions-${yearKey || 'year'}-q${quarter}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
    setToast('فایل اکسل ساخته شد');
  };

  /* چاپ / PDF مرورگر */
  const printReport = () => {
    const printable = typeof window.open === 'function' ? window.open('', '_blank') : null;
    if (!printable) { setToast('امکان باز کردن پنجرهٔ چاپ نیست.'); return; }
    const rowsHtml = filledRows.map((row, index) => `
      <tr>
        <td>${toPersianDigits(index + 1)}</td>
        <td>${row.name}</td>
        <td>${toPersianDigits(row.economicCode)}</td>
        <td>${toPersianDigits(row.nationalId)}</td>
        <td>${row.city}</td>
        <td>${row.description}</td>
        <td>${formatPersianNumber(num(row.amount))}</td>
        <td>${formatPersianNumber(num(row.vat))}</td>
        <td>${formatPersianNumber(totalOf(row))}</td>
        <td>${jalaliText(row.invoiceDate)}</td>
        <td>${row.invoiceNo}</td>
      </tr>`).join('');
    printable.document.write(`<html dir="rtl" lang="fa"><head><meta charset="utf-8" />
      <title>صورت معاملات فصلی</title>
      <style>body{font-family:Tahoma;padding:16px}table{width:100%;border-collapse:collapse}
      th,td{border:1px solid #888;padding:4px;font-size:11px;text-align:center}
      h3{margin:0 0 6px}</style></head><body>
      <h3>صورت معاملات فصلی — ${yearLabel} — ${quarterLabel}</h3>
      <table><thead><tr><th>ردیف</th><th>طرف معامله</th><th>شماره اقتصادی</th><th>شناسه/کد ملی</th>
      <th>شهر</th><th>شرح کالا/خدمات</th><th>مبلغ</th><th>مالیات</th><th>جمع کل</th>
      <th>تاریخ</th><th>شماره فاکتور</th></tr></thead><tbody>${rowsHtml}</tbody></table></body></html>`);
    printable.document.close();
    printable.focus();
    printable.print();
  };


  /* دفتر طرف‌های معامله: همهٔ ردیف‌های همین جدول + طرف‌های دوره‌های قبلی */
  const partyDirectory = useMemo(() => {
    const map = new Map();
    rows.forEach((row) => {
      const key = normalizeName(row.name).toLowerCase();
      if (!key) return;
      const previous = map.get(key);
      map.set(key, {
        name: normalizeName(row.name),
        economicCode: row.economicCode || previous?.economicCode || '',
        nationalId: row.nationalId || previous?.nationalId || '',
        postalCode: row.postalCode || previous?.postalCode || '',
        city: row.city || previous?.city || '',
        address: row.address || previous?.address || '',
      });
    });
    parties.forEach((party) => {
      const key = normalizeName(party.name).toLowerCase();
      if (!key) return;
      const previous = map.get(key) || {};
      map.set(key, {
        name: normalizeName(party.name),
        economicCode: previous.economicCode || party.economicCode || '',
        nationalId: previous.nationalId || party.nationalId || '',
        postalCode: previous.postalCode || party.postalCode || '',
        city: previous.city || party.city || '',
        address: previous.address || party.address || '',
      });
    });
    return [...map.values()];
  }, [rows, parties]);

  const partyOptions = useMemo(() => {
    const cleaned = partyDirectory
      .map((party) => ({ ...party, name: normalizeName(party.name) }))
      .filter((party) => party.name.length >= 3);
    const names = cleaned.map((party) => party.name.toLowerCase());
    return cleaned.filter((party, index) => !names.some((other, otherIndex) => (
      otherIndex !== index && other.length > names[index].length && other.startsWith(names[index])
    )));
  }, [partyDirectory]);

  const filterParties = (options, currentName) => {
    const term = normalizeName(currentName).toLowerCase();
    const candidates = options.filter((party) => normalizeName(party.name).toLowerCase() !== term);
    if (!term) return candidates.slice(-6).reverse();
    const scored = [];
    candidates.forEach((party) => {
      const name = normalizeName(party.name).toLowerCase();
      if (name.startsWith(term)) scored.push({ party, score: 0 });
      else if (name.split(/\s+/).some((word) => word.startsWith(term))) scored.push({ party, score: 1 });
      else if (name.includes(term)) scored.push({ party, score: 2 });
    });
    return scored.sort((a, b) => a.score - b.score).slice(0, 6).map((item) => item.party);
  };

  const partyOptionsJson = useMemo(() => JSON.stringify(partyOptions), [partyOptions]);
  useEffect(() => {
    writeJson(PARTIES_KEY, JSON.parse(partyOptionsJson));
  }, [partyOptionsJson]);


  const tableColumns = [
    {
      key: 'row',
      label: 'ردیف',
      width: '5%',
      align: 'center',
      render: (row) => {
        const rowIssues = issuesForRow(row);
        const hasError = rowIssues.some((issue) => issue.level === 'error');
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.4 }}>
            <Typography noWrap sx={{ color: MUTED }}>{toPersianDigits((indexById.get(row.id) ?? 0) + 1)}</Typography>
            {rowIssues.length ? (
              <Tooltip title={rowIssues.map((issue) => issue.message).join(' • ')}>
                <WarningAmberRoundedIcon sx={{ fontSize: 14, color: hasError ? '#dc2626' : '#d97706' }} />
              </Tooltip>
            ) : null}
          </Box>
        );
      },
    },
    {
      key: 'name',
      label: 'نام و نام خانوادگی / نام شرکت',
      width: '14%',
      render: (row) => (
        <Autocomplete
          freeSolo
          size="small"
          options={partyOptions}
          filterOptions={(options) => filterParties(options, row.name)}
          getOptionLabel={(option) => (typeof option === 'string' ? option : option.name || '')}
          inputValue={row.name}
          value={row.name}
          onInputChange={(_event, value) => updateCell(row.id, 'name', value)}
          onChange={(_event, value) => {
            if (value && typeof value !== 'string') applyParty(row.id, value);
          }}
          noOptionsText="طرف معاملهٔ جدید — با ادامهٔ تایپ ثبت می‌شود"
          renderOption={(props, option) => (
            <Box component="li" {...props} key={option.name} sx={{ gap: 1 }}>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography noWrap sx={{ fontSize: `${cellFontPx}px`, fontWeight: 800 }}>
                  {`${option.name} را می‌خواهی؟`}
                </Typography>
                <Typography noWrap sx={{ fontSize: `${Math.max(10, cellFontPx - 1.5)}px`, color: 'text.secondary' }}>
                  {[option.city, option.address].filter(Boolean).join(' · ') || 'بدون آدرس ثبت‌شده'}
                </Typography>
              </Box>
            </Box>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              variant="standard"
              placeholder="نام طرف معامله…"
              inputProps={{ ...params.inputProps, 'aria-label': 'نام طرف معامله' }}
              sx={cellInputSx}
            />
          )}
        />
      ),
    },
    {
      key: 'economicCode',
      label: 'شماره اقتصادی',
      width: '8%',
      align: 'center',
      render: (row) => (
        <DigitField value={row.economicCode} onChange={(value) => updateCell(row.id, 'economicCode', value)}
          placeholder="۱۱ رقمی" numeric maxLength={11} sx={cellInputSx} />
      ),
    },
    {
      key: 'nationalId',
      label: 'شناسه ملی',
      width: '8%',
      align: 'center',
      render: (row) => (
        <DigitField value={row.nationalId} onChange={(value) => updateCell(row.id, 'nationalId', value)}
          placeholder="شناسه ملی" numeric maxLength={11} sx={cellInputSx} />
      ),
    },
    {
      key: 'postalCode',
      label: 'کد پستی',
      width: '6%',
      align: 'center',
      render: (row) => (
        <DigitField value={row.postalCode} onChange={(value) => updateCell(row.id, 'postalCode', value)}
          placeholder="۱۰ رقمی" numeric maxLength={10} sx={cellInputSx} />
      ),
    },
    {
      key: 'city',
      label: 'شهر',
      width: '7%',
      render: (row) => (
        <CellTextField value={row.city} onChange={(value) => updateCell(row.id, 'city', value)}
          placeholder="شهر" sx={cellInputSx} />
      ),
    },
    {
      key: 'address',
      label: 'آدرس',
      width: '12%',
      render: (row) => (
        <CellTextField value={row.address} onChange={(value) => updateCell(row.id, 'address', value)}
          placeholder="آدرس" sx={cellInputSx} />
      ),
    },
    {
      key: 'description',
      label: 'شرح کالا / خدمات',
      width: '12%',
      render: (row) => (
        <CellTextField value={row.description} onChange={(value) => updateCell(row.id, 'description', value)}
          placeholder="شرح کالا یا خدمات" sx={cellInputSx} />
      ),
    },
    {
      key: 'amount',
      label: 'مبلغ',
      width: '9%',
      align: 'center',
      render: (row) => (
        <MoneyInput
          variant="standard"
          allowDecimals={false}
          value={row.amount}
          onChange={(value) => updateCell(row.id, 'amount', value)}
          placeholder="مبلغ"
          inputProps={{ 'aria-label': 'مبلغ', style: { textAlign: 'center' } }}
          sx={cellInputSx}
        />
      ),
    },
    {
      key: 'vat',
      label: 'مالیات بر ارزش افزوده',
      width: '8%',
      align: 'center',
      render: (row) => (
        <MoneyInput
          variant="standard"
          allowDecimals={false}
          value={row.vat}
          onChange={(value) => updateCell(row.id, 'vat', value)}
          placeholder="ارزش افزوده"
          inputProps={{ 'aria-label': 'مالیات بر ارزش افزوده', style: { textAlign: 'center' } }}
          sx={cellInputSx}
        />
      ),
    },
    {
      key: 'total',
      label: 'جمع کل',
      width: '8%',
      align: 'center',
      render: (row) => (
        <Typography noWrap>{formatPersianNumber(totalOf(row))}</Typography>
      ),
    },
    {
      key: 'kind',
      label: 'نوع',
      width: '5%',
      align: 'center',
      render: (row) => (
        <CellSelect
          value={row.kind}
          onChange={(value) => updateCell(row.id, 'kind', value)}
          ariaLabel="نوع معامله"
          options={KINDS.map((kind) => ({ value: kind, label: toPersianDigits(kind) }))}
          sx={cellInputSx}
          fontSize={cellFontPx}
        />
      ),
    },
    {
      key: 'invoiceDate',
      label: 'تاریخ فاکتور',
      width: '8%',
      align: 'center',
      render: (row) => (
        <DateCell
          value={row.invoiceDate}
          onChange={(value) => updateCell(row.id, 'invoiceDate', value)}
          sx={cellInputSx}
        />
      ),
    },
    {
      key: 'invoiceNo',
      label: 'شماره فاکتور',
      width: '7%',
      align: 'center',
      render: (row) => (
        <DigitField value={row.invoiceNo} onChange={(value) => updateCell(row.id, 'invoiceNo', value)}
          placeholder="شماره" sx={cellInputSx} />
      ),
    },
    {
      key: 'status',
      label: 'وضعیت',
      width: '5%',
      align: 'center',
      render: (row) => (
        <StatusCell
          value={row.status}
          onChange={(value) => updateCell(row.id, 'status', value)}
          sx={cellInputSx}
          fontSize={cellFontPx}
        />
      ),
    },
    {
      key: 'actions',
      label: 'عملیات',
      width: '6%',
      align: 'center',
      render: (row) => (
        <Stack direction="row" spacing={0.25} justifyContent="center" alignItems="center">
          <Tooltip title="کپی ردیف (برای فاکتور بعدی همان طرف معامله)">
            <IconButton size="small" aria-label="کپی ردیف" onClick={() => duplicateRow(row.id)} sx={{ p: 0.25 }}>
              <ContentCopyIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="حذف ردیف">
            <IconButton size="small" aria-label="حذف ردیف" color="error" onClick={() => removeRow(row.id)} sx={{ p: 0.25 }}>
              <DeleteOutlineIcon sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];


  return (
    <>
      <PageHeader
        icon={<CalendarViewMonthIcon sx={{ fontSize: 26 }} />}
        title="صورت معاملات فصلی (ورود دستی)"
        subtitle="ماده ۱۶۹ مکرر — ثبت، اعتبارسنجی و خروجی رسمی معاملات هر فصل"
        color="#d97706"
        actions={(
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Button variant="outlined" size="small" startIcon={<RuleOutlinedIcon />} onClick={runValidation}>
              اعتبارسنجی
            </Button>
            <Button variant="outlined" size="small" startIcon={<PrintIcon />} onClick={printReport}>
              چاپ
            </Button>
            <Button variant="contained" size="small" startIcon={<DownloadIcon />} onClick={exportExcel}>
              خروجی اکسل
            </Button>
          </Stack>
        )}
      />

      <Paper
        elevation={0}
        sx={{
          mb: 1.5,
          px: moduleTheme.cardPadX,
          py: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          flexWrap: 'wrap',
          bgcolor: 'background.paper',
          border: `1px solid ${moduleTheme.cardBorderColor}`,
          borderRadius: 'var(--hrms-card-radius, 14px)',
        }}
      >
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel id="seasonal-year-label">سال مالی</InputLabel>
          <Select
            labelId="seasonal-year-label"
            label="سال مالی"
            value={yearKey}
            onChange={(event) => setYearKey(event.target.value)}
            sx={{ fontSize: 12.5, borderRadius: '8px' }}
          >
            {years.length ? years.map((item) => (
              <MenuItem key={item.value} value={item.value} sx={{ fontSize: 12.5 }}>
                {item.label}
              </MenuItem>
            )) : (
              <MenuItem value="" sx={{ fontSize: 12.5 }}>سال مالی موجود نیست</MenuItem>
            )}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 210 }}>
          <InputLabel id="seasonal-quarter-label">فصل</InputLabel>
          <Select
            labelId="seasonal-quarter-label"
            label="فصل"
            value={quarter}
            onChange={(event) => setQuarter(Number(event.target.value))}
            sx={{ fontSize: 12.5, borderRadius: '8px' }}
          >
            {QUARTERS.map((item) => (
              <MenuItem key={item.value} value={item.value} sx={{ fontSize: 12.5 }}>
                {item.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
          {period.start && period.end
            ? `بازهٔ فصل: ${jalaliText(period.start)} تا ${jalaliText(period.end)}`
            : mode === 'local'
              ? 'حالت محلی (سرور در دسترس نیست) — داده‌ها در همین مرورگر ذخیره می‌شوند'
              : 'در حال دریافت بازهٔ فصل…'}
        </Typography>

        <Box sx={{ flex: 1 }} />

        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
          {saveState === 'saving' ? 'در حال ذخیره…' : null}
          {saveState === 'saved' ? (mode === 'api' ? 'ذخیره شد' : 'ذخیرهٔ محلی') : null}
          {saveState === 'error' ? 'ذخیره در سرور ناموفق بود' : null}
        </Typography>
      </Paper>

      <ModuleToolbar
        theme={moduleTheme}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="جستجو در نام طرف معامله، شماره اقتصادی، شناسه ملی، شهر، آدرس، شرح کالا و شماره فاکتور…"
        sort={sortBy}
        sortOptions={[
          { value: 'entry', label: 'ترتیب ورود' },
          { value: 'amount', label: 'بیشترین مبلغ' },
          { value: 'total', label: 'بیشترین جمع کل' },
          { value: 'name', label: 'نام (الفبا)' },
        ]}
        onSort={setSortBy}
        filters={filterOptions}
        activeChips={activeChips}
        activeFilterCount={activeFilterCount}
        onReset={() => { setSearch(''); setStatusFilter('all'); setKindFilter('all'); setSortBy('entry'); }}
        filtersOpen={filtersOpen}
        setFiltersOpen={setFiltersOpen}
      />


      <Paper
        elevation={0}
        sx={{
          bgcolor: 'background.paper',
          border: `1px solid ${moduleTheme.cardBorderColor}`,
          borderRadius: 'var(--hrms-card-radius, 14px)',
          overflow: 'hidden',
        }}
      >
        <Box>
          <ModuleTable
            tableTheme={moduleTheme.tableTheme}
            columns={tableColumns}
            rows={displayRows}
            rowKey={(row) => row.id}
            containerRef={tableRef}
            tableHeight={displayRows.length ? tableHeight : 210}
            rowHeight={rowHeight}
            emptyText="ردیفی با این مشخصات پیدا نشد."
            ariaLabel="جدول معاملات فصلی"
          />
        </Box>

        <Box
          sx={{
            px: moduleTheme.cardPadX,
            py: 0.9,
            display: 'flex',
            alignItems: 'center',
            gap: 2.5,
            flexWrap: 'wrap',
            borderTop: '1px solid',
            borderColor: 'var(--hrms-table-border-color, #e8edf4)',
          }}
        >
          <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
            {'تعداد ردیف: '}
            <Box component="span" sx={{ fontWeight: 800, color: 'text.primary' }}>{toPersianDigits(filledRows.length)}</Box>
          </Typography>
          <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
            {'جمع مبلغ: '}
            <Box component="span" sx={{ fontWeight: 800, color: 'text.primary' }}>{formatPersianNumber(totals.amount)}</Box>
          </Typography>
          <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
            {'جمع ارزش افزوده: '}
            <Box component="span" sx={{ fontWeight: 800, color: 'text.primary' }}>{formatPersianNumber(totals.vat)}</Box>
          </Typography>
          <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
            {'جمع کل: '}
            <Box component="span" sx={{ fontWeight: 900, color: 'text.primary' }}>{formatPersianNumber(totals.total)}</Box>
          </Typography>
          <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
            {'درج‌شده در سامانه: '}
            <Box component="span" sx={{ fontWeight: 800, color: 'text.primary' }}>
              {`${toPersianDigits(totals.registered)} از ${toPersianDigits(filledRows.length)}`}
            </Box>
          </Typography>
          <Typography sx={{ fontSize: 11.5, color: 'text.secondary', ml: 'auto' }}>
            {'اعتبارسنجی: '}
            <Box component="span" sx={{ fontWeight: 800, color: errorCount ? '#dc2626' : (warningCount ? '#d97706' : 'text.primary') }}>
              {errorCount || warningCount
                ? `${toPersianDigits(errorCount)} خطا / ${toPersianDigits(warningCount)} هشدار`
                : 'بدون خطا'}
            </Box>
          </Typography>
        </Box>
      </Paper>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={2600}
        onClose={() => setToast('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={errorCount ? 'warning' : 'success'} variant="filled" onClose={() => setToast('')} sx={{ fontSize: 12 }}>
          {toast}
        </Alert>
      </Snackbar>
    </>
  );
};

export default SeasonalReportPage;

