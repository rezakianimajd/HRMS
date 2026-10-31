import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Autocomplete, Box, Button, FormControl, IconButton, InputLabel,
  MenuItem, Paper, Select, Snackbar, Stack, Tab, Tabs, TextField, Tooltip, Typography,
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
import SeasonalAnalyticsPanel from './SeasonalAnalyticsPanel';
import SeasonalReconcilePanel from './SeasonalReconcilePanel';
import SeasonalPartyPivot from './SeasonalPartyPivot';

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

const BACKEND_DIRECTION = 'purchase';   // این نسخه فقط خرید

const PERSON_TYPES = [
  { value: 'legal', label: 'حقوقی' },
  { value: 'natural', label: 'حقیقی' },
  { value: 'foreign', label: 'خارجی' },
  { value: 'aggregate', label: 'تجمیعی' },
];

const DEFAULT_COUNTRY = 'ایران';

/* نگاشت فیلد داخلی قواعد ← فیلد رابط کاربری */
const FIELD_MAP = {
  line_no: 'lineNo',
  name: 'name',
  first_name: 'firstName',
  last_name: 'lastName',
  person_type: 'personType',
  national_id: 'nationalId',
  postal_code: 'postalCode',
  country: 'country',
  province: 'province',
  city: 'city',
  address: 'address',
  goods_service_desc: 'description',
  amount: 'amount',
  vat: 'vat',
  kind: 'kind',
  invoice_date: 'invoiceDate',
  invoice_no: 'invoiceNo',
  moadian_status: 'status',
  moadian_uid: 'moadianUid',
};

const SOURCE_LEGAL = 'ماده ۱۶۹ مکرر ق.م.م و آیین‌نامه — الزامات عمومی فهرست معاملات';
const SOURCE_TTMS = 'قالب TTMS نسخهٔ هدف ۱۴۰۵ — تأییدنشده (فایل رسمی در دسترس نیست)';
const SOURCE_INTERNAL = 'سیاست داخلی Kian EBP';

/* آینهٔ محلی قواعد (فقط برای حالت آفلاین) — مرجع نهایی همان پاسخ سرور است */
const LOCAL_REFERENCE = {
  direction: BACKEND_DIRECTION,
  ruleset_version: 'draft-1405.3',
  ruleset_status: 'unverified',
  rules: [
    { kind: 'required', field: 'person_type', person_types: ['legal', 'natural', 'foreign'], level: 'error', source: SOURCE_INTERNAL, message: 'نوع فروشنده را انتخاب کنید.' },
    { kind: 'required', field: 'name', person_types: ['legal', 'foreign'], level: 'error', source: SOURCE_LEGAL, message: 'نام شرکت / عنوان فروشنده الزامی است.' },
    { kind: 'required', field: 'national_id', person_types: ['legal'], level: 'error', source: SOURCE_LEGAL, message: 'برای فروشندهٔ حقوقی، شناسه ملی ۱۱ رقمی الزامی است.' },
    { kind: 'digits', field: 'national_id', person_types: ['legal'], level: 'error', length: 11, source: SOURCE_LEGAL, message: 'شناسه ملی شخص حقوقی باید ۱۱ رقم باشد.' },
    { kind: 'required', field: 'first_name', person_types: ['natural'], level: 'error', source: SOURCE_LEGAL, message: 'برای فروشندهٔ حقیقی، «نام» الزامی است.' },
    { kind: 'required', field: 'last_name', person_types: ['natural'], level: 'error', source: SOURCE_LEGAL, message: 'برای فروشندهٔ حقیقی، «نام خانوادگی» الزامی است.' },
    { kind: 'required', field: 'national_id', person_types: ['natural'], level: 'error', source: SOURCE_LEGAL, message: 'برای فروشندهٔ حقیقی، کد ملی ۱۰ رقمی الزامی است.' },
    { kind: 'digits', field: 'national_id', person_types: ['natural'], level: 'error', length: 10, source: SOURCE_LEGAL, message: 'کد ملی شخص حقیقی باید ۱۰ رقم باشد.' },
    { kind: 'forbidden', field: 'national_id', person_types: ['foreign'], level: 'warning', source: SOURCE_TTMS, message: 'برای شخص خارجی، شناسه ملی/کد ملی ایرانی ثبت نمی‌شود.' },
    { kind: 'required', field: 'country', person_types: ['foreign'], level: 'error', source: SOURCE_TTMS, message: 'برای شخص خارجی، کشور الزامی است.' },
    { kind: 'recommended', field: 'postal_code', person_types: ['legal', 'natural'], level: 'warning', source: SOURCE_LEGAL, message: 'کد پستی فروشنده ثبت نشده است.' },
    { kind: 'digits', field: 'postal_code', person_types: ['legal', 'natural'], level: 'error', length: 10, source: SOURCE_LEGAL, message: 'کد پستی باید ۱۰ رقم باشد.' },
    { kind: 'recommended', field: 'invoice_no', person_types: ['legal', 'natural', 'foreign'], level: 'warning', source: SOURCE_TTMS, message: 'شماره فاکتور وارد نشده است.' },
    { kind: 'recommended', field: 'invoice_date', person_types: ['legal', 'natural', 'foreign'], level: 'warning', source: SOURCE_TTMS, message: 'تاریخ فاکتور وارد نشده است.' },
    { kind: 'recommended', field: 'goods_service_desc', person_types: ['legal', 'natural', 'foreign'], level: 'warning', source: SOURCE_TTMS, message: 'شرح کالا یا خدمات وارد نشده است.' },
  ],
  required: {
    legal: ['person_type', 'name', 'national_id'],
    natural: ['person_type', 'first_name', 'last_name', 'national_id'],
    foreign: ['person_type', 'name', 'country'],
    aggregate: ['amount'],
  },
};

const ROWS_KEY_PREFIX = 'hrms.seasonal.rows.';
const ROWS_KEY = (yearKey, quarter) => `${ROWS_KEY_PREFIX}${yearKey}.q${quarter}`;
const PARTIES_KEY = 'hrms.seasonal.parties';
const SETTINGS_KEY = 'hrms.seasonal.settings';

const emptyRow = () => ({
  id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  name: '', firstName: '', lastName: '', personType: 'legal', nationalId: '',
  postalCode: '', country: DEFAULT_COUNTRY, city: '', address: '',
  description: '', amount: '', vat: '', kind: 1, invoiceDate: '',
  invoiceNo: '', moadianUid: '', status: 'pending',
});

const num = (value) => Number(toEnglishDigits(String(value ?? '')).replace(/[^\d.-]/g, '')) || 0;
const totalOf = (row) => num(row.amount) + num(row.vat);
const normalizeName = (value) => String(value || '').trim().replace(/\s+/g, ' ');
const isEmpty = (value) => !String(value ?? '').trim();

/* ---- ردیف «تجمیعی»: نام‌ها «متفرقه» و بقیهٔ ستون‌ها «—» (نشانهٔ لازم‌نبودن، ولی قابل ویرایش) ---- */
const AGGREGATE_NAME = 'متفرقه';
const PLACEHOLDER = '—';
const AGGREGATE_KIND = 3;
const isPlaceholder = (value) => /^[—–-]+$/.test(String(value ?? '').trim());
/* ---- حافظهٔ طرف‌های معامله (برای همهٔ انواع: حقوقی/حقیقی/خارجی/تجمیعی) ---- */
const PERSON_TYPE_LABELS = PERSON_TYPES.reduce(
  (acc, type) => ({ ...acc, [type.value]: type.label }), {},
);

