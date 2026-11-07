import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Autocomplete, Box, Button, Chip, CircularProgress, Divider, FormControlLabel,
  MenuItem, Paper, Stack, Tab, Tabs, TextField, Tooltip, Typography, Switch,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import RefreshIcon from '@mui/icons-material/Refresh';
import SaveIcon from '@mui/icons-material/Save';
import axiosInstance from '../../core/api/axiosConfig';
import PageHeader from '../../core/components/ui/PageHeader';
import JalaliMaskedDateInput from '../../core/components/ui/JalaliMaskedDateInput';
import { ModuleTable, useModuleTheme, useRowHeight } from '../contracts/contractModuleUi';
import { formatPersianNumber } from '../../core/utils/numberUtils';
import { asList, chipSx, dateLabel, moneyLabel, useTreasuryTheme } from './treasuryMasterUi';
import TreasuryVoucherDialog from './TreasuryVoucherDialog';

const API = '/treasury/treasury-transactions/';

const INSTRUMENTS = [
  { value: 'cash', label: 'نقدی' },
  { value: 'cheque', label: 'چک' },
  { value: 'sheba', label: 'شبا / حواله' },
  { value: 'bill', label: 'سند / برات' },
  { value: 'pos', label: 'کارت‌خوان' },
  { value: 'other', label: 'سایر' },
];

const STATUS_COLOR = { draft: '#b45309', posted: '#0f766e', cancelled: '#be123c' };

const EMPTY_FORM = {
  date: new Date().toISOString().slice(0, 10),
  instrument_kind: 'cash',
  party: '',
  party_national_id: '',
  cheque_number: '',
  cheque_due_date: '',
  is_guarantee: false,
  invoice_number: '',
  invoice_date: '',
  invoice_amount: '',
  amount: '',
  description: '',
  debit_account: '',
  reference_no: '',
  tracking_no: '',
};

