import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Alert, Autocomplete, Box, Button, Chip, CircularProgress, IconButton, InputAdornment,
  MenuItem, Paper, Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import SaveIcon from '@mui/icons-material/Save';
import SendIcon from '@mui/icons-material/Send';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PostAddIcon from '@mui/icons-material/PostAdd';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import SearchIcon from '@mui/icons-material/Search';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import RequestQuoteOutlinedIcon from '@mui/icons-material/RequestQuoteOutlined';
import { formatPersianNumber, toPersianDigits, toEnglishDigits } from '../core/utils/numberUtils';
import JalaliMaskedDateInput from '../core/components/ui/JalaliMaskedDateInput';
import PageHeader from '../core/components/ui/PageHeader';
import CodePickerDialog from '../core/components/ui/CodePickerDialog';
import InfoCard from '../core/components/ui/InfoCard';
import { useDesignTokens } from '../core/context/DesignTokenContext';
import { useModulePalette } from '../core/context/ModulePaletteContext';
import { resolveTableTheme } from '../core/theme/tableStyles';
import { SurfaceCard, ProgressBar } from './accounting/AccountingDashboardUI';
import {
  PAYMENT_METHODS, buildStatementFormData, emptyLine, faSep, fillLines, lineIssues,
  today, totalsOf,
} from './pettyCashExpenseForm';

const ROWS_TO_START = 8;

const CodeInput = ({ code, options, onMatch, onOpenPicker, placeholder = '…', disabled = false, fontSize = 12 }) => {
  const [draft, setDraft] = useState('');
  useEffect(() => { setDraft(code ? String(code) : ''); }, [code]);

  const commit = () => {
    const value = toEnglishDigits(draft).trim();
    if (!value) {
      if (code) onMatch('');
      else setDraft('');
      return;
    }
    const option = options.find((row) => String(row.code) === value);
    if (option) onMatch(option.id);
    else setDraft(code ? String(code) : '');
  };

  return (
    <TextField
      size="small" fullWidth variant="standard" disabled={disabled}
      value={toPersianDigits(draft)}
      onChange={(event) => {
        const next = toEnglishDigits(event.target.value);
        setDraft(next);
        if (!next.trim() && code) onMatch('');
      }}
      onKeyDown={(event) => {
        if (disabled) return;
        if (event.key === ' ') {
          event.preventDefault();
          onOpenPicker();
        } else if (event.key === 'Enter') {
          event.preventDefault();
          commit();
          event.target.blur();
        }
      }}
      onBlur={commit}
      placeholder={placeholder}
      InputProps={{ disableUnderline: true }}
      inputProps={{ style: { textAlign: 'center', fontSize, fontFamily: 'inherit' } }}
    />
  );
};

const AmountField = ({ value, onChange, fontSize = 12, disabled = false }) => (
  <TextField
    size="small" fullWidth type="text" inputMode="decimal" variant="standard"
    disabled={disabled}
    value={faSep(value)}
    onChange={(event) => {
      const english = toEnglishDigits(event.target.value);
      onChange(english.replace(/[^0-9.-]/g, ''));
    }}
    placeholder="۰"
    InputProps={{ disableUnderline: true }}
    inputProps={{ style: { textAlign: 'center', fontSize, fontFamily: 'var(--hrms-table-number-font, inherit)' } }}
  />
);

