import React, { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, FormControlLabel, IconButton, MenuItem, Paper, Stack, Switch,
  TextField, Tooltip, Typography,
} from '@mui/material';
import AddLinkIcon from '@mui/icons-material/AddLink';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import axiosInstance from '../../core/api/axiosConfig';
import { formatPersianNumber, toPersianDigits } from '../../core/utils/numberUtils';
import { ModuleTable, useModuleTheme, useRowHeight } from '../contracts/contractModuleUi';
import { ACCENT, SLATE, WARN, chipSx } from './correspondenceUi';
import { PartyPicker, PersonnelPicker, partyValue, personValue } from './correspondenceLookups';

const API = '/correspondence-name-aliases/';

const asList = (payload) => (Array.isArray(payload) ? payload : payload?.results || []);

const SCOPES = [
  { value: 'any', label: 'همهٔ فیلدها' },
  { value: 'referral', label: 'گیرندهٔ ارجاع' },
  { value: 'sender', label: 'فرستنده' },
  { value: 'receiver', label: 'گیرنده' },
  { value: 'delivery', label: 'تحویل‌دهنده' },
  { value: 'counterparty', label: 'طرف نامه (وارده/صادره)' },
];
const TARGET_KINDS = [
  { value: 'employee', label: 'پرسنل (منابع انسانی)' },
  { value: 'party', label: 'طرف حساب (قراردادها)' },
  { value: 'correspondent', label: 'مخاطب مکاتبات' },
];
const scopeLabel = (value) => SCOPES.find((item) => item.value === value)?.label || value;

const EMPTY_FORM = {
  id: null, raw_name: '', scope: 'any', target_kind: 'employee',
  employee: null, party: null, correspondent: '', note: '', apply_now: true,
};


