import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Autocomplete, Box, Button, FormControl, IconButton, InputLabel,
  MenuItem, Paper, Select, Snackbar, Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CalendarViewMonthIcon from '@mui/icons-material/CalendarViewMonth';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PercentIcon from '@mui/icons-material/Percent';
import DownloadIcon from '@mui/icons-material/Download';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../../../core/api/axiosConfig';
import PageHeader from '../../../core/components/ui/PageHeader';
import MoneyInput from '../../../core/components/ui/MoneyInput';
import JalaliDatePicker from '../../../core/components/ui/JalaliDatePicker';
import { MUTED } from '../../accounting/AccountingDashboardUI';
import { formatPersianNumber, toEnglishDigits, toPersianDigits } from '../../../core/utils/numberUtils';
import { toJalali, getJalaliParts } from '../../../core/utils/dateUtils';
import {
  ModuleTable, useModuleTheme, useRowHeight,
} from '../../contracts/contractModuleUi';

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
  name: '', city: '', address: '', nationalId: '', description: '',
  amount: '', vat: '', kind: 1, invoiceDate: '', invoiceNo: '', status: 'pending',
});

const num = (value) => Number(toEnglishDigits(String(value ?? '')).replace(/[^\d.-]/g, '')) || 0;
const totalOf = (row) => num(row.amount) + num(row.vat);
const normalizeName = (value) => String(value || '').trim().replace(/\s+/g, ' ');
/* تاریخ شمسی برای خروجی اکسل (ارقام لاتین تا Excel ستون تاریخ را درست بخواند) */
const jalaliLatin = (value) => {
  if (!value) return '';
  const jalali = toJalali(value);
  return jalali === '—' ? '' : toEnglishDigits(jalali);
};

/* استایل فشردهٔ سلول‌های مبلغ (ورود سریع، بدون فریم) */
const compactMoneySx = {
  '& .MuiInputBase-root': { fontSize: 11.5, minHeight: 26 },
  '& .MuiInputBase-input': { py: 0.25, px: 0.25, textAlign: 'center' },
  '& .MuiInput-underline:before': { borderBottomColor: 'transparent' },
};

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

/* سلول متنی فشرده برای ورود سریع */
const CellTextField = ({ value, onChange, placeholder, title, ...rest }) => (
  <TextField
    fullWidth
    variant="standard"
    value={value ?? ''}
    onChange={(event) => onChange(event.target.value)}
    placeholder={placeholder}
    title={title}
    InputProps={{ disableUnderline: false }}
    sx={{
      '& .MuiInputBase-root': { fontSize: 11.5, minHeight: 26 },
      '& .MuiInputBase-input': { py: 0.25, px: 0.25 },
      '& .MuiInput-underline:before': { borderBottomColor: 'transparent' },
      '& .MuiInput-underline:hover:before': { borderBottomColor: 'rgba(148,163,184,0.6)' },
    }}
    {...rest}
  />
);

const CellSelect = ({ value, onChange, options, ariaLabel }) => (
  <Select
    variant="standard"
    value={value}
    onChange={(event) => onChange(event.target.value)}
    disableUnderline
    inputProps={{ 'aria-label': ariaLabel }}
    sx={{
      width: '100%', fontSize: 11,
      '& .MuiSelect-select': { py: 0.25, px: 0.25, fontSize: 11 },
    }}
  >
    {options.map((option) => (
      <MenuItem key={option.value} value={option.value} sx={{ fontSize: 11.5 }}>
        {option.label}
      </MenuItem>
    ))}
  </Select>
);

