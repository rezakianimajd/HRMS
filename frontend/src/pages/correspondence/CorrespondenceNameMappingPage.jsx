import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Box, Button, Chip, CircularProgress, IconButton, InputAdornment,
  ListSubheader, MenuItem, Paper, Stack, TextField, ToggleButton,
  ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material';
import AddLinkIcon from '@mui/icons-material/AddLink';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import SyncAltIcon from '@mui/icons-material/SyncAlt';
import TuneIcon from '@mui/icons-material/Tune';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import axiosInstance from '../../core/api/axiosConfig';
import { formatPersianNumber, toPersianDigits } from '../../core/utils/numberUtils';
import PageHeader from '../../core/components/ui/PageHeader';
import { ModuleTable, useModuleTheme, useRowHeight } from '../contracts/contractModuleUi';
import {
  ACCENT, DANGER, INCOMING, INTERNAL, OK, SLATE, SOON, WARN, chipSx, dateTimeLabel,
} from './correspondenceUi';
import { StudioKpi, MUTED } from './correspondenceStudioUi';
import {
  EMPTY_MAPPING_FORM, MappingApplyPreviewDialog, NameMappingFormDialog,
  emptyMappingTarget, mappingFormFromTarget, mappingTargetPayload,
} from './CorrespondenceNameMappingDialog';

const API = '/correspondence-name-aliases/';
const GROUPS_LIMIT = 200;

const PURPOSE_COLOR = {
  referral: WARN,
  referral_target: SOON,
  sender: INCOMING,
  receiver: ACCENT,
  counterparty: INTERNAL,
  delivery: SLATE,
  contact: OK,
  organization: INTERNAL,
  subject: DANGER,
  any: SLATE,
};

const KIND_COLOR = {
  employee: INCOMING,
  party: INTERNAL,
  correspondent: OK,
  organization: ACCENT,
  category: DANGER,
};

const asList = (payload) => (Array.isArray(payload) ? payload : payload?.results || []);

const useDebounced = (value, delay = 320) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
};

