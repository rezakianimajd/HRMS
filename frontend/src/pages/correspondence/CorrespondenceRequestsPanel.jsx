import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider,
  IconButton, MenuItem, Paper, Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import axiosInstance from '../../core/api/axiosConfig';
import JalaliMaskedDateInput from '../../core/components/ui/JalaliMaskedDateInput';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ForwardToInboxIcon from '@mui/icons-material/ForwardToInbox';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { formatPersianNumber, toPersianDigits } from '../../core/utils/numberUtils';
import {
  ModulePager, ModuleTable, ModuleToolbar, useModuleTheme, useRowHeight,
} from '../contracts/contractModuleUi';
import {
  ACCENT, DANGER, INCOMING, INTERNAL, KpiTile, OK, PRIORITY_META, SLATE, WARN, chipSx,
  dateLabel, daysColor, daysLabel,
} from './correspondenceUi';
import { PersonnelPicker } from './correspondenceLookups';

/**
 * درخواست‌های پرسنلی کارتابل (مرخصی، وام، گواهی اشتغال ...):
 * ثبت درخواست جدید، تأیید/رد، ارجاع به کارشناس و مشاهدهٔ گردش‌کار.
 */

const REQUESTS_KEY = ['correspondence-letter-requests'];
const REQUEST_TYPES_KEY = ['correspondence-letter-request-types'];

const REQUEST_STATUS_META = {
  draft: { label: 'پیش‌نویس', color: SLATE, bg: '#f1f5f9' },
  submitted: { label: 'در انتظار بررسی', color: INCOMING, bg: '#eff6ff' },
  in_review: { label: 'در حال بررسی', color: WARN, bg: '#fffbeb' },
  approved: { label: 'تأییدشده', color: OK, bg: '#ecfdf5' },
  rejected: { label: 'ردشده', color: DANGER, bg: '#fff1f2' },
  canceled: { label: 'لغوشده', color: '#64748b', bg: '#f8fafc' },
};