const SeasonalReportPage = () => {
  const moduleTheme = useModuleTheme();
  const [yearKey, setYearKey] = useState(() => readJson(SETTINGS_KEY, {}).yearKey || '');
  const [quarter, setQuarter] = useState(() => readJson(SETTINGS_KEY, {}).quarter || 1);
  const [rows, setRows] = useState([]);
  const [parties, setParties] = useState(() => readJson(PARTIES_KEY, []));
  const [loadedKey, setLoadedKey] = useState('');
  const [toast, setToast] = useState('');
  const tableTopRef = useRef(null);

  const { data: fiscalYears, isFetched: fiscalYearsFetched } = useQuery({
    queryKey: ['fiscal-years-for-seasonal'],
    queryFn: () => axiosInstance.get('/accounting/fiscal-years/').then((response) => response.data),
    staleTime: 10 * 60 * 1000,
    retry: false,
  });
  const years = useMemo(() => {
    const list = Array.isArray(fiscalYears) ? fiscalYears : fiscalYears?.results || [];
    if (!list.length) {
      /* تا رسیدن پاسخ API صبر می‌کنیم؛ فقط در نبود سال مالی، گزینهٔ دستی می‌سازیم */
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
      label: item.name || item.title || `سال مالی ${item.id}`,
      start: item.start_date || '',
      end: item.end_date || '',
    }));
  }, [fiscalYears, fiscalYearsFetched]);

  /* سال مالی پیش‌فرض: سال جاری سیستم یا اولین سال فهرست */
  useEffect(() => {
    if (yearKey || !years.length) return;
    const jalaliYear = toPersianDigits(new Date().getFullYear());
    const current = years.find((item) => String(item.label).includes(jalaliYear))
      || years.find((item) => !item.end || String(item.end) >= new Date().toISOString().slice(0, 10))
      || years[0];
    setYearKey(current?.value || '');
  }, [years, yearKey]);

  useEffect(() => {
    writeJson(SETTINGS_KEY, { yearKey, quarter });
  }, [yearKey, quarter]);

  /* بارگذاری ردیف‌های همان سال/فصل */
  useEffect(() => {
    if (!yearKey) { setRows([]); setLoadedKey(''); return; }
    const saved = readJson(ROWS_KEY(yearKey, quarter), []);
    setRows(Array.isArray(saved) ? saved.map((row) => ({ ...emptyRow(), ...row })) : []);
    setLoadedKey(`${yearKey}|${quarter}`);
  }, [yearKey, quarter]);

  /* ذخیرهٔ خودکار + به‌روزرسانی دفتر طرف‌های معامله برای پیشنهادها */
  useEffect(() => {
    /* فقط وقتی بنویس که ردیف‌های در حافظه مربوط به همین دوره باشند */
    if (!yearKey || loadedKey !== `${yearKey}|${quarter}`) return;
    writeJson(ROWS_KEY(yearKey, quarter), rows);
    const known = new Map(parties.map((party) => [normalizeName(party.name).toLowerCase(), party]));
    let changed = false;
    rows.forEach((row) => {
      const key = normalizeName(row.name).toLowerCase();
      if (!key) return;
      const next = {
        name: normalizeName(row.name),
        city: row.city || known.get(key)?.city || '',
        address: row.address || known.get(key)?.address || '',
        nationalId: row.nationalId || known.get(key)?.nationalId || '',
      };
      if (!known.has(key) || JSON.stringify(known.get(key)) !== JSON.stringify(next)) {
        known.set(key, next);
        changed = true;
      }
    });
    if (changed) {
      const nextParties = [...known.values()].filter((party) => party.name);
      setParties(nextParties);
      writeJson(PARTIES_KEY, nextParties);
    }
  }, [rows, yearKey, quarter]);

  const updateCell = (id, field, value) => {
    setRows((previous) => previous.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  /* انتخاب طرف معامله از پیشنهادها: شهر، آدرس و شناسه ملی هم پر می‌شود */
  const applyParty = (id, party) => {
    setRows((previous) => previous.map((row) => (row.id === id ? {
      ...row,
      name: party.name,
      city: row.city || party.city || '',
      address: row.address || party.address || '',
      nationalId: row.nationalId || party.nationalId || '',
    } : row)));
  };

  const addRow = () => {
    const row = emptyRow();
    setRows((previous) => [...previous, row]);
    setToast('ردیف جدید اضافه شد');
    window.setTimeout(() => {
      if (tableTopRef.current && typeof tableTopRef.current.scrollIntoView === 'function') {
        tableTopRef.current.scrollIntoView({ block: 'nearest' });
      }
    }, 30);
  };

  const removeRow = (id) => setRows((previous) => previous.filter((row) => row.id !== id));

  /* کپی ردیف: طرف معامله، آدرس و نوع حفظ می‌شود؛ فقط شماره فاکتور خالی می‌ماند */
  const duplicateRow = (id) => {
    setRows((previous) => {
      const index = previous.findIndex((row) => row.id === id);
      if (index === -1) return previous;
      const copy = { ...previous[index], id: emptyRow().id, invoiceNo: '' };
      return [...previous.slice(0, index + 1), copy, ...previous.slice(index + 1)];
    });
    setToast('ردیف کپی شد — شماره فاکتور را وارد کنید');
  };

  /* پر کردن ارزش افزودهٔ خالی با نرخ ۱۰٪ (قابل ویرایش بعد از محاسبه) */
  const fillVat = () => {
    const pending = rows.filter((row) => num(row.amount) > 0 && !num(row.vat));
    if (!pending.length) {
      setToast('همهٔ ردیف‌های دارای مبلغ، ارزش افزوده دارند');
      return;
    }
    setRows((previous) => previous.map((row) => (
      num(row.amount) > 0 && !num(row.vat)
        ? { ...row, vat: String(Math.round(num(row.amount) * 0.1)) }
        : row
    )));
    setToast('ارزش افزودهٔ ۱۰٪ برای ردیف‌های خالی محاسبه شد');
  };

  const clearQuarter = () => {
    if (!rows.length) return;
    if (!window.confirm('همهٔ ردیف‌های این فصل حذف شوند؟ این کار قابل بازگشت نیست.')) return;
    setRows([]);
    setToast('ردیف‌های این فصل پاک شد');
  };


  const totals = useMemo(() => rows.reduce((acc, row) => ({
    amount: acc.amount + num(row.amount),
    vat: acc.vat + num(row.vat),
    total: acc.total + totalOf(row),
    registered: acc.registered + (row.status === 'registered' ? 1 : 0),
  }), { amount: 0, vat: 0, total: 0, registered: 0 }), [rows]);

  const pageSize = moduleTheme.tableTheme.rowsPerPage;
  const { ref: tableRef, rowHeight, tableHeight } = useRowHeight(moduleTheme.tableTheme, Math.min(rows.length || 8, pageSize));
  const yearLabel = years.find((item) => item.value === String(yearKey))?.label || 'سال مالی';
  const quarterLabel = QUARTERS.find((item) => item.value === quarter)?.label || '';

  /* ---- خروجی اکسل (xls قابل باز شدن در Excel) ---- */
  const exportExcel = () => {
    const headers = [
      'ردیف', 'نام و نام خانوادگی / نام شرکت', 'شهر', 'آدرس', 'شناسه ملی',
      'شرح کالا / خدمات', 'مبلغ', 'مالیات بر ارزش افزوده', 'جمع کل',
      'نوع', 'تاریخ فاکتور', 'شماره فاکتور', 'وضعیت',
    ];
    const escape = (value) => String(value ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const body = rows.map((row, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escape(row.name)}</td>
        <td>${escape(row.city)}</td>
        <td>${escape(row.address)}</td>
        <td style="mso-number-format:'\\@'">${escape(row.nationalId)}</td>
        <td>${escape(row.description)}</td>
        <td>${num(row.amount)}</td>
        <td>${num(row.vat)}</td>
        <td>${totalOf(row)}</td>
        <td>${escape(row.kind)}</td>
        <td style="mso-number-format:'\\@'">${escape(jalaliLatin(row.invoiceDate))}</td>
        <td style="mso-number-format:'\\@'">${escape(row.invoiceNo)}</td>
        <td>${row.status === 'registered' ? 'درج شده در سامانه' : 'درج نشده'}</td>
      </tr>`).join('');
    const html = `<html dir="rtl"><head><meta charset="utf-8" />
      <style>table{border-collapse:collapse;font-family:Tahoma}td,th{border:1px solid #999;padding:4px;font-size:11px}
      th{background:#f1f5f9}</style></head><body>
      <h3>صورت معاملات فصلی — ${escape(yearLabel)} — ${escape(quarterLabel)}</h3>
      <table><thead><tr>${headers.map((header) => `<th>${header}</th>`).join('')}</tr></thead>
      <tbody>${body}</tbody>
      <tfoot><tr><td colspan="6">جمع کل</td><td>${totals.amount}</td><td>${totals.vat}</td>
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

  /* پیشنهاد نام: اولویت با نام‌هایی که با همین حروف شروع می‌شوند */
  const partyOptions = useMemo(() => parties.filter((party) => party.name), [parties]);
  const filterParties = (options, { inputValue }) => {
    const term = String(inputValue || '').trim().toLowerCase();
    if (!term) return options.slice(-5).reverse();
    const startsWith = options.filter((party) => party.name.toLowerCase().startsWith(term));
    const contains = options.filter((party) => !startsWith.includes(party)
      && party.name.toLowerCase().includes(term));
    return [...startsWith, ...contains].slice(0, 6);
  };


  const tableColumns = [
    {
      key: 'row',
      label: 'ردیف',
      width: '3%',
      align: 'center',
      render: (_row, index) => (
        <Typography noWrap sx={{ fontSize: 11, fontWeight: 700, color: MUTED }}>
          {toPersianDigits(index + 1)}
        </Typography>
      ),
    },
    {
      key: 'name',
      label: 'نام و نام خانوادگی / نام شرکت',
      width: '16%',
      render: (row) => (
        <Autocomplete
          freeSolo
          size="small"
          options={partyOptions}
          filterOptions={filterParties}
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
                <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 800 }}>
                  {`${option.name} را می‌خواهی؟`}
                </Typography>
                <Typography noWrap sx={{ fontSize: 10, color: 'text.secondary' }}>
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
              sx={{
                '& .MuiInputBase-root': { fontSize: 11.5, minHeight: 26 },
                '& .MuiInputBase-input': { py: 0.25, px: 0.25 },
                '& .MuiInput-underline:before': { borderBottomColor: 'transparent' },
              }}
            />
          )}
        />
      ),
    },
    {
      key: 'city',
      label: 'شهر',
      width: '8%',
      render: (row) => (
        <CellTextField value={row.city} onChange={(value) => updateCell(row.id, 'city', value)} placeholder="شهر" />
      ),
    },
    {
      key: 'address',
      label: 'آدرس',
      width: '14%',
      render: (row) => (
        <CellTextField value={row.address} onChange={(value) => updateCell(row.id, 'address', value)} placeholder="آدرس" />
      ),
    },
    {
      key: 'nationalId',
      label: 'شناسه ملی',
      width: '10%',
      align: 'center',
      render: (row) => (
        <CellTextField value={row.nationalId} onChange={(value) => updateCell(row.id, 'nationalId', value)}
          placeholder="شناسه ملی" inputProps={{ inputMode: 'numeric', dir: 'ltr', style: { textAlign: 'center' } }} />
      ),
    },
    {
      key: 'description',
      label: 'شرح کالا / خدمات',
      width: '14%',
      render: (row) => (
        <CellTextField value={row.description} onChange={(value) => updateCell(row.id, 'description', value)}
          placeholder="شرح کالا یا خدمات" />
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
          inputProps={{ 'aria-label': 'مبلغ' }}
          sx={compactMoneySx}
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
          inputProps={{ 'aria-label': 'مالیات بر ارزش افزوده' }}
          sx={compactMoneySx}
        />
      ),
    },
    {
      key: 'total',
      label: 'جمع کل',
      width: '9%',
      align: 'center',
      render: (row) => (
        <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 900 }}>
          {formatPersianNumber(totalOf(row))}
        </Typography>
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
        />
      ),
    },
    {
      key: 'invoiceDate',
      label: 'تاریخ فاکتور',
      width: '8%',
      align: 'center',
      render: (row) => (
        <JalaliDatePicker
          value={row.invoiceDate}
          onChange={(value) => updateCell(row.id, 'invoiceDate', value)}
          variant="standard"
          noHelper
          sx={{
            width: '100%',
            '& .MuiInputBase-root': { fontSize: 11, minHeight: 26 },
            '& .MuiInputBase-input': { py: 0.25, px: 0.25, fontSize: 11 },
            '& .MuiFormHelperText-root': { display: 'none' },
            '& .MuiInput-underline:before': { borderBottomColor: 'transparent' },
          }}
        />
      ),
    },
    {
      key: 'invoiceNo',
      label: 'شماره فاکتور',
      width: '7%',
      align: 'center',
      render: (row) => (
        <CellTextField value={row.invoiceNo} onChange={(value) => updateCell(row.id, 'invoiceNo', value)}
          placeholder="شماره" inputProps={{ dir: 'ltr', style: { textAlign: 'center' } }} />
      ),
    },
    {
      key: 'status',
      label: 'وضعیت (سامانه مودیان)',
      width: '9%',
      align: 'center',
      render: (row) => (
        <CellSelect
          value={row.status}
          onChange={(value) => updateCell(row.id, 'status', value)}
          ariaLabel="وضعیت در سامانه مودیان"
          options={STATUSES}
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
        subtitle="ماده ۱۶۹ مکرر — ثبت دستی معاملات هر فصل و خروجی اکسل آمادهٔ ارسال"
        color="#d97706"
        actions={(
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={addRow}>
              ردیف جدید
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

        <Typography sx={{ fontSize: 11, color: 'text.secondary', flex: 1, minWidth: 220 }}>
          با تایپ حرف اول نام، طرف‌های معاملهٔ قبلی پیشنهاد می‌شوند؛ با انتخاب، شهر و آدرس خودکار پر می‌شود.
          {' '}
          میان‌بر افزودن ردیف: Ctrl + Enter
        </Typography>

        <Button
          size="small"
          variant="outlined"
          startIcon={<PercentIcon />}
          onClick={fillVat}
          disabled={!rows.length}
          sx={{ fontSize: 11.5 }}
        >
          ارزش افزوده ۱۰٪
        </Button>

        <Button
          size="small"
          color="error"
          variant="text"
          startIcon={<DeleteSweepIcon />}
          onClick={clearQuarter}
          disabled={!rows.length}
          sx={{ fontSize: 11.5 }}
        >
          پاک کردن فصل
        </Button>
      </Paper>

      <Paper
        elevation={0}
        sx={{
          bgcolor: 'background.paper',
          border: `1px solid ${moduleTheme.cardBorderColor}`,
          borderRadius: 'var(--hrms-card-radius, 14px)',
          overflow: 'hidden',
        }}
      >
        <Box
          ref={tableTopRef}
          onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
              event.preventDefault();
              addRow();
            }
          }}
        >
          <ModuleTable
            tableTheme={moduleTheme.tableTheme}
            columns={tableColumns}
            rows={rows}
            rowKey={(row) => row.id}
            containerRef={tableRef}
            tableHeight={rows.length ? tableHeight : 210}
            rowHeight={rowHeight}
            emptyText="هنوز ردیفی ثبت نشده است — با دکمهٔ «ردیف جدید» شروع کنید."
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
            <Box component="span" sx={{ fontWeight: 800, color: 'text.primary' }}>{toPersianDigits(rows.length)}</Box>
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
          <Typography sx={{ fontSize: 11.5, color: 'text.secondary', ml: 'auto' }}>
            {'درج‌شده در سامانه: '}
            <Box component="span" sx={{ fontWeight: 800, color: 'text.primary' }}>
              {`${toPersianDigits(totals.registered)} از ${toPersianDigits(rows.length)}`}
            </Box>
          </Typography>
        </Box>
      </Paper>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={2200}
        onClose={() => setToast('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" onClose={() => setToast('')} sx={{ fontSize: 12 }}>
          {toast}
        </Alert>
      </Snackbar>
    </>
  );
};

export default SeasonalReportPage;

