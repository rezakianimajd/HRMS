import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, Autocomplete, Box, Button, FormControl, IconButton, InputLabel,
  MenuItem, Paper, Select, Snackbar, Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import CalendarViewMonthIcon from '@mui/icons-material/CalendarViewMonth';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
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
  ModuleTable, ModuleToolbar, useModuleTheme, useRowHeight,
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
/* ردیف خالی (ردیف آمادهٔ ورود) — برای ساخت خودکار ردیف بعدی */
const TEXT_FIELDS = ['name', 'city', 'address', 'nationalId', 'description', 'amount', 'vat', 'invoiceNo', 'invoiceDate'];
const isBlankRow = (row) => TEXT_FIELDS.every((field) => !String(row[field] ?? '').trim());
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
      '& .MuiSelect-select': { py: 0.25, px: 0.25, fontSize: 11, display: 'flex', justifyContent: 'center' },
    }}
  >
    {options.map((option) => (
      <MenuItem key={option.value} value={option.value} sx={{ fontSize: 11.5 }}>
        {option.label}
      </MenuItem>
    ))}
  </Select>
);

/* ورودی کد/شماره با نمایش ارقام فارسی و ذخیرهٔ ارقام لاتین */
const DigitField = ({ value, onChange, placeholder, numeric, maxLength }) => (
  <CellTextField
    value={toPersianDigits(value ?? '')}
    onChange={(raw) => {
      const latin = toEnglishDigits(String(raw ?? ''));
      const cleaned = numeric ? latin.replace(/[^\d]/g, '') : latin;
      onChange(maxLength ? cleaned.slice(0, maxLength) : cleaned);
    }}
    placeholder={placeholder}
    inputProps={{ inputMode: numeric ? 'numeric' : 'text', dir: 'ltr', style: { textAlign: 'center' } }}
  />
);

/* نقطهٔ رنگی وضعیت سامانهٔ مودیان (به‌جای متن، برای صرفه‌جویی در فضا) */
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
      boxShadow: registered
        ? '0 0 0 3px rgba(22,163,74,0.16)'
        : '0 0 0 3px rgba(220,38,38,0.16)',
    }}
  />
);

const StatusCell = ({ value, onChange }) => (
  <Tooltip title={value === 'registered' ? 'درج شده در سامانه مودیان' : 'درج نشده در سامانه مودیان'}>
    <Select
      variant="standard"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disableUnderline
      IconComponent={() => null}
      renderValue={(selected) => (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
          <StatusDot registered={selected === 'registered'} />
        </Box>
      )}
      inputProps={{ 'aria-label': 'وضعیت در سامانه مودیان' }}
      sx={{
        width: '100%',
        fontSize: 11,
        '& .MuiSelect-select': { py: 0.4, px: 0, display: 'flex', justifyContent: 'center' },
      }}
    >
      {STATUSES.map((option) => (
        <MenuItem key={option.value} value={option.value} sx={{ fontSize: 11.5, gap: 1 }}>
          <StatusDot registered={option.value === 'registered'} />
          {option.label}
        </MenuItem>
      ))}
    </Select>
  </Tooltip>
);

const SeasonalReportPage = () => {
  const moduleTheme = useModuleTheme();
  const [yearKey, setYearKey] = useState(() => readJson(SETTINGS_KEY, {}).yearKey || '');
  const [quarter, setQuarter] = useState(() => readJson(SETTINGS_KEY, {}).quarter || 1);
  const [rows, setRows] = useState([]);
  const [parties, setParties] = useState(() => readJson(PARTIES_KEY, []));
  const [loadedKey, setLoadedKey] = useState('');
  const [toast, setToast] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [kindFilter, setKindFilter] = useState('all');
  const [sortBy, setSortBy] = useState('entry');
  const [filtersOpen, setFiltersOpen] = useState(false);

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

  /* بارگذاری ردیف‌های همان سال/فصل (همیشه با یک ردیف خالی آمادهٔ ورود در پایان) */
  useEffect(() => {
    if (!yearKey) { setRows([emptyRow()]); setLoadedKey(''); return; }
    const saved = readJson(ROWS_KEY(yearKey, quarter), []);
    const list = Array.isArray(saved) ? saved.map((row) => ({ ...emptyRow(), ...row })) : [];
    while (list.length && isBlankRow(list[list.length - 1])) list.pop();
    setRows([...list, emptyRow()]);
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

  /* ردیف بعدی همیشه خودکار ساخته می‌شود: هر وقت آخرین ردیف پر شود، یک ردیف خالی پایین آن اضافه می‌شود */
  useEffect(() => {
    setRows((previous) => (
      previous.length && !isBlankRow(previous[previous.length - 1])
        ? [...previous, emptyRow()]
        : previous
    ));
  }, [rows]);


  /* ردیف‌های دارای داده (به‌جز ردیف خالی آمادهٔ ورود) */
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
      list = list.filter((row) => [row.name, row.city, row.address, row.nationalId, row.description, row.invoiceNo]
        .some((value) => String(value ?? '').toLowerCase().includes(term)));
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

  /* ردیف خالی فقط در حالت عادی (بدون جستجو/فیلتر/مرتب‌سازی) نمایش داده می‌شود */
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

  const pageSize = moduleTheme.tableTheme.rowsPerPage;
  const { ref: tableRef, rowHeight, tableHeight } = useRowHeight(moduleTheme.tableTheme, Math.min(displayRows.length || 8, pageSize));
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
    const body = filledRows.map((row, index) => `
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
      width: '4%',
      align: 'center',
      render: (row) => (
        <Typography noWrap sx={{ fontSize: 11, fontWeight: 700, color: MUTED }}>
          {toPersianDigits((indexById.get(row.id) ?? 0) + 1)}
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
        <DigitField value={row.nationalId} onChange={(value) => updateCell(row.id, 'nationalId', value)}
          placeholder="شناسه ملی" numeric maxLength={11} />
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
        <DigitField value={row.invoiceNo} onChange={(value) => updateCell(row.id, 'invoiceNo', value)}
          placeholder="شماره" />
      ),
    },
    {
      key: 'status',
      label: 'وضعیت',
      width: '5%',
      align: 'center',
      render: (row) => (
        <StatusCell value={row.status} onChange={(value) => updateCell(row.id, 'status', value)} />
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
      </Paper>

      <ModuleToolbar
        theme={moduleTheme}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="جستجو در نام طرف معامله، شهر، آدرس، شناسه ملی، شرح کالا و شماره فاکتور…"
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
          <Typography sx={{ fontSize: 11.5, color: 'text.secondary', ml: 'auto' }}>
            {'درج‌شده در سامانه: '}
            <Box component="span" sx={{ fontWeight: 800, color: 'text.primary' }}>
              {`${toPersianDigits(totals.registered)} از ${toPersianDigits(filledRows.length)}`}
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

