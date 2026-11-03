import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../core/api/axiosConfig';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, FormControlLabel, IconButton, MenuItem, Paper, Stack, Switch,
  Tab, Tabs, TextField, Tooltip, Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import ArchiveIcon from '@mui/icons-material/Archive';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import EditNoteIcon from '@mui/icons-material/EditNote';
import ForwardToInboxIcon from '@mui/icons-material/ForwardToInbox';
import InboxIcon from '@mui/icons-material/MoveToInbox';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import ReplyIcon from '@mui/icons-material/Reply';
import SendIcon from '@mui/icons-material/Send';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { formatPersianNumber, toPersianDigits } from '../../core/utils/numberUtils';
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

const LETTERS_KEY = ['correspondence-letters'];
const META_KEY = ['correspondence-meta'];
const STATS_KEY = ['correspondence-stats'];
const REFERRALS_KEY = ['correspondence-my-referrals'];
const ORGANIZATIONS_KEY = ['correspondence-organizations'];
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

const asList = (payload) => (Array.isArray(payload) ? payload : payload?.results || []);

/**
 * هر آیتم منوی مکاتبات صفحهٔ مستقل خودش را دارد تا کاربر بدون فیلترِ اضافه
 * (مثلاً «جهت» که از قبل مشخص است) وارد فهرست مربوطه شود.
 */
export const LETTER_PAGE_PRESETS = {
  all: {
    title: 'دفتر مکاتبات اداری',
    subtitle: 'جستجو و مدیریت یکجای نامه‌های وارده، صادره و داخلی',
    icon: MailOutlineIcon,
    accent: ACCENT,
  },
  incoming: {
    title: 'نامه‌های وارده',
    subtitle: 'نامه‌های دریافتی از سازمان‌ها و اشخاص؛ ارجاع، پیوست و پیگیری پاسخ',
    icon: InboxIcon,
    accent: INCOMING,
    direction: 'incoming',
  },
  outgoing: {
    title: 'نامه‌های صادره',
    subtitle: 'نامه‌های ارسالی به سازمان‌ها و اشخاص؛ شماره‌گذاری و پیوست‌ها',
    icon: SendIcon,
    accent: OUTGOING,
    direction: 'outgoing',
  },
  internal: {
    title: 'مکاتبات داخلی',
    subtitle: 'نامه‌ها و مکاتبات درون‌سازمانی',
    icon: MailOutlineIcon,
    accent: INTERNAL,
    direction: 'internal',
  },
  drafts: {
    title: 'پیش‌نویس‌های مکاتبات',
    subtitle: 'نامه‌هایی که هنوز شماره نخورده یا نهایی نشده‌اند',
    icon: EditNoteIcon,
    accent: SLATE,
    status: 'draft',
  },
  referrals: {
    title: 'ارجاعات من',
    subtitle: 'نامه‌هایی که برای شما ارجاع شده و در انتظار اقدام است',
    icon: ForwardToInboxIcon,
    accent: WARN,
    scope: 'referred',
  },
  overdue: {
    title: 'پیگیری معوقات',
    subtitle: 'نامه‌های باز که مهلت پاسخ آن‌ها گذشته است',
    icon: WarningAmberIcon,
    accent: DANGER,
    overdue: true,
  },
  archive: {
    title: 'بایگانی مکاتبات',
    subtitle: 'نامه‌های بسته‌شده و بایگانی‌شدهٔ دفتر مکاتبات',
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

/** بخش‌بندی فرم با رنگ و جداکننده (ظاهر حرفه‌ای فرم ثبت نامه). */
const FormSection = ({ icon: Icon, title, hint, color = ACCENT, children }) => (
  <Box sx={{ mb: 1.75 }}>
    <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 1, minWidth: 0 }}>
      <Box sx={{
        width: 26, height: 26, borderRadius: '8px', flex: '0 0 auto',
        display: 'grid', placeItems: 'center', bgcolor: alpha(color, 0.12), color,
      }}>
        <Icon sx={{ fontSize: 15 }} />
      </Box>
      <Typography noWrap sx={{ fontSize: 12, fontWeight: 900, color, flex: '0 0 auto' }}>
        {title}
      </Typography>
      {hint ? (
        <Typography noWrap sx={{ fontSize: 10, color: MUTED, flex: '1 1 auto', minWidth: 0 }}>
          {hint}
        </Typography>
      ) : null}
      <Divider sx={{ flex: 1, borderColor: alpha(color, 0.25) }} />
    </Stack>
    {children}
  </Box>
);

const FormGrid = ({ children }) => (
  <Box sx={{
    display: 'grid',
    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
    gap: 1.25,
    minWidth: 0,
  }}>
    {children}
  </Box>
);

/** یک خانهٔ اطلاعات در نمای جزئیات نامه. */
const InfoCell = ({ label, value, span }) => (
  <Box sx={{ minWidth: 0, gridColumn: span ? { xs: 'auto', sm: `span ${span}` } : undefined }}>
    <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: MUTED }}>{label}</Typography>
    <Typography title={String(value || '')} sx={{
      fontSize: 11.5, fontWeight: 800, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
    }}>
      {value || '—'}
    </Typography>
  </Box>
);

const InfoGroup = ({ icon: Icon, title, color = ACCENT, children }) => (
  <Box sx={{
    border: '1px solid', borderColor: dividerColor(color), borderRadius: '12px',
    p: 1.25, mb: 1.25, minWidth: 0, bgcolor: alpha(color, 0.02),
  }}>
    <Stack direction="row" alignItems="center" spacing={0.6} sx={{ mb: 0.9 }}>
      <Icon sx={{ fontSize: 15, color }} />
      <Typography sx={{ fontSize: 11.5, fontWeight: 900, color }}>{title}</Typography>
      <Divider sx={{ flex: 1, borderColor: dividerColor(color) }} />
    </Stack>
    <Box sx={{
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
      gap: 1,
      minWidth: 0,
    }}>
      {children}
    </Box>
  </Box>
);

const dividerColor = (color) => alpha(color, 0.22);


