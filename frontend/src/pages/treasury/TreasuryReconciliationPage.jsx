import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, MenuItem, Paper, Stack, TextField, Typography,
} from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import axiosInstance from '../../core/api/axiosConfig';
import PageHeader from '../../core/components/ui/PageHeader';
import JalaliMaskedDateInput from '../../core/components/ui/JalaliMaskedDateInput';
import { ModuleTable, useModuleTheme, useRowHeight } from '../contracts/contractModuleUi';
import { formatPersianNumber } from '../../core/utils/numberUtils';
import { asList, chipSx, dateLabel, moneyLabel, useTreasuryTheme } from './treasuryMasterUi';

const API = '/treasury/statement-lines/';

const STATUS_COLOR = {
  unmatched: '#b45309',
  matched: '#0f766e',
  partial: '#0ea5e9',
  ignored: '#64748b',
  adjusted: '#7c3aed',
};

const SAMPLE_CSV = `1404/07/19,credit,5000000,REF-1,واریز مشتری الف
1404/07/19,debit,1200000,REF-2,کارمزد بانکی`;

const parseCsv = (text) => text.split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => {
    const [jDate, direction, amount, reference, description] = line.split(',');
    const digits = String(jDate || '').replace(/\//g, '-');
    return {
      jDate: digits,
      direction: (direction || 'credit').trim(),
      amount: String(amount || '').replace(/,/g, '').trim(),
      reference: (reference || '').trim(),
      description: (description || '').trim(),
    };
  });

