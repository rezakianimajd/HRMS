import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Box, Button, Chip, CircularProgress, Divider, InputAdornment, MenuItem, Paper,
  Stack, TextField, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import axiosInstance from '../../core/api/axiosConfig';
import PageHeader from '../../core/components/ui/PageHeader';
import JalaliMaskedDateInput from '../../core/components/ui/JalaliMaskedDateInput';
import { ModuleTable, useModuleTheme, useRowHeight } from '../contracts/contractModuleUi';
import { formatPersianNumber } from '../../core/utils/numberUtils';
import { asList, chipSx, dateLabel, useTreasuryTheme } from './treasuryMasterUi';
import TreasuryVoucherDialog from './TreasuryVoucherDialog';

const API = '/treasury/bank-orders/';

const ONES = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];
const TEENS = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده'];
const TENS = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
const HUNDREDS = ['', 'یکصد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد'];
const SCALES = ['', ' هزار', ' میلیون', ' میلیارد', ' هزار میلیارد'];

const three = (value) => {
  const parts = [];
  const hundreds = Math.floor(value / 100);
  let rest = value % 100;
  if (hundreds) parts.push(HUNDREDS[hundreds]);
  if (rest >= 10 && rest <= 19) {
    parts.push(TEENS[rest - 10]);
    rest = 0;
  } else {
    const tens = Math.floor(rest / 10);
    if (tens) parts.push(TENS[tens]);
    rest %= 10;
    if (rest) parts.push(ONES[rest]);
  }
  return parts.filter(Boolean).join(' و ');
};

const amountToWords = (value) => {
  let amount = Math.floor(Number(String(value || 0).replace(/,/g, '')) || 0);
  if (amount <= 0) return '';
  const groups = [];
  let scale = 0;
  while (amount > 0 && scale < SCALES.length) {
    const chunk = amount % 1000;
    if (chunk) groups.push(`${three(chunk)}${SCALES[scale]}`.trim());
    amount = Math.floor(amount / 1000);
    scale += 1;
  }
  return `${groups.reverse().join(' و ')} ریال`;
};

const normalizeSheba = (value) => String(value || '').replace(/[\s-]/g, '').toUpperCase();

const EMPTY_FORM = {
  transfer_type: 'satna',
  date: new Date().toISOString().slice(0, 10),
  company_national_id: '',
  customer_number: '',
  source_entity: '',
  source_account_number: '',
  source_iban: '',
  destination_owner_name: '',
  destination_account_number: '',
  destination_iban: '',
  commercial_customer: '',
  cheque_number: '',
  amount: '',
  note: 'انتقال وجه',
};

const ShebaField = ({ label, value, onChange, helper }) => (
  <TextField
    size="small"
    label={label}
    value={value}
    onChange={(event) => onChange(normalizeSheba(event.target.value))}
    placeholder="IR000000000000000000000000"
    helperText={helper}
    inputProps={{ maxLength: 26, dir: 'ltr', style: { fontFamily: 'monospace' } }}
    InputProps={{
      startAdornment: <InputAdornment position="start">IR</InputAdornment>,
    }}
  />
);

