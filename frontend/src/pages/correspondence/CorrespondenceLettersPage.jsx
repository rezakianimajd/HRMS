import React, { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../core/api/axiosConfig';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, FormControlLabel, IconButton, MenuItem, Paper, Stack, Switch,
  Tab, Table, TableBody, TableCell, TableRow, Tabs, TextField, Tooltip, Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import JalaliMaskedDateInput from '../../core/components/ui/JalaliMaskedDateInput';
import ArchiveIcon from '@mui/icons-material/Archive';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import EditNoteIcon from '@mui/icons-material/EditNote';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ForwardToInboxIcon from '@mui/icons-material/ForwardToInbox';
import InboxIcon from '@mui/icons-material/MoveToInbox';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import ReplyIcon from '@mui/icons-material/Reply';
import SaveIcon from '@mui/icons-material/Save';
import SendIcon from '@mui/icons-material/Send';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { formatPersianNumber, toEnglishDigits, toPersianDigits } from '../../core/utils/numberUtils';
import PageHeader from '../../core/components/ui/PageHeader';
import { MUTED } from '../accounting/AccountingDashboardUI';
import {
  ModulePager, ModuleTable, ModuleToolbar, useModuleTheme, useRowHeight,
} from '../contracts/contractModuleUi';
import {
  ACCENT, CONFIDENTIALITY_META, DANGER, DIRECTION_META, EVENT_META, INCOMING, INTERNAL, KpiTile,
  OK, OUTGOING, PRIORITY_META, REFERRAL_STATUS_META, SLATE, STATUS_META, WARN, chipSx,
  dateLabel, dateTimeLabel, daysBetween, daysColor, daysLabel, money, timeLabel, MetaChip,
} from './correspondenceUi';
import {
  PartyPicker, PersonnelPicker, partyValue, personValue,
} from './correspondenceLookups';

const LETTERS_KEY = ['correspondence-letters'];
const META_KEY = ['correspondence-meta'];
const STATS_KEY = ['correspondence-stats'];
const REFERRALS_KEY = ['correspondence-my-referrals'];
const USERS_KEY = ['correspondence-users'];
const CONTACTS_KEY = ['correspondence-contacts'];

const EMPTY_LETTER = {
  direction: 'incoming',
  category: '',
  series: '',
  number: '',
  indicator_no: '',
  transmittal_no: '',
  external_number: '',
  letter_date: new Date().toISOString().slice(0, 10),
  received_date: '',
  sent_date: '',
  due_date: '',
  entry_method: 'manual',
  entry_time: '',
  entered_by: '',
  entered_by_name: '',
  company_reg_no: '',
  company_reg_date: '',
  unit_reg_no: '',
  unit_reg_date: '',
  unit_name: '',
  organization: '',
  correspondent: '',
  sender_organization: '',
  sender_name: '',
  sender_title: '',
  receiver_name: '',
  sender_employee: '',
  receiver_employee: '',
  sender_party: '',
  party_account: '',
  delivery_type: 'in_person',
  delivered_by: '',
  delivered_by_name: '',
  drafter: '',
  drafter_name: '',
  priority: 'normal',
  confidentiality: 'normal',
  subject: '',
  summary: '',
  body: '',
  amount: '',
  contract_number: '',
  archive_ref: '',
  register: false,
};

const ENTRY_METHOD_META = {
  automation: { label: 'اتوماسیون', color: OUTGOING },
  manual: { label: 'دستی', color: WARN },
  email: { label: 'پست الکترونیک', color: INCOMING },
  post: { label: 'پست / مرسوله', color: INTERNAL },
  other: { label: 'سایر', color: SLATE },
};

const DELIVERY_TYPE_META = {
  in_person: { label: 'حضوری / دستی', color: WARN },
  post: { label: 'پست / مرسوله', color: INTERNAL },
  email: { label: 'پست الکترونیک', color: INCOMING },
  fax: { label: 'دورنگار', color: SLATE },
  courier: { label: 'پیک', color: OUTGOING },
  scanner: { label: 'اسکنر / بارگذاری', color: ACCENT },
  automation: { label: 'اتوماسیون اداری', color: OK },
  other: { label: 'سایر', color: '#64748b' },
};

const REFERRAL_PURPOSE_META = {
  action: { label: 'اقدام / انجام کار', color: WARN },
  info: { label: 'اطلاع / مشاهده', color: INCOMING },
  comment: { label: 'اظهارنظر', color: INTERNAL },
};

const asList = (payload) => (Array.isArray(payload) ? payload : payload?.results || []);

/**
 * هر آیتم منوی مکاتبات صفحهٔ مستقل خودش را دارد تا کاربر بدون فیلترِ اضافه
 * (مثلاً «جهت» که از قبل مشخص است) وارد فهرست مربوطه شود.
 */
export const LETTER_PAGE_PRESETS = {
  all: {
    title: 'دفتر مکاتبات اداری',
    icon: MailOutlineIcon,
    accent: ACCENT,
  },
  incoming: {
    title: 'نامه‌های وارده',
    icon: InboxIcon,
    accent: INCOMING,
    direction: 'incoming',
  },
  outgoing: {
    title: 'نامه‌های صادره',
    icon: SendIcon,
    accent: OUTGOING,
    direction: 'outgoing',
  },
  internal: {
    title: 'مکاتبات داخلی',
    icon: MailOutlineIcon,
    accent: INTERNAL,
    direction: 'internal',
  },
  drafts: {
    title: 'پیش‌نویس‌های مکاتبات',
    icon: EditNoteIcon,
    accent: SLATE,
    status: 'draft',
  },
  referrals: {
    title: 'ارجاعات من',
    icon: ForwardToInboxIcon,
    accent: WARN,
    scope: 'referred',
  },
  overdue: {
    title: 'پیگیری معوقات',
    icon: WarningAmberIcon,
    accent: DANGER,
    overdue: true,
  },
  archive: {
    title: 'بایگانی مکاتبات',
    icon: ArchiveIcon,
    accent: '#334155',
    archived: true,
  },
};

const userLabel = (row) => {
  if (!row) return '';
  const full = [row.first_name, row.last_name].filter(Boolean).join(' ').trim();
  return row.full_name || full || row.username || row.name || String(row.id || '');
};

const safeDate = (value) => (value ? String(value).slice(0, 10) : '');

const cleanPayload = (form) => {
  const payload = {};
  Object.entries(form).forEach(([key, value]) => {
    if (key === 'register') return;
    if (value === '' || value === null || value === undefined) return;
    payload[key] = value;
  });
  if (payload.amount) payload.amount = Number(payload.amount) || 0;
  else delete payload.amount;
  return payload;
};

/**
 * ویرایش درجا در جدول (همان الگوی «ورود اطلاعات فصلی»):
 * در حالت ویرایش، سلول‌های قابل تغییر به ورودی کوچک تبدیل می‌شوند و
 * تنها همان ردیف با «ذخیره» به سرور فرستاده می‌شود.
 */
const inlineSx = {
  minWidth: 0,
  '& .MuiInputBase-root': { fontSize: 11.5 },
  '& .MuiInputBase-input': { py: 0.4, height: '18px' },
  '& .MuiInputLabel-root': { display: 'none' },
  '& .MuiFormHelperText-root': { display: 'none' },
  '& .MuiAutocomplete-inputRoot': { py: 0.25, px: 0.25 },
};

const InlineText = ({ value, onChange, placeholder, align = 'right', onEnter, onEscape }) => (
  <TextField
    value={value ?? ''}
    onChange={(event) => onChange(event.target.value)}
    onKeyDown={(event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        onEnter?.();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        onEscape?.();
      }
    }}
    size="small"
    variant="standard"
    fullWidth
    placeholder={placeholder}
    inputProps={{ style: { textAlign: align, padding: 0 } }}
    InputProps={{ disableUnderline: true }}
    sx={inlineSx}
  />
);

const InlineSelect = ({ value, onChange, options, onEscape }) => (
  <TextField
    select
    size="small"
    variant="standard"
    fullWidth
    value={value ?? ''}
    onChange={(event) => onChange(event.target.value)}
    onKeyDown={(event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onEscape?.();
      }
    }}
    InputProps={{ disableUnderline: true }}
    sx={inlineSx}
  >
    <MenuItem value="">—</MenuItem>
    {(options || []).map((option) => (
      <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
    ))}
  </TextField>
);

const InlineDate = ({ value, onChange, onEnter }) => (
  <JalaliMaskedDateInput
    value={value || ''}
    onChange={(next) => onChange(next || '')}
    onEnter={onEnter}
    variant="standard"
    sx={inlineSx}
  />
);

/** بخش‌بندی فرم با رنگ و جداکننده (بدون توضیح زیر عنوان). */
const FormSection = ({ icon: Icon, title, color = ACCENT, children }) => (
  <Box sx={{ mb: 1.75 }}>
    <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.75, minWidth: 0 }}>
      <Box sx={{
        width: 28, height: 28, borderRadius: '8px', flex: '0 0 auto',
        display: 'grid', placeItems: 'center', bgcolor: alpha(color, 0.12), color,
      }}>
        <Icon sx={{ fontSize: 16 }} />
      </Box>
      <Typography noWrap sx={{ fontSize: 13, fontWeight: 900, color, flex: '0 0 auto' }}>
        {title}
      </Typography>
      <Divider sx={{ flex: 1, borderColor: alpha(color, 0.3) }} />
    </Stack>
    {children}
  </Box>
);

const chunkArray = (items, size) => {
  const rows = [];
  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }
  return rows;
};

/** جدول ورود اطلاعات (هم‌سبک با ورود اطلاعات جدول معاملات فصلی). */
const FormTable = ({ children, columns = 3 }) => {
  const cells = React.Children.toArray(children);
  const rows = chunkArray(cells, columns);
  return (
    <Table size="small" sx={{
      tableLayout: 'fixed',
      '& td': {
        border: '1px solid',
        borderColor: 'divider',
        px: 0.9,
        py: 0.7,
        verticalAlign: 'middle',
        bgcolor: 'background.paper',
      },
      '& .MuiTextField-root': { width: '100%', m: 0 },
      '& .MuiFormHelperText-root': { mx: 0.6, my: 0.2 },
    }}>
      <TableBody>
        {rows.map((row, rowIndex) => (
          <TableRow key={`form-row-${rowIndex}`}>
            {row.map((node, cellIndex) => (
              <TableCell key={`form-cell-${rowIndex}-${cellIndex}`}>{node}</TableCell>
            ))}
            {Array.from({ length: columns - row.length }).map((_unused, padIndex) => (
              <TableCell key={`form-pad-${rowIndex}-${padIndex}`} />
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

/** جدول مشخصات در نمای جزئیات نامه (برچسب/مقدار، فونت خوانا). */
const InfoTable = ({ rows, columns = 3 }) => {
  const pairs = rows.filter(Boolean);
  return (
    <Table size="small" sx={{
      tableLayout: 'fixed',
      '& td': { border: '1px solid', borderColor: 'divider', px: 1.1, py: 0.9 },
    }}>
      <TableBody>
        {chunkArray(pairs, columns).map((group, rowIndex) => (
          <TableRow key={`info-row-${rowIndex}`}>
            {group.map(([label, value]) => (
              <Fragment key={`info-${rowIndex}-${label}`}>
                <TableCell sx={{
                  width: '16%',
                  bgcolor: alpha(SLATE, 0.04),
                  fontSize: 12,
                  fontWeight: 800,
                  color: 'text.secondary',
                  whiteSpace: 'nowrap',
                }}>
                  {label}
                </TableCell>
                <TableCell sx={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {value || '—'}
                </TableCell>
              </Fragment>
            ))}
            {Array.from({ length: columns - group.length }).map((_unused, padIndex) => (
              <Fragment key={`info-pad-${rowIndex}-${padIndex}`}>
                <TableCell />
                <TableCell />
              </Fragment>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

const InfoGroup = ({ icon: Icon, title, color = ACCENT, children }) => (
  <Box sx={{
    border: '1px solid', borderColor: dividerColor(color), borderRadius: '12px',
    mb: 1.5, minWidth: 0, overflow: 'hidden',
  }}>
    <Stack direction="row" alignItems="center" spacing={0.6}
      sx={{ px: 1.25, py: 0.75, bgcolor: alpha(color, 0.07) }}>
      <Icon sx={{ fontSize: 17, color }} />
      <Typography sx={{ fontSize: 13, fontWeight: 900, color }}>{title}</Typography>
      <Divider sx={{ flex: 1, borderColor: dividerColor(color) }} />
    </Stack>
    {children}
  </Box>
);

const dividerColor = (color) => alpha(color, 0.22);

/** ورودی ساعت با نمایش و پذیرش اعداد فارسی (HH:MM). */
const PersianTimeInput = ({ value, onChange, label }) => {
  const [text, setText] = useState(value ? timeLabel(value) : '');
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) setText(value ? timeLabel(value) : '');
  }, [value]);

  const handleChange = (event) => {
    const digits = toEnglishDigits(String(event.target.value || ''))
      .replace(/[^\d]/g, '')
      .slice(0, 4);
    let formatted = digits;
    if (digits.length >= 3) formatted = `${digits.slice(0, 2)}:${digits.slice(2)}`;
    setText(toPersianDigits(formatted));
    if (digits.length === 4) {
      const hour = Math.min(23, Number(digits.slice(0, 2)));
      const minute = Math.min(59, Number(digits.slice(2)));
      onChange(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
    } else if (!digits) {
      onChange('');
    }
  };

  return (
    <TextField
      size="small"
      fullWidth
      label={label}
      value={text}
      onChange={handleChange}
      onFocus={() => { focusedRef.current = true; }}
      onBlur={() => {
        focusedRef.current = false;
        setText(value ? timeLabel(value) : '');
      }}
      placeholder="۰۹:۳۰"
      InputLabelProps={{ shrink: true }}
      inputProps={{ inputMode: 'numeric', style: { textAlign: 'center', direction: 'ltr' } }}
    />
  );
};

/** یک خط متن جدول استاندارد (بدون شکستن خط، فونت از تم جدول). */
const CellText = ({ children, title, weight = 700, color, mono }) => (
  <Typography
    noWrap
    title={title || (typeof children === 'string' ? children : undefined)}
    sx={{ color, fontSize: 'inherit', lineHeight: 1.6 }}
  >
    <Box
      component="span"
      sx={{
        fontWeight: weight,
        fontFamily: mono ? 'var(--hrms-table-number-font, inherit)' : 'inherit',
      }}
    >
      {children}
    </Box>
  </Typography>
);

const joinParts = (...parts) => parts
  .filter((part) => part !== null && part !== undefined && part !== '')
  .join(' · ');


const LetterFormDialog = ({ open, initial, presetDirection, meta, users, contacts, onClose, onSaved }) => {
  const qc = useQueryClient();
  const [form, setForm] = useState({ ...EMPTY_LETTER, direction: presetDirection || 'incoming' });
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setError('');
    setFiles([]);
    if (initial) {
      setForm({
        ...EMPTY_LETTER,
        direction: initial.direction || 'incoming',
        category: initial.category || '',
        series: initial.series || '',
        number: initial.number || '',
        indicator_no: initial.indicator_no || '',
        transmittal_no: initial.transmittal_no || '',
        external_number: initial.external_number || '',
        letter_date: safeDate(initial.letter_date),
        received_date: safeDate(initial.received_date),
        sent_date: safeDate(initial.sent_date),
        due_date: safeDate(initial.due_date),
        entry_method: initial.entry_method || 'manual',
        entry_time: initial.entry_time || '',
        entered_by: initial.entered_by || '',
        entered_by_name: initial.entered_by_name || '',
        company_reg_no: initial.company_reg_no || '',
        company_reg_date: safeDate(initial.company_reg_date),
        unit_reg_no: initial.unit_reg_no || '',
        unit_reg_date: safeDate(initial.unit_reg_date),
        unit_name: initial.unit_name || '',
        organization: initial.organization || '',
        correspondent: initial.correspondent || '',
        sender_organization: initial.sender_organization || '',
        sender_name: initial.sender_name || '',
        sender_title: initial.sender_title || '',
        receiver_name: initial.receiver_name || '',
        drafter: initial.drafter || '',
        drafter_name: initial.drafter_name || '',
        priority: initial.priority || 'normal',
        confidentiality: initial.confidentiality || 'normal',
        subject: initial.subject || '',
        summary: initial.summary || '',
        body: initial.body || '',
        amount: initial.amount || '',
        contract_number: initial.contract_number || '',
        archive_ref: initial.archive_ref || '',
        register: false,
      });
    } else {
      setForm({ ...EMPTY_LETTER, direction: presetDirection || 'incoming' });
    }
  }, [open, initial, presetDirection]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = cleanPayload(form);
      if (!payload.subject) throw new Error('موضوع نامه الزامی است.');
      if (!payload.letter_date) throw new Error('تاریخ نامه الزامی است.');
      const response = initial
        ? await axiosInstance.patch(`/letters/${initial.id}/`, payload)
        : await axiosInstance.post('/letters/', payload);
      const letter = response.data;
      for (const file of files) {
        const body = new FormData();
        body.append('file', file);
        body.append('title', file.name);
        body.append('kind', 'attachment');
        // eslint-disable-next-line no-await-in-loop
        await axiosInstance.post(`/letters/${letter.id}/attachments/`, body, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      return letter;
    },
    onSuccess: (letter) => {
      qc.invalidateQueries({ queryKey: LETTERS_KEY });
      qc.invalidateQueries({ queryKey: STATS_KEY });
      if (onSaved) onSaved(letter);
      onClose();
    },
    onError: (err) => {
      const detail = err?.response?.data;
      const message = typeof detail === 'string'
        ? detail
        : detail?.detail || (detail && Object.values(detail).flat().join(' ')) || err.message;
      setError(message || 'ثبت نامه انجام نشد.');
    },
  });

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));
  const categories = (meta?.categories || []).filter(
    (row) => !row.direction || row.direction === 'both' || row.direction === form.direction,
  );
  const seriesOptions = (meta?.series || []).filter((row) => row.direction === form.direction);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth
      PaperProps={{ sx: { borderRadius: '18px' } }}>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1} useFlexGap flexWrap="wrap">
          <Box sx={{
            width: 30, height: 30, borderRadius: '9px', display: 'grid', placeItems: 'center',
            bgcolor: alpha(ACCENT, 0.12), color: ACCENT,
          }}>
            <InboxIcon sx={{ fontSize: 17 }} />
          </Box>
          <Typography sx={{ fontSize: 14, fontWeight: 900 }}>
            {initial ? `ویرایش نامه ${initial.number || '(پیش‌نویس)'}` : 'ثبت نامهٔ جدید'}
          </Typography>
          <MetaChip meta={DIRECTION_META[form.direction]} />
          {form.entry_method ? <MetaChip meta={ENTRY_METHOD_META[form.entry_method]} /> : null}
          <Box sx={{ flex: 1 }} />
        </Stack>
      </DialogTitle>
      <DialogContent dividers sx={{ bgcolor: alpha(SLATE, 0.02) }}>
        {error ? <Alert severity="error" sx={{ mb: 1.5, borderRadius: '10px' }}>{error}</Alert> : null}

        <FormSection icon={InboxIcon} title="ثبت و ورود" color={WARN}>
          <FormTable>
            <TextField select size="small" label="جهت نامه" value={form.direction} onChange={set('direction')}>
              {Object.entries(DIRECTION_META).map(([value, item]) => (
                <MenuItem key={value} value={value}>{item.label}</MenuItem>
              ))}
            </TextField>
            <TextField select size="small" label="نوع تحویل" value={form.delivery_type}
              onChange={set('delivery_type')}>
              {(meta?.delivery_types?.length
                ? meta.delivery_types
                : Object.entries(DELIVERY_TYPE_META).map(([value, item]) => ({ value, label: item.label })))
                .map((item) => (
                  <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>
                ))}
            </TextField>
            <TextField select size="small" label="نحوهٔ ورود" value={form.entry_method}
              onChange={set('entry_method')}>
              {(meta?.entry_methods?.length
                ? meta.entry_methods
                : Object.entries(ENTRY_METHOD_META).map(([value, item]) => ({ value, label: item.label })))
                .map((item) => (
                  <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>
                ))}
            </TextField>
            <PersianTimeInput label="ساعت تحویل" value={form.entry_time}
              onChange={(value) => setForm((prev) => ({ ...prev, entry_time: value }))} />
            <JalaliMaskedDateInput variant="outlined"
              label={form.direction === 'outgoing' ? 'تاریخ ارسال' : 'تاریخ ورود'}
              value={form.direction === 'outgoing' ? form.sent_date : form.received_date}
              onChange={(value) => setForm((prev) => ({
                ...prev,
                [form.direction === 'outgoing' ? 'sent_date' : 'received_date']: value,
              }))} />
            <TextField select size="small" label="ثبت‌کنندهٔ ورود" value={form.entered_by}
              onChange={set('entered_by')}>
              <MenuItem value="">—</MenuItem>
              {(users || []).map((row) => (
                <MenuItem key={row.id} value={row.id}>{userLabel(row)}</MenuItem>
              ))}
            </TextField>
            <TextField size="small" label="نام ثبت‌کننده (متن آزاد)" value={form.entered_by_name}
              onChange={set('entered_by_name')} />
            <PersonnelPicker
              label="تحویل‌دهنده (پرسنل)"
              value={personValue(form.delivered_by, form.delivered_by_name)}
              onChange={(option) => setForm((prev) => ({
                ...prev,
                delivered_by: option ? option.id : '',
                delivered_by_name: option ? option.full_name : '',
              }))}
            />
            <TextField size="small" label="نام تحویل‌دهنده (خارج از سامانه)"
              value={form.delivered_by_name}
              onChange={set('delivered_by_name')} />
          </FormTable>
        </FormSection>

        <FormSection icon={EditNoteIcon} title="شماره‌های ثبت" color={INCOMING}>
          <FormTable>
            <TextField select size="small" label="سری شماره‌گذاری" value={form.series} onChange={set('series')}>
              <MenuItem value="">سری پیش‌فرض</MenuItem>
              {seriesOptions.map((row) => (
                <MenuItem key={row.id} value={row.id}>{row.title}</MenuItem>
              ))}
            </TextField>
            <TextField size="small" label="شماره نامه" value={form.number} onChange={set('number')} />
            <TextField size="small" label="شماره اندیکاتور" value={form.indicator_no}
              onChange={set('indicator_no')} />
            <TextField size="small" label="ترنسمیتال" value={form.transmittal_no}
              onChange={set('transmittal_no')} />
            <TextField size="small" label="شماره نامه طرف مقابل" value={form.external_number}
              onChange={set('external_number')} />
            <JalaliMaskedDateInput variant="outlined" label="تاریخ نامه" value={form.letter_date}
              onChange={(value) => setForm((prev) => ({ ...prev, letter_date: value }))} />
            <TextField size="small" label="شماره ثبت ورود به شرکت" value={form.company_reg_no}
              onChange={set('company_reg_no')} />
            <JalaliMaskedDateInput variant="outlined" label="تاریخ ثبت ورود به شرکت"
              value={form.company_reg_date}
              onChange={(value) => setForm((prev) => ({ ...prev, company_reg_date: value }))} />
            <TextField size="small" label="شماره ثبت ورود به واحد" value={form.unit_reg_no}
              onChange={set('unit_reg_no')} />
            <JalaliMaskedDateInput variant="outlined" label="تاریخ ثبت ورود به واحد"
              value={form.unit_reg_date}
              onChange={(value) => setForm((prev) => ({ ...prev, unit_reg_date: value }))} />
            <TextField size="small" label="واحد ثبت‌کننده / گیرنده" value={form.unit_name}
              onChange={set('unit_name')} />
            <JalaliMaskedDateInput variant="outlined" label="مهلت پاسخ" value={form.due_date}
              onChange={(value) => setForm((prev) => ({ ...prev, due_date: value }))} />
          </FormTable>
        </FormSection>

        <FormSection icon={SendIcon} title="طرفین مکاتبه" color={OUTGOING}>
          <FormTable columns={1}>
            <PersonnelPicker
              label="فرستنده (پرسنل منابع انسانی)"
              value={personValue(form.sender_employee, form.sender_name)}
              onChange={(option) => setForm((prev) => ({
                ...prev,
                sender_employee: option ? option.id : '',
                sender_name: option ? option.full_name : prev.sender_name,
                sender_title: option?.job_title || prev.sender_title,
              }))}
            />
            <PartyPicker
              label="ارسال‌کننده (طرف حساب از مدیریت قراردادها)"
              value={partyValue(form.sender_party, form.sender_party_name)}
              onChange={(party) => setForm((prev) => ({
                ...prev,
                sender_party: party?.id || '',
                sender_party_name: party?.name || '',
              }))}
            />
            <PartyPicker
              label="طرف حساب (از مدیریت قراردادها)"
              value={partyValue(form.party_account, form.party_account_name)}
              onChange={(party) => setForm((prev) => ({
                ...prev,
                party_account: party?.id || '',
                party_account_name: party?.name || '',
              }))}
            />
          </FormTable>
          <FormTable>
            <TextField size="small" label="سمت ارسال‌کننده" value={form.sender_title}
              onChange={set('sender_title')} />
            <PersonnelPicker
              label="گیرنده (پرسنل)"
              value={personValue(form.receiver_employee, form.receiver_name)}
              onChange={(option) => setForm((prev) => ({
                ...prev,
                receiver_employee: option ? option.id : '',
                receiver_name: option ? option.full_name : '',
              }))}
            />
            <TextField select size="small" label="مخاطب" value={form.correspondent}
              onChange={set('correspondent')}>
              <MenuItem value="">—</MenuItem>
              {(contacts || []).map((row) => (
                <MenuItem key={row.id} value={row.id}>
                  {row.name}{row.title ? ` — ${row.title}` : ''}
                </MenuItem>
              ))}
            </TextField>
          </FormTable>
        </FormSection>

        <FormSection icon={MailOutlineIcon} title="مشخصات نامه" color={INTERNAL}>
          <FormTable>
            <TextField select size="small" label="نوع مکاتبه" value={form.category} onChange={set('category')}>
              <MenuItem value="">—</MenuItem>
              {categories.map((row) => (
                <MenuItem key={row.id} value={row.id}>{row.name}</MenuItem>
              ))}
            </TextField>
            <TextField select size="small" label="اولویت" value={form.priority} onChange={set('priority')}>
              {Object.entries(PRIORITY_META).map(([value, item]) => (
                <MenuItem key={value} value={value}>{item.label}</MenuItem>
              ))}
            </TextField>
            <TextField select size="small" label="محرمانگی" value={form.confidentiality}
              onChange={set('confidentiality')}>
              {Object.entries(CONFIDENTIALITY_META).map(([value, item]) => (
                <MenuItem key={value} value={value}>{item.label}</MenuItem>
              ))}
            </TextField>
            <TextField size="small" label="موضوع نامه" value={form.subject} onChange={set('subject')} />
          </FormTable>
          <FormTable columns={1}>
            <TextField size="small" label="خلاصه / چکیده" value={form.summary}
              onChange={set('summary')} />
            <TextField size="small" multiline minRows={4} label="متن نامه" value={form.body}
              onChange={set('body')} />
          </FormTable>
        </FormSection>

        <FormSection icon={ArchiveIcon} title="مالی، قرارداد و بایگانی" color={SLATE}>
          <FormTable>
            <TextField size="small" type="number" label="مبلغ (اختیاری)" value={form.amount}
              onChange={set('amount')} />
            <TextField size="small" label="شماره قرارداد مرتبط" value={form.contract_number}
              onChange={set('contract_number')} />
            <TextField size="small" label="شماره بایگانی" value={form.archive_ref}
              onChange={set('archive_ref')} />
            <TextField select size="small" label="تنظیم‌کننده نامه" value={form.drafter}
              onChange={set('drafter')}>
              <MenuItem value="">خودم</MenuItem>
              {(users || []).map((row) => (
                <MenuItem key={row.id} value={row.id}>{userLabel(row)}</MenuItem>
              ))}
            </TextField>
            <TextField size="small" label="نام تنظیم‌کننده (متن آزاد)" value={form.drafter_name}
              onChange={set('drafter_name')} />
          </FormTable>
        </FormSection>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}
          alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ mt: 1.5 }} useFlexGap>
          <Button variant="outlined" size="small" startIcon={<AttachFileIcon />}
            onClick={() => fileRef.current?.click()}>
            افزودن پیوست
          </Button>
          <input ref={fileRef} type="file" multiple hidden data-testid="letter-files"
            onChange={(event) => setFiles(Array.from(event.target.files || []))} />
          <Typography sx={{ fontSize: 12, color: MUTED }}>
            {files.length
              ? `${toPersianDigits(files.length)} فایل انتخاب شد`
              : 'فایل اسکن نامه / پیوست‌ها را انتخاب کنید'}
          </Typography>
          <Box sx={{ flex: 1 }} />
          <FormControlLabel
            control={(
              <Switch size="small" checked={form.register}
                onChange={(event) => setForm((prev) => ({ ...prev, register: event.target.checked }))} />
            )}
            label={<Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>ثبت شماره و نهایی‌سازی</Typography>}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.25 }}>
        <Button size="small" onClick={onClose}>انصراف</Button>
        <Button size="small" variant="contained" disabled={save.isPending}
          onClick={() => save.mutate()} sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#0284c7' } }}>
          {save.isPending ? 'در حال ذخیره…' : (initial ? 'ذخیره تغییرات' : 'ثبت نامه')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const ReferDialog = ({ open, letter, onClose, onSubmit, pending }) => {
  const [toEmployee, setToEmployee] = useState(null);
  const [toName, setToName] = useState('');
  const [purpose, setPurpose] = useState('action');
  const [dueDate, setDueDate] = useState('');
  const [instruction, setInstruction] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open) return;
    setToEmployee(null);
    setToName('');
    setPurpose('action');
    setDueDate('');
    setInstruction('');
    setNote('');
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: '16px' } }}>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={0.75} useFlexGap flexWrap="wrap">
          <Box sx={{
            width: 28, height: 28, borderRadius: '8px', display: 'grid', placeItems: 'center',
            bgcolor: alpha(WARN, 0.12), color: WARN,
          }}>
            <ForwardToInboxIcon sx={{ fontSize: 16 }} />
          </Box>
          <Typography sx={{ fontSize: 13.5, fontWeight: 900 }}>ارجاع نامه</Typography>
          {letter?.number ? <Chip size="small" label={letter.number} sx={chipSx(SLATE)} /> : null}
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <FormSection icon={ForwardToInboxIcon} title="گیرنده و مهلت" color={WARN}>
          <FormTable columns={1}>
            <PersonnelPicker
              label="ارجاع به پرسنل (جستجو در منابع انسانی)"
              value={toEmployee}
              onChange={(option) => setToEmployee(option)}
            />
            <TextField size="small" label="یا واحد / شخص خارج از سامانه" value={toName}
              onChange={(event) => setToName(event.target.value)} />
            <TextField select size="small" label="نوع ارجاع" value={purpose}
              onChange={(event) => setPurpose(event.target.value)}>
              {Object.entries(REFERRAL_PURPOSE_META).map(([value, item]) => (
                <MenuItem key={value} value={value}>{item.label}</MenuItem>
              ))}
            </TextField>
            <JalaliMaskedDateInput variant="outlined" label="مهلت اقدام" value={dueDate}
              onChange={(value) => setDueDate(value)} />
          </FormTable>
        </FormSection>
        <FormSection icon={EditNoteIcon} title="دستور و توضیح" color={INCOMING}>
          <FormTable columns={1}>
            <TextField size="small" multiline minRows={2} label="دستور / اقدام درخواستی"
              value={instruction} onChange={(event) => setInstruction(event.target.value)} />
            <TextField size="small" multiline minRows={2} label="توضیح تکمیلی" value={note}
              onChange={(event) => setNote(event.target.value)} />
          </FormTable>
        </FormSection>
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.25 }}>
        <Button size="small" onClick={onClose}>انصراف</Button>
        <Button size="small" variant="contained"
          disabled={pending || (!toEmployee && !toName.trim())}
          onClick={() => onSubmit({
            to_employee: toEmployee?.id || undefined,
            to_name: toName,
            purpose,
            due_date: dueDate || undefined,
            instruction,
            note,
          })}
          sx={{ bgcolor: WARN, '&:hover': { bgcolor: '#92400e' } }}>
          ثبت ارجاع
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/** ثبت پاسخ و نتیجهٔ یک ارجاع (تاریخچهٔ کامل اقدام). */
const CompleteReferralDialog = ({ open, referral, onClose, onSubmit, pending }) => {
  const [response, setResponse] = useState('');
  const [result, setResult] = useState('');
  const [resultNote, setResultNote] = useState('');
  const [answeredOn, setAnsweredOn] = useState('');

  useEffect(() => {
    if (!open) return;
    setResponse('');
    setResult('');
    setResultNote('');
    setAnsweredOn(new Date().toISOString().slice(0, 10));
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: '16px' } }}>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={0.75} useFlexGap flexWrap="wrap">
          <Box sx={{
            width: 28, height: 28, borderRadius: '8px', display: 'grid', placeItems: 'center',
            bgcolor: alpha(OK, 0.12), color: OK,
          }}>
            <TaskAltIcon sx={{ fontSize: 16 }} />
          </Box>
          <Typography sx={{ fontSize: 13.5, fontWeight: 900 }}>ثبت پاسخ و نتیجهٔ ارجاع</Typography>
          {referral?.to_user_name || referral?.to_name ? (
            <Chip size="small" label={referral.to_user_name || referral.to_name} sx={chipSx(SLATE)} />
          ) : null}
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        {referral?.instruction ? (
          <Alert severity="info" sx={{ mb: 1.25, borderRadius: '10px' }}>
            <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>دستور ارجاع:</Typography>
            <Typography sx={{ fontSize: 12.5, whiteSpace: 'pre-wrap' }}>{referral.instruction}</Typography>
          </Alert>
        ) : null}
        <FormTable columns={1}>
          <TextField size="small" multiline minRows={2} label="پاسخ / جوابیهٔ اقدام‌کننده"
            value={response} onChange={(event) => setResponse(event.target.value)} />
          <TextField size="small" multiline minRows={2} label="نتیجهٔ نهایی"
            value={result} onChange={(event) => setResult(event.target.value)} />
          <TextField size="small" multiline minRows={2} label="یادداشت نتیجه"
            value={resultNote} onChange={(event) => setResultNote(event.target.value)} />
          <JalaliMaskedDateInput variant="outlined" label="تاریخ پاسخ" value={answeredOn}
            onChange={(value) => setAnsweredOn(value)} />
        </FormTable>
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.25 }}>
        <Button size="small" onClick={onClose}>انصراف</Button>
        <Button size="small" variant="contained" disabled={pending || (!response.trim() && !result.trim())}
          onClick={() => onSubmit({ response, result, result_note: resultNote, answered_on: answeredOn })}
          sx={{ bgcolor: OK, '&:hover': { bgcolor: '#115e59' } }}>
          ثبت اقدام
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const CorrespondenceLettersPage = ({ mode = 'all' }) => {
  const moduleTheme = useModuleTheme();
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const preset = LETTER_PAGE_PRESETS[mode] || LETTER_PAGE_PRESETS.all;

  const [direction, setDirection] = useState(preset.direction || 'all');
  const [statusFilter, setStatusFilter] = useState(preset.status || 'all');
  const [scope, setScope] = useState(preset.scope || 'all');
  const [overdueOnly, setOverdueOnly] = useState(Boolean(preset.overdue));
  const [archivedOnly, setArchivedOnly] = useState(Boolean(preset.archived));
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [entryMethodFilter, setEntryMethodFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [drawerLetter, setDrawerLetter] = useState(null);
  const [drawerTab, setDrawerTab] = useState('info');
  const [formOpen, setFormOpen] = useState(false);
  const [formLetter, setFormLetter] = useState(null);
  const [referLetter, setReferLetter] = useState(null);
  const [completeReferral, setCompleteReferral] = useState(null);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [uploading, setUploading] = useState(false);
  const uploadRef = useRef(null);

  useEffect(() => {
    const next = LETTER_PAGE_PRESETS[mode] || LETTER_PAGE_PRESETS.all;
    setDirection(next.direction || 'all');
    setStatusFilter(next.status || 'all');
    setScope(next.scope || 'all');
    setOverdueOnly(Boolean(next.overdue));
    setArchivedOnly(Boolean(next.archived));
    setCategoryFilter('all');
    setPriorityFilter('all');
    setEntryMethodFilter('all');
    setSearch('');
    setSortBy('newest');
    setFiltersOpen(false);
  }, [mode]);

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setFormLetter(null);
      setFormOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    setDrawerTab('info');
  }, [drawerLetter?.id]);


  const pageSize = moduleTheme.tableTheme.rowsPerPage;
  const [page, setPage] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, direction, statusFilter, scope, overdueOnly, archivedOnly,
    categoryFilter, priorityFilter, entryMethodFilter, sortBy, pageSize]);

  const listParams = useMemo(() => {
    const ordering = {
      newest: '-letter_date',
      oldest: 'letter_date',
      due: 'due_date',
      number: 'number',
    }[sortBy] || '-letter_date';
    const params = { page: page + 1, page_size: pageSize, ordering };
    if (direction !== 'all') params.direction = direction;
    if (statusFilter !== 'all') params.status = statusFilter;
    if (scope !== 'all') params.scope = scope;
    if (overdueOnly) params.overdue = '1';
    if (archivedOnly) params.archived = '1';
    if (categoryFilter !== 'all') params.category = categoryFilter;
    if (priorityFilter !== 'all') params.priority = priorityFilter;
    if (entryMethodFilter !== 'all') params.entry_method = entryMethodFilter;
    if (debouncedSearch) params.search = debouncedSearch;
    return params;
  }, [page, pageSize, sortBy, direction, statusFilter, scope, overdueOnly, archivedOnly,
    categoryFilter, priorityFilter, entryMethodFilter, debouncedSearch]);

  const { data: rawLetters, isLoading, isFetching, refetch } = useQuery({
    queryKey: [...LETTERS_KEY, listParams],
    queryFn: () => axiosInstance.get('/letters/', { params: listParams }).then((response) => response.data),
    placeholderData: (previous) => previous,
  });
  const letters = useMemo(() => asList(rawLetters), [rawLetters]);
  const total = useMemo(
    () => (typeof rawLetters?.count === 'number' ? rawLetters.count : letters.length),
    [rawLetters, letters.length],
  );
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  useEffect(() => {
    if (page > totalPages - 1) setPage(Math.max(0, totalPages - 1));
  }, [page, totalPages]);
  const pageNumbers = useMemo(() => {
    const size = 5;
    const start = Math.max(0, Math.min(page - 2, totalPages - size));
    const end = Math.min(totalPages, start + size);
    return Array.from({ length: Math.max(0, end - start) }, (_unused, index) => start + index);
  }, [page, totalPages]);


  const { data: meta } = useQuery({
    queryKey: META_KEY,
    queryFn: () => axiosInstance.get('/letters/meta/').then((response) => response.data),
  });
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: STATS_KEY,
    queryFn: () => axiosInstance.get('/letters/stats/').then((response) => response.data),
  });
  const { data: myReferrals, refetch: refetchReferrals } = useQuery({
    queryKey: REFERRALS_KEY,
    queryFn: () => axiosInstance.get('/letter-referrals/', {
      params: { mine: 1, open_only: 1, page_size: 100 },
    }).then((response) => response.data),
  });
  const { data: rawUsers } = useQuery({
    queryKey: USERS_KEY,
    queryFn: () => axiosInstance.get('/users/').then((response) => response.data),
  });
  const { data: rawContacts } = useQuery({
    queryKey: CONTACTS_KEY,
    queryFn: () => axiosInstance.get('/correspondents/', { params: { page_size: 500 } })
      .then((response) => response.data),
  });

  const users = useMemo(() => rawUsers?.users || asList(rawUsers), [rawUsers]);
  const contacts = useMemo(() => asList(rawContacts), [rawContacts]);

  const { data: drawerDetail } = useQuery({
    queryKey: ['correspondence-letter', drawerLetter?.id],
    queryFn: () => axiosInstance.get(`/letters/${drawerLetter.id}/`).then((response) => response.data),
    enabled: Boolean(drawerLetter?.id),
  });
  const activeLetter = drawerDetail || drawerLetter;

  const refreshAll = () => {
    refetch();
    refetchStats();
    refetchReferrals();
  };

  /* ---------- ویرایش درجا در جدول (الگوی گرید ورود اطلاعات) ---------- */
  const [editRowId, setEditRowId] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [savingIds, setSavingIds] = useState([]);
  const [bulkSaving, setBulkSaving] = useState(false);

  const EDITABLE_FIELDS = [
    'number', 'indicator_no', 'transmittal_no', 'external_number',
    'company_reg_no', 'company_reg_date', 'unit_reg_no', 'unit_reg_date', 'unit_name',
    'subject', 'category', 'delivery_type', 'entry_method', 'entry_time',
    'delivered_by', 'delivered_by_name',
    'sender_employee', 'sender_name', 'sender_title', 'sender_party',
    'party_account', 'receiver_employee', 'receiver_name',
    'letter_date', 'due_date', 'priority', 'status',
  ];
  const NULLABLE_FIELDS = [
    'category', 'sender_employee', 'receiver_employee', 'sender_party', 'party_account',
    'delivered_by', 'company_reg_date', 'unit_reg_date', 'due_date', 'entry_time',
  ];

  const seedDraft = (letter) => ({
    number: letter.number || '',
    indicator_no: letter.indicator_no || '',
    transmittal_no: letter.transmittal_no || '',
    external_number: letter.external_number || '',
    company_reg_no: letter.company_reg_no || '',
    company_reg_date: safeDate(letter.company_reg_date),
    unit_reg_no: letter.unit_reg_no || '',
    unit_reg_date: safeDate(letter.unit_reg_date),
    unit_name: letter.unit_name || '',
    subject: letter.subject || '',
    category: letter.category || '',
    delivery_type: letter.delivery_type || 'in_person',
    entry_method: letter.entry_method || 'manual',
    entry_time: letter.entry_time ? String(letter.entry_time).slice(0, 5) : '',
    delivered_by: letter.delivered_by || '',
    delivered_by_name: letter.delivered_by_name || '',
    sender_employee: letter.sender_employee || '',
    sender_name: letter.sender_name || '',
    sender_title: letter.sender_title || '',
    sender_party: letter.sender_party || '',
    party_account: letter.party_account || '',
    receiver_employee: letter.receiver_employee || '',
    receiver_name: letter.receiver_name || '',
    letter_date: safeDate(letter.letter_date),
    due_date: safeDate(letter.due_date),
    priority: letter.priority || 'normal',
    status: letter.status || 'registered',
  });

  /** فقط تفاوت‌های ردیف با مقادیر اصلی به سرور فرستاده می‌شود (PATCH سبک). */
  const buildPatch = (letter, draftValues) => {
    const original = seedDraft(letter);
    const payload = {};
    EDITABLE_FIELDS.forEach((key) => {
      const next = draftValues[key] ?? '';
      const before = original[key] ?? '';
      if (String(next) === String(before)) return;
      if (next === '') {
        if (!NULLABLE_FIELDS.includes(key)) return;
        payload[key] = null;
        return;
      }
      payload[key] = next;
    });
    return payload;
  };

  const letterById = (id) => letters.find((row) => row.letter.id === id)?.letter || null;

  const startRowEdit = (letter) => {
    setDrafts((previous) => (previous[letter.id] ? previous : {
      ...previous,
      [letter.id]: seedDraft(letter),
    }));
    setEditRowId(letter.id);
  };

  const patchDraft = (key) => (value) => setDrafts((previous) => {
    if (!editRowId) return previous;
    const current = previous[editRowId] || seedDraft(letterById(editRowId) || {});
    return { ...previous, [editRowId]: { ...current, [key]: value } };
  });

  const discardRow = (id) => {
    setDrafts((previous) => {
      const next = { ...previous };
      delete next[id];
      return next;
    });
    setEditRowId((previous) => (previous === id ? null : previous));
  };

  const discardAll = () => {
    setDrafts({});
    setEditRowId(null);
  };

  const applyPatch = async (id) => {
    const letter = letterById(id);
    const draftValues = drafts[id];
    if (!letter || !draftValues) return { id, ok: false, empty: true };
    const payload = buildPatch(letter, draftValues);
    if (!Object.keys(payload).length) {
      discardRow(id);
      return { id, ok: true, empty: true };
    }
    setSavingIds((previous) => (previous.includes(id) ? previous : [...previous, id]));
    try {
      await axiosInstance.patch(`/letters/${id}/`, payload);
      setDrafts((previous) => {
        const next = { ...previous };
        delete next[id];
        return next;
      });
      return { id, ok: true, empty: false };
    } catch (requestError) {
      const details = requestError?.response?.data;
      const firstError = details && typeof details === 'object'
        ? Object.entries(details)
          .map(([field, value]) => `${field}: ${Array.isArray(value) ? value.join(' ') : value}`)[0]
        : '';
      setError(firstError || details?.detail || 'ذخیرهٔ تغییرات ردیف ممکن نشد.');
      return { id, ok: false, empty: false };
    } finally {
      setSavingIds((previous) => previous.filter((item) => item !== id));
    }
  };

  const afterSave = (saved, failed) => {
    if (!saved && !failed) return;
    qc.invalidateQueries({ queryKey: ['correspondence-letter'] });
    refreshAll();
    if (!saved) return;
    setToast(failed
      ? `${toPersianDigits(saved)} ردیف ذخیره شد و ${toPersianDigits(failed)} ردیف خطا داشت.`
      : `${toPersianDigits(saved)} ردیف ذخیره شد.`);
  };

  const saveRowEdit = async (id) => {
    if (!id) return;
    const result = await applyPatch(id);
    if (result.ok) setEditRowId((previous) => (previous === id ? null : previous));
    afterSave(result.ok && !result.empty ? 1 : 0, result.ok ? 0 : 1);
  };

  const saveAllEdits = async () => {
    const ids = Object.keys(drafts).map(Number);
    if (!ids.length) return;
    setBulkSaving(true);
    let saved = 0;
    let failed = 0;
    for (const id of ids) {
      // eslint-disable-next-line no-await-in-loop
      const result = await applyPatch(id);
      if (result.ok && !result.empty) saved += 1;
      if (!result.ok) failed += 1;
    }
    setBulkSaving(false);
    setEditRowId(null);
    afterSave(saved, failed);
  };

  const rowEditing = (letter) => editRowId === letter.id;
  const rowDirty = (letter) => Boolean(drafts[letter.id]);
  const dirtyCount = Object.keys(drafts).length;
  const draft = (editRowId && drafts[editRowId]) || {};

  /** کلیک تکی = پروندهٔ نامه، دوبار کلیک = ویرایش درجا (بدون باز شدن هم‌زمان پرونده). */
  const rowClickTimer = useRef(0);
  const handleRowClick = (row) => {
    if (editRowId) return;
    window.clearTimeout(rowClickTimer.current);
    rowClickTimer.current = window.setTimeout(() => {
      setDrawerLetter(row.letter);
      setComment('');
    }, 220);
  };
  const handleRowDoubleClick = (row) => {
    window.clearTimeout(rowClickTimer.current);
    startRowEdit(row.letter);
  };

  const letterAction = useMutation({
    mutationFn: ({ id, action, payload }) => axiosInstance
      .post(`/letters/${id}/${action}/`, payload || {})
      .then((response) => response.data),
    onSuccess: (data, variables) => {
      refreshAll();
      qc.invalidateQueries({ queryKey: ['correspondence-letter'] });
      const updated = variables.action === 'refer' ? data.letter : data;
      if (updated?.id) {
        setDrawerLetter((previous) => (previous && previous.id === updated.id
          ? { ...previous, ...updated } : previous));
      }
      const messages = {
        register: 'شماره نامه ثبت شد.',
        refer: 'ارجاع نامه ثبت شد.',
        archive: 'نامه بایگانی شد.',
        close: 'پروندهٔ نامه بسته شد.',
        comment: 'یادداشت ثبت شد.',
      };
      setToast(messages[variables.action] || 'عملیات انجام شد.');
      setError('');
      if (variables.action === 'comment') setComment('');
    },
    onError: (err) => setError(err?.response?.data?.detail || 'انجام عملیات ممکن نشد.'),
  });

  const referralComplete = useMutation({
    mutationFn: ({ id, payload }) => axiosInstance
      .post(`/letter-referrals/${id}/complete/`, payload)
      .then((response) => response.data),
    onSuccess: () => {
      refreshAll();
      qc.invalidateQueries({ queryKey: ['correspondence-letter'] });
      setToast('پاسخ و نتیجهٔ ارجاع ثبت شد.');
      setCompleteReferral(null);
    },
    onError: (err) => setError(err?.response?.data?.detail || 'ثبت پاسخ ارجاع انجام نشد.'),
  });

  const rows = useMemo(() => letters.map((letter) => {
    const days = daysBetween(letter.due_date);
    const openStatuses = ['draft', 'registered', 'in_progress'];
    return {
      letter,
      days,
      overdue: days !== null && days < 0 && openStatuses.includes(letter.status),
      statusMeta: STATUS_META[letter.status] || STATUS_META.registered,
      directionMeta: DIRECTION_META[letter.direction] || DIRECTION_META.incoming,
    };
  }), [letters]);

  const counts = useMemo(() => letters.reduce((acc, letter) => {
    acc[letter.direction] = (acc[letter.direction] || 0) + 1;
    acc[letter.status] = (acc[letter.status] || 0) + 1;
    return acc;
  }, {}), [letters]);

  const { ref: tableRef, rowHeight, tableHeight } = useRowHeight(moduleTheme.tableTheme, rows.length);

  const totals = stats?.totals || {};
  const myReferralCount = totals.my_referrals ?? asList(myReferrals).length;

  const exportExcel = async () => {
    const response = await axiosInstance.get('/letters/export-excel/', {
      params: listParams, responseType: 'blob',
    });
    const url = URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'correspondence.xlsx';
    link.click();
    URL.revokeObjectURL(url);
  };

  const uploadAttachment = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !activeLetter?.id) return;
    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('title', file.name);
      body.append('kind', 'attachment');
      await axiosInstance.post(`/letters/${activeLetter.id}/attachments/`, body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await qc.invalidateQueries({ queryKey: ['correspondence-letter', activeLetter.id] });
      refreshAll();
      setToast('پیوست بارگذاری شد.');
    } catch (err) {
      setError('بارگذاری پیوست انجام نشد.');
    } finally {
      setUploading(false);
      if (uploadRef.current) uploadRef.current.value = '';
    }
  };

  const openNew = (presetDirection) => {
    setFormLetter(null);
    setFormOpen(true);
    if (presetDirection && !preset.direction) setDirection(presetDirection);
  };

  const resetFilters = () => {
    setSearch('');
    setDirection(preset.direction || 'all');
    setStatusFilter(preset.status || 'all');
    setScope(preset.scope || 'all');
    setOverdueOnly(Boolean(preset.overdue));
    setArchivedOnly(Boolean(preset.archived));
    setCategoryFilter('all');
    setPriorityFilter('all');
    setEntryMethodFilter('all');
    setSortBy('newest');
  };

  const activeFilterCount = [
    !preset.direction && direction !== 'all',
    !preset.status && statusFilter !== 'all',
    categoryFilter !== 'all', priorityFilter !== 'all',
    ['incoming', 'all'].includes(mode) && entryMethodFilter !== 'all',
  ].filter(Boolean).length;

  const activeChips = [
    !preset.direction && direction !== 'all' && {
      key: 'direction',
      label: `جهت: ${DIRECTION_META[direction]?.label || direction}`,
      clear: () => setDirection('all'),
    },
    !preset.status && statusFilter !== 'all' && {
      key: 'status',
      label: `وضعیت: ${STATUS_META[statusFilter]?.label || statusFilter}`,
      clear: () => setStatusFilter('all'),
    },
    categoryFilter !== 'all' && {
      key: 'category',
      label: `نوع: ${(meta?.categories || []).find((row) => row.id === Number(categoryFilter))?.name || ''}`,
      clear: () => setCategoryFilter('all'),
    },
    priorityFilter !== 'all' && {
      key: 'priority', label: `اولویت: ${PRIORITY_META[priorityFilter]?.label || ''}`,
      clear: () => setPriorityFilter('all'),
    },
    ['incoming', 'all'].includes(mode) && entryMethodFilter !== 'all' && {
      key: 'entry_method',
      label: `نحوهٔ ورود: ${ENTRY_METHOD_META[entryMethodFilter]?.label || entryMethodFilter}`,
      clear: () => setEntryMethodFilter('all'),
    },
  ].filter(Boolean);

  const pageFilters = [];
  if (!preset.direction) {
    pageFilters.push({
      label: 'جهت',
      value: direction,
      options: [
        { value: 'all', label: 'همهٔ جهات' },
        ...Object.entries(DIRECTION_META).map(([value, item]) => ({ value, label: item.label })),
      ],
      onChange: setDirection,
    });
  }
  if (!preset.status) {
    pageFilters.push({
      label: 'وضعیت',
      value: statusFilter,
      options: [
        { value: 'all', label: 'همهٔ وضعیت‌ها' },
        ...Object.entries(STATUS_META).map(([value, item]) => ({ value, label: item.label })),
      ],
      onChange: setStatusFilter,
    });
  }
  if (['incoming', 'all'].includes(mode)) {
    pageFilters.push({
      label: 'نحوهٔ ورود',
      value: entryMethodFilter,
      options: [
        { value: 'all', label: 'همه' },
        ...Object.entries(ENTRY_METHOD_META).map(([value, item]) => ({ value, label: item.label })),
      ],
      onChange: setEntryMethodFilter,
    });
  }
  pageFilters.push({
    label: 'نوع مکاتبه',
    value: categoryFilter,
    options: [
      { value: 'all', label: 'همهٔ انواع' },
      ...(meta?.categories || []).map((row) => ({ value: row.id, label: row.name })),
    ],
    onChange: setCategoryFilter,
  });
  pageFilters.push({
    label: 'اولویت',
    value: priorityFilter,
    options: [
      { value: 'all', label: 'همهٔ اولویت‌ها' },
      ...Object.entries(PRIORITY_META).map(([value, item]) => ({ value, label: item.label })),
    ],
    onChange: setPriorityFilter,
  });

  const pageAccent = preset.accent || ACCENT;
  const PageIcon = preset.icon || MailOutlineIcon;

  if (isLoading) {
    return <Box sx={{ py: 9, textAlign: 'center' }}><CircularProgress sx={{ color: pageAccent }} /></Box>;
  }

  return (
    <Box sx={{ pb: 1, minWidth: 0 }}>
      <PageHeader
        icon={<PageIcon />}
        title={preset.title}
        badge={(
          <Stack direction="row" spacing={0.6} useFlexGap flexWrap="wrap">
            <Chip size="small" label={`${formatPersianNumber(total)} مکاتبه`}
              sx={{ height: 23, fontWeight: 800, bgcolor: alpha(pageAccent, 0.1), color: pageAccent }} />
            {mode === 'all' ? (
              <>
                <Chip size="small" label={`وارده ${formatPersianNumber(totals.incoming || 0)}`}
                  sx={{ height: 23, fontWeight: 800, bgcolor: alpha(INCOMING, 0.1), color: INCOMING }} />
                <Chip size="small" label={`صادره ${formatPersianNumber(totals.outgoing || 0)}`}
                  sx={{ height: 23, fontWeight: 800, bgcolor: alpha(OUTGOING, 0.1), color: OUTGOING }} />
              </>
            ) : null}
            {totals.overdue && mode !== 'overdue' ? (
              <Chip size="small" label={`معوق ${formatPersianNumber(totals.overdue)}`}
                sx={{ height: 23, fontWeight: 800, bgcolor: alpha(DANGER, 0.1), color: DANGER }} />
            ) : null}
            {mode === 'referrals' && totals.my_overdue_referrals ? (
              <Chip size="small" label={`ارجاع معوق ${formatPersianNumber(totals.my_overdue_referrals)}`}
                sx={{ height: 23, fontWeight: 800, bgcolor: alpha(DANGER, 0.1), color: DANGER }} />
            ) : null}
          </Stack>
        )}
        actions={(
          <>
            {dirtyCount ? (
              <>
                <Tooltip title="ذخیرهٔ همهٔ ردیف‌های ویرایش‌شده در جدول">
                  <span>
                    <Button
                      variant="contained"
                      startIcon={<SaveIcon />}
                      disabled={bulkSaving}
                      onClick={saveAllEdits}
                      sx={{ bgcolor: OK, '&:hover': { bgcolor: '#115e59' } }}
                    >
                      {bulkSaving
                        ? 'در حال ذخیره…'
                        : `ذخیرهٔ تغییرات (${toPersianDigits(dirtyCount)})`}
                    </Button>
                  </span>
                </Tooltip>
                <Button variant="text" onClick={discardAll} disabled={bulkSaving}>
                  انصراف از ویرایش
                </Button>
              </>
            ) : (
              <Tooltip title="برای ویرایش، روی ردیف دوبار کلیک کنید (Enter: ذخیره، Esc: انصراف)">
                <Chip
                  size="small"
                  icon={<EditOutlinedIcon sx={{ fontSize: 14 }} />}
                  label="ویرایش: دوبار کلیک روی ردیف"
                  sx={{ height: 26, fontWeight: 700, bgcolor: alpha(ACCENT, 0.08), color: ACCENT }}
                />
              </Tooltip>
            )}
            <Tooltip title="به‌روزرسانی">
              <span>
                <Button variant="outlined" disabled={isFetching} onClick={refreshAll}
                  sx={{ minWidth: 40, px: 1 }}>
                  <RefreshIcon fontSize="small" />
                </Button>
              </span>
            </Tooltip>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={exportExcel}>خروجی اکسل</Button>
            {mode === 'all' ? (
              <>
                <Button variant="outlined" startIcon={<InboxIcon />}
                  onClick={() => openNew('incoming')}>
                  وارده جدید
                </Button>
                <Button variant="contained" startIcon={<SendIcon />} onClick={() => openNew('outgoing')}
                  sx={{ bgcolor: OUTGOING, '&:hover': { bgcolor: '#115e59' } }}>
                  نامه صادره
                </Button>
              </>
            ) : (
              <Button variant="contained" startIcon={<PageIcon />}
                onClick={() => openNew(preset.direction || 'incoming')}
                sx={{ bgcolor: pageAccent, '&:hover': { bgcolor: alpha(pageAccent, 0.85) } }}>
                {preset.direction === 'outgoing' ? 'نامه صادره جدید'
                  : preset.direction === 'internal' ? 'مکاتبه داخلی جدید'
                    : preset.direction === 'incoming' ? 'نامه وارده جدید' : 'مکاتبه جدید'}
              </Button>
            )}
          </>
        )}
      />

      {mode === 'all' ? (
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0,1fr)', sm: 'repeat(2, minmax(0,1fr))', md: 'repeat(3, minmax(0,1fr))', lg: 'repeat(6, minmax(0,1fr))' },
          gap: 1, mb: 1.25, minWidth: 0,
        }}>
          <KpiTile label="کل مکاتبات" value={formatPersianNumber(totals.all || 0)}
            color={SLATE} icon={MailOutlineIcon} />
          <KpiTile label="نامه‌های وارده" value={formatPersianNumber(totals.incoming || 0)}
            hint={`این ماه: ${formatPersianNumber(totals.incoming_this_month || 0)}`} color={INCOMING}
            icon={InboxIcon} onClick={() => setDirection('incoming')} />
          <KpiTile label="نامه‌های صادره" value={formatPersianNumber(totals.outgoing || 0)}
            hint={`این ماه: ${formatPersianNumber(totals.outgoing_this_month || 0)}`} color={OUTGOING}
            icon={SendIcon} onClick={() => setDirection('outgoing')} />
          <KpiTile label="در جریان" value={formatPersianNumber(totals.open || 0)}
            hint={`پیش‌نویس: ${formatPersianNumber(totals.drafts || 0)}`} color={WARN}
            icon={EditNoteIcon} onClick={() => setStatusFilter('in_progress')} />
          <KpiTile label="معوق (مهلت پاسخ)" value={formatPersianNumber(totals.overdue || 0)} color={DANGER} icon={WarningAmberIcon}
            onClick={() => setOverdueOnly(true)} />
          <KpiTile label="ارجاعات من" value={formatPersianNumber(myReferralCount)}
            hint={`معوق: ${formatPersianNumber(totals.my_overdue_referrals || 0)}`} color={INTERNAL}
            icon={ForwardToInboxIcon} onClick={() => setScope('referred')} />
        </Box>
      ) : null}

      {totals.overdue && mode !== 'overdue' ? (
        <Alert severity="error" icon={<WarningAmberIcon />} sx={{ mb: 1, borderRadius: '12px', py: 0.35 }}>
          <Stack direction="row" alignItems="center" spacing={1} useFlexGap flexWrap="wrap">
            <Typography sx={{ fontSize: 12 }}>
              {formatPersianNumber(totals.overdue)} مکاتبه از مهلت پاسخ گذشته است.
            </Typography>
            <Button size="small" variant="text" onClick={() => setOverdueOnly(true)}
              sx={{ fontSize: 12.5, fontWeight: 800, py: 0 }}>
              نمایش معوقات
            </Button>
          </Stack>
        </Alert>
      ) : null}

      {error ? (
        <Alert severity="error" sx={{ mb: 1, borderRadius: '12px', py: 0.35 }}
          onClose={() => setError('')}>
          <Typography sx={{ fontSize: 12 }}>{error}</Typography>
        </Alert>
      ) : null}
      {toast ? (
        <Alert severity="success" sx={{ mb: 1, borderRadius: '12px', py: 0.35 }}
          onClose={() => setToast('')}>
          <Typography sx={{ fontSize: 12 }}>{toast}</Typography>
        </Alert>
      ) : null}

      <ModuleToolbar
        theme={moduleTheme}
        search={search}
        onSearch={setSearch}
        searchPlaceholder={mode === 'all'
          ? 'جستجو در شماره، موضوع، طرف مکاتبه، اندیکاتور یا تنظیم‌کننده…'
          : `جستجو در ${preset.title}…`}
        sort={sortBy}
        sortOptions={[
          { value: 'newest', label: 'جدیدترین تاریخ' },
          { value: 'oldest', label: 'قدیمی‌ترین تاریخ' },
          { value: 'due', label: 'نزدیک‌ترین مهلت' },
          { value: 'number', label: 'شماره نامه' },
        ]}
        onSort={setSortBy}
        filters={pageFilters}
        activeChips={activeChips}
        activeFilterCount={activeFilterCount}
        onReset={resetFilters}
        filtersOpen={filtersOpen}
        setFiltersOpen={setFiltersOpen}
      />

      <Paper elevation={0}
        onKeyDown={(event) => {
          if (!editRowId) return;
          const target = event.target;
          if (event.key === 'Escape') {
            event.preventDefault();
            discardRow(editRowId);
            return;
          }
          if (event.key === 'Enter' && !event.shiftKey && target?.tagName === 'INPUT') {
            event.preventDefault();
            saveRowEdit(editRowId);
          }
        }}
        sx={{
          borderRadius: 'var(--hrms-table-radius, 16px)',
          overflow: 'hidden',
          px: `${moduleTheme.cardPadX}px`, py: `${moduleTheme.cardPadY}px`,
          border: '1px solid', borderColor: moduleTheme.cardBorderColor,
          bgcolor: 'background.paper', boxShadow: 'none',
        }}>
        <ModuleTable
          tableTheme={moduleTheme.tableTheme}
          ariaLabel="فهرست مکاتبات اداری"
          containerRef={tableRef}
          tableHeight={tableHeight}
          rowHeight={rowHeight}
          dimmed={isFetching}
          rows={rows}
          rowKey={(row) => row.letter.id}
          onRowClick={handleRowClick}
          rowAttributes={(row) => ({
            onDoubleClick: (event) => {
              event.preventDefault();
              handleRowDoubleClick(row);
            },
          })}
          emptyText="مکاتبه‌ای با این شرایط یافت نشد."
          minWidth={mode === 'incoming' ? 1720 : 1380}
          tableLayout="auto"
          columns={[
            {
              key: 'row', label: 'ردیف', width: '2.5%', align: 'center',
              render: (letterRow, index) => (
                <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.4}>
                  <CellText weight={700} color={MUTED}>
                    {toPersianDigits(page * pageSize + index + 1)}
                  </CellText>
                  {rowEditing(letterRow.letter) ? (
                    <Tooltip title="در حال ویرایش">
                      <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: ACCENT }} />
                    </Tooltip>
                  ) : rowDirty(letterRow.letter) ? (
                    <Tooltip title="تغییرات ذخیره‌نشده">
                      <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: OK }} />
                    </Tooltip>
                  ) : null}
                </Stack>
              ),
            },
            {
              key: 'number', label: 'شماره نامه',
              width: mode === 'incoming' ? '8%' : '9.5%',
              align: 'center',
              render: (row) => {
                if (rowEditing(row.letter)) {
                  return (
                    <Stack spacing={0.1}>
                      <InlineText value={draft.number} onChange={patchDraft('number')}
                        placeholder="شماره" align="center" />
                      <InlineText value={draft.indicator_no} onChange={patchDraft('indicator_no')}
                        placeholder="اندیکاتور" align="center" />
                    </Stack>
                  );
                }
                const numberText = row.letter.number ? toPersianDigits(row.letter.number) : 'بدون شماره';
                const indicatorText = row.letter.indicator_no
                  ? `اندیکاتور ${toPersianDigits(row.letter.indicator_no)}` : '';
                return (
                  <CellText mono weight={800} title={joinParts(numberText, indicatorText)}>
                    {joinParts(numberText, indicatorText)}
                  </CellText>
                );
              },
            },
            ...(mode === 'incoming' ? [
              {
                key: 'transmittal', label: 'ترقیم / شمارهٔ بیرونی', width: '7%', align: 'center',
                render: (row) => (rowEditing(row.letter) ? (
                  <Stack spacing={0.1}>
                    <InlineText value={draft.transmittal_no} onChange={patchDraft('transmittal_no')}
                      placeholder="ترقیم" align="center" />
                    <InlineText value={draft.external_number} onChange={patchDraft('external_number')}
                      placeholder="شمارهٔ بیرونی" align="center" />
                  </Stack>
                ) : (
                  <CellText mono weight={700} title={joinParts(
                    row.letter.transmittal_no, row.letter.external_number)}>
                    {joinParts(
                      row.letter.transmittal_no ? toPersianDigits(row.letter.transmittal_no) : '',
                      row.letter.external_number ? toPersianDigits(row.letter.external_number) : '',
                    ) || '—'}
                  </CellText>
                )),
              },
            ] : []),
            ...(mode === 'incoming' ? [
              {
                key: 'company_reg', label: 'ثبت شرکت', width: '8%', align: 'center',
                render: (row) => (rowEditing(row.letter) ? (
                  <Stack spacing={0.1}>
                    <InlineText value={draft.company_reg_no} onChange={patchDraft('company_reg_no')}
                      placeholder="شمارهٔ ثبت" align="center" />
                    <InlineDate value={draft.company_reg_date}
                      onChange={patchDraft('company_reg_date')} />
                  </Stack>
                ) : (
                  <CellText mono weight={800} title={joinParts(
                    row.letter.company_reg_no ? toPersianDigits(row.letter.company_reg_no) : '',
                    row.letter.company_reg_date ? dateLabel(row.letter.company_reg_date) : '',
                  )}>
                    {joinParts(
                      row.letter.company_reg_no ? toPersianDigits(row.letter.company_reg_no) : '—',
                      row.letter.company_reg_date ? dateLabel(row.letter.company_reg_date) : '',
                    )}
                  </CellText>
                )),
              },
              {
                key: 'unit_reg', label: 'ثبت واحد', width: '8%', align: 'center',
                render: (row) => (rowEditing(row.letter) ? (
                  <Stack spacing={0.1}>
                    <InlineText value={draft.unit_reg_no} onChange={patchDraft('unit_reg_no')}
                      placeholder="شمارهٔ ثبت واحد" align="center" />
                    <InlineDate value={draft.unit_reg_date}
                      onChange={patchDraft('unit_reg_date')} />
                    <InlineText value={draft.unit_name} onChange={patchDraft('unit_name')}
                      placeholder="نام واحد" align="center" />
                  </Stack>
                ) : (
                  <CellText mono weight={800} title={joinParts(
                    row.letter.unit_reg_no ? toPersianDigits(row.letter.unit_reg_no) : '',
                    row.letter.unit_reg_date ? dateLabel(row.letter.unit_reg_date) : '',
                    row.letter.unit_name || '',
                  )}>
                    {joinParts(
                      row.letter.unit_reg_no ? toPersianDigits(row.letter.unit_reg_no) : '—',
                      row.letter.unit_reg_date ? dateLabel(row.letter.unit_reg_date) : '',
                    )}
                  </CellText>
                )),
              },
            ] : []),
            {
              key: 'subject', label: 'موضوع', width: mode === 'incoming' ? '12%' : '20%',
              render: (row) => (rowEditing(row.letter) ? (
                <InlineText value={draft.subject} onChange={patchDraft('subject')}
                  placeholder="موضوع نامه" />
              ) : (
                <CellText weight={800}
                  title={joinParts(row.letter.subject, row.letter.summary, row.letter.category_title)}>
                  {row.letter.subject || '—'}
                </CellText>
              )),
            },
            ...(mode === 'incoming' ? [
              {
                key: 'sender', label: 'ارسال‌کننده', width: '10%',
                render: (row) => {
                  if (rowEditing(row.letter)) {
                    return (
                      <Stack spacing={0.25}>
                        <PersonnelPicker
                          label="" placeholder="پرسنل فرستنده"
                          variant="standard" size="small" sx={inlineSx}
                          value={personValue(draft.sender_employee, draft.sender_name)}
                          onChange={(option) => {
                            patchDraft('sender_employee')(option?.id || '');
                            if (option) {
                              patchDraft('sender_name')(option.full_name || '');
                              if (option.job_title) patchDraft('sender_title')(option.job_title);
                            }
                          }}
                        />
                        <PartyPicker
                          label="" placeholder="طرف حساب فرستنده"
                          variant="standard" size="small" sx={inlineSx}
                          value={partyValue(draft.sender_party, row.letter.sender_party_name)}
                          onChange={(party) => patchDraft('sender_party')(party?.id || '')}
                        />
                      </Stack>
                    );
                  }
                  const primary = row.letter.sender_party_name
                    || row.letter.sender_organization_name
                    || row.letter.sender_name || '—';
                  const secondary = row.letter.sender_title
                    || (primary !== row.letter.sender_name ? row.letter.sender_name : '');
                  return (
                    <CellText weight={800} title={joinParts(
                      row.letter.sender_party_name,
                      row.letter.sender_organization_name,
                      row.letter.sender_name,
                      row.letter.sender_title,
                    )}>
                      {joinParts(primary, secondary)}
                    </CellText>
                  );
                },
              },
            ] : []),
            {
              key: 'party', label: mode === 'incoming' ? 'طرف حساب' : 'طرف مکاتبه',
              width: mode === 'incoming' ? '8%' : '13%',
              render: (row) => {
                if (rowEditing(row.letter)) {
                  return (
                    <PartyPicker
                      label="" placeholder="طرف حساب"
                      variant="standard" size="small" sx={inlineSx}
                      value={partyValue(draft.party_account, row.letter.party_account_name)}
                      onChange={(party) => patchDraft('party_account')(party?.id || '')}
                    />
                  );
                }
                const partyText = row.letter.party_account_name || row.letter.sender_party_name
                  || row.letter.organization_name || row.letter.correspondent_name
                  || row.letter.sender_name || row.letter.receiver_name || '—';
                return (
                  <CellText weight={700} title={partyText}>{partyText}</CellText>
                );
              },
            },
            ...(mode === 'incoming' ? [
              {
                key: 'entry', label: 'نحوهٔ ورود', width: '9%',
                render: (row) => {
                  if (rowEditing(row.letter)) {
                    return (
                      <Stack spacing={0.1}>
                        <InlineSelect value={draft.entry_method}
                          onChange={patchDraft('entry_method')}
                          options={meta?.entry_methods || []} />
                        <InlineText value={draft.entry_time} onChange={patchDraft('entry_time')}
                          placeholder="ساعت ورود HH:MM" align="center" />
                      </Stack>
                    );
                  }
                  const entryMeta = ENTRY_METHOD_META[row.letter.entry_method];
                  const entryText = joinParts(
                    row.letter.entry_method_display || '',
                    row.letter.entry_time ? timeLabel(row.letter.entry_time) : '',
                    row.letter.entered_by_label || '',
                  );
                  return (
                    <CellText weight={800} color={entryMeta?.color || SLATE} title={entryText}>
                      {entryText || '—'}
                    </CellText>
                  );
                },
              },
              {
                key: 'delivery', label: 'تحویل / تحویل‌دهنده', width: '9%',
                render: (row) => {
                  if (rowEditing(row.letter)) {
                    return (
                      <Stack spacing={0.1}>
                        <InlineSelect value={draft.delivery_type}
                          onChange={patchDraft('delivery_type')}
                          options={meta?.delivery_types || []} />
                        <InlineText value={draft.delivered_by_name}
                          onChange={patchDraft('delivered_by_name')}
                          placeholder="نام تحویل‌دهنده" />
                      </Stack>
                    );
                  }
                  const deliveryMeta = DELIVERY_TYPE_META[row.letter.delivery_type];
                  const deliveryText = joinParts(
                    row.letter.delivery_type_display || deliveryMeta?.label || '',
                    row.letter.delivered_by_label || row.letter.delivered_by_name || '',
                  );
                  return (
                    <CellText weight={800} color={deliveryMeta?.color || SLATE} title={deliveryText}>
                      {deliveryText || '—'}
                    </CellText>
                  );
                },
              },
            ] : []),
            {
              key: 'date', label: 'تاریخ نامه',
              width: mode === 'incoming' ? '7%' : '7%',
              align: 'center',
              render: (row) => (rowEditing(row.letter) ? (
                <InlineDate value={draft.letter_date} onChange={patchDraft('letter_date')} />
              ) : (
                <CellText mono weight={700}>{dateLabel(row.letter.letter_date)}</CellText>
              )),
            },
            {
              key: 'due', label: 'مهلت پاسخ',
              width: mode === 'incoming' ? '7%' : '8%',
              align: 'center',
              render: (row) => (rowEditing(row.letter) ? (
                <InlineDate value={draft.due_date} onChange={patchDraft('due_date')} />
              ) : (
                row.letter.due_date ? (
                  <Chip size="small" label={daysLabel(row.days)} sx={chipSx(daysColor(row.days))} />
                ) : <CellText color={MUTED}>—</CellText>
              )),
            },
            ...(mode === 'incoming' ? [] : [
              {
                key: 'type', label: 'نوع / جهت', width: '6.5%', align: 'center',
                render: (row) => (
                  <Tooltip title={row.letter.category_title || ''}>
                    <Chip size="small" label={row.directionMeta.label}
                      sx={chipSx(row.directionMeta.color, row.directionMeta.bg)} />
                  </Tooltip>
                ),
              },
            ]),
            {
              key: 'referral', label: 'آخرین ارجاع',
              width: mode === 'incoming' ? '6.5%' : '7.5%',
              align: 'center',
              render: (row) => {
                const last = row.letter.last_referral;
                if (!last) return <CellText color={MUTED}>—</CellText>;
                const referralMeta = REFERRAL_STATUS_META[last.status];
                const referralName = last.to_user_name || last.to_name || '—';
                return (
                  <CellText
                    weight={800}
                    color={referralMeta?.color || MUTED}
                    title={joinParts(referralName, referralMeta?.label, dateLabel(last.referred_on))}
                  >
                    {referralName}
                  </CellText>
                );
              },
            },
            {
              key: 'status', label: 'وضعیت',
              width: mode === 'incoming' ? '7%' : '7%',
              align: 'center',
              render: (row) => (rowEditing(row.letter) ? (
                <InlineSelect value={draft.status} onChange={patchDraft('status')}
                  options={meta?.statuses || []} />
              ) : (
                <Chip size="small" label={row.statusMeta.label}
                  sx={chipSx(row.statusMeta.color, row.statusMeta.bg)} />
              )),
            },
            {
              key: 'priority', label: 'اولویت', width: '6%', align: 'center',
              render: (row) => (rowEditing(row.letter) ? (
                <InlineSelect value={draft.priority} onChange={patchDraft('priority')}
                  options={meta?.priorities || []} />
              ) : (
                <Chip size="small" label={PRIORITY_META[row.letter.priority]?.label || '—'}
                  sx={chipSx(PRIORITY_META[row.letter.priority]?.color || SLATE)} />
              )),
            },
            ...(mode === 'incoming' ? [] : [
              {
                key: 'attachments', label: 'پیوست', width: '4%', align: 'center',
                render: (row) => (
                  row.letter.attachment_count ? (
                    <Chip size="small" label={toPersianDigits(row.letter.attachment_count)}
                      sx={chipSx(INTERNAL)} />
                  ) : <CellText color={MUTED}>—</CellText>
                ),
              },
            ]),
            {
              key: 'actions', label: 'عملیات',
              width: mode === 'incoming' ? '4.5%' : '6.5%',
              align: 'center',
              render: (row) => {
                const rowSaving = savingIds.includes(row.letter.id);
                if (rowEditing(row.letter)) {
                  return (
                    <Stack direction="row" spacing={0.1} useFlexGap justifyContent="center"
                      onClick={(event) => event.stopPropagation()}>
                      <Tooltip title="ذخیرهٔ ردیف (Enter)">
                        <span>
                          <IconButton size="small" disabled={rowSaving}
                            onClick={() => saveRowEdit(row.letter.id)}
                            aria-label="ذخیرهٔ ردیف">
                            {rowSaving
                              ? <CircularProgress size={14} />
                              : <CheckCircleOutlineIcon sx={{ fontSize: 16, color: OK }} />}
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="انصراف از ویرایش (Esc)">
                        <IconButton size="small" aria-label="انصراف از ویرایش"
                          onClick={() => discardRow(row.letter.id)}>
                          <CloseIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  );
                }
                return (
                <Stack direction="row" spacing={0.1} useFlexGap justifyContent="center"
                  onClick={(event) => event.stopPropagation()}>
                  <Tooltip title={rowDirty(row.letter) ? 'ادامهٔ ویرایش (تغییرات ذخیره‌نشده)' : 'ویرایش این ردیف'}>
                    <span>
                      <IconButton size="small" aria-label="ویرایش ردیف"
                        disabled={rowSaving}
                        onClick={() => startRowEdit(row.letter)}>
                        {rowSaving
                          ? <CircularProgress size={14} />
                          : (
                            <EditOutlinedIcon
                              sx={{ fontSize: 15, color: rowDirty(row.letter) ? OK : ACCENT }}
                            />
                          )}
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="مشاهدهٔ پرونده">
                    <IconButton size="small" aria-label="مشاهدهٔ نامه"
                      onClick={() => { setDrawerLetter(row.letter); setComment(''); }}>
                      <VisibilityOutlinedIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                  </Tooltip>
                  {!['archived', 'closed', 'canceled'].includes(row.letter.status) ? (
                    <Tooltip title="ارجاع">
                      <IconButton size="small" aria-label="ارجاع نامه"
                        onClick={() => setReferLetter(row.letter)}>
                        <ForwardToInboxIcon sx={{ fontSize: 15, color: WARN }} />
                      </IconButton>
                    </Tooltip>
                  ) : null}
                  {!row.letter.number && row.letter.status !== 'archived' ? (
                    <Tooltip title="ثبت شماره">
                      <IconButton size="small" aria-label="ثبت شماره"
                        onClick={() => letterAction.mutate({ id: row.letter.id, action: 'register' })}>
                        <TaskAltIcon sx={{ fontSize: 15, color: INCOMING }} />
                      </IconButton>
                    </Tooltip>
                  ) : null}
                  {!['archived', 'canceled'].includes(row.letter.status) ? (
                    <Tooltip title="ایجاد پاسخ">
                      <IconButton size="small" aria-label="ایجاد پاسخ"
                        onClick={() => letterAction.mutate({ id: row.letter.id, action: 'reply', payload: {} })}>
                        <ReplyIcon sx={{ fontSize: 15, color: OK }} />
                      </IconButton>
                    </Tooltip>
                  ) : null}
                </Stack>
                );
              },
            },
          ]}
        />
        <ModulePager
          tableTheme={moduleTheme.tableTheme}
          page={page}
          onPage={setPage}
          totalPages={totalPages}
          pageNumbers={pageNumbers}
          total={total}
          pageSize={pageSize}
          unit="مکاتبه"
        />
        <Stack direction="row" alignItems="center" spacing={1} useFlexGap flexWrap="wrap"
          sx={{ pt: 1.25, mt: 1.25, borderTop: '1px dashed', borderColor: 'divider' }}>
          {!preset.direction ? (
            <>
              <Chip size="small" label={`وارده: ${formatPersianNumber(stats?.by_direction?.incoming ?? counts.incoming ?? 0)}`} sx={chipSx(INCOMING)} />
              <Chip size="small" label={`صادره: ${formatPersianNumber(stats?.by_direction?.outgoing ?? counts.outgoing ?? 0)}`} sx={chipSx(OUTGOING)} />
              <Chip size="small" label={`داخلی: ${formatPersianNumber(stats?.by_direction?.internal ?? counts.internal ?? 0)}`} sx={chipSx(INTERNAL)} />
            </>
          ) : null}
          {!preset.status ? (
            <Chip size="small" label={`پیش‌نویس: ${formatPersianNumber(stats?.by_status?.draft ?? counts.draft ?? 0)}`} sx={chipSx(SLATE)} />
          ) : null}
          <Chip size="small" label={`در جریان: ${formatPersianNumber(stats?.by_status?.in_progress ?? counts.in_progress ?? 0)}`} sx={chipSx(WARN)} />
          {!preset.archived ? (
            <Chip size="small" label={`بایگانی: ${formatPersianNumber(stats?.by_status?.archived ?? counts.archived ?? 0)}`} sx={chipSx('#334155')} />
          ) : null}
          <Chip size="small" label={`ارجاعات من: ${formatPersianNumber(myReferralCount)}`} sx={chipSx(INTERNAL)} />
          {totals.urgent ? (
            <Chip size="small" label={`فوری/زیاد: ${formatPersianNumber(totals.urgent)}`} sx={chipSx(DANGER)} />
          ) : null}
        </Stack>
      </Paper>

      <Dialog
        open={Boolean(drawerLetter)}
        onClose={() => setDrawerLetter(null)}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { borderRadius: '18px', height: { xs: '96%', md: '90%' } } }}
      >
        {activeLetter ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0 }}>
            <Box sx={{ p: 1.75, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Stack direction="row" alignItems="flex-start" spacing={1} sx={{ minWidth: 0 }}>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography noWrap title={activeLetter.subject} sx={{ fontSize: 15, fontWeight: 900 }}>
                    {activeLetter.subject || 'بدون موضوع'}
                  </Typography>
                  <Typography noWrap sx={{ fontSize: 12.5, color: MUTED, fontWeight: 600 }}>
                    {activeLetter.number ? `شماره: ${toPersianDigits(activeLetter.number)}` : 'بدون شماره'}
                    {activeLetter.indicator_no ? ` · اندیکاتور: ${activeLetter.indicator_no}` : ''}
                    {activeLetter.transmittal_no ? ` · ترنسمیتال: ${activeLetter.transmittal_no}` : ''}
                    {activeLetter.entry_method_display ? ` · ورود: ${activeLetter.entry_method_display}` : ''}
                  </Typography>
                </Box>
                <IconButton size="small" onClick={() => setDrawerLetter(null)} aria-label="بستن">
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Stack>
              <Stack direction="row" spacing={0.6} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                <MetaChip meta={DIRECTION_META[activeLetter.direction]} />
                <MetaChip meta={STATUS_META[activeLetter.status]} />
                <MetaChip meta={PRIORITY_META[activeLetter.priority]} />
                {activeLetter.confidentiality !== 'normal' ? (
                  <MetaChip meta={CONFIDENTIALITY_META[activeLetter.confidentiality]} />
                ) : null}
                <Chip size="small" label={`پیوست: ${toPersianDigits(activeLetter.attachment_count || 0)}`}
                  sx={chipSx(INTERNAL)} />
                <Chip size="small" label={`ارجاع: ${toPersianDigits(activeLetter.referral_count || 0)}`}
                  sx={chipSx(WARN)} />
              </Stack>
              <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mt: 1.25 }}>
                {!activeLetter.number ? (
                  <Button size="small" variant="outlined" startIcon={<TaskAltIcon />}
                    onClick={() => letterAction.mutate({ id: activeLetter.id, action: 'register' })}>
                    ثبت شماره
                  </Button>
                ) : null}
                {!['archived', 'closed', 'canceled'].includes(activeLetter.status) ? (
                  <>
                    <Button size="small" variant="outlined" startIcon={<ForwardToInboxIcon />}
                      onClick={() => setReferLetter(activeLetter)}>
                      ارجاع
                    </Button>
                    <Button size="small" variant="outlined" startIcon={<ReplyIcon />}
                      onClick={() => letterAction.mutate({ id: activeLetter.id, action: 'reply', payload: {} })}>
                      پاسخ
                    </Button>
                    <Button size="small" variant="outlined" startIcon={<TaskAltIcon />}
                      onClick={() => letterAction.mutate({ id: activeLetter.id, action: 'close' })}>
                      بستن پرونده
                    </Button>
                  </>
                ) : null}
                {activeLetter.status !== 'archived' ? (
                  <Button size="small" variant="outlined" startIcon={<ArchiveIcon />}
                    onClick={() => letterAction.mutate({ id: activeLetter.id, action: 'archive' })}>
                    بایگانی
                  </Button>
                ) : null}
                <Button size="small" variant="outlined" startIcon={<EditNoteIcon />}
                  onClick={() => { setFormLetter(activeLetter); setFormOpen(true); }}>
                  ویرایش
                </Button>
                <Button size="small" variant="outlined" startIcon={<PrintOutlinedIcon />}
                  onClick={() => window.print()}>
                  چاپ
                </Button>
              </Stack>
            </Box>

            <Tabs value={drawerTab} onChange={(_event, value) => setDrawerTab(value)}
              sx={{
                minHeight: 38, px: 1.5,
                borderBottom: '1px solid', borderColor: 'divider',
                '& .MuiTab-root': { minHeight: 38, py: 0.4, fontSize: 12.5, fontWeight: 800 },
                '& .MuiTabs-indicator': { bgcolor: ACCENT, height: 2.5, borderRadius: 2 },
              }}>
              <Tab value="info" label="مشخصات" />
              <Tab value="referrals" label={`ارجاعات (${toPersianDigits(activeLetter.referral_count || 0)})`} />
              <Tab value="attachments" label={`پیوست‌ها (${toPersianDigits(activeLetter.attachment_count || 0)})`} />
              <Tab value="history" label="تاریخچه" />
            </Tabs>

            <Box sx={{ p: 1.75, overflowY: 'auto', flex: 1, minWidth: 0 }}>
              {drawerTab === 'info' ? (
                <Box sx={{ minWidth: 0 }}>
                  <InfoGroup icon={InboxIcon} title="ثبت و ورود" color={WARN}>
                    <InfoTable rows={[
                      ['نحوهٔ ورود', activeLetter.entry_method_display],
                      ['ساعت ورود', activeLetter.entry_time ? timeLabel(activeLetter.entry_time) : ''],
                      ['ثبت‌کنندهٔ ورود', activeLetter.entered_by_label],
                      ['تاریخ ورود', dateLabel(activeLetter.received_date)],
                      ['واحد ثبت‌کننده', activeLetter.unit_name],
                      ['تاریخ نامه', dateLabel(activeLetter.letter_date)],
                    ]} />
                  </InfoGroup>

                  <InfoGroup icon={EditNoteIcon} title="شماره‌های ثبت" color={INCOMING}>
                    <InfoTable rows={[
                      ['شماره نامه', activeLetter.number ? toPersianDigits(activeLetter.number) : ''],
                      ['شماره اندیکاتور', activeLetter.indicator_no],
                      ['ترنسمیتال', activeLetter.transmittal_no],
                      ['شماره ثبت ورود به شرکت',
                        activeLetter.company_reg_no ? toPersianDigits(activeLetter.company_reg_no) : ''],
                      ['تاریخ ثبت ورود به شرکت', dateLabel(activeLetter.company_reg_date)],
                      ['شماره ثبت ورود به واحد',
                        activeLetter.unit_reg_no ? toPersianDigits(activeLetter.unit_reg_no) : ''],
                      ['تاریخ ثبت ورود به واحد', dateLabel(activeLetter.unit_reg_date)],
                      ['شماره نامه طرف مقابل', activeLetter.external_number],
                      ['پاسخ به نامه', activeLetter.reply_number],
                    ]} />
                  </InfoGroup>

                  <InfoGroup icon={SendIcon} title="طرفین مکاتبه" color={OUTGOING}>
                    <InfoTable rows={[
                      ['سازمان ارسال‌کننده', activeLetter.sender_organization_name],
                      ['نام ارسال‌کننده', activeLetter.sender_name],
                      ['سمت ارسال‌کننده', activeLetter.sender_title],
                      ['طرف حساب (سازمان)', activeLetter.organization_name],
                      ['مخاطب', activeLetter.correspondent_name],
                      ['گیرنده', activeLetter.receiver_name],
                    ]} />
                  </InfoGroup>

                  <InfoGroup icon={MailOutlineIcon} title="مشخصات و بایگانی" color={INTERNAL}>
                    <InfoTable rows={[
                      ['نوع مکاتبه', activeLetter.category_title],
                      ['اولویت', activeLetter.priority_display],
                      ['محرمانگی', activeLetter.confidentiality_display],
                      ['مهلت پاسخ', activeLetter.due_date
                        ? `${dateLabel(activeLetter.due_date)} (${daysLabel(daysBetween(activeLetter.due_date))})`
                        : ''],
                      ['شماره قرارداد', activeLetter.contract_number],
                      ['شماره بایگانی', activeLetter.archive_ref],
                      ['تنظیم‌کننده', activeLetter.drafter_name],
                      ['ثبت‌کننده', activeLetter.created_by_name],
                      ['مبلغ', activeLetter.amount
                        ? `${money(activeLetter.amount)} ${activeLetter.currency || 'ریال'}` : ''],
                    ]} />
                  </InfoGroup>

                  <InfoGroup icon={EditNoteIcon} title="موضوع و متن" color={SLATE}>
                    <InfoTable columns={1} rows={[
                      ['موضوع', activeLetter.subject],
                      ['خلاصه', activeLetter.summary],
                      ['متن نامه', activeLetter.body],
                    ]} />
                  </InfoGroup>
                </Box>
              ) : null}

              {drawerTab === 'referrals' ? (
                <Stack spacing={1}>
                  {(activeLetter.referrals || []).length ? (activeLetter.referrals || []).map((referral) => {
                    const meta = REFERRAL_STATUS_META[referral.status] || REFERRAL_STATUS_META.pending;
                    const referralDays = daysBetween(referral.due_date);
                    return (
                      <Box key={referral.id} sx={{
                        p: 1.1, borderRadius: '12px', border: '1px solid',
                        borderColor: alpha(meta.color, 0.25), minWidth: 0,
                        bgcolor: alpha(meta.color, 0.03),
                      }}>
                        <Stack direction="row" alignItems="center" spacing={0.75} useFlexGap flexWrap="wrap">
                          <Chip size="small" label={`سطح ${toPersianDigits(referral.seq)}`} sx={chipSx(SLATE)} />
                          <MetaChip meta={meta} />
                          <Typography noWrap sx={{ fontSize: 12, color: MUTED }}>
                            {referral.from_user_name ? `از ${referral.from_user_name}` : ''}
                            {(referral.from_user_name && (referral.to_user_name || referral.to_name)) ? ' → ' : ''}
                            {referral.to_user_name || referral.to_name || ''}
                          </Typography>
                          <Box sx={{ flex: 1 }} />
                          <Typography sx={{ fontSize: 11.5, color: MUTED }}>
                            {dateLabel(referral.referred_on)}
                          </Typography>
                        </Stack>

                        {referral.instruction ? (
                          <Box sx={{ mt: 0.75 }}>
                            <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: MUTED }}>دستور / اقدام درخواستی</Typography>
                            <Typography sx={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>{referral.instruction}</Typography>
                          </Box>
                        ) : null}
                        {referral.note ? (
                          <Box sx={{ mt: 0.5 }}>
                            <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: MUTED }}>توضیح</Typography>
                            <Typography sx={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>{referral.note}</Typography>
                          </Box>
                        ) : null}
                        {referral.due_date ? (
                          <Typography sx={{ fontSize: 11.5, mt: 0.4, color: daysColor(referralDays) }}>
                            مهلت اقدام: {dateLabel(referral.due_date)} ({daysLabel(referralDays)})
                          </Typography>
                        ) : null}

                        {referral.response ? (
                          <Box sx={{ mt: 0.75, p: 0.75, borderRadius: '8px', bgcolor: alpha(OK, 0.05) }}>
                            <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: OK }}>پاسخ / جوابیه</Typography>
                            <Typography sx={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>{referral.response}</Typography>
                          </Box>
                        ) : null}
                        {referral.result ? (
                          <Box sx={{ mt: 0.5, p: 0.75, borderRadius: '8px', bgcolor: alpha(INCOMING, 0.05) }}>
                            <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: INCOMING }}>نتیجه</Typography>
                            <Typography sx={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>{referral.result}</Typography>
                          </Box>
                        ) : null}
                        {referral.result_note && !referral.result ? (
                          <Typography sx={{ fontSize: 11.5, color: OK, mt: 0.3 }}>
                            یادداشت نتیجه: {referral.result_note}
                          </Typography>
                        ) : null}

                        <Stack direction="row" alignItems="center" spacing={1} useFlexGap flexWrap="wrap"
                          sx={{ mt: 0.6 }}>
                          {referral.answered_on ? (
                            <Typography sx={{ fontSize: 11.5, color: MUTED }}>
                              پاسخ در {dateLabel(referral.answered_on)}
                              {referral.answered_by_name ? ` توسط ${referral.answered_by_name}` : ''}
                            </Typography>
                          ) : null}
                          {!['done', 'canceled'].includes(referral.status) ? (
                            <Button size="small" variant="contained" startIcon={<TaskAltIcon />}
                              onClick={() => setCompleteReferral(referral)}
                              sx={{ fontSize: 11.5, py: 0.2, bgcolor: OK, '&:hover': { bgcolor: '#115e59' } }}>
                              ثبت پاسخ و نتیجه
                            </Button>
                          ) : null}
                        </Stack>
                      </Box>
                    );
                  }) : (
                    <Typography sx={{ fontSize: 12.5, color: MUTED }}>
                      هنوز ارجاعی برای این نامه ثبت نشده است.
                    </Typography>
                  )}
                </Stack>
              ) : null}

              {drawerTab === 'attachments' ? (
                <Stack spacing={1}>
                  <Button size="small" variant="outlined" startIcon={<AttachFileIcon />}
                    disabled={uploading} onClick={() => uploadRef.current?.click()}>
                    {uploading ? 'در حال بارگذاری…' : 'افزودن پیوست'}
                  </Button>
                  <input ref={uploadRef} type="file" hidden onChange={uploadAttachment} />
                  {(activeLetter.attachments || []).length ? (activeLetter.attachments || []).map((file) => (
                    <Stack key={file.id} direction="row" alignItems="center" spacing={0.75}
                      sx={{ p: 0.75, borderRadius: '10px', border: '1px solid', borderColor: 'divider', minWidth: 0 }}>
                      <AttachFileIcon sx={{ fontSize: 16, color: INTERNAL }} />
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography noWrap title={file.title} sx={{ fontSize: 12.5, fontWeight: 800 }}>
                          {file.title || 'پیوست'}
                        </Typography>
                        <Typography noWrap sx={{ fontSize: 11.5, color: MUTED }}>
                          {file.kind_display} · {toPersianDigits(Math.max(1, Math.round((file.size || 0) / 1024)))} کیلوبایت
                        </Typography>
                      </Box>
                      <Tooltip title="دانلود">
                        <IconButton size="small" aria-label="دانلود پیوست"
                          component="a" href={file.file_url} target="_blank" rel="noreferrer">
                          <DownloadIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  )) : (
                    <Typography sx={{ fontSize: 12.5, color: MUTED }}>پیوستی ثبت نشده است.</Typography>
                  )}
                </Stack>
              ) : null}

              {drawerTab === 'history' ? (
                <Stack spacing={1}>
                  <Stack direction="row" spacing={0.75} alignItems="flex-start">
                    <TextField size="small" fullWidth multiline minRows={2} label="یادداشت جدید"
                      value={comment} onChange={(event) => setComment(event.target.value)} />
                    <Button size="small" variant="contained"
                      disabled={!comment.trim() || letterAction.isPending}
                      onClick={() => letterAction.mutate({
                        id: activeLetter.id, action: 'comment', payload: { note: comment },
                      })}
                      sx={{ bgcolor: ACCENT, minWidth: 80, height: 40 }}>
                      ثبت
                    </Button>
                  </Stack>
                  {(activeLetter.events || []).length ? (activeLetter.events || []).map((event) => (
                    <Stack key={event.id} direction="row" spacing={0.75}
                      sx={{
                        p: 0.75, border: '1px solid', borderColor: 'divider',
                        borderRadius: '10px', minWidth: 0,
                      }}>
                      <Box sx={{
                        width: 8, height: 8, borderRadius: '50%', mt: 0.7, flex: '0 0 auto',
                        bgcolor: EVENT_META[event.action]?.color || SLATE,
                      }} />
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 800 }}>
                          {EVENT_META[event.action]?.label || event.action}
                        </Typography>
                        {event.note ? (
                          <Typography sx={{ fontSize: 11.5, whiteSpace: 'pre-wrap' }}>{event.note}</Typography>
                        ) : null}
                        <Typography sx={{ fontSize: 11.5, color: MUTED }}>
                          {event.actor_name || '—'} · {dateTimeLabel(event.created_at)}
                        </Typography>
                      </Box>
                    </Stack>
                  )) : (
                    <Typography sx={{ fontSize: 12.5, color: MUTED }}>رویدادی ثبت نشده است.</Typography>
                  )}
                </Stack>
              ) : null}
            </Box>
          </Box>
        ) : null}
      </Dialog>

      <LetterFormDialog
        open={formOpen}
        initial={formLetter}
        presetDirection={preset.direction || (direction !== 'all' ? direction : 'incoming')}
        meta={meta}
        users={users}
        contacts={contacts}
        onClose={() => { setFormOpen(false); setFormLetter(null); }}
        onSaved={(letter) => setDrawerLetter(letter)}
      />

      <CompleteReferralDialog
        open={Boolean(completeReferral)}
        referral={completeReferral}
        pending={referralComplete.isPending}
        onClose={() => setCompleteReferral(null)}
        onSubmit={(payload) => referralComplete.mutate({ id: completeReferral.id, payload })}
      />

      <ReferDialog
        open={Boolean(referLetter)}
        letter={referLetter}
        pending={letterAction.isPending}
        onClose={() => setReferLetter(null)}
        onSubmit={(payload) => {
          letterAction.mutate({ id: referLetter.id, action: 'refer', payload });
          setReferLetter(null);
        }}
      />
    </Box>
  );
};

export default CorrespondenceLettersPage;





