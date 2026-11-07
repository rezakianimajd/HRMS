import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Autocomplete, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, FormControlLabel, IconButton, MenuItem, Stack,
  Switch, Tab, Tabs, TextField, Tooltip, Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PrintIcon from '@mui/icons-material/Print';
import RefreshIcon from '@mui/icons-material/Refresh';
import SaveIcon from '@mui/icons-material/Save';
import axiosInstance from '../../core/api/axiosConfig';
import JalaliMaskedDateInput from '../../core/components/ui/JalaliMaskedDateInput';
import { formatPersianNumber } from '../../core/utils/numberUtils';
import { asList, chipSx, useTreasuryTheme } from './treasuryMasterUi';
import TreasuryVoucherDialog from './TreasuryVoucherDialog';

/**
 * «صدور سند با پیش‌نمایش چاپ»: فرم سمت راست، پیش‌نمایش زندهٔ قالب چاپ سمت چپ
 * (تاریخ شمسی، مبلغ به حروف، بارکد و شمارهٔ بعدی) و ثبت نهایی با شمارهٔ رسمی.
 */

const KINDS = [
  { value: 'receipt', label: 'فیش دریافت' },
  { value: 'payment', label: 'حواله پرداخت' },
  { value: 'transfer', label: 'رسید انتقال وجه' },
];

const RECEIPT_METHODS = [
  { value: 'cash', label: 'نقدی' },
  { value: 'bank', label: 'واریز به حساب' },
  { value: 'transfer', label: 'حواله بانکی' },
  { value: 'cheque', label: 'چک' },
  { value: 'guarantee_cheque', label: 'چک تضمینی' },
  { value: 'card_to_card', label: 'کارت‌به‌کارت' },
  { value: 'pos', label: 'کارت‌خوان' },
  { value: 'draft', label: 'اسناد دریافتنی' },
  { value: 'foreign_currency', label: 'ارزی' },
  { value: 'other', label: 'سایر' },
];

const PAYMENT_INSTRUMENTS = [
  { value: 'cash', label: 'نقدی' },
  { value: 'cheque', label: 'چک' },
  { value: 'sheba', label: 'شبا / حواله بانکی' },
  { value: 'bill', label: 'سند / برات' },
  { value: 'pos', label: 'کارت‌خوان' },
  { value: 'other', label: 'سایر' },
];

const todayIso = () => new Date().toISOString().slice(0, 10);

const emptyForm = (kind) => ({
  kind,
  date: todayIso(),
  amount: '',
  currency: 'IRR',
  exchange_rate: '',
  entity: '',
  party: '',
  partyName: '',
  purpose: '',
  description: '',
  reference_no: '',
  tracking_no: '',
  received_from: '',
  method: 'cash',
  mark_received: true,
  beneficiary: '',
  instrument_kind: 'cash',
  cheque_number: '',
  cheque_due_date: '',
  destination_iban: '',
  destination_account_number: '',
  destination_owner_name: '',
  destination_national_id: '',
  destination_bank: '',
  source: '',
  destination: '',
  fee: '',
});

const Field = ({ children, ...props }) => (
  <TextField size="small" fullWidth {...props}>
    {children}
  </TextField>
);

