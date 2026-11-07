import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../core/api/axiosConfig';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, IconButton, MenuItem, Paper, Stack, Tab, Tabs, TextField, Tooltip, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import ContactPhoneIcon from '@mui/icons-material/ContactPhone';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import NumbersIcon from '@mui/icons-material/Numbers';
import SettingsIcon from '@mui/icons-material/Settings';
import { formatPersianNumber, toPersianDigits } from '../../core/utils/numberUtils';
import PageHeader from '../../core/components/ui/PageHeader';
import { MUTED } from '../accounting/AccountingDashboardUI';
import { ModuleTable, useModuleTheme, useRowHeight } from '../contracts/contractModuleUi';
import {
  ACCENT, DIRECTION_META, INCOMING, INTERNAL, SLATE, WARN, chipSx, MetaChip,
} from './correspondenceUi';

const asList = (payload) => (Array.isArray(payload) ? payload : payload?.results || []);

const ENTITY_CONFIG = {
  category: {
    title: 'نوع مکاتبه',
    endpoint: '/letter-categories/',
    queryKey: ['correspondence-categories'],
    defaults: {
      name: '', code: '', direction: 'both', color: '#0ea5e9', order: 0, description: '',
    },
  },
  series: {
    title: 'سری شماره‌گذاری',
    endpoint: '/letter-series/',
    queryKey: ['correspondence-series'],
    defaults: {
      title: '', direction: 'outgoing', prefix: '', template: '{prefix}/{year}/{seq}',
      next_number: 1, padding: 3, reset_yearly: true, is_default: false,
    },
  },
  contact: {
    title: 'مخاطب',
    endpoint: '/correspondents/',
    queryKey: ['correspondence-contacts'],
    defaults: {
      kind: 'organization', name: '', title: '', organization: '', code: '', national_id: '',
      phone: '', mobile: '', email: '', address: '', notes: '',
    },
  },
};