const LetterFormDialog = ({ open, initial, presetDirection, meta, organizations, users, contacts, onClose, onSaved }) => {
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
          <Typography sx={{ fontSize: 10.5, color: MUTED }}>
            فیلدهای ستاره‌دار اجباری هستند
          </Typography>
        </Stack>
      </DialogTitle>
      <DialogContent dividers sx={{ bgcolor: alpha(SLATE, 0.02) }}>
        {error ? <Alert severity="error" sx={{ mb: 1.5, borderRadius: '10px' }}>{error}</Alert> : null}

        <FormSection icon={InboxIcon} title="ثبت و ورود"
          hint="نحوهٔ ورود نامه، زمان ورود و ثبت‌کننده" color={WARN}>
          <FormGrid>
            <TextField select size="small" label="جهت نامه" value={form.direction} onChange={set('direction')}>
              {Object.entries(DIRECTION_META).map(([value, item]) => (
                <MenuItem key={value} value={value}>{item.label}</MenuItem>
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
            <TextField size="small" type="time" label="ساعت ورود" value={form.entry_time}
              onChange={set('entry_time')} InputLabelProps={{ shrink: true }} />
            <TextField size="small" type="date"
              label={form.direction === 'outgoing' ? 'تاریخ ارسال' : 'تاریخ ورود'}
              value={form.direction === 'outgoing' ? form.sent_date : form.received_date}
              onChange={set(form.direction === 'outgoing' ? 'sent_date' : 'received_date')}
              InputLabelProps={{ shrink: true }} />
            <TextField select size="small" label="ثبت‌کنندهٔ ورود" value={form.entered_by}
              onChange={set('entered_by')}>
              <MenuItem value="">—</MenuItem>
              {(users || []).map((row) => (
                <MenuItem key={row.id} value={row.id}>{userLabel(row)}</MenuItem>
              ))}
            </TextField>
            <TextField size="small" label="نام ثبت‌کننده (متن آزاد)" value={form.entered_by_name}
              onChange={set('entered_by_name')} helperText="اگر ثبت‌کننده کاربر سامانه نیست" />
          </FormGrid>
        </FormSection>

        <FormSection icon={EditNoteIcon} title="شماره‌های ثبت"
          hint="شمارهٔ نامه، شمارهٔ ثبت ورود به شرکت و شمارهٔ ثبت ورود به واحد" color={INCOMING}>
          <FormGrid>
            <TextField select size="small" label="سری شماره‌گذاری" value={form.series} onChange={set('series')}
              helperText={form.series
                ? `پیش‌نمایش: ${(meta?.series || []).find((row) => row.id === Number(form.series))?.preview || '—'}`
                : 'در صورت خالی بودن، سری پیش‌فرض استفاده می‌شود'}>
              <MenuItem value="">سری پیش‌فرض</MenuItem>
              {seriesOptions.map((row) => (
                <MenuItem key={row.id} value={row.id}>{row.title}</MenuItem>
              ))}
            </TextField>
            <TextField size="small" label="شماره نامه" value={form.number} onChange={set('number')}
              helperText="خالی بگذارید تا خودکار صادر شود" />
            <TextField size="small" label="شماره اندیکاتور" value={form.indicator_no}
              onChange={set('indicator_no')} />
            <TextField size="small" label="ترنسمیتال" value={form.transmittal_no}
              onChange={set('transmittal_no')} />
            <TextField size="small" label="شماره نامه طرف مقابل" value={form.external_number}
              onChange={set('external_number')} />
            <TextField size="small" type="date" label="تاریخ نامه" value={form.letter_date}
              onChange={set('letter_date')} InputLabelProps={{ shrink: true }} />
            <TextField size="small" label="شماره ثبت ورود به شرکت" value={form.company_reg_no}
              onChange={set('company_reg_no')} />
            <TextField size="small" type="date" label="تاریخ ثبت ورود به شرکت"
              value={form.company_reg_date} onChange={set('company_reg_date')}
              InputLabelProps={{ shrink: true }} />
            <TextField size="small" label="شماره ثبت ورود به واحد" value={form.unit_reg_no}
              onChange={set('unit_reg_no')} />
            <TextField size="small" type="date" label="تاریخ ثبت ورود به واحد"
              value={form.unit_reg_date} onChange={set('unit_reg_date')}
              InputLabelProps={{ shrink: true }} />
            <TextField size="small" label="واحد ثبت‌کننده / گیرنده" value={form.unit_name}
              onChange={set('unit_name')} helperText="مثال: دبیرخانه، واحد مالی" />
            <TextField size="small" type="date" label="مهلت پاسخ" value={form.due_date}
              onChange={set('due_date')} InputLabelProps={{ shrink: true }} />
          </FormGrid>
        </FormSection>

        <FormSection icon={SendIcon} title="طرفین مکاتبه"
          hint="ارسال‌کننده، طرف حساب (مثلاً پیمانکار) و گیرنده" color={OUTGOING}>
          <FormGrid>
            <TextField select size="small" label="سازمان ارسال‌کننده" value={form.sender_organization}
              onChange={set('sender_organization')}>
              <MenuItem value="">—</MenuItem>
              {(organizations || []).map((row) => (
                <MenuItem key={row.id} value={row.id}>{row.name}</MenuItem>
              ))}
            </TextField>
            <TextField size="small" label="نام ارسال‌کننده" value={form.sender_name}
              onChange={set('sender_name')} />
            <TextField size="small" label="سمت ارسال‌کننده" value={form.sender_title}
              onChange={set('sender_title')} helperText="مثال: ناظر پروژه، کارشناس بیمه" />
            <TextField select size="small" label="طرف حساب (سازمان)" value={form.organization}
              onChange={set('organization')}>
              <MenuItem value="">—</MenuItem>
              {(organizations || []).map((row) => (
                <MenuItem key={row.id} value={row.id}>{row.name}</MenuItem>
              ))}
            </TextField>
            <TextField select size="small" label="مخاطب" value={form.correspondent}
              onChange={set('correspondent')}>
              <MenuItem value="">—</MenuItem>
              {(contacts || []).map((row) => (
                <MenuItem key={row.id} value={row.id}>
                  {row.name}{row.title ? ` — ${row.title}` : ''}
                </MenuItem>
              ))}
            </TextField>
            <TextField size="small" label="گیرنده" value={form.receiver_name}
              onChange={set('receiver_name')} />
          </FormGrid>
        </FormSection>

        <FormSection icon={MailOutlineIcon} title="مشخصات نامه"
          hint="موضوع، نوع، متن و اولویت" color={INTERNAL}>
          <FormGrid>
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
            <TextField size="small" label="موضوع نامه" value={form.subject} onChange={set('subject')}
              sx={{ gridColumn: { xs: 'auto', md: 'span 2' } }} />
            <TextField size="small" multiline minRows={2} label="خلاصه / چکیده" value={form.summary}
              onChange={set('summary')} sx={{ gridColumn: '1 / -1' }} />
            <TextField size="small" multiline minRows={4} label="متن نامه" value={form.body}
              onChange={set('body')} sx={{ gridColumn: '1 / -1' }} />
          </FormGrid>
        </FormSection>

        <FormSection icon={ArchiveIcon} title="مالی، قرارداد و بایگانی"
          hint="اطلاعات تکمیلی و بایگانی" color={SLATE}>
          <FormGrid>
            <TextField size="small" type="number" label="مبلغ (اختیاری)" value={form.amount}
              onChange={set('amount')} helperText="برای نامه‌های مالی" />
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
              onChange={set('drafter_name')} helperText="اگر تنظیم‌کننده کاربر سامانه نیست" />
          </FormGrid>
        </FormSection>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}
          alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ mt: 1.5 }} useFlexGap>
          <Button variant="outlined" size="small" startIcon={<AttachFileIcon />}
            onClick={() => fileRef.current?.click()}>
            افزودن پیوست
          </Button>
          <input ref={fileRef} type="file" multiple hidden data-testid="letter-files"
            onChange={(event) => setFiles(Array.from(event.target.files || []))} />
          <Typography sx={{ fontSize: 11, color: MUTED }}>
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
            label={<Typography sx={{ fontSize: 11.5, fontWeight: 700 }}>ثبت شماره و نهایی‌سازی</Typography>}
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

const ReferDialog = ({ open, letter, users, onClose, onSubmit, pending }) => {
  const [toUser, setToUser] = useState('');
  const [toName, setToName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [instruction, setInstruction] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open) return;
    setToUser('');
    setToName('');
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
          <Stack spacing={1.25}>
            <TextField select size="small" label="ارجاع به کاربر" value={toUser}
              onChange={(event) => setToUser(event.target.value)}>
              <MenuItem value="">—</MenuItem>
              {(users || []).map((row) => (
                <MenuItem key={row.id} value={row.id}>{userLabel(row)}</MenuItem>
              ))}
            </TextField>
            <TextField size="small" label="یا واحد / شخص خارج از سامانه" value={toName}
              onChange={(event) => setToName(event.target.value)}
              helperText="مثال: واحد مالی، دبیرخانه، مدیرعامل" />
            <TextField size="small" type="date" label="مهلت اقدام" value={dueDate}
              onChange={(event) => setDueDate(event.target.value)} InputLabelProps={{ shrink: true }} />
          </Stack>
        </FormSection>
        <FormSection icon={EditNoteIcon} title="دستور و توضیح" color={INCOMING}>
          <Stack spacing={1.25}>
            <TextField size="small" multiline minRows={2} label="دستور / اقدام درخواستی"
              value={instruction} onChange={(event) => setInstruction(event.target.value)}
              helperText="مثال: بررسی و اعلام نظر فنی تا پایان هفته" />
            <TextField size="small" multiline minRows={2} label="توضیح تکمیلی" value={note}
              onChange={(event) => setNote(event.target.value)} />
          </Stack>
        </FormSection>
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.25 }}>
        <Button size="small" onClick={onClose}>انصراف</Button>
        <Button size="small" variant="contained" disabled={pending || (!toUser && !toName.trim())}
          onClick={() => onSubmit({
            to_user: toUser || undefined,
            to_name: toName,
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
            <Typography sx={{ fontSize: 11.5, fontWeight: 700 }}>دستور ارجاع:</Typography>
            <Typography sx={{ fontSize: 11.5, whiteSpace: 'pre-wrap' }}>{referral.instruction}</Typography>
          </Alert>
        ) : null}
        <Stack spacing={1.25}>
          <TextField size="small" multiline minRows={2} label="پاسخ / جوابیهٔ اقدام‌کننده"
            value={response} onChange={(event) => setResponse(event.target.value)} />
          <TextField size="small" multiline minRows={2} label="نتیجهٔ نهایی"
            value={result} onChange={(event) => setResult(event.target.value)} />
          <TextField size="small" multiline minRows={2} label="یادداشت نتیجه"
            value={resultNote} onChange={(event) => setResultNote(event.target.value)} />
          <TextField size="small" type="date" label="تاریخ پاسخ" value={answeredOn}
            onChange={(event) => setAnsweredOn(event.target.value)} InputLabelProps={{ shrink: true }} />
        </Stack>
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
  const { data: rawOrganizations } = useQuery({
    queryKey: ORGANIZATIONS_KEY,
    queryFn: () => axiosInstance.get('/organizations/', { params: { page_size: 500 } })
      .then((response) => response.data),
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

  const organizations = useMemo(() => asList(rawOrganizations), [rawOrganizations]);
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
        subtitle={preset.subtitle}
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
          <KpiTile label="کل مکاتبات" value={formatPersianNumber(totals.all || 0)} hint="دفتر وارده و صادره"
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
          <KpiTile label="معوق (مهلت پاسخ)" value={formatPersianNumber(totals.overdue || 0)}
            hint="نیازمند پیگیری" color={DANGER} icon={WarningAmberIcon}
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
              sx={{ fontSize: 11.5, fontWeight: 800, py: 0 }}>
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

      <Paper elevation={0} sx={{
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
          onRowClick={(row) => { setDrawerLetter(row.letter); setComment(''); }}
          emptyText="مکاتبه‌ای با این شرایط یافت نشد."
          columns={[
            {
              key: 'row', label: 'ردیف', width: '3%', align: 'center',
              render: (_row, index) => (
                <Typography noWrap sx={{ fontSize: 11, fontWeight: 700, color: MUTED }}>
                  {toPersianDigits(page * pageSize + index + 1)}
                </Typography>
              ),
            },
            {
              key: 'number', label: 'شماره نامه',
              width: mode === 'incoming' ? '8%' : '9%',
              align: 'center',
              render: (row) => (
                <Box sx={{ minWidth: 0 }}>
                  <Typography noWrap title={row.letter.number}
                    sx={{ fontSize: 11.5, fontWeight: 800, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
                    {row.letter.number ? toPersianDigits(row.letter.number) : 'بدون شماره'}
                  </Typography>
                  {row.letter.indicator_no ? (
                    <Typography noWrap sx={{ fontSize: 9, color: MUTED }}>
                      اندیکاتور {toPersianDigits(row.letter.indicator_no)}
                    </Typography>
                  ) : null}
                </Box>
              ),
            },
            ...(mode === 'incoming' ? [
              {
                key: 'company_reg', label: 'ثبت شرکت', width: '8%', align: 'center',
                render: (row) => (
                  <Box sx={{ minWidth: 0 }}>
                    <Typography noWrap
                      title={row.letter.company_reg_no ? toPersianDigits(row.letter.company_reg_no) : ''}
                      sx={{ fontSize: 11, fontWeight: 800, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
                      {row.letter.company_reg_no ? toPersianDigits(row.letter.company_reg_no) : '—'}
                    </Typography>
                    <Typography noWrap sx={{ fontSize: 9, color: MUTED }}>
                      {row.letter.company_reg_date ? dateLabel(row.letter.company_reg_date) : '—'}
                    </Typography>
                  </Box>
                ),
              },
              {
                key: 'unit_reg', label: 'ثبت واحد', width: '8%', align: 'center',
                render: (row) => (
                  <Box sx={{ minWidth: 0 }}>
                    <Typography noWrap title={row.letter.unit_name || ''}
                      sx={{ fontSize: 11, fontWeight: 800, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
                      {row.letter.unit_reg_no ? toPersianDigits(row.letter.unit_reg_no) : '—'}
                    </Typography>
                    <Typography noWrap sx={{ fontSize: 9, color: MUTED }}>
                      {row.letter.unit_reg_date ? dateLabel(row.letter.unit_reg_date) : (row.letter.unit_name || '—')}
                    </Typography>
                  </Box>
                ),
              },
            ] : []),
            {
              key: 'subject', label: 'موضوع', width: mode === 'incoming' ? '16%' : '22%',
              render: (row) => (
                <Box sx={{ minWidth: 0 }}>
                  <Typography noWrap title={row.letter.subject} sx={{ fontSize: 11.5, fontWeight: 800 }}>
                    {row.letter.subject || '—'}
                  </Typography>
                  <Typography noWrap sx={{ fontSize: 9.5, color: MUTED }}>
                    {row.letter.summary || row.letter.category_title || '—'}
                  </Typography>
                </Box>
              ),
            },
            ...(mode === 'incoming' ? [
              {
                key: 'sender', label: 'ارسال‌کننده', width: '10%',
                render: (row) => (
                  <Box sx={{ minWidth: 0 }}>
                    <Typography noWrap
                      title={row.letter.sender_organization_name || row.letter.sender_name}
                      sx={{ fontSize: 11, fontWeight: 800 }}>
                      {row.letter.sender_organization_name || row.letter.sender_name || '—'}
                    </Typography>
                    <Typography noWrap sx={{ fontSize: 9, color: MUTED }}>
                      {row.letter.sender_title || row.letter.sender_name || '—'}
                    </Typography>
                  </Box>
                ),
              },
            ] : []),
            {
              key: 'party', label: mode === 'incoming' ? 'طرف حساب' : 'طرف مکاتبه',
              width: mode === 'incoming' ? '9%' : '13%',
              render: (row) => (
                <Typography noWrap
                  title={row.letter.organization_name || row.letter.correspondent_name
                    || row.letter.sender_name || row.letter.receiver_name}
                  sx={{ fontSize: 11, fontWeight: 700 }}>
                  {row.letter.organization_name || row.letter.correspondent_name
                    || row.letter.sender_name || row.letter.receiver_name || '—'}
                </Typography>
              ),
            },
            ...(mode === 'incoming' ? [
              {
                key: 'entry', label: 'نحوهٔ ورود', width: '7%', align: 'center',
                render: (row) => (
                  <Box sx={{ minWidth: 0 }}>
                    <Chip size="small" label={row.letter.entry_method_display || '—'}
                      sx={chipSx(ENTRY_METHOD_META[row.letter.entry_method]?.color || SLATE)} />
                    <Typography noWrap sx={{ fontSize: 9, color: MUTED, mt: 0.2 }}>
                      {row.letter.entry_time ? timeLabel(row.letter.entry_time) : '—'}
                      {row.letter.entered_by_label ? ` · ${row.letter.entered_by_label}` : ''}
                    </Typography>
                  </Box>
                ),
              },
            ] : []),
            {
              key: 'date', label: 'تاریخ نامه',
              width: mode === 'incoming' ? '6.5%' : '8%',
              align: 'center',
              render: (row) => (
                <Typography noWrap sx={{ fontSize: 11, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
                  {dateLabel(row.letter.letter_date)}
                </Typography>
              ),
            },
            {
              key: 'due', label: 'مهلت پاسخ',
              width: mode === 'incoming' ? '7%' : '9%',
              align: 'center',
              render: (row) => (
                row.letter.due_date ? (
                  <Chip size="small" label={daysLabel(row.days)} sx={chipSx(daysColor(row.days))} />
                ) : <Typography sx={{ fontSize: 10, color: MUTED }}>—</Typography>
              ),
            },
            ...(mode === 'incoming' ? [] : [
              {
                key: 'type', label: 'نوع / جهت', width: '7%', align: 'center',
                render: (row) => (
                  <Stack spacing={0.25} alignItems="center">
                    <Chip size="small" label={row.directionMeta.label}
                      sx={chipSx(row.directionMeta.color, row.directionMeta.bg)} />
                    <Typography noWrap sx={{ fontSize: 9, color: MUTED }}>
                      {row.letter.category_title || '—'}
                    </Typography>
                  </Stack>
                ),
              },
            ]),
            {
              key: 'referral', label: 'آخرین ارجاع',
              width: mode === 'incoming' ? '7%' : '8%',
              align: 'center',
              render: (row) => {
                const last = row.letter.last_referral;
                if (!last) return <Typography sx={{ fontSize: 10, color: MUTED }}>—</Typography>;
                return (
                  <Tooltip title={`${last.to_user_name || last.to_name || ''} — ${dateLabel(last.referred_on)}`}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography noWrap sx={{ fontSize: 10, fontWeight: 800 }}>
                        {last.to_user_name || last.to_name || '—'}
                      </Typography>
                      <Typography noWrap
                        sx={{ fontSize: 9, color: REFERRAL_STATUS_META[last.status]?.color || MUTED }}>
                        {REFERRAL_STATUS_META[last.status]?.label || ''}
                      </Typography>
                    </Box>
                  </Tooltip>
                );
              },
            },
            {
              key: 'status', label: 'وضعیت',
              width: mode === 'incoming' ? '6.5%' : '8%',
              align: 'center',
              render: (row) => (
                <Chip size="small" label={row.statusMeta.label}
                  sx={chipSx(row.statusMeta.color, row.statusMeta.bg)} />
              ),
            },
            ...(mode === 'incoming' ? [] : [
              {
                key: 'priority', label: 'اولویت', width: '5.5%', align: 'center',
                render: (row) => (
                  <Chip size="small" label={PRIORITY_META[row.letter.priority]?.label || '—'}
                    sx={chipSx(PRIORITY_META[row.letter.priority]?.color || SLATE)} />
                ),
              },
              {
                key: 'attachments', label: 'پیوست', width: '4.5%', align: 'center',
                render: (row) => (
                  row.letter.attachment_count ? (
                    <Chip size="small" label={toPersianDigits(row.letter.attachment_count)}
                      sx={chipSx(INTERNAL)} />
                  ) : <Typography sx={{ fontSize: 10, color: MUTED }}>—</Typography>
                ),
              },
            ]),
            {
              key: 'actions', label: 'عملیات',
              width: mode === 'incoming' ? '5%' : '8%',
              align: 'center',
              render: (row) => (
                <Stack direction="row" spacing={0.1} useFlexGap justifyContent="center"
                  onClick={(event) => event.stopPropagation()}>
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
              ),
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
                  <Typography noWrap sx={{ fontSize: 11, color: MUTED }}>
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
                minHeight: 34, px: 1.5,
                borderBottom: '1px solid', borderColor: 'divider',
                '& .MuiTab-root': { minHeight: 34, py: 0.4, fontSize: 11.5, fontWeight: 800 },
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
                    <InfoCell label="نحوهٔ ورود" value={activeLetter.entry_method_display} />
                    <InfoCell label="ساعت ورود"
                      value={activeLetter.entry_time ? timeLabel(activeLetter.entry_time) : ''} />
                    <InfoCell label="ثبت‌کنندهٔ ورود" value={activeLetter.entered_by_label} />
                    <InfoCell label="تاریخ ورود" value={dateLabel(activeLetter.received_date)} />
                    <InfoCell label="واحد ثبت‌کننده" value={activeLetter.unit_name} />
                    <InfoCell label="تاریخ نامه" value={dateLabel(activeLetter.letter_date)} />
                  </InfoGroup>

                  <InfoGroup icon={EditNoteIcon} title="شماره‌های ثبت" color={INCOMING}>
                    <InfoCell label="شماره نامه"
                      value={activeLetter.number ? toPersianDigits(activeLetter.number) : ''} />
                    <InfoCell label="شماره اندیکاتور" value={activeLetter.indicator_no} />
                    <InfoCell label="ترنسمیتال" value={activeLetter.transmittal_no} />
                    <InfoCell label="شماره ثبت ورود به شرکت"
                      value={activeLetter.company_reg_no ? toPersianDigits(activeLetter.company_reg_no) : ''} />
                    <InfoCell label="تاریخ ثبت ورود به شرکت" value={dateLabel(activeLetter.company_reg_date)} />
                    <InfoCell label="شماره ثبت ورود به واحد"
                      value={activeLetter.unit_reg_no ? toPersianDigits(activeLetter.unit_reg_no) : ''} />
                    <InfoCell label="تاریخ ثبت ورود به واحد" value={dateLabel(activeLetter.unit_reg_date)} />
                    <InfoCell label="شماره نامه طرف مقابل" value={activeLetter.external_number} />
                    <InfoCell label="پاسخ به نامه" value={activeLetter.reply_number} />
                  </InfoGroup>

                  <InfoGroup icon={SendIcon} title="طرفین مکاتبه" color={OUTGOING}>
                    <InfoCell label="سازمان ارسال‌کننده" value={activeLetter.sender_organization_name} />
                    <InfoCell label="نام ارسال‌کننده" value={activeLetter.sender_name} />
                    <InfoCell label="سمت ارسال‌کننده" value={activeLetter.sender_title} />
                    <InfoCell label="طرف حساب (سازمان)" value={activeLetter.organization_name} />
                    <InfoCell label="مخاطب" value={activeLetter.correspondent_name} />
                    <InfoCell label="گیرنده" value={activeLetter.receiver_name} />
                  </InfoGroup>

                  <InfoGroup icon={MailOutlineIcon} title="مشخصات و بایگانی" color={INTERNAL}>
                    <InfoCell label="نوع مکاتبه" value={activeLetter.category_title} />
                    <InfoCell label="اولویت" value={activeLetter.priority_display} />
                    <InfoCell label="محرمانگی" value={activeLetter.confidentiality_display} />
                    <InfoCell label="مهلت پاسخ" value={activeLetter.due_date
                      ? `${dateLabel(activeLetter.due_date)} (${daysLabel(daysBetween(activeLetter.due_date))})`
                      : ''} />
                    <InfoCell label="شماره قرارداد" value={activeLetter.contract_number} />
                    <InfoCell label="شماره بایگانی" value={activeLetter.archive_ref} />
                    <InfoCell label="تنظیم‌کننده" value={activeLetter.drafter_name} />
                    <InfoCell label="ثبت‌کننده" value={activeLetter.created_by_name} />
                    <InfoCell label="مبلغ" value={activeLetter.amount
                      ? `${money(activeLetter.amount)} ${activeLetter.currency || 'ریال'}` : ''} />
                    <InfoCell label="خلاصه" value={activeLetter.summary} span={3} />
                    {activeLetter.body ? (
                      <InfoCell label="متن نامه" value={activeLetter.body} span={3} />
                    ) : null}
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
                          <Typography noWrap sx={{ fontSize: 11, color: MUTED }}>
                            {referral.from_user_name ? `از ${referral.from_user_name}` : ''}
                            {(referral.from_user_name && (referral.to_user_name || referral.to_name)) ? ' → ' : ''}
                            {referral.to_user_name || referral.to_name || ''}
                          </Typography>
                          <Box sx={{ flex: 1 }} />
                          <Typography sx={{ fontSize: 10, color: MUTED }}>
                            {dateLabel(referral.referred_on)}
                          </Typography>
                        </Stack>

                        {referral.instruction ? (
                          <Box sx={{ mt: 0.75 }}>
                            <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: MUTED }}>دستور / اقدام درخواستی</Typography>
                            <Typography sx={{ fontSize: 11, whiteSpace: 'pre-wrap' }}>{referral.instruction}</Typography>
                          </Box>
                        ) : null}
                        {referral.note ? (
                          <Box sx={{ mt: 0.5 }}>
                            <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: MUTED }}>توضیح</Typography>
                            <Typography sx={{ fontSize: 11, whiteSpace: 'pre-wrap' }}>{referral.note}</Typography>
                          </Box>
                        ) : null}
                        {referral.due_date ? (
                          <Typography sx={{ fontSize: 10, mt: 0.4, color: daysColor(referralDays) }}>
                            مهلت اقدام: {dateLabel(referral.due_date)} ({daysLabel(referralDays)})
                          </Typography>
                        ) : null}

                        {referral.response ? (
                          <Box sx={{ mt: 0.75, p: 0.75, borderRadius: '8px', bgcolor: alpha(OK, 0.05) }}>
                            <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: OK }}>پاسخ / جوابیه</Typography>
                            <Typography sx={{ fontSize: 11, whiteSpace: 'pre-wrap' }}>{referral.response}</Typography>
                          </Box>
                        ) : null}
                        {referral.result ? (
                          <Box sx={{ mt: 0.5, p: 0.75, borderRadius: '8px', bgcolor: alpha(INCOMING, 0.05) }}>
                            <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: INCOMING }}>نتیجه</Typography>
                            <Typography sx={{ fontSize: 11, whiteSpace: 'pre-wrap' }}>{referral.result}</Typography>
                          </Box>
                        ) : null}
                        {referral.result_note && !referral.result ? (
                          <Typography sx={{ fontSize: 10.5, color: OK, mt: 0.3 }}>
                            یادداشت نتیجه: {referral.result_note}
                          </Typography>
                        ) : null}

                        <Stack direction="row" alignItems="center" spacing={1} useFlexGap flexWrap="wrap"
                          sx={{ mt: 0.6 }}>
                          {referral.answered_on ? (
                            <Typography sx={{ fontSize: 9.5, color: MUTED }}>
                              پاسخ در {dateLabel(referral.answered_on)}
                              {referral.answered_by_name ? ` توسط ${referral.answered_by_name}` : ''}
                            </Typography>
                          ) : null}
                          {!['done', 'canceled'].includes(referral.status) ? (
                            <Button size="small" variant="contained" startIcon={<TaskAltIcon />}
                              onClick={() => setCompleteReferral(referral)}
                              sx={{ fontSize: 10.5, py: 0.2, bgcolor: OK, '&:hover': { bgcolor: '#115e59' } }}>
                              ثبت پاسخ و نتیجه
                            </Button>
                          ) : null}
                        </Stack>
                      </Box>
                    );
                  }) : (
                    <Typography sx={{ fontSize: 11.5, color: MUTED }}>
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
                        <Typography noWrap title={file.title} sx={{ fontSize: 11.5, fontWeight: 800 }}>
                          {file.title || 'پیوست'}
                        </Typography>
                        <Typography noWrap sx={{ fontSize: 9.5, color: MUTED }}>
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
                    <Typography sx={{ fontSize: 11.5, color: MUTED }}>پیوستی ثبت نشده است.</Typography>
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
                        <Typography sx={{ fontSize: 11.5, fontWeight: 800 }}>
                          {EVENT_META[event.action]?.label || event.action}
                        </Typography>
                        {event.note ? (
                          <Typography sx={{ fontSize: 10.5, whiteSpace: 'pre-wrap' }}>{event.note}</Typography>
                        ) : null}
                        <Typography sx={{ fontSize: 9.5, color: MUTED }}>
                          {event.actor_name || '—'} · {dateTimeLabel(event.created_at)}
                        </Typography>
                      </Box>
                    </Stack>
                  )) : (
                    <Typography sx={{ fontSize: 11.5, color: MUTED }}>رویدادی ثبت نشده است.</Typography>
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
        organizations={organizations}
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
        users={users}
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





