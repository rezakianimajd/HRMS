import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Accordion, AccordionDetails, AccordionSummary, Alert, Autocomplete, Box, Button,
  Chip, CircularProgress, Divider, FormControl, FormControlLabel, Grid,
  InputAdornment, InputLabel, MenuItem, Paper, Select, Snackbar, Stack, Switch, TextField,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import SettingsSuggestOutlinedIcon from '@mui/icons-material/SettingsSuggestOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import axiosInstance from '../core/api/axiosConfig';
import PageHeader from '../core/components/ui/PageHeader';
import InfoCard from '../core/components/ui/InfoCard';
import { formatPersianNumber } from '../core/utils/numberUtils';

const API = '/contract-account-mappings/';
const ACCENT = '#0f766e';

const listOf = (data) => (Array.isArray(data) ? data : data?.results || []);
const accountLabel = (account) => (account ? `${account.code || ''} - ${account.name || ''}` : '');
const categoryLabel = (category) => (category ? `${category.code || ''} - ${category.name || ''}` : '');
const auxiliaryLabel = (auxiliary) => (auxiliary ? `${auxiliary.code || ''} - ${auxiliary.name || ''}` : '');

const FALLBACK_SOURCES = [
  { value: 'auto', label: 'از دستهٔ تفصیلی (خودکار)' },
  { value: 'none', label: 'بدون تفصیل' },
  { value: 'contract', label: 'قرارداد همین سند' },
  { value: 'party', label: 'طرف حساب / پیمانکار' },
  { value: 'supplier', label: 'تأمین‌کننده' },
  { value: 'employee', label: 'پرسنل' },
  { value: 'project', label: 'پروژه' },
  { value: 'bank', label: 'بانک' },
  { value: 'cash', label: 'صندوق' },
  { value: 'fixed', label: 'تفصیل ثابت' },
];

const FALLBACK_MODES = [
  { value: 'soft', label: 'کنترل نرم (هشدار)' },
  { value: 'strict', label: 'کنترل سخت (مسدودسازی)' },
];

const MAPPING_ICONS = {
  base_subsidiary: AccountTreeOutlinedIcon,
  retention: PaymentsOutlinedIcon,
  insurance_deposit: AccountBalanceOutlinedIcon,
  payable: ReceiptLongOutlinedIcon,
  receivable: FactCheckOutlinedIcon,
  advance: PaymentsOutlinedIcon,
  tax: AccountBalanceOutlinedIcon,
  penalty: LockOutlinedIcon,
  fee: TuneOutlinedIcon,
  revenue: CheckCircleOutlineIcon,
  cost: ReceiptLongOutlinedIcon,
  guarantee: LockOutlinedIcon,
  other: SettingsSuggestOutlinedIcon,
};

const payloadFromRow = (row) => ({
  key: row.key,
  title: row.title || '',
  subsidiary_account: row.subsidiary_account || null,
  auxiliary_source_1: row.auxiliary_source_1 || 'none',
  auxiliary_category_1: row.auxiliary_category_1 || null,
  auxiliary_1: row.auxiliary_1 || null,
  auxiliary_source_2: row.auxiliary_source_2 || 'none',
  auxiliary_category_2: row.auxiliary_category_2 || null,
  auxiliary_2: row.auxiliary_2 || null,
  auxiliary_source_3: row.auxiliary_source_3 || 'none',
  auxiliary_category_3: row.auxiliary_category_3 || null,
  auxiliary_3: row.auxiliary_3 || null,
  auto_create_auxiliaries: Boolean(row.auto_create_auxiliaries),
  enforce_auxiliary: Boolean(row.enforce_auxiliary),
  control_mode: row.control_mode || 'soft',
  notes: row.notes || '',
  sort_order: Number(row.sort_order) || 0,
  is_active: row.is_active !== false,
});


const localMissing = (row) => {
  const missing = [];
  if (!row.subsidiary_account) missing.push('حساب معین');
  [1, 2, 3].forEach((slot) => {
    const source = row[`auxiliary_source_${slot}`] || 'none';
    if (source === 'auto' && !row[`auxiliary_category_${slot}`]) missing.push(`دستهٔ تفصیل ${slot}`);
    if (source === 'fixed' && !row[`auxiliary_${slot}`]) missing.push(`تفصیل ثابت ${slot}`);
  });
  return missing;
};

const AccountPicker = ({ label, options, value, onChange, disabled, helper }) => {
  const selected = useMemo(
    () => options.find((row) => String(row.id) === String(value)) || null,
    [options, value],
  );
  return (
    <Autocomplete
      size="small" fullWidth disabled={disabled} options={options}
      value={selected}
      isOptionEqualToValue={(a, b) => String(a.id) === String(b.id)}
      onChange={(_event, next) => onChange(next?.id || null)}
      getOptionLabel={accountLabel}
      noOptionsText="حساب معینی پیدا نشد"
      renderInput={(params) => <TextField {...params} label={label} helperText={helper} />}
    />
  );
};

const AuxiliaryPicker = ({ label, options, value, onChange, disabled }) => {
  const selected = useMemo(
    () => options.find((row) => String(row.id) === String(value)) || null,
    [options, value],
  );
  return (
    <Autocomplete
      size="small" fullWidth disabled={disabled} options={options}
      value={selected}
      isOptionEqualToValue={(a, b) => String(a.id) === String(b.id)}
      onChange={(_event, next) => onChange(next?.id || null)}
      getOptionLabel={auxiliaryLabel}
      noOptionsText="تفصیلی پیدا نشد"
      renderInput={(params) => <TextField {...params} label={label} />}
    />
  );
};



const AuxiliarySlot = ({ slot, row, update, categories, auxiliaries, sources }) => {
  const sourceKey = `auxiliary_source_${slot}`;
  const categoryKey = `auxiliary_category_${slot}`;
  const auxiliaryKey = `auxiliary_${slot}`;
  const source = row[sourceKey] || 'none';
  const category = categories.find((item) => String(item.id) === String(row[categoryKey])) || null;
  const fixed = auxiliaries.find((item) => String(item.id) === String(row[auxiliaryKey])) || null;
  const fixedOptions = category
    ? auxiliaries.filter((item) => !item.category || String(item.category) === String(category.id))
    : auxiliaries;
  return (
    <Paper variant="outlined" sx={{ p: 1, borderRadius: '12px', borderColor: '#e2e8f0', bgcolor: '#fbfdfe' }}>
      <Stack direction="row" alignItems="center" spacing={0.6} sx={{ mb: 0.8 }}>
        <Box sx={{
          width: 23, height: 23, borderRadius: '7px', bgcolor: alpha(ACCENT, 0.09),
          color: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Typography sx={{ fontSize: 12, fontWeight: 900 }}>{slot}</Typography>
        </Box>
        <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#334155' }}>تفصیل {slot}</Typography>
      </Stack>
      <Stack spacing={0.75}>
        <FormControl size="small" fullWidth>
          <InputLabel>منبع تفصیل</InputLabel>
          <Select value={source} label="منبع تفصیل"
            onChange={(event) => update({
              [sourceKey]: event.target.value,
              ...(event.target.value !== 'fixed' ? { [auxiliaryKey]: null } : {}),
            })}>
            {sources.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}
          </Select>
        </FormControl>
        <Autocomplete
          size="small" fullWidth disabled={source === 'none'} options={categories}
          value={category}
          isOptionEqualToValue={(a, b) => String(a.id) === String(b.id)}
          onChange={(_event, next) => update({ [categoryKey]: next?.id || null })}
          getOptionLabel={categoryLabel}
          noOptionsText="دستهٔ تفصیلی پیدا نشد"
          renderInput={(params) => <TextField {...params} label="دستهٔ تفصیلی"
            helperText={source === 'auto' ? 'برای منبع خودکار الزامی است' : ''} />}
        />
        {source === 'fixed' ? (
          <AuxiliaryPicker label="تفصیل ثابت" options={fixedOptions} value={row[auxiliaryKey]}
            onChange={(value) => update({ [auxiliaryKey]: value })} />
        ) : null}
        {fixed && source !== 'fixed' ? (
          <Typography sx={{ fontSize: 12, color: '#64748b' }}>تفصیل ثابت: {auxiliaryLabel(fixed)}</Typography>
        ) : null}
      </Stack>
    </Paper>
  );
};



const MappingCard = ({ row, update, accounts, categories, auxiliaries, sources, modes }) => {
  const definition = row.definition || {};
  const color = definition.color || ACCENT;
  const Icon = MAPPING_ICONS[row.key] || SettingsSuggestOutlinedIcon;
  const selectedAccount = row.subsidiary_account_detail
    || accounts.find((account) => String(account.id) === String(row.subsidiary_account))
    || null;
  const general = row.general_account_detail;
  const missing = localMissing(row);
  const complete = missing.length === 0;
  return (
    <Accordion elevation={0} disableGutters sx={{
      border: '1px solid #e2e8f0', borderRadius: '15px !important', overflow: 'hidden',
      bgcolor: '#fff', '&:before': { display: 'none' },
      boxShadow: '0 4px 14px rgba(15,23,42,0.035)',
    }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 1.4, py: 0.55, minHeight: 58 }}>
        <Stack direction="row" alignItems="center" spacing={0.9} sx={{ width: '100%', minWidth: 0 }}>
          <Box sx={{
            width: 34, height: 34, borderRadius: '10px', flexShrink: 0,
            bgcolor: alpha(color, 0.1), color, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon sx={{ fontSize: 18 }} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" alignItems="center" spacing={0.6}>
              <Typography noWrap sx={{ fontSize: 13, fontWeight: 900, color: '#0f172a' }}>
                {definition.label || row.key_display}
              </Typography>
              {definition.required ? <Chip size="small" label="کلیدی"
                sx={{ height: 17, fontSize: 12, bgcolor: '#fff7ed', color: '#b45309' }} /> : null}
            </Stack>
            <Typography noWrap sx={{ fontSize: 12, color: '#64748b' }}>{definition.description || '—'}</Typography>
          </Box>
          <Box sx={{ minWidth: 0, maxWidth: { xs: 120, sm: 210 }, textAlign: 'left' }}>
            <Typography noWrap sx={{
              fontSize: 12, fontWeight: 800, color: selectedAccount ? '#0f172a' : '#94a3b8',
              direction: 'ltr', textAlign: 'right',
            }}>
              {selectedAccount ? accountLabel(selectedAccount) : 'حساب معین انتخاب نشده'}
            </Typography>
            <Typography noWrap sx={{ fontSize: 12, color: '#64748b' }}>
              {general ? `کل: ${accountLabel(general)}` : 'حساب کل خودکار'}
            </Typography>
          </Box>
          <Chip size="small" icon={complete ? <CheckCircleOutlineIcon /> : <ErrorOutlineIcon />}
            label={complete ? 'تکمیل' : `${formatPersianNumber(missing.length)} مورد ناقص`}
            sx={{
              height: 22, fontSize: 12, flexShrink: 0,
              bgcolor: complete ? '#ecfdf5' : '#fff7ed',
              color: complete ? '#047857' : '#b45309',
            }} />
          <Chip size="small" label={row.control_mode === 'strict' ? 'کنترل سخت' : 'کنترل نرم'}
            sx={{
              height: 22, fontSize: 12, flexShrink: 0,
              bgcolor: row.control_mode === 'strict' ? '#fff1f2' : '#f8fafc',
              color: row.control_mode === 'strict' ? '#be123c' : '#64748b',
            }} />
        </Stack>
      </AccordionSummary>

      <AccordionDetails sx={{ px: 1.4, pt: 0, pb: 1.3, borderTop: '1px solid #f1f5f9' }}>
        <Grid container spacing={1.1} sx={{ pt: 1 }}>
          <Grid item xs={12} md={7}>
            <AccountPicker label="حساب معین *" options={accounts} value={row.subsidiary_account}
              onChange={(value) => {
                const detail = accounts.find((account) => String(account.id) === String(value)) || null;
                const generalDetail = detail && detail.parent_id ? {
                  id: detail.parent_id, code: detail.parent_code || '', name: detail.parent_name || '',
                } : null;
                update({
                  subsidiary_account: value,
                  subsidiary_account_detail: detail,
                  general_account_detail: generalDetail,
                });
              }}
              helper={general ? `حساب کل: ${accountLabel(general)}` : 'از فهرست حساب‌های معین انتخاب کنید'} />
          </Grid>
          <Grid item xs={12} md={5}>
            <TextField size="small" fullWidth label="حساب کل (خودکار)" value={general ? accountLabel(general) : '—'}
              InputProps={{ readOnly: true }} helperText="از والد حساب معین خوانده می‌شود" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl size="small" fullWidth>
              <InputLabel>حالت کنترل</InputLabel>
              <Select value={row.control_mode || 'soft'} label="حالت کنترل"
                onChange={(event) => update({ control_mode: event.target.value })}>
                {modes.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControlLabel control={(
              <Switch size="small" checked={Boolean(row.auto_create_auxiliaries)}
                onChange={(event) => update({ auto_create_auxiliaries: event.target.checked })} />
            )} label={<Typography sx={{ fontSize: 12 }}>ساخت خودکار تفصیل</Typography>} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControlLabel control={(
              <Switch size="small" checked={Boolean(row.enforce_auxiliary)}
                onChange={(event) => update({ enforce_auxiliary: event.target.checked })} />
            )} label={<Typography sx={{ fontSize: 12 }}>الزام تفصیل</Typography>} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControlLabel control={(
              <Switch size="small" checked={row.is_active !== false}
                onChange={(event) => update({ is_active: event.target.checked })} />
            )} label={<Typography sx={{ fontSize: 12 }}>فعال</Typography>} />
          </Grid>
        </Grid>

        <Divider textAlign="right" sx={{ my: 1 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 800, color }}>تفصیل‌های کنترل (حداکثر سه سطح)</Typography>
        </Divider>
        <Grid container spacing={0.9}>
          {[1, 2, 3].map((slot) => (
            <Grid item xs={12} md={4} key={slot}>
              <AuxiliarySlot slot={slot} row={row} update={update}
                categories={categories} auxiliaries={auxiliaries} sources={sources} />
            </Grid>
          ))}
        </Grid>
        <Grid container spacing={1.1} sx={{ mt: 0.1 }}>
          <Grid item xs={12}>
            <TextField size="small" fullWidth multiline rows={1} label="توضیحات و کنترل‌ها"
              value={row.notes || ''} onChange={(event) => update({ notes: event.target.value })} />
          </Grid>
        </Grid>
      </AccordionDetails>
    </Accordion>
  );
};



const ContractAccountingMappingPage = () => {
  const qc = useQueryClient();
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['contract-account-mappings'],
    queryFn: () => axiosInstance.get(API).then((response) => response.data),
  });

  const { data: accountsData, isLoading: accountsLoading } = useQuery({
    queryKey: ['contract-mapping-subsidiary-accounts'],
    queryFn: () => axiosInstance.get('/accounting/accounts/', { params: { kind: 'subsidiary' } }).then((response) => response.data),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['contract-mapping-aux-categories'],
    queryFn: () => axiosInstance.get('/accounting/auxiliary-categories/', { params: { page_size: 500 } }).then((response) => response.data),
  });

  const { data: auxiliaryData } = useQuery({
    queryKey: ['contract-mapping-auxiliaries'],
    queryFn: () => axiosInstance.get('/accounting/auxiliary-accounts/', { params: { page_size: 1000 } }).then((response) => response.data),
  });

  const accounts = useMemo(() => listOf(accountsData), [accountsData]);
  const categories = useMemo(() => listOf(categoriesData), [categoriesData]);
  const auxiliaries = useMemo(() => listOf(auxiliaryData), [auxiliaryData]);
  const sources = data?.sources || FALLBACK_SOURCES;
  const modes = data?.control_modes || FALLBACK_MODES;

  useEffect(() => {
    if (Array.isArray(data?.mappings)) {
      setRows(data.mappings.map((row) => ({ ...row })));
    }
  }, [data]);

  const updateRow = (key, patch) => {
    setRows((previous) => previous.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const save = useMutation({
    mutationFn: () => axiosInstance.put(`${API}bulk/`, {
      items: rows.map(payloadFromRow),
    }).then((response) => response.data),
    onSuccess: (payload) => {
      if (Array.isArray(payload?.mappings)) setRows(payload.mappings.map((row) => ({ ...row })));
      qc.invalidateQueries({ queryKey: ['contract-account-mappings'] });
      setToast({ ok: true, text: 'نگاشت و کنترل قراردادها ذخیره شد و از این پس سیستم آن را می‌خواند.' });
    },
    onError: (error) => {
      const detail = error?.response?.data?.detail
        || Object.values(error?.response?.data || {})?.[0]
        || 'ذخیرهٔ نگاشت انجام نشد.';
      setToast({ ok: false, text: typeof detail === 'string' ? detail : 'ذخیرهٔ نگاشت انجام نشد.' });
    },
  });

  const visibleRows = useMemo(() => {
    const query = search.trim();
    if (!query) return rows;
    return rows.filter((row) => [
      row.key_display, row.definition?.label, row.definition?.description,
      row.subsidiary_account_detail?.name, row.subsidiary_account_detail?.code,
    ].filter(Boolean).join(' ').toLowerCase().includes(query.toLowerCase()));
  }, [rows, search]);

  const stats = useMemo(() => {
    const complete = rows.filter((row) => !localMissing(row).length).length;
    const configured = rows.filter((row) => row.subsidiary_account).length;
    const strict = rows.filter((row) => row.control_mode === 'strict').length;
    return { total: rows.length, complete, configured, strict };
  }, [rows]);

  if (isLoading) {
    return <Box sx={{ py: 9, textAlign: 'center' }}><CircularProgress /></Box>;
  }

  if (isError) {
    return (
      <Box>
        <Alert severity="error" sx={{ borderRadius: '14px' }}>
          دریافت پیکربندی نگاشت انجام نشد. اتصال سرور و مجوز دسترسی را بررسی کنید.
        </Alert>
        <Button sx={{ mt: 2 }} variant="outlined" onClick={() => refetch()}>تلاش دوباره</Button>
      </Box>
    );
  }


  return (
    <Box>
      <PageHeader
        icon={<AccountTreeOutlinedIcon />}
        title="نگاشت و کنترل"
        subtitle="تعیین حساب معین، تفصیل‌ها و کنترل‌های مالی قراردادها؛ این تنظیمات مستقیماً توسط سیستم خوانده می‌شود."
        actions={(
          <>
            <Button variant="outlined" size="small" onClick={() => refetch()} disabled={isFetching}>
              به‌روزرسانی
            </Button>
            <Button variant="contained" size="small" startIcon={<SaveOutlinedIcon />}
              onClick={() => save.mutate()} disabled={save.isLoading || !rows.length}
              sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#115e59' } }}>
              {save.isLoading ? 'ذخیره…' : 'ذخیره همه'}
            </Button>
          </>
        )}
      />

      {toast ? (
        <Snackbar open autoHideDuration={5000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
          <Alert severity={toast.ok ? 'success' : 'error'} onClose={() => setToast(null)} sx={{ borderRadius: '12px' }}>
            {toast.text}
          </Alert>
        </Snackbar>
      ) : null}

      <Grid container spacing={1.3} sx={{ mb: 2 }}>
        <Grid item xs={6} md={3}><InfoCard icon={<AccountTreeOutlinedIcon />} label="نقاط مالی" value={formatPersianNumber(stats.total)} color="#0f766e" /></Grid>
        <Grid item xs={6} md={3}><InfoCard icon={<CheckCircleOutlineIcon />} label="حساب معین تعیین‌شده" value={formatPersianNumber(stats.configured)} color="#2563eb" /></Grid>
        <Grid item xs={6} md={3}><InfoCard icon={<FactCheckOutlinedIcon />} label="تکمیل‌شده" value={formatPersianNumber(stats.complete)} color="#16a34a" /></Grid>
        <Grid item xs={6} md={3}><InfoCard icon={<LockOutlinedIcon />} label="کنترل سخت" value={formatPersianNumber(stats.strict)} color="#be123c" /></Grid>
      </Grid>

      <Paper elevation={0} sx={{ p: 1.5, mb: 1.6, borderRadius: '15px', border: '1px solid #e2e8f0', bgcolor: alpha(ACCENT, 0.035) }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.2} alignItems={{ md: 'center' }}>
          <TextField size="small" fullWidth placeholder="جستجو در نقاط مالی، کد یا نام حساب…" value={search}
            onChange={(event) => setSearch(event.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchOutlinedIcon fontSize="small" /></InputAdornment> }} />
          <Stack direction="row" spacing={0.7} flexWrap="wrap" useFlexGap>
            <Chip size="small" label={`${formatPersianNumber(stats.total)} نقطهٔ مالی`} sx={{ bgcolor: '#fff', border: '1px solid #e2e8f0' }} />
            <Chip size="small" label={`${formatPersianNumber(rows.length ? stats.total - stats.complete : 0)} نیازمند تکمیل`}
              sx={{ bgcolor: '#fff7ed', color: '#b45309', border: '1px solid #fed7aa' }} />
            <Chip size="small" label={accountsLoading ? 'در حال خواندن حساب‌ها…' : `${formatPersianNumber(accounts.length)} حساب معین`}
              sx={{ bgcolor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }} />
          </Stack>
        </Stack>
      </Paper>

      {visibleRows.length === 0 ? (
        <Paper elevation={0} sx={{ p: 5, textAlign: 'center', borderRadius: '15px', border: '1px dashed #cbd5e1' }}>
          <Typography sx={{ color: '#64748b' }}>موردی با این جستجو پیدا نشد.</Typography>
        </Paper>
      ) : (
        <Stack spacing={1}>
          {visibleRows.map((row) => (
            <MappingCard key={row.key} row={row} update={(patch) => updateRow(row.key, patch)}
              accounts={accounts} categories={categories} auxiliaries={auxiliaries}
              sources={sources} modes={modes} />
          ))}
        </Stack>
      )}

      <Alert severity="info" sx={{ mt: 2, borderRadius: '13px', bgcolor: '#f0fdfa', color: '#115e59' }}>
        <Typography sx={{ fontSize: 12, fontWeight: 700 }}>
          راهنما: حساب کل به‌طور خودکار از والد «حساب معین» خوانده می‌شود. برای هر نقطهٔ مالی می‌توانید تا سه تفصیل تعیین کنید؛
          حالت «کنترل سخت» مانع ثبت مالی بدون نگاشت کامل می‌شود و گزینهٔ «الزام تفصیل» در همان نقطه اعمال می‌گردد.
        </Typography>
      </Alert>
    </Box>
  );
};

export default ContractAccountingMappingPage;