/* عنوان نمایشی یک طرف: حقوقی/خارجی/تجمیعی «نام»، حقیقی «نام + نام خانوادگی» */
const partyDisplay = (party) => normalizeName(
  party?.label || party?.name || [party?.firstName, party?.lastName].filter(Boolean).join(' '),
);

/* نوع طرف معامله؛ برای داده‌های قدیمیِ بدون نوع، از روی شناسه/کشور حدس زده می‌شود */
const inferPersonType = (party) => {
  if (party?.personType && PERSON_TYPE_LABELS[party.personType]) return party.personType;
  if (party?.firstName || party?.lastName) return 'natural';
  const nationalId = String(party?.nationalId || '');
  if (nationalId.length === 10) return 'natural';       // کد ملی اشخاص حقیقی ۱۰ رقمی است
  const country = normalizeName(party?.country);
  if (country && country !== DEFAULT_COUNTRY && !isPlaceholder(country)) return 'foreign';
  return 'legal';
};

/* رتبه‌بندی پیشنهادها بر اساس متن تایپ‌شده (شروع نام → شروع یک کلمه → شامل) */
const filterPartyOptions = (options, term) => {
  const clean = normalizeName(term).toLowerCase();
  const candidates = options.filter((party) => partyDisplay(party).toLowerCase() !== clean);
  if (!clean) return candidates.slice(-6).reverse();
  const scored = [];
  candidates.forEach((party) => {
    const label = partyDisplay(party).toLowerCase();
    if (label.startsWith(clean)) scored.push({ party, score: 0 });
    else if (label.split(/\s+/).some((word) => word.startsWith(clean))) scored.push({ party, score: 1 });
    else if (label.includes(clean)) scored.push({ party, score: 2 });
  });
  return scored.sort((a, b) => a.score - b.score).slice(0, 6).map((item) => item.party);
};

/* ردیف خالی (ردیف آمادهٔ ورود) — «کشور» حساب نمی‌شود چون پیش‌فرض «ایران» دارد */
const TEXT_FIELDS = [
  'name', 'firstName', 'lastName', 'nationalId', 'postalCode', 'city', 'address',
  'description', 'amount', 'vat', 'invoiceNo', 'invoiceDate', 'moadianUid',
];
const isBlankRow = (row) => !TEXT_FIELDS.some((field) => !isEmpty(row[field]));

const jalaliText = (value) => {
  if (!value) return '';
  const jalali = toJalali(value);
  return jalali === '—' ? '' : jalali;
};

/* ردیف «تجمیعی»: نام و نام خانوادگی «متفرقه»، بقیهٔ ستون‌ها «—»؛ فقط شرح و مبلغ باید پر شود */
const aggregateDefaults = (row, { forceNames = false } = {}) => ({
  ...row,
  personType: 'aggregate',
  name: forceNames || isEmpty(row.name) || isPlaceholder(row.name) ? AGGREGATE_NAME : row.name,
  firstName: forceNames || isEmpty(row.firstName) || isPlaceholder(row.firstName) ? AGGREGATE_NAME : row.firstName,
  lastName: forceNames || isEmpty(row.lastName) || isPlaceholder(row.lastName) ? AGGREGATE_NAME : row.lastName,
  nationalId: isEmpty(row.nationalId) ? PLACEHOLDER : row.nationalId,
  postalCode: isEmpty(row.postalCode) ? PLACEHOLDER : row.postalCode,
  country: isEmpty(row.country) || row.country === DEFAULT_COUNTRY ? PLACEHOLDER : row.country,
  city: isEmpty(row.city) ? PLACEHOLDER : row.city,
  address: isEmpty(row.address) ? PLACEHOLDER : row.address,
  invoiceNo: isEmpty(row.invoiceNo) ? PLACEHOLDER : row.invoiceNo,
  invoiceDate: isEmpty(row.invoiceDate) ? PLACEHOLDER : row.invoiceDate,
  vat: isEmpty(row.vat) || num(row.vat) === 0 ? PLACEHOLDER : row.vat,
  kind: AGGREGATE_KIND,
  status: 'pending',
});

/* خروج از «تجمیعی»: مقادیر پیش‌فرض (متفرقه/—) پاک می‌شوند تا ردیف معمولی سالم بماند */
const clearAggregateDefaults = (row) => {
  const next = { ...row, personType: 'legal' };
  TEXT_FIELDS.forEach((field) => {
    if (next[field] === AGGREGATE_NAME || isPlaceholder(next[field])) next[field] = '';
  });
  if (Number(next.kind) === AGGREGATE_KIND) next.kind = 1;
  if (!next.country || next.country === PLACEHOLDER) next.country = DEFAULT_COUNTRY;
  return next;
};

/* امضای محتوایی ردیف‌ها (بدون شناسه) برای تشخیص «تغییر نکرده» */
const payloadSignature = (payload) => JSON.stringify(payload.map((row) => ({ ...row, id: undefined })));

/* نگاشت ردیف API ↔ جدول */
const rowFromApi = (item) => {
  const row = {
    id: item.id,
    name: item.name || '',
    firstName: item.first_name || '',
    lastName: item.last_name || '',
    personType: item.person_type || 'legal',
    nationalId: item.national_id || '',
    postalCode: item.postal_code || '',
    country: item.country || '',
    city: item.city || '',
    address: item.address || '',
    description: item.goods_service_desc || '',
    amount: item.amount ? String(Number(item.amount)) : '',
    vat: item.vat ? String(Number(item.vat)) : '',
    kind: item.kind || 1,
    invoiceDate: item.invoice_date || '',
    invoiceNo: item.invoice_no || '',
    moadianUid: item.moadian_uid || '',
    status: item.moadian_status || 'pending',
  };
  return row.personType === 'aggregate' ? aggregateDefaults(row) : row;
};

/* «—» فقط نشانهٔ نمایشی است و به سرور فرستاده نمی‌شود */
const apiText = (value) => (isPlaceholder(value) ? '' : String(value ?? ''));

const rowToApi = (row) => ({
  id: typeof row.id === 'number' ? row.id : null,
  name: apiText(row.name),
  first_name: apiText(row.firstName),
  last_name: apiText(row.lastName),
  person_type: row.personType || 'legal',
  national_id: apiText(row.nationalId),
  postal_code: apiText(row.postalCode),
  country: apiText(row.country),
  city: apiText(row.city),
  address: apiText(row.address),
  goods_service_desc: apiText(row.description),
  amount: num(row.amount),
  vat: isPlaceholder(row.vat) ? 0 : num(row.vat),
  kind: Number(row.kind) || 1,
  invoice_date: isPlaceholder(row.invoiceDate) ? null : (row.invoiceDate || null),
  invoice_no: apiText(row.invoiceNo),
  moadian_uid: apiText(row.moadianUid),
  moadian_status: row.status === 'registered' ? 'registered' : 'pending',
  direction: BACKEND_DIRECTION,
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

/* همهٔ ردیف‌های دوره‌های قبلی که در همین مرورگر ذخیره شده‌اند (حافظهٔ طرف‌های معامله) */
const readStoredSeasonalRows = () => {
  const collected = [];
  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key || !key.startsWith(ROWS_KEY_PREFIX)) continue;
      const list = readJson(key, []);
      if (!Array.isArray(list)) continue;
      list.forEach((item) => {
        if (item && typeof item === 'object' && !isEmpty(item.name || item.firstName || item.lastName)) {
          collected.push(item);          // بدون پیش‌فرض‌سازی تا نوع اصلی/قدیمی حفظ شود
        }
      });
    }
  } catch (error) { /* noop */ }
  return collected;
};

