import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Autocomplete, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Grid, MenuItem, Paper, Stack, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TextField, Typography, alpha,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PaymentsIcon from '@mui/icons-material/Payments';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import axiosInstance from '../core/api/axiosConfig';
import PageHeader from '../core/components/ui/PageHeader';
import MoneyInput from '../core/components/ui/MoneyInput';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';
import { KpiTile, MUTED } from './accounting/AccountingDashboardUI';
import { formatPersianNumber } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';

const ACCENT = '#0f766e';
const BLUE = '#2563eb';
const AMBER = '#b45309';
const VIOLET = '#7c3aed';

const KINDS = [
  { value: 'initial', label: 'مبلغ اولیهٔ تنخواه' },
  { value: 'advance', label: 'علی‌الحساب' },
  { value: 'recharge', label: 'شارژ مجدد' },
  { value: 'other', label: 'سایر' },
];

const METHODS = [
  { value: 'cash', label: 'نقدی' },
  { value: 'deposit', label: 'واریز به حساب' },
  { value: 'sheba', label: 'شبا / انتقال بین‌بانکی' },
  { value: 'card', label: 'کارت‌خوان / کارت' },
  { value: 'cheque', label: 'چک' },
  { value: 'other', label: 'سایر' },
];

const KIND_LABEL = Object.fromEntries(KINDS.map((item) => [item.value, item.label]));
const METHOD_LABEL = Object.fromEntries(METHODS.map((item) => [item.value, item.label]));
const METHOD_COLOR = {
  cash: '#0f766e', deposit: '#2563eb', sheba: '#7c3aed',
  card: '#b45309', cheque: '#be123c', other: '#64748b',
};

const todayIso = () => new Date().toISOString().slice(0, 10);
const money = (value) => `${formatPersianNumber(Number(value) || 0)} ریال`;
const dateLabel = (value) => (value ? toJalali(String(value).slice(0, 10)) : '—');

const emptyForm = () => ({
  fund: '',
  kind: 'initial',
  method: 'cash',
  amount: '',
  payment_date: todayIso(),
  destination_entity: null,
  destination_name: '',
  destination_account: '',
  reference: '',
  description: '',
});

const asList = (payload) => (Array.isArray(payload) ? payload : payload?.results || []);

