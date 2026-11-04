import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider,
  FormControlLabel, IconButton, MenuItem, Paper, Stack, Switch, Tab, Tabs, TextField,
  Tooltip, Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import axiosInstance from '../../core/api/axiosConfig';
import JalaliMaskedDateInput from '../../core/components/ui/JalaliMaskedDateInput';
import PageHeader from '../../core/components/ui/PageHeader';
import AssignmentIcon from '@mui/icons-material/Assignment';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import EditNoteIcon from '@mui/icons-material/EditNote';
import ForwardToInboxIcon from '@mui/icons-material/ForwardToInbox';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { formatPersianNumber, toPersianDigits } from '../../core/utils/numberUtils';
import {
  ModulePager, ModuleTable, ModuleToolbar, useModuleTheme, useRowHeight,
} from '../contracts/contractModuleUi';
import {
  ACCENT, DANGER, INCOMING, INTERNAL, KpiTile, OK, REFERRAL_STATUS_META, SLATE, WARN,
  chipSx, dateLabel, dateTimeLabel, daysColor, daysLabel,
} from './correspondenceUi';
import { PersonnelPicker } from './correspondenceLookups';
import CorrespondenceRequestsPanel from './CorrespondenceRequestsPanel';

/**
 * کارتابل من: همهٔ ارجاعات رسیده به کاربر/پرسنل او (اقدام، اطلاع، اظهارنظر)
 * به‌همراه درخواست‌های پرسنلی (مرخصی، وام، گواهی اشتغال ...).
 */

const WORKDESK_KEY = ['correspondence-workdesk'];
const MUTED_COLOR = '#64748b';

const PURPOSE_META = {
  action: { label: 'اقدام / انجام کار', color: WARN, icon: AssignmentIcon },
  info: { label: 'اطلاع / مشاهده', color: INCOMING, icon: MarkEmailReadIcon },
  comment: { label: 'اظهارنظر', color: INTERNAL, icon: EditNoteIcon },
};

const TAB_OPTIONS = [
  { value: 'action', label: 'نیازمند اقدام', purpose: 'action' },
  { value: 'info', label: 'برای اطلاع', purpose: 'info' },
  { value: 'comment', label: 'اظهارنظر', purpose: 'comment' },
  { value: 'all', label: 'همهٔ ارجاعات', purpose: '' },
];

const asList = (payload) => (Array.isArray(payload) ? payload : payload?.results || []);

const joinParts = (...parts) => parts
  .filter((part) => part !== null && part !== undefined && part !== '')
  .join(' · ');

const daysBetween = (value) => {
  if (!value) return null;
  const target = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
};

const CellText = ({ children, title, weight = 700, color, mono }) => (
  <Typography
    noWrap
    title={title || (typeof children === 'string' ? children : undefined)}
    sx={{
      color,
      fontSize: 'inherit',
      lineHeight: 1.6,
      fontWeight: weight,
      fontVariantNumeric: mono ? 'tabular-nums' : undefined,
    }}
  >
    {children}
  </Typography>
);

const FormTable = ({ children }) => (
  <Box sx={{
    display: 'grid',
    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
    gap: 1.25,
    mb: 1.25,
  }}>
    {children}
  </Box>
);

const SectionTitle = ({ icon: Icon, title, color = ACCENT }) => (
  <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.75, mt: 0.5 }}>
    <Box sx={{
      width: 26, height: 26, borderRadius: '8px', display: 'grid', placeItems: 'center',
      bgcolor: alpha(color, 0.12), color,
    }}>
      <Icon sx={{ fontSize: 15 }} />
    </Box>
    <Typography sx={{ fontSize: 12.5, fontWeight: 900 }}>{title}</Typography>
  </Stack>
);

/* ---------------- دیالوگ‌های اقدام روی ارجاع ---------------- */

const ReferralNoteDialog = ({ open, referral, mode = 'note', onClose, onSubmit, pending }) => {
  const [text, setText] = useState('');
  const isInstruction = mode === 'instruction';

  useEffect(() => {
    if (!open) return;
    setText(isInstruction ? (referral?.instruction || '') : '');
  }, [open, isInstruction, referral]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: '16px' } }}>
      <DialogTitle sx={{ pb: 1, fontSize: 13.5, fontWeight: 900 }}>
        {isInstruction ? 'ثبت دستور روی ارجاع' : 'ثبت حاشیه / یادداشت'}
      </DialogTitle>
      <DialogContent dividers>
        <TextField
          autoFocus
          fullWidth
          multiline
          minRows={3}
          size="small"
          label={isInstruction ? 'متن دستور' : 'متن حاشیه'}
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.25 }}>
        <Button size="small" onClick={onClose}>انصراف</Button>
        <Button size="small" variant="contained" disabled={pending || !text.trim()}
          onClick={() => onSubmit({ [isInstruction ? 'instruction' : 'note']: text.trim() })}
          sx={{ bgcolor: isInstruction ? WARN : ACCENT }}>
          ثبت
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const ReferralForwardDialog = ({ open, onClose, onSubmit, pending }) => {
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
      <DialogTitle sx={{ pb: 1, fontSize: 13.5, fontWeight: 900 }}>
        ارجاع به سطح بعد
      </DialogTitle>
      <DialogContent dividers>
        <SectionTitle icon={ForwardToInboxIcon} title="گیرنده و مهلت" color={WARN} />
        <FormTable>
          <PersonnelPicker label="ارجاع به پرسنل" value={toEmployee}
            onChange={(option) => setToEmployee(option)} />
          <TextField size="small" label="یا واحد / شخص خارج از سامانه" value={toName}
            onChange={(event) => setToName(event.target.value)} />
          <TextField select size="small" label="نوع ارجاع" value={purpose}
            onChange={(event) => setPurpose(event.target.value)}>
            {Object.entries(PURPOSE_META).map(([value, item]) => (
              <MenuItem key={value} value={value}>{item.label}</MenuItem>
            ))}
          </TextField>
          <JalaliMaskedDateInput variant="outlined" label="مهلت اقدام" value={dueDate}
            onChange={(value) => setDueDate(value)} />
        </FormTable>
        <SectionTitle icon={EditNoteIcon} title="دستور و توضیح" color={INCOMING} />
        <Stack spacing={1}>
          <TextField size="small" multiline minRows={2} label="دستور / اقدام درخواستی"
            value={instruction} onChange={(event) => setInstruction(event.target.value)} />
          <TextField size="small" multiline minRows={2} label="توضیح تکمیلی" value={note}
            onChange={(event) => setNote(event.target.value)} />
        </Stack>
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

const ReferralCompleteDialog = ({ open, referral, onClose, onSubmit, pending }) => {
  const [response, setResponse] = useState('');
  const [result, setResult] = useState('');
  const [resultNote, setResultNote] = useState('');
  const [answeredOn, setAnsweredOn] = useState('');

  useEffect(() => {
    if (!open) return;
    setResponse(referral?.response || '');
    setResult(referral?.result || '');
    setResultNote(referral?.result_note || '');
    setAnsweredOn(new Date().toISOString().slice(0, 10));
  }, [open, referral]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: '16px' } }}>
      <DialogTitle sx={{ pb: 1, fontSize: 13.5, fontWeight: 900 }}>
        ثبت نتیجهٔ اقدام
      </DialogTitle>
      <DialogContent dividers>
        <SectionTitle icon={DoneAllIcon} title="پاسخ و نتیجه" color={OK} />
        <Stack spacing={1.25}>
          <TextField size="small" multiline minRows={2} label="پاسخ / اقدام انجام‌شده"
            value={response} onChange={(event) => setResponse(event.target.value)} />
          <TextField size="small" multiline minRows={2} label="نتیجه"
            value={result} onChange={(event) => setResult(event.target.value)} />
          <TextField size="small" multiline minRows={2} label="توضیح نتیجه"
            value={resultNote} onChange={(event) => setResultNote(event.target.value)} />
          <JalaliMaskedDateInput variant="outlined" label="تاریخ اقدام" value={answeredOn}
            onChange={(value) => setAnsweredOn(value)} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.25 }}>
        <Button size="small" onClick={onClose}>انصراف</Button>
        <Button size="small" variant="contained"
          disabled={pending || (!response.trim() && !result.trim() && !resultNote.trim())}
          onClick={() => onSubmit({
            response,
            result,
            result_note: resultNote,
            answered_on: answeredOn || undefined,
          })}
          sx={{ bgcolor: OK, '&:hover': { bgcolor: '#115e59' } }}>
          پایان اقدام
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const ReferralDetailDialog = ({ open, referral, onClose }) => (
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
    PaperProps={{ sx: { borderRadius: '16px' } }}>
    <DialogTitle sx={{ pb: 1 }}>
      <Stack direction="row" alignItems="center" spacing={0.75} useFlexGap flexWrap="wrap">
        <Typography sx={{ fontSize: 13.5, fontWeight: 900 }}>جزئیات ارجاع</Typography>
        {referral?.letter_number ? (
          <Chip size="small" label={toPersianDigits(referral.letter_number)} sx={chipSx(INCOMING)} />
        ) : null}
      </Stack>
    </DialogTitle>
    <DialogContent dividers>
      {referral ? (
        <Stack spacing={1.25}>
          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 900 }}>
              {referral.letter_subject || '—'}
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
              {joinParts(
                PURPOSE_META[referral.purpose]?.label,
                REFERRAL_STATUS_META[referral.status]?.label,
                dateLabel(referral.referred_on),
              )}
            </Typography>
          </Box>
          <Divider />
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1 }}>
            <Box>
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>از</Typography>
              <Typography sx={{ fontSize: 12, fontWeight: 700 }}>
                {referral.from_employee_name || referral.from_user_name || '—'}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>به</Typography>
              <Typography sx={{ fontSize: 12, fontWeight: 700 }}>
                {referral.target_label || referral.to_name || referral.to_user_name || '—'}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>مهلت اقدام</Typography>
              <Typography sx={{ fontSize: 12, fontWeight: 700 }}>
                {referral.due_date ? dateLabel(referral.due_date) : '—'}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>مشاهده‌شده</Typography>
              <Typography sx={{ fontSize: 12, fontWeight: 700 }}>
                {referral.seen_at ? dateTimeLabel(referral.seen_at) : 'دیده نشده'}
              </Typography>
            </Box>
          </Box>
          <Divider />
          <Box>
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>دستور</Typography>
            <Typography sx={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>
              {referral.instruction || '—'}
            </Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>توضیح</Typography>
            <Typography sx={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>{referral.note || '—'}</Typography>
          </Box>
          {referral.margin_note ? (
            <Box>
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>حواشی</Typography>
              <Typography sx={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>
                {referral.margin_note}
              </Typography>
            </Box>
          ) : null}
          {referral.response || referral.result ? (
            <>
              <Divider />
              <Box>
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>پاسخ</Typography>
                <Typography sx={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>
                  {referral.response || '—'}
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>نتیجه</Typography>
                <Typography sx={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>
                  {joinParts(referral.result, referral.result_note) || '—'}
                </Typography>
              </Box>
            </>
          ) : null}
        </Stack>
      ) : null}
    </DialogContent>
    <DialogActions sx={{ px: 2, py: 1.25 }}>
      <Button size="small" onClick={onClose}>بستن</Button>
    </DialogActions>
  </Dialog>
);

/* ---------------- صفحهٔ کارتابل ---------------- */

const CorrespondenceWorkdeskPage = () => {
  const moduleTheme = useModuleTheme();
  const qc = useQueryClient();
  const pageSize = moduleTheme.tableTheme.rowsPerPage;
  const [searchParams] = useSearchParams();

  const [tab, setTab] = useState(0);
  const [requestTab, setRequestTab] = useState(searchParams.get('tab') === 'requests');
  useEffect(() => {
    if (searchParams.get('tab') === 'requests') setRequestTab(true);
  }, [searchParams]);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [openOnly, setOpenOnly] = useState(true);
  const [unseenOnly, setUnseenOnly] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [detail, setDetail] = useState(null);
  const [noteTarget, setNoteTarget] = useState(null);
  const [noteMode, setNoteMode] = useState('note');
  const [forwardTarget, setForwardTarget] = useState(null);
  const [completeTarget, setCompleteTarget] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const activeTab = TAB_OPTIONS[tab] || TAB_OPTIONS[0];

  const listParams = useMemo(() => {
    const params = { limit: 200 };
    if (activeTab.purpose) params.purpose = activeTab.purpose;
    if (openOnly) params.status = 'open';
    if (unseenOnly) params.unseen = 1;
    if (debouncedSearch) params.search = debouncedSearch;
    return params;
  }, [activeTab.purpose, openOnly, unseenOnly, debouncedSearch]);

  const { data: cartable, isLoading, isFetching, refetch } = useQuery({
    queryKey: [...WORKDESK_KEY, listParams],
    queryFn: () => axiosInstance.get('/letter-referrals/cartable/', { params: listParams })
      .then((response) => response.data),
    placeholderData: (previous) => previous,
  });

  const counts = cartable?.counts || {};
  const rows = useMemo(() => asList(cartable), [cartable]);
  const total = typeof cartable?.total === 'number' ? cartable.total : rows.length;

  const sortedRows = useMemo(() => {
    const list = [...rows];
    if (sortBy === 'due') {
      return list.sort((a, b) => String(a.due_date || '9999').localeCompare(String(b.due_date || '9999')));
    }
    if (sortBy === 'status') {
      return list.sort((a, b) => String(a.status).localeCompare(String(b.status)));
    }
    return list;
  }, [rows, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const [page, setPage] = useState(0);
  useEffect(() => { setPage(0); }, [listParams, sortBy, pageSize]);
  useEffect(() => {
    if (page > totalPages - 1) setPage(Math.max(0, totalPages - 1));
  }, [page, totalPages]);
  const pageNumbers = useMemo(() => {
    const size = 5;
    const start = Math.max(0, Math.min(page - 2, totalPages - size));
    const end = Math.min(totalPages, start + size);
    return Array.from({ length: Math.max(0, end - start) }, (_unused, index) => start + index);
  }, [page, totalPages]);
  const paged = useMemo(
    () => sortedRows.slice(page * pageSize, (page + 1) * pageSize),
    [sortedRows, page, pageSize],
  );
  const { ref: tableRef, rowHeight, tableHeight } = useRowHeight(moduleTheme.tableTheme, paged.length);

  const refreshAll = () => {
    refetch();
    qc.invalidateQueries({ queryKey: ['correspondence-letters'] });
    qc.invalidateQueries({ queryKey: ['correspondence-stats'] });
    qc.invalidateQueries({ queryKey: ['correspondence-my-referrals'] });
    qc.invalidateQueries({ queryKey: WORKDESK_KEY });
  };

  const referralAction = useMutation({
    mutationFn: ({ id, action, payload }) => axiosInstance
      .post(`/letter-referrals/${id}/${action}/`, payload || {})
      .then((response) => response.data),
    onSuccess: (_data, variables) => {
      const messages = {
        seen: 'ارجاع به‌عنوان مشاهده‌شده ثبت شد.',
        note: 'حاشیه ثبت شد.',
        instruction: 'دستور ثبت شد.',
        forward: 'ارجاع به سطح بعد منتقل شد.',
        complete: 'نتیجهٔ اقدام ثبت شد.',
      };
      setToast(messages[variables.action] || 'انجام شد.');
      refreshAll();
    },
    onError: (requestError) => {
      const details = requestError?.response?.data;
      const first = details && typeof details === 'object'
        ? Object.values(details)[0] : '';
      setError(details?.detail || (Array.isArray(first) ? first[0] : first) || 'عملیات انجام نشد.');
    },
  });

  const openDetail = (referral) => {
    setDetail(referral);
    if (!referral.seen_at) {
      referralAction.mutate({ id: referral.id, action: 'seen' });
    }
  };

  const columns = [
    {
      key: 'row', label: 'ردیف', width: '2.5%', align: 'center',
      render: (_row, index) => (
        <CellText weight={700} color={MUTED_COLOR}>
          {toPersianDigits(page * pageSize + index + 1)}
        </CellText>
      ),
    },
    {
      key: 'letter', label: 'نامه', width: '22%',
      render: (row) => (
        <Stack spacing={0} sx={{ minWidth: 0 }}>
          <CellText mono weight={800} title={row.letter_subject || ''}>
            {joinParts(
              row.letter_number ? toPersianDigits(row.letter_number) : 'بدون شماره',
              row.letter_subject || '',
            )}
          </CellText>
          <Typography noWrap sx={{ fontSize: 10.5, color: 'text.secondary' }}>
            {joinParts(
              PURPOSE_META[row.purpose]?.label,
              row.from_employee_name || row.from_user_name || '',
            ) || '—'}
          </Typography>
        </Stack>
      ),
    },
    {
      key: 'instruction', label: 'دستور / توضیح', width: '24%',
      render: (row) => (
        <CellText weight={700} title={joinParts(row.instruction, row.note, row.margin_note)}>
          {joinParts(row.instruction, row.note) || '—'}
        </CellText>
      ),
    },
    {
      key: 'from', label: 'ارجاع‌دهنده', width: '12%',
      render: (row) => (
        <CellText weight={700}>
          {row.from_employee_name || row.from_user_name || '—'}
        </CellText>
      ),
    },
    {
      key: 'referred_on', label: 'تاریخ ارجاع', width: '9%', align: 'center',
      render: (row) => <CellText mono weight={700}>{dateLabel(row.referred_on)}</CellText>,
    },
    {
      key: 'due', label: 'مهلت', width: '8%', align: 'center',
      render: (row) => (row.due_date ? (
        <Chip size="small" label={daysLabel(daysBetween(row.due_date))}
          sx={chipSx(daysColor(daysBetween(row.due_date)))} />
      ) : <CellText color={MUTED_COLOR}>—</CellText>),
    },
    {
      key: 'status', label: 'وضعیت', width: '8%', align: 'center',
      render: (row) => {
        const meta = REFERRAL_STATUS_META[row.status] || REFERRAL_STATUS_META.pending;
        return <Chip size="small" label={meta.label} sx={chipSx(meta.color, meta.bg)} />;
      },
    },
    {
      key: 'seen', label: 'مشاهده', width: '5%', align: 'center',
      render: (row) => (row.seen_at ? (
        <Tooltip title={dateTimeLabel(row.seen_at)}>
          <MarkEmailReadIcon sx={{ fontSize: 16, color: OK }} />
        </Tooltip>
      ) : (
        <Tooltip title="دیده نشده">
          <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: DANGER, mx: 'auto' }} />
        </Tooltip>
      )),
    },
    {
      key: 'actions', label: 'عملیات', width: '9%', align: 'center',
      render: (row) => (
        <Stack direction="row" spacing={0.1} useFlexGap justifyContent="center"
          onClick={(event) => event.stopPropagation()}>
          <Tooltip title="مشاهده">
            <IconButton size="small" aria-label="مشاهدهٔ ارجاع" onClick={() => openDetail(row)}>
              <VisibilityOutlinedIcon sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="حاشیه">
            <IconButton size="small" aria-label="ثبت حاشیه"
              onClick={() => { setNoteMode('note'); setNoteTarget(row); }}>
              <EditNoteIcon sx={{ fontSize: 15, color: INCOMING }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="دستور">
            <IconButton size="small" aria-label="ثبت دستور"
              onClick={() => { setNoteMode('instruction'); setNoteTarget(row); }}>
              <AssignmentIcon sx={{ fontSize: 15, color: WARN }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="ارجاع بعدی">
            <IconButton size="small" aria-label="ارجاع بعدی" onClick={() => setForwardTarget(row)}>
              <ForwardToInboxIcon sx={{ fontSize: 15, color: INTERNAL }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="ثبت نتیجهٔ اقدام">
            <IconButton size="small" aria-label="ثبت نتیجه" onClick={() => setCompleteTarget(row)}>
              <DoneAllIcon sx={{ fontSize: 15, color: OK }} />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2 }, pb: 3 }}>
      <PageHeader
        title={requestTab ? 'درخواست‌های من' : 'کارتابل من'}
        subtitle={requestTab
          ? 'درخواست‌های پرسنلی ثبت‌شده و در جریان (مرخصی، وام، گواهی اشتغال و ...)'
          : 'ارجاعات رسیده به شما؛ اقدام، اطلاع یا اظهارنظر'}
        icon={requestTab ? AssignmentIcon : ForwardToInboxIcon}
        color={requestTab ? INTERNAL : WARN}
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
            <Button variant={requestTab ? 'outlined' : 'contained'}
              startIcon={<ForwardToInboxIcon />}
              onClick={() => setRequestTab(false)}
              sx={requestTab ? undefined : { bgcolor: WARN, '&:hover': { bgcolor: '#92400e' } }}>
              ارجاعات
            </Button>
            <Button variant={requestTab ? 'contained' : 'outlined'}
              startIcon={<AssignmentIcon />}
              onClick={() => setRequestTab(true)}
              sx={requestTab ? { bgcolor: INTERNAL, '&:hover': { bgcolor: '#5b21b6' } } : undefined}>
              درخواست‌ها
            </Button>
          </>
        )}
      />

      {requestTab ? (
        <CorrespondenceRequestsPanel />
      ) : (
        <>
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, minmax(0,1fr))',
              sm: 'repeat(3, minmax(0,1fr))',
              lg: 'repeat(5, minmax(0,1fr))',
            },
            gap: 1, mb: 1.25,
          }}>
            <KpiTile label="کل ارجاعات" value={formatPersianNumber(counts.total || 0)}
              color={SLATE} icon={ForwardToInboxIcon} />
            <KpiTile label="نیازمند اقدام" value={formatPersianNumber(counts.action || 0)}
              color={WARN} icon={AssignmentIcon} onClick={() => setTab(0)} />
            <KpiTile label="برای اطلاع" value={formatPersianNumber(counts.info || 0)}
              color={INCOMING} icon={MarkEmailReadIcon} onClick={() => setTab(1)} />
            <KpiTile label="معوق" value={formatPersianNumber(counts.overdue || 0)}
              color={DANGER} icon={DoneAllIcon} />
            <KpiTile label="دیده‌نشده" value={formatPersianNumber(counts.unseen || 0)}
              color={INTERNAL} icon={EditNoteIcon} onClick={() => setUnseenOnly(true)} />
          </Box>

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

          <Tabs value={tab} onChange={(_event, value) => setTab(value)} variant="scrollable"
            allowScrollButtonsMobile
            sx={{
              minHeight: 34, mb: 1,
              '& .MuiTab-root': { minHeight: 34, fontSize: 12.5, fontWeight: 800 },
            }}>
            {TAB_OPTIONS.map((option) => (
              <Tab key={option.value} label={option.label} />
            ))}
          </Tabs>

          <ModuleToolbar
            theme={moduleTheme}
            search={search}
            onSearch={setSearch}
            searchPlaceholder="جستجو در شماره نامه، موضوع، دستور و نام…"
            sort={sortBy}
            sortOptions={[
              { value: 'newest', label: 'جدیدترین ارجاع' },
              { value: 'due', label: 'نزدیک‌ترین مهلت' },
              { value: 'status', label: 'بر اساس وضعیت' },
            ]}
            onSort={setSortBy}
            filters={[{
              label: 'دامنهٔ نمایش',
              value: openOnly ? 'open' : 'all',
              options: [
                { value: 'open', label: 'فقط ارجاعات باز' },
                { value: 'all', label: 'همهٔ وضعیت‌ها' },
              ],
              onChange: (value) => setOpenOnly(value === 'open'),
            }]}
            activeChips={unseenOnly ? [{
              key: 'unseen', label: 'فقط دیده‌نشده‌ها', clear: () => setUnseenOnly(false),
            }] : []}
            activeFilterCount={(openOnly ? 0 : 1) + (unseenOnly ? 1 : 0)}
            onReset={() => {
              setOpenOnly(true);
              setUnseenOnly(false);
              setSortBy('newest');
              setSearch('');
            }}
            filtersOpen={filtersOpen}
            setFiltersOpen={setFiltersOpen}
          >
            <FormControlLabel
              control={<Switch size="small" checked={unseenOnly}
                onChange={(event) => setUnseenOnly(event.target.checked)} />}
              label={<Typography sx={{ fontSize: 12, fontWeight: 700 }}>فقط دیده‌نشده‌ها</Typography>}
              sx={{ ml: 0.5 }}
            />
          </ModuleToolbar>

          <Paper elevation={0} sx={{
            borderRadius: 'var(--hrms-table-radius, 16px)',
            overflow: 'hidden',
            px: `${moduleTheme.cardPadX}px`, py: `${moduleTheme.cardPadY}px`,
            border: '1px solid', borderColor: moduleTheme.cardBorderColor,
            bgcolor: 'background.paper', boxShadow: 'none',
          }}>
            {isLoading ? (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                  در حال بارگذاری کارتابل…
                </Typography>
              </Box>
            ) : (
              <ModuleTable
                tableTheme={moduleTheme.tableTheme}
                ariaLabel="کارتابل ارجاعات من"
                containerRef={tableRef}
                tableHeight={tableHeight}
                rowHeight={rowHeight}
                dimmed={isFetching}
                rows={paged}
                rowKey={(row) => row.id}
                onRowClick={openDetail}
                emptyText="ارجاعی با این شرایط در کارتابل شما نیست."
                minWidth={1180}
                tableLayout="auto"
                columns={columns}
              />
            )}
            <ModulePager
              tableTheme={moduleTheme.tableTheme}
              page={page}
              onPage={setPage}
              totalPages={totalPages}
              pageNumbers={pageNumbers}
              total={total}
              pageSize={pageSize}
              unit="ارجاع"
            />
          </Paper>
        </>
      )}

      <ReferralDetailDialog
        open={Boolean(detail)}
        referral={detail}
        onClose={() => setDetail(null)}
      />
      <ReferralNoteDialog
        open={Boolean(noteTarget)}
        referral={noteTarget}
        mode={noteMode}
        pending={referralAction.isPending}
        onClose={() => setNoteTarget(null)}
        onSubmit={(payload) => {
          if (!noteTarget) return;
          referralAction.mutate({
            id: noteTarget.id,
            action: noteMode === 'instruction' ? 'instruction' : 'note',
            payload,
          });
          setNoteTarget(null);
        }}
      />
      <ReferralForwardDialog
        open={Boolean(forwardTarget)}
        pending={referralAction.isPending}
        onClose={() => setForwardTarget(null)}
        onSubmit={(payload) => {
          if (!forwardTarget) return;
          referralAction.mutate({ id: forwardTarget.id, action: 'forward', payload });
          setForwardTarget(null);
        }}
      />
      <ReferralCompleteDialog
        open={Boolean(completeTarget)}
        referral={completeTarget}
        pending={referralAction.isPending}
        onClose={() => setCompleteTarget(null)}
        onSubmit={(payload) => {
          if (!completeTarget) return;
          referralAction.mutate({ id: completeTarget.id, action: 'complete', payload });
          setCompleteTarget(null);
        }}
      />
    </Box>
  );
};

export default CorrespondenceWorkdeskPage;
