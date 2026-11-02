import React, { useMemo } from 'react';
import {
  Alert, Autocomplete, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, FormControl, Grid, IconButton, InputLabel,
  LinearProgress, MenuItem, Select, Stack, Table, TableBody, TableCell, TableHead,
  TableRow, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography, alpha,
} from '@mui/material';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import AttachFileOutlinedIcon from '@mui/icons-material/AttachFileOutlined';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import RestartAltOutlinedIcon from '@mui/icons-material/RestartAltOutlined';
import { useDesignTokens } from '../../core/context/DesignTokenContext';
import JalaliDatePicker from '../../core/components/ui/JalaliDatePicker';
import MoneyInput from '../../core/components/ui/MoneyInput';
import { formatPersianNumber, normalizeCurrencyLabel, toPersianDigits } from '../../core/utils/numberUtils';
import { statementDisplayTitle } from './statementKinds';
import { PAYMENT_TYPES, paymentTypeOf } from './paymentTypes';
import {
  allocationKey, allocationsTotal, BUCKET_KEYS, bucketMeta, fillWithRemaining, numOf,
  targetKindLabel, targetPaid, targetPayable, targetRemaining,
} from './paymentAllocations';

const INK = '#1e293b';
const MUTED = '#64748b';
const TEAL = '#0f766e';
const BLUE = '#2563eb';
const VIOLET = '#7c3aed';
const GREEN = '#15803d';
const RED = '#be123c';

/**
 * چهار گروه قابل انتخاب برای تخصیص پرداخت عادی/علی‌الحساب:
 * خالص صورت‌وضعیت، فاکتور، سپرده حسن انجام کار و سپرده حق بیمه.
 */
const ALLOCATION_FIELDS = [
  { target: 'statement', bucket: 'net', label: 'خالص صورت‌وضعیت‌ها', emptyText: 'صورت‌وضعیتی یافت نشد' },
  { target: 'invoice', bucket: 'net', label: 'فاکتورها', emptyText: 'فاکتوری یافت نشد' },
  { target: 'statement', bucket: 'retention', label: 'سپرده حسن انجام کار', emptyText: 'کسور حسن انجام کار ثبت نشده است' },
  { target: 'statement', bucket: 'insurance', label: 'سپرده حق بیمه', emptyText: 'کسور بیمه ثبت نشده است' },
];

const fileSizeLabel = (bytes) => {
  const size = numOf(bytes);
  if (size >= 1024 * 1024) return `${formatPersianNumber((size / (1024 * 1024)).toFixed(1))} مگابایت`;
  if (size >= 1024) return `${formatPersianNumber((size / 1024).toFixed(0))} کیلوبایت`;
  return `${formatPersianNumber(size)} بایت`;
};

const Section = ({ icon: Icon, title, color = TEAL, badge, children, sx }) => (
  <Box
    sx={{
      p: 1.5, borderRadius: '14px', bgcolor: '#fff', border: '1px solid #e8edf4',
      boxShadow: '0 1px 2px rgba(15,23,42,0.03)', ...sx,
    }}
  >
    <Stack direction="row" alignItems="center" spacing={0.9} sx={{ mb: 1.2 }}>
      <Box sx={{
        width: 30, height: 30, borderRadius: '10px', flexShrink: 0,
        display: 'grid', placeItems: 'center', color, bgcolor: alpha(color, 0.1),
      }}>
        <Icon sx={{ fontSize: 17 }} />
      </Box>
      <Typography sx={{ flex: 1, fontSize: 12.5, fontWeight: 900, color: INK }}>{title}</Typography>
      {badge || null}
    </Stack>
    {children}
  </Box>
);

const SummaryRow = ({ label, value, color = INK, strong, muted }) => (
  <Stack direction="row" alignItems="baseline" justifyContent="space-between" spacing={1} sx={{ py: 0.45 }}>
    <Typography sx={{ fontSize: 11.5, color: MUTED, flexShrink: 0 }}>{label}</Typography>
    <Typography sx={{
      fontSize: strong ? 12.5 : 11.5, fontWeight: strong ? 900 : 700,
      color: muted ? MUTED : color, direction: 'rtl',
    }}>
      {value}
    </Typography>
  </Stack>
);


/**
 * دیالوگ ثبت/ویرایش پرداخت قرارداد با زبان طراحی «استودیو».
 *
 * یک پرداخت (عادی یا علی‌الحساب) می‌تواند هم‌زمان به چند صورت‌وضعیت و چند
 * فاکتور تخصیص یابد؛ برای هر سند «قابل پرداخت / پرداخت‌شده / مانده» از API
 * خوانده می‌شود و مانده با یک کلیک به مبلغ تخصیص همان ردیف تبدیل می‌گردد.
 */
const ContractPaymentEditorDialog = ({
  open, onClose, form, setForm, invoiceList, statementList, currencyList,
  fallbackCurrency, error, saving, onSave, pendingFiles = [], existingAttachments = [],
  onPickFiles, onRemovePending, onDeleteAttachment, attachmentBusy, contract, uploading,
}) => {
  const { tokens } = useDesignTokens();
  const colors = tokens?.colors || {};
  const radius = tokens?.shape || { large: 16, medium: 10 };
  const borderColor = colors.border || '#e8edf4';
  const surface = colors.surface || '#ffffff';

  const typeMeta = paymentTypeOf(form);
  const isAdvance = typeMeta.key === 'advance';
  const selectedCurrency = currencyList.find((item) => String(item.id) === String(form.currency));
  const currencyLabel = normalizeCurrencyLabel(selectedCurrency?.name || fallbackCurrency);
  const exchangeRate = Number(selectedCurrency?.exchange_rate) > 1 ? Number(selectedCurrency.exchange_rate) : 1;

  const rows = useMemo(() => form.allocations || [], [form.allocations]);
  const statementById = useMemo(
    () => new Map(statementList.map((item) => [String(item.id), item])),
    [statementList],
  );
  const invoiceById = useMemo(
    () => new Map(invoiceList.map((item) => [String(item.id), item])),
    [invoiceList],
  );
  const sourceOf = (row) => (row.target === 'invoice' ? invoiceById : statementById).get(String(row.id));

  const statementOptions = useMemo(() => {
    const map = new Map(statementList.map((item) => [String(item.id), item]));
    rows.filter((row) => row.target === 'statement').forEach((row) => {
      const source = statementById.get(String(row.id));
      if (source && !map.has(String(source.id))) map.set(String(source.id), source);
    });
    return [...map.values()];
  }, [statementList, statementById, rows]);

  const invoiceOptions = useMemo(() => {
    const map = new Map(invoiceList.map((item) => [String(item.id), item]));
    rows.filter((row) => row.target === 'invoice').forEach((row) => {
      const source = invoiceById.get(String(row.id));
      if (source && !map.has(String(source.id))) map.set(String(source.id), source);
    });
    return [...map.values()];
  }, [invoiceList, invoiceById, rows]);

  /** گزینه‌های سپرده‌ها فقط صورت‌وضعیت‌هایی هستند که کسور مربوط را دارند. */
  const depositOptions = (bucket) => statementOptions.filter((option) => (
    numOf(option[`${bucket}_amount`]) > 0
    || rows.some((row) => row.target === 'statement' && row.bucket === bucket
      && String(row.id) === String(option.id))
  ));

  const retentionOptions = depositOptions('retention');
  const insuranceOptions = depositOptions('insurance');

  const optionPool = (target, bucket) => {
    if (target === 'invoice') return invoiceOptions;
    if (bucket === 'retention') return retentionOptions;
    if (bucket === 'insurance') return insuranceOptions;
    return statementOptions;
  };

  const selectedFor = (target, bucket) => optionPool(target, bucket).filter((option) => (
    rows.some((row) => row.target === target && row.bucket === bucket && String(row.id) === String(option.id))
  ));

  const amount = numOf(form.amount);
  const allocated = allocationsTotal(rows);
  const unallocated = amount - allocated;
  const allocationRatio = amount > 0 ? Math.min(100, Math.round((allocated / amount) * 100)) : 0;
  const foreignEquivalent = exchangeRate > 1 && amount ? amount / exchangeRate : null;
  const bucketTotals = BUCKET_KEYS.reduce((acc, key) => {
    acc[key] = rows
      .filter((row) => (row.target === 'invoice' ? 'net' : row.bucket) === key)
      .reduce((sum, row) => sum + numOf(row.amount), 0);
    return acc;
  }, {});

  const applyTargets = (target, bucket, options) => {
    setForm((previous) => {
      const current = previous.allocations || [];
      const selectedIds = new Set(options.map((option) => String(option.id)));
      const kept = current.filter((row) => (
        row.target !== target || row.bucket !== bucket || selectedIds.has(String(row.id))
      ));
      const known = new Set(kept.map((row) => row.key));
      const added = options
        .filter((option) => !known.has(allocationKey(target, option.id, bucket)))
        .map((option) => ({
          key: allocationKey(target, option.id, bucket),
          target,
          bucket,
          id: String(option.id),
          amount: String(Math.max(0, targetRemaining(target, bucket, option))),
        }));
      return { ...previous, allocations: [...kept, ...added] };
    });
  };

  const updateRow = (key, patch) => setForm((previous) => ({
    ...previous,
    allocations: (previous.allocations || []).map((row) => (row.key === key ? { ...row, ...patch } : row)),
  }));

  const removeRow = (key) => setForm((previous) => ({
    ...previous,
    allocations: (previous.allocations || []).filter((row) => row.key !== key),
  }));

  const applyAllRemaining = () => setForm((previous) => ({
    ...previous,
    allocations: fillWithRemaining(previous.allocations || [], {
      statement: statementOptions, invoice: invoiceOptions,
    }),
  }));

  const targetTitle = (target, source, id) => {
    if (!source) return `${targetKindLabel(target)} ${toPersianDigits(id)}`;
    if (target === 'invoice') {
      return source.number || source.subject || `فاکتور ${toPersianDigits(source.id)}`;
    }
    return statementDisplayTitle(source) || `صورت‌وضعیت ${toPersianDigits(source.id)}`;
  };

  const titleOf = (row) => targetTitle(row.target, sourceOf(row), row.id);

  const renderOption = (target, bucket) => (props, option) => {
    const remaining = targetRemaining(target, bucket, option);
    return (
      <Box
        component="li"
        {...props}
        key={`${target}-${bucket}-${option.id}`}
        sx={{ display: 'flex', gap: 1, alignItems: 'center' }}
      >
        <Typography sx={{ flex: 1, fontSize: 12, fontWeight: 700, color: INK }}>
          {targetTitle(target, option, option.id)}
        </Typography>
        <Chip
          size="small"
          label={`مانده ${formatPersianNumber(remaining)}`}
          sx={{
            height: 19, fontSize: 10, fontWeight: 800,
            bgcolor: alpha(remaining > 0 ? GREEN : MUTED, 0.1),
            color: remaining > 0 ? GREEN : MUTED,
          }}
        />
      </Box>
    );
  };

  const headCellSx = { fontSize: 10.5, fontWeight: 800, color: MUTED, py: 0.7, whiteSpace: 'nowrap', borderBottom: 'none' };
  const cellSx = { fontSize: 11.5, fontWeight: 700, color: INK, py: 0.55, borderBottom: 'none' };
  const tagSx = {
    height: 20, fontSize: 10.5, fontWeight: 800, maxWidth: 160,
    bgcolor: alpha(VIOLET, 0.08), color: VIOLET,
    '& .MuiChip-label': { px: 0.8 },
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: `${radius.large || 16}px`,
          overflow: 'hidden',
          bgcolor: colors.background || '#f8fafc',
        },
      }}
    >
      <DialogTitle sx={{
        display: 'flex', alignItems: 'center', gap: 1.2, px: 2.2, py: 1.5,
        bgcolor: surface, borderBottom: `1px solid ${borderColor}`,
      }}>
        <Box sx={{
          width: 40, height: 40, borderRadius: '12px', flexShrink: 0,
          display: 'grid', placeItems: 'center', color: '#fff',
          background: `linear-gradient(140deg, ${typeMeta.color}, ${alpha(typeMeta.color, 0.72)})`,
          boxShadow: `0 8px 20px ${alpha(typeMeta.color, 0.3)}`,
        }}>
          <typeMeta.icon sx={{ fontSize: 21 }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 13.5, fontWeight: 900, color: INK }}>
            {form.id ? `ویرایش ${typeMeta.label}` : `ثبت ${typeMeta.label} جدید`}
          </Typography>
          <Typography noWrap sx={{ fontSize: 11.5, color: MUTED }}>
            {contract?.subject || 'قرارداد'}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" aria-label="بستن"><CloseOutlinedIcon /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: { xs: 1.25, md: 2 }, bgcolor: colors.background || '#f8fafc' }}>
        <Box sx={{
          display: 'grid', gap: 1.5,
          gridTemplateColumns: { xs: '1fr', md: '1.6fr 1fr' },
          alignItems: 'start',
        }}>
          <Stack spacing={1.5}>
            {error ? <Alert severity="error" sx={{ borderRadius: '12px', fontSize: 12 }}>{error}</Alert> : null}

            <Section
              icon={DescriptionOutlinedIcon}
              title="اطلاعات پرداخت"
              color={typeMeta.color}
              badge={(
                <Chip
                  size="small"
                  label={typeMeta.label}
                  sx={{ height: 21, fontSize: 10.5, fontWeight: 800, bgcolor: alpha(typeMeta.color, 0.1), color: typeMeta.color }}
                />
              )}
            >
              <ToggleButtonGroup
                exclusive
                value={form.payment_type || 'normal'}
                onChange={(event, value) => {
                  if (!value) return;
                  setForm((previous) => ({
                    ...previous,
                    payment_type: value,
                    ...(value === 'advance' ? { allocations: [] } : {}),
                  }));
                }}
                sx={{
                  display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: 0.75, width: '100%', mb: 1.4,
                  '& .MuiToggleButtonGroup-grouped': { mx: 0 },
                }}
              >
                {PAYMENT_TYPES.map((option) => {
                  const Icon = option.icon;
                  const active = (form.payment_type || 'normal') === option.key;
                  return (
                    <ToggleButton
                      key={option.key}
                      value={option.key}
                      sx={{
                        border: `1px solid ${active ? alpha(option.color, 0.45) : borderColor} !important`,
                        borderRadius: '12px !important', py: 0.9, px: 0.9,
                        gap: 0.7, justifyContent: 'flex-start',
                        textTransform: 'none', fontSize: 11.5, fontWeight: 800,
                        color: active ? option.color : MUTED,
                        bgcolor: active ? alpha(option.color, 0.07) : surface,
                        '&:hover': { bgcolor: alpha(option.color, 0.05) },
                      }}
                    >
                      <Icon sx={{ fontSize: 17 }} />
                      {option.label}
                    </ToggleButton>
                  );
                })}
              </ToggleButtonGroup>


              <Grid container spacing={1.2}>
                <Grid item xs={12} md={4}>
                  <JalaliDatePicker
                    fullWidth
                    label="تاریخ پرداخت"
                    value={form.date}
                    onChange={(value) => setForm((previous) => ({ ...previous, date: value }))}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl size="small" fullWidth>
                    <InputLabel>واحد ارز مرجع</InputLabel>
                    <Select
                      value={form.currency || ''}
                      label="واحد ارز مرجع"
                      onChange={(event) => setForm((previous) => ({ ...previous, currency: event.target.value }))}
                    >
                      <MenuItem value="">—</MenuItem>
                      {currencyList.map((currency) => (
                        <MenuItem key={currency.id} value={currency.id}>
                          {normalizeCurrencyLabel(currency.name || currency.symbol)} ({currency.code})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <MoneyInput
                    size="small"
                    fullWidth
                    allowDecimals={false}
                    label="مبلغ پرداخت (ریال)"
                    value={form.amount}
                    onChange={(value) => setForm((previous) => ({ ...previous, amount: value }))}
                  />
                </Grid>
              </Grid>
            </Section>

            {isAdvance ? null : (
              <Section
                icon={LinkOutlinedIcon}
                title="تخصیص به صورت‌وضعیت و فاکتور"
                color={VIOLET}
                badge={(
                  <Chip
                    size="small"
                    label={`${formatPersianNumber(rows.length)} سند`}
                    sx={{ height: 21, fontSize: 10.5, fontWeight: 800, bgcolor: alpha(VIOLET, 0.1), color: VIOLET }}
                  />
                )}
              >
                <Grid container spacing={1.1} sx={{ mb: 1.1 }}>
                  {ALLOCATION_FIELDS.map((field) => (
                    <Grid item xs={12} md={6} key={`${field.target}-${field.bucket}`}>
                      <Autocomplete
                        multiple
                        size="small"
                        disableCloseOnSelect
                        options={optionPool(field.target, field.bucket)}
                        value={selectedFor(field.target, field.bucket)}
                        onChange={(event, value) => applyTargets(field.target, field.bucket, value)}
                        getOptionLabel={(option) => targetTitle(field.target, option, option.id)}
                        isOptionEqualToValue={(a, b) => String(a.id) === String(b.id)}
                        renderOption={renderOption(field.target, field.bucket)}
                        noOptionsText={field.emptyText}
                        renderTags={(value, getTagProps) => value.map((option, index) => {
                          const { key, ...rest } = getTagProps({ index });
                          return (
                            <Chip
                              key={key || `${field.target}-${field.bucket}-${option.id}`}
                              size="small"
                              label={targetTitle(field.target, option, option.id)}
                              {...rest}
                              sx={tagSx}
                            />
                          );
                        })}
                        renderInput={(params) => <TextField {...params} label={field.label} placeholder="چند سند" />}
                      />
                    </Grid>
                  ))}
                </Grid>


                {rows.length ? (
                  <Box sx={{ border: `1px solid ${borderColor}`, borderRadius: '12px', overflow: 'hidden', bgcolor: '#fff' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: alpha(VIOLET, 0.05) }}>
                          <TableCell sx={headCellSx}>سند / نوع مبلغ</TableCell>
                          <TableCell align="left" sx={headCellSx}>قابل پرداخت</TableCell>
                          <TableCell align="left" sx={headCellSx}>پرداخت‌شده</TableCell>
                          <TableCell align="left" sx={headCellSx}>مانده</TableCell>
                          <TableCell sx={{ ...headCellSx, width: 168 }}>مبلغ تخصیص (ریال)</TableCell>
                          <TableCell sx={{ ...headCellSx, width: 34 }} />
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rows.map((row) => {
                          const source = sourceOf(row);
                          const payable = targetPayable(row.target, row.bucket, source);
                          const paid = targetPaid(row.target, row.bucket, source);
                          const remaining = targetRemaining(row.target, row.bucket, source);
                          const over = numOf(row.amount) > Math.max(0, remaining);
                          const bucket = bucketMeta(row.target === 'invoice' ? 'net' : row.bucket);
                          return (
                            <TableRow key={row.key} hover>
                              <TableCell sx={cellSx}>
                                <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 800, color: INK }}>
                                  {titleOf(row)}
                                </Typography>
                                <Stack direction="row" spacing={0.4} sx={{ mt: 0.25 }}>
                                  <Chip
                                    size="small"
                                    label={bucket.shortLabel}
                                    sx={{
                                      height: 18, fontSize: 9.5, fontWeight: 800,
                                      bgcolor: alpha(bucket.color, 0.09), color: bucket.color,
                                    }}
                                  />
                                  <Chip
                                    size="small"
                                    label={targetKindLabel(row.target)}
                                    sx={{
                                      height: 18, fontSize: 9.5, fontWeight: 800,
                                      bgcolor: alpha(row.target === 'invoice' ? BLUE : VIOLET, 0.07),
                                      color: row.target === 'invoice' ? BLUE : VIOLET,
                                    }}
                                  />
                                </Stack>
                              </TableCell>
                              <TableCell align="left" sx={{ ...cellSx, color: MUTED }}>
                                {formatPersianNumber(payable)}
                              </TableCell>
                              <TableCell align="left" sx={{ ...cellSx, color: MUTED }}>
                                {formatPersianNumber(paid)}
                              </TableCell>
                              <TableCell align="left" sx={{ ...cellSx, color: remaining > 0 ? GREEN : RED, fontWeight: 900 }}>
                                {formatPersianNumber(remaining)}
                              </TableCell>
                              <TableCell sx={cellSx}>
                                <Stack direction="row" spacing={0.4} alignItems="center">
                                  <MoneyInput
                                    size="small"
                                    allowDecimals={false}
                                    value={row.amount}
                                    onChange={(value) => updateRow(row.key, { amount: value })}
                                    inputProps={{ style: { textAlign: 'left', fontSize: 11.5 } }}
                                    sx={{ width: 108, '& input': { color: over ? RED : INK, fontWeight: 800 } }}
                                  />
                                  <Tooltip title="پر کردن با مانده">
                                    <IconButton
                                      size="small"
                                      onClick={() => updateRow(row.key, { amount: String(Math.max(0, remaining)) })}
                                      sx={{ color: VIOLET, p: 0.35 }}
                                    >
                                      <RestartAltOutlinedIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                  </Tooltip>
                                </Stack>
                              </TableCell>
                              <TableCell sx={cellSx}>
                                <Tooltip title="حذف سند">
                                  <IconButton size="small" onClick={() => removeRow(row.key)} sx={{ color: RED, p: 0.3 }}>
                                    <CloseOutlinedIcon sx={{ fontSize: 14 }} />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </Box>
                ) : (
                  <Box sx={{
                    p: 1.3, borderRadius: '12px', textAlign: 'center',
                    border: `1px dashed ${borderColor}`, bgcolor: alpha(VIOLET, 0.02),
                  }}>
                    <Typography sx={{ fontSize: 11.5, color: MUTED }}>سندی انتخاب نشده است</Typography>
                  </Box>
                )}


                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.1 }}>
                  <Button
                    size="small"
                    onClick={applyAllRemaining}
                    disabled={!rows.length}
                    startIcon={<RestartAltOutlinedIcon sx={{ fontSize: 16 }} />}
                    sx={{ fontSize: 11.5, fontWeight: 800, color: VIOLET }}
                  >
                    تخصیص همهٔ مانده‌ها
                  </Button>
                  <Box sx={{ flex: 1 }} />
                  <Chip
                    size="small"
                    label={`جمع تخصیص: ${formatPersianNumber(allocated)} ریال`}
                    sx={{
                      height: 22, fontSize: 10.5, fontWeight: 800,
                      bgcolor: alpha(unallocated < 0 ? RED : GREEN, 0.1),
                      color: unallocated < 0 ? RED : GREEN,
                    }}
                  />
                </Stack>
              </Section>
            )}

            <Section icon={AccountBalanceWalletOutlinedIcon} title="مرجع و روش پرداخت" color={BLUE}>
              <Grid container spacing={1.2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    size="small"
                    fullWidth
                    label="شماره مرجع / سند"
                    value={form.reference || ''}
                    onChange={(event) => setForm((previous) => ({ ...previous, reference: event.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    size="small"
                    fullWidth
                    label="روش پرداخت"
                    value={form.method || ''}
                    onChange={(event) => setForm((previous) => ({ ...previous, method: event.target.value }))}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    size="small"
                    fullWidth
                    label="توضیحات"
                    multiline
                    rows={2}
                    value={form.note || ''}
                    onChange={(event) => setForm((previous) => ({ ...previous, note: event.target.value }))}
                  />
                </Grid>
              </Grid>
            </Section>


            <Section
              icon={AttachFileOutlinedIcon}
              title="پیوست فایل‌ها"
              color={TEAL}
              badge={(
                <Chip
                  size="small"
                  label={`${formatPersianNumber(pendingFiles.length + existingAttachments.length)} فایل`}
                  sx={{ height: 21, fontSize: 10.5, fontWeight: 800, bgcolor: alpha(TEAL, 0.1), color: TEAL }}
                />
              )}
            >
              <Box
                component="label"
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1, p: 1.15, borderRadius: '12px',
                  border: `1px dashed ${alpha(TEAL, 0.28)}`, bgcolor: alpha(TEAL, 0.025), cursor: 'pointer',
                  transition: 'background-color .18s ease, border-color .18s ease',
                  '&:hover': { bgcolor: alpha(TEAL, 0.05), borderColor: alpha(TEAL, 0.45) },
                }}
              >
                <input
                  type="file"
                  hidden
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.zip,.rar"
                  onChange={(event) => { onPickFiles(event.target.files); event.target.value = ''; }}
                />
                <Box sx={{
                  width: 34, height: 34, borderRadius: '10px', bgcolor: alpha(TEAL, 0.09), color: TEAL,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <AttachFileOutlinedIcon sx={{ fontSize: 19 }} />
                </Box>
                <Typography sx={{ flex: 1, fontSize: 11.5, fontWeight: 800, color: INK }}>انتخاب فایل پیوست</Typography>
                <Typography sx={{
                  fontSize: 11, fontWeight: 800, color: TEAL, border: `1px solid ${alpha(TEAL, 0.3)}`,
                  borderRadius: '8px', px: 1, py: 0.45,
                }}>
                  انتخاب
                </Typography>
              </Box>

              {existingAttachments.length > 0 ? (
                <Stack spacing={0.5} sx={{ mt: 1 }}>
                  {existingAttachments.map((attachment) => (
                    <Stack
                      key={attachment.id}
                      direction="row"
                      alignItems="center"
                      spacing={0.6}
                      sx={{ p: 0.7, borderRadius: '9px', border: `1px solid ${borderColor}`, bgcolor: '#fff' }}
                    >
                      <InsertDriveFileOutlinedIcon sx={{ fontSize: 17, color: TEAL }} />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 700, color: INK }}>
                          {attachment.title || attachment.file_name || 'فایل پیوست'}
                        </Typography>
                        <Typography sx={{ fontSize: 10.5, color: MUTED }}>{fileSizeLabel(attachment.size)}</Typography>
                      </Box>
                      {attachment.file_url ? (
                        <IconButton size="small" component="a" href={attachment.file_url} target="_blank" rel="noreferrer" sx={{ color: BLUE, p: 0.3 }}>
                          <DownloadOutlinedIcon sx={{ fontSize: 15 }} />
                        </IconButton>
                      ) : null}
                      <IconButton size="small" disabled={attachmentBusy} onClick={() => onDeleteAttachment(attachment)} sx={{ color: RED, p: 0.3 }}>
                        <DeleteOutlineIcon sx={{ fontSize: 15 }} />
                      </IconButton>
                    </Stack>
                  ))}
                </Stack>
              ) : null}

              {pendingFiles.length > 0 ? (
                <Stack spacing={0.5} sx={{ mt: 1 }}>
                  {pendingFiles.map((file, index) => (
                    <Stack
                      key={`${file.name}-${file.size}-${file.lastModified}`}
                      direction="row"
                      alignItems="center"
                      spacing={0.6}
                      sx={{ p: 0.7, borderRadius: '9px', border: `1px solid ${alpha(TEAL, 0.15)}`, bgcolor: alpha(TEAL, 0.025) }}
                    >
                      <InsertDriveFileOutlinedIcon sx={{ fontSize: 17, color: TEAL }} />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 700, color: INK }}>{file.name}</Typography>
                        <Typography sx={{ fontSize: 10.5, color: MUTED }}>{fileSizeLabel(file.size)}</Typography>
                      </Box>
                      <IconButton size="small" onClick={() => onRemovePending(index)} sx={{ color: RED, p: 0.3 }}>
                        <CloseOutlinedIcon sx={{ fontSize: 15 }} />
                      </IconButton>
                    </Stack>
                  ))}
                </Stack>
              ) : null}
            </Section>
          </Stack>



          <Box sx={{ position: { md: 'sticky' }, top: 8 }}>
            <Section
              icon={AccountBalanceWalletOutlinedIcon}
              title="خلاصهٔ پرداخت"
              color={GREEN}
              sx={{ bgcolor: surface }}
            >
              <SummaryRow label="مبلغ پرداخت" value={`${formatPersianNumber(amount)} ریال`} strong color={GREEN} />
              {foreignEquivalent ? (
                <SummaryRow
                  label={`معادل ارزی (${currencyLabel})`}
                  value={formatPersianNumber(Number(foreignEquivalent.toFixed(2)))}
                  muted
                />
              ) : null}
              <Divider sx={{ my: 0.8 }} />
              <SummaryRow label="جمع تخصیص" value={`${formatPersianNumber(allocated)} ریال`} strong color={VIOLET} />
              {isAdvance ? null : BUCKET_KEYS.map((key) => {
                const bucket = bucketMeta(key);
                if (!bucketTotals[key]) return null;
                return (
                  <SummaryRow
                    key={key}
                    label={bucket.label}
                    value={`${formatPersianNumber(bucketTotals[key])} ریال`}
                    color={bucket.color}
                  />
                );
              })}
              <SummaryRow
                label="تخصیص‌نیافته"
                value={`${formatPersianNumber(unallocated)} ریال`}
                color={unallocated === 0 ? MUTED : (unallocated < 0 ? RED : BLUE)}
              />
              <SummaryRow label="تعداد اسناد" value={isAdvance ? '—' : formatPersianNumber(rows.length)} />
              <SummaryRow
                label="پیوست‌ها"
                value={`${formatPersianNumber(pendingFiles.length + existingAttachments.length)} فایل`}
              />

              {isAdvance ? null : (
                <Box sx={{ mt: 1.2 }}>
                  <LinearProgress
                    variant="determinate"
                    value={allocationRatio}
                    sx={{
                      height: 6, borderRadius: 6, bgcolor: alpha(VIOLET, 0.1),
                      '& .MuiLinearProgress-bar': { bgcolor: unallocated < 0 ? RED : VIOLET, borderRadius: 6 },
                    }}
                  />
                  <Typography sx={{ mt: 0.5, fontSize: 10.5, color: MUTED, textAlign: 'left' }}>
                    {`${formatPersianNumber(allocationRatio)}٪ از مبلغ پرداخت تخصیص یافته است`}
                  </Typography>
                  {unallocated < 0 ? (
                    <Alert severity="warning" sx={{ mt: 1, fontSize: 11, borderRadius: '10px' }}>
                      جمع تخصیص از مبلغ پرداخت بیشتر است.
                    </Alert>
                  ) : null}
                </Box>
              )}
            </Section>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{
        px: 2.2, py: 1.4, gap: 1, bgcolor: surface,
        borderTop: `1px solid ${borderColor}`,
      }}>
        <Button onClick={onClose} sx={{ fontSize: 12, color: MUTED }}>انصراف</Button>
        <Box sx={{ flex: 1 }} />
        <Button
          variant="contained"
          onClick={onSave}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={15} sx={{ color: '#fff' }} /> : <CheckCircleOutlineIcon />}
          sx={{
            fontSize: 12, px: 2.8, borderRadius: '11px', bgcolor: TEAL,
            boxShadow: `0 10px 24px ${alpha(TEAL, 0.28)}`,
            '&:hover': { bgcolor: '#115e59' },
          }}
        >
          {uploading ? 'در حال بارگذاری فایل‌ها…' : (saving ? 'در حال ذخیره…' : 'ذخیره پرداخت')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ContractPaymentEditorDialog;