/* اعتبارسنجی قواعد‌محور (حالت آفلاین) — همان ساختار قواعد سرور */
const localValidate = (rows, periodStart, periodEnd, reference = LOCAL_REFERENCE) => {
  const rules = reference.rules || LOCAL_REFERENCE.rules;
  const issues = [];
  const seen = new Map();

  rows.forEach((row, index) => {
    if (isBlankRow(row)) return;
    const lineNo = index + 1;
    const personType = row.personType || '';
    const push = (field, level, message, source = SOURCE_INTERNAL) => issues.push({
      row_id: row.id, row_no: lineNo, row_name: row.name,
      field: FIELD_MAP[field] || field, level, message, source,
    });

    rules.forEach((rule) => {
      if (personType && !rule.person_types.includes(personType)) return;
      const uiField = FIELD_MAP[rule.field] || rule.field;
      /* «—» نشانهٔ لازم‌نبودن است و در اعتبارسنجی مثل خالی حساب می‌شود */
      const raw = row[uiField];
      const text = isPlaceholder(raw) ? '' : String(raw ?? '').trim();
      if (rule.kind === 'required' || rule.kind === 'recommended') {
        if (!text) push(rule.field, rule.level, rule.message, rule.source);
        return;
      }
      if (rule.kind === 'digits') {
        if (text && (!/^\d+$/.test(toEnglishDigits(text)) || (rule.length && toEnglishDigits(text).length !== rule.length))) {
          push(rule.field, rule.level, rule.message, rule.source);
        }
        return;
      }
      if (rule.kind === 'forbidden' && text) {
        push(rule.field, rule.level, rule.message, rule.source);
      }
    });

    if (!num(row.amount) && !num(row.vat)) {
      push('amount', 'error', 'مبلغ خرید باید بزرگ‌تر از صفر باشد.', SOURCE_LEGAL);
    }
    if (num(row.vat) > num(row.amount)) {
      push('vat', 'error', 'مالیات بر ارزش افزوده نمی‌تواند از مبلغ خرید بیشتر باشد.', SOURCE_LEGAL);
    }
    if (row.invoiceDate && !isPlaceholder(row.invoiceDate) && periodStart && periodEnd
      && (row.invoiceDate < periodStart || row.invoiceDate > periodEnd)) {
      push('invoiceDate', 'error', 'تاریخ فاکتور بیرون از بازهٔ این فصل است.', SOURCE_LEGAL);
    }
    /* ردیف «تجمیعی» فاکتور/سامانهٔ مودیان ندارد */
    if (row.personType !== 'aggregate' && row.status !== 'registered') {
      push('status', 'warning', 'این فاکتور در سامانه مودیان درج نشده است.', SOURCE_TTMS);
    }
    if (row.invoiceNo && !isPlaceholder(row.invoiceNo)) {
      const key = `${normalizeName(row.invoiceNo)}|${row.nationalId || row.name}`;
      if (seen.has(key)) {
        push('invoiceNo', 'error', `شماره فاکتور تکراری با ردیف ${toPersianDigits(seen.get(key))} ثبت شده است.`, SOURCE_INTERNAL);
      } else {
        seen.set(key, lineNo);
      }
    }
  });

  const errors = issues.filter((issue) => issue.level === 'error').length;
  return {
    issues,
    ruleset: { version: reference.ruleset_version, status: reference.ruleset_status },
    summary: {
      rows: rows.filter((row) => !isBlankRow(row)).length,
      errors,
      warnings: issues.length - errors,
    },
  };
};

/* الزامات هر نوع فروشنده از مرجع قواعد (سرور یا آینهٔ محلی) */
const requiredFor = (reference, personType) => (
  (reference?.required || LOCAL_REFERENCE.required)[personType || 'legal'] || []
);


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