const BankOrdersPage = () => {
  const moduleTheme = useTreasuryTheme();
  const tableTheme = useModuleTheme();
  const qc = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);
  const [selected, setSelected] = useState(null);
  const [voucher, setVoucher] = useState(null);
  const [lookup, setLookup] = useState(null);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  const entitiesQuery = useQuery({
    queryKey: ['treasury-entity-balances'],
    queryFn: () => axiosInstance.get('/treasury/treasury-entities/balances/')
      .then((response) => response.data),
    staleTime: 60_000,
  });
  const bankEntities = asList(entitiesQuery.data)
    .filter((row) => row.entity_type === 'bank');

  const ordersQuery = useQuery({
    queryKey: ['treasury-bank-orders'],
    queryFn: () => axiosInstance.get(API, { params: { page_size: 100 } })
      .then((response) => response.data),
    staleTime: 20_000,
  });
  const orders = asList(ordersQuery.data);

  const { ref: tableRef, rowHeight, tableHeight } = useRowHeight(
    tableTheme.tableTheme, Math.max(1, orders.length),
  );

  const selectedEntity = bankEntities.find(
    (row) => String(row.id) === String(form.source_entity),
  );

  useEffect(() => {
    if (!selectedEntity) return;
    setForm((previous) => ({
      ...previous,
      source_account_number: previous.source_account_number || selectedEntity.code || '',
    }));
  }, [selectedEntity]);

  const normalizedDestination = normalizeSheba(form.destination_iban);

  useEffect(() => {
    if (normalizedDestination.length !== 26) {
      setLookup(null);
      return undefined;
    }
    let active = true;
    const timer = window.setTimeout(() => {
      axiosInstance.get(`${API}lookup-sheba/`, { params: { iban: normalizedDestination } })
        .then((response) => { if (active) setLookup(response.data); })
        .catch(() => { if (active) setLookup({ valid: false }); });
    }, 320);
    return () => { active = false; window.clearTimeout(timer); };
  }, [normalizedDestination]);

  const setField = (name, value) => setForm((previous) => ({ ...previous, [name]: value }));

  const save = useMutation({
    mutationFn: () => (selected
      ? axiosInstance.patch(`${API}${selected.id}/`, form)
      : axiosInstance.post(API, form)),
    onSuccess: (response) => {
      qc.invalidateQueries({ queryKey: ['treasury-bank-orders'] });
      setSelected(response.data);
      setToast(`دستور ${response.data.number} ذخیره شد.`);
      setError('');
    },
    onError: (err) => setError(
      err?.response?.data?.detail
      || Object.values(err?.response?.data || {}).flat().join(' · ')
      || 'ذخیرهٔ دستور انجام نشد.',
    ),
  });

  const register = useMutation({
    mutationFn: (row) => axiosInstance.post(`${API}${row.id}/register/`),
    onSuccess: (response) => {
      qc.invalidateQueries({ queryKey: ['treasury-bank-orders'] });
      setSelected(response.data);
      setToast('دستور ثبت شد.');
    },
    onError: (err) => setError(err?.response?.data?.error || 'ثبت انجام نشد.'),
  });

  const columns = useMemo(() => ([
    {
      key: 'number',
      label: 'سریال',
      width: '14%',
      render: (row) => (
        <Box>
          <Typography sx={{ fontSize: 11.5, fontWeight: 800 }}>{row.number}</Typography>
          <Typography sx={{ fontSize: 9.5, opacity: 0.65 }}>{row.transfer_type_display}</Typography>
        </Box>
      ),
    },
    { key: 'date', label: 'تاریخ', width: '10%', render: (row) => dateLabel(row.date) },
    { key: 'owner', label: 'صاحب سپرده مقصد', width: '22%', render: (row) => row.destination_owner_name },
    {
      key: 'destination',
      label: 'شبا مقصد',
      width: '20%',
      render: (row) => (
        <Box>
          <Typography sx={{ fontSize: 10, direction: 'ltr', textAlign: 'right' }}>
            {row.destination_iban}
          </Typography>
          <Typography sx={{ fontSize: 9.5, opacity: 0.65 }}>{row.destination_bank_name}</Typography>
        </Box>
      ),
    },
    {
      key: 'amount',
      label: 'مبلغ',
      width: '14%',
      align: 'center',
      render: (row) => (
        <Typography sx={{ fontSize: 11.5, fontWeight: 900 }}>
          {formatPersianNumber(row.amount)}
        </Typography>
      ),
    },
    {
      key: 'status',
      label: 'وضعیت',
      width: '10%',
      align: 'center',
      render: (row) => (
        <Chip size="small" label={row.status_display}
          sx={chipSx(row.status === 'cancelled' ? '#be123c' : row.status === 'draft' ? '#b45309' : '#0f766e')} />
      ),
    },
    {
      key: 'actions',
      label: 'چاپ',
      width: '10%',
      align: 'center',
      render: (row) => (
        <Button size="small" sx={{ minWidth: 0 }}
          onClick={() => setVoucher(`${API}${row.id}/print-data/`)}>
          <PrintOutlinedIcon sx={{ fontSize: 16 }} />
        </Button>
      ),
    },
  ]), []);


  return (
    <Box>
      <PageHeader
        icon={<AccountBalanceIcon />}
        title="دستور پرداخت الکترونیکی بین‌بانکی"
        subtitle="فرم پایا/ساتنا با شبا مبدأ و مقصد، اعتبارسنجی خودکار شبا و تشخیص بانک"
        badge={(
          <Chip size="small" label="SATNA / PAYA" sx={chipSx(moduleTheme.accent)} />
        )}
        actions={(
          <Button size="small" variant="outlined" startIcon={<PrintOutlinedIcon sx={{ fontSize: 16 }} />}
            disabled={!selected}
            onClick={() => setVoucher(`${API}${selected.id}/print-data/`)}>
            چاپ دستور
          </Button>
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
        <Stack direction="row" alignItems="center" spacing={1} useFlexGap flexWrap="wrap"
          sx={{ mb: 1.25 }}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 800 }}>
            {selected ? `دستور ${selected.number}` : 'دستور جدید'}
          </Typography>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={form.transfer_type}
            onChange={(_event, value) => value && setField('transfer_type', value)}
            sx={{ '& .MuiToggleButton-root': { fontSize: 11, px: 1.4, py: 0.3 } }}
          >
            <ToggleButton value="paya">پایا</ToggleButton>
            <ToggleButton value="satna">ساتنا</ToggleButton>
          </ToggleButtonGroup>
          <JalaliMaskedDateInput label="تاریخ" value={form.date}
            onChange={(value) => setField('date', value)} variant="outlined" size="small" />
          <Box sx={{ flex: 1 }} />
          <Typography sx={{ fontSize: 10.5, opacity: 0.7 }}>
            شماره سریال هنگام ذخیره صادر می‌شود.
          </Typography>
        </Stack>

        <Box sx={{
          display: 'grid',
          gap: 1,
          gridTemplateColumns: { xs: '1fr', md: 'repeat(4, minmax(0, 1fr))' },
        }}>
          <TextField size="small" label="شناسه/کد ملی شرکت" value={form.company_national_id}
            onChange={(event) => setField('company_national_id', event.target.value)} />
          <TextField size="small" label="شماره مشتری" value={form.customer_number}
            onChange={(event) => setField('customer_number', event.target.value)} />
          <TextField select size="small" label="سپردهٔ مبدأ (حساب شرکت)"
            value={form.source_entity}
            onChange={(event) => {
              const entity = bankEntities.find((row) => String(row.id) === event.target.value);
              setForm((previous) => ({
                ...previous,
                source_entity: event.target.value,
                source_account_number: entity ? (entity.code || '') : previous.source_account_number,
                source_iban: entity
                  ? normalizeSheba(entity.sheba_number || '')
                  : previous.source_iban,
              }));
            }}
            helperText={selectedEntity
              ? `مانده: ${formatPersianNumber(selectedEntity.balance)}`
              : ''}
          >
            {bankEntities.map((entity) => (
              <MenuItem key={entity.id} value={entity.id} sx={{ fontSize: 12 }}>
                {`${entity.code} — ${entity.name}`}
              </MenuItem>
            ))}
          </TextField>
          <TextField size="small" label="مبلغ" type="number" value={form.amount}
            onChange={(event) => setField('amount', event.target.value)}
            helperText={form.amount ? formatPersianNumber(form.amount) : ''} />
        </Box>


        <Box sx={{
          display: 'grid',
          gap: 1,
          mt: 1,
          gridTemplateColumns: { xs: '1fr', md: 'repeat(4, minmax(0, 1fr))' },
        }}>
          <ShebaField label="شبا مبدأ" value={form.source_iban}
            onChange={(value) => setField('source_iban', value)}
            helper={selectedEntity?.sheba_number ? 'از حساب مبدأ' : ''} />
          <TextField size="small" label="شماره سپردهٔ مبدأ" value={form.source_account_number}
            onChange={(event) => setField('source_account_number', event.target.value)} />
          <TextField size="small" label="از محل چک شماره" value={form.cheque_number}
            onChange={(event) => setField('cheque_number', event.target.value)} />
          <TextField size="small" label="مشخصات مشتری تجاری" value={form.commercial_customer}
            onChange={(event) => setField('commercial_customer', event.target.value)} />
          <TextField size="small" label="نام صاحب سپردهٔ مقصد" value={form.destination_owner_name}
            onChange={(event) => setField('destination_owner_name', event.target.value)} required />
          <TextField size="small" label="شماره سپردهٔ مقصد" value={form.destination_account_number}
            onChange={(event) => setField('destination_account_number', event.target.value)} />
          <ShebaField label="شبا مقصد" value={form.destination_iban}
            onChange={(value) => setField('destination_iban', value)}
            helper={lookup?.valid
              ? `${lookup.bank_name || 'بانک نامشخص'} — کد ${lookup.bank_code}`
              : normalizedDestination.length === 26 ? 'شبا معتبر نیست' : 'IR + ۲۴ رقم'} />
          <TextField size="small" label="شرح انتقال" value={form.note}
            onChange={(event) => setField('note', event.target.value)} />
          <Box sx={{
            gridColumn: { md: 'span 2' },
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: '10px',
            px: 1,
            py: 0.6,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}>
            <VerifiedOutlinedIcon sx={{ fontSize: 18, color: lookup?.valid ? '#0f766e' : '#94a3b8' }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: 10, opacity: 0.7 }}>مبلغ به حروف</Typography>
              <Typography noWrap title={amountToWords(form.amount)}
                sx={{ fontSize: 11.5, fontWeight: 700 }}>
                {amountToWords(form.amount) || '—'}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Divider sx={{ my: 1.25 }} />
        <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
          <Button size="small" variant="outlined"
            onClick={() => { setSelected(null); setForm(EMPTY_FORM); setLookup(null); }}>
            جدید
          </Button>
          <Button size="small" variant="contained" startIcon={<SaveIcon sx={{ fontSize: 16 }} />}
            disabled={save.isPending || !form.source_entity} onClick={() => save.mutate()}>
            {save.isPending ? 'در حال ذخیره…' : 'ذخیره'}
          </Button>
          <Button size="small" variant="outlined" disabled={!selected || register.isPending}
            onClick={() => register.mutate(selected)}>
            ثبت دستور
          </Button>
          <Button size="small" variant="outlined" startIcon={<SearchIcon sx={{ fontSize: 16 }} />}
            disabled={normalizedDestination.length !== 26}
            onClick={() => axiosInstance.get(`${API}lookup-sheba/`, {
              params: { iban: normalizedDestination },
            }).then((response) => setLookup(response.data))
              .catch(() => setLookup({ valid: false }))}>
            دریافت اطلاعات شبا
          </Button>
        </Stack>
      </Paper>


      <Paper elevation={0} sx={{
        borderRadius: 'var(--hrms-table-radius, 16px)',
        border: '1px solid',
        borderColor: moduleTheme.cardBorderColor,
        px: `${moduleTheme.cardPadX}px`,
        py: `${moduleTheme.cardPadY}px`,
      }}>
        {ordersQuery.isLoading ? (
          <Box sx={{ py: 4, textAlign: 'center' }}><CircularProgress size={20} /></Box>
        ) : (
          <ModuleTable
            tableTheme={tableTheme.tableTheme}
            ariaLabel="دستورهای پرداخت بین‌بانکی"
            containerRef={tableRef}
            tableHeight={tableHeight}
            rowHeight={rowHeight}
            rows={orders}
            rowKey={(row) => row.id}
            emptyText="دستوری ثبت نشده است."
            columns={columns}
          />
        )}
      </Paper>

      <TreasuryVoucherDialog open={Boolean(voucher)} endpoint={voucher}
        onClose={() => setVoucher(null)} />
    </Box>
  );
};

export default BankOrdersPage;