const VoucherBookPage = () => {
  const moduleTheme = useTreasuryTheme();
  const tableTheme = useModuleTheme();
  const qc = useQueryClient();
  const [direction, setDirection] = useState('receipt');
  const [entityId, setEntityId] = useState('');
  const [instrument, setInstrument] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [voucher, setVoucher] = useState(null);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  const balancesQuery = useQuery({
    queryKey: ['treasury-entity-balances'],
    queryFn: () => axiosInstance.get('/treasury/treasury-entities/balances/')
      .then((response) => response.data),
    staleTime: 60_000,
  });
  const entities = asList(balancesQuery.data);
  const currentEntity = entities.find((row) => String(row.id) === String(entityId));

  const listQuery = useQuery({
    queryKey: ['treasury-voucher-book', direction, entityId, instrument, dateFrom, dateTo, search],
    queryFn: () => axiosInstance.get(API, {
      params: {
        direction,
        entity: entityId || undefined,
        instrument_kind: instrument || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        search: search || undefined,
        page_size: 200,
        ordering: '-date',
      },
    }).then((response) => response.data),
    staleTime: 20_000,
  });
  const rows = asList(listQuery.data);

  const numberingQuery = useQuery({
    queryKey: ['treasury-numbering'],
    queryFn: () => axiosInstance.get('/treasury/numbering/').then((response) => response.data),
    staleTime: 60_000,
  });
  const nextSerial = numberingQuery.data?.preview?.[direction] || '—';

  const accountsQuery = useQuery({
    queryKey: ['accounting-accounts-select'],
    queryFn: () => axiosInstance.get('/accounting/accounts/', { params: { page_size: 300 } })
      .then((response) => response.data),
    staleTime: 300_000,
  });
  const accounts = asList(accountsQuery.data);

  const { ref: tableRef, rowHeight, tableHeight } = useRowHeight(
    tableTheme.tableTheme, Math.max(1, rows.length),
  );

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['treasury-voucher-book'] });
    qc.invalidateQueries({ queryKey: ['treasury-entity-balances'] });
    qc.invalidateQueries({ queryKey: ['treasury-numbering'] });
  };

  const resetForm = () => {
    setSelected(null);
    setForm(EMPTY_FORM);
    setError('');
  };

  const selectRow = (row) => {
    setSelected(row);
    setForm({
      date: row.date,
      instrument_kind: row.instrument_kind || 'cash',
      party: row.party || '',
      party_national_id: row.party_national_id || '',
      cheque_number: row.cheque_number || '',
      cheque_due_date: row.cheque_due_date || '',
      is_guarantee: Boolean(row.is_guarantee),
      invoice_number: row.invoice_number || '',
      invoice_date: row.invoice_date || '',
      invoice_amount: row.invoice_amount ?? '',
      amount: row.amount,
      description: row.description || '',
      debit_account: row.debit_account || '',
      reference_no: row.reference_no || '',
      tracking_no: row.tracking_no || '',
    });
    setError('');
  };

  const payload = () => ({
    entity: entityId,
    direction,
    date: form.date,
    instrument_kind: form.instrument_kind,
    party: form.party,
    party_national_id: form.party_national_id,
    cheque_number: form.instrument_kind === 'cheque' ? form.cheque_number : '',
    cheque_due_date: form.instrument_kind === 'cheque' ? form.cheque_due_date || null : null,
    is_guarantee: Boolean(form.is_guarantee),
    invoice_number: form.invoice_number,
    invoice_date: form.invoice_date || null,
    invoice_amount: form.invoice_amount || null,
    amount: form.amount,
    description: form.description,
    debit_account: form.debit_account || null,
    reference_no: form.reference_no,
    tracking_no: form.tracking_no,
  });

  const save = useMutation({
    mutationFn: () => (selected
      ? axiosInstance.patch(`${API}${selected.id}/`, payload())
      : axiosInstance.post(API, payload())),
    onSuccess: (response) => {
      refresh();
      setSelected(response.data);
      setToast(selected ? 'سند اصلاح شد.' : `سند ${response.data.number} ثبت شد.`);
      setError('');
    },
    onError: (err) => setError(
      err?.response?.data?.detail
      || Object.values(err?.response?.data || {}).flat().join(' · ')
      || 'ذخیرهٔ سند انجام نشد.',
    ),
  });

  const post = useMutation({
    mutationFn: (row) => axiosInstance.post(`${API}${row.id}/post_transaction/`),
    onSuccess: () => { refresh(); setToast('سند ثبت و در ماندهٔ حساب اعمال شد.'); },
    onError: (err) => setError(err?.response?.data?.error || 'ثبت سند انجام نشد.'),
  });

  const cancel = useMutation({
    mutationFn: (row) => axiosInstance.post(`${API}${row.id}/cancel/`, {
      reason: 'ابطال از دفتر اسناد',
    }),
    onSuccess: () => { refresh(); setToast('سند ابطال شد (حذف فیزیکی انجام نمی‌شود).'); },
    onError: (err) => setError(err?.response?.data?.error || 'ابطال سند انجام نشد.'),
  });

  const setField = (name, value) => setForm((previous) => ({ ...previous, [name]: value }));


  const columns = useMemo(() => ([
    {
      key: 'number',
      label: 'سریال',
      width: '13%',
      render: (row) => (
        <Box sx={{ minWidth: 0 }}>
          <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 800 }}>
            {row.number || `#${row.id}`}
          </Typography>
          <Typography noWrap sx={{ fontSize: 9.5, opacity: 0.65 }}>
            {row.entity_code} — {row.entity_name}
          </Typography>
        </Box>
      ),
    },
    { key: 'date', label: 'تاریخ', width: '10%', render: (row) => dateLabel(row.date) },
    {
      key: 'party',
      label: direction === 'receipt' ? 'دریافت‌کننده' : 'پرداخت‌کننده',
      width: '18%',
      render: (row) => row.party || '—',
    },
    {
      key: 'instrument',
      label: 'نوع سند',
      width: '10%',
      align: 'center',
      render: (row) => (
        <Chip size="small" label={row.instrument_kind_display || '—'}
          sx={chipSx(row.instrument_kind === 'cheque' ? '#8b5cf6' : '#0ea5e9')} />
      ),
    },
    { key: 'cheque', label: 'شماره چک', width: '10%', render: (row) => row.cheque_number || '—' },
    { key: 'due', label: 'سررسید', width: '9%', render: (row) => dateLabel(row.cheque_due_date) },
    { key: 'national', label: 'شناسه/کد ملی', width: '10%', render: (row) => row.party_national_id || '—' },
    { key: 'invoice', label: 'فاکتور', width: '8%', render: (row) => row.invoice_number || '—' },
    {
      key: 'amount',
      label: 'مبلغ',
      width: '12%',
      align: 'center',
      render: (row) => (
        <Typography sx={{ fontSize: 11.5, fontWeight: 900 }}>
          {moneyLabel(row.amount)}
        </Typography>
      ),
    },
    {
      key: 'status',
      label: 'وضعیت',
      width: '9%',
      align: 'center',
      render: (row) => (
        <Chip size="small" label={row.status_display}
          sx={chipSx(STATUS_COLOR[row.status] || '#64748b')} />
      ),
    },
    {
      key: 'actions',
      label: 'عملیات',
      width: '11%',
      align: 'center',
      render: (row) => (
        <Stack direction="row" spacing={0.2} justifyContent="center">
          <Tooltip title="ویرایش">
            <Button size="small" sx={{ minWidth: 0, p: 0.4 }} onClick={() => selectRow(row)}>
              <EditOutlinedIcon sx={{ fontSize: 15 }} />
            </Button>
          </Tooltip>
          <Tooltip title="ثبت سند">
            <span>
              <Button size="small" sx={{ minWidth: 0, p: 0.4 }}
                disabled={row.status !== 'draft' || post.isPending}
                onClick={() => post.mutate(row)}>
                <PlayCircleOutlineIcon sx={{ fontSize: 15 }} />
              </Button>
            </span>
          </Tooltip>
          <Tooltip title="چاپ رسید">
            <Button size="small" sx={{ minWidth: 0, p: 0.4 }}
              onClick={() => setVoucher(`${API}${row.id}/print-data/`)}>
              <PrintOutlinedIcon sx={{ fontSize: 15 }} />
            </Button>
          </Tooltip>
          <Tooltip title="ابطال">
            <span>
              <Button size="small" sx={{ minWidth: 0, p: 0.4, color: '#be123c' }}
                disabled={row.status !== 'draft' || cancel.isPending}
                onClick={() => cancel.mutate(row)}>
                <CancelOutlinedIcon sx={{ fontSize: 15 }} />
              </Button>
            </span>
          </Tooltip>
        </Stack>
      ),
    },
  ]), [direction, post.isPending, cancel.isPending]); // eslint-disable-line


  const accountOptions = accounts.map((account) => ({
    value: account.id,
    label: `${account.code} — ${account.name}`,
  }));
  const selectedAccount = accountOptions.find(
    (option) => String(option.value) === String(form.debit_account),
  ) || null;

  return (
    <Box>
      <PageHeader
        icon={<ReceiptLongIcon />}
        title="دفتر اسناد دریافت و پرداخت"
        subtitle="ثبت سند نقدی/چک/شبا، شماره‌گذاری خودکار، ثبت در مانده و چاپ رسید"
        badge={(
          <Chip size="small"
            label={currentEntity ? `موجودی: ${formatPersianNumber(currentEntity.balance)}` : 'حساب را انتخاب کنید'}
            sx={chipSx(moduleTheme.accent)} />
        )}
        actions={(
          <Tooltip title="بازخوانی">
            <Button size="small" variant="outlined" startIcon={<RefreshIcon sx={{ fontSize: 16 }} />}
              onClick={refresh}>بازخوانی</Button>
          </Tooltip>
        )}
      />

      {error ? (
        <Alert severity="error" sx={{ mb: 1, borderRadius: '12px' }} onClose={() => setError('')}>
          <Typography sx={{ fontSize: 12 }}>{error}</Typography>
        </Alert>
      ) : null}
      {toast ? (
        <Alert severity="success" sx={{ mb: 1, borderRadius: '12px' }} onClose={() => setToast('')}>
          <Typography sx={{ fontSize: 12 }}>{toast}</Typography>
        </Alert>
      ) : null}

      <Paper elevation={0} sx={{
        borderRadius: 'var(--hrms-table-radius, 16px)',
        border: '1px solid',
        borderColor: moduleTheme.cardBorderColor,
        mb: 1.25,
        px: `${moduleTheme.cardPadX}px`,
        py: `${moduleTheme.cardPadY}px`,
      }}>
        <Tabs value={direction} onChange={(_event, value) => { setDirection(value); resetForm(); }}
          sx={{ mb: 1, minHeight: 34 }}>
          <Tab value="receipt" label="اسناد دریافتی — دریافت‌ها" sx={{ minHeight: 34, fontSize: 12 }} />
          <Tab value="payment" label="اسناد پرداختی — پرداخت‌ها" sx={{ minHeight: 34, fontSize: 12 }} />
        </Tabs>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ md: 'center' }}
          useFlexGap flexWrap="wrap">
          <TextField select size="small" label="حساب / صندوق" value={entityId}
            onChange={(event) => setEntityId(event.target.value)} sx={{ minWidth: 220 }}>
            <MenuItem value="">همهٔ حساب‌ها</MenuItem>
            {entities.map((entity) => (
              <MenuItem key={entity.id} value={entity.id} sx={{ fontSize: 12 }}>
                {`${entity.code} — ${entity.name} (${formatPersianNumber(entity.balance)})`}
              </MenuItem>
            ))}
          </TextField>
          <TextField select size="small" label="نوع سند" value={instrument}
            onChange={(event) => setInstrument(event.target.value)} sx={{ minWidth: 140 }}>
            <MenuItem value="">همه</MenuItem>
            {INSTRUMENTS.map((item) => (
              <MenuItem key={item.value} value={item.value} sx={{ fontSize: 12 }}>
                {item.label}
              </MenuItem>
            ))}
          </TextField>
          <JalaliMaskedDateInput label="از تاریخ" value={dateFrom}
            onChange={setDateFrom} variant="outlined" size="small" />
          <JalaliMaskedDateInput label="تا تاریخ" value={dateTo}
            onChange={setDateTo} variant="outlined" size="small" />
          <TextField size="small" label="جست‌وجوی سریال/طرف/پیگیری" value={search}
            onChange={(event) => setSearch(event.target.value)} sx={{ minWidth: 220 }} />
          <Box sx={{ flex: 1 }} />
          <Typography sx={{ fontSize: 11, opacity: 0.75 }}>
            {`سریال بعدی: ${nextSerial}`}
          </Typography>
        </Stack>
      </Paper>

      <Paper elevation={0} sx={{
        borderRadius: 'var(--hrms-table-radius, 16px)',
        border: '1px solid',
        borderColor: moduleTheme.cardBorderColor,
        mb: 1.25,
        px: `${moduleTheme.cardPadX}px`,
        py: `${moduleTheme.cardPadY}px`,
      }}>
        {listQuery.isLoading ? (
          <Box sx={{ py: 5, textAlign: 'center' }}><CircularProgress size={22} /></Box>
        ) : (
          <ModuleTable
            tableTheme={tableTheme.tableTheme}
            ariaLabel="دفتر اسناد دریافت و پرداخت"
            containerRef={tableRef}
            tableHeight={tableHeight}
            rowHeight={rowHeight}
            rows={rows}
            rowKey={(row) => row.id}
            emptyText="سندی با این فیلترها ثبت نشده است."
            columns={columns}
          />
        )}
      </Paper>


      <Paper elevation={0} sx={{
        borderRadius: 'var(--hrms-table-radius, 16px)',
        border: '1px solid',
        borderColor: moduleTheme.cardBorderColor,
        px: `${moduleTheme.cardPadX}px`,
        py: `${moduleTheme.cardPadY}px`,
      }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 800 }}>
            {selected ? `ویرایش سند ${selected.number}` : 'ثبت سند جدید'}
          </Typography>
          {selected ? (
            <Chip size="small" label={selected.status_display}
              sx={chipSx(STATUS_COLOR[selected.status] || '#64748b')} />
          ) : null}
          <Box sx={{ flex: 1 }} />
          <Typography sx={{ fontSize: 10.5, opacity: 0.7 }}>
            شمارهٔ سند هنگام ذخیره به‌صورت خودکار صادر می‌شود.
          </Typography>
        </Stack>

        <Box sx={{
          display: 'grid',
          gap: 1,
          gridTemplateColumns: { xs: '1fr', md: 'repeat(4, minmax(0, 1fr))' },
        }}>
          <JalaliMaskedDateInput label="تاریخ سند" value={form.date}
            onChange={(value) => setField('date', value)} variant="outlined" size="small" />
          <TextField select size="small" label="نوع سند" value={form.instrument_kind}
            onChange={(event) => setField('instrument_kind', event.target.value)}>
            {INSTRUMENTS.map((item) => (
              <MenuItem key={item.value} value={item.value} sx={{ fontSize: 12 }}>
                {item.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField size="small" label={direction === 'receipt' ? 'دریافت‌کننده' : 'پرداخت‌کننده'}
            value={form.party} onChange={(event) => setField('party', event.target.value)} />
          <TextField size="small" label="شناسه / کد ملی" value={form.party_national_id}
            onChange={(event) => setField('party_national_id', event.target.value)} />
          <TextField size="small" label="مبلغ" type="number" value={form.amount}
            onChange={(event) => setField('amount', event.target.value)}
            helperText={form.amount ? formatPersianNumber(form.amount) : ''} />
          {form.instrument_kind === 'cheque' ? (
            <>
              <TextField size="small" label="شماره چک" value={form.cheque_number}
                onChange={(event) => setField('cheque_number', event.target.value)} />
              <JalaliMaskedDateInput label="سررسید چک" value={form.cheque_due_date}
                onChange={(value) => setField('cheque_due_date', value)}
                variant="outlined" size="small" />
              <FormControlLabel
                control={(
                  <Switch size="small" checked={form.is_guarantee}
                    onChange={(event) => setField('is_guarantee', event.target.checked)} />
                )}
                label={<Typography sx={{ fontSize: 11.5 }}>چک تضمینی</Typography>}
              />
            </>
          ) : null}
          <TextField size="small" label="شماره فاکتور" value={form.invoice_number}
            onChange={(event) => setField('invoice_number', event.target.value)} />
          <JalaliMaskedDateInput label="تاریخ فاکتور" value={form.invoice_date}
            onChange={(value) => setField('invoice_date', value)}
            variant="outlined" size="small" />
          <TextField size="small" label="مقدار فاکتور" type="number" value={form.invoice_amount}
            onChange={(event) => setField('invoice_amount', event.target.value)} />
          <TextField size="small" label="شماره پیگیری" value={form.reference_no}
            onChange={(event) => setField('reference_no', event.target.value)} />
          <TextField size="small" label="مرجع بانکی" value={form.tracking_no}
            onChange={(event) => setField('tracking_no', event.target.value)} />
          <Autocomplete
            size="small"
            options={accountOptions}
            value={selectedAccount}
            onChange={(_event, option) => setField('debit_account', option?.value || '')}
            getOptionLabel={(option) => option.label || ''}
            isOptionEqualToValue={(a, b) => a.value === b.value}
            noOptionsText="حسابی یافت نشد"
            renderInput={(params) => (
              <TextField {...params} label="حساب بدهکار/بستانکار سند"
                helperText="از کدینگ حسابداری" />
            )}
          />
          <TextField size="small" label="شرح سند" value={form.description}
            onChange={(event) => setField('description', event.target.value)}
            sx={{ gridColumn: { md: 'span 2' } }} />
        </Box>


        <Divider sx={{ my: 1.25 }} />

        <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
          <Button size="small" variant="outlined" startIcon={<DeleteSweepIcon sx={{ fontSize: 16 }} />}
            onClick={resetForm}>
            پاک‌کردن
          </Button>
          <Button size="small" variant="contained" startIcon={<AddIcon sx={{ fontSize: 16 }} />}
            disabled={!entityId || save.isPending} onClick={() => save.mutate()}>
            افزودن
          </Button>
          <Button size="small" variant="contained" startIcon={<SaveIcon sx={{ fontSize: 16 }} />}
            disabled={!entityId || save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? 'در حال ذخیره…' : 'ذخیره / اصلاح'}
          </Button>
          <Button size="small" variant="outlined" startIcon={<PlayCircleOutlineIcon sx={{ fontSize: 16 }} />}
            disabled={!selected || selected.status !== 'draft' || post.isPending}
            onClick={() => post.mutate(selected)}>
            ثبت سند
          </Button>
          <Button size="small" variant="outlined" startIcon={<CancelOutlinedIcon sx={{ fontSize: 16 }} />}
            disabled={!selected || selected.status !== 'draft' || cancel.isPending}
            onClick={() => cancel.mutate(selected)}
            sx={{ color: '#be123c', borderColor: '#be123c55' }}>
            ابطال
          </Button>
          <Button size="small" variant="outlined" startIcon={<PrintOutlinedIcon sx={{ fontSize: 16 }} />}
            disabled={!selected}
            onClick={() => setVoucher(`${API}${selected.id}/print-data/`)}>
            چاپ رسید
          </Button>
        </Stack>
      </Paper>

      <TreasuryVoucherDialog open={Boolean(voucher)} endpoint={voucher}
        onClose={() => setVoucher(null)} />
    </Box>
  );
};

export default VoucherBookPage;