/** جست‌وجوی یکپارچهٔ فروشنده در طرف‌حساب‌ها و تأمین‌کنندگان. */
const VendorCell = ({ value, onChange, fontSize = 12, disabled = false }) => {
  const [term, setTerm] = useState('');
  const [input, setInput] = useState(value || '');
  useEffect(() => { setInput(value || ''); }, [value]);

  const trimmed = term.trim();
  const enabled = trimmed.length >= 2 && !disabled;
  const { data, isFetching } = useQuery({
    queryKey: ['pc-vendors', trimmed],
    queryFn: () => axiosInstance.get('/petty-cash-expense-statements/vendors/', {
      params: { q: trimmed },
    }).then((response) => response.data),
    enabled,
    staleTime: 60000,
    retry: false,
  });
  const options = Array.isArray(data) ? data : [];

  return (
    <Autocomplete
      freeSolo
      size="small"
      disabled={disabled}
      options={options}
      value={value || null}
      inputValue={input}
      filterOptions={(rows) => rows}
      getOptionLabel={(option) => (typeof option === 'string' ? option : option?.name || '')}
      isOptionEqualToValue={(option, current) => (
        typeof current === 'string' ? option?.name === current : option?.id === current?.id
      )}
      onInputChange={(_event, next, reason) => {
        setInput(next);
        setTerm(next);
        if (reason === 'input' || reason === 'clear') onChange(next);
      }}
      onChange={(_event, next) => {
        const name = typeof next === 'string' ? next : (next?.name || '');
        onChange(name);
        setInput(name);
      }}
      renderOption={(props, option) => (
        <li {...props} key={option.id}>
          <Box sx={{ minWidth: 0, width: '100%' }}>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <Typography noWrap sx={{ fontSize: 12, fontWeight: 800, flex: 1 }}>{option.name}</Typography>
              <Chip size="small" label={option.kind_display}
                sx={{ height: 19, fontSize: 10, fontWeight: 800 }} />
            </Stack>
            <Typography noWrap sx={{ fontSize: 10.5, color: 'text.secondary' }}>
              {[option.code, option.detail, option.phone].filter(Boolean).join(' · ') || '—'}
            </Typography>
          </Box>
        </li>
      )}
      noOptionsText={trimmed.length < 2 ? 'حداقل ۲ حرف بنویسید' : 'موردی یافت نشد'}
      loading={isFetching}
      renderInput={(params) => (
        <TextField
          {...params}
          variant="standard"
          placeholder="فروشنده / طرف حساب"
          InputProps={{
            ...params.InputProps,
            disableUnderline: true,
            startAdornment: (
              <InputAdornment position="start" sx={{ ml: 0.25 }}>
                <SearchIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
              </InputAdornment>
            ),
            endAdornment: (
              <>
                {isFetching ? <CircularProgress size={12} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
          inputProps={{
            ...params.inputProps,
            style: { fontSize, fontFamily: 'inherit', textAlign: 'right', padding: 0 },
          }}
        />
      )}
      sx={{ width: '100%', '& .MuiAutocomplete-inputRoot': { py: 0 } }}
    />
  );
};

const AccessState = ({ canCreate, hasFunds, onBack }) => (
  <Paper elevation={0} sx={{
    p: { xs: 3, md: 5 }, borderRadius: 'var(--hrms-radius-large, 18px)',
    bgcolor: 'var(--hrms-region-card-bg, #fff)', border: 'var(--hrms-border-card, 1px solid #e8edf4)',
    boxShadow: 'var(--hrms-shadow-card, none)', textAlign: 'center',
  }}>
    <Box sx={{
      width: 66, height: 66, mx: 'auto', mb: 2, borderRadius: '20px',
      display: 'grid', placeItems: 'center', color: '#b45309',
      bgcolor: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.22)',
    }}>
      <LockOutlinedIcon sx={{ fontSize: 30 }} />
    </Box>
    <Typography sx={{ fontSize: 18, fontWeight: 900, mb: 1 }}>
      {hasFunds ? 'اجازهٔ ثبت صورت هزینه برای شما فعال نیست' : 'تنخواهی به شما تخصیص داده نشده است'}
    </Typography>
    <Typography sx={{ fontSize: 13, color: 'text.secondary', maxWidth: 640, mx: 'auto', lineHeight: 1.9 }}>
      {hasFunds
        ? 'در «تنظیمات ← تعاریف اولیه ← تنخواه‌داران» گزینهٔ «ثبت صورت هزینه» برای شما خاموش است. برای فعال‌سازی با مدیر سیستم تماس بگیرید.'
        : 'شما در «تنظیمات ← تعاریف اولیه ← تنخواه‌داران» برای هیچ تنخواهی به‌عنوان تنخواه‌دار یا کمک‌تنخواه‌دار ثبت نشده‌اید؛ بنابراین حتی با داشتن مجوز ماژول، تنخواه‌ها و صورت هزینه‌ها برای شما نمایش داده نمی‌شوند.'}
    </Typography>
    <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 2.5 }}>
      <Button variant="contained" startIcon={<ArrowForwardIcon />} onClick={onBack}>
        بازگشت به فهرست
      </Button>
      {canCreate === false && hasFunds ? (
        <Chip size="small" label="دسترسی ثبت: غیرفعال" sx={{ alignSelf: 'center', fontWeight: 800 }} />
      ) : null}
    </Stack>
  </Paper>
);


const PettyCashExpenseNewPage = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const theme = useTheme();
  const { tokens } = useDesignTokens();
  const { getPalette } = useModulePalette();
  const tableTheme = useMemo(() => resolveTableTheme(tokens), [tokens]);

  const accent = getPalette('pettycash')?.accent || tokens.colors?.warning || '#f59e0b';
  const OK = tokens.colors?.success || theme.palette.success.main;
  const WARN = tokens.colors?.warning || theme.palette.warning.main;
  const DANGER = tokens.colors?.danger || theme.palette.error.main;
  const INFO = tokens.colors?.info || theme.palette.info.main;
  const MUTED = tokens.colors?.textSecondary || theme.palette.text.secondary;
  const BORDER = tokens.colors?.border || theme.palette.divider;
  const CARD_RADIUS = 'var(--hrms-radius-large, 18px)';
  const CARD_BG = 'var(--hrms-region-card-bg, #ffffff)';
  const cellFont = Math.max(11.5, Number(tableTheme.cellFontSize) || 12.5);
  const headerFont = Math.max(11.5, Number(tableTheme.headerFontSize) || 13);
  const headerHeight = Math.max(34, Math.min(64, Number(tableTheme.headerHeight) || 40));
  const rowHeight = Math.max(42, Math.min(64, Number(tableTheme.rowHeight) || 44));
  const visibleRows = Math.max(6, Math.min(16, Number(tableTheme.visibleRows) || 10));
  const gridHeight = headerHeight + rowHeight * visibleRows;
  const divider = tableTheme.divider || `1px solid ${BORDER}`;
  const amountColumn = Math.max(118, Math.round(cellFont * 9.5));
  const gridCols = `44px 106px 82px 82px 82px 104px 112px minmax(170px, 1.2fr) minmax(190px, 1.6fr) ${amountColumn}px ${amountColumn}px 48px`;
  const gridMinWidth = 44 + 106 + (82 * 3) + 104 + 112 + 170 + 190 + (amountColumn * 2) + 48;

  const [header, setHeader] = useState({
    fund: '', number: '', date: today(), description: '', project: '', cost_center: '', payment_method: 'cash',
  });
  const [lines, setLines] = useState(() => Array.from({ length: ROWS_TO_START }, emptyLine));
  const [activeRow, setActiveRow] = useState(0);
  const [picker, setPicker] = useState(null);
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState(null);

  const fundsQuery = useQuery({
    queryKey: ['pc-expense-funds'],
    queryFn: () => axiosInstance.get('/petty-cash-funds/', { params: { status: 'active' } })
      .then((response) => response.data),
    staleTime: 30000,
  });
  const accessQuery = useQuery({
    queryKey: ['pc-access-summary'],
    queryFn: () => axiosInstance.get('/petty-cash-settings/access_summary/')
      .then((response) => response.data),
    staleTime: 30000,
  });
  const accountsQuery = useQuery({
    queryKey: ['pc-accounts'],
    queryFn: () => axiosInstance.get('/accounting/accounts/', { params: { kind: 'subsidiary' } })
      .then((response) => response.data),
    staleTime: 120000,
  });
  const auxQuery = useQuery({
    queryKey: ['pc-aux'],
    queryFn: () => axiosInstance.get('/accounting/auxiliary-accounts/')
      .then((response) => response.data),
    staleTime: 120000,
  });
  const projectsQuery = useQuery({
    queryKey: ['pc-projects'],
    queryFn: () => axiosInstance.get('/projects/', { params: { page_size: 300 } })
      .then((response) => response.data),
    staleTime: 120000,
    retry: false,
  });
  const costCentersQuery = useQuery({
    queryKey: ['pc-cost-centers'],
    queryFn: () => axiosInstance.get('/accounting/cost-centers/')
      .then((response) => response.data),
    staleTime: 120000,
    retry: false,
  });

  const asList = (data) => (Array.isArray(data) ? data : data?.results || []);
  const fundList = useMemo(() => asList(fundsQuery.data), [fundsQuery.data]);
  const accountList = useMemo(() => asList(accountsQuery.data)
    .filter((row) => ['asset', 'expense', 'cost_of_sales'].includes(row.account_type_category)),
  [accountsQuery.data]);
  const auxList = useMemo(() => asList(auxQuery.data), [auxQuery.data]);
  const projectList = useMemo(() => asList(projectsQuery.data), [projectsQuery.data]);
  const costCenterList = useMemo(() => asList(costCentersQuery.data), [costCentersQuery.data]);

  const accountById = useMemo(() => new Map(accountList.map((row) => [String(row.id), row])), [accountList]);
  const auxById = useMemo(() => new Map(auxList.map((row) => [String(row.id), row])), [auxList]);
  const costCenterById = useMemo(() => new Map(costCenterList.map((row) => [String(row.id), row])), [costCenterList]);
  const fund = fundList.find((row) => String(row.id) === String(header.fund));

  useEffect(() => {
    if (!header.fund && fundList.length === 1) {
      setHeader((prev) => ({ ...prev, fund: fundList[0].id }));
    }
  }, [fundList, header.fund]);


  const totals = useMemo(() => totalsOf(lines), [lines]);
  const filled = useMemo(() => fillLines(lines), [lines]);
  const issueCount = filled.reduce((sum, line) => sum + (lineIssues(line).length ? 1 : 0), 0);
  const canSave = Boolean(header.fund) && totals.count > 0
    && filled.every((line) => line.account && Number(line.debit) > 0);
  const noFunds = !fundsQuery.isLoading && fundList.length === 0;
  const canCreate = accessQuery.data?.can_create_expense !== false && !noFunds;
  const isLoadingAccess = fundsQuery.isLoading || accessQuery.isLoading;

  const setHeaderField = (key, value) => setHeader((prev) => ({ ...prev, [key]: value }));
  const setLine = (index, key, value) => setLines((prev) => {
    const next = [...prev];
    next[index] = { ...next[index], [key]: value };
    return next;
  });
  const setAccount = (index, accountId) => setLines((prev) => {
    const next = [...prev];
    next[index] = { ...next[index], account: accountId, aux1: '', aux2: '', aux3: '' };
    return next;
  });
  const addRow = () => {
    setLines((prev) => [...prev, emptyLine()]);
    setActiveRow(lines.length);
  };
  const removeRow = (index) => {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_row, rowIndex) => rowIndex !== index)));
    setActiveRow((prev) => Math.max(0, Math.min(prev, lines.length - 2)));
  };

  const pickerOptions = () => {
    if (!picker) return [];
    if (picker.slot === 'account') return accountList;
    if (picker.slot === 'cost_center') return costCenterList;
    const account = accountById.get(String(lines[picker.row]?.account));
    const key = { aux1: 'auxiliary_category_1', aux2: 'auxiliary_category_2', aux3: 'auxiliary_category_3' }[picker.slot];
    const categoryId = account ? account[key] : null;
    return categoryId ? auxList.filter((row) => String(row.category) === String(categoryId)) : [];
  };

  const errorText = (error) => {
    const data = error?.response?.data;
    if (!data) return error?.message || '';
    if (typeof data === 'string') return data;
    if (data.error || data.detail) return data.error || data.detail;
    const parts = [];
    const walk = (value, path = '') => {
      Object.entries(value || {}).forEach(([key, item]) => {
        const label = path ? `${path}.${key}` : key;
        if (Array.isArray(item)) parts.push(`${label}: ${item.map(String).join('، ')}`);
        else if (item && typeof item === 'object') walk(item, label);
        else if (item !== null && item !== undefined && item !== '') parts.push(`${label}: ${item}`);
      });
    };
    walk(data);
    return parts.join(' | ');
  };

  const submit = async (andApply) => {
    setMsg(null);
    setSavedId(null);
    if (!header.fund) { setMsg({ ok: false, text: 'تنخواه را انتخاب کنید.' }); return; }
    if (!filled.length) { setMsg({ ok: false, text: 'حداقل یک ردیف هزینه لازم است.' }); return; }
    if (!canSave) { setMsg({ ok: false, text: 'ردیف‌های ناقص (کد معین یا مبلغ) را تکمیل کنید.' }); return; }
    if (!canCreate) { setMsg({ ok: false, text: 'ثبت صورت هزینه برای شما مجاز نیست.' }); return; }

    const form = buildStatementFormData({ header, lines });
    setSaving(true);
    try {
      const response = await axiosInstance.post('/petty-cash-expense-statements/', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const created = response.data;
      let applyError = '';
      if (andApply && created?.id) {
        try {
          await axiosInstance.post(`/petty-cash-expense-statements/${created.id}/apply/`);
        } catch (error) {
          applyError = errorText(error) || 'ثبت در تنخواه انجام نشد.';
        }
      }
      qc.invalidateQueries({ queryKey: ['petty-expenses'] });
      qc.invalidateQueries({ queryKey: ['pc-expense-funds'] });
      qc.invalidateQueries({ queryKey: ['petty-dashboard'] });
      if (applyError) {
        setSavedId(created?.id || null);
        setMsg({
          ok: false,
          text: `صورت هزینه ذخیره شد (شماره ${created?.number || created?.id}) اما ثبت در تنخواه ناموفق بود: ${applyError}`,
        });
        return;
      }
      navigate('/petty-cash/expenses', {
        state: { flash: andApply ? 'صورت هزینه ذخیره و در تنخواه ثبت شد' : 'صورت هزینه ذخیره شد' },
      });
    } catch (error) {
      setMsg({ ok: false, text: errorText(error) || 'خطا در ذخیرهٔ صورت هزینه' });
    } finally {
      setSaving(false);
    }
  };

  const activeLine = lines[activeRow] || emptyLine();
  const activeAccount = accountById.get(String(activeLine.account));
  const activeAuxes = ['aux1', 'aux2', 'aux3'].map((key) => auxById.get(String(activeLine[key])));
  const headerCostCenter = costCenterById.get(String(header.cost_center));
  const paymentMethods = (fund?.payment_methods?.length
    ? PAYMENT_METHODS.filter((item) => fund.payment_methods.includes(item.value))
    : PAYMENT_METHODS);


  const headerActions = (
    <>
      <Button size="small" startIcon={<ArrowForwardIcon />} variant="outlined"
        onClick={() => navigate('/petty-cash/expenses')}>
        بازگشت
      </Button>
      <Button size="small" startIcon={<SaveIcon />} variant="contained"
        disabled={saving || !canSave || !canCreate} onClick={() => submit(false)}>
        {saving ? <CircularProgress size={16} color="inherit" /> : 'ذخیره پیش‌نویس'}
      </Button>
      <Button size="small" startIcon={<SendIcon />} variant="contained" color="success"
        disabled={saving || !canSave || !canCreate} onClick={() => submit(true)}>
        ذخیره و ثبت در تنخواه
      </Button>
    </>
  );

  const headerNode = (
    <PageHeader
      icon={<PostAddIcon />}
      title="ثبت صورت ریز هزینه"
      subtitle="ثبت هزینه‌های تنخواه با کدینگ حسابداری، فروشنده و پیوست"
      badge={(
        <Stack direction="row" spacing={0.75} useFlexGap alignItems="center">
          <Chip size="small" label={fund ? `تنخواه: ${fund.title}` : 'تنخواه انتخاب نشده'}
            sx={{ height: 24, fontWeight: 800, bgcolor: alpha(accent, 0.10), color: fund ? accent : MUTED }} />
          <Chip size="small" label={`${toPersianDigits(totals.count)} ردیف`} sx={{ height: 24, fontWeight: 800 }} />
        </Stack>
      )}
      sx={{ mb: 1.5, py: 1 }}
      actions={headerActions}
    />
  );

  if (isLoadingAccess) {
    return (
      <Box>
        {headerNode}
        <Paper elevation={0} sx={{ p: 5, textAlign: 'center', borderRadius: CARD_RADIUS, bgcolor: CARD_BG }}>
          <CircularProgress size={26} />
          <Typography sx={{ mt: 1.5, fontSize: 13, color: MUTED }}>در حال بررسی دسترسی تنخواه…</Typography>
        </Paper>
      </Box>
    );
  }

  if (!canCreate) {
    return (
      <Box>
        {headerNode}
        <AccessState canCreate={accessQuery.data?.can_create_expense} hasFunds={fundList.length > 0}
          onBack={() => navigate('/petty-cash/expenses')} />
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 2 }}>
      {headerNode}

      {msg ? (
        <Alert severity={msg.ok ? 'success' : 'error'} onClose={() => setMsg(null)}
          sx={{ mb: 1.25, borderRadius: RADIUS, fontSize: 13 }}>
          {msg.text}
          {savedId ? (
            <Button size="small" sx={{ ml: 1 }} onClick={() => navigate('/petty-cash/expenses')}>
              مشاهدهٔ فهرست
            </Button>
          ) : null}
        </Alert>
      ) : null}


      <Box sx={{
        display: 'grid', gap: 1.5,
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 2.2fr) minmax(280px, 1fr)' },
        mb: 1.5,
      }}>
        <SurfaceCard title="مشخصات صورت هزینه" icon={ReceiptLongIcon} color={accent} sx={{ height: '100%' }}>
          <Box sx={{
            display: 'grid', gap: 1.25,
            gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(3, minmax(0, 1fr))' },
          }}>
            <Autocomplete
              size="small"
              options={fundList}
              getOptionLabel={(option) => `${option.code || ''} — ${option.title || ''}`}
              value={fundList.find((row) => String(row.id) === String(header.fund)) || null}
              onChange={(_event, option) => setHeaderField('fund', option ? option.id : '')}
              isOptionEqualToValue={(a, b) => String(a.id) === String(b.id)}
              renderOption={(props, option) => (
                <li {...props} key={option.id}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 800 }}>
                      {option.code} — {option.title}
                    </Typography>
                    <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>
                      تنخواه‌دار: {option.custodian_name || '—'} · مانده: {formatPersianNumber(option.balance || 0)}
                    </Typography>
                  </Box>
                </li>
              )}
              renderInput={(params) => <TextField {...params} size="small" label="تنخواه" />}
              sx={{ minWidth: 0 }}
            />
            <JalaliMaskedDateInput variant="outlined" label="تاریخ صورت" value={header.date}
              onChange={(value) => setHeaderField('date', value)} sx={{ width: '100%' }} />
            <TextField size="small" label="شماره صورت" value={header.number}
              onChange={(event) => setHeaderField('number', toEnglishDigits(event.target.value))}
              placeholder="خودکار" />
            <Autocomplete
              size="small" options={projectList}
              getOptionLabel={(option) => `${option.code || ''} — ${option.name || ''}`}
              value={projectList.find((row) => String(row.id) === String(header.project)) || null}
              onChange={(_event, option) => setHeaderField('project', option ? option.id : '')}
              isOptionEqualToValue={(a, b) => String(a.id) === String(b.id)}
              renderInput={(params) => <TextField {...params} size="small" label="پروژه" />}
              sx={{ minWidth: 0 }}
            />
            <TextField size="small" select label="روش پرداخت" value={header.payment_method}
              onChange={(event) => setHeaderField('payment_method', event.target.value)}>
              {paymentMethods.map((item) => (
                <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>
              ))}
            </TextField>
            <TextField size="small" label="مرکز هزینه"
              value={headerCostCenter ? `${headerCostCenter.code || ''} ${headerCostCenter.name || ''}` : ''}
              onClick={() => setPicker({ row: -1, slot: 'cost_center' })} placeholder="انتخاب…"
              sx={{ cursor: 'pointer' }} InputProps={{ readOnly: true }} />
            <TextField size="small" label="شرح صورت" value={header.description}
              onChange={(event) => setHeaderField('description', event.target.value)}
              placeholder="موضوع یا علت ثبت صورت هزینه"
              sx={{ gridColumn: { xs: 'auto', sm: '1 / -1', xl: 'span 3' } }} />
          </Box>

          {fund ? (
            <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" alignItems="center" sx={{ mt: 1.5 }}>
              <Chip size="small" icon={<AccountBalanceWalletOutlinedIcon sx={{ fontSize: 14 }} />}
                label={`مانده: ${formatPersianNumber(fund.balance || 0)} ریال`}
                sx={{ height: 24, fontWeight: 800, bgcolor: alpha(OK, 0.10), color: OK }} />
              <Chip size="small" icon={<PaymentsOutlinedIcon sx={{ fontSize: 14 }} />}
                label={`سقف: ${fund.limit ? formatPersianNumber(fund.limit) : '—'}`}
                sx={{ height: 24, fontWeight: 800 }} />
              <Chip size="small" label={`تنخواه‌دار: ${fund.custodian_name || '—'}`}
                sx={{ height: 24, fontWeight: 800, bgcolor: alpha(INFO, 0.10), color: INFO }} />
              <Box sx={{ flex: 1, minWidth: 120 }}>
                <ProgressBar value={fund.usage_percent || 0} color={accent} height={6} />
              </Box>
            </Stack>
          ) : null}
        </SurfaceCard>


        <SurfaceCard title="جمع‌های صورت" icon={InfoOutlinedIcon} color={accent} sx={{ height: '100%' }}>
          <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            <InfoCard icon={<ReceiptLongIcon />} label="مبلغ کل" value={formatPersianNumber(totals.gross)}
              suffix="ریال" color={accent} />
            <InfoCard icon={<AccountBalanceWalletOutlinedIcon />} label="ارزش افزوده"
              value={formatPersianNumber(totals.vat)} suffix="ریال" color={WARN} />
            <InfoCard icon={<RequestQuoteOutlinedIcon />} label="مبلغ خالص"
              value={formatPersianNumber(totals.net)} suffix="ریال" color={OK} />
            <InfoCard icon={<PaymentsOutlinedIcon />} label="مانده تنخواه"
              value={fund ? formatPersianNumber(fund.balance || 0) : '—'} suffix="ریال" color={INFO} />
          </Box>
          <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mt: 1.25 }}>
            <Chip size="small" label={`${toPersianDigits(totals.count)} ردیف`} sx={{ height: 23, fontWeight: 800 }} />
            {issueCount ? (
              <Chip size="small" icon={<WarningAmberIcon sx={{ fontSize: 14 }} />}
                label={`${toPersianDigits(issueCount)} هشدار`}
                sx={{ height: 23, fontWeight: 800, bgcolor: alpha(WARN, 0.12), color: WARN }} />
            ) : (
              <Chip size="small" label="بدون هشدار" sx={{ height: 23, fontWeight: 800, color: OK }} />
            )}
          </Stack>
        </SurfaceCard>
      </Box>


      <SurfaceCard
        title="ردیف‌های هزینه"
        icon={ReceiptLongIcon}
        color={accent}
        contentSx={{ p: 0 }}
        action={(
          <Stack direction="row" spacing={0.75} useFlexGap alignItems="center">
            <Typography sx={{ fontSize: 11.5, color: MUTED, display: { xs: 'none', md: 'block' } }}>
              Space = انتخاب کد · Enter = تأیید
            </Typography>
            {issueCount ? (
              <Chip size="small" icon={<WarningAmberIcon sx={{ fontSize: 14 }} />}
                label={`${toPersianDigits(issueCount)} هشدار`}
                sx={{ height: 23, fontWeight: 800, bgcolor: alpha(WARN, 0.12), color: WARN }} />
            ) : null}
            <Tooltip title="افزودن ردیف">
              <IconButton size="small" sx={{ color: accent }} onClick={addRow}>
                <AddCircleOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="حذف ردیف انتخاب‌شده">
              <IconButton size="small" sx={{ color: DANGER }} onClick={() => removeRow(activeRow)}>
                <RemoveCircleOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        )}
      >
        <Box sx={{ overflow: 'auto', height: gridHeight, bgcolor: CARD_BG }}>
          <Box sx={{ minWidth: gridMinWidth }}>
            <Box sx={{
              display: 'grid', gridTemplateColumns: gridCols, height: headerHeight,
              position: 'sticky', top: 0, zIndex: 3,
              bgcolor: 'var(--hrms-table-header-bg, #f8fafc)', borderBottom: divider,
            }}>
              {['ردیف', 'کد معین', 'تفصیل ۱', 'تفصیل ۲', 'تفصیل ۳', 'شماره فاکتور', 'تاریخ هزینه',
                'فروشنده / طرف حساب', 'شرح هزینه', 'مبلغ کل', 'ارزش افزوده', 'پیوست']
                .map((label, index) => (
                  <Box key={label} sx={{
                    px: 0.75, fontSize: headerFont, fontWeight: Number(tableTheme.header.fontWeight) || 800,
                    color: tableTheme.header.color || theme.palette.text.primary,
                    borderLeft: index ? divider : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {label}
                  </Box>
                ))}
            </Box>

            {lines.map((line, index) => {
              const account = accountById.get(String(line.account));
              const slots = [
                { key: 'aux1', catId: account?.auxiliary_category_1 },
                { key: 'aux2', catId: account?.auxiliary_category_2 },
                { key: 'aux3', catId: account?.auxiliary_category_3 },
              ];
              const issues = lineIssues(line);
              return (
                <Box
                  key={index}
                  onClick={() => setActiveRow(index)}
                  sx={{
                    display: 'grid', gridTemplateColumns: gridCols, alignItems: 'center',
                    minHeight: rowHeight, borderBottom: divider,
                    bgcolor: activeRow === index ? alpha(accent, 0.08) : 'transparent',
                    boxShadow: activeRow === index ? `inset -3px 0 0 ${accent}` : 'none',
                    '&:hover': {
                      bgcolor: activeRow === index ? alpha(accent, 0.12) : tableTheme.hoverBg,
                    },
                    transition: 'background-color .12s ease',
                  }}
                >
                  <Stack alignItems="center" justifyContent="center" spacing={0.1}>
                    {issues.length ? (
                      <Tooltip title={issues.map((item) => item.text).join(' · ')}>
                        <WarningAmberIcon sx={{
                          fontSize: 13,
                          color: issues.some((item) => item.hard) ? DANGER : WARN,
                          cursor: 'help',
                        }} />
                      </Tooltip>
                    ) : null}
                    <Typography sx={{
                      fontSize: cellFont, fontWeight: 800,
                      color: activeRow === index ? accent : MUTED,
                    }}>
                      {toPersianDigits(index + 1)}
                    </Typography>
                  </Stack>

                  <Box sx={{ px: 0.4, minWidth: 0 }}>
                    <Tooltip title="کد معین (Space برای انتخاب)">
                      <Box>
                        <CodeInput
                          code={account?.code || ''}
                          options={accountList}
                          onMatch={(value) => setAccount(index, value)}
                          onOpenPicker={() => setPicker({ row: index, slot: 'account' })}
                          fontSize={cellFont}
                        />
                      </Box>
                    </Tooltip>
                  </Box>

                  {slots.map((slot) => (
                    <Box key={slot.key} sx={{ px: 0.4, minWidth: 0 }}>
                      <Tooltip title={slot.catId ? 'تفصیل (Space برای انتخاب)' : 'ابتدا کد معین را انتخاب کنید'}>
                        <Box>
                          <CodeInput
                            code={auxById.get(String(line[slot.key]))?.code || ''}
                            options={auxList.filter((row) => String(row.category) === String(slot.catId))}
                            onMatch={(value) => setLine(index, slot.key, value)}
                            onOpenPicker={() => slot.catId && setPicker({ row: index, slot: slot.key })}
                            placeholder={slot.catId ? '…' : '—'}
                            disabled={!slot.catId}
                            fontSize={cellFont}
                          />
                        </Box>
                      </Tooltip>
                    </Box>
                  ))}


                  <Box sx={{ px: 0.4, minWidth: 0 }}>
                    <TextField size="small" fullWidth variant="standard" value={line.invoice_number}
                      onChange={(event) => setLine(index, 'invoice_number', toEnglishDigits(event.target.value))}
                      placeholder="شماره فاکتور"
                      InputProps={{ disableUnderline: true }}
                      inputProps={{ style: { textAlign: 'center', fontSize: cellFont, fontFamily: 'inherit' } }} />
                  </Box>
                  <Box sx={{ px: 0.4, minWidth: 0 }}>
                    <JalaliMaskedDateInput value={line.expense_date}
                      onChange={(value) => setLine(index, 'expense_date', value)}
                      sx={{ '& .MuiInputBase-input': { fontSize: cellFont, textAlign: 'center' } }} />
                  </Box>
                  <Box sx={{ px: 0.4, minWidth: 0 }}>
                    <VendorCell value={line.supplier} fontSize={cellFont}
                      onChange={(value) => setLine(index, 'supplier', value)} />
                  </Box>
                  <Box sx={{ px: 0.4, minWidth: 0 }}>
                    <TextField size="small" fullWidth variant="standard" value={line.desc}
                      onChange={(event) => setLine(index, 'desc', event.target.value)}
                      placeholder="شرح هزینه"
                      InputProps={{ disableUnderline: true }}
                      inputProps={{ style: { textAlign: 'right', fontSize: cellFont, fontFamily: 'inherit' } }} />
                  </Box>
                  <Box sx={{ px: 0.4, minWidth: 0 }}>
                    <AmountField value={line.debit} fontSize={cellFont}
                      onChange={(value) => setLine(index, 'debit', value)} />
                  </Box>
                  <Box sx={{ px: 0.4, minWidth: 0 }}>
                    <AmountField value={line.vat_amount} fontSize={cellFont}
                      onChange={(value) => setLine(index, 'vat_amount', value)} />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <input type="file" hidden id={`pc-att-${index}`}
                      onChange={(event) => setLine(index, 'attachment', event.target.files?.[0] || null)} />
                    <Tooltip title={line.attachment ? line.attachment.name : 'پیوست فاکتور/رسید'}>
                      <IconButton size="small" component="label" htmlFor={`pc-att-${index}`}
                        color={line.attachment ? 'success' : 'default'}>
                        <AttachFileIcon sx={{ fontSize: 17 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>

        <Box sx={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1,
          px: 1.5, py: 1, borderTop: divider, bgcolor: CARD_BG,
        }}>
          <Typography sx={{ fontSize: 12, fontWeight: 800, color: MUTED }}>جمع ردیف‌ها:</Typography>
          <Chip size="small" label={`${toPersianDigits(totals.count)} ردیف`} sx={{ height: 23, fontWeight: 800 }} />
          <Chip size="small" label={`کل: ${formatPersianNumber(totals.gross)}`} sx={{ height: 23, fontWeight: 800 }} />
          <Chip size="small" label={`ارزش افزوده: ${formatPersianNumber(totals.vat)}`}
            sx={{ height: 23, fontWeight: 800 }} />
          <Chip size="small" label={`خالص: ${formatPersianNumber(totals.net)}`}
            sx={{ height: 23, fontWeight: 900, bgcolor: alpha(OK, 0.12), color: OK }} />
          <Box sx={{ flex: 1 }} />
          {issueCount ? (
            <Typography sx={{ fontSize: 11.5, color: WARN }}>
              {toPersianDigits(issueCount)} ردیف نیاز به بررسی دارد
            </Typography>
          ) : null}
        </Box>
      </SurfaceCard>


      <SurfaceCard title="ردیف انتخاب‌شده" icon={InfoOutlinedIcon} color={accent} sx={{ mt: 1.5 }}>
        <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" alignItems="center">
          <Chip size="small" label={`ردیف ${toPersianDigits(activeRow + 1)}`}
            sx={{ height: 23, fontWeight: 800, bgcolor: alpha(accent, 0.10), color: accent }} />
          <Chip size="small" label={activeAccount ? `${activeAccount.code} — ${activeAccount.name}` : 'کد معین: —'}
            sx={{ height: 23, fontWeight: 700 }} />
          {['تفصیل ۱', 'تفصیل ۲', 'تفصیل ۳'].map((label, index) => (
            <Chip key={label} size="small"
              label={`${label}: ${activeAuxes[index] ? activeAuxes[index].name : '—'}`}
              sx={{ height: 23, fontWeight: 700, color: activeAuxes[index] ? OK : MUTED }} />
          ))}
          <Chip size="small"
            label={`مرکز هزینه: ${headerCostCenter ? headerCostCenter.name : '—'}`}
            sx={{ height: 23, fontWeight: 700, color: headerCostCenter ? INFO : MUTED }} />
          <Chip size="small" label={`مبلغ ردیف: ${formatPersianNumber(Number(activeLine.debit) || 0)}`}
            sx={{ height: 23, fontWeight: 800 }} />
        </Stack>
      </SurfaceCard>

      <CodePickerDialog
        open={Boolean(picker)}
        title={picker?.slot === 'account'
          ? 'انتخاب کد معین'
          : picker?.slot === 'cost_center' ? 'انتخاب مرکز هزینه' : 'انتخاب تفصیل'}
        options={pickerOptions()}
        color={accent}
        onClose={() => setPicker(null)}
        onSelect={(option) => {
          if (!picker) return;
          if (picker.row < 0) setHeaderField('cost_center', option.id);
          else if (picker.slot === 'account') setAccount(picker.row, option.id);
          else setLine(picker.row, picker.slot, option.id);
          setPicker(null);
        }}
      />
    </Box>
  );
};

export default PettyCashExpenseNewPage;