const SCOPE_OPTIONS = [
  { value: 'mine', label: 'درخواست‌های من' },
  { value: 'assigned', label: 'ارجاع‌شده به من' },
  { value: 'all', label: 'همهٔ درخواست‌ها' },
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

const CellText = ({ children, title, weight = 700, color }) => (
  <Typography
    noWrap
    title={title || (typeof children === 'string' ? children : undefined)}
    sx={{ color, fontSize: 'inherit', lineHeight: 1.6, fontWeight: weight }}
  >
    {children}
  </Typography>
);

/* ---------------- دیالوگ ثبت درخواست ---------------- */

const RequestFormDialog = ({ open, types, onClose, onSaved }) => {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    request_type: '',
    subject: '',
    description: '',
    priority: 'normal',
    requested_on: new Date().toISOString().slice(0, 10),
    due_date: '',
    status: 'submitted',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      request_type: '',
      subject: '',
      description: '',
      priority: 'normal',
      requested_on: new Date().toISOString().slice(0, 10),
      due_date: '',
      status: 'submitted',
    });
    setError('');
  }, [open]);

  const set = (key) => (event) => setForm((previous) => ({ ...previous, [key]: event.target.value }));

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        request_type: form.request_type || null,
        subject: form.subject.trim(),
        description: form.description,
        priority: form.priority,
        requested_on: form.requested_on || undefined,
        due_date: form.due_date || null,
        status: form.status,
      };
      const response = await axiosInstance.post('/letter-requests/', payload);
      qc.invalidateQueries({ queryKey: REQUESTS_KEY });
      onSaved?.(response.data);
      onClose();
    } catch (requestError) {
      const details = requestError?.response?.data;
      const first = details && typeof details === 'object' ? Object.values(details)[0] : '';
      setError(details?.detail || (Array.isArray(first) ? first[0] : first) || 'ثبت درخواست ممکن نشد.');
    } finally {
      setSaving(false);
    }
  };

  const selectedType = types.find((row) => String(row.id) === String(form.request_type));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: '16px' } }}>
      <DialogTitle sx={{ pb: 1, fontSize: 13.5, fontWeight: 900 }}>درخواست جدید</DialogTitle>
      <DialogContent dividers>
        {error ? (
          <Alert severity="error" sx={{ mb: 1.25, borderRadius: '10px', py: 0.25 }}>
            <Typography sx={{ fontSize: 12 }}>{error}</Typography>
          </Alert>
        ) : null}
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
          gap: 1.25,
        }}>
          <TextField select size="small" label="نوع درخواست" value={form.request_type}
            onChange={set('request_type')}>
            <MenuItem value="">—</MenuItem>
            {types.map((row) => (
              <MenuItem key={row.id} value={row.id}>{row.name}</MenuItem>
            ))}
          </TextField>
          <TextField select size="small" label="اولویت" value={form.priority}
            onChange={set('priority')}>
            {Object.entries(PRIORITY_META).map(([value, item]) => (
              <MenuItem key={value} value={value}>{item.label}</MenuItem>
            ))}
          </TextField>
          <TextField size="small" label="موضوع" value={form.subject} onChange={set('subject')}
            sx={{ gridColumn: { sm: 'span 2' } }} />
          <TextField size="small" multiline minRows={3} label="شرح درخواست"
            value={form.description} onChange={set('description')}
            sx={{ gridColumn: { sm: 'span 2' } }} />
          <JalaliMaskedDateInput variant="outlined" label="تاریخ درخواست"
            value={form.requested_on}
            onChange={(value) => setForm((previous) => ({ ...previous, requested_on: value }))} />
          <JalaliMaskedDateInput variant="outlined" label="مهلت بررسی" value={form.due_date}
            onChange={(value) => setForm((previous) => ({ ...previous, due_date: value }))} />
          <TextField select size="small" label="ثبت به‌صورت" value={form.status}
            onChange={set('status')} sx={{ gridColumn: { sm: 'span 2' } }}>
            <MenuItem value="submitted">ثبت و ارسال برای بررسی</MenuItem>
            <MenuItem value="draft">ذخیره به‌عنوان پیش‌نویس</MenuItem>
          </TextField>
        </Box>
        {selectedType?.requires_attachment ? (
          <Alert severity="info" sx={{ mt: 1.25, borderRadius: '10px', py: 0.25 }}>
            <Typography sx={{ fontSize: 11.5 }}>
              این نوع درخواست نیازمند پیوست است؛ پس از ثبت، از پروندهٔ درخواست پیوست را بارگذاری کنید.
            </Typography>
          </Alert>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.25 }}>
        <Button size="small" onClick={onClose}>انصراف</Button>
        <Button size="small" variant="contained" disabled={saving || !form.subject.trim()}
          onClick={submit} sx={{ bgcolor: INTERNAL, '&:hover': { bgcolor: '#5b21b6' } }}>
          {saving ? 'در حال ثبت…' : 'ثبت درخواست'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/* ---------------- دیالوگ تصمیم و ارجاع ---------------- */

const DECISION_META = {
  approve: { label: 'تأیید درخواست', color: OK, action: 'approve' },
  reject: { label: 'رد درخواست', color: DANGER, action: 'reject' },
  cancel: { label: 'لغو درخواست', color: SLATE, action: 'cancel' },
};

const RequestDecisionDialog = ({ open, request, decision, onClose, onSubmit, pending }) => {
  const [note, setNote] = useState('');
  const meta = DECISION_META[decision] || DECISION_META.approve;

  useEffect(() => {
    if (open) setNote('');
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: '16px' } }}>
      <DialogTitle sx={{ pb: 1, fontSize: 13.5, fontWeight: 900 }}>
        {meta.label}
        {request?.number ? (
          <Typography component="span" sx={{ fontSize: 11.5, color: 'text.secondary', ml: 1 }}>
            {toPersianDigits(request.number)}
          </Typography>
        ) : null}
      </DialogTitle>
      <DialogContent dividers>
        <TextField fullWidth size="small" multiline minRows={3} label="توضیح تصمیم"
          value={note} onChange={(event) => setNote(event.target.value)} />
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.25 }}>
        <Button size="small" onClick={onClose}>انصراف</Button>
        <Button size="small" variant="contained" disabled={pending}
          onClick={() => onSubmit({ decision_note: note, note })}
          sx={{ bgcolor: meta.color }}>
          {meta.label}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const RequestAssignDialog = ({ open, request, onClose, onSubmit, pending }) => {
  const [toEmployee, setToEmployee] = useState(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open) return;
    setToEmployee(null);
    setNote('');
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: '16px' } }}>
      <DialogTitle sx={{ pb: 1, fontSize: 13.5, fontWeight: 900 }}>ارجاع درخواست</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.25}>
          <PersonnelPicker label="ارجاع به پرسنل" value={toEmployee}
            onChange={(option) => setToEmployee(option)} />
          <TextField size="small" multiline minRows={2} label="یادداشت" value={note}
            onChange={(event) => setNote(event.target.value)} />
          {request?.subject ? (
            <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
              {request.subject}
            </Typography>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.25 }}>
        <Button size="small" onClick={onClose}>انصراف</Button>
        <Button size="small" variant="contained" disabled={pending || !toEmployee}
          onClick={() => onSubmit({ to_employee: toEmployee?.id, note })}
          sx={{ bgcolor: WARN, '&:hover': { bgcolor: '#92400e' } }}>
          ثبت ارجاع
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const RequestDetailDialog = ({ open, request, onClose }) => (
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
    PaperProps={{ sx: { borderRadius: '16px' } }}>
    <DialogTitle sx={{ pb: 1 }}>
      <Stack direction="row" alignItems="center" spacing={0.75} useFlexGap flexWrap="wrap">
        <Typography sx={{ fontSize: 13.5, fontWeight: 900 }}>پروندهٔ درخواست</Typography>
        {request?.number ? (
          <Chip size="small" label={toPersianDigits(request.number)} sx={chipSx(INTERNAL)} />
        ) : null}
      </Stack>
    </DialogTitle>
    <DialogContent dividers>
      {request ? (
        <Stack spacing={1.25}>
          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 900 }}>{request.subject}</Typography>
            <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
              {joinParts(
                request.request_type_title_display || request.request_type_title,
                request.requester_display || request.requester_name,
                dateLabel(request.requested_on),
              )}
            </Typography>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1 }}>
            <Box>
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>وضعیت</Typography>
              <Typography sx={{ fontSize: 12, fontWeight: 700 }}>
                {REQUEST_STATUS_META[request.status]?.label || request.status_display}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>گام</Typography>
              <Typography sx={{ fontSize: 12, fontWeight: 700 }}>
                {`${toPersianDigits(request.current_step || 1)} از ${toPersianDigits(request.total_steps || 1)}`}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>مهلت بررسی</Typography>
              <Typography sx={{ fontSize: 12, fontWeight: 700 }}>
                {request.due_date ? dateLabel(request.due_date) : '—'}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>کارشناس جاری</Typography>
              <Typography sx={{ fontSize: 12, fontWeight: 700 }}>
                {request.assignee_name || '—'}
              </Typography>
            </Box>
          </Box>
          {request.description ? (
            <>
              <Divider />
              <Box>
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>شرح درخواست</Typography>
                <Typography sx={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>
                  {request.description}
                </Typography>
              </Box>
            </>
          ) : null}
          {request.decision_note ? (
            <Box>
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>توضیح تصمیم</Typography>
              <Typography sx={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>
                {request.decision_note}
              </Typography>
            </Box>
          ) : null}
          {Array.isArray(request.events) && request.events.length ? (
            <>
              <Divider />
              <Box>
                <Typography sx={{ fontSize: 11.5, fontWeight: 800, mb: 0.75 }}>گردش‌کار</Typography>
                <Stack spacing={0.75}>
                  {request.events.map((event) => (
                    <Box key={event.id} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                      <Box sx={{
                        width: 6, height: 6, borderRadius: '50%', mt: 0.75,
                        bgcolor: ACCENT, flex: '0 0 auto',
                      }} />
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontSize: 11.5, fontWeight: 700 }}>
                          {joinParts(event.action_display, event.actor_name, dateLabel(event.created_at))}
                        </Typography>
                        {event.note ? (
                          <Typography sx={{ fontSize: 11, color: 'text.secondary', whiteSpace: 'pre-wrap' }}>
                            {event.note}
                          </Typography>
                        ) : null}
                      </Box>
                    </Box>
                  ))}
                </Stack>
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

/* ---------------- پنل درخواست‌ها ---------------- */

const CorrespondenceRequestsPanel = () => {
  const moduleTheme = useModuleTheme();
  const qc = useQueryClient();
  const pageSize = moduleTheme.tableTheme.rowsPerPage;

  const [scope, setScope] = useState('mine');
  const [statusFilter, setStatusFilter] = useState('open');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [decisionTarget, setDecisionTarget] = useState(null);
  const [decision, setDecision] = useState('approve');
  const [assignTarget, setAssignTarget] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: rawTypes } = useQuery({
    queryKey: REQUEST_TYPES_KEY,
    queryFn: () => axiosInstance.get('/letter-request-types/', { params: { page_size: 200 } })
      .then((response) => response.data),
  });
  const types = useMemo(() => asList(rawTypes), [rawTypes]);

  const listParams = useMemo(() => {
    const params = { page_size: 200, ordering: sortBy === 'oldest' ? 'created_at' : '-created_at' };
    if (scope !== 'all') params.scope = scope;
    if (statusFilter === 'open') params.open_only = 1;
    else if (statusFilter !== 'all') params.status = statusFilter;
    if (debouncedSearch) params.search = debouncedSearch;
    return params;
  }, [scope, statusFilter, debouncedSearch, sortBy]);

  const { data: rawRequests, isLoading, isFetching, refetch } = useQuery({
    queryKey: [...REQUESTS_KEY, listParams],
    queryFn: () => axiosInstance.get('/letter-requests/', { params: listParams })
      .then((response) => response.data),
    placeholderData: (previous) => previous,
  });

  const requests = useMemo(() => asList(rawRequests), [rawRequests]);
  const counts = useMemo(() => {
    const base = { total: requests.length, open: 0, approved: 0, rejected: 0 };
    requests.forEach((row) => {
      if (['draft', 'submitted', 'in_review'].includes(row.status)) base.open += 1;
      if (row.status === 'approved') base.approved += 1;
      if (row.status === 'rejected') base.rejected += 1;
    });
    return base;
  }, [requests]);

  const totalPages = Math.max(1, Math.ceil(requests.length / pageSize));
  const [page, setPage] = useState(0);
  useEffect(() => { setPage(0); }, [listParams, pageSize]);
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
    () => requests.slice(page * pageSize, (page + 1) * pageSize),
    [requests, page, pageSize],
  );
  const { ref: tableRef, rowHeight, tableHeight } = useRowHeight(moduleTheme.tableTheme, paged.length);

  const requestAction = useMutation({
    mutationFn: ({ id, action, payload }) => axiosInstance
      .post(`/letter-requests/${id}/${action}/`, payload || {})
      .then((response) => response.data),
    onSuccess: (_data, variables) => {
      const messages = {
        approve: 'درخواست تأیید شد.',
        reject: 'درخواست رد شد.',
        cancel: 'درخواست لغو شد.',
        assign: 'درخواست ارجاع شد.',
        submit: 'درخواست ثبت نهایی شد.',
      };
      setToast(messages[variables.action] || 'انجام شد.');
      refetch();
      qc.invalidateQueries({ queryKey: REQUESTS_KEY });
    },
    onError: (requestError) => {
      const details = requestError?.response?.data;
      const first = details && typeof details === 'object' ? Object.values(details)[0] : '';
      setError(details?.detail || (Array.isArray(first) ? first[0] : first) || 'عملیات انجام نشد.');
    },
  });

  const columns = [
    {
      key: 'row', label: 'ردیف', width: '3%', align: 'center',
      render: (_row, index) => (
        <CellText weight={700} color="#64748b">{toPersianDigits(page * pageSize + index + 1)}</CellText>
      ),
    },
    {
      key: 'number', label: 'شماره / نوع', width: '16%',
      render: (row) => (
        <Stack spacing={0} sx={{ minWidth: 0 }}>
          <CellText weight={800}>{toPersianDigits(row.number || '—')}</CellText>
          <Typography noWrap sx={{ fontSize: 10.5, color: 'text.secondary' }}>
            {row.request_type_title_display || row.request_type_title || '—'}
          </Typography>
        </Stack>
      ),
    },
    {
      key: 'subject', label: 'موضوع', width: '26%',
      render: (row) => (
        <CellText weight={800} title={joinParts(row.subject, row.description)}>
          {row.subject || '—'}
        </CellText>
      ),
    },
    {
      key: 'requester', label: 'درخواست‌دهنده', width: '14%',
      render: (row) => (
        <CellText weight={700}>
          {row.requester_display || row.requester_name || '—'}
        </CellText>
      ),
    },
    {
      key: 'requested_on', label: 'تاریخ', width: '9%', align: 'center',
      render: (row) => <CellText weight={700}>{dateLabel(row.requested_on)}</CellText>,
    },
    {
      key: 'due', label: 'مهلت', width: '8%', align: 'center',
      render: (row) => (row.due_date ? (
        <Chip size="small" label={daysLabel(daysBetween(row.due_date))}
          sx={chipSx(daysColor(daysBetween(row.due_date)))} />
      ) : <CellText color="#64748b">—</CellText>),
    },
    {
      key: 'step', label: 'گام', width: '6%', align: 'center',
      render: (row) => (
        <CellText weight={700}>
          {`${toPersianDigits(row.current_step || 1)}/${toPersianDigits(row.total_steps || 1)}`}
        </CellText>
      ),
    },
    {
      key: 'status', label: 'وضعیت', width: '10%', align: 'center',
      render: (row) => {
        const meta = REQUEST_STATUS_META[row.status] || REQUEST_STATUS_META.submitted;
        return <Chip size="small" label={meta.label} sx={chipSx(meta.color, meta.bg)} />;
      },
    },
    {
      key: 'actions', label: 'عملیات', width: '11%', align: 'center',
      render: (row) => {
        const closed = ['approved', 'rejected', 'canceled'].includes(row.status);
        return (
          <Stack direction="row" spacing={0.1} useFlexGap justifyContent="center"
            onClick={(event) => event.stopPropagation()}>
            <Tooltip title="مشاهدهٔ پرونده">
              <IconButton size="small" aria-label="مشاهدهٔ درخواست" onClick={() => setDetail(row)}>
                <VisibilityOutlinedIcon sx={{ fontSize: 15 }} />
              </IconButton>
            </Tooltip>
            {row.status === 'draft' ? (
              <Tooltip title="ثبت نهایی">
                <IconButton size="small" aria-label="ثبت نهایی"
                  onClick={() => requestAction.mutate({ id: row.id, action: 'submit' })}>
                  <PlayCircleOutlineIcon sx={{ fontSize: 15, color: INCOMING }} />
                </IconButton>
              </Tooltip>
            ) : null}
            {!closed ? (
              <>
                <Tooltip title="تأیید">
                  <IconButton size="small" aria-label="تأیید درخواست"
                    onClick={() => { setDecision('approve'); setDecisionTarget(row); }}>
                    <CheckCircleOutlineIcon sx={{ fontSize: 15, color: OK }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="رد">
                  <IconButton size="small" aria-label="رد درخواست"
                    onClick={() => { setDecision('reject'); setDecisionTarget(row); }}>
                    <HighlightOffIcon sx={{ fontSize: 15, color: DANGER }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="ارجاع">
                  <IconButton size="small" aria-label="ارجاع درخواست"
                    onClick={() => setAssignTarget(row)}>
                    <ForwardToInboxIcon sx={{ fontSize: 15, color: WARN }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="لغو">
                  <IconButton size="small" aria-label="لغو درخواست"
                    onClick={() => { setDecision('cancel'); setDecisionTarget(row); }}>
                    <CancelOutlinedIcon sx={{ fontSize: 15, color: SLATE }} />
                  </IconButton>
                </Tooltip>
              </>
            ) : null}
          </Stack>
        );
      },
    },
  ];

  return (
    <Box>
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, minmax(0,1fr))', sm: 'repeat(4, minmax(0,1fr))' },
        gap: 1, mb: 1.25,
      }}>
        <KpiTile label="کل درخواست‌ها" value={formatPersianNumber(counts.total)}
          color={INTERNAL} icon={AddCircleOutlineIcon} />
        <KpiTile label="در جریان" value={formatPersianNumber(counts.open)} color={WARN}
          icon={PlayCircleOutlineIcon} onClick={() => setStatusFilter('open')} />
        <KpiTile label="تأییدشده" value={formatPersianNumber(counts.approved)} color={OK}
          icon={CheckCircleOutlineIcon} onClick={() => setStatusFilter('approved')} />
        <KpiTile label="ردشده" value={formatPersianNumber(counts.rejected)} color={DANGER}
          icon={HighlightOffIcon} onClick={() => setStatusFilter('rejected')} />
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

      <ModuleToolbar
        theme={moduleTheme}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="جستجو در شماره، موضوع و درخواست‌دهنده…"
        sort={sortBy}
        sortOptions={[
          { value: 'newest', label: 'جدیدترین درخواست' },
          { value: 'oldest', label: 'قدیمی‌ترین درخواست' },
        ]}
        onSort={setSortBy}
        filters={[
          { label: 'دامنه', value: scope, options: SCOPE_OPTIONS, onChange: setScope },
          {
            label: 'وضعیت',
            value: statusFilter,
            options: [
              { value: 'open', label: 'در جریان' },
              { value: 'all', label: 'همه' },
              { value: 'approved', label: 'تأییدشده' },
              { value: 'rejected', label: 'ردشده' },
              { value: 'canceled', label: 'لغوشده' },
            ],
            onChange: setStatusFilter,
          },
        ]}
        activeChips={[
          ...(scope !== 'mine' ? [{
            key: 'scope',
            label: SCOPE_OPTIONS.find((row) => row.value === scope)?.label || '',
            clear: () => setScope('mine'),
          }] : []),
          ...(statusFilter !== 'open' ? [{
            key: 'status',
            label: REQUEST_STATUS_META[statusFilter]?.label || 'همهٔ وضعیت‌ها',
            clear: () => setStatusFilter('open'),
          }] : []),
        ]}
        activeFilterCount={(scope !== 'mine' ? 1 : 0) + (statusFilter !== 'open' ? 1 : 0)}
        onReset={() => {
          setScope('mine');
          setStatusFilter('open');
          setSearch('');
          setSortBy('newest');
        }}
        filtersOpen={filtersOpen}
        setFiltersOpen={setFiltersOpen}
      >
        <Button variant="contained" startIcon={<AddCircleOutlineIcon />}
          onClick={() => setFormOpen(true)}
          sx={{ bgcolor: INTERNAL, '&:hover': { bgcolor: '#5b21b6' }, whiteSpace: 'nowrap' }}>
          درخواست جدید
        </Button>
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
              در حال بارگذاری درخواست‌ها…
            </Typography>
          </Box>
        ) : (
          <ModuleTable
            tableTheme={moduleTheme.tableTheme}
            ariaLabel="درخواست‌های پرسنلی"
            containerRef={tableRef}
            tableHeight={tableHeight}
            rowHeight={rowHeight}
            dimmed={isFetching}
            rows={paged}
            rowKey={(row) => row.id}
            onRowClick={(row) => setDetail(row)}
            emptyText="درخواستی با این شرایط ثبت نشده است."
            minWidth={1120}
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
          total={requests.length}
          pageSize={pageSize}
          unit="درخواست"
        />
      </Paper>

      <RequestFormDialog
        open={formOpen}
        types={types}
        onClose={() => setFormOpen(false)}
        onSaved={() => { setToast('درخواست ثبت شد.'); refetch(); }}
      />
      <RequestDetailDialog
        open={Boolean(detail)}
        request={detail}
        onClose={() => setDetail(null)}
      />
      <RequestDecisionDialog
        open={Boolean(decisionTarget)}
        request={decisionTarget}
        decision={decision}
        pending={requestAction.isPending}
        onClose={() => setDecisionTarget(null)}
        onSubmit={(payload) => {
          if (!decisionTarget) return;
          requestAction.mutate({
            id: decisionTarget.id,
            action: DECISION_META[decision]?.action || 'approve',
            payload,
          });
          setDecisionTarget(null);
        }}
      />
      <RequestAssignDialog
        open={Boolean(assignTarget)}
        request={assignTarget}
        pending={requestAction.isPending}
        onClose={() => setAssignTarget(null)}
        onSubmit={(payload) => {
          if (!assignTarget) return;
          requestAction.mutate({ id: assignTarget.id, action: 'assign', payload });
          setAssignTarget(null);
        }}
      />
    </Box>
  );
};

export default CorrespondenceRequestsPanel;