/* پیشنهاد طرف معامله از داده‌های قبلی — برای همهٔ انواع (حقوقی/حقیقی/خارجی/تجمیعی) */
const PartyAutocomplete = ({
  value, options, onInputChange, onSelect, placeholder, ariaLabel, sx, cellFontPx, noOptionsText,
}) => (
  <Autocomplete
    freeSolo
    size="small"
    options={options}
    filterOptions={(list) => filterPartyOptions(list, value)}
    getOptionLabel={(option) => (typeof option === 'string' ? option : partyDisplay(option))}
    inputValue={value ?? ''}
    value={value ?? ''}
    onInputChange={(_event, next, reason) => {
      /* «reset» هنگام انتخاب گزینه رخ می‌دهد و نباید فیلد را با عنوان کامل بازنویسی کند */
      if (reason === 'reset') return;
      onInputChange(next);
    }}
    onChange={(_event, next) => {
      if (next && typeof next !== 'string') onSelect(next);
    }}
    noOptionsText={noOptionsText || 'طرف جدید — با ادامهٔ تایپ ثبت می‌شود'}
    renderOption={(props, option) => (
      <Box component="li" {...props} key={`${option.personType}-${partyDisplay(option)}`} sx={{ gap: 1 }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography noWrap sx={{ fontSize: `${cellFontPx}px`, fontWeight: 800 }}>
            {`${partyDisplay(option)} — ${PERSON_TYPE_LABELS[option.personType] || 'نامشخص'} را می‌خواهی؟`}
          </Typography>
          <Typography noWrap sx={{ fontSize: `${Math.max(10, cellFontPx - 1.5)}px`, color: 'text.secondary' }}>
            {[
              option.nationalId,
              [option.city, option.address].filter(Boolean).join(' · '),
            ].filter(Boolean).join(' — ') || 'بدون شناسه/آدرس ثبت‌شده'}
          </Typography>
        </Box>
      </Box>
    )}
    renderInput={(params) => (
      <TextField
        {...params}
        variant="standard"
        placeholder={placeholder}
        inputProps={{ ...params.inputProps, 'aria-label': ariaLabel }}
        sx={{
          '& .MuiInputBase-root': { minHeight: 26 },
          '& .MuiInputBase-input': { py: 0.25, px: 0.25 },
          '& .MuiInput-underline:before': { borderBottomColor: 'transparent' },
          '& .MuiInput-underline:hover:before': { borderBottomColor: 'rgba(148,163,184,0.6)' },
          ...(sx || {}),
        }}
      />
    )}
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
  /* ردیف‌های دوره‌های قبلیِ همین مرورگر برای حافظهٔ طرف‌ها (یک‌بار در شروع) */
  const [storedRows] = useState(() => readStoredSeasonalRows());
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
  const [activeTab, setActiveTab] = useState('data');
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState(false);
  const [analyticsExporting, setAnalyticsExporting] = useState(false);
  const [pivot, setPivot] = useState(null);
  const [pivotLoading, setPivotLoading] = useState(false);
  const [pivotExporting, setPivotExporting] = useState(false);
  const [pivotDimension, setPivotDimension] = useState('kind');
  const [analyticsFilters, setAnalyticsFilters] = useState({
    kind: 'all', status: 'all', personType: 'all', search: '',
  });
  const savedSignatureRef = useRef('');    // امضای آخرین ردیف‌های ذخیره‌شده (بدون شناسه)
  const saveTimerRef = useRef(null);
  const lastRowElRef = useRef(null);       // آخرین ردیف جدول که فوکوس داشته

  const { data: referenceData } = useQuery({
    queryKey: ['seasonal-rules-reference'],
    queryFn: () => axiosInstance.get(`${API_BASE}/reference/`).then((response) => response.data),
    staleTime: 30 * 60 * 1000,
    retry: false,
  });
  /* مرجع نهایی قواعد: پاسخ سرور؛ در نبود سرور، آینهٔ محلی (هم‌نسخه) */
  const reference = referenceData || LOCAL_REFERENCE;
  const rulesetStatus = reference?.ruleset_status || 'unverified';

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
            savedSignatureRef.current = '';
            return;
          }
        }
        setRows([...serverRows, emptyRow()]);
        setMode('api');
        setLoadedKey(key);
        savedSignatureRef.current = payloadSignature((data.transactions || []).map(rowToApi));
      })
      .catch(fallbackToLocal);

    return () => { cancelled = true; };
  }, [yearKey, quarter]);


  /* ذخیرهٔ «پایان ردیف»: تا زمانی که کاربر داخل یک ردیف است هیچ ذخیره‌ای انجام نمی‌شود؛
     با رفتن به ردیف بعد یا خروج از جدول، همان یک بار ذخیره می‌شود */
  const rowsRef = useRef(rows);
  const saveContextRef = useRef({});
  useEffect(() => { rowsRef.current = rows; }, [rows]);
  saveContextRef.current = { mode, reportId, yearKey, quarter, loadedKey };

  const flushSave = useCallback(({ silent = false } = {}) => {
    const { mode: currentMode, reportId: currentReportId, yearKey: currentYear, quarter: currentQuarter, loadedKey: currentLoaded } = saveContextRef.current;
    if (!currentYear || currentLoaded !== `${currentYear}|${currentQuarter}` || currentMode === 'loading') {
      return Promise.resolve();
    }
    if (currentMode !== 'api' || !currentReportId) {
      if (!silent) setSaveState('saved');          // حالت محلی: فقط حافظهٔ مرورگر
      return Promise.resolve();
    }
    const payload = rowsRef.current.filter((row) => !isBlankRow(row)).map(rowToApi);
    const signature = payloadSignature(payload);
    if (signature === savedSignatureRef.current) return Promise.resolve();

    savedSignatureRef.current = signature;          // جلوگیری از ارسال تکراری
    if (!silent) setSaveState('saving');
    return axiosInstance.post(`${API_BASE}/${currentReportId}/rows/`, { rows: payload })
      .then(() => { if (!silent) setSaveState('saved'); })
      .catch(() => {
        savedSignatureRef.current = '';             // تلاش دوباره در پایان ردیف بعدی
        if (!silent) {
          setSaveState('error');
          setToast('ذخیره در سرور انجام نشد؛ نسخهٔ محلی نگه داشته شد.');
        }
      });
  }, []);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null;
      flushSave();
    }, 450);
  }, [flushSave]);

  const cancelScheduledSave = () => {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
  };

  useEffect(() => () => cancelScheduledSave(), []);

  /* ذخیرهٔ نهایی هنگام بستن/خروج از صفحه (به‌صورت بهترین‌تلاش و بی‌صدا) */
  useEffect(() => {
    const handlePageHide = () => { flushSave({ silent: true }); };
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);
    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
      cancelScheduledSave();
      flushSave({ silent: true });
    };
  }, [flushSave]);

  /* تشخیص «رفتن به ردیف بعد» از روی حرکت فوکوس در جدول */
  useEffect(() => {
    const handleFocusIn = (event) => {
      const rowEl = event.target?.closest?.('tbody tr') || null;
      const previousRowEl = lastRowElRef.current;
      cancelScheduledSave();
      if (!rowEl) {
        /* خروج از جدول: فیلتر، انتخاب سال/فصل، دکمه‌ها یا منوی بازشو */
        if (previousRowEl) scheduleSave();
        return;
      }
      lastRowElRef.current = rowEl;
      if (previousRowEl && previousRowEl !== rowEl) scheduleSave();
    };
    document.addEventListener('focusin', handleFocusIn);
    return () => document.removeEventListener('focusin', handleFocusIn);
  }, [scheduleSave]);

  /* نسخهٔ محلی با تأخیر نوشته می‌شود (JSON.stringify هزار ردیف در هر کلید، تایپ را کند می‌کند) */
  const localWriteTimerRef = useRef(null);
  useEffect(() => {
    if (!yearKey || loadedKey !== `${yearKey}|${quarter}`) return undefined;
    if (localWriteTimerRef.current) window.clearTimeout(localWriteTimerRef.current);
    localWriteTimerRef.current = window.setTimeout(() => {
      localWriteTimerRef.current = null;
      writeJson(ROWS_KEY(yearKey, quarter), rows);
    }, 900);
    return () => {
      if (localWriteTimerRef.current) window.clearTimeout(localWriteTimerRef.current);
    };
  }, [rows, yearKey, quarter, loadedKey]);

  /* نوشتن فوری نسخهٔ محلی پیش از بستن صفحه/خروج از صفحه (بدون وابستگی به هر تغییر rows) */
  useEffect(() => {
    const flushLocal = () => {
      if (!yearKey || loadedKey !== `${yearKey}|${quarter}`) return;
      if (localWriteTimerRef.current) {
        window.clearTimeout(localWriteTimerRef.current);
        localWriteTimerRef.current = null;
      }
      writeJson(ROWS_KEY(yearKey, quarter), rowsRef.current);
    };
    window.addEventListener('pagehide', flushLocal);
    return () => {
      window.removeEventListener('pagehide', flushLocal);
      flushLocal();
    };
  }, [yearKey, quarter, loadedKey]);

  /* تحلیل سرور: با ورود به تب گزارش‌ها، هر فیلتر و پس از هر ذخیره تازه می‌شود */
  useEffect(() => {
    if (activeTab !== 'analytics' || mode !== 'api' || !reportId) return undefined;
    let cancelled = false;
    setAnalyticsLoading(true);
    const params = { direction: BACKEND_DIRECTION };
    if (analyticsFilters.kind !== 'all') params.kind = analyticsFilters.kind;
    if (analyticsFilters.status !== 'all') params.moadian_status = analyticsFilters.status;
    if (analyticsFilters.personType !== 'all') params.person_type = analyticsFilters.personType;
    if (analyticsFilters.search) params.search = analyticsFilters.search;
    axiosInstance.get(`${API_BASE}/${reportId}/analytics/`, { params })
      .then(({ data }) => {
        if (cancelled) return;
        setAnalytics(data);
        setAnalyticsError(false);
      })
      .catch(() => {
        if (cancelled) return;
        setAnalytics(null);
        setAnalyticsError(true);
      })
      .finally(() => { if (!cancelled) setAnalyticsLoading(false); });
    return () => { cancelled = true; };
  }, [activeTab, mode, reportId, saveState, analyticsFilters]);

  /* پیوت طرف حساب: با بُعد انتخابی و همان فیلترهای گزارش */
  useEffect(() => {
    if (activeTab !== 'analytics' || mode !== 'api' || !reportId) return undefined;
    let cancelled = false;
    setPivotLoading(true);
    const params = { direction: BACKEND_DIRECTION, dimension: pivotDimension };
    if (analyticsFilters.kind !== 'all') params.kind = analyticsFilters.kind;
    if (analyticsFilters.status !== 'all') params.moadian_status = analyticsFilters.status;
    if (analyticsFilters.personType !== 'all') params.person_type = analyticsFilters.personType;
    if (analyticsFilters.search) params.search = analyticsFilters.search;
    axiosInstance.get(`${API_BASE}/${reportId}/party-pivot/`, { params })
      .then(({ data }) => { if (!cancelled) setPivot(data); })
      .catch(() => { if (!cancelled) setPivot(null); })
      .finally(() => { if (!cancelled) setPivotLoading(false); });
    return () => { cancelled = true; };
  }, [activeTab, mode, reportId, saveState, analyticsFilters, pivotDimension]);

  const exportPivot = useCallback(() => {
    if (mode !== 'api' || !reportId) {
      setToast('خروجی اکسل پیوت پس از استقرار بک‌اند در دسترس است.');
      return;
    }
    const params = { direction: BACKEND_DIRECTION, dimension: pivotDimension };
    if (analyticsFilters.kind !== 'all') params.kind = analyticsFilters.kind;
    if (analyticsFilters.status !== 'all') params.moadian_status = analyticsFilters.status;
    if (analyticsFilters.personType !== 'all') params.person_type = analyticsFilters.personType;
    if (analyticsFilters.search) params.search = analyticsFilters.search;
    setPivotExporting(true);
    axiosInstance.get(`${API_BASE}/${reportId}/party-pivot-export/`, { params, responseType: 'blob' })
      .then((response) => {
        const blob = new Blob([response.data], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `seasonal-party-pivot-${yearKey || 'year'}-q${quarter}-${pivotDimension}.xlsx`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(link.href);
        setToast('اکسل پیوت طرف حساب ساخته شد');
      })
      .catch(() => setToast('خروجی اکسل پیوت در دسترس نیست.'))
      .finally(() => setPivotExporting(false));
  }, [mode, reportId, pivotDimension, analyticsFilters, yearKey, quarter]);

  /* خروجی اکسل گزارش تحلیلی با همان فیلترها */
  const exportAnalytics = useCallback(() => {
    if (mode !== 'api' || !reportId) {
      setToast('خروجی اکسل گزارش پس از استقرار بک‌اند در دسترس است.');
      return;
    }
    const params = { direction: BACKEND_DIRECTION };
    if (analyticsFilters.kind !== 'all') params.kind = analyticsFilters.kind;
    if (analyticsFilters.status !== 'all') params.moadian_status = analyticsFilters.status;
    if (analyticsFilters.personType !== 'all') params.person_type = analyticsFilters.personType;
    if (analyticsFilters.search) params.search = analyticsFilters.search;
    setAnalyticsExporting(true);
    axiosInstance.get(`${API_BASE}/${reportId}/analytics-export/`, { params, responseType: 'blob' })
      .then((response) => {
        const blob = new Blob([response.data], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        const suffix = [
          analyticsFilters.kind !== 'all' ? `k${analyticsFilters.kind}` : '',
          analyticsFilters.status !== 'all' ? analyticsFilters.status : '',
        ].filter(Boolean).join('-');
        link.download = `seasonal-analytics-${yearKey || 'year'}-q${quarter}${suffix ? `-${suffix}` : ''}.xlsx`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(link.href);
        setToast('اکسل گزارش تحلیلی ساخته شد');
      })
      .catch(() => setToast('خروجی اکسل گزارش در دسترس نیست.'))
      .finally(() => setAnalyticsExporting(false));
  }, [mode, reportId, analyticsFilters, yearKey, quarter]);

  /* افزودن ردیف‌های «فقط در دفاتر» به جدول ورود داده */
  const addSuggestedRows = useCallback((suggested) => {
    const rows_ = (suggested || []).map((row) => ({
      ...emptyRow(),
      ...row,
      id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      amount: row.amount ? String(row.amount) : '',
      vat: row.vat ? String(row.vat) : '',
      invoiceDate: row.invoiceDate || '',
    }));
    if (!rows_.length) return;
    setRows((previous) => {
      const fillers = previous.filter((item) => !isBlankRow(item));
      const tail = previous.filter((item) => isBlankRow(item)).slice(-1);
      return [...fillers, ...rows_, ...(tail.length ? tail : [emptyRow()])];
    });
    setActiveTab('data');
    setToast(`${toPersianDigits(rows_.length)} ردیف از دفاتر به جدول اضافه شد — بازبینی و ذخیره لازم است`);
  }, []);

  /* ردیف بعدی همیشه خودکار ساخته می‌شود */
  useEffect(() => {
    setRows((previous) => (
      previous.length && !isBlankRow(previous[previous.length - 1])
        ? [...previous, emptyRow()]
        : previous
    ));
  }, [rows]);

  const updateCell = useCallback((id, field, value) => {
    setRows((previous) => previous.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  }, []);

  /* تغییر نوع فروشنده: تجمیعی → نام‌ها «متفرقه» و بقیه «—»؛ خارجی → کشور خالی؛ بقیه → ایران */
  const changePersonType = useCallback((row, value) => {
    setRows((previous) => previous.map((item) => {
      if (item.id !== row.id) return item;
      const base = item.personType === 'aggregate' && value !== 'aggregate'
        ? clearAggregateDefaults(item)
        : item;
      if (value === 'aggregate') {
        return aggregateDefaults(base, { forceNames: true });
      }
      let country = base.country;
      if (value === 'foreign') {
        if (!country || country === DEFAULT_COUNTRY || isPlaceholder(country)) country = '';
      } else if (!country || isPlaceholder(country)) {
        country = DEFAULT_COUNTRY;
      }
      return { ...base, personType: value, country };
    }));
  }, []);

  /* انتخاب طرف معامله از پیشنهادها برای همهٔ انواع: نوع، نام/نام خانوادگی، شناسه،
     کد پستی، کشور، شهر و آدرس از حافظهٔ همان طرف پر می‌شود */
  const applyParty = useCallback((id, party) => {
    setRows((previous) => previous.map((row) => {
      if (row.id !== id) return row;
      /* ردیف تجمیعی: فقط نام نمایشی جایگزین می‌شود و نوع تغییر نمی‌کند */
      if (row.personType === 'aggregate') {
        return { ...row, name: party.name || partyDisplay(party) };
      }
      const personType = inferPersonType(party);
      const isNatural = personType === 'natural';
      let firstName = '';
      let lastName = '';
      let name = normalizeName(party.name || '');
      if (isNatural) {
        firstName = normalizeName(party.firstName || '');
        lastName = normalizeName(party.lastName || '');
        if (!firstName && !lastName) {
          /* داده‌های قدیمی فقط «نام کامل» دارند → تفکیک خودکار */
          const parts = normalizeName(party.name || partyDisplay(party)).split(/\s+/).filter(Boolean);
          firstName = parts.length > 1 ? parts.slice(0, -1).join(' ') : (parts[0] || '');
          lastName = parts.length > 1 ? parts[parts.length - 1] : '';
        }
        name = normalizeName([firstName, lastName].filter(Boolean).join(' '));
      } else if (!name) {
        name = partyDisplay(party);
      }
      /* خارجی: کشور خودِ طرف (یا خالی تا کاربر بنویسد) — بقیه: پیش‌فرض «ایران» */
      const partyCountry = isPlaceholder(party.country) ? '' : party.country;
      const country = personType === 'foreign'
        ? (partyCountry || (row.personType === 'foreign' && !isPlaceholder(row.country) ? row.country : ''))
        : DEFAULT_COUNTRY;
      const text = (value, fallback = '') => (isPlaceholder(value) ? fallback : (value || fallback));
      return {
        ...row,
        personType,
        name,
        firstName,
        lastName,
        country,
        nationalId: text(party.nationalId, text(row.nationalId)),
        postalCode: text(party.postalCode, text(row.postalCode)),
        city: text(party.city, text(row.city)),
        address: text(party.address, text(row.address)),
      };
    }));
  }, []);

  const removeRow = useCallback((id) => {
    setRows((previous) => previous.filter((row) => row.id !== id));
  }, []);

  const duplicateRow = useCallback((id) => {
    setRows((previous) => {
      const index = previous.findIndex((row) => row.id === id);
      if (index === -1) return previous;
      const copy = { ...previous[index], id: emptyRow().id, invoiceNo: '' };
      return [...previous.slice(0, index + 1), copy, ...previous.slice(index + 1)];
    });
    setToast('ردیف کپی شد — شماره فاکتور را وارد کنید');
  }, []);


  /* ردیف‌های دارای داده و نگاشت شمارهٔ پایدار ردیف */
  const filledRows = useMemo(() => rows.filter((row) => !isBlankRow(row)), [rows]);
  const indexById = useMemo(() => {
    const map = new Map();
    filledRows.forEach((row, index) => map.set(row.id, index));
    return map;
  }, [filledRows]);
  /* شمارهٔ ردیف از طریق ref خوانده می‌شود تا ستون‌ها پایدار بمانند (رندر مجدد کل جدول) */
  const indexByIdRef = useRef(indexById);
  indexByIdRef.current = indexById;

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = filledRows;
    if (term) {
      list = list.filter((row) => [
        row.name, row.firstName, row.lastName, row.city, row.address, row.nationalId,
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
  const issuesForRow = useCallback((row) => issuesByRow.get(String(row.id)) || [], [issuesByRow]);

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


  /* اعتبارسنجی: سرور (مرجع نهایی) یا موتور قواعد محلی */
  const runValidation = () => {
    if (mode === 'api' && reportId) {
      /* ابتدا ردیف‌های در حال ویرایش ذخیره می‌شوند تا اعتبارسنجی روی همان داده باشد */
      flushSave().then(() => {
        setSaveState('saving');
        return axiosInstance.post(`${API_BASE}/${reportId}/validate/`, { direction: BACKEND_DIRECTION });
      })
        .then(({ data }) => {
          setIssues(data.issues || []);
          const summary = data.summary || {};
          setToast(
            summary.errors
              ? `${toPersianDigits(summary.errors)} خطا و ${toPersianDigits(summary.warnings || 0)} هشدار یافت شد`
              : `بدون خطا — ${toPersianDigits(summary.warnings || 0)} هشدار`,
          );
        })
        .catch(() => {
          const result = localValidate(filledRows, period.start, period.end, reference);
          setIssues(result.issues);
          setToast('اعتبارسنجی سرور در دسترس نبود؛ موتور قواعد محلی اجرا شد.');
        })
        .finally(() => setSaveState('idle'));
      return;
    }
    const result = localValidate(filledRows, period.start, period.end, reference);
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
      flushSave()
        .then(() => axiosInstance.get(`${API_BASE}/${reportId}/export/`, { responseType: 'blob' }))
        .then((response) => {
          const blob = new Blob([response.data], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = `seasonal-purchase-${yearKey || 'year'}-q${quarter}.xlsx`;
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
      'ردیف', 'نوع فروشنده', 'نام شرکت / عنوان', 'نام', 'نام خانوادگی',
      'شناسه ملی / کد ملی', 'مشمول معاملات فصلی', 'کد پستی', 'کشور', 'شهر', 'آدرس',
      'شرح کالا / خدمات', 'نوع کالا یا خدمات', 'مبلغ خرید (ریال)',
      'مالیات بر ارزش افزوده', 'جمع کل', 'نوع معامله', 'تاریخ فاکتور',
      'شماره فاکتور', 'وضعیت سامانه مودیان',
    ];
    const escape = (value) => String(value ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const personLabel = (value) => (PERSON_TYPES.find((type) => type.value === value) || {}).label || '';
    const body = filledRows.map((row, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escape(personLabel(row.personType))}</td>
        <td>${escape(row.name)}</td>
        <td>${escape(row.firstName)}</td>
        <td>${escape(row.lastName)}</td>
        <td style="mso-number-format:'\\@'">${escape(row.nationalId)}</td>
        <td>بله</td>
        <td style="mso-number-format:'\\@'">${escape(row.postalCode)}</td>
        <td>${escape(row.country)}</td>
        <td>${escape(row.city)}</td>
        <td>${escape(row.address)}</td>
        <td>${escape(row.description)}</td>
        <td>سایر</td>
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
      <h3>صورت معاملات فصلی خرید — ${escape(yearLabel)} — ${escape(quarterLabel)}</h3>
      <table><thead><tr>${headers.map((header) => `<th>${header}</th>`).join('')}</tr></thead>
      <tbody>${body}</tbody>
      <tfoot><tr><td colspan="13">جمع کل خرید</td><td>${totals.amount}</td><td>${totals.vat}</td>
      <td>${totals.total}</td><td colspan="4"></td></tr></tfoot></table></body></html>`;
    const blob = new Blob([`\uFEFF${html}`], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `seasonal-purchase-${yearKey || 'year'}-q${quarter}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
    setToast('فایل اکسل ساخته شد');
  };

  /* خروجی TTMS: فقط از سرور و با هشدار «آزمایش‌نشده» */
  const exportTtms = () => {
    if (mode !== 'api' || !reportId) {
      setToast('خروجی TTMS فقط در حالت اتصال به سرور و پس از استقرار بک‌اند در دسترس است.');
      return;
    }
    const confirmed = typeof window.confirm === 'function'
      ? window.confirm(
        'خروجی TTMS «آزمایش‌نشده» است: قالب رسمی نسخهٔ هدف در دسترس نبود.\n'
        + 'این فایل پیش‌نویس ساختاری است و پیش از ارسال رسمی باید با نسخهٔ TTMS آزمون شود.\n\n'
        + 'ادامه می‌دهید؟',
      )
      : true;
    if (!confirmed) return;

    flushSave()
      .then(() => axiosInstance.get(`${API_BASE}/${reportId}/export-ttms/`, { responseType: 'blob' }))
      .then((response) => {
        const blob = new Blob([response.data], { type: 'application/zip' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `ttms-draft-purchase-${yearKey || 'year'}-q${quarter}.zip`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(link.href);
        setToast('بستهٔ پیش‌نویس TTMS ساخته شد (آزمایش‌نشده).');
      })
      .catch(() => setToast('خروجی TTMS در دسترس نیست.'));
  };

  /* چاپ / PDF مرورگر */
  const printReport = () => {
    const printable = typeof window.open === 'function' ? window.open('', '_blank') : null;
    if (!printable) { setToast('امکان باز کردن پنجرهٔ چاپ نیست.'); return; }
    const rowsHtml = filledRows.map((row, index) => `
      <tr>
        <td>${toPersianDigits(index + 1)}</td>
        <td>${(PERSON_TYPES.find((type) => type.value === row.personType) || {}).label || ''}</td>
        <td>${row.name}</td>
        <td>${row.firstName || ''}</td>
        <td>${row.lastName || ''}</td>
        <td>${toPersianDigits(row.nationalId)}</td>
        <td>${formatPersianNumber(num(row.amount))}</td>
        <td>${formatPersianNumber(num(row.vat))}</td>
        <td>${formatPersianNumber(totalOf(row))}</td>
        <td>${jalaliText(row.invoiceDate)}</td>
        <td>${row.invoiceNo}</td>
      </tr>`).join('');
    const rulesetNote = rulesetStatus === 'verified'
      ? 'تأییدشده'
      : `تأییدنشده (نسخهٔ ${reference?.ruleset_version || 'نامشخص'})`;
    printable.document.write(`<html dir="rtl" lang="fa"><head><meta charset="utf-8" />
      <title>صورت معاملات فصلی خرید</title>
      <style>body{font-family:Tahoma;padding:16px}table{width:100%;border-collapse:collapse}
      th,td{border:1px solid #888;padding:4px;font-size:11px;text-align:center}
      h3{margin:0 0 4px}.note{font-size:10px;color:#92400e;margin:0 0 8px}</style></head><body>
      <h3>صورت معاملات فصلی خرید — ${yearLabel} — ${quarterLabel}</h3>
      <p class="note">وضعیت قواعد/قالب TTMS: ${rulesetNote}</p>
      <table><thead><tr><th>ردیف</th><th>نوع</th><th>نام شرکت / عنوان</th><th>نام</th>
      <th>نام خانوادگی</th><th>شناسه/کد ملی</th><th>مبلغ</th><th>مالیات</th>
      <th>جمع کل</th><th>تاریخ</th><th>شماره فاکتور</th>
      </tr></thead><tbody>${rowsHtml}</tbody></table></body></html>`);
    printable.document.close();
    printable.focus();
    printable.print();
  };


  /* دفتر طرف‌های معامله: ردیف‌های همین جدول (هر چهار نوع) + فصل‌های قبلیِ ذخیره‌شده در همین مرورگر + حافظهٔ طرف‌ها
     محاسبهٔ دفتر فقط وقتی هویت طرف‌ها تغییر کند انجام می‌شود، نه با هر کلید مبلغ/توضیحات */
  /* اثر انگشت سبکِ هویت طرف‌ها: با هر کلید مبلغ/توضیحات تغییر نمی‌کند و ساخت رشتهٔ بزرگ هم ندارد */
  const partySignature = useMemo(() => {
    let hash = rows.length;
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const text = `${row.personType}|${row.name}|${row.firstName}|${row.lastName}|${row.nationalId}`
        + `|${row.country}|${row.city}|${row.address}|${row.postalCode}`;
      for (let position = 0; position < text.length; position += 1) {
        hash = (hash * 33 + text.charCodeAt(position)) | 0;
      }
    }
    return hash;
  }, [rows]);
  const rowsSnapshotRef = useRef(rows);
  rowsSnapshotRef.current = rows;

  const partyDirectory = useMemo(() => {
    const map = new Map();
    const addParty = (party) => {
      const label = partyDisplay(party);
      if (!label || label.length < 3 || label === AGGREGATE_NAME || isPlaceholder(label)) return;
      const key = label.toLowerCase();
      const previous = map.get(key) || {};
      const personType = party.personType || previous.personType || inferPersonType(party);
      map.set(key, {
        label,
        personType,
        name: normalizeName(party.name) || previous.name || '',
        firstName: party.firstName || previous.firstName || '',
        lastName: party.lastName || previous.lastName || '',
        nationalId: isPlaceholder(party.nationalId) ? (previous.nationalId || '') : (party.nationalId || previous.nationalId || ''),
        postalCode: isPlaceholder(party.postalCode) ? (previous.postalCode || '') : (party.postalCode || previous.postalCode || ''),
        country: isPlaceholder(party.country) ? (previous.country || '') : (party.country || previous.country || ''),
        city: isPlaceholder(party.city) ? (previous.city || '') : (party.city || previous.city || ''),
        address: isPlaceholder(party.address) ? (previous.address || '') : (party.address || previous.address || ''),
      });
    };

    const addRow = (row) => {
      if (!row || typeof row !== 'object') return;
      const resolvedType = row.personType || inferPersonType(row);
      if (resolvedType === 'aggregate') return;
      const hasParts = !isEmpty(row.firstName) || !isEmpty(row.lastName);
      addParty({
        personType: resolvedType,
        name: hasParts ? '' : (row.name || ''),
        firstName: row.firstName,
        lastName: row.lastName,
        nationalId: row.nationalId,
        postalCode: row.postalCode,
        city: row.city,
        address: row.address,
        country: row.country,
      });
    };

    /* فصل‌های دیگر که قبلاً در همین مرورگر وارد شده‌اند (حافظهٔ دائمی طرف‌ها) */
    storedRows.forEach(addRow);
    rowsSnapshotRef.current.forEach(addRow);
    parties.forEach(addParty);
    return [...map.values()];
    /* rows از طریق ref خوانده می‌شود؛ کلید تغییر همان اثرانگشت هویتی است */
  }, [partySignature, parties, storedRows]);

  const partyOptions = useMemo(() => {
    /* حذف نام‌های کوتاه‌ترِ پیشوندی برای شرکت‌ها (بر اساس مرتب‌سازی، بدون مقایسهٔ دوبه‌دو) */
    const naturalParties = partyDirectory.filter((party) => party.personType === 'natural');
    const companyParties = partyDirectory
      .filter((party) => party.personType !== 'natural')
      .sort((a, b) => partyDisplay(a).localeCompare(partyDisplay(b), 'fa'));
    return [...naturalParties, ...companyParties.filter((party, index, list) => {
      const next = list[index + 1];
      return !(next && partyDisplay(next).toLowerCase().startsWith(partyDisplay(party).toLowerCase()));
    })];
  }, [partyDirectory]);

  const partyOptionsJson = useMemo(() => JSON.stringify(partyOptions), [partyOptions]);
  /* ذخیرهٔ حافظهٔ طرف‌ها با تأخیر (نه با هر کلید تایپ) */
  const partiesWriteTimerRef = useRef(null);
  useEffect(() => {
    if (partiesWriteTimerRef.current) window.clearTimeout(partiesWriteTimerRef.current);
    partiesWriteTimerRef.current = window.setTimeout(() => {
      partiesWriteTimerRef.current = null;
      writeJson(PARTIES_KEY, JSON.parse(partyOptionsJson));
    }, 800);
    return () => {
      if (partiesWriteTimerRef.current) window.clearTimeout(partiesWriteTimerRef.current);
    };
  }, [partyOptionsJson]);


  /* الزامات خرید: اتحاد فیلدهای اجباری همهٔ انواع فروشنده (برای ستارهٔ سرستون) */
  const requiredUnion = useMemo(() => {
    const source = reference?.required || LOCAL_REFERENCE.required;
    const set = new Set();
    Object.values(source).forEach((fields) => (fields || []).forEach((field) => set.add(field)));
    return set;
  }, [reference]);

  const colLabel = useCallback((text, internalField) => (
    <Box component="span" sx={{ whiteSpace: 'nowrap' }}>
      {text}
      {requiredUnion.has(internalField) ? (
        <Box component="span" sx={{ color: '#dc2626', ml: 0.25 }}>*</Box>
      ) : null}
    </Box>
  ), [requiredUnion]);

  /* فیلد اجباریِ خالی برای همین نوع فروشنده → خط زیرین قرمز در سلول */
  const cellSxFor = useCallback((row, internalField) => {
    const required = requiredFor(reference, row.personType).includes(internalField);
    const uiField = FIELD_MAP[internalField];
    if (!required || !uiField || !isEmpty(row[uiField])) return cellInputSx;
    return {
      ...cellInputSx,
      '& .MuiInput-underline:before': { borderBottomColor: '#dc2626' },
      '& .MuiInput-underline:hover:before': { borderBottomColor: '#dc2626' },
    };
  }, [reference, cellInputSx]);

  /* ستون‌ها یک‌بار ساخته می‌شوند؛ ستون‌های پایدار باعث می‌شوند با هر کلید فقط همان ردیف رندر شود */
  const tableColumns = useMemo(() => [
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
            <Typography noWrap sx={{ color: MUTED }}>{toPersianDigits((indexByIdRef.current.get(row.id) ?? 0) + 1)}</Typography>
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
      label: colLabel('نام و نام خانوادگی / نام شرکت', 'name'),
      width: '16%',
      render: (row) => {
        if (row.personType === 'natural') {
          /* حقیقی: دو فیلد جدا — هر دو هم پیشنهاد از حافظهٔ طرف‌ها می‌دهند */
          return (
            <Box sx={{ display: 'flex', gap: 0.75 }}>
              <PartyAutocomplete
                value={row.firstName}
                options={partyOptions}
                onInputChange={(value) => updateCell(row.id, 'firstName', value)}
                onSelect={(party) => applyParty(row.id, party)}
                placeholder="نام"
                ariaLabel="نام"
                sx={cellSxFor(row, 'first_name')}
                cellFontPx={cellFontPx}
              />
              <PartyAutocomplete
                value={row.lastName}
                options={partyOptions}
                onInputChange={(value) => updateCell(row.id, 'lastName', value)}
                onSelect={(party) => applyParty(row.id, party)}
                placeholder="نام خانوادگی"
                ariaLabel="نام خانوادگی"
                sx={cellSxFor(row, 'last_name')}
                cellFontPx={cellFontPx}
              />
            </Box>
          );
        }
        /* حقوقی/خارجی/تجمیعی: یک فیلد نام — تجمیعی اختیاری است اما پیشنهاد هم دارد */
        return (
          <PartyAutocomplete
            value={row.name}
            options={partyOptions}
            onInputChange={(value) => updateCell(row.id, 'name', value)}
            onSelect={(party) => applyParty(row.id, party)}
            placeholder={row.personType === 'aggregate' ? 'تجمیعی — نام اختیاری' : 'نام شرکت / عنوان…'}
            ariaLabel="نام شرکت"
            sx={cellSxFor(row, 'name')}
            cellFontPx={cellFontPx}
          />
        );
      },
    },
    {
      key: 'personType',
      label: colLabel('نوع فروشنده', 'person_type'),
      width: '7%',
      align: 'center',
      render: (row) => (
        <CellSelect
          value={row.personType}
          onChange={(value) => changePersonType(row, value)}
          ariaLabel="نوع فروشنده"
          options={PERSON_TYPES}
          sx={cellInputSx}
          fontSize={cellFontPx}
        />
      ),
    },
    {
      key: 'nationalId',
      label: colLabel('شناسه ملی / کد ملی', 'national_id'),
      width: '9%',
      align: 'center',
      render: (row) => (
        <DigitField
          value={row.nationalId}
          onChange={(value) => updateCell(row.id, 'nationalId', value)}
          placeholder={row.personType === 'natural' ? 'کد ملی ۱۰ رقمی' : 'شناسه ملی ۱۱ رقمی'}
          numeric
          maxLength={11}
          sx={cellSxFor(row, 'national_id')}
        />
      ),
    },
    {
      key: 'postalCode',
      label: colLabel('کد پستی', 'postal_code'),
      width: '6%',
      align: 'center',
      render: (row) => (
        <DigitField value={row.postalCode} onChange={(value) => updateCell(row.id, 'postalCode', value)}
          placeholder="۱۰ رقمی" numeric maxLength={10} sx={cellSxFor(row, 'postal_code')} />
      ),
    },
    {
      key: 'country',
      label: colLabel('کشور', 'country'),
      width: '5%',
      render: (row) => (
        <CellTextField value={row.country} onChange={(value) => updateCell(row.id, 'country', value)}
          placeholder={row.personType === 'foreign' ? 'کشور' : '—'} sx={cellSxFor(row, 'country')} />
      ),
    },
    {
      key: 'city',
      label: 'شهر',
      width: '6%',
      render: (row) => (
        <CellTextField value={row.city} onChange={(value) => updateCell(row.id, 'city', value)}
          placeholder="شهر" sx={cellInputSx} />
      ),
    },
    {
      key: 'address',
      label: 'آدرس',
      width: '11%',
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
      label: colLabel('مبلغ', 'amount'),
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
      label: colLabel('تاریخ فاکتور', 'invoice_date'),
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
      label: colLabel('شماره فاکتور', 'invoice_no'),
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
  ], [
    cellFontPx, cellInputSx, cellSxFor, colLabel, applyParty, changePersonType,
    duplicateRow, issuesForRow, partyOptions, removeRow, updateCell,
  ]);


  return (
    <>
      <PageHeader
        icon={<CalendarViewMonthIcon sx={{ fontSize: 26 }} />}
        title="معاملات فصلی خرید"
        subtitle="ماده ۱۶۹ مکرر — ثبت، اعتبارسنجی پویا و خروجی‌های خرید (فروش در نسخهٔ بعد)"
        color="#d97706"
        actions={(
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Button variant="outlined" size="small" startIcon={<RuleOutlinedIcon />} onClick={runValidation}>
              اعتبارسنجی
            </Button>
            <Button variant="outlined" size="small" startIcon={<PrintIcon />} onClick={printReport}>
              چاپ
            </Button>
            <Button variant="outlined" size="small" startIcon={<DownloadIcon />} onClick={exportTtms}>
              خروجی TTMS
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

        <Typography
          sx={{
            fontSize: 10.5,
            color: rulesetStatus === 'verified' ? '#15803d' : '#b45309',
            border: '1px dashed',
            borderColor: rulesetStatus === 'verified' ? 'rgba(21,128,61,0.4)' : 'rgba(180,83,9,0.4)',
            borderRadius: '6px',
            px: 0.75,
            py: 0.25,
          }}
          title={`نسخهٔ قواعد: ${reference?.ruleset_version || 'نامشخص'}`}
        >
          {rulesetStatus === 'verified'
            ? 'قواعد تأییدشدهٔ قالب هدف'
            : 'قواعد/قالب TTMS تأییدنشده'}
        </Typography>

        <Box sx={{ flex: 1 }} />

        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
          {saveState === 'saving' ? 'در حال ذخیره…' : null}
          {saveState === 'saved' ? (mode === 'api' ? 'ذخیره شد' : 'ذخیرهٔ محلی') : null}
          {saveState === 'error' ? 'ذخیره در سرور ناموفق بود' : null}
        </Typography>
      </Paper>

      <Box sx={{ mb: 1 }}>
        <Tabs
          value={activeTab}
          onChange={(_event, value) => setActiveTab(value)}
          variant="scrollable"
          allowScrollButtonsMobile
          sx={{ minHeight: 34, '& .MuiTab-root': { minHeight: 34, fontSize: 11.5, py: 0.4 } }}
        >
          <Tab value="data" label="ورود داده" />
          <Tab value="analytics" label="گزارش‌ها و تحلیل" />
          <Tab value="reconcile" label="مغایرت‌گیری با دفاتر" />
        </Tabs>
      </Box>

      {activeTab === 'analytics' ? (
        <>
          <SeasonalAnalyticsPanel
            analytics={analytics}
            rows={filledRows}
            loading={analyticsLoading}
            error={analyticsError}
            filters={analyticsFilters}
            onFilterChange={setAnalyticsFilters}
            onExport={exportAnalytics}
            exporting={analyticsExporting}
          />
          <Box sx={{ mt: 1.25 }}>
            <SeasonalPartyPivot
              pivot={pivot}
              rows={filledRows}
              filters={analyticsFilters}
              dimension={pivotDimension}
              onDimensionChange={setPivotDimension}
              onExport={exportPivot}
              exporting={pivotExporting}
              loading={pivotLoading}
            />
          </Box>
        </>
      ) : null}

      {activeTab === 'reconcile' ? (
        <SeasonalReconcilePanel
          reportId={reportId}
          apiBase={API_BASE}
          mode={mode}
          onAddRows={addSuggestedRows}
          onToast={setToast}
        />
      ) : null}

      {activeTab === 'data' ? (
        <>
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
            virtualize
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
        </>
      ) : null}

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