const TreasuryVoucherComposerDialog = ({
  open, initialKind = 'receipt', onClose, onIssued,
}) => {
  const moduleTheme = useTreasuryTheme();
  const qc = useQueryClient();
  const [kind, setKind] = useState(initialKind);
  const [form, setForm] = useState(() => emptyForm(initialKind));
  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState('');
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState('');
  const [issuing, setIssuing] = useState(false);
  const [issued, setIssued] = useState(null);

  useEffect(() => {
    if (!open) return;
    setKind(initialKind);
    setForm(emptyForm(initialKind));
    setPreview(null);
    setError('');
    setPreviewError('');
    setIssued(null);
  }, [open, initialKind]);

  const entitiesQuery = useQuery({
    queryKey: ['treasury-entity-balances'],
    queryFn: () => axiosInstance.get('/treasury/treasury-entities/balances/')
      .then((response) => response.data),
    staleTime: 120_000,
    enabled: open,
  });
  const entities = asList(entitiesQuery.data);

  const partiesQuery = useQuery({
    queryKey: ['treasury-parties-select'],
    queryFn: () => axiosInstance.get('/contract-parties/', { params: { page_size: 300 } })
      .then((response) => response.data),
    staleTime: 300_000,
    enabled: open,
  });
  const parties = asList(partiesQuery.data);

  const payload = useMemo(() => {
    const base = {
      kind,
      date: form.date || undefined,
      amount: form.amount === '' ? '0' : String(form.amount),
      currency: form.currency || 'IRR',
      exchange_rate: form.exchange_rate || undefined,
      purpose: form.purpose || undefined,
      description: form.description || undefined,
      party: form.partyName || undefined,
      reference_no: form.reference_no || undefined,
      tracking_no: form.tracking_no || undefined,
    };
    if (kind === 'receipt') {
      base.entity = form.entity || undefined;
      base.method = form.method || undefined;
      base.received_from = form.received_from || undefined;
      base.mark_received = form.mark_received;
    }
    if (kind === 'payment') {
      base.entity = form.entity || undefined;
      base.instrument_kind = form.instrument_kind || undefined;
      base.beneficiary = form.beneficiary || undefined;
      base.cheque_number = form.cheque_number || undefined;
      base.cheque_due_date = form.cheque_due_date || undefined;
      base.destination_iban = form.destination_iban || undefined;
      base.destination_account_number = form.destination_account_number || undefined;
      base.destination_owner_name = form.destination_owner_name || undefined;
      base.destination_national_id = form.destination_national_id || undefined;
      base.destination_bank = form.destination_bank || undefined;
    }
    if (kind === 'transfer') {
      base.source = form.source || undefined;
      base.destination = form.destination || undefined;
      base.fee = form.fee === '' ? 0 : Number(form.fee);
    }
    return base;
  }, [form, kind]);

  const refreshPreview = async (silent = false) => {
    if (!open) return;
    if (!silent) setPreviewing(true);
    try {
      const response = await axiosInstance.post('/treasury/voucher-preview/', payload);
      setPreview(response.data);
      setPreviewError('');
    } catch (err) {
      setPreviewError(
        err?.response?.data?.error || err?.response?.data?.detail || 'پیش‌نمایش آماده نشد.',
      );
    } finally {
      setPreviewing(false);
    }
  };

  useEffect(() => {
    if (!open) return undefined;
    const timer = window.setTimeout(() => { refreshPreview(true); }, 450);
    return () => window.clearTimeout(timer);
  }, [open, payload]); // eslint-disable-line

  const issue = async () => {
    setIssuing(true);
    setError('');
    try {
      const response = await axiosInstance.post('/treasury/voucher-issue/', payload);
      setIssued({ ...response.data, print: true });
      ['treasury-receipts', 'treasury-transactions', 'treasury-transfers',
        'treasury-entity-balances', 'treasury-payment-orders'].forEach((key) => {
        qc.invalidateQueries({ queryKey: [key] });
      });
      if (onIssued) onIssued(response.data);
    } catch (err) {
      setError(
        err?.response?.data?.error
        || err?.response?.data?.detail
        || 'ثبت سند انجام نشد.',
      );
    } finally {
      setIssuing(false);
    }
  };

  const change = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const switchKind = (nextKind) => {
    setKind(nextKind);
    setForm(emptyForm(nextKind));
    setPreview(null);
  };


  const amountWords = preview?.amount_words || '';
  const accent = moduleTheme.accent;

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ pb: 0.5 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography sx={{ fontSize: 13.5, fontWeight: 900 }}>صدور سند با پیش‌نمایش چاپ</Typography>
            <Box sx={{ flex: 1 }} />
            <Tooltip title="بستن">
              <IconButton size="small" onClick={onClose} aria-label="بستن">
                <CloseIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Stack>
          <Tabs
            value={kind}
            onChange={(_event, value) => switchKind(value)}
            variant="scrollable"
            allowScrollButtonsMobile
            sx={{ minHeight: 34, mt: 0.5 }}
          >
            {KINDS.map((option) => (
              <Tab key={option.value} value={option.value} label={option.label}
                sx={{ minHeight: 34, fontSize: 12, fontWeight: 700 }} />
            ))}
          </Tabs>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 1.25 }}>
          {error ? <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError('')}>{error}</Alert> : null}
          {issued ? (
            <Alert severity="success" sx={{ mb: 1 }}>
              {`سند ${issued.number || ''} با موفقیت صادر شد.`}
            </Alert>
          ) : null}

          <Box sx={{
            display: 'grid',
            gap: 1.25,
            gridTemplateColumns: { xs: '1fr', md: 'minmax(300px, 5fr) minmax(0, 7fr)' },
            alignItems: 'start',
          }}>
            <Box>
              <Stack spacing={1}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <JalaliMaskedDateInput
                    label="تاریخ سند"
                    value={form.date}
                    onChange={(value) => change('date', value)}
                    size="small"
                  />
                  <Field
                    label="مبلغ"
                    type="number"
                    value={form.amount}
                    onChange={(event) => change('amount', event.target.value)}
                    helperText={amountWords ? formatPersianNumber(form.amount || 0) : ''}
                  />
                  <Field
                    label="ارز"
                    select
                    value={form.currency}
                    onChange={(event) => change('currency', event.target.value)}
                    sx={{ minWidth: 110 }}
                  >
                    {['IRR', 'USD', 'EUR', 'AED'].map((code) => (
                      <MenuItem key={code} value={code} sx={{ fontSize: 12 }}>{code}</MenuItem>
                    ))}
                  </Field>
                </Stack>


                {kind !== 'transfer' ? (
                  <Autocomplete
                    size="small"
                    options={entities}
                    getOptionLabel={(option) => option.name || ''}
                    value={entities.find((row) => String(row.id) === String(form.entity)) || null}
                    onChange={(_event, value) => change('entity', value ? value.id : '')}
                    renderInput={(params) => (
                      <TextField {...params} label="بانک / صندوق" size="small" />
                    )}
                  />
                ) : null}

                <Autocomplete
                  size="small"
                  freeSolo
                  options={parties}
                  getOptionLabel={(option) => (typeof option === 'string' ? option : option.name || '')}
                  inputValue={form.partyName}
                  onInputChange={(_event, value) => change('partyName', value)}
                  onChange={(_event, value) => {
                    if (value && typeof value === 'object') {
                      change('party', value.id);
                      change('partyName', value.name || '');
                    }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      size="small"
                      label={kind === 'receipt'
                        ? 'طرف حساب / دریافت‌کننده'
                        : 'طرف حساب / پرداخت‌کننده'}
                    />
                  )}
                />

                {kind === 'receipt' ? (
                  <>
                    <Field
                      label="دریافت از (نام آزاد)"
                      value={form.received_from}
                      onChange={(event) => change('received_from', event.target.value)}
                    />
                    <Field
                      label="روش دریافت"
                      select
                      value={form.method}
                      onChange={(event) => change('method', event.target.value)}
                    >
                      {RECEIPT_METHODS.map((option) => (
                        <MenuItem key={option.value} value={option.value} sx={{ fontSize: 12 }}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Field>
                    <FormControlLabel
                      control={(
                        <Switch
                          size="small"
                          checked={form.mark_received}
                          onChange={(event) => change('mark_received', event.target.checked)}
                        />
                      )}
                      label={(
                        <Typography sx={{ fontSize: 11.5 }}>
                          همین حالا «دریافت‌شده» ثبت شود
                        </Typography>
                      )}
                    />
                  </>
                ) : null}


                {kind === 'payment' ? (
                  <>
                    <Field
                      label="پرداخت به (نام آزاد)"
                      value={form.beneficiary}
                      onChange={(event) => change('beneficiary', event.target.value)}
                    />
                    <Field
                      label="نوع سند پرداخت"
                      select
                      value={form.instrument_kind}
                      onChange={(event) => change('instrument_kind', event.target.value)}
                    >
                      {PAYMENT_INSTRUMENTS.map((option) => (
                        <MenuItem key={option.value} value={option.value} sx={{ fontSize: 12 }}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Field>
                    {form.instrument_kind === 'cheque' ? (
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                        <Field
                          label="شماره چک"
                          value={form.cheque_number}
                          onChange={(event) => change('cheque_number', event.target.value)}
                        />
                        <JalaliMaskedDateInput
                          label="سررسید چک"
                          value={form.cheque_due_date}
                          onChange={(value) => change('cheque_due_date', value)}
                          size="small"
                        />
                      </Stack>
                    ) : null}
                    {form.instrument_kind === 'sheba' ? (
                      <>
                        <Field
                          label="شبا مقصد (IR…)"
                          value={form.destination_iban}
                          onChange={(event) => change('destination_iban', event.target.value)}
                          inputProps={{ dir: 'ltr', maxLength: 26 }}
                          helperText="۲۶ کاراکتر؛ رقم کنترل mod 97 بررسی می‌شود."
                        />
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                          <Field
                            label="شماره حساب مقصد"
                            value={form.destination_account_number}
                            onChange={(event) => change('destination_account_number', event.target.value)}
                          />
                          <Field
                            label="بانک مقصد"
                            value={form.destination_bank}
                            onChange={(event) => change('destination_bank', event.target.value)}
                          />
                        </Stack>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                          <Field
                            label="نام صاحب حساب مقصد"
                            value={form.destination_owner_name}
                            onChange={(event) => change('destination_owner_name', event.target.value)}
                          />
                          <Field
                            label="کد ملی / شناسه مقصد"
                            value={form.destination_national_id}
                            onChange={(event) => change('destination_national_id', event.target.value)}
                          />
                        </Stack>
                      </>
                    ) : null}
                  </>
                ) : null}

                {kind === 'transfer' ? (
                  <>
                    <Autocomplete
                      size="small"
                      options={entities}
                      getOptionLabel={(option) => option.name || ''}
                      value={entities.find((row) => String(row.id) === String(form.source)) || null}
                      onChange={(_event, value) => change('source', value ? value.id : '')}
                      renderInput={(params) => (
                        <TextField {...params} label="از حساب/صندوق" size="small" />
                      )}
                    />
                    <Autocomplete
                      size="small"
                      options={entities}
                      getOptionLabel={(option) => option.name || ''}
                      value={entities.find((row) => String(row.id) === String(form.destination)) || null}
                      onChange={(_event, value) => change('destination', value ? value.id : '')}
                      renderInput={(params) => (
                        <TextField {...params} label="به حساب/صندوق" size="small" />
                      )}
                    />
                    <Field
                      label="کارمزد"
                      type="number"
                      value={form.fee}
                      onChange={(event) => change('fee', event.target.value)}
                    />
                  </>
                ) : null}

                <Field
                  label="بابت"
                  value={form.purpose}
                  onChange={(event) => change('purpose', event.target.value)}
                />
                <Field
                  label="شرح"
                  value={form.description}
                  onChange={(event) => change('description', event.target.value)}
                  multiline
                  minRows={2}
                />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <Field
                    label={kind === 'payment' ? 'شماره مرجع' : 'شماره پیگیری'}
                    value={form.reference_no}
                    onChange={(event) => change('reference_no', event.target.value)}
                  />
                  <Field
                    label="شماره مرجع بانکی"
                    value={form.tracking_no}
                    onChange={(event) => change('tracking_no', event.target.value)}
                  />
                </Stack>
              </Stack>
            </Box>


            <Box sx={{ position: { md: 'sticky' }, top: 0 }}>
              <Stack direction="row" alignItems="center" spacing={0.75} useFlexGap flexWrap="wrap"
                sx={{ mb: 0.75 }}>
                <Chip size="small" label="پیش‌نمایش قالب چاپ" sx={chipSx(accent)} />
                {preview?.template_name ? (
                  <Chip size="small" label={`قالب: ${preview.template_name}`}
                    sx={chipSx('#64748b')} />
                ) : null}
                {preview?.paper ? <Chip size="small" label={preview.paper} sx={chipSx('#0284c7')} /> : null}
                {preview?.number ? (
                  <Chip size="small" label={`شمارهٔ بعدی: ${preview.number}`} sx={chipSx('#0f766e')} />
                ) : null}
                {preview?.date ? (
                  <Chip size="small" label={preview.date} sx={chipSx('#b45309')} />
                ) : null}
                <Box sx={{ flex: 1 }} />
                {previewing ? <CircularProgress size={14} sx={{ color: accent }} /> : null}
                <Tooltip title="بازخوانی پیش‌نمایش">
                  <span>
                    <IconButton size="small" aria-label="بازخوانی پیش‌نمایش"
                      onClick={() => refreshPreview(false)} disabled={previewing}>
                      <RefreshIcon sx={{ fontSize: 17 }} />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>

              {previewError ? (
                <Alert severity="warning" sx={{ mb: 0.75 }}>{previewError}</Alert>
              ) : null}

              {preview?.html ? (
                <Box sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 'var(--hrms-radius, 12px)',
                  overflow: 'hidden',
                  bgcolor: '#fff',
                }}>
                  <iframe
                    title="پیش‌نمایش چاپ سند"
                    srcDoc={preview.html}
                    style={{ width: '100%', height: 460, border: 'none', background: '#fff' }}
                  />
                </Box>
              ) : (
                <Box sx={{
                  border: '1px dashed',
                  borderColor: 'divider',
                  borderRadius: 'var(--hrms-radius, 12px)',
                  py: 9,
                  textAlign: 'center',
                  color: 'text.secondary',
                }}>
                  {previewing ? <CircularProgress size={20} sx={{ color: accent }} /> : (
                    <Typography sx={{ fontSize: 11.5 }}>
                      با پُر کردن مبلغ و طرف حساب، پیش‌نمایش چاپ همین‌جا ساخته می‌شود.
                    </Typography>
                  )}
                </Box>
              )}

              {amountWords ? (
                <Typography sx={{ fontSize: 11, mt: 0.75, fontWeight: 700 }}>
                  {`مبلغ به حروف: ${amountWords}`}
                </Typography>
              ) : null}
              <Typography sx={{ fontSize: 10, mt: 0.4, opacity: 0.7 }}>
                پیش‌نمایش با تاریخ شمسی، مبلغ به حروف و بارکد اعتبارسنجی از قالب چاپ فعال شرکت ساخته می‌شود.
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 2, py: 1.25 }}>
          <Button size="small" onClick={onClose}>بستن</Button>
          <Button
            size="small"
            startIcon={<RefreshIcon sx={{ fontSize: 15 }} />}
            onClick={() => refreshPreview(false)}
            disabled={previewing}
          >
            پیش‌نمایش
          </Button>
          <Button
            size="small"
            variant="contained"
            startIcon={<SaveIcon sx={{ fontSize: 16 }} />}
            onClick={issue}
            disabled={issuing || !form.amount
              || (kind === 'payment' && !form.entity)
              || (kind === 'payment' && form.instrument_kind === 'sheba' && !form.destination_iban)
              || (kind === 'transfer' && (!form.source || !form.destination))}
          >
            {issuing ? 'در حال ثبت…' : 'ثبت و صدور سند'}
          </Button>
          {issued?.print_url ? (
            <Button
              size="small"
              color="success"
              variant="outlined"
              startIcon={<PrintIcon sx={{ fontSize: 16 }} />}
              onClick={() => setIssued({ ...issued, print: true })}
            >
              چاپ سند
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>

      <TreasuryVoucherDialog
        open={Boolean(issued?.print_url && issued.print)}
        endpoint={issued?.print_url}
        onClose={() => setIssued({ ...issued, print: false })}
      />
    </>
  );
};

export default TreasuryVoucherComposerDialog;