/** پرداخت‌های تنخواه: ثبت پرداخت اولیه/علی‌الحساب/شارژ با تفکیک روش و حساب مقصد. */
const PettyCashPaymentsPage = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [fundFilter, setFundFilter] = useState('all');
  const [kindFilter, setKindFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState(null);

  const paymentsQuery = useQuery({
    queryKey: ['pc-payments', search, fundFilter, kindFilter, methodFilter],
    queryFn: () => axiosInstance.get('/petty-cash-payments/', {
      params: {
        search: search.trim() || undefined,
        fund: fundFilter !== 'all' ? fundFilter : undefined,
        kind: kindFilter !== 'all' ? kindFilter : undefined,
        method: methodFilter !== 'all' ? methodFilter : undefined,
        page_size: 200,
      },
    }).then((response) => response.data),
    staleTime: 30_000,
  });

  const fundsQuery = useQuery({
    queryKey: ['pc-payment-funds'],
    queryFn: () => axiosInstance.get('/petty-cash-funds/', {
      params: { page_size: 500, status: 'active' },
    }).then((response) => response.data),
    staleTime: 60_000,
  });

  const entitiesQuery = useQuery({
    queryKey: ['pc-payment-destination-entities'],
    queryFn: () => axiosInstance.get('/treasury/treasury-entities/', {
      params: { page_size: 500 },
    }).then((response) => response.data),
    staleTime: 120_000,
    retry: false,
  });

  const payments = asList(paymentsQuery.data);
  const funds = asList(fundsQuery.data);
  const entities = asList(entitiesQuery.data);
  const selectedFund = funds.find((fund) => String(fund.id) === String(form.fund));

  const summary = useMemo(() => {
    const month = new Date().toISOString().slice(0, 7);
    return {
      count: payments.length,
      total: payments.reduce((sum, row) => sum + Number(row.amount || 0), 0),
      month: payments.filter((row) => String(row.payment_date || '').startsWith(month))
        .reduce((sum, row) => sum + Number(row.amount || 0), 0),
      funds: new Set(payments.map((row) => row.fund).filter(Boolean)).size,
    };
  }, [payments]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['pc-payments'] });
    qc.invalidateQueries({ queryKey: ['petty-cash-funds'] });
    qc.invalidateQueries({ queryKey: ['petty-cash-transactions'] });
    qc.invalidateQueries({ queryKey: ['pc-expense-funds'] });
  };

  const save = useMutation({
    mutationFn: () => axiosInstance.post('/petty-cash-payments/', {
      fund: Number(form.fund),
      kind: form.kind,
      method: form.method,
      amount: Number(form.amount) || 0,
      payment_date: form.payment_date,
      destination_entity: form.destination_entity?.id || null,
      destination_name: form.destination_entity?.name || form.destination_name,
      destination_account: form.destination_entity?.sheba_number
        || form.destination_entity?.account_number || form.destination_account,
      reference: form.reference,
      description: form.description,
    }),
    onSuccess: () => {
      refresh();
      setOpen(false);
      setForm(emptyForm());
      setMessage({ type: 'success', text: 'پرداخت تنخواه ثبت و به دفتر تنخواه اضافه شد.' });
    },
    onError: (error) => {
      const data = error?.response?.data;
      const first = typeof data === 'string' ? data : data && Object.values(data).flat()[0];
      setMessage({ type: 'error', text: typeof first === 'string' ? first : 'ثبت پرداخت انجام نشد.' });
    },
  });

  const set = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));

  const resetFilters = () => {
    setSearch('');
    setFundFilter('all');
    setKindFilter('all');
    setMethodFilter('all');
  };

  const submit = () => {
    if (!form.fund) {
      setMessage({ type: 'error', text: 'تنخواه را انتخاب کنید.' });
      return;
    }
    if (!form.payment_date) {
      setMessage({ type: 'error', text: 'تاریخ پرداخت را وارد کنید.' });
      return;
    }
    if (!(Number(form.amount) > 0)) {
      setMessage({ type: 'error', text: 'مبلغ پرداخت باید بزرگ‌تر از صفر باشد.' });
      return;
    }
    setMessage(null);
    save.mutate();
  };


  return (
    <Box>
      <PageHeader
        icon={<PaymentsIcon />}
        title="پرداخت‌های تنخواه"
        subtitle="ثبت و تفکیک پرداخت وجه تنخواه (اولیه، علی‌الحساب و شارژ) بر اساس روش پرداخت و حساب مقصد"
        actions={(
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}
            sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#115e59' } }}>
            پرداخت جدید
          </Button>
        )}
      />

      {message ? (
        <Alert severity={message.type} sx={{ mb: 1.5, borderRadius: '12px' }}
          onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      ) : null}

      <Box sx={{
        display: 'grid', gap: 1, mb: 1.5,
        gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' },
      }}>
        <KpiTile icon={ReceiptLongIcon} label="تعداد پرداخت" value={formatPersianNumber(summary.count)}
          color={ACCENT} />
        <KpiTile icon={PaymentsIcon} label="جمع پرداخت‌ها" value={formatPersianNumber(summary.total)}
          suffix="ریال" color={BLUE} />
        <KpiTile icon={AccountBalanceWalletIcon} label="پرداخت این ماه"
          value={formatPersianNumber(summary.month)} suffix="ریال" color={AMBER} />
        <KpiTile icon={AccountBalanceIcon} label="تنخواه‌های دارای پرداخت"
          value={formatPersianNumber(summary.funds)} color={VIOLET} />
      </Box>

      <Paper elevation={0} sx={{ p: 1.25, mb: 1.5, borderRadius: '16px', border: '1px solid', borderColor: 'divider' }}>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
          <TextField size="small" label="جست‌وجو" value={search}
            onChange={(event) => setSearch(event.target.value)} sx={{ minWidth: 220 }} />
          <TextField select size="small" label="تنخواه" value={fundFilter}
            onChange={(event) => setFundFilter(event.target.value)} sx={{ minWidth: 190 }}>
            <MenuItem value="all">همهٔ تنخواه‌های من</MenuItem>
            {funds.map((fund) => (
              <MenuItem key={fund.id} value={fund.id}>{fund.title} ({fund.code})</MenuItem>
            ))}
          </TextField>
          <TextField select size="small" label="نوع پرداخت" value={kindFilter}
            onChange={(event) => setKindFilter(event.target.value)} sx={{ minWidth: 165 }}>
            <MenuItem value="all">همه</MenuItem>
            {KINDS.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="روش پرداخت" value={methodFilter}
            onChange={(event) => setMethodFilter(event.target.value)} sx={{ minWidth: 165 }}>
            <MenuItem value="all">همه</MenuItem>
            {METHODS.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}
          </TextField>
          <Box sx={{ flex: 1 }} />
          <Button size="small" onClick={resetFilters}>حذف فیلترها</Button>
        </Stack>
      </Paper>


      <Paper elevation={0} sx={{ overflow: 'hidden', borderRadius: '16px', border: '1px solid', borderColor: 'divider' }}>
        {paymentsQuery.isLoading ? (
          <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress size={24} /></Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 900, fontSize: 11, bgcolor: alpha(ACCENT, 0.06) } }}>
                  <TableCell>شماره</TableCell>
                  <TableCell>تاریخ پرداخت</TableCell>
                  <TableCell>تنخواه / تنخواه‌دار</TableCell>
                  <TableCell>نوع</TableCell>
                  <TableCell>روش</TableCell>
                  <TableCell>مبلغ</TableCell>
                  <TableCell>حساب مقصد</TableCell>
                  <TableCell>پیگیری</TableCell>
                  <TableCell>ثبت‌کننده</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {payments.length ? payments.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell sx={{ fontSize: 11.5, fontWeight: 800 }}>{row.number || `#${row.id}`}</TableCell>
                    <TableCell sx={{ fontSize: 11.5 }}>{dateLabel(row.payment_date)}</TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 11.5, fontWeight: 800 }}>{row.fund_title}</Typography>
                      <Typography sx={{ fontSize: 10.5, color: MUTED }}>
                        {row.custodian_name || row.fund_code || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={KIND_LABEL[row.kind] || row.kind_display || row.kind}
                        sx={{ height: 21, fontSize: 10.5, bgcolor: alpha(AMBER, 0.1), color: AMBER }} />
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={METHOD_LABEL[row.method] || row.method_display || row.method}
                        sx={{
                          height: 21, fontSize: 10.5,
                          bgcolor: alpha(METHOD_COLOR[row.method] || MUTED, 0.1),
                          color: METHOD_COLOR[row.method] || MUTED,
                        }} />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, fontWeight: 900, color: ACCENT }}>{money(row.amount)}</TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 11.5, fontWeight: 700 }}>
                        {row.destination_entity_name || row.destination_name || '—'}
                      </Typography>
                      <Typography sx={{ fontSize: 10.5, color: MUTED, direction: 'ltr' }}>
                        {row.destination_entity_account || row.destination_account || ''}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontSize: 11.5 }}>{row.reference || '—'}</TableCell>
                    <TableCell sx={{ fontSize: 11 }}>{row.paid_by_name || '—'}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 5 }}>
                      <Typography sx={{ fontSize: 12.5, color: MUTED }}>
                        برای تنخواه‌های شما پرداختی ثبت نشده است.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>


      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle sx={{ fontSize: 15, fontWeight: 900, color: ACCENT }}>
          ثبت پرداخت تنخواه
        </DialogTitle>
        <DialogContent dividers>
          <Alert severity="info" sx={{ mb: 1.5, borderRadius: '10px', fontSize: 11.5 }}>
            این پرداخت به‌عنوان دریافت وجه در دفتر تنخواه ثبت می‌شود. فقط تنخواه‌های مجاز شما در فهرست است.
          </Alert>
          <Grid container spacing={1.25}>
            <Grid item xs={12} md={6}>
              <TextField select fullWidth size="small" label="تنخواه *" value={form.fund}
                onChange={(event) => set('fund', event.target.value)}>
                <MenuItem value="">—</MenuItem>
                {funds.map((fund) => (
                  <MenuItem key={fund.id} value={fund.id}>
                    {fund.title} — {fund.code} ({fund.custodian_name})
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField select fullWidth size="small" label="نوع پرداخت" value={form.kind}
                onChange={(event) => set('kind', event.target.value)}>
                {KINDS.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField select fullWidth size="small" label="روش پرداخت *" value={form.method}
                onChange={(event) => set('method', event.target.value)}>
                {METHODS.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <MoneyInput size="small" fullWidth allowDecimals={false} label="مبلغ (ریال) *"
                value={form.amount} onChange={(value) => set('amount', value)} />
            </Grid>
            <Grid item xs={12} md={4}>
              <JalaliDatePicker fullWidth label="تاریخ پرداخت *" value={form.payment_date}
                onChange={(value) => set('payment_date', value)} />
            </Grid>

            <Grid item xs={12}>
              <Autocomplete
                size="small"
                options={entities}
                value={form.destination_entity}
                onChange={(_event, value) => {
                  setForm((previous) => ({
                    ...previous,
                    destination_entity: value,
                    destination_name: value?.name || previous.destination_name,
                    destination_account: value?.sheba_number || value?.account_number || previous.destination_account,
                  }));
                }}
                getOptionLabel={(option) => {
                  if (!option) return '';
                  return `${option.name}${option.account_number ? ` — ${option.account_number}` : ''}`;
                }}
                isOptionEqualToValue={(option, value) => option?.id === value?.id}
                renderInput={(params) => (
                  <TextField {...params} label="حساب مقصد (بانک / صندوق خزانه)"
                    placeholder="در صورت نیاز به تفکیک حساب انتخاب کنید" />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" label="نام حساب / بانک / صندوق" value={form.destination_name}
                onChange={(event) => set('destination_name', event.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" label="شماره حساب / شبا / شناسه" value={form.destination_account}
                onChange={(event) => set('destination_account', event.target.value)}
                inputProps={{ dir: 'ltr' }} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" label="شماره پیگیری / فیش / سند" value={form.reference}
                onChange={(event) => set('reference', event.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField fullWidth size="small" label="تنخواه‌دار" value={selectedFund?.custodian_name || ''}
                disabled />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" multiline minRows={2} label="توضیحات"
                value={form.description} onChange={(event) => set('description', event.target.value)} />
            </Grid>
          </Grid>
          {entitiesQuery.isError ? (
            <Alert severity="warning" sx={{ mt: 1.25, borderRadius: '10px', fontSize: 11.5 }}>
              فهرست حساب‌های خزانه در دسترس نیست؛ نام و شماره حساب را دستی وارد کنید.
            </Alert>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.25 }}>
          <Button onClick={() => setOpen(false)}>انصراف</Button>
          <Button variant="contained" onClick={submit} disabled={save.isPending}
            startIcon={save.isPending ? <CircularProgress size={15} sx={{ color: '#fff' }} /> : <PaymentsIcon />}
            sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#115e59' } }}>
            {save.isPending ? 'در حال ثبت…' : 'ثبت پرداخت'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PettyCashPaymentsPage;

