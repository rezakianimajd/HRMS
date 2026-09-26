import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Grid, Typography, Paper, Avatar, CircularProgress, Stack, TextField,
  Autocomplete, Button, Chip, IconButton, Tooltip, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import { formatPersianNumber, toPersianDigits } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';

const COLOR = '#6366f1';
const COLOR_DARK = '#4f46e5';

const glass = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.88), rgba(255,255,255,0.70))',
  backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)',
  border: '1px solid rgba(255,255,255,0.7)',
  boxShadow: '0 14px 40px rgba(99,102,241,0.16)', borderRadius: '16px',
};

const STATUS_META = {
  draft: { label: 'پیش‌نویس', color: '#64748b' },
  submitted: { label: 'در انتظار تأیید', color: '#f59e0b' },
  approved: { label: 'تأییدشده', color: '#10b981' },
  posted: { label: 'ثبت‌شده', color: '#3b82f6' },
  locked: { label: 'قفل‌شده', color: '#6366f1' },
  reversed: { label: 'برگشت‌خورده', color: '#ef4444' },
};

const fieldSx = { minWidth: 110, flex: 1 };

// یک جفت «از / تا»
const Range = ({ children }) => (
  <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%' }}>
    <Typography variant="caption" color="textSecondary" sx={{ minWidth: 28 }}>از</Typography>
    {children[0]}
    <Typography variant="caption" color="textSecondary" sx={{ minWidth: 20 }}>تا</Typography>
    {children[1]}
  </Stack>
);

const labelSx = { fontWeight: 700, fontSize: 13, color: COLOR_DARK, textAlign: 'right' };

const FilterCell = ({ label, children, full }) => (
  <Grid item xs={12} sm={6} md={full ? 12 : 4}>
    <Stack spacing={1} sx={{ width: '100%' }}>
      <Typography sx={labelSx}>{label}</Typography>
      <Box>{children}</Box>
    </Stack>
  </Grid>
);