const CorrespondenceSettingsPage = () => {
  const moduleTheme = useModuleTheme();
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(
    searchParams.get('tab') === 'contacts' ? 'contacts' : 'categories',
  );
  const [dialog, setDialog] = useState({ open: false, type: 'category', row: null });
  const [form, setForm] = useState(ENTITY_CONFIG.category.defaults);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const requested = searchParams.get('tab');
    if (requested === 'contacts') setTab('contacts');
  }, [searchParams]);

  const categoriesQuery = useQuery({
    queryKey: ENTITY_CONFIG.category.queryKey,
    queryFn: () => axiosInstance.get('/letter-categories/', { params: { page_size: 200 } })
      .then((response) => response.data),
  });
  const seriesQuery = useQuery({
    queryKey: ENTITY_CONFIG.series.queryKey,
    queryFn: () => axiosInstance.get('/letter-series/', { params: { page_size: 200 } })
      .then((response) => response.data),
  });
  const contactsQuery = useQuery({
    queryKey: ENTITY_CONFIG.contact.queryKey,
    queryFn: () => axiosInstance.get('/correspondents/', { params: { page_size: 300 } })
      .then((response) => response.data),
  });
  const organizationsQuery = useQuery({
    queryKey: ['correspondence-organizations'],
    queryFn: () => axiosInstance.get('/organizations/', { params: { page_size: 300 } })
      .then((response) => response.data),
  });

  const categories = asList(categoriesQuery.data);
  const series = asList(seriesQuery.data);
  const contacts = asList(contactsQuery.data);
  const organizations = asList(organizationsQuery.data);

  const filterRows = useCallback((rows, fields) => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => fields.some(
      (field) => String(row[field] || '').toLowerCase().includes(query),
    ));
  }, [search]);

  const filteredCategories = useMemo(
    () => filterRows(categories, ['name', 'code', 'description']),
    [categories, filterRows],
  );
  const filteredSeries = useMemo(
    () => filterRows(series, ['title', 'prefix', 'template']),
    [series, filterRows],
  );
  const filteredContacts = useMemo(
    () => filterRows(contacts, ['name', 'title', 'organization_name', 'phone', 'mobile', 'email']),
    [contacts, filterRows],
  );

  const visibleRows = tab === 'categories' ? filteredCategories
    : tab === 'series' ? filteredSeries : filteredContacts;
  const { ref: tableRef, rowHeight, tableHeight } = useRowHeight(
    moduleTheme.tableTheme, Math.max(1, visibleRows.length),
  );

  const openCreate = () => {
    const type = tab === 'categories' ? 'category' : tab === 'series' ? 'series' : 'contact';
    setForm({ ...ENTITY_CONFIG[type].defaults });
    setDialog({ open: true, type, row: null });
    setError('');
  };

  const openEdit = (type, row) => {
    setForm({ ...ENTITY_CONFIG[type].defaults, ...row });
    setDialog({ open: true, type, row });
    setError('');
  };

  const save = useMutation({
    mutationFn: async () => {
      const config = ENTITY_CONFIG[dialog.type];
      const payload = { ...form };
      Object.keys(payload).forEach((key) => {
        if (payload[key] === '' || payload[key] === null || payload[key] === undefined) {
          delete payload[key];
        }
      });
      if (dialog.row) return axiosInstance.patch(`${config.endpoint}${dialog.row.id}/`, payload);
      return axiosInstance.post(config.endpoint, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ENTITY_CONFIG[dialog.type].queryKey });
      qc.invalidateQueries({ queryKey: ['correspondence-meta'] });
      setToast(`${ENTITY_CONFIG[dialog.type].title} ذخیره شد.`);
      setDialog({ open: false, type: dialog.type, row: null });
    },
    onError: (err) => {
      const detail = err?.response?.data;
      setError(typeof detail === 'string' ? detail
        : (detail && Object.values(detail).flat().join(' ')) || 'ذخیره انجام نشد.');
    },
  });

  const remove = useMutation({
    mutationFn: ({ type, id }) => axiosInstance.delete(`${ENTITY_CONFIG[type].endpoint}${id}/`),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ENTITY_CONFIG[variables.type].queryKey });
      setToast('ردیف حذف شد.');
    },
  });

  const isLoading = categoriesQuery.isLoading || seriesQuery.isLoading || contactsQuery.isLoading;
  const set = (key) => (event) => setForm((previous) => ({ ...previous, [key]: event.target.value }));

  const columnsFor = (type) => {
    if (type === 'category') {
      return [
        { key: 'name', label: 'عنوان', width: '26%', render: (row) => (
          <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 800 }}>{row.name}</Typography>
        ) },
        { key: 'code', label: 'کد', width: '12%', align: 'center', render: (row) => (
          <Typography sx={{ fontSize: 11, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>{row.code}</Typography>
        ) },
        { key: 'direction', label: 'جهت', width: '16%', align: 'center', render: (row) => (
          <MetaChip meta={row.direction === 'both'
            ? { label: 'وارده و صادره', color: WARN }
            : DIRECTION_META[row.direction]} />
        ) },
        { key: 'count', label: 'تعداد نامه', width: '12%', align: 'center', render: (row) => (
          <Chip size="small" label={toPersianDigits(row.letter_count || 0)} sx={chipSx(INCOMING)} />
        ) },
        { key: 'order', label: 'ترتیب', width: '10%', align: 'center', render: (row) => (
          <Typography sx={{ fontSize: 11 }}>{toPersianDigits(row.order || 0)}</Typography>
        ) },
        { key: 'actions', label: 'عملیات', width: '14%', align: 'center', render: (row) => (
          <Stack direction="row" spacing={0.2} justifyContent="center">
            <Tooltip title="ویرایش">
              <IconButton size="small" aria-label="ویرایش" onClick={() => openEdit('category', row)}>
                <EditOutlinedIcon sx={{ fontSize: 15 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="حذف">
              <IconButton size="small" aria-label="حذف"
                onClick={() => remove.mutate({ type: 'category', id: row.id })}>
                <DeleteOutlineIcon sx={{ fontSize: 15, color: '#be123c' }} />
              </IconButton>
            </Tooltip>
          </Stack>
        ) },
      ];
    }
    if (type === 'series') {
      return [
        { key: 'title', label: 'عنوان سری', width: '24%', render: (row) => (
          <Box sx={{ minWidth: 0 }}>
            <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 800 }}>{row.title}</Typography>
            <Typography noWrap sx={{ fontSize: 9.5, color: MUTED }}>
              پیشوند: {row.prefix || '—'} · قالب: {row.template}
            </Typography>
          </Box>
        ) },
        { key: 'direction', label: 'جهت', width: '12%', align: 'center', render: (row) => (
          <MetaChip meta={DIRECTION_META[row.direction] || { label: row.direction, color: SLATE }} />
        ) },
        { key: 'next', label: 'شماره بعدی', width: '12%', align: 'center', render: (row) => (
          <Typography sx={{ fontSize: 11 }}>{toPersianDigits(row.next_number || 1)}</Typography>
        ) },
        { key: 'preview', label: 'پیش‌نمایش', width: '20%', align: 'center', render: (row) => (
          <Chip size="small" label={row.preview || '—'} sx={chipSx(INTERNAL)} />
        ) },
        { key: 'default', label: 'پیش‌فرض', width: '10%', align: 'center', render: (row) => (
          row.is_default
            ? <Chip size="small" label="پیش‌فرض" sx={chipSx(WARN)} />
            : <Typography sx={{ fontSize: 10, color: MUTED }}>—</Typography>
        ) },
        { key: 'actions', label: 'عملیات', width: '14%', align: 'center', render: (row) => (
          <Stack direction="row" spacing={0.2} justifyContent="center">
            <Tooltip title="ویرایش">
              <IconButton size="small" aria-label="ویرایش" onClick={() => openEdit('series', row)}>
                <EditOutlinedIcon sx={{ fontSize: 15 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="حذف">
              <IconButton size="small" aria-label="حذف"
                onClick={() => remove.mutate({ type: 'series', id: row.id })}>
                <DeleteOutlineIcon sx={{ fontSize: 15, color: '#be123c' }} />
              </IconButton>
            </Tooltip>
          </Stack>
        ) },
      ];
    }
    return [
      { key: 'name', label: 'نام مخاطب', width: '24%', render: (row) => (
        <Box sx={{ minWidth: 0 }}>
          <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 800 }}>{row.name}</Typography>
          <Typography noWrap sx={{ fontSize: 9.5, color: MUTED }}>{row.title || row.kind_display}</Typography>
        </Box>
      ) },
      { key: 'org', label: 'سازمان', width: '18%', render: (row) => (
        <Typography noWrap sx={{ fontSize: 11 }}>{row.organization_name || '—'}</Typography>
      ) },
      { key: 'phone', label: 'تلفن / همراه', width: '14%', align: 'center', render: (row) => (
        <Typography noWrap sx={{ fontSize: 11, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
          {row.mobile || row.phone || '—'}
        </Typography>
      ) },
      { key: 'email', label: 'ایمیل', width: '16%', render: (row) => (
        <Typography noWrap sx={{ fontSize: 10.5 }}>{row.email || '—'}</Typography>
      ) },
      { key: 'count', label: 'نامه‌ها', width: '10%', align: 'center', render: (row) => (
        <Chip size="small" label={toPersianDigits(row.letter_count || 0)} sx={chipSx(INCOMING)} />
      ) },
      { key: 'actions', label: 'عملیات', width: '14%', align: 'center', render: (row) => (
        <Stack direction="row" spacing={0.2} justifyContent="center">
          <Tooltip title="ویرایش">
            <IconButton size="small" aria-label="ویرایش" onClick={() => openEdit('contact', row)}>
              <EditOutlinedIcon sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="حذف">
            <IconButton size="small" aria-label="حذف"
              onClick={() => remove.mutate({ type: 'contact', id: row.id })}>
              <DeleteOutlineIcon sx={{ fontSize: 15, color: '#be123c' }} />
            </IconButton>
          </Tooltip>
        </Stack>
      ) },
    ];
  };

  const activeType = tab === 'categories' ? 'category' : tab === 'series' ? 'series' : 'contact';

  if (isLoading) {
    return <Box sx={{ py: 9, textAlign: 'center' }}><CircularProgress sx={{ color: ACCENT }} /></Box>;
  }

  // پیوندهای قدیمی «?tab=mapping» به صفحهٔ مستقل نگاشت نام‌ها هدایت می‌شوند
  if (searchParams.get('tab') === 'mapping') {
    return <Navigate to="/correspondence/name-mapping" replace />;
  }

  return (
    <Box sx={{ pb: 1, minWidth: 0 }}>
      <PageHeader
        icon={<SettingsIcon />}
        title="تنظیمات مکاتبات اداری"
        badge={(
          <Stack direction="row" spacing={0.6} useFlexGap flexWrap="wrap">
            <Chip size="small" label={`${formatPersianNumber(categories.length)} نوع مکاتبه`}
              sx={{ height: 23, fontWeight: 800, bgcolor: chipSx(INCOMING).bgcolor, color: INCOMING }} />
            <Chip size="small" label={`${formatPersianNumber(series.length)} سری شماره`}
              sx={{ height: 23, fontWeight: 800, bgcolor: chipSx(INTERNAL).bgcolor, color: INTERNAL }} />
            <Chip size="small" label={`${formatPersianNumber(contacts.length)} مخاطب`}
              sx={{ height: 23, fontWeight: 800, bgcolor: chipSx(SLATE).bgcolor, color: SLATE }} />
          </Stack>
        )}
        actions={(
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}
            sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#0284c7' } }}>
            افزودن {ENTITY_CONFIG[activeType].title}
          </Button>
        )}
      />

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

      <Paper elevation={0} sx={{
        borderRadius: 'var(--hrms-table-radius, 16px)',
        overflow: 'hidden',
        px: `${moduleTheme.cardPadX}px`, py: `${moduleTheme.cardPadY}px`,
        border: '1px solid', borderColor: moduleTheme.cardBorderColor,
        bgcolor: 'background.paper', boxShadow: 'none',
      }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}
          alignItems={{ xs: 'stretch', sm: 'center' }} sx={{ mb: 1 }}>
          <Tabs value={tab} onChange={(_event, value) => setTab(value)}
            sx={{
              minHeight: 34,
              flex: 1,
              '& .MuiTab-root': { minHeight: 34, py: 0.4, fontSize: 12, fontWeight: 800 },
              '& .MuiTabs-indicator': { bgcolor: ACCENT, height: 2.5, borderRadius: 2 },
            }}>
            <Tab value="categories" icon={<CategoryOutlinedIcon sx={{ fontSize: 16 }} />}
              iconPosition="start" label={`انواع مکاتبه (${formatPersianNumber(categories.length)})`} />
            <Tab value="series" icon={<NumbersIcon sx={{ fontSize: 16 }} />} iconPosition="start"
              label={`شماره‌گذاری (${formatPersianNumber(series.length)})`} />
            <Tab value="contacts" icon={<ContactPhoneIcon sx={{ fontSize: 16 }} />} iconPosition="start"
              label={`مخاطبین (${formatPersianNumber(contacts.length)})`} />
          </Tabs>
          <TextField size="small" label="جستجو" value={search}
            onChange={(event) => setSearch(event.target.value)}
            sx={{ width: { xs: '100%', sm: 240 } }} />
        </Stack>

        <ModuleTable
          tableTheme={moduleTheme.tableTheme}
          ariaLabel="فهرست تعاریف مکاتبات"
          containerRef={tableRef}
          tableHeight={tableHeight}
          rowHeight={rowHeight}
          rows={visibleRows}
          rowKey={(row) => row.id}
          emptyText="ردیفی ثبت نشده است."
          columns={columnsFor(activeType)}
        />
      </Paper>


      <Dialog open={dialog.open} onClose={() => setDialog({ ...dialog, open: false })}
        maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 14, fontWeight: 900 }}>
          {dialog.row
            ? `ویرایش ${ENTITY_CONFIG[dialog.type].title}`
            : `افزودن ${ENTITY_CONFIG[dialog.type].title}`}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.25 }}>
            {dialog.type === 'category' ? (
              <>
                <TextField size="small" label="عنوان نوع" value={form.name || ''} onChange={set('name')} />
                <TextField size="small" label="کد" value={form.code || ''} onChange={set('code')} />
                <TextField select size="small" label="جهت" value={form.direction || 'both'}
                  onChange={set('direction')}>
                  <MenuItem value="both">وارده و صادره</MenuItem>
                  <MenuItem value="incoming">وارده</MenuItem>
                  <MenuItem value="outgoing">صادره</MenuItem>
                  <MenuItem value="internal">داخلی</MenuItem>
                </TextField>
                <TextField size="small" type="number" label="ترتیب" value={form.order ?? 0}
                  onChange={set('order')} />
                <TextField size="small" label="رنگ" value={form.color || '#0ea5e9'} onChange={set('color')}
                  helperText="مثال: #0ea5e9" />
                <TextField size="small" multiline minRows={2} label="توضیحات"
                  value={form.description || ''} onChange={set('description')}
                  sx={{ gridColumn: '1 / -1' }} />
              </>
            ) : null}
            {dialog.type === 'series' ? (
              <>
                <TextField size="small" label="عنوان سری" value={form.title || ''} onChange={set('title')} />
                <TextField select size="small" label="جهت" value={form.direction || 'outgoing'}
                  onChange={set('direction')}>
                  <MenuItem value="incoming">وارده</MenuItem>
                  <MenuItem value="outgoing">صادره</MenuItem>
                  <MenuItem value="internal">داخلی</MenuItem>
                </TextField>
                <TextField size="small" label="پیشوند" value={form.prefix || ''} onChange={set('prefix')}
                  helperText="مثال: ص م" />
                <TextField size="small" label="قالب شماره" value={form.template || ''}
                  onChange={set('template')} helperText="توکن‌ها: {prefix} {year} {seq}" />
                <TextField size="small" type="number" label="شمارهٔ بعدی"
                  value={form.next_number ?? 1} onChange={set('next_number')} />
                <TextField size="small" type="number" label="تعداد رقم" value={form.padding ?? 3}
                  onChange={set('padding')} helperText="۳ → ۰۰۷" />
                <TextField select size="small" label="شمارش سالانه"
                  value={form.reset_yearly ? '1' : '0'}
                  onChange={(event) => setForm((prev) => ({
                    ...prev, reset_yearly: event.target.value === '1',
                  }))}>
                  <MenuItem value="1">از یک شروع شود</MenuItem>
                  <MenuItem value="0">ادامه‌دار</MenuItem>
                </TextField>
                <TextField select size="small" label="پیش‌فرض این جهت"
                  value={form.is_default ? '1' : '0'}
                  onChange={(event) => setForm((prev) => ({
                    ...prev, is_default: event.target.value === '1',
                  }))}>
                  <MenuItem value="0">خیر</MenuItem>
                  <MenuItem value="1">بله</MenuItem>
                </TextField>
              </>
            ) : null}
            {dialog.type === 'contact' ? (
              <>
                <TextField select size="small" label="نوع مخاطب" value={form.kind || 'organization'}
                  onChange={set('kind')}>
                  <MenuItem value="organization">سازمان</MenuItem>
                  <MenuItem value="person">شخص</MenuItem>
                </TextField>
                <TextField size="small" label="نام" value={form.name || ''} onChange={set('name')} />
                <TextField size="small" label="سمت / عنوان" value={form.title || ''} onChange={set('title')} />
                <TextField select size="small" label="سازمان مرتبط" value={form.organization || ''}
                  onChange={set('organization')}>
                  <MenuItem value="">—</MenuItem>
                  {organizations.map((row) => (
                    <MenuItem key={row.id} value={row.id}>{row.name}</MenuItem>
                  ))}
                </TextField>
                <TextField size="small" label="تلفن" value={form.phone || ''} onChange={set('phone')} />
                <TextField size="small" label="همراه" value={form.mobile || ''} onChange={set('mobile')} />
                <TextField size="small" label="ایمیل" value={form.email || ''} onChange={set('email')} />
                <TextField size="small" label="کد ملی / شناسه" value={form.national_id || ''}
                  onChange={set('national_id')} />
              </>
            ) : null}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.25 }}>
          <Button size="small" onClick={() => setDialog({ ...dialog, open: false })}>انصراف</Button>
          <Button size="small" variant="contained" disabled={save.isPending} onClick={() => save.mutate()}
            sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#0284c7' } }}>
            {save.isPending ? 'در حال ذخیره…' : 'ذخیره'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CorrespondenceSettingsPage;

