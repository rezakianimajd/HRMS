import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Autocomplete, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, FormControlLabel, IconButton, InputAdornment, MenuItem,
  Paper, Stack, Switch, TextField, Tooltip, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import axiosInstance from '../../core/api/axiosConfig';
import PageHeader from '../../core/components/ui/PageHeader';
import { useModulePalette } from '../../core/context/ModulePaletteContext';
import { ModuleTable, useModuleTheme, useRowHeight } from '../contracts/contractModuleUi';
import { formatPersianNumber, toPersianDigits } from '../../core/utils/numberUtils';
import { toJalali } from '../../core/utils/dateUtils';

/**
 * لایهٔ مشترک صفحات Master Data خزانه (بانک، شعبه، حساب، پایانه، روش پرداخت).
 * تمام ظاهر از توکن‌های استودیو تم می‌آید؛ هیچ رنگ/شعاع هاردکدی ندارد.
 */

const MODULE_SLUG = 'treasury';
export const FALLBACK_ACCENT = '#14b8a6';

export const useTreasuryAccent = () => {
  const { getPalette } = useModulePalette();
  const palette = typeof getPalette === 'function' ? getPalette(MODULE_SLUG) : null;
  return palette?.accent || palette?.primary || FALLBACK_ACCENT;
};

export const useTreasuryTheme = () => {
  const moduleTheme = useModuleTheme();
  const accent = useTreasuryAccent();
  return { ...moduleTheme, accent };
};

export const chipSx = (color) => ({
  height: 20,
  fontSize: 10.5,
  fontWeight: 800,
  bgcolor: `${color}14`,
  color,
  border: `1px solid ${color}33`,
  '& .MuiChip-label': { px: 0.8 },
});

export const asList = (payload) => (
  Array.isArray(payload) ? payload : payload?.results || []
);

export const dateLabel = (value) => (value ? toJalali(String(value).slice(0, 10)) : '—');

export const moneyLabel = (value) => (
  value === null || value === undefined || value === '' ? '—' : formatPersianNumber(value)
);

const EMPTY_VALUE = '';

const fieldEmpty = (field) => {
  if (field.default !== undefined) return field.default;
  if (field.type === 'switch') return false;
  if (field.type === 'number') return '';
  return EMPTY_VALUE;
};

export const emptyValues = (fields) => Object.fromEntries(
  fields.map((field) => [field.name, fieldEmpty(field)]),
);