const AccountingDocumentSearchPage = () => {
  const navigate = useNavigate();
  const [applied, setApplied] = useState({});

  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [numberFrom, setNumberFrom] = useState('');
  const [numberTo, setNumberTo] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [description, setDescription] = useState('');
  const [generalFrom, setGeneralFrom] = useState(null);
  const [generalTo, setGeneralTo] = useState(null);
  const [subsidiaryFrom, setSubsidiaryFrom] = useState(null);
  const [subsidiaryTo, setSubsidiaryTo] = useState(null);
  const [aux1From, setAux1From] = useState(''); const [aux1To, setAux1To] = useState('');
  const [aux2From, setAux2From] = useState(''); const [aux2To, setAux2To] = useState('');
  const [aux3From, setAux3From] = useState(''); const [aux3To, setAux3To] = useState('');
  const [refFrom, setRefFrom] = useState(''); const [refTo, setRefTo] = useState('');
  const [debitFrom, setDebitFrom] = useState(''); const [debitTo, setDebitTo] = useState('');
  const [creditFrom, setCreditFrom] = useState(''); const [creditTo, setCreditTo] = useState('');
  const [amountFrom, setAmountFrom] = useState(''); const [amountTo, setAmountTo] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['doc-search', applied],
    queryFn: () => axiosInstance.get('/accounting/documents/', { params: applied }).then(r => r.data),
  });
  const list = Array.isArray(data) ? data : data?.results || [];

  const { data: years } = useQuery({ queryKey: ['search-years'], queryFn: () => axiosInstance.get('/accounting/fiscal-years/').then(r => r.data) });
  const yearList = Array.isArray(years) ? years : years?.results || [];

  const { data: generalAccs } = useQuery({ queryKey: ['search-general-accs'], queryFn: () => axiosInstance.get('/accounting/accounts/', { params: { kind: 'general' } }).then(r => r.data) });
  const generalList = Array.isArray(generalAccs) ? generalAccs : generalAccs?.results || [];

  const { data: subsidiaryAccs } = useQuery({ queryKey: ['search-sub-accs'], queryFn: () => axiosInstance.get('/accounting/accounts/', { params: { kind: 'subsidiary' } }).then(r => r.data) });
  const subsidiaryList = Array.isArray(subsidiaryAccs) ? subsidiaryAccs : subsidiaryAccs?.results || [];

  const accountOpt = (o) => `${o.code} - ${o.name}`;

  const buildParams = () => ({
    year_from: yearFrom || undefined, year_to: yearTo || undefined,
    number_from: numberFrom || undefined, number_to: numberTo || undefined,
    date_from: dateFrom || undefined, date_to: dateTo || undefined,
    description: description || undefined,
    general_from: generalFrom?.id || undefined, general_to: generalTo?.id || undefined,
    subsidiary_from: subsidiaryFrom?.id || undefined, subsidiary_to: subsidiaryTo?.id || undefined,
    aux1_from: aux1From || undefined, aux1_to: aux1To || undefined,
    aux2_from: aux2From || undefined, aux2_to: aux2To || undefined,
    aux3_from: aux3From || undefined, aux3_to: aux3To || undefined,
    reference_from: refFrom || undefined, reference_to: refTo || undefined,
    debit_from: debitFrom || undefined, debit_to: debitTo || undefined,
    credit_from: creditFrom || undefined, credit_to: creditTo || undefined,
    amount_from: amountFrom || undefined, amount_to: amountTo || undefined,
  });

  const doSearch = () => setApplied(buildParams());
  const clear = () => {
    setYearFrom(''); setYearTo(''); setNumberFrom(''); setNumberTo(''); setDateFrom(''); setDateTo('');
    setDescription(''); setGeneralFrom(null); setGeneralTo(null); setSubsidiaryFrom(null); setSubsidiaryTo(null);
    setAux1From(''); setAux1To(''); setAux2From(''); setAux2To(''); setAux3From(''); setAux3To('');
    setRefFrom(''); setRefTo(''); setDebitFrom(''); setDebitTo(''); setCreditFrom(''); setCreditTo('');
    setAmountFrom(''); setAmountTo(''); setApplied({});
  };

  return (
    <Box sx={{ pb: 10 }}>
      <Paper sx={{ p: 2.5, mb: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        background: `linear-gradient(120deg, ${COLOR}1a, rgba(255,255,255,0.3))`, border: `1px solid ${COLOR}30`, borderRadius: '16px' }}>
        <Avatar sx={{ width: 56, height: 56, background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, boxShadow: `0 8px 24px ${COLOR}55` }}>
          <SearchIcon sx={{ fontSize: 28, color: '#fff' }} />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={800} color={COLOR_DARK}>جستجو در اسناد</Typography>
          <Typography variant="body2" color="textSecondary">جستجوی پیشرفتهٔ بازه‌ای روی همهٔ فیلدهای سند</Typography>
        </Box>
        <Chip label={`${toPersianDigits(list.length)} سند`} color="primary" variant="outlined" />
      </Paper>

      {/* نتایج */}
      <Paper sx={{ ...glass, p: 2 }}>
        {isLoading ? <Box textAlign="center" py={4}><CircularProgress /></Box> : (
          <TableContainer>
            <Table size="small">
              <TableHead><TableRow>
                <TableCell>شماره</TableCell><TableCell>تاریخ</TableCell><TableCell>شرح</TableCell>
                <TableCell>بدهکار</TableCell><TableCell>بستانکار</TableCell><TableCell>وضعیت</TableCell><TableCell></TableCell>
              </TableRow></TableHead>
              <TableBody>
                {list.length === 0 ? <TableRow><TableCell colSpan={7} align="center" sx={{ color: 'text.secondary' }}>سندی یافت نشد</TableCell></TableRow> :
                list.map(r => (
                  <TableRow key={r.id} hover>
                    <TableCell>{r.number || `#${r.id}`}</TableCell>
                    <TableCell>{toJalali(r.date)}</TableCell>
                    <TableCell sx={{ maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.description}</TableCell>
                    <TableCell>{formatPersianNumber(r.total_debit)}</TableCell>
                    <TableCell>{formatPersianNumber(r.total_credit)}</TableCell>
                    <TableCell><Chip size="small" label={STATUS_META[r.status]?.label || r.status} sx={{ bgcolor: `${STATUS_META[r.status]?.color || '#64748b'}18`, color: STATUS_META[r.status]?.color, fontWeight: 700 }} /></TableCell>
                    <TableCell><Tooltip title="مشاهده/ویرایش"><IconButton size="small" onClick={() => navigate(`/accounting/documents/${r.id}/edit`)}><OpenInNewIcon fontSize="small" /></IconButton></Tooltip></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* باکس فیلتر چسبان پایین (درون عرض کانتنت) */}
      <Paper elevation={6} sx={{
        position: 'sticky', bottom: 0, zIndex: 1200, mt: 2,
        background: 'linear-gradient(135deg, rgba(255,255,255,0.96), rgba(245,247,255,0.96))',
        backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
        borderTop: `2px solid ${COLOR}44`, borderBottom: 'none',
        p: 1.5, maxHeight: '44vh', overflowY: 'auto',
      }}>
        <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
          <FilterAltIcon sx={{ color: COLOR_DARK }} />
          <Typography variant="subtitle2" fontWeight={800} color={COLOR_DARK}>فیلترهای جستجو</Typography>
          <Box sx={{ flex: 1 }} />
          <Button size="small" variant="outlined" startIcon={<ClearIcon />} onClick={clear}>پاک کردن</Button>
          <Button size="small" variant="contained" startIcon={<SearchIcon />} onClick={doSearch}
            sx={{ background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, borderRadius: '10px', px: 3 }}>
            جستجو
          </Button>
        </Stack>

        <Grid container spacing={1.5}>
          <FilterCell label="سال مالی">
            <Range>
              <TextField size="small" select sx={fieldSx} value={yearFrom} onChange={e => setYearFrom(e.target.value)} SelectProps={{ native: true }}>
                <option value="">—</option>
                {yearList.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
              </TextField>
              <TextField size="small" select sx={fieldSx} value={yearTo} onChange={e => setYearTo(e.target.value)} SelectProps={{ native: true }}>
                <option value="">—</option>
                {yearList.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
              </TextField>
            </Range>
          </FilterCell>

          <FilterCell label="شماره سند">
            <Range>
              <TextField size="small" sx={fieldSx} value={numberFrom} onChange={e => setNumberFrom(e.target.value)} />
              <TextField size="small" sx={fieldSx} value={numberTo} onChange={e => setNumberTo(e.target.value)} />
            </Range>
          </FilterCell>

          <FilterCell label="تاریخ">
            <Range>
              <JalaliDatePicker noHelper sx={fieldSx} value={dateFrom} onChange={setDateFrom} />
              <JalaliDatePicker noHelper sx={fieldSx} value={dateTo} onChange={setDateTo} />
            </Range>
          </FilterCell>

          <FilterCell label="شرح سند" full>
            <TextField size="small" fullWidth placeholder="جستجو در شرح سند…" value={description} onChange={e => setDescription(e.target.value)} />
          </FilterCell>

          <FilterCell label="حساب کل">
            <Range>
              <Autocomplete size="small" sx={fieldSx} options={generalList} getOptionLabel={accountOpt}
                value={generalFrom} onChange={(e, v) => setGeneralFrom(v)} renderInput={p => <TextField {...p} placeholder="از حساب کل" />} />
              <Autocomplete size="small" sx={fieldSx} options={generalList} getOptionLabel={accountOpt}
                value={generalTo} onChange={(e, v) => setGeneralTo(v)} renderInput={p => <TextField {...p} placeholder="تا حساب کل" />} />
            </Range>
          </FilterCell>

          <FilterCell label="حساب معین">
            <Range>
              <Autocomplete size="small" sx={fieldSx} options={subsidiaryList} getOptionLabel={accountOpt}
                value={subsidiaryFrom} onChange={(e, v) => setSubsidiaryFrom(v)} renderInput={p => <TextField {...p} placeholder="از حساب معین" />} />
              <Autocomplete size="small" sx={fieldSx} options={subsidiaryList} getOptionLabel={accountOpt}
                value={subsidiaryTo} onChange={(e, v) => setSubsidiaryTo(v)} renderInput={p => <TextField {...p} placeholder="تا حساب معین" />} />
            </Range>
          </FilterCell>

          <FilterCell label="تفصیل ۱">
            <Range><TextField size="small" sx={fieldSx} value={aux1From} onChange={e => setAux1From(e.target.value)} /><TextField size="small" sx={fieldSx} value={aux1To} onChange={e => setAux1To(e.target.value)} /></Range>
          </FilterCell>
          <FilterCell label="تفصیل ۲">
            <Range><TextField size="small" sx={fieldSx} value={aux2From} onChange={e => setAux2From(e.target.value)} /><TextField size="small" sx={fieldSx} value={aux2To} onChange={e => setAux2To(e.target.value)} /></Range>
          </FilterCell>
          <FilterCell label="تفصیل ۳">
            <Range><TextField size="small" sx={fieldSx} value={aux3From} onChange={e => setAux3From(e.target.value)} /><TextField size="small" sx={fieldSx} value={aux3To} onChange={e => setAux3To(e.target.value)} /></Range>
          </FilterCell>

          <FilterCell label="چک / ارجاع">
            <Range><TextField size="small" sx={fieldSx} value={refFrom} onChange={e => setRefFrom(e.target.value)} /><TextField size="small" sx={fieldSx} value={refTo} onChange={e => setRefTo(e.target.value)} /></Range>
          </FilterCell>

          <FilterCell label="مبلغ بدهکار">
            <Range><TextField size="small" type="number" sx={fieldSx} value={debitFrom} onChange={e => setDebitFrom(e.target.value)} /><TextField size="small" type="number" sx={fieldSx} value={debitTo} onChange={e => setDebitTo(e.target.value)} /></Range>
          </FilterCell>

          <FilterCell label="مبلغ بستانکار">
            <Range><TextField size="small" type="number" sx={fieldSx} value={creditFrom} onChange={e => setCreditFrom(e.target.value)} /><TextField size="small" type="number" sx={fieldSx} value={creditTo} onChange={e => setCreditTo(e.target.value)} /></Range>
          </FilterCell>

          <FilterCell label="مبلغ (هر دو)">
            <Range><TextField size="small" type="number" sx={fieldSx} value={amountFrom} onChange={e => setAmountFrom(e.target.value)} /><TextField size="small" type="number" sx={fieldSx} value={amountTo} onChange={e => setAmountTo(e.target.value)} /></Range>
          </FilterCell>
        </Grid>
      </Paper>
    </Box>
  );
};

export default AccountingDocumentSearchPage;