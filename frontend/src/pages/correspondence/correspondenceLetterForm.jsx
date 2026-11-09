/**
 * دیالوگ ثبت/ویرایش نامه + ثابت‌ها و helperهای فرم.
 *
 * این بخش از ``CorrespondenceLettersPage.jsx`` جدا شد (نگهداشت‌پذیری فاز ۴) تا
 * صفحه فقط فهرست/کشو/عملیات را نگه دارد.
 */
import ArchiveIcon from '@mui/icons-material/Archive';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditNoteIcon from '@mui/icons-material/EditNote';
import InboxIcon from '@mui/icons-material/MoveToInbox';
import JalaliMaskedDateInput from '../../core/components/ui/JalaliMaskedDateInput';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import React, { useEffect, useRef, useState } from 'react';
import { MUTED } from '../accounting/AccountingDashboardUI';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import SendIcon from '@mui/icons-material/Send';
import {
  Alert, Autocomplete, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, IconButton, MenuItem, Stack, Switch, TextField, Tooltip, Typography,
} from '@mui/material';
import { FormSection, FormTable, PersianTimeInput } from './correspondenceFormUi';
import {
  ACCENT, CONFIDENTIALITY_META, DIRECTION_META, INCOMING, INTERNAL, MetaChip, OK,
  OUTGOING, PRIORITY_META, SLATE, WARN,
} from './correspondenceUi';
import { PartyPicker, PersonnelPicker, partyValue, personValue } from './correspondenceLookups';
import { alpha } from '@mui/material/styles';
import { toPersianDigits } from '../../core/utils/numberUtils';
import axiosInstance from '../../core/api/axiosConfig';
import { CONTACTS_KEY, LETTERS_KEY, STATS_KEY } from './correspondenceQueryKeys';


const EMPTY_LETTER = {
  direction: 'incoming',
  category: '',
  number: '',
  series: '',
  letter_date: new Date().toISOString().slice(0, 10),
  received_date: '',
  sent_date: '',
  due_date: '',
  entry_method: 'manual',
  entry_time: '',
  company_reg_no: '',
  company_reg_date: '',
  unit_reg_no: '',
  unit_reg_date: '',
  unit_name: '',
  organization: '',
  correspondent: '',
  sender_organization: '',
  sender_name: '',
  receiver_name: '',
  sender_employee: '',
  receiver_employee: '',
  sender_party: '',
  sender_party_name: '',
  sender_kind: 'employee',
  party_account: '',
  party_account_name: '',
  party_name: '',
  party_create_in_contracts: false,
  delivery_type: 'in_person',
  delivered_by: '',
  delivered_by_name: '',
  priority: 'normal',
  confidentiality: 'normal',
  subject: '',
  summary: '',
  body: '',
  amount: '',
  contract: '',
  contract_title: '',
  contract_number: '',
  register: false,
};

const DATE_KEYS = ['letter_date', 'received_date', 'sent_date', 'due_date',
  'company_reg_date', 'unit_reg_date'];

const isIncomingDirection = (direction) => direction !== 'outgoing' && direction !== 'internal';

/** پیش‌فرض واحدهای مالی/اداری برای نامه‌های وارده */
const DEFAULT_RECEIVER_NAME = 'مهدیه جمشیدنیا';
const DEFAULT_CORRESPONDENT_NAME = 'مرتضی اسدنژاد';
let pendingCorrespondentRequest = null;

const ensureDefaultCorrespondent = async () => {
  if (!pendingCorrespondentRequest) {
    pendingCorrespondentRequest = axiosInstance
      .post('/correspondents/', { name: DEFAULT_CORRESPONDENT_NAME, kind: 'person' })
      .then((response) => response.data?.id || '')
      .catch(() => '')
      .finally(() => { pendingCorrespondentRequest = null; });
  }
  return pendingCorrespondentRequest;
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


const asList = (payload) => (Array.isArray(payload) ? payload : payload?.results || []);

/**
 * هر آیتم منوی مکاتبات صفحهٔ مستقل خودش را دارد تا کاربر بدون فیلترِ اضافه
 * (مثلاً «جهت» که از قبل مشخص است) وارد فهرست مربوطه شود.
 */

const safeDate = (value) => (value ? String(value).slice(0, 10) : '');

const UI_ONLY_KEYS = new Set([
  'register', 'contract_title', 'sender_party_name', 'party_account_name',
  'party_create_in_contracts',
]);

/* فیلدهایی که خالی‌کردن‌شان در حالت ویرایش باید null ذخیره شود (FK/تاریخ). */
const NULLABLE_FIELDS = [
  'category', 'sender_employee', 'receiver_employee', 'sender_party', 'party_account',
  'delivered_by', 'company_reg_date', 'unit_reg_date', 'due_date', 'entry_time', 'contract',
  'sent_date', 'contract_title',
];

/* متن‌های آزاد که پاک‌شدن‌شان باید با رشتهٔ خالی ذخیره شود (نه null). */
const EMPTY_ALLOWED_FIELDS = ['party_name'];
/* متن‌هایی که کاربر باید بتواند در دیالوگ ویرایش خالی کند. */
const CLEARABLE_TEXT_FIELDS = [
  'number', 'external_number', 'indicator_no', 'transmittal_no', 'archive_ref',
  'company_reg_no', 'unit_reg_no', 'unit_name', 'subject', 'summary', 'body',
  'sender_name', 'receiver_name', 'delivered_by_name', 'contract_number', 'tags',
];

/**
 * ساخت payload ثبت/ویرایش.
 * در حالت «ایجاد» فیلدهای خالی ارسال نمی‌شوند؛ در حالت «ویرایش» خالی‌کردن
 * فیلدها هم ارسال می‌شود تا کاربر بتواند مقدار قبلی را پاک کند.
 */
const cleanPayload = (form, { editing = false } = {}) => {
  const payload = {};
  Object.entries(form).forEach(([key, value]) => {
    if (UI_ONLY_KEYS.has(key)) return;
    const empty = value === '' || value === null || value === undefined;
    if (!empty) {
      payload[key] = value;
      return;
    }
    if (!editing) return;
    if (EMPTY_ALLOWED_FIELDS.includes(key) || CLEARABLE_TEXT_FIELDS.includes(key)) {
      payload[key] = '';
      return;
    }
    if (NULLABLE_FIELDS.includes(key)) payload[key] = null;
  });
  if (payload.amount === '' || payload.amount === null || payload.amount === undefined) {
    if (editing) payload.amount = null;
    else delete payload.amount;
  } else {
    payload.amount = Number(payload.amount) || 0;
  }
  return payload;
};


const LetterFormDialog = ({
  open, initial, presetDirection, meta, contacts, canDelete, onClose, onSaved,
}) => {
  const qc = useQueryClient();
  const [form, setForm] = useState({ ...EMPTY_LETTER, direction: presetDirection || 'incoming' });
  const [files, setFiles] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [error, setError] = useState('');
  const fileRef = useRef(null);
  /* آخرین شمارهٔ پیشنهادی گروه (برای تشخیص ویرایش دستی شماره توسط کاربر) */
  const suggestionRef = useRef('');

  const deleteExistingAttachment = useMutation({
    mutationFn: (attachmentId) => axiosInstance.delete(`/letter-attachments/${attachmentId}/`),
    onSuccess: (_data, attachmentId) => {
      setExistingAttachments((previous) => previous.filter((row) => row.id !== attachmentId));
      qc.invalidateQueries({ queryKey: LETTERS_KEY });
      qc.invalidateQueries({ queryKey: ['correspondence-letter'] });
      setError('');
    },
    onError: (err) => setError(
      err?.response?.data?.detail || 'حذف پیوست ممکن نشد (مجوز یا وابستگی).',
    ),
  });

  useEffect(() => {
    if (!open) return;
    setError('');
    setFiles([]);
    setExistingAttachments((initial?.attachments || []).filter((row) => row?.id));
    if (initial) {
      const next = { ...EMPTY_LETTER };
      Object.keys(EMPTY_LETTER).forEach((key) => {
        if (initial[key] !== undefined && initial[key] !== null) next[key] = initial[key];
      });
      DATE_KEYS.forEach((key) => { next[key] = safeDate(initial[key]); });
      next.direction = initial.direction || 'incoming';
      next.sender_kind = (
        initial.sender_kind === 'party' || initial.sender_party ? 'party' : 'employee'
      );
      if (next.sender_kind === 'party' && !next.sender_party_name) {
        next.sender_party_name = initial.sender_name || '';
      }
      /* ثبت‌کنندهٔ قدیمی → تحویل‌دهنده (مهاجرت نرم در ویرایش) */
      if (!next.delivered_by && !next.delivered_by_name && initial.entered_by_label) {
        next.delivered_by_name = initial.entered_by_label;
      }
      next.register = false;
      setForm(next);
      suggestionRef.current = '';
    } else {
      const direction = presetDirection || 'incoming';
      setForm({
        ...EMPTY_LETTER,
        direction,
        series: meta?.defaults?.[direction]?.series || '',
      });
      suggestionRef.current = '';
    }
  }, [open, initial, presetDirection]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = cleanPayload(form, { editing: Boolean(initial) });
      if (!payload.subject) throw new Error('موضوع نامه الزامی است.');
      if (!payload.letter_date) throw new Error('تاریخ نامه الزامی است.');
      const response = initial
        ? await axiosInstance.patch(`/letters/${initial.id}/`, payload)
        : await axiosInstance.post('/letters/', payload);
      const letter = response.data;
      // پیوست‌ها موازی آپلود می‌شوند؛ خطای هر فایل جداگانه گزارش می‌شود.
      if (files.length) {
        const results = await Promise.allSettled(files.map((file) => {
          const body = new FormData();
          body.append('file', file);
          body.append('title', file.name);
          body.append('kind', 'attachment');
          return axiosInstance.post(`/letters/${letter.id}/attachments/`, body, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        }));
        const failed = results.filter((row) => row.status === 'rejected');
        if (failed.length) {
          const firstError = failed[0].reason?.response?.data?.detail;
          const message = firstError
            || `${failed.length} فایل از ${files.length} فایل آپلود نشد.`;
          if (failed.length === results.length) throw new Error(message);
          letter.uploadWarning = message;
        }
      }
      return letter;
    },
    onSuccess: (letter) => {
      qc.invalidateQueries({ queryKey: LETTERS_KEY });
      qc.invalidateQueries({ queryKey: STATS_KEY });
      if (onSaved) onSaved(letter);
      if (letter?.uploadWarning) {
        setError(letter.uploadWarning);
        return;
      }
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

  /* گروه‌های شماره‌گذاری همان جهت (برای پیشنهاد خودکار شماره) */
  const seriesOptions = (meta?.series || []).filter(
    (row) => row.direction === form.direction && row.is_active !== false,
  );
  const seriesPreview = useQuery({
    queryKey: ['letter-series-preview', form.series, form.letter_date],
    queryFn: () => axiosInstance.get(`/letter-series/${form.series}/preview/`, {
      params: form.letter_date ? { letter_date: form.letter_date } : {},
    }).then((response) => response.data),
    enabled: open && Boolean(form.series),
    staleTime: 10_000,
  });
  const suggestion = seriesPreview.data || null;

  /* شمارهٔ پیشنهادی گروه؛ تا وقتی کاربر شماره را دستی عوض نکرده، جایگزین می‌شود */
  useEffect(() => {
    const suggested = suggestion?.number || '';
    if (!suggested) return;
    setForm((prev) => {
      if (prev.number && prev.number !== suggestionRef.current) return prev;
      return prev.number === suggested ? prev : { ...prev, number: suggested };
    });
    suggestionRef.current = suggested;
  }, [suggestion?.number]);

  /* قرارداد مرتبط از «مدیریت قراردادها» */
  const contractsQuery = useQuery({
    queryKey: ['letter-contracts'],
    queryFn: () => axiosInstance.get('/external-contracts/', { params: { page_size: 200 } })
      .then((response) => asList(response.data)),
    enabled: open,
    staleTime: 300_000,
  });
  const contractOptions = contractsQuery.data || [];
  const contractLabel = (row) => [row.number, row.subject].filter(Boolean).join(' — ') || `#${row.id}`;

  /* گیرنده/مخاطب پیش‌فرض واحدهای مالی و اداری */
  const receiverDefaults = useQuery({
    queryKey: ['letter-default-receiver'],
    queryFn: () => axiosInstance.get('/letters/personnel/', { params: { q: 'مهدیه', limit: 5 } })
      .then((response) => asList(response.data)[0] || null),
    enabled: open && isIncomingDirection(form.direction),
    staleTime: 600_000,
  });
  const defaultsApplied = useRef(false);

  useEffect(() => {
    if (!open) {
      defaultsApplied.current = false;
      return;
    }
    if (defaultsApplied.current) return;
    if (!isIncomingDirection(form.direction)) return;

    const receiver = receiverDefaults.data;
    let cancelled = false;

    const applyDefaults = async () => {
      let correspondentId = form.correspondent;
      if (!correspondentId) {
        const match = (contacts || []).find((row) => {
          const name = String(row.name || '').replace(/[\s\u200c]/g, '');
          return name.includes('مرتضی') && name.includes('اسد');
        });
        correspondentId = match?.id || '';
        if (!correspondentId) {
          correspondentId = await ensureDefaultCorrespondent();
          if (correspondentId) qc.invalidateQueries({ queryKey: CONTACTS_KEY });
        }
      }
      if (cancelled) return;

      setForm((prev) => {
        const next = { ...prev };
        let changed = false;
        if (receiver && !prev.receiver_employee) {
          next.receiver_employee = receiver.id;
          next.receiver_name = receiver.full_name || receiver.label || DEFAULT_RECEIVER_NAME;
          changed = true;
        }
        if (correspondentId && !prev.correspondent) {
          next.correspondent = correspondentId;
          changed = true;
        }
        return changed ? next : prev;
      });

      if (receiver || correspondentId) defaultsApplied.current = true;
    };

    applyDefaults();
    return () => { cancelled = true; };
  }, [open, form.direction, receiverDefaults.data, contacts]); // eslint-disable-line

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth
      PaperProps={{ sx: { borderRadius: '18px' } }}>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1} useFlexGap flexWrap="wrap">
          <Box sx={{
            width: 30, height: 30, borderRadius: '9px', display: 'grid', placeItems: 'center',
            bgcolor: alpha(ACCENT, 0.12), color: ACCENT,
          }}>
            {form.direction === 'outgoing'
              ? <SendIcon sx={{ fontSize: 17 }} />
              : <InboxIcon sx={{ fontSize: 17 }} />}
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

        <FormSection
          icon={form.direction === 'outgoing' ? SendIcon : InboxIcon}
          title={form.direction === 'outgoing'
            ? 'ثبت و ارسال'
            : form.direction === 'internal' ? 'ثبت مکاتبهٔ داخلی' : 'ثبت و ورود'}
          color={form.direction === 'outgoing' ? OUTGOING : WARN}>
          <FormTable>
            <TextField select size="small" label="جهت نامه" value={form.direction}
              onChange={(event) => {
                const direction = event.target.value;
                setForm((prev) => ({
                  ...prev,
                  direction,
                  series: meta?.defaults?.[direction]?.series || '',
                  number: '',
                }));
                suggestionRef.current = '';
              }}>
              {Object.entries(DIRECTION_META).map(([value, item]) => (
                <MenuItem key={value} value={value}>{item.label}</MenuItem>
              ))}
            </TextField>
            <TextField select size="small"
              label={form.direction === 'outgoing' ? 'نوع ارسال' : 'نوع تحویل'}
              value={form.delivery_type}
              onChange={set('delivery_type')}>
              {(meta?.delivery_types?.length
                ? meta.delivery_types
                : Object.entries(DELIVERY_TYPE_META).map(([value, item]) => ({ value, label: item.label })))
                .map((item) => (
                  <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>
                ))}
            </TextField>
            <TextField select size="small"
              label={form.direction === 'outgoing' ? 'نحوهٔ ثبت / ارسال' : 'نحوهٔ ورود'}
              value={form.entry_method}
              onChange={set('entry_method')}>
              {(meta?.entry_methods?.length
                ? meta.entry_methods
                : Object.entries(ENTRY_METHOD_META).map(([value, item]) => ({ value, label: item.label })))
                .map((item) => (
                  <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>
                ))}
            </TextField>
            <PersianTimeInput
              label={form.direction === 'outgoing' ? 'ساعت ارسال' : 'ساعت تحویل'}
              value={form.entry_time}
              onChange={(value) => setForm((prev) => ({ ...prev, entry_time: value }))} />
            <JalaliMaskedDateInput variant="outlined"
              label={form.direction === 'outgoing' ? 'تاریخ ارسال' : 'تاریخ ورود'}
              value={form.direction === 'outgoing' ? form.sent_date : form.received_date}
              onChange={(value) => setForm((prev) => ({
                ...prev,
                [form.direction === 'outgoing' ? 'sent_date' : 'received_date']: value,
              }))} />
            <PersonnelPicker
              label={form.direction === 'outgoing' ? 'تحویل‌دهنده به گیرنده (اختیاری)' : 'تحویل‌دهنده (پرسنل)'}
              value={personValue(form.delivered_by, form.delivered_by_name)}
              onChange={(option) => setForm((prev) => ({
                ...prev,
                delivered_by: option ? option.id : '',
                delivered_by_name: option ? option.full_name : '',
              }))}
            />
            <TextField size="small"
              label={form.direction === 'outgoing'
                ? 'نام تحویل‌دهنده / پیک (خارج از سامانه)'
                : 'نام تحویل‌دهنده (خارج از سامانه)'}
              value={form.delivered_by_name}
              onChange={set('delivered_by_name')} />
          </FormTable>
        </FormSection>

        <FormSection
          icon={EditNoteIcon}
          title={form.direction === 'outgoing' ? 'شماره‌ها و تاریخ ارسال' : 'شماره‌ها و تاریخ ثبت'}
          color={form.direction === 'outgoing' ? OUTGOING : INCOMING}>
          <FormTable>
            {form.direction === 'outgoing' ? (
              <TextField select size="small" label="گروه شماره‌گذاری"
                value={form.series}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, series: event.target.value, number: '' }));
                  suggestionRef.current = '';
                }}
                helperText={suggestion?.number
                  ? `پیشنهاد خودکار: ${suggestion.number}`
                  : (seriesOptions.length
                    ? 'گروه را انتخاب کنید تا شمارهٔ بعدی پیشنهاد شود'
                    : 'در تنظیمات → مکاتبات اداری گروه بسازید')}
                FormHelperTextProps={{ sx: { fontSize: 10, mx: 0.25 } }}>
                <MenuItem value="">بدون گروه (شمارهٔ دستی)</MenuItem>
                {seriesOptions.map((item) => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.title}{item.is_default ? ' — پیش‌فرض' : ''}
                  </MenuItem>
                ))}
              </TextField>
            ) : null}
            <TextField size="small" label="شماره نامه" value={form.number} onChange={set('number')}
              helperText={suggestion?.number && form.number !== suggestion.number
                ? `شمارهٔ پیشنهادی گروه: ${suggestion.number}`
                : ''}
              FormHelperTextProps={{ sx: { fontSize: 10, mx: 0.25 } }} />
            <JalaliMaskedDateInput variant="outlined" label="تاریخ نامه" value={form.letter_date}
              onChange={(value) => setForm((prev) => ({ ...prev, letter_date: value }))} />
            {form.direction === 'outgoing' ? (
              <>
                <TextField size="small" label="شماره اندیکاتور" value={form.indicator_no}
                  onChange={set('indicator_no')} />
                <TextField size="small" label="شماره ترنسمیتال" value={form.transmittal_no}
                  onChange={set('transmittal_no')} />
                <TextField size="small" label="شماره نامهٔ طرف مقابل" value={form.external_number}
                  onChange={set('external_number')} />
              </>
            ) : (
              <>
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
              </>
            )}
            <JalaliMaskedDateInput variant="outlined" label="مهلت پاسخ" value={form.due_date}
              onChange={(value) => setForm((prev) => ({ ...prev, due_date: value }))} />
          </FormTable>
        </FormSection>

        <FormSection icon={SendIcon} title="طرفین مکاتبه" color={OUTGOING}>
          <Box sx={{
            '& .MuiTableCell-root': { py: 0.4 },
            '& .MuiInputBase-root': { minHeight: 34 },
            '& .MuiAutocomplete-inputRoot': { py: 0.25 },
          }}>
            <FormTable columns={2}>
              <TextField select size="small" label="نوع فرستنده" value={form.sender_kind}
                onChange={(event) => {
                  const kind = event.target.value;
                  setForm((prev) => ({
                    ...prev,
                    sender_kind: kind,
                    sender_employee: kind === 'employee' ? prev.sender_employee : '',
                    sender_name: kind === 'employee' ? prev.sender_name : '',
                    sender_party: kind === 'party' ? prev.sender_party : '',
                    sender_party_name: kind === 'party' ? prev.sender_party_name : '',
                  }));
                }}>
                <MenuItem value="employee">پرسنل (منابع انسانی)</MenuItem>
                <MenuItem value="party">شرکت / طرف حساب (قراردادها)</MenuItem>
              </TextField>
              {form.sender_kind === 'party' ? (
                <PartyPicker
                  label="فرستنده (شرکت / طرف حساب)"
                  helperText="اگر شرکت در قراردادها نیست، نامش را بنویسید و Enter بزنید."
                  createInContracts={form.party_create_in_contracts}
                  value={form.sender_party
                    ? partyValue(form.sender_party, form.sender_party_name)
                    : (form.sender_party_name || null)}
                  onChange={(party) => setForm((prev) => ({
                    ...prev,
                    sender_party: party?.id || '',
                    sender_party_name: party?.name || '',
                    sender_name: party?.name ? party.name : prev.sender_name,
                  }))}
                />
              ) : (
                <PersonnelPicker
                  label="فرستنده (پرسنل منابع انسانی)"
                  value={personValue(form.sender_employee, form.sender_name)}
                  onChange={(option) => setForm((prev) => ({
                    ...prev,
                    sender_employee: option ? option.id : '',
                    sender_name: option ? option.full_name : prev.sender_name,
                  }))}
                />
              )}
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
              <PartyPicker
                label="طرف حساب (شرکت / طرف حساب)"
                helperText={form.party_account
                  ? 'متصل به طرف حساب مدیریت قراردادها'
                  : 'شرکت جدید؟ فقط نامش در مکاتبات ثبت می‌شود و بعداً از «نگاشت نام‌ها» به طرف حساب قراردادها وصل می‌شود.'}
                createInContracts={form.party_create_in_contracts}
                value={form.party_account
                  ? partyValue(form.party_account, form.party_account_name)
                  : (form.party_name || null)}
                onChange={(party) => setForm((prev) => ({
                  ...prev,
                  party_account: party?.id || '',
                  party_account_name: party?.name || '',
                  party_name: party?.id ? '' : (party?.name || ''),
                }))}
              />
              <Autocomplete
                size="small"
                options={contractOptions}
                loading={contractsQuery.isLoading}
                value={contractOptions.find((row) => String(row.id) === String(form.contract)) || null}
                onChange={(_event, option) => setForm((prev) => ({
                  ...prev,
                  contract: option ? option.id : '',
                  contract_title: option ? option.subject || '' : '',
                  contract_number: option ? (option.number || '') : '',
                }))}
                getOptionLabel={contractLabel}
                isOptionEqualToValue={(a, b) => String(a?.id) === String(b?.id)}
                noOptionsText="قراردادی یافت نشد"
                renderInput={(params) => (
                  <TextField {...params} size="small" label="قرارداد مرتبط (مدیریت قراردادها)" />
                )}
              />
            </FormTable>
            <FormControlLabel
              sx={{ mt: 0.5 }}
              control={(
                <Switch size="small" checked={Boolean(form.party_create_in_contracts)}
                  onChange={(event) => setForm((prev) => ({
                    ...prev, party_create_in_contracts: event.target.checked,
                  }))} />
              )}
              label={(
                <Typography sx={{ fontSize: 12, fontWeight: 700 }}>
                  شرکت جدید در مدیریت قراردادها هم ثبت شود
                </Typography>
              )}
            />
            <Typography sx={{ fontSize: 11.5, color: MUTED, mt: 0.25 }}>
              خاموش باشد، نام شرکت فقط در مکاتبات اداری ثبت می‌شود (بدون ساخت طرف حساب در قراردادها) و
              بعداً از صفحهٔ «نگاشت نام‌ها» → کاربرد «طرف حساب» به طرف حساب مدیریت قراردادها تعمیم داده می‌شود.
            </Typography>
          </Box>
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

        <FormSection icon={ArchiveIcon} title="مبلغ و قرارداد" color={SLATE}>
          <FormTable columns={2}>
            <TextField size="small" type="number" label="مبلغ (اختیاری)" value={form.amount}
              onChange={set('amount')} />
            <TextField size="small" label="قرارداد مرتبط" value={form.contract_title
              || (form.contract_number ? `شماره ${form.contract_number}` : '')}
              InputProps={{ readOnly: true }}
              helperText="از بخش «طرفین مکاتبه» انتخاب می‌شود" />
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

        {initial && existingAttachments.length ? (
          <Box sx={{ mt: 1.25 }}>
            <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: MUTED, mb: 0.5 }}>
              {`پیوست‌های فعلی (${toPersianDigits(existingAttachments.length)})`}
            </Typography>
            <Stack spacing={0.5}>
              {existingAttachments.map((file) => (
                <Stack key={file.id} direction="row" alignItems="center" spacing={0.75}
                  sx={{
                    p: 0.5, borderRadius: '9px', border: '1px solid', borderColor: 'divider',
                    minWidth: 0,
                  }}>
                  <AttachFileIcon sx={{ fontSize: 15, color: INTERNAL }} />
                  <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 700, flex: 1, minWidth: 0 }}>
                    {file.title || 'پیوست'}
                  </Typography>
                  {canDelete ? (
                    <Tooltip title="حذف پیوست">
                      <span>
                        <IconButton size="small" color="error" aria-label="حذف پیوست"
                          disabled={deleteExistingAttachment.isPending}
                          onClick={() => {
                            if (window.confirm(`پیوست «${file.title || 'بدون عنوان'}» حذف شود؟`)) {
                              deleteExistingAttachment.mutate(file.id);
                            }
                          }}>
                          <DeleteOutlineIcon sx={{ fontSize: 15 }} />
                        </IconButton>
                      </span>
                    </Tooltip>
                  ) : null}
                </Stack>
              ))}
            </Stack>
          </Box>
        ) : null}
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


export {
  EMPTY_ALLOWED_FIELDS, ENTRY_METHOD_META, LetterFormDialog, NULLABLE_FIELDS,
  asList, safeDate,
};