const CorrespondenceNameMappingPage = () => {
  const moduleTheme = useModuleTheme();
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [scope, setScope] = useState(searchParams.get('scope') || '');
  const [targetKind, setTargetKind] = useState('');
  const [mode, setMode] = useState('');
  const [multiOnly, setMultiOnly] = useState(false);
  const [unmappedOpen, setUnmappedOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_MAPPING_FORM);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [preview, setPreview] = useState(null);
  const debouncedSearch = useDebounced(search);

  useEffect(() => {
    const requested = searchParams.get('q');
    if (requested !== null) setSearch(requested);
    const requestedScope = searchParams.get('scope');
    if (requestedScope) setScope(requestedScope);
  }, [searchParams]);

  const metaQuery = useQuery({
    queryKey: ['correspondence-alias-meta'],
    queryFn: () => axiosInstance.get(`${API}meta/`).then((response) => response.data),
    staleTime: 60_000,
  });

  const groupsQuery = useQuery({
    queryKey: ['correspondence-alias-groups', debouncedSearch, scope, targetKind, mode, multiOnly],
    queryFn: () => axiosInstance.get(`${API}groups/`, {
      params: {
        search: debouncedSearch,
        scope,
        target_kind: targetKind,
        mode,
        multi: multiOnly ? 1 : '',
        limit: GROUPS_LIMIT,
      },
    }).then((response) => response.data),
    placeholderData: (previous) => previous,
    staleTime: 30_000,
  });

  const unmappedQuery = useQuery({
    queryKey: ['correspondence-alias-unmapped'],
    queryFn: () => axiosInstance.get(`${API}unmapped/`, { params: { limit: 60 } })
      .then((response) => response.data),
    enabled: unmappedOpen,
    staleTime: 60_000,
  });

  const dialogOpen = form.open;
  const metaData = metaQuery.data;
  const purposes = useMemo(() => metaData?.purposes || [], [metaData]);
  const purposeGroups = useMemo(
    () => metaData?.purpose_groups || [],
    [metaData],
  );
  const purposesByKey = useMemo(
    () => Object.fromEntries(purposes.map((item) => [item.key, item])),
    [purposes],
  );
  const selectedPurpose = purposesByKey[form.scope];
  const allowedKinds = selectedPurpose?.target_kinds || ['employee'];
  const supportsDual = Boolean(metaData?.paired_scopes?.[form.scope]);

  const contactsQuery = useQuery({
    queryKey: ['correspondence-contacts'],
    queryFn: () => axiosInstance.get('/correspondents/', { params: { page_size: 300 } })
      .then((response) => response.data),
    enabled: dialogOpen,
  });
  const organizationsQuery = useQuery({
    queryKey: ['correspondence-organizations'],
    queryFn: () => axiosInstance.get('/organizations/', { params: { page_size: 300 } })
      .then((response) => response.data),
    enabled: dialogOpen,
  });
  const categoriesQuery = useQuery({
    queryKey: ['correspondence-categories'],
    queryFn: () => axiosInstance.get('/letter-categories/', { params: { page_size: 200 } })
      .then((response) => response.data),
    enabled: dialogOpen,
  });

  const summary = metaQuery.data?.summary || {};
  const groups = asList(groupsQuery.data);
  const unmapped = asList(unmappedQuery.data);
  const contacts = asList(contactsQuery.data);
  const organizations = asList(organizationsQuery.data);
  const categories = asList(categoriesQuery.data);

  const { ref: tableRef, rowHeight, tableHeight } = useRowHeight(
    moduleTheme.tableTheme, Math.max(1, groups.length),
  );

  const refresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['correspondence-alias-groups'] });
    qc.invalidateQueries({ queryKey: ['correspondence-alias-meta'] });
    qc.invalidateQueries({ queryKey: ['correspondence-alias-unmapped'] });
  }, [qc]);


  const openCreate = useCallback((rawName = '', nextScope = '', kind = '') => {
    const purpose = purposesByKey[nextScope || 'referral'];
    const kinds = purpose?.target_kinds || ['employee'];
    const firstKind = kind || kinds[0];
    setForm({
      ...EMPTY_MAPPING_FORM,
      open: true,
      raw_name: rawName,
      scope: nextScope || 'referral',
      targets: [emptyMappingTarget(firstKind)],
    });
    setError('');
  }, [purposesByKey]);

  const openAddTarget = useCallback((row) => {
    const usedKinds = row.target_kinds || [];
    const purpose = purposesByKey[row.scope];
    const kinds = purpose?.target_kinds || ['employee'];
    const nextKind = kinds.find((item) => !usedKinds.includes(item)) || kinds[0];
    setForm({
      ...EMPTY_MAPPING_FORM,
      open: true,
      mode: 'add-target',
      raw_name: row.raw_name,
      scope: row.scope,
      bidirectional: Boolean(row.bidirectional),
      targets: [emptyMappingTarget(nextKind)],
    });
    setError('');
  }, [purposesByKey]);

  const save = useMutation({
    mutationFn: async () => {
      const rawName = (form.raw_name || '').trim();
      if (!rawName) throw new Error('نام واردشده را بنویسید.');
      const targets = form.targets.filter((item) => item.value?.id);
      if (!targets.length) throw new Error('حداقل یک مقصد انتخاب کنید.');
      const base = {
        raw_name: rawName,
        scope: form.scope,
        bidirectional: supportsDual ? form.bidirectional : false,
        note: form.note || '',
      };
      if (form.mode === 'edit') {
        const response = await axiosInstance.patch(`${API}${form.id}/`, {
          ...base, ...mappingTargetPayload(targets[0]),
        });
        if (form.apply_now) await axiosInstance.post(`${API}${form.id}/apply/`, {});
        return response.data;
      }
      const created = [];
      for (let index = 0; index < targets.length; index += 1) {
        // eslint-disable-next-line no-await-in-loop
        const response = await axiosInstance.post(API, {
          ...base, order: index, ...mappingTargetPayload(targets[index]),
        });
        created.push(response.data);
      }
      if (form.apply_now) {
        for (const row of created) {
          // eslint-disable-next-line no-await-in-loop
          await axiosInstance.post(`${API}${row.id}/apply/`, {});
        }
      }
      return created[0];
    },
    onSuccess: (data) => {
      refresh();
      setForm(EMPTY_MAPPING_FORM);
      setError('');
      setToast(`نگاشت «${data.raw_name}» ذخیره شد.`);
    },
    onError: (err) => {
      const detail = err?.response?.data;
      setError(typeof detail === 'string' ? detail
        : (detail && Object.values(detail).flat().join(' '))
        || err?.message || 'ذخیرهٔ نگاشت انجام نشد.');
    },
  });

  const remove = useMutation({
    mutationFn: (id) => axiosInstance.delete(`${API}${id}/`),
    onSuccess: () => { refresh(); setToast('مقصد نگاشت حذف شد.'); },
  });

  const applyGroup = useMutation({
    mutationFn: async (row) => {
      let total = 0;
      for (const item of row.targets) {
        // eslint-disable-next-line no-await-in-loop
        const response = await axiosInstance.post(`${API}${item.id}/apply/`, {});
        total += response.data.total || 0;
      }
      return total;
    },
    onSuccess: (total) => {
      refresh();
      setToast(`${formatPersianNumber(total)} ردیف اصلاح و متصل شد.`);
    },
  });

  const applyAll = useMutation({
    mutationFn: (dryRun) => axiosInstance.post(`${API}apply-all/`, { dry_run: dryRun }),
    onSuccess: (response, dryRun) => {
      if (dryRun) {
        setPreview(response.data);
        return;
      }
      setPreview(null);
      refresh();
      setToast(`${formatPersianNumber(response.data.total || 0)} ردیف اصلاح شد.`);
    },
  });


  const openEditRow = useCallback((row, target) => {
    setForm(mappingFormFromTarget(row, target));
    setError('');
  }, []);

  const columns = useMemo(() => ([
    {
      key: 'raw',
      label: 'نام واردشده',
      width: '19%',
      render: (row) => (
        <Box sx={{ minWidth: 0 }}>
          <Typography noWrap title={row.raw_name} sx={{ fontSize: 11.5, fontWeight: 800 }}>
            {row.raw_name}
          </Typography>
          <Typography noWrap sx={{ fontSize: 9.5, color: MUTED }}>
            {row.normalized && row.normalized !== row.raw_name
              ? `کلید نگاشت: ${row.normalized}`
              : (row.target_count > 1 ? 'نگاشت چند مقصده' : 'نگاشت یک مقصده')}
          </Typography>
        </Box>
      ),
    },
    {
      key: 'purpose',
      label: 'کاربرد',
      width: '17%',
      render: (row) => (
        <Stack spacing={0.3} alignItems="flex-start">
          <Chip size="small" label={row.scope_label}
            sx={chipSx(PURPOSE_COLOR[row.scope] || ACCENT)} />
          {row.bidirectional ? (
            <Chip size="small" icon={<SyncAltIcon sx={{ fontSize: 11 }} />}
              label="دو مسیره" sx={chipSx(INTERNAL)} />
          ) : null}
        </Stack>
      ),
    },
    {
      key: 'targets',
      label: 'مقصدها',
      width: '29%',
      render: (row) => (
        <Box sx={{ minWidth: 0 }}>
          <Typography noWrap title={row.targets_label}
            sx={{ fontSize: 11.5, fontWeight: 800, lineHeight: 1.6 }}>
            {row.targets_label}
          </Typography>
          <Stack direction="row" spacing={0.3} useFlexGap flexWrap="wrap" sx={{ mt: 0.15 }}>
            {row.targets.map((item) => (
              <Chip
                key={item.id}
                size="small"
                label={item.target_kind_display}
                onClick={() => openEditRow(row, item)}
                sx={{ ...chipSx(KIND_COLOR[item.target_kind] || SLATE), cursor: 'pointer' }}
              />
            ))}
          </Stack>
        </Box>
      ),
    },
    {
      key: 'count',
      label: 'تعداد مقصد',
      width: '9%',
      align: 'center',
      render: (row) => (
        <Chip size="small" label={`${toPersianDigits(row.target_count)} مقصد`}
          sx={chipSx(row.target_count > 1 ? INTERNAL : SLATE)} />
      ),
    },
    {
      key: 'applied',
      label: 'اصلاح‌شده',
      width: '9%',
      align: 'center',
      render: (row) => (
        <Chip size="small" label={toPersianDigits(row.applied_count || 0)}
          sx={chipSx(row.applied_count ? OK : SLATE)} />
      ),
    },
    {
      key: 'last',
      label: 'آخرین اعمال',
      width: '10%',
      render: (row) => (
        <Typography sx={{ fontSize: 10.5, color: MUTED }}>
          {row.last_applied_at ? dateTimeLabel(row.last_applied_at) : '—'}
        </Typography>
      ),
    },
    {
      key: 'actions',
      label: 'عملیات',
      width: '12%',
      align: 'center',
      render: (row) => (
        <Stack direction="row" spacing={0.2} justifyContent="center">
          <Tooltip title="افزودن مقصد دیگر (نگاشت چند مقصده)">
            <IconButton size="small" aria-label="افزودن مقصد" onClick={() => openAddTarget(row)}>
              <AddLinkIcon sx={{ fontSize: 15, color: INTERNAL }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="ویرایش نگاشت">
            <IconButton size="small" aria-label="ویرایش نگاشت"
              onClick={() => openEditRow(row, row.targets[0])}>
              <EditOutlinedIcon sx={{ fontSize: 15, color: SLATE }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="اعمال روی داده‌های موجود">
            <span>
              <IconButton size="small" aria-label="اعمال نگاشت"
                disabled={applyGroup.isPending} onClick={() => applyGroup.mutate(row)}>
                <PlayCircleOutlineIcon sx={{ fontSize: 15, color: INCOMING }} />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="حذف این نگاشت">
            <IconButton size="small" aria-label="حذف نگاشت"
              onClick={() => row.targets.forEach((item) => remove.mutate(item.id))}>
              <DeleteOutlineIcon sx={{ fontSize: 15, color: DANGER }} />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ]), [applyGroup, openAddTarget, openEditRow, remove]);


  const totalGroups = groupsQuery.data?.count ?? groups.length;
  const loading = metaQuery.isLoading || (groupsQuery.isLoading && !groups.length);
  const activeFilterCount = [scope, targetKind, mode, multiOnly ? 'multi' : '']
    .filter(Boolean).length + (search.trim() ? 1 : 0);

  const resetFilters = () => {
    setSearch('');
    setScope('');
    setTargetKind('');
    setMode('');
    setMultiOnly(false);
  };

  const purposeOptions = purposeGroups.length
    ? purposeGroups.map((group) => ({
      group: group.title,
      items: group.keys.map((key) => purposesByKey[key]).filter(Boolean),
    })).filter((group) => group.items.length)
    : [{ group: 'کاربردها', items: purposes }];

  const startFromSuggestion = (row, suggestion) => {
    const scopeKey = (row.scopes || [])[0] || 'any';
    setForm({
      ...EMPTY_MAPPING_FORM,
      open: true,
      raw_name: row.raw_name,
      scope: scopeKey,
      targets: [{
        ...emptyMappingTarget(suggestion.kind),
        value: {
          id: suggestion.id,
          name: suggestion.label,
          label: suggestion.label,
          full_name: suggestion.label,
        },
      }],
    });
    setError('');
  };

  return (
    <Box>
      <PageHeader
        icon={<SyncAltIcon />}
        title="نگاشت نام‌ها"
        subtitle="قواعد تخصصی تطبیق نام‌های خام مکاتبات با پرسنل، طرف حساب، مخاطبین، سازمان و نوع مکاتبه"
        badge={(
          <Chip
            size="small"
            label={`${formatPersianNumber(summary.names || 0)} نام نگاشت‌شده`}
            sx={chipSx(ACCENT)}
          />
        )}
        actions={(
          <>
            <Tooltip title="بازخوانی فهرست‌ها">
              <IconButton size="small" aria-label="بازخوانی نگاشت‌ها" onClick={refresh}>
                <RefreshIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Button size="small" variant="outlined"
              startIcon={<WarningAmberIcon sx={{ fontSize: 16 }} />}
              onClick={() => setUnmappedOpen((previous) => !previous)}>
              نام‌های بدون نگاشت
            </Button>
            <Button size="small" variant="outlined"
              startIcon={<AutoFixHighIcon sx={{ fontSize: 16 }} />}
              disabled={applyAll.isPending || !summary.aliases}
              onClick={() => applyAll.mutate(true)}>
              اعمال همه روی داده‌ها
            </Button>
            <Button size="small" variant="contained"
              startIcon={<AddLinkIcon sx={{ fontSize: 16 }} />}
              onClick={() => openCreate('')}>
              افزودن نگاشت
            </Button>
          </>
        )}
      />

      {error && !form.open ? (
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

      <Box sx={{
        display: 'grid',
        gap: 1,
        mb: 1.25,
        gridTemplateColumns: {
          xs: 'repeat(2, minmax(0, 1fr))',
          md: 'repeat(5, minmax(0, 1fr))',
        },
      }}>
        <StudioKpi
          icon={SyncAltIcon}
          label="نگاشت‌های فعال"
          value={formatPersianNumber(summary.aliases || 0)}
          hint={`${formatPersianNumber(summary.names || 0)} نام یکتا`}
          color={ACCENT}
        />
        <StudioKpi
          icon={AddLinkIcon}
          label="مقصدهای نگاشت‌شده"
          value={formatPersianNumber(summary.aliases || 0)}
          hint={`${formatPersianNumber(summary.by_kind?.employee || 0)} پرسنل · `
            + `${formatPersianNumber(summary.by_kind?.party || 0)} طرف حساب`}
          color={INCOMING}
        />
        <StudioKpi
          icon={TuneIcon}
          label="نگاشت چند مقصده"
          value={formatPersianNumber(summary.multi || 0)}
          hint={`${formatPersianNumber(summary.bidirectional || 0)} نگاشت دو مسیره`}
          color={INTERNAL}
          onClick={() => { setMultiOnly(true); setMode(''); }}
        />
        <StudioKpi
          icon={PlayCircleOutlineIcon}
          label="ردیف‌های اصلاح‌شده"
          value={formatPersianNumber(summary.applied || 0)}
          hint="اتصال خودکار نامه‌ها و ارجاعات"
          color={OK}
        />
        <StudioKpi
          icon={WarningAmberIcon}
          label="نام‌های بدون نگاشت"
          value={summary.unmapped
            ? formatPersianNumber(summary.unmapped)
            : (unmappedQuery.data ? formatPersianNumber(unmapped.length) : '—')}
          hint="بررسی و نگاشت سریع"
          color={WARN}
          onClick={() => setUnmappedOpen(true)}
        />
      </Box>


      <Paper elevation={0} sx={{
        borderRadius: 'var(--hrms-table-radius, 16px)',
        border: '1px solid',
        borderColor: moduleTheme.cardBorderColor,
        bgcolor: 'background.paper',
        boxShadow: 'none',
        px: `${moduleTheme.cardPadX}px`,
        py: `${moduleTheme.cardPadY}px`,
        mb: 1.25,
      }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1}
          alignItems={{ xs: 'stretch', md: 'center' }}
          useFlexGap
          flexWrap="wrap"
        >
          <TextField
            size="small"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="جست‌وجو در نام، مقصد یا یادداشت…"
            inputProps={{ 'aria-label': 'جست‌وجوی نگاشت نام‌ها' }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 16 }} />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: { xs: '100%', md: 250 } }}
          />
          <TextField
            select
            size="small"
            label="کاربرد نگاشت"
            value={scope}
            onChange={(event) => setScope(event.target.value)}
            sx={{ minWidth: { xs: '100%', md: 210 } }}
          >
            <MenuItem value="">همهٔ کاربردها</MenuItem>
            {purposeOptions.map((group) => [
              <ListSubheader key={group.group} sx={{ fontSize: 10.5, fontWeight: 800 }}>
                {group.group}
              </ListSubheader>,
              ...group.items.map((item) => (
                <MenuItem key={item.key} value={item.key} sx={{ fontSize: 12 }}>
                  {item.label}
                  {item.count ? ` (${toPersianDigits(item.count)})` : ''}
                </MenuItem>
              )),
            ])}
          </TextField>
          <TextField
            select
            size="small"
            label="نوع مقصد"
            value={targetKind}
            onChange={(event) => setTargetKind(event.target.value)}
            sx={{ minWidth: { xs: '100%', md: 180 } }}
          >
            <MenuItem value="">همهٔ مقصدها</MenuItem>
            {(metaQuery.data?.target_kinds || []).map((item) => (
              <MenuItem key={item.key} value={item.key} sx={{ fontSize: 12 }}>
                {item.label}
              </MenuItem>
            ))}
          </TextField>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={mode}
            onChange={(_event, value) => setMode(value || '')}
            sx={{ '& .MuiToggleButton-root': { fontSize: 11, px: 1.2, py: 0.4 } }}
          >
            <ToggleButton value="">همه</ToggleButton>
            <ToggleButton value="single">یک‌مسیره</ToggleButton>
            <ToggleButton value="dual">دو مسیره</ToggleButton>
          </ToggleButtonGroup>
          <ToggleButton
            size="small"
            value="multi"
            selected={multiOnly}
            onChange={() => setMultiOnly((previous) => !previous)}
            sx={{ fontSize: 11, px: 1.2, py: 0.4, borderRadius: '8px !important' }}
          >
            فقط چند مقصده
          </ToggleButton>
          <Box sx={{ flex: 1 }} />
          {activeFilterCount ? (
            <Button size="small" onClick={resetFilters}
              sx={{ fontSize: 11, color: MUTED }}>
              {`پاک‌کردن ${toPersianDigits(activeFilterCount)} فیلتر`}
            </Button>
          ) : null}
        </Stack>
      </Paper>

      <Paper elevation={0} sx={{
        borderRadius: 'var(--hrms-table-radius, 16px)',
        overflow: 'hidden',
        border: '1px solid',
        borderColor: moduleTheme.cardBorderColor,
        bgcolor: 'background.paper',
        boxShadow: 'none',
        px: `${moduleTheme.cardPadX}px`,
        py: `${moduleTheme.cardPadY}px`,
      }}>
        <Stack direction="row" alignItems="center" spacing={0.75} useFlexGap flexWrap="wrap"
          sx={{ mb: 0.75 }}>
          <Typography sx={{ fontSize: 11.5, fontWeight: 800 }}>
            {`${formatPersianNumber(totalGroups)} نگاشت`}
          </Typography>
          <Typography sx={{ fontSize: 10.5, color: MUTED }}>
            مقصدهای چندگانه با خط تیره نمایش داده می‌شوند (نمونه: ارجاع به دو نفر).
          </Typography>
          <Box sx={{ flex: 1 }} />
          {groupsQuery.isFetching ? (
            <CircularProgress size={14} sx={{ color: ACCENT }} />
          ) : null}
        </Stack>

        {loading ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <CircularProgress size={22} sx={{ color: ACCENT }} />
          </Box>
        ) : (
          <ModuleTable
            tableTheme={moduleTheme.tableTheme}
            ariaLabel="نگاشت نام‌های مکاتبات"
            containerRef={tableRef}
            tableHeight={tableHeight}
            rowHeight={rowHeight}
            rows={groups}
            rowKey={(row) => row.key}
            emptyText="نگاشتی با این فیلترها پیدا نشد؛ از «افزودن نگاشت» یا فهرست نام‌های بدون نگاشت شروع کنید."
            columns={columns}
          />
        )}
      </Paper>


      {unmappedOpen ? (
        <Paper elevation={0} sx={{
          mt: 1.25,
          p: 1.25,
          borderRadius: 'var(--hrms-table-radius, 16px)',
          border: '1px solid',
          borderColor: moduleTheme.cardBorderColor,
          bgcolor: 'background.paper',
          boxShadow: 'none',
        }}>
          <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.5 }}>
            <WarningAmberIcon sx={{ fontSize: 17, color: WARN }} />
            <Typography sx={{ fontSize: 12, fontWeight: 800 }}>
              نام‌های بدون نگاشت (از داده‌های موجود)
            </Typography>
            <Box sx={{ flex: 1 }} />
            <Button size="small" onClick={() => setUnmappedOpen(false)} sx={{ fontSize: 11 }}>
              بستن
            </Button>
          </Stack>
          <Typography sx={{ fontSize: 10.5, color: MUTED, mb: 0.75 }}>
            نام، تعداد تکرار و پیشنهادهای سامانه؛ با کلیک روی پیشنهاد، فرم نگاشت
            با کاربرد مناسب باز می‌شود.
          </Typography>
          {unmappedQuery.isLoading ? (
            <CircularProgress size={18} sx={{ color: ACCENT }} />
          ) : null}
          <Box sx={{
            display: 'grid',
            gap: 0.75,
            gridTemplateColumns: {
              xs: '1fr',
              md: 'repeat(2, minmax(0, 1fr))',
              lg: 'repeat(3, minmax(0, 1fr))',
            },
          }}>
            {unmapped.map((row) => (
              <Box key={row.normalized} sx={{
                p: 0.8,
                borderRadius: '12px',
                border: '1px solid',
                borderColor: 'divider',
                minWidth: 0,
              }}>
                <Stack direction="row" spacing={0.5} alignItems="center" useFlexGap
                  flexWrap="wrap">
                  <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 800, flex: 1 }}>
                    {row.raw_name}
                  </Typography>
                  <Chip size="small" label={`${toPersianDigits(row.count)} مورد`}
                    sx={chipSx(SLATE)} />
                </Stack>
                <Stack direction="row" spacing={0.3} useFlexGap flexWrap="wrap"
                  sx={{ mt: 0.3 }}>
                  {(row.scopes || []).map((item) => (
                    <Chip key={item} size="small"
                      label={purposesByKey[item]?.label || item}
                      sx={chipSx(PURPOSE_COLOR[item] || ACCENT)} />
                  ))}
                </Stack>
                <Stack direction="row" spacing={0.3} useFlexGap flexWrap="wrap"
                  sx={{ mt: 0.4 }}>
                  {(row.suggestions || []).map((item) => (
                    <Chip
                      key={`${item.kind}-${item.id}`}
                      size="small"
                      variant="outlined"
                      label={item.label}
                      onClick={() => startFromSuggestion(row, item)}
                      sx={{ fontSize: 9.5, height: 21 }}
                    />
                  ))}
                  {(row.suggestions || []).length === 0 ? (
                    <Typography sx={{ fontSize: 9.5, color: MUTED }}>
                      پیشنهادی نیست؛ دستی انتخاب کنید.
                    </Typography>
                  ) : null}
                </Stack>
              </Box>
            ))}
            {!unmappedQuery.isLoading && unmapped.length === 0 ? (
              <Typography sx={{ fontSize: 11, color: MUTED }}>
                همهٔ نام‌های داده‌ها نگاشت شده‌اند.
              </Typography>
            ) : null}
          </Box>
        </Paper>
      ) : null}

      <NameMappingFormDialog
        form={form}
        setForm={setForm}
        onClose={() => setForm(EMPTY_MAPPING_FORM)}
        onSave={() => save.mutate()}
        saving={save.isPending}
        error={form.open ? error : ''}
        onClearError={() => setError('')}
        purposeOptions={purposeOptions}
        selectedPurpose={purposesByKey[form.scope]}
        allowedKinds={allowedKinds}
        supportsDual={supportsDual}
        targetKinds={metaQuery.data?.target_kinds || []}
        contacts={contacts}
        organizations={organizations}
        categories={categories}
      />

      <MappingApplyPreviewDialog
        preview={preview}
        onClose={() => setPreview(null)}
        onConfirm={() => applyAll.mutate(false)}
        pending={applyAll.isPending}
      />
    </Box>
  );
};

export default CorrespondenceNameMappingPage;