const FieldControl = ({ field, value, onChange, fieldOptions, values }) => {
  if (field.type === 'switch') {
    return (
      <FormControlLabel
        control={(
          <Switch
            size="small"
            checked={Boolean(value)}
            onChange={(event) => onChange(event.target.checked)}
          />
        )}
        label={<Typography sx={{ fontSize: 11.5 }}>{field.label}</Typography>}
      />
    );
  }
  if (field.type === 'select') {
    const source = typeof field.options === 'function'
      ? field.options(values || {})
      : field.options || fieldOptions?.[field.name] || [];
    return (
      <TextField
        select
        size="small"
        label={field.label}
        value={value ?? ''}
        required={field.required}
        helperText={field.helper}
        onChange={(event) => onChange(event.target.value)}
      >
        {!field.required ? <MenuItem value="">—</MenuItem> : null}
        {source.map((option) => (
          <MenuItem key={option.value} value={option.value} sx={{ fontSize: 12 }}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>
    );
  }
  if (field.type === 'autocomplete') {
    const source = fieldOptions?.[field.name] || [];
    return (
      <Autocomplete
        size="small"
        options={source}
        value={source.find((item) => item.value === value) || null}
        onChange={(_event, option) => onChange(option?.value ?? '')}
        getOptionLabel={(option) => option?.label || ''}
        isOptionEqualToValue={(a, b) => a.value === b.value}
        noOptionsText="موردی یافت نشد"
        renderInput={(params) => (
          <TextField {...params} label={field.label} helperText={field.helper} />
        )}
      />
    );
  }
  return (
    <TextField
      size="small"
      label={field.label}
      type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
      value={value ?? ''}
      required={field.required}
      helperText={field.helper}
      multiline={field.multiline}
      minRows={field.multiline ? 2 : undefined}
      InputLabelProps={field.type === 'date' ? { shrink: true } : undefined}
      onChange={(event) => onChange(event.target.value)}
    />
  );
};

export const MasterDataDialog = ({
  open, title, fields, values, setValues, onClose, onSave, saving, error, fieldOptions,
}) => (
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
    <DialogTitle sx={{ fontSize: 14, fontWeight: 800 }}>{title}</DialogTitle>
    <DialogContent dividers>
      {error ? (
        <Alert severity="error" sx={{ mb: 1, fontSize: 11.5 }}>{error}</Alert>
      ) : null}
      <Stack spacing={1.1}>
        {fields.map((field) => (
          <FieldControl
            key={field.name}
            field={field}
            value={values[field.name]}
            values={values}
            fieldOptions={fieldOptions}
            onChange={(next) => setValues((previous) => ({ ...previous, [field.name]: next }))}
          />
        ))}
      </Stack>
    </DialogContent>
    <DialogActions sx={{ px: 2, py: 1.25 }}>
      <Button size="small" onClick={onClose}>انصراف</Button>
      <Button size="small" variant="contained" disabled={saving} onClick={onSave}>
        {saving ? 'در حال ذخیره…' : 'ذخیره'}
      </Button>
    </DialogActions>
  </Dialog>
);

export const MasterDataPage = ({
  title, subtitle, icon, endpoint, queryKey, columns, fields, fieldOptions,
  addLabel = 'افزودن', searchPlaceholder = 'جست‌وجو…', params, emptyText,
  rowKey = (row) => row.id, transformSave,
}) => {
  const moduleTheme = useTreasuryTheme();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState({ open: false, id: null, values: emptyValues(fields) });
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const listQuery = useQuery({
    queryKey: [...queryKey, search],
    queryFn: () => axiosInstance.get(endpoint, {
      params: { search, page_size: 300, ...(params || {}) },
    }).then((response) => response.data),
    staleTime: 30_000,
  });
  const rows = asList(listQuery.data);
  const { ref: tableRef, rowHeight, tableHeight } = useRowHeight(
    moduleTheme.tableTheme, Math.max(1, rows.length),
  );

  const closeDialog = () => {
    setDialog({ open: false, id: null, values: emptyValues(fields) });
    setError('');
  };

  const save = useMutation({
    mutationFn: () => {
      const payload = transformSave ? transformSave(dialog.values) : dialog.values;
      return dialog.id
        ? axiosInstance.patch(`${endpoint}${dialog.id}/`, payload)
        : axiosInstance.post(endpoint, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      closeDialog();
      setToast('اطلاعات ذخیره شد.');
    },
    onError: (err) => {
      const detail = err?.response?.data;
      setError(
        typeof detail === 'string' ? detail
          : (detail && typeof detail === 'object'
            ? Object.entries(detail).map(([key, value]) => `${key}: ${[].concat(value).join(' ')}`).join(' · ')
            : '') || err?.message || 'ذخیره انجام نشد.',
      );
    },
  });

  const remove = useMutation({
    mutationFn: (id) => axiosInstance.delete(`${endpoint}${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      setToast('ردیف غیرفعال شد (حذف فیزیکی انجام نمی‌شود).');
    },
  });

  const openCreate = () => {
    setDialog({ open: true, id: null, values: emptyValues(fields) });
    setError('');
  };

  const openEdit = (row) => {
    const values = emptyValues(fields);
    fields.forEach((field) => {
      if (row[field.name] !== undefined && row[field.name] !== null) {
        values[field.name] = row[field.name];
      }
    });
    setDialog({ open: true, id: row.id, values });
    setError('');
  };

  const allColumns = useMemo(() => ([
    ...columns,
    {
      key: 'actions',
      label: 'عملیات',
      width: '9%',
      align: 'center',
      render: (row) => (
        <Stack direction="row" spacing={0.2} justifyContent="center">
          <Tooltip title="ویرایش">
            <IconButton size="small" aria-label="ویرایش" onClick={() => openEdit(row)}>
              <EditOutlinedIcon sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="غیرفعال‌سازی">
            <IconButton size="small" aria-label="غیرفعال‌سازی"
              onClick={() => remove.mutate(row.id)}>
              <DeleteOutlineIcon sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ]), [columns, fields]); // eslint-disable-line


  return (
    <Box>
      <PageHeader
        icon={icon}
        title={title}
        subtitle={subtitle}
        badge={(
          <Chip
            size="small"
            label={`${formatPersianNumber(rows.length)} ردیف`}
            sx={chipSx(moduleTheme.accent)}
          />
        )}
        actions={(
          <>
            <Tooltip title="بازخوانی">
              <IconButton size="small" aria-label="بازخوانی"
                onClick={() => listQuery.refetch()}>
                <RefreshIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Button
              size="small"
              variant="contained"
              startIcon={<AddIcon sx={{ fontSize: 16 }} />}
              onClick={openCreate}
            >
              {addLabel}
            </Button>
          </>
        )}
      />

      {error && !dialog.open ? (
        <Alert severity="error" sx={{ mb: 1, borderRadius: '12px' }}
          onClose={() => setError('')}>
          <Typography sx={{ fontSize: 12 }}>{error}</Typography>
        </Alert>
      ) : null}
      {toast ? (
        <Alert severity="success" sx={{ mb: 1, borderRadius: '12px' }}
          onClose={() => setToast('')}>
          <Typography sx={{ fontSize: 12 }}>{toast}</Typography>
        </Alert>
      ) : null}

      <Paper elevation={0} sx={{
        borderRadius: 'var(--hrms-table-radius, 16px)',
        border: '1px solid',
        borderColor: moduleTheme.cardBorderColor,
        bgcolor: 'background.paper',
        boxShadow: 'none',
        px: `${moduleTheme.cardPadX}px`,
        py: `${moduleTheme.cardPadY}px`,
      }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}
          alignItems={{ xs: 'stretch', md: 'center' }} sx={{ mb: 1 }}>
          <TextField
            size="small"
            value={search}
            placeholder={searchPlaceholder}
            inputProps={{ 'aria-label': searchPlaceholder }}
            onChange={(event) => setSearch(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 16 }} />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: { xs: '100%', md: 260 } }}
          />
          <Box sx={{ flex: 1 }} />
          {listQuery.isFetching ? (
            <CircularProgress size={14} sx={{ color: moduleTheme.accent }} />
          ) : null}
        </Stack>

        {listQuery.isLoading ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <CircularProgress size={22} sx={{ color: moduleTheme.accent }} />
          </Box>
        ) : (
          <ModuleTable
            tableTheme={moduleTheme.tableTheme}
            ariaLabel={title}
            containerRef={tableRef}
            tableHeight={tableHeight}
            rowHeight={rowHeight}
            rows={rows}
            rowKey={rowKey}
            emptyText={emptyText || 'ردیفی ثبت نشده است.'}
            columns={allColumns}
          />
        )}
      </Paper>

      <MasterDataDialog
        open={dialog.open}
        title={dialog.id ? `ویرایش ${title}` : addLabel}
        fields={fields}
        values={dialog.values}
        setValues={(updater) => setDialog((previous) => ({
          ...previous,
          values: typeof updater === 'function' ? updater(previous.values) : updater,
        }))}
        fieldOptions={fieldOptions}
        onClose={closeDialog}
        onSave={() => save.mutate()}
        saving={save.isPending}
        error={error}
      />
    </Box>
  );
};

export { toPersianDigits };

