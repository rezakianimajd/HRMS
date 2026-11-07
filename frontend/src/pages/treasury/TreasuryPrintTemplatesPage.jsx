import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControlLabel, MenuItem, Paper, Stack, Switch, TextField, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import SaveIcon from '@mui/icons-material/Save';
import axiosInstance from '../../core/api/axiosConfig';
import PageHeader from '../../core/components/ui/PageHeader';
import { ModuleTable, useModuleTheme, useRowHeight } from '../contracts/contractModuleUi';
import { asList, chipSx, useTreasuryTheme } from './treasuryMasterUi';

const API = '/treasury/print-templates/';

const KIND_LABEL = {
  receipt: 'فیش دریافت',
  payment: 'فیش پرداخت',
  bank_order: 'دستور بین‌بانکی',
  interbank: 'حواله بین‌بانکی (شبا)',
  cash: 'فیش نقدی',
  transfer: 'رسید انتقال',
  cheque_receipt: 'رسید تحویل چک',
};

const EMPTY = {
  id: null, name: '', kind: 'receipt', body: '', paper: 'A5', is_default: false, note: '',
};

const TemplatesPage = () => {
  const moduleTheme = useTreasuryTheme();
  const tableTheme = useModuleTheme();
  const qc = useQueryClient();
  const [dialog, setDialog] = useState({ open: false, ...EMPTY });
  const [preview, setPreview] = useState('');
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  const listQuery = useQuery({
    queryKey: ['treasury-print-templates'],
    queryFn: () => axiosInstance.get(API, { params: { page_size: 200 } })
      .then((response) => response.data),
    staleTime: 30_000,
  });
  const rows = asList(listQuery.data);

  const placeholdersQuery = useQuery({
    queryKey: ['treasury-print-placeholders', dialog.kind],
    queryFn: () => axiosInstance.get(`${API}placeholders/`, { params: { kind: dialog.kind } })
      .then((response) => response.data),
    enabled: dialog.open,
    staleTime: 300_000,
  });
  const placeholders = placeholdersQuery.data?.placeholders || [];

  const { ref: tableRef, rowHeight, tableHeight } = useRowHeight(
    tableTheme.tableTheme, Math.max(1, rows.length),
  );

  const close = () => {
    setDialog({ open: false, ...EMPTY });
    setPreview('');
    setError('');
  };

  const save = useMutation({
    mutationFn: () => (dialog.id
      ? axiosInstance.patch(`${API}${dialog.id}/`, dialog)
      : axiosInstance.post(API, dialog)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['treasury-print-templates'] });
      close();
      setToast('قالب ذخیره شد.');
    },
    onError: (err) => setError(
      err?.response?.data?.detail
      || Object.values(err?.response?.data || {}).flat().join(' · ')
      || 'ذخیرهٔ قالب انجام نشد.',
    ),
  });

  const remove = useMutation({
    mutationFn: (id) => axiosInstance.delete(`${API}${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['treasury-print-templates'] });
      setToast('قالب حذف شد.');
    },
  });

  const runPreview = () => {
    axiosInstance.post(`${API}preview/`, { kind: dialog.kind, body: dialog.body })
      .then((response) => setPreview(response.data.html))
      .catch(() => setError('پیش‌نمایش قالب ممکن نشد.'));
  };

  const openEdit = (row) => {
    setDialog({ open: true, ...row });
    setPreview('');
    setError('');
  };

  const insertPlaceholder = (key) => {
    setDialog((previous) => ({
      ...previous,
      body: `${previous.body || ''}{{${key}}}`,
    }));
  };

  const columns = useMemo(() => ([
    {
      key: 'name',
      label: 'قالب',
      width: '34%',
      render: (row) => (
        <Box>
          <Typography sx={{ fontSize: 11.5, fontWeight: 800 }}>{row.name}</Typography>
          <Typography sx={{ fontSize: 9.5, opacity: 0.65 }}>
            {KIND_LABEL[row.kind] || row.kind} · {row.paper}
          </Typography>
        </Box>
      ),
    },
    {
      key: 'kind',
      label: 'نوع سند',
      width: '16%',
      align: 'center',
      render: (row) => (
        <Chip size="small" label={KIND_LABEL[row.kind] || row.kind}
          sx={chipSx(moduleTheme.accent)} />
      ),
    },
    {
      key: 'default',
      label: 'پیش‌فرض',
      width: '12%',
      align: 'center',
      render: (row) => (row.is_default
        ? <Chip size="small" label="پیش‌فرض" sx={chipSx('#0f766e')} />
        : '—'),
    },
    { key: 'paper', label: 'کاغذ', width: '10%', align: 'center', render: (row) => row.paper },
    {
      key: 'actions',
      label: 'عملیات',
      width: '18%',
      align: 'center',
      render: (row) => (
        <Stack direction="row" spacing={0.5} justifyContent="center">
          <Button size="small" onClick={() => openEdit(row)}>ویرایش</Button>
          <Button size="small" sx={{ color: '#be123c' }} onClick={() => remove.mutate(row.id)}>
            <DeleteOutlineIcon sx={{ fontSize: 15 }} />
          </Button>
        </Stack>
      ),
    },
  ]), [moduleTheme.accent]); // eslint-disable-line

  return (
    <Box>
      <PageHeader
        icon={<DescriptionOutlinedIcon />}
        title="قالب‌های چاپ فیش و رسید"
        subtitle="نمونهٔ چاپ سازمانی با جای‌نگهدار ({{company_name}}، {{amount_words}} …) و بارکد اعتبارسنجی"
        badge={(
          <Chip size="small" label={`${rows.length} قالب`} sx={chipSx(moduleTheme.accent)} />
        )}
        actions={(
          <Button size="small" variant="contained" startIcon={<AddIcon sx={{ fontSize: 16 }} />}
            onClick={() => setDialog({ open: true, ...EMPTY })}>
            قالب جدید
          </Button>
        )}
      />

      {toast ? (
        <Alert severity="success" sx={{ mb: 1 }} onClose={() => setToast('')}>{toast}</Alert>
      ) : null}

      <Paper elevation={0} sx={{
        borderRadius: 'var(--hrms-table-radius, 16px)',
        border: '1px solid',
        borderColor: moduleTheme.cardBorderColor,
        px: `${moduleTheme.cardPadX}px`,
        py: `${moduleTheme.cardPadY}px`,
      }}>
        {listQuery.isLoading ? (
          <Box sx={{ py: 5, textAlign: 'center' }}><CircularProgress size={22} /></Box>
        ) : (
          <ModuleTable
            tableTheme={tableTheme.tableTheme}
            ariaLabel="قالب‌های چاپ خزانه"
            containerRef={tableRef}
            tableHeight={tableHeight}
            rowHeight={rowHeight}
            rows={rows}
            rowKey={(row) => row.id}
            emptyText="قالبی ثبت نشده است."
            columns={columns}
          />
        )}
      </Paper>

      <Dialog open={dialog.open} onClose={close} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontSize: 14, fontWeight: 800 }}>
          {dialog.id ? 'ویرایش قالب چاپ' : 'قالب چاپ جدید'}
        </DialogTitle>
        <DialogContent dividers>
          {error ? <Alert severity="error" sx={{ mb: 1, fontSize: 11.5 }}>{error}</Alert> : null}
          <Stack spacing={1}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
              <TextField size="small" label="نام قالب" value={dialog.name}
                onChange={(event) => setDialog((p) => ({ ...p, name: event.target.value }))}
                sx={{ flex: 1 }} />
              <TextField select size="small" label="نوع سند" value={dialog.kind}
                onChange={(event) => setDialog((p) => ({ ...p, kind: event.target.value }))}
                sx={{ width: 180 }}>
                {Object.entries(KIND_LABEL).map(([key, label]) => (
                  <MenuItem key={key} value={key} sx={{ fontSize: 12 }}>{label}</MenuItem>
                ))}
              </TextField>
              <TextField select size="small" label="کاغذ" value={dialog.paper}
                onChange={(event) => setDialog((p) => ({ ...p, paper: event.target.value }))}
                sx={{ width: 100 }}>
                <MenuItem value="A4">A4</MenuItem>
                <MenuItem value="A5">A5</MenuItem>
              </TextField>
              <FormControlLabel
                control={(
                  <Switch size="small" checked={dialog.is_default}
                    onChange={(event) => setDialog((p) => ({ ...p, is_default: event.target.checked }))} />
                )}
                label={<Typography sx={{ fontSize: 11.5 }}>پیش‌فرض این نوع</Typography>}
              />
            </Stack>

            <Box>
              <Typography sx={{ fontSize: 11, opacity: 0.75, mb: 0.5 }}>
                جای‌نگهدارها (کلیک = درج در انتهای قالب)
              </Typography>
              <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
                {placeholders.map((item) => (
                  <Chip key={item.key} size="small" label={`${item.label}`}
                    onClick={() => insertPlaceholder(item.key)}
                    sx={{ ...chipSx(moduleTheme.accent), cursor: 'pointer', fontSize: 9.5 }} />
                ))}
              </Stack>
            </Box>

            <TextField
              multiline
              minRows={10}
              label="بدنهٔ قالب (HTML)"
              value={dialog.body}
              onChange={(event) => setDialog((p) => ({ ...p, body: event.target.value }))}
              inputProps={{ dir: 'ltr', style: { fontFamily: 'monospace', fontSize: 11 } }}
            />
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="outlined" onClick={runPreview}>پیش‌نمایش</Button>
              <TextField size="small" label="یادداشت" value={dialog.note}
                onChange={(event) => setDialog((p) => ({ ...p, note: event.target.value }))}
                sx={{ flex: 1 }} />
            </Stack>
            {preview ? (
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '10px', p: 1 }}>
                <iframe title="قالب پیش‌نمایش" srcDoc={preview}
                  style={{ width: '100%', height: 320, border: 0, background: '#fff' }} />
              </Box>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.25 }}>
          <Button size="small" onClick={close}>انصراف</Button>
          <Button size="small" variant="contained" startIcon={<SaveIcon sx={{ fontSize: 16 }} />}
            disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? 'در حال ذخیره…' : 'ذخیره'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TemplatesPage;