const ReconciliationPage = () => {
  const moduleTheme = useTreasuryTheme();
  const tableTheme = useModuleTheme();
  const qc = useQueryClient();
  const [entityId, setEntityId] = useState('');
  const [status, setStatus] = useState('unmatched');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [csvText, setCsvText] = useState(SAMPLE_CSV);
  const [importEntity, setImportEntity] = useState('');
  const [matchLine, setMatchLine] = useState(null);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  const entitiesQuery = useQuery({
    queryKey: ['treasury-entity-balances'],
    queryFn: () => axiosInstance.get('/treasury/treasury-entities/balances/')
      .then((response) => response.data),
    staleTime: 60_000,
  });
  const entities = asList(entitiesQuery.data);

  const linesQuery = useQuery({
    queryKey: ['treasury-statement-lines', entityId, status, dateFrom, dateTo],
    queryFn: () => axiosInstance.get(API, {
      params: {
        entity: entityId || undefined,
        status: status || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        page_size: 200,
      },
    }).then((response) => response.data),
    staleTime: 15_000,
  });
  const lines = asList(linesQuery.data);

  const summaryQuery = useQuery({
    queryKey: ['treasury-statement-summary'],
    queryFn: () => axiosInstance.get(`${API}summary/`).then((response) => response.data),
    staleTime: 30_000,
  });

  const candidatesQuery = useQuery({
    queryKey: ['treasury-match-candidates', matchLine?.entity],
    queryFn: () => axiosInstance.get('/treasury/treasury-transactions/', {
      params: { entity: matchLine.entity, status: 'posted', page_size: 100, ordering: '-date' },
    }).then((response) => response.data),
    enabled: Boolean(matchLine?.entity),
    staleTime: 15_000,
  });
  const candidates = asList(candidatesQuery.data);

  const { ref: tableRef, rowHeight, tableHeight } = useRowHeight(
    tableTheme.tableTheme, Math.max(1, lines.length),
  );

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['treasury-statement-lines'] });
    qc.invalidateQueries({ queryKey: ['treasury-statement-summary'] });
  };

  const importLines = useMutation({
    mutationFn: () => axiosInstance.post(`${API}import-lines/`, {
      entity: importEntity || entityId,
      rows: parseCsv(csvText).map((row) => ({
        date: row.jDate,
        direction: row.direction === 'debit' ? 'debit' : 'credit',
        amount: row.amount,
        reference: row.reference,
        description: row.description,
      })),
    }),
    onSuccess: (response) => {
      refresh();
      setImportOpen(false);
      setToast(`${formatPersianNumber(response.data.created)} ردیف گردش وارد شد.`);
      setError('');
    },
    onError: () => setError('ورود گردش بانک انجام نشد (تاریخ/مبلغ را بررسی کنید).'),
  });

  const autoMatch = useMutation({
    mutationFn: () => axiosInstance.post(`${API}auto-match/`, {
      entity: entityId || undefined,
      days: 3,
    }),
    onSuccess: (response) => {
      refresh();
      setToast(`${formatPersianNumber(response.data.matched)} ردیف از ${formatPersianNumber(response.data.checked)} ردیف تطبیق شد.`);
    },
    onError: () => setError('تطبیق خودکار انجام نشد.'),
  });

  const matchManual = useMutation({
    mutationFn: ({ line, transaction }) => axiosInstance.post(`${API}${line.id}/match/`, {
      transaction: transaction.id,
    }),
    onSuccess: () => { refresh(); setMatchLine(null); setToast('ردیف به تراکنش انتخاب‌شده متصل شد.'); },
    onError: () => setError('تطبیق دستی انجام نشد.'),
  });

  const ignore = useMutation({
    mutationFn: (line) => axiosInstance.post(`${API}${line.id}/ignore/`, { note: 'نادیده‌گرفته‌شده' }),
    onSuccess: () => { refresh(); setToast('ردیف نادیده‌گرفته شد.'); },
  });

  const adjust = useMutation({
    mutationFn: (line) => axiosInstance.post(`${API}${line.id}/mark-adjusted/`, {
      note: 'اختلاف/کارمزد ثبت شد',
    }),
    onSuccess: () => { refresh(); setToast('ردیف به‌عنوان اختلاف ثبت شد.'); },
  });

  const columns = useMemo(() => ([
    { key: 'date', label: 'تاریخ', width: '10%', render: (row) => dateLabel(row.date) },
    { key: 'entity', label: 'حساب', width: '16%', render: (row) => row.entity_name || '—' },
    {
      key: 'direction',
      label: 'گردش',
      width: '10%',
      align: 'center',
      render: (row) => (
        <Chip size="small" label={row.direction_display}
          sx={chipSx(row.direction === 'credit' ? '#0f766e' : '#be123c')} />
      ),
    },
    {
      key: 'amount',
      label: 'مبلغ',
      width: '13%',
      align: 'center',
      render: (row) => moneyLabel(row.amount),
    },
    { key: 'reference', label: 'پیگیری/مرجع', width: '14%', render: (row) => row.reference || '—' },
    { key: 'description', label: 'شرح بانک', width: '18%', render: (row) => row.description || '—' },
    {
      key: 'status',
      label: 'وضعیت',
      width: '10%',
      align: 'center',
      render: (row) => (
        <Chip size="small" label={row.status_display}
          sx={chipSx(STATUS_COLOR[row.status] || '#64748b')} />
      ),
    },
    {
      key: 'matched',
      label: 'تراکنش',
      width: '12%',
      render: (row) => row.matched_number || '—',
    },
    {
      key: 'actions',
      label: 'عملیات',
      width: '17%',
      align: 'center',
      render: (row) => (
        <Stack direction="row" spacing={0.3} justifyContent="center" useFlexGap flexWrap="wrap">
          <Button size="small" onClick={() => setMatchLine(row)}
            disabled={row.status === 'matched'}>
            تطبیق
          </Button>
          <Button size="small" onClick={() => ignore.mutate(row)}>نادیده</Button>
          <Button size="small" sx={{ color: '#7c3aed' }} onClick={() => adjust.mutate(row)}>
            اختلاف
          </Button>
        </Stack>
      ),
    },
  ]), [ignore, adjust]); // eslint-disable-line

  const summary = asList(summaryQuery.data);

  return (
    <Box>
      <PageHeader
        icon={<CompareArrowsIcon />}
        title="مغایرت بانکی"
        subtitle="ورود گردش بانک، تطبیق خودکار/دستی با تراکنش‌ها و ثبت اختلاف/کارمزد"
        badge={(
          <Chip size="small" label={`${lines.length} ردیف`} sx={chipSx(moduleTheme.accent)} />
        )}
        actions={(
          <>
            <Button size="small" variant="outlined" startIcon={<CloudUploadIcon sx={{ fontSize: 16 }} />}
              onClick={() => { setImportEntity(entityId); setImportOpen(true); }}>
              ورود گردش
            </Button>
            <Button size="small" variant="contained" startIcon={<AutoFixHighIcon sx={{ fontSize: 16 }} />}
              disabled={autoMatch.isPending} onClick={() => autoMatch.mutate()}>
              {autoMatch.isPending ? 'در حال تطبیق…' : 'تطبیق خودکار'}
            </Button>
          </>
        )}
      />

      {error ? <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError('')}>{error}</Alert> : null}
      {toast ? <Alert severity="success" sx={{ mb: 1 }} onClose={() => setToast('')}>{toast}</Alert> : null}

      <Paper elevation={0} sx={{
        borderRadius: 'var(--hrms-table-radius, 16px)',
        border: '1px solid',
        borderColor: moduleTheme.cardBorderColor,
        mb: 1.25,
        px: `${moduleTheme.cardPadX}px`,
        py: `${moduleTheme.cardPadY}px`,
      }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} useFlexGap flexWrap="wrap">
          <TextField select size="small" label="حساب/صندوق" value={entityId}
            onChange={(event) => setEntityId(event.target.value)} sx={{ minWidth: 200 }}>
            <MenuItem value="">همه</MenuItem>
            {entities.map((entity) => (
              <MenuItem key={entity.id} value={entity.id} sx={{ fontSize: 12 }}>
                {entity.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField select size="small" label="وضعیت" value={status}
            onChange={(event) => setStatus(event.target.value)} sx={{ minWidth: 160 }}>
            <MenuItem value="">همه</MenuItem>
            <MenuItem value="unmatched">تطبیق‌نشده</MenuItem>
            <MenuItem value="matched">تطبیق‌شده</MenuItem>
            <MenuItem value="ignored">نادیده</MenuItem>
            <MenuItem value="adjusted">اختلاف</MenuItem>
          </TextField>
          <JalaliMaskedDateInput label="از تاریخ" value={dateFrom}
            onChange={setDateFrom} variant="outlined" size="small" />
          <JalaliMaskedDateInput label="تا تاریخ" value={dateTo}
            onChange={setDateTo} variant="outlined" size="small" />
          <Box sx={{ flex: 1 }} />
          <Stack direction="row" spacing={0.6} useFlexGap flexWrap="wrap">
            {summary.map((row) => (
              <Chip key={row.entity} size="small"
                label={`${row.entity} — باز: ${formatPersianNumber(row.unmatched || 0)}`}
                sx={chipSx(moduleTheme.accent)} />
            ))}
          </Stack>
        </Stack>
      </Paper>

      <Paper elevation={0} sx={{
        borderRadius: 'var(--hrms-table-radius, 16px)',
        border: '1px solid',
        borderColor: moduleTheme.cardBorderColor,
        px: `${moduleTheme.cardPadX}px`,
        py: `${moduleTheme.cardPadY}px`,
      }}>
        {linesQuery.isLoading ? (
          <Box sx={{ py: 5, textAlign: 'center' }}><CircularProgress size={22} /></Box>
        ) : (
          <ModuleTable
            tableTheme={tableTheme.tableTheme}
            ariaLabel="ردیف‌های گردش بانک"
            containerRef={tableRef}
            tableHeight={tableHeight}
            rowHeight={rowHeight}
            rows={lines}
            rowKey={(row) => row.id}
            emptyText="ردیفی وارد نشده است؛ با «ورود گردش» شروع کنید."
            columns={columns}
          />
        )}
      </Paper>


      <Dialog open={importOpen} onClose={() => setImportOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 14, fontWeight: 800 }}>ورود گردش بانک</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1}>
            <TextField select size="small" label="حساب/صندوق" value={importEntity}
              onChange={(event) => setImportEntity(event.target.value)}>
              {entities.map((entity) => (
                <MenuItem key={entity.id} value={entity.id} sx={{ fontSize: 12 }}>
                  {entity.name}
                </MenuItem>
              ))}
            </TextField>
            <Typography sx={{ fontSize: 10.5, opacity: 0.75 }}>
              هر خط: تاریخ شمسی، جهت (credit/debit)، مبلغ، شماره پیگیری، شرح
            </Typography>
            <TextField
              multiline
              minRows={6}
              label="ردیف‌های گردش (CSV)"
              value={csvText}
              onChange={(event) => setCsvText(event.target.value)}
              inputProps={{ dir: 'ltr', style: { fontFamily: 'monospace', fontSize: 11 } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.25 }}>
          <Button size="small" onClick={() => setImportOpen(false)}>انصراف</Button>
          <Button size="small" variant="contained" disabled={importLines.isPending}
            onClick={() => importLines.mutate()}>
            {importLines.isPending ? 'در حال ورود…' : 'ورود'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(matchLine)} onClose={() => setMatchLine(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 14, fontWeight: 800 }}>تطبیق دستی با تراکنش</DialogTitle>
        <DialogContent dividers>
          {matchLine ? (
            <Stack spacing={1}>
              <Typography sx={{ fontSize: 11.5 }}>
                {`ردیف ${dateLabel(matchLine.date)} — ${moneyLabel(matchLine.amount)} — ${matchLine.description || ''}`}
              </Typography>
              {candidatesQuery.isLoading ? <CircularProgress size={18} /> : null}
              <Box sx={{ maxHeight: 320, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: '10px' }}>
                {candidates.map((transaction) => (
                  <Stack key={transaction.id} direction="row" alignItems="center" spacing={1}
                    sx={{ px: 1, py: 0.6, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography sx={{ fontSize: 11, flex: 1 }}>
                      {`${transaction.number || `#${transaction.id}`} — ${dateLabel(transaction.date)} — ${transaction.party || '—'}`}
                    </Typography>
                    <Typography sx={{ fontSize: 11, fontWeight: 800 }}>
                      {moneyLabel(transaction.amount)}
                    </Typography>
                    <Button size="small"
                      onClick={() => matchManual.mutate({ line: matchLine, transaction })}>
                      انتخاب
                    </Button>
                  </Stack>
                ))}
                {!candidatesQuery.isLoading && !candidates.length ? (
                  <Typography sx={{ p: 1.5, fontSize: 11, opacity: 0.7 }}>
                    تراکنش ثبت‌شده‌ای برای این حساب وجود ندارد.
                  </Typography>
                ) : null}
              </Box>
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.25 }}>
          <Button size="small" onClick={() => setMatchLine(null)}>بستن</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReconciliationPage;