const CorrespondenceNameMappingTab = ({ search = '', onToast }) => {
  const theme = useModuleTheme();
  const qc = useQueryClient();
  const [dialog, setDialog] = useState({ open: false, ...EMPTY_FORM });
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);

  const summaryQuery = useQuery({
    queryKey: ['correspondence-alias-summary'],
    queryFn: () => axiosInstance.get(`${API}summary/`).then((r) => r.data),
  });
  const aliasesQuery = useQuery({
    queryKey: ['correspondence-aliases'],
    queryFn: () => axiosInstance.get(API, { params: { page_size: 500 } })
      .then((r) => r.data),
  });
  const unmappedQuery = useQuery({
    queryKey: ['correspondence-alias-unmapped'],
    queryFn: () => axiosInstance.get(`${API}unmapped/`, { params: { limit: 80 } })
      .then((r) => r.data),
  });
  const contactsQuery = useQuery({
    queryKey: ['correspondence-contacts'],
    queryFn: () => axiosInstance.get('/correspondents/', { params: { page_size: 300 } })
      .then((r) => r.data),
  });

  const aliases = asList(aliasesQuery.data);
  const unmapped = asList(unmappedQuery.data);
  const contacts = asList(contactsQuery.data);
  const summary = summaryQuery.data || {};

  const query = search.trim().toLowerCase();
  const visibleUnmapped = useMemo(() => {
    if (!query) return unmapped;
    return unmapped.filter((row) => String(row.raw_name || '').toLowerCase().includes(query));
  }, [unmapped, query]);

  // یک نام می‌تواند چند مقصد داشته باشد (ارجاع به چند نفر) → گروه‌بندی می‌کنیم
  const groups = useMemo(() => {
    const map = new Map();
    aliases.forEach((row) => {
      const key = `${row.normalized || row.raw_name}|${row.scope}`;
      if (!map.has(key)) {
        map.set(key, {
          key, raw_name: row.raw_name, scope: row.scope,
          scope_display: row.scope_display, items: [], applied: 0,
        });
      }
      const group = map.get(key);
      group.items.push(row);
      group.applied += row.applied_count || 0;
    });
    return [...map.values()];
  }, [aliases]);

  const visibleGroups = useMemo(() => {
    if (!query) return groups;
    return groups.filter((group) => [
      group.raw_name, group.scope_display,
      ...group.items.map((item) => item.target_label),
    ].some((value) => String(value || '').toLowerCase().includes(query)));
  }, [groups, query]);

  const { ref: tableRef, rowHeight, tableHeight } = useRowHeight(
    theme.tableTheme, Math.max(1, visibleGroups.length),
  );

  const refresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['correspondence-aliases'] });
    qc.invalidateQueries({ queryKey: ['correspondence-alias-summary'] });
    qc.invalidateQueries({ queryKey: ['correspondence-alias-unmapped'] });
    qc.invalidateQueries({ queryKey: ['correspondence-meta'] });
  }, [qc]);

  const openCreate = useCallback((rawName = '') => {
    setDialog({ ...EMPTY_FORM, raw_name: rawName, open: true });
    setError('');
  }, []);

  const openEdit = useCallback((row) => {
    setDialog({
      open: true,
      id: row.id,
      raw_name: row.raw_name,
      scope: row.scope,
      target_kind: row.target_kind,
      employee: row.employee ? personValue(row.employee, row.employee_name) : null,
      party: row.party ? partyValue(row.party, row.party_name) : null,
      correspondent: row.correspondent || '',
      note: row.note || '',
      apply_now: true,
    });
    setError('');
  }, []);

  /** افزودن مقصد دیگر به یک نام موجود (ارجاع هم‌زمان به چند نفر). */
  const openAddTarget = useCallback((group) => {
    setDialog({
      ...EMPTY_FORM,
      open: true,
      raw_name: group.raw_name,
      scope: group.scope,
      note: '',
    });
    setError('');
  }, []);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        raw_name: dialog.raw_name.trim(),
        scope: dialog.scope,
        target_kind: dialog.target_kind,
        note: dialog.note,
      };
      if (dialog.target_kind === 'employee') payload.employee = dialog.employee?.id;
      if (dialog.target_kind === 'party') payload.party = dialog.party?.id;
      if (dialog.target_kind === 'correspondent') payload.correspondent = dialog.correspondent;
      const response = dialog.id
        ? await axiosInstance.patch(`${API}${dialog.id}/`, payload)
        : await axiosInstance.post(API, payload);
      if (dialog.apply_now) {
        await axiosInstance.post(`${API}${response.data.id}/apply/`, {});
      }
      return response.data;
    },
    onSuccess: (data) => {
      refresh();
      setDialog({ ...EMPTY_FORM, open: false });
      onToast?.(`نگاشت «${data.raw_name}» ذخیره شد.`);
    },
    onError: (err) => {
      const detail = err?.response?.data;
      setError(typeof detail === 'string' ? detail
        : (detail && Object.values(detail).flat().join(' ')) || 'ذخیرهٔ نگاشت انجام نشد.');
    },
  });

  const remove = useMutation({
    mutationFn: (id) => axiosInstance.delete(`${API}${id}/`),
    onSuccess: () => { refresh(); onToast?.('نگاشت حذف شد.'); },
  });

  const applyGroup = useMutation({
    mutationFn: async (group) => {
      let total = 0;
      for (const item of group.items) {
        const response = await axiosInstance.post(`${API}${item.id}/apply/`, {});
        total += response.data.total || 0;
      }
      return total;
    },
    onSuccess: (total) => {
      refresh();
      onToast?.(`${formatPersianNumber(total)} ردیف اصلاح شد.`);
    },
  });

  const applyAll = useMutation({
    mutationFn: (dryRun) => axiosInstance.post(`${API}apply-all/`, { dry_run: dryRun }),
    onSuccess: (response, dryRun) => {
      if (dryRun) {
        setPreview(response.data);
      } else {
        setPreview(null);
        refresh();
        onToast?.(`${formatPersianNumber(response.data.total || 0)} ردیف اصلاح شد.`);
      }
    },
  });

  const columns = useMemo(() => ([
    { key: 'raw', label: 'نام واردشده', width: '22%', render: (row) => (
      <Box sx={{ minWidth: 0 }}>
        <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 800 }}>{row.raw_name}</Typography>
        <Typography noWrap sx={{ fontSize: 9.5, color: 'text.secondary' }}>
          {row.scope_display || scopeLabel(row.scope)}
        </Typography>
      </Box>
    ) },
    { key: 'target', label: 'مقصد(ها)', width: '34%', render: (row) => (
      <Stack direction="row" spacing={0.4} flexWrap="wrap" useFlexGap>
        {row.items.map((item, index) => (
          <Chip
            key={item.id}
            size="small"
            color={index === 0 ? 'primary' : 'default'}
            variant={index === 0 ? 'filled' : 'outlined'}
            label={`${item.target_label}${index === 0 ? ' ★' : ''}`}
            onDelete={() => remove.mutate(item.id)}
            onClick={() => openEdit(item)}
            sx={{ fontSize: 9.5, height: 21 }}
          />
        ))}
        {row.items.length > 1 ? (
          <Chip size="small" label={`${toPersianDigits(row.items.length)} نفر`}
            sx={chipSx(SLATE)} />
        ) : null}
      </Stack>
    ) },
    { key: 'applied', label: 'اصلاح‌شده', width: '12%', align: 'center', render: (row) => (
      <Chip size="small" label={toPersianDigits(row.applied || 0)}
        sx={chipSx(row.applied ? '#16a34a' : SLATE)} />
    ) },
    { key: 'actions', label: 'عملیات', width: '22%', align: 'center', render: (row) => (
      <Stack direction="row" spacing={0.2} justifyContent="center">
        <Tooltip title="افزودن مقصد دیگر (چندنفره)">
          <IconButton size="small" aria-label="افزودن مقصد" onClick={() => openAddTarget(row)}>
            <AddLinkIcon sx={{ fontSize: 15, color: '#7c3aed' }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="اعمال روی داده‌های موجود">
          <span>
            <IconButton size="small" aria-label="اعمال" disabled={applyGroup.isPending}
              onClick={() => applyGroup.mutate(row)}>
              <PlayCircleOutlineIcon sx={{ fontSize: 15, color: '#0369a1' }} />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="حذف همهٔ مقصدهای این نام">
          <IconButton size="small" aria-label="حذف" onClick={() => row.items.forEach(
            (item) => remove.mutate(item.id),
          )}>
            <DeleteOutlineIcon sx={{ fontSize: 15, color: '#be123c' }} />
          </IconButton>
        </Tooltip>
      </Stack>
    ) },
  ]), [applyGroup, remove, openEdit, openAddTarget]);

  const loading = aliasesQuery.isLoading || summaryQuery.isLoading;

  return (
    <Box>
      <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap
        sx={{ mb: 1 }}>
        <Chip size="small" label={`${formatPersianNumber(summary.aliases || 0)} نگاشت`}
          sx={chipSx(ACCENT)} />
        <Chip size="small" label={`${formatPersianNumber(summary.unmapped || 0)} نام بدون نگاشت`}
          sx={chipSx(WARN)} />
        <Chip size="small"
          label={`${formatPersianNumber(summary.applied || 0)} ردیف اصلاح‌شده`}
          sx={chipSx('#16a34a')} />
        <Box sx={{ flex: 1 }} />
        <Tooltip title="بازخوانی فهرست‌ها">
          <span>
            <IconButton size="small" aria-label="بازخوانی" onClick={refresh}>
              <RefreshIcon sx={{ fontSize: 17 }} />
            </IconButton>
          </span>
        </Tooltip>
        <Button size="small" variant="outlined" startIcon={<AutoFixHighIcon sx={{ fontSize: 16 }} />}
          disabled={applyAll.isPending || !aliases.length}
          onClick={() => applyAll.mutate(true)}>
          اعمال همه روی داده‌ها
        </Button>
        <Button size="small" variant="contained" startIcon={<AddLinkIcon sx={{ fontSize: 16 }} />}
          onClick={() => openCreate('')}
          sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#0284c7' } }}>
          افزودن نگاشت
        </Button>
      </Stack>

      {loading ? (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <CircularProgress size={22} sx={{ color: ACCENT }} />
        </Box>
      ) : (
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1} alignItems="flex-start">
          <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
            <ModuleTable
              tableTheme={theme.tableTheme}
              ariaLabel="نگاشت نام‌های مکاتبات"
              containerRef={tableRef}
              tableHeight={tableHeight}
              rowHeight={rowHeight}
              rows={visibleGroups}
              rowKey={(row) => row.key}
              emptyText="هنوز نگاشتی ثبت نشده است؛ از فهرست «نام‌های بدون نگاشت» انتخاب کنید."
              columns={columns}
            />
          </Box>
          <Paper elevation={0} sx={{
            width: { xs: '100%', lg: 340 }, flexShrink: 0, p: 1.25, borderRadius: 2,
            border: '1px solid', borderColor: theme.cardBorderColor,
          }}>
            <Typography sx={{ fontSize: 12, fontWeight: 800, mb: 0.5 }}>
              نام‌های بدون نگاشت (از داده‌های موجود)
            </Typography>
            <Typography sx={{ fontSize: 9.5, color: 'text.secondary', mb: 0.75 }}>
              نام، تعداد تکرار و پیشنهادهای سامانه؛ با کلیک روی پیشنهاد، نگاشت ساخته می‌شود.
            </Typography>
            <Divider sx={{ mb: 0.75 }} />
            <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
              {visibleUnmapped.length === 0 ? (
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                  همهٔ نام‌ها نگاشت شده‌اند.
                </Typography>
              ) : visibleUnmapped.map((row) => (
                <Box key={row.normalized} sx={{
                  py: 0.6, borderBottom: '1px dashed', borderColor: 'divider',
                }}>
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 800, flex: 1 }}>
                      {row.raw_name}
                    </Typography>
                    <Chip size="small" label={toPersianDigits(row.count)} sx={chipSx(SLATE)} />
                    <Tooltip title="تعیین نگاشت">
                      <IconButton size="small" aria-label="تعیین نگاشت"
                        onClick={() => openCreate(row.raw_name)}>
                        <AddLinkIcon sx={{ fontSize: 15, color: ACCENT }} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                  <Stack direction="row" spacing={0.4} flexWrap="wrap" useFlexGap sx={{ mt: 0.3 }}>
                    {(row.suggestions || []).slice(0, 3).map((item) => (
                      <Chip
                        key={`${item.kind}-${item.id}`}
                        size="small"
                        variant="outlined"
                        label={`${item.label} (${Math.round((item.score || 0) * 100)}٪)`}
                        onClick={() => {
                          setDialog({
                            ...EMPTY_FORM,
                            open: true,
                            raw_name: row.raw_name,
                            target_kind: item.kind,
                            employee: item.kind === 'employee'
                              ? personValue(item.id, item.label) : null,
                            party: item.kind === 'party'
                              ? partyValue(item.id, item.label) : null,
                          });
                          setError('');
                        }}
                        sx={{ fontSize: 9.5, height: 20 }}
                      />
                    ))}
                    {(row.suggestions || []).length === 0 ? (
                      <Typography sx={{ fontSize: 9.5, color: 'text.secondary' }}>
                        پیشنهادی پیدا نشد؛ دستی انتخاب کنید.
                      </Typography>
                    ) : null}
                  </Stack>
                </Box>
              ))}
            </Box>
          </Paper>
        </Stack>
      )}

      <Dialog open={dialog.open} onClose={() => setDialog({ ...EMPTY_FORM, open: false })}
        maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 14, fontWeight: 800 }}>
          {dialog.id ? 'ویرایش نگاشت نام' : 'نگاشت نام جدید'}
        </DialogTitle>
        <DialogContent dividers>
          {error ? (
            <Alert severity="error" sx={{ mb: 1, fontSize: 11.5 }} onClose={() => setError('')}>
              {error}
            </Alert>
          ) : null}
          <Stack spacing={1.1}>
            <TextField size="small" label="نام واردشده (خام)" value={dialog.raw_name}
              onChange={(event) => setDialog((prev) => ({ ...prev, raw_name: event.target.value }))}
              helperText="مثلاً: خ.حسینی — القاب و نویسه‌های متفاوت ي/ك خودکار نرمال می‌شوند." />
            <TextField select size="small" label="دامنهٔ کاربرد" value={dialog.scope}
              onChange={(event) => setDialog((prev) => ({ ...prev, scope: event.target.value }))}
              helperText="در کدام فیلدهای نامه این نگاشت اعمال شود.">
              {SCOPES.map((item) => (
                <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>
              ))}
            </TextField>
            <TextField select size="small" label="مقصد نگاشت" value={dialog.target_kind}
              onChange={(event) => setDialog((prev) => ({ ...prev, target_kind: event.target.value }))}>
              {TARGET_KINDS.map((item) => (
                <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>
              ))}
            </TextField>
            {dialog.target_kind === 'employee' ? (
              <PersonnelPicker
                value={dialog.employee}
                onChange={(option) => setDialog((prev) => ({ ...prev, employee: option }))}
                label="پرسنل مقصد"
                helperText="از پرسنل فعال منابع انسانی انتخاب کنید."
              />
            ) : null}
            {dialog.target_kind === 'party' ? (
              <PartyPicker
                value={dialog.party}
                allowCreate={false}
                onChange={(option) => setDialog((prev) => ({ ...prev, party: option }))}
                label="طرف حساب مقصد"
                helperText="از طرف‌های حساب مدیریت قراردادها انتخاب کنید."
              />
            ) : null}
            {dialog.target_kind === 'correspondent' ? (
              <TextField select size="small" label="مخاطب مقصد" value={dialog.correspondent || ''}
                onChange={(event) => setDialog((prev) => ({
                  ...prev, correspondent: event.target.value,
                }))}>
                <MenuItem value="">—</MenuItem>
                {contacts.map((row) => (
                  <MenuItem key={row.id} value={row.id}>{row.name}</MenuItem>
                ))}
              </TextField>
            ) : null}
            <TextField size="small" label="یادداشت" value={dialog.note || ''} multiline minRows={2}
              onChange={(event) => setDialog((prev) => ({ ...prev, note: event.target.value }))} />
            <FormControlLabel
              control={(
                <Switch size="small" checked={dialog.apply_now}
                  onChange={(event) => setDialog((prev) => ({
                    ...prev, apply_now: event.target.checked,
                  }))} />
              )}
              label={<Typography sx={{ fontSize: 11.5 }}>
                بعد از ذخیره روی داده‌های موجود اعمال شود
              </Typography>}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.25 }}>
          <Button size="small" onClick={() => setDialog({ ...EMPTY_FORM, open: false })}>انصراف</Button>
          <Button size="small" variant="contained" disabled={save.isPending}
            onClick={() => save.mutate()}
            sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#0284c7' } }}>
            {save.isPending ? 'در حال ذخیره…' : 'ذخیره'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(preview)} onClose={() => setPreview(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 14, fontWeight: 800 }}>پیش‌نمایش اعمال نگاشت‌ها</DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ fontSize: 12 }}>
            {`${formatPersianNumber(preview?.aliases || 0)} نگاشت بررسی می‌شود؛ `
              + `${formatPersianNumber(preview?.total || 0)} ردیف اصلاح و متصل می‌شود `
              + `(${formatPersianNumber(preview?.referrals || 0)} ارجاع و `
              + `${formatPersianNumber(preview?.letters || 0)} نامه).`}
          </Typography>
          <Alert severity="info" sx={{ mt: 1, fontSize: 11 }}>
            این عملیات فقط ردیف‌های هم‌نامِ بدون اتصال را اصلاح می‌کند و مقادیر دستی دیگر را تغییر نمی‌دهد.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.25 }}>
          <Button size="small" onClick={() => setPreview(null)}>انصراف</Button>
          <Button size="small" variant="contained" disabled={applyAll.isPending}
            onClick={() => applyAll.mutate(false)}
            sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#0284c7' } }}>
            {applyAll.isPending ? 'در حال اعمال…' : 'اعمال کن'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CorrespondenceNameMappingTab;

