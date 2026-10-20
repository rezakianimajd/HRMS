import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Alert, Box, Button, Chip, CircularProgress, FormControl, Grid,
  InputAdornment, InputLabel, MenuItem, Paper, Select, Stack, TextField,
  ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import DownloadIcon from '@mui/icons-material/Download';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import TableRowsIcon from '@mui/icons-material/TableRows';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { formatPersianNumber } from '../core/utils/numberUtils';
import PageHeader from '../core/components/ui/PageHeader';
import { KpiTile } from './accounting/AccountingDashboardUI';
import {
  EXPIRING_ACCENT, ExpiryCard, ExpirySummaryCard, ExpiryTable, ExpiryUrgentCard,
  daysUntil, effAmount, effEnd, expiryMeta,
} from './contracts/ExpiringWorkspaceUI';

const compactMoney = (value, currency = '') => {
  const amount = Number(value) || 0;
  if (Math.abs(amount) >= 1000000000) return `${formatPersianNumber((amount / 1000000000).toFixed(1))} میلیارد ${currency}`.trim();
  if (Math.abs(amount) >= 1000000) return `${formatPersianNumber((amount / 1000000).toFixed(1))} میلیون ${currency}`.trim();
  return `${formatPersianNumber(amount)} ${currency}`.trim();
};

const ContractExpiringPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [rangeFilter, setRangeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('days');
  const [view, setView] = useState('cards');

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['ext-contracts-expiring'],
    queryFn: () => axiosInstance.get('/external-contracts/', { params: { page_size: 500 } }).then((response) => response.data),
  });
  const list = Array.isArray(data) ? data : data?.results || [];

  const rows = useMemo(() => list
    .filter((contract) => effEnd(contract))
    .map((contract) => {
      const end = effEnd(contract);
      const days = daysUntil(end);
      return { contract, end, days, meta: expiryMeta(days) };
    }), [list]);

  const counts = useMemo(() => rows.reduce((acc, row) => {
    acc[row.meta.key] = (acc[row.meta.key] || 0) + 1;
    return acc;
  }, { expired: 0, soon30: 0, soon60: 0, soon90: 0, later: 0 }), [rows]);

  const monitoredRows = useMemo(
    () => rows.filter((row) => ['expired', 'soon30', 'soon60', 'soon90'].includes(row.meta.key)),
    [rows],
  );
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    let result = monitoredRows.filter((row) => {
      if (rangeFilter !== 'all' && row.meta.key !== rangeFilter) return false;
      if (!query) return true;
      const contract = row.contract;
      return [contract.subject, contract.party_name, contract.number]
        .some((value) => String(value || '').toLowerCase().includes(query));
    });
    result = [...result].sort((a, b) => {
      if (sortBy === 'amount') return effAmount(b.contract) - effAmount(a.contract);
      if (sortBy === 'newest') return String(b.end || '').localeCompare(String(a.end || ''));
      return (a.days ?? 99999) - (b.days ?? 99999);
    });
    return result;
  }, [monitoredRows, search, rangeFilter, sortBy]);

  const urgentRows = useMemo(
    () => [...monitoredRows].sort((a, b) => (a.days ?? 99999) - (b.days ?? 99999)).slice(0, 5).map((row) => row.contract),
    [monitoredRows],
  );
  const atRiskAmount = monitoredRows
    .filter((row) => row.meta.key === 'expired' || row.meta.key === 'soon30')
    .reduce((sum, row) => sum + effAmount(row.contract), 0);
  const currency = monitoredRows[0]?.contract?.currency_name || monitoredRows[0]?.contract?.currency_symbol || 'ریال';
  const monitoredCount = monitoredRows.length;

  const exportCsv = () => {
    const headers = ['قرارداد', 'شماره', 'طرف قرارداد', 'تاریخ پایان', 'روز مانده', 'مبلغ مؤثر', 'بازه'];
    const body = filtered.map(({ contract, end, days, meta }) => [
      contract.subject || '', contract.number || '', contract.party_name || '',
      end || '', days ?? '', effAmount(contract), meta.label,
    ]);
    const csv = [headers, ...body]
      .map((cells) => cells.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'expiring-contracts.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  if (isLoading) return <Box sx={{ py: 9, textAlign: 'center' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ pb: 1 }}>
      <PageHeader
        icon={<NotificationsActiveIcon />}
        title="قراردادهای رو به انقضا"
        subtitle="پایش تاریخ پایان مؤثر قراردادها با احتساب آخرین الحاقیه"
        badge={<Chip size="small" label={`${formatPersianNumber(monitoredCount)} قرارداد در بازه ۹۰ روز`}
          sx={{ height: 23, fontWeight: 800, bgcolor: alpha(EXPIRING_ACCENT, 0.09), color: '#b45309' }} />}
        actions={(
          <>
            <Tooltip title="به‌روزرسانی">
              <span><Button variant="outlined" disabled={isFetching} onClick={() => refetch()} sx={{ minWidth: 40, px: 1 }}><RefreshIcon fontSize="small" /></Button></span>
            </Tooltip>
            <Button variant="outlined" startIcon={<PrintOutlinedIcon />} onClick={() => window.print()}>چاپ</Button>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={exportCsv}>خروجی</Button>
          </>
        )}
      />

      <Grid container spacing={1.5}>
        <Grid item xs={12} lg={3} sx={{ order: { xs: 2, lg: 1 } }}>
          <Stack spacing={1.5} sx={{ position: { lg: 'sticky' }, top: 16 }}>
            <ExpirySummaryCard counts={counts} total={monitoredCount} laterCount={counts.later || 0} isLoading={isLoading} />
            <ExpiryUrgentCard rows={urgentRows} onOpen={(contract) => navigate(`/external-contracts/${contract.id}`)} />
          </Stack>
        </Grid>

        <Grid item xs={12} lg={9} sx={{ order: { xs: 1, lg: 2 } }}>
          <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
            <Grid item xs={6} md={3}><KpiTile icon={NotificationsActiveIcon} label="در بازه پایش" value={formatPersianNumber(monitoredCount)} suffix="قرارداد" color={EXPIRING_ACCENT} hint={`${formatPersianNumber(counts.later || 0)} بیش از ۹۰ روز`} /></Grid>
            <Grid item xs={6} md={3}><KpiTile icon={WarningAmberIcon} label="منقضی‌شده" value={formatPersianNumber(counts.expired || 0)} suffix="قرارداد" color="#be123c" hint="نیازمند اقدام فوری" /></Grid>
            <Grid item xs={6} md={3}><KpiTile icon={NotificationsActiveIcon} label="انقضا تا ۳۰ روز" value={formatPersianNumber(counts.soon30 || 0)} suffix="قرارداد" color="#ea580c" hint={`${formatPersianNumber(counts.soon60 || 0)} مورد تا ۶۰ روز`} /></Grid>
            <Grid item xs={6} md={3}><KpiTile icon={DownloadIcon} label="مبلغ در معرض خطر" value={compactMoney(atRiskAmount, currency)} color="#b45309" size={16} hint="منقضی‌شده و تا ۳۰ روز" /></Grid>
          </Grid>

          <Paper elevation={0} sx={{ p: 1.25, mb: 1.5, borderRadius: '16px', border: '1px solid #e5edf1' }}>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
              <TextField size="small" placeholder="جست‌وجو در موضوع، طرف قرارداد یا شماره…"
                value={search} onChange={(event) => setSearch(event.target.value)}
                sx={{ minWidth: { xs: '100%', sm: 220 }, flex: 1 }}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>بازه انقضا</InputLabel>
                <Select value={rangeFilter} label="بازه انقضا" onChange={(event) => setRangeFilter(event.target.value)}>
                  <MenuItem value="all">همه ({formatPersianNumber(monitoredCount)})</MenuItem>
                  <MenuItem value="expired">منقضی‌شده ({formatPersianNumber(counts.expired || 0)})</MenuItem>
                  <MenuItem value="soon30">تا ۳۰ روز ({formatPersianNumber(counts.soon30 || 0)})</MenuItem>
                  <MenuItem value="soon60">تا ۶۰ روز ({formatPersianNumber(counts.soon60 || 0)})</MenuItem>
                  <MenuItem value="soon90">تا ۹۰ روز ({formatPersianNumber(counts.soon90 || 0)})</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>ترتیب</InputLabel>
                <Select value={sortBy} label="ترتیب" onChange={(event) => setSortBy(event.target.value)}>
                  <MenuItem value="days">نزدیک‌ترین انقضا</MenuItem>
                  <MenuItem value="amount">بیشترین مبلغ</MenuItem>
                  <MenuItem value="newest">دورترین تاریخ</MenuItem>
                </Select>
              </FormControl>
              <ToggleButtonGroup size="small" exclusive value={view} onChange={(_event, value) => value && setView(value)}>
                <ToggleButton value="cards" aria-label="نمای کارت" sx={{ px: 1 }}><Tooltip title="کارت"><ViewModuleIcon fontSize="small" /></Tooltip></ToggleButton>
                <ToggleButton value="table" aria-label="نمای جدول" sx={{ px: 1 }}><Tooltip title="جدول"><TableRowsIcon fontSize="small" /></Tooltip></ToggleButton>
              </ToggleButtonGroup>
            </Stack>
          </Paper>

          {(counts.expired || 0) > 0 ? (
            <Alert severity="error" icon={<WarningAmberIcon />} sx={{ mb: 1, borderRadius: '11px', py: 0.2 }}>
              <Typography sx={{ fontSize: 9.5 }}>{formatPersianNumber(counts.expired)} قرارداد منقضی شده است؛ وضعیت آن‌ها را بررسی کنید.</Typography>
            </Alert>
          ) : null}

          {!filtered.length ? (
            <Paper elevation={0} sx={{ p: 5, borderRadius: '16px', border: '1px dashed #dbe4ea', textAlign: 'center' }}>
              <NotificationsActiveIcon sx={{ fontSize: 38, color: '#cbd5e1', mb: 1 }} />
              <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#0f172a' }}>قراردادی در این بازه پیدا نشد.</Typography>
              <Typography sx={{ fontSize: 9, color: '#64748b', mt: 0.4 }}>فیلتر بازه یا عبارت جست‌وجو را تغییر دهید.</Typography>
            </Paper>
          ) : view === 'cards' ? (
            <Grid container spacing={1.5}>
              {filtered.map(({ contract }) => (
                <Grid item xs={12} md={6} xl={4} key={contract.id}>
                  <ExpiryCard contract={contract} onOpen={(row) => navigate(`/external-contracts/${row.id}`)} />
                </Grid>
              ))}
            </Grid>
          ) : (
            <ExpiryTable rows={filtered.map((row) => row.contract)} onOpen={(contract) => navigate(`/external-contracts/${contract.id}`)} />
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default ContractExpiringPage;
