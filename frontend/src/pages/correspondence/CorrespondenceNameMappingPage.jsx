import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Box, Button, Chip, CircularProgress, IconButton, InputAdornment, LinearProgress,
  Paper, Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import AddLinkIcon from '@mui/icons-material/AddLink';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import SyncAltIcon from '@mui/icons-material/SyncAlt';
import TuneIcon from '@mui/icons-material/Tune';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import axiosInstance from '../../core/api/axiosConfig';
import useAuth from '../../core/hooks/useAuth';
import { mappingCan } from '../../core/utils/correspondencePermissions';
import { formatPersianNumber, toPersianDigits } from '../../core/utils/numberUtils';
import PageHeader from '../../core/components/ui/PageHeader';
import { ModuleTable, useModuleTheme, useRowHeight } from '../contracts/contractModuleUi';
import {
  ACCENT, DANGER, INCOMING, INTERNAL, OK, SLATE, SOON, WARN, chipSx,
} from './correspondenceUi';
import { StudioKpi, MUTED } from './correspondenceStudioUi';
import {
  EMPTY_MAPPING_FORM, MappingApplyPreviewDialog, NameMappingFormDialog,
  emptyMappingTarget, mappingFormFromTarget, mappingTargetPayload,
} from './CorrespondenceNameMappingDialog';

const API = '/correspondence-name-aliases/';
const FETCH_LIMIT = 200;
const UNMAPPED_LIMIT = 60;

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

const panelSx = (theme) => ({
  borderRadius: 'var(--hrms-table-radius, 16px)',
  border: '1px solid',
  borderColor: theme.cardBorderColor,
  bgcolor: 'background.paper',
  boxShadow: 'none',
});


const CorrespondenceNameMappingPage = () => {
  const moduleTheme = useModuleTheme();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [scope, setScope] = useState(searchParams.get('scope') || '');
  const [onlyUnmapped, setOnlyUnmapped] = useState(false);
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [form, setForm] = useState(EMPTY_MAPPING_FORM);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [preview, setPreview] = useState(null);
  const debouncedSearch = useDebounced(search);

  /* مجوزهای ریز: اعمال/ثبت نگاشت نیاز به «ویرایش» دارد */
  const canEditMapping = mappingCan(user, 'edit');
  const runIfEditable = (fn) => (...args) => {
    if (!canEditMapping) {
      setError('برای ثبت یا اعمال نگاشت، مجوز «ویرایش نگاشت نام‌ها» لازم است.');
      return undefined;
    }
    return fn(...args);
  };

  const metaQuery = useQuery({
    queryKey: ['correspondence-alias-meta'],
    queryFn: () => axiosInstance.get(`${API}meta/`).then((response) => response.data),
    staleTime: 60_000,
  });

  const columnsQuery = useQuery({
    queryKey: ['correspondence-alias-columns'],
    queryFn: () => axiosInstance.get(`${API}columns/`).then((response) => response.data),
    staleTime: 30_000,
    placeholderData: (previous) => previous,
  });

  /** انواع مقصد مجاز همین ستون — محاسبهٔ پیشنهادها را روی همان استخرها محدود می‌کند. */
  const columnKinds = useMemo(() => {
    const current = asList(columnsQuery.data).find((item) => item.key === scope);
    return (current?.target_kinds || []).join(',');
  }, [columnsQuery.data, scope]);

  const groupsQuery = useQuery({
    queryKey: ['correspondence-alias-groups', scope, debouncedSearch],
    queryFn: () => axiosInstance.get(`${API}groups/`, {
      params: {
        scope,
        limit: FETCH_LIMIT,
        ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
      },
    }).then((response) => response.data),
    enabled: Boolean(scope),
    placeholderData: (previous) => previous,
    staleTime: 30_000,
  });

  const unmappedQuery = useQuery({
    queryKey: ['correspondence-alias-unmapped', scope, debouncedSearch, columnKinds],
    queryFn: () => axiosInstance.get(`${API}unmapped/`, {
      params: {
        scope,
        limit: UNMAPPED_LIMIT,
        ...(columnKinds ? { kinds: columnKinds } : {}),
        ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
      },
    }).then((response) => response.data),
    enabled: Boolean(scope),
    placeholderData: (previous) => previous,
    staleTime: 60_000,
  });

  const metaData = metaQuery.data;
  const purposes = useMemo(() => metaData?.purposes || [], [metaData]);
  const purposesByKey = useMemo(
    () => Object.fromEntries(purposes.map((item) => [item.key, item])),
    [purposes],
  );
  const kindLabels = useMemo(
    () => Object.fromEntries((metaData?.target_kinds || []).map((item) => [item.key, item.label])),
    [metaData],
  );
  const purposeGroups = useMemo(() => metaData?.purpose_groups || [], [metaData]);

  /** ستون‌های کاری: از اندپوینت columns؛ در نبود آن از کاربردهای متادیتا. */
  const columns = useMemo(() => {
    const fromApi = asList(columnsQuery.data);
    if (fromApi.length) return fromApi;
    return purposes
      .filter((item) => item.key !== 'any')
      .map((item) => ({
        key: item.key,
        label: item.label,
        group: item.group,
        description: item.description,
        target_kinds: item.target_kinds || [],
        paired: item.paired,
        names: 0,
        mapped: 0,
        unmapped: 0,
        rows: 0,
        aliases: item.count || 0,
      }));
  }, [columnsQuery.data, purposes]);

  const selectedColumn = useMemo(
    () => columns.find((item) => item.key === scope) || null,
    [columns, scope],
  );

  // انتخاب ستون پیش‌فرض: پرترین ستون بدون نگاشت
  useEffect(() => {
    if (scope || !columns.length) return;
    const worst = [...columns].sort((a, b) => (b.unmapped || 0) - (a.unmapped || 0))[0];
    setScope(worst?.key || 'counterparty');
  }, [columns, scope]);

  const selectedPurpose = purposesByKey[scope] || {};
  const allowedKinds = selectedPurpose?.target_kinds || selectedColumn?.target_kinds || ['employee'];
  const supportsDual = Boolean(metaData?.paired_scopes?.[scope]);

  const dialogOpen = form.open;
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
    queryKey: ['correspondence-letter-categories'],
    queryFn: () => axiosInstance.get('/letter-categories/', { params: { page_size: 200 } })
      .then((response) => response.data),
    enabled: dialogOpen,
  });

  const summary = metaData?.summary || {};
  const contacts = asList(contactsQuery.data);
  const organizations = asList(organizationsQuery.data);
  const categories = asList(categoriesQuery.data);

  /** ادغام «نگاشت‌شده‌ها» و «بدون نگاشت‌ها» در یک فهرست نام برای ستون فعال. */
  const rows = useMemo(() => {
    const query = debouncedSearch.trim();
    const map = new Map();
    asList(groupsQuery.data).forEach((group) => {
      map.set(group.normalized, {
        normalized: group.normalized,
        raw_name: group.raw_name,
        scope: group.scope,
        bidirectional: Boolean(group.bidirectional),
        count: 0,
        mapped: true,
        targets: group.targets || [],
        targets_label: group.targets_label || '',
        applied_count: group.applied_count || 0,
        suggestions: [],
      });
    });
    asList(unmappedQuery.data).forEach((row) => {
      if (query && !String(row.raw_name || '').includes(query)
        && !String(row.normalized || '').includes(query)) return;
      const existing = map.get(row.normalized);
      if (existing) {
        existing.count += row.count || 0;
        existing.suggestions = row.suggestions || [];
        if (!existing.raw_name) existing.raw_name = row.raw_name;
        return;
      }
      map.set(row.normalized, {
        normalized: row.normalized,
        raw_name: row.raw_name,
        scope,
        bidirectional: false,
        count: row.count || 0,
        mapped: false,
        targets: [],
        targets_label: '',
        applied_count: 0,
        suggestions: row.suggestions || [],
      });
    });
    const list = [...map.values()];
    if (onlyUnmapped) {
      return list.filter((row) => !row.mapped)
        .sort((a, b) => (b.count || 0) - (a.count || 0));
    }
    return list.sort((a, b) => (
      Number(a.mapped) - Number(b.mapped) || (b.count || 0) - (a.count || 0)
    ));
  }, [groupsQuery.data, unmappedQuery.data, onlyUnmapped, scope, debouncedSearch]);

  const { ref: tableRef, rowHeight, tableHeight } = useRowHeight(
    moduleTheme.tableTheme, Math.max(1, rows.length),
  );

  const refresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['correspondence-alias-columns'] });
    qc.invalidateQueries({ queryKey: ['correspondence-alias-meta'] });
    qc.invalidateQueries({ queryKey: ['correspondence-alias-groups'] });
    qc.invalidateQueries({ queryKey: ['correspondence-alias-unmapped'] });
  }, [qc]);

  const firstAllowedKind = useCallback((key) => {
    const purpose = purposesByKey[key];
    const kinds = purpose?.target_kinds || ['employee'];
    return kinds[0];
  }, [purposesByKey]);

  const openManual = useCallback((rawName = '', nextScope = '') => {
    const target = nextScope || scope || 'counterparty';
    setForm({
      ...EMPTY_MAPPING_FORM,
      open: true,
      raw_name: rawName,
      scope: target,
      targets: [emptyMappingTarget(firstAllowedKind(target))],
    });
    setError('');
  }, [firstAllowedKind, scope]);

  const openAddTarget = useCallback((row) => {
    const usedKinds = (row.targets || []).map((item) => item.target_kind);
    const kinds = purposesByKey[row.scope]?.target_kinds || ['employee'];
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

  const openEditRow = useCallback((row, target) => {
    setForm(mappingFormFromTarget(row, target));
    setError('');
  }, []);


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

  /** نگاشت سریع: پیشنهاد سامانه → ثبت نگاشت + اعمال همان لحظه. */
  const quickMap = useMutation({
    mutationFn: async ({ row, suggestion }) => {
      const created = await axiosInstance.post(API, {
        raw_name: row.raw_name,
        scope: row.scope || scope,
        order: 0,
        ...mappingTargetPayload({
          kind: suggestion.kind,
          value: { id: suggestion.id, name: suggestion.label },
        }),
      });
      const applied = await axiosInstance.post(`${API}${created.data.id}/apply/`, {});
      return { row, suggestion, applied: applied.data };
    },
    onSuccess: ({ row, suggestion, applied }) => {
      refresh();
      setError('');
      setToast(`«${row.raw_name}» به «${suggestion.label}» نگاشت و `
        + `${formatPersianNumber(applied?.total || 0)} ردیف اصلاح شد.`);
    },
    onError: (err) => setError(
      err?.response?.data?.detail || 'ثبت نگاشت پیشنهادی ممکن نشد.',
    ),
  });

  /** اعمال همهٔ نگاشت‌های همین ستون روی داده‌های موجود. */
  const applyColumn = useMutation({
    mutationFn: async () => {
      let total = 0;
      const mappedRows = rows.filter((row) => row.mapped && row.targets?.length);
      for (const row of mappedRows) {
        for (const item of row.targets) {
          // eslint-disable-next-line no-await-in-loop
          const response = await axiosInstance.post(`${API}${item.id}/apply/`, {});
          total += response.data.total || 0;
        }
      }
      return total;
    },
    onSuccess: (total) => {
      refresh();
      setToast(`${formatPersianNumber(total)} ردیف در ستون «${selectedColumn?.label || ''}» اصلاح شد.`);
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

  const columnsTotals = useMemo(() => columns.reduce((acc, col) => ({
    names: acc.names + (col.names || 0),
    mapped: acc.mapped + (col.mapped || 0),
    unmapped: acc.unmapped + (col.unmapped || 0),
  }), { names: 0, mapped: 0, unmapped: 0 }), [columns]);

  const purposeOptions = purposeGroups.length
    ? purposeGroups.map((group) => ({
      group: group.title,
      items: group.keys.map((key) => purposesByKey[key]).filter(Boolean),
    })).filter((group) => group.items.length)
    : [{ group: 'کاربردها', items: purposes }];


  const tableColumns = useMemo(() => ([
    {
      key: 'raw',
      label: 'نام واردشده',
      width: '22%',
      render: (row) => (
        <Box sx={{ minWidth: 0 }}>
          <Typography noWrap title={row.raw_name} sx={{ fontSize: 11.5, fontWeight: 800 }}>
            {row.raw_name}
          </Typography>
          <Stack direction="row" spacing={0.35} alignItems="center" useFlexGap flexWrap="wrap">
            <Typography noWrap sx={{ fontSize: 9.5, color: MUTED }}>
              {`کلید: ${row.normalized || '—'}`}
            </Typography>
            {row.count ? (
              <Chip size="small" label={`${toPersianDigits(row.count)} ردیف`}
                sx={{ ...chipSx(SLATE), height: 17 }} />
            ) : null}
          </Stack>
        </Box>
      ),
    },
    {
      key: 'state',
      label: 'وضعیت',
      width: '11%',
      align: 'center',
      render: (row) => (
        row.mapped ? (
          <Chip size="small" icon={<CheckCircleOutlineIcon sx={{ fontSize: 14 }} />}
            label={`${toPersianDigits(row.targets.length)} مقصد`} sx={chipSx(OK)} />
        ) : (
          <Chip size="small" label="بدون نگاشت" sx={chipSx(WARN)} />
        )
      ),
    },
    {
      key: 'targets',
      label: 'مقصدها',
      width: '25%',
      render: (row) => (
        row.mapped ? (
          <Box sx={{ minWidth: 0 }}>
            <Typography noWrap title={row.targets_label}
              sx={{ fontSize: 11.5, fontWeight: 800, lineHeight: 1.7 }}>
              {row.targets_label}
            </Typography>
            <Stack direction="row" spacing={0.3} useFlexGap flexWrap="wrap" sx={{ mt: 0.15 }}>
              {row.targets.map((item) => (
                <Chip
                  key={item.id}
                  size="small"
                  label={kindLabels[item.target_kind] || item.target_kind_display}
                  onClick={() => openEditRow(row, item)}
                  sx={{ ...chipSx(KIND_COLOR[item.target_kind] || SLATE), cursor: 'pointer' }}
                />
              ))}
              {row.applied_count ? (
                <Chip size="small" label={`${toPersianDigits(row.applied_count)} اصلاح`}
                  sx={{ ...chipSx(INTERNAL), height: 18 }} />
              ) : null}
            </Stack>
          </Box>
        ) : (
          <Typography sx={{ fontSize: 11, color: MUTED }}>—</Typography>
        )
      ),
    },
    {
      key: 'suggestions',
      label: 'پیشنهاد / آدرس‌دهی',
      width: '28%',
      render: (row) => (
        row.mapped ? (
          <Typography sx={{ fontSize: 10.5, color: MUTED }}>
            نگاشت‌شده؛ برای تغییر روی مقصد کلیک کنید.
          </Typography>
        ) : (
          <Stack direction="row" spacing={0.3} useFlexGap flexWrap="wrap">
            {(row.suggestions || []).map((item) => (
              <Tooltip key={`${item.kind}-${item.id}`}
                title={`نگاشت به ${kindLabels[item.kind] || item.kind}`}>
                <Chip
                  size="small"
                  variant="outlined"
                  icon={<AutoFixHighIcon sx={{ fontSize: 13 }} />}
                  label={item.label}
                  disabled={quickMap.isPending}
                  onClick={runIfEditable(() => quickMap.mutate({ row, suggestion: item }))}
                  sx={{ fontSize: 9.5, height: 22, cursor: 'pointer' }}
                />
              </Tooltip>
            ))}
            {!(row.suggestions || []).length ? (
              <Typography sx={{ fontSize: 10, color: MUTED }}>
                پیشنهادی نیست؛ «آدرس‌دهی دستی» را بزنید.
              </Typography>
            ) : null}
          </Stack>
        )
      ),
    },
    {
      key: 'actions',
      label: 'عملیات',
      width: '14%',
      align: 'center',
      render: (row) => (
        <Stack direction="row" spacing={0.2} justifyContent="center">
          <Tooltip title={row.mapped ? 'افزودن مقصد دیگر' : 'آدرس‌دهی دستی'}>
            <IconButton size="small" aria-label="آدرس‌دهی دستی"
              onClick={() => (row.mapped ? openAddTarget(row) : openManual(row.raw_name))}>
              <AddLinkIcon sx={{ fontSize: 15, color: INTERNAL }} />
            </IconButton>
          </Tooltip>
          {row.mapped ? (
            <>
              <Tooltip title="ویرایش نگاشت">
                <IconButton size="small" aria-label="ویرایش نگاشت"
                  onClick={() => openEditRow(row, row.targets[0])}>
                  <EditOutlinedIcon sx={{ fontSize: 15, color: SLATE }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="اعمال روی داده‌های موجود">
                <span>
                  <IconButton size="small" aria-label="اعمال نگاشت"
                    disabled={applyGroup.isPending || !canEditMapping}
                    onClick={runIfEditable(() => applyGroup.mutate(row))}>
                    <PlayCircleOutlineIcon sx={{ fontSize: 15, color: INCOMING }} />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="حذف این نگاشت">
                <IconButton size="small" aria-label="حذف نگاشت"
                  onClick={runIfEditable(() => row.targets.forEach((item) => remove.mutate(item.id)))}>
                  <DeleteOutlineIcon sx={{ fontSize: 15, color: DANGER }} />
                </IconButton>
              </Tooltip>
            </>
          ) : null}
        </Stack>
      ),
    },
  ]), [
    applyGroup, kindLabels, openAddTarget, openEditRow, openManual, quickMap, remove,
  ]);

  const loading = (columnsQuery.isLoading && !columns.length)
    || (Boolean(scope) && groupsQuery.isLoading && !rows.length && unmappedQuery.isLoading);


  return (
    <Box>
      <PageHeader
        icon={<SyncAltIcon />}
        title="نگاشت نام‌ها"
        subtitle="هر ستون مکاتبات را جداگانه نگاشت کنید: نام‌های بدون نگاشت را با پیشنهاد سامانه یا انتخاب دستی به پرسنل، طرف حساب، مخاطب، سازمان و نوع مکاتبه وصل کنید"
        badge={(
          <Chip
            size="small"
            label={`${formatPersianNumber(summary.names || columnsTotals.mapped || 0)} نام نگاشت‌شده`}
            sx={chipSx(ACCENT)}
          />
        )}
        actions={(
          <>
            <Tooltip title="بازخوانی ستون‌ها">
              <IconButton size="small" aria-label="بازخوانی نگاشت‌ها" onClick={refresh}>
                <RefreshIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Button size="small" variant="outlined"
              startIcon={<AutoFixHighIcon sx={{ fontSize: 16 }} />}
              disabled={applyAll.isPending || !summary.aliases}
              onClick={runIfEditable(() => applyAll.mutate(true))}>
              اعمال همه روی داده‌ها
            </Button>
            <Button size="small" variant="contained"
              startIcon={<AddLinkIcon sx={{ fontSize: 16 }} />}
              onClick={() => openManual('')}>
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
          md: 'repeat(4, minmax(0, 1fr))',
        },
      }}>
        <StudioKpi
          icon={SyncAltIcon}
          label="نگاشت‌های فعال"
          value={formatPersianNumber(summary.aliases || 0)}
          hint={`${formatPersianNumber(summary.multi || 0)} نگاشت چند مقصده`}
          color={ACCENT}
        />
        <StudioKpi
          icon={CheckCircleOutlineIcon}
          label="نام‌های نگاشت‌شده"
          value={formatPersianNumber(columnsTotals.mapped)}
          hint={`از ${formatPersianNumber(columnsTotals.names)} نام موجود در داده‌ها`}
          color={OK}
        />
        <StudioKpi
          icon={WarningAmberIcon}
          label="نام‌های بدون نگاشت"
          value={formatPersianNumber(columnsTotals.unmapped)}
          hint="با پیشنهاد یا آدرس‌دهی دستی"
          color={WARN}
          onClick={() => setOnlyUnmapped(true)}
        />
        <StudioKpi
          icon={PlayCircleOutlineIcon}
          label="ردیف‌های اصلاح‌شده"
          value={formatPersianNumber(summary.applied || 0)}
          hint="اتصال نامه‌ها و ارجاعات"
          color={INTERNAL}
          onClick={runIfEditable(() => applyAll.mutate(true))}
        />
      </Box>


      {/* ── انتخاب ستون (فیلد) ── */}
      <Paper elevation={0} sx={{ ...panelSx(moduleTheme), p: 1, mb: 1.25 }}>
        <Stack direction="row" alignItems="center" spacing={0.75} useFlexGap flexWrap="wrap"
          sx={{ mb: 0.75 }}>
          <TuneIcon sx={{ fontSize: 17, color: ACCENT }} />
          <Typography sx={{ fontSize: 12, fontWeight: 800 }}>
            ستون موردنظر را انتخاب کنید
          </Typography>
          <Typography sx={{ fontSize: 10.5, color: MUTED }}>
            همهٔ ستون‌های نامی (به‌جز تاریخ و شمارهٔ نامه) قابل نگاشت هستند
          </Typography>
          <Box sx={{ flex: 1 }} />
          {columnsQuery.isFetching ? <CircularProgress size={13} sx={{ color: ACCENT }} /> : null}
        </Stack>
        <Box sx={{
          display: 'grid',
          gap: 0.75,
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, minmax(0, 1fr))',
            md: 'repeat(3, minmax(0, 1fr))',
            lg: 'repeat(5, minmax(0, 1fr))',
          },
        }}>
          {columns.map((col) => {
            const selected = col.key === scope;
            const percent = col.names ? Math.round((col.mapped / col.names) * 100) : 0;
            const tone = PURPOSE_COLOR[col.key] || ACCENT;
            return (
              <Box
                key={col.key}
                role="button"
                tabIndex={0}
                aria-label={`ستون ${col.label}`}
                aria-pressed={selected}
                onClick={() => setScope(col.key)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') setScope(col.key);
                }}
                sx={{
                  p: 0.8,
                  borderRadius: '13px',
                  border: '1px solid',
                  borderColor: selected ? tone : 'divider',
                  bgcolor: selected ? alpha(tone, 0.07) : 'transparent',
                  cursor: 'pointer',
                  minWidth: 0,
                  transition: 'border-color .15s ease, background-color .15s ease',
                  '&:hover': { borderColor: alpha(tone, 0.6), bgcolor: alpha(tone, 0.04) },
                }}
              >
                <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 0 }}>
                  <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 800, flex: 1 }}>
                    {col.label}
                  </Typography>
                  {col.unmapped ? (
                    <Chip size="small" label={`${toPersianDigits(col.unmapped)} بدون نگاشت`}
                      sx={{ ...chipSx(WARN), height: 18 }} />
                  ) : (
                    <Chip size="small" label="کامل" sx={{ ...chipSx(OK), height: 18 }} />
                  )}
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={percent}
                  sx={{
                    height: 5,
                    borderRadius: 3,
                    mt: 0.6,
                    bgcolor: alpha(tone, 0.16),
                    '& .MuiLinearProgress-bar': { bgcolor: tone, borderRadius: 3 },
                  }}
                />
                <Typography noWrap sx={{ fontSize: 9.5, color: MUTED, mt: 0.35 }}>
                  {`${formatPersianNumber(col.names)} نام · ${formatPersianNumber(col.mapped)} نگاشت‌شده · ${formatPersianNumber(col.rows)} ردیف`}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Paper>


      {/* ── میزکار ستون انتخاب‌شده ── */}
      <Paper elevation={0} sx={{ ...panelSx(moduleTheme), overflow: 'hidden', mb: 1 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={0.75}
          alignItems={{ xs: 'stretch', md: 'center' }}
          useFlexGap
          flexWrap="wrap"
          sx={{
            px: `${moduleTheme.cardPadX}px`,
            py: 0.9,
            borderBottom: '1px dashed',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 12.5, fontWeight: 800 }}>
              {selectedColumn?.label ? `نگاشت ستون «${selectedColumn.label}»` : 'یک ستون انتخاب کنید'}
            </Typography>
            <Typography noWrap sx={{ fontSize: 10.5, color: MUTED }}>
              {selectedColumn?.description
                || 'نام‌های این ستون را با پیشنهاد سامانه یا انتخاب دستی به مقصد متصل کنید.'}
            </Typography>
          </Box>
          <Stack direction="row" spacing={0.3} useFlexGap flexWrap="wrap">
            {(selectedColumn?.target_kinds || []).map((kind) => (
              <Chip key={kind} size="small" label={kindLabels[kind] || kind}
                sx={{ ...chipSx(KIND_COLOR[kind] || SLATE), height: 19 }} />
            ))}
            {supportsDual ? (
              <Chip size="small" label="نگاشت دو مسیره"
                sx={{ ...chipSx(INCOMING), height: 19 }} />
            ) : null}
          </Stack>
          <Box sx={{ flex: 1 }} />
          <TextField
            size="small"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="جست‌وجو در نام‌های این ستون…"
            inputProps={{ 'aria-label': 'جست‌وجوی نام در ستون' }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 16 }} />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: { xs: '100%', md: 220 } }}
          />
          <Button size="small"
            variant={onlyUnmapped ? 'contained' : 'outlined'}
            startIcon={<WarningAmberIcon sx={{ fontSize: 15 }} />}
            onClick={() => setOnlyUnmapped((previous) => !previous)}>
            فقط بدون نگاشت
          </Button>
          <Button size="small" variant="outlined"
            startIcon={<PlayCircleOutlineIcon sx={{ fontSize: 15 }} />}
            disabled={applyColumn.isPending || !rows.some((row) => row.mapped)}
            disabled={applyColumn.isPending || !canEditMapping}
            onClick={runIfEditable(() => applyColumn.mutate())}>
            اعمال این ستون
          </Button>
          <Button size="small" variant="contained"
            startIcon={<AddLinkIcon sx={{ fontSize: 15 }} />}
            disabled={!scope}
            onClick={() => openManual('')}>
            نگاشت دستی
          </Button>
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
            rows={rows}
            rowKey={(row) => `${row.scope}-${row.normalized}`}
            emptyText={scope
              ? 'برای این ستون نامی با این فیلترها پیدا نشد.'
              : 'از کارت‌های بالا یک ستون انتخاب کنید.'}
            columns={tableColumns}
          />
        )}
      </Paper>

      <Typography sx={{ fontSize: 10.5, color: MUTED, px: 0.5 }}>
        نکته: با کلیک روی هر پیشنهاد، نگاشت همان لحظه ساخته و روی نامه‌های موجود اعمال می‌شود.
        برای انتخاب دستی، «آدرس‌دهی دستی» را بزنید و نوع مقصد (پرسنل، طرف حساب، مخاطب، سازمان یا نوع مکاتبه) را تعیین کنید.
      </Typography>

      <NameMappingFormDialog
        form={form}
        setForm={setForm}
        onClose={() => setForm(EMPTY_MAPPING_FORM)}
        onSave={runIfEditable(() => save.mutate())}
        saving={save.isPending}
        error={form.open ? error : ''}
        onClearError={() => setError('')}
        purposeOptions={purposeOptions}
        selectedPurpose={purposesByKey[form.scope]}
        allowedKinds={purposesByKey[form.scope]?.target_kinds || allowedKinds}
        supportsDual={Boolean(metaData?.paired_scopes?.[form.scope])}
        targetKinds={metaData?.target_kinds || []}
        contacts={contacts}
        organizations={organizations}
        categories={categories}
      />

      <MappingApplyPreviewDialog
        preview={preview}
        onClose={() => setPreview(null)}
        onConfirm={runIfEditable(() => applyAll.mutate(false))}
        pending={applyAll.isPending}
      />
    </Box>
  );
};

export default CorrespondenceNameMappingPage;

