import React, { useMemo, useState } from 'react';
import {
  Box, Button, Chip, Paper, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { formatPersianNumber, normalizeCurrencyLabel, toPersianDigits } from '../../utils/numberUtils';
import { toJalali } from '../../utils/dateUtils';

const STATUS_LABELS = {
  draft: 'پیش‌نویس',
  active: 'در حال اجرا',
  suspended: 'متوقف',
  completed: 'تکمیل شده',
  terminated: 'فسخ شده',
};

const STATUS_COLORS = {
  draft: '#64748b',
  active: '#10b981',
  suspended: '#f59e0b',
  completed: '#3b82f6',
  terminated: '#ef4444',
};

const TYPE_LABELS = {
  construction: 'پیمانکاری / اجرا',
  purchase: 'خرید',
  tender: 'مناقصه',
  consulting: 'مشاوره',
  service: 'خدمات',
  other: 'سایر',
};

const headCellSx = {
  fontWeight: 800, fontSize: 12, color: '#334155', whiteSpace: 'nowrap',
  bgcolor: '#f8fafc', borderBottom: '1px solid rgba(15,23,42,0.12)', py: 1,
};

const bodyCellSx = {
  whiteSpace: 'nowrap', fontSize: 12,
  borderBottom: '1px solid rgba(15,23,42,0.06)', py: 0.85,
};

const CENTER = { textAlign: 'center' };


const ContractListPicker = ({
  contracts = [], onSelect, selectedId, countLabel = 'الحاقیه',
  countHeaderLabel, countByContract = {}, getCount, height = 520, accent = '#b45309',
}) => {
  const theme = useTheme();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return contracts;
    return contracts.filter((contract) => (
      String(contract.number || '').toLowerCase().includes(query)
      || String(contract.subject || '').toLowerCase().includes(query)
      || String(contract.party_name || '').toLowerCase().includes(query)
    ));
  }, [contracts, search]);

  const countFor = (contract) => {
    if (getCount) return Number(getCount(contract) || 0);
    if (countByContract[String(contract.id)] != null) return Number(countByContract[String(contract.id)] || 0);
    return (contract.addendums?.length || 0) + (contract.guarantees?.length || 0);
  };

  return (
    <Box>
      <TextField
        size="small"
        fullWidth
        placeholder="جست‌وجو در شماره، نام یا طرف قرارداد…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        sx={{ mb: 1.25 }}
      />
      <Paper elevation={0} sx={{ borderRadius: '12px', overflow: 'hidden', border: `1px solid ${theme.palette.divider}` }}>
        <TableContainer sx={{ maxHeight: height }}>
          <Table size="small" stickyHeader sx={{ minWidth: 1050 }}>
            <TableHead>
              <TableRow>
                <TableCell align="center" style={CENTER} sx={{ ...headCellSx, width: 105 }}>شماره قرارداد</TableCell>
                <TableCell align="center" style={CENTER} sx={{ ...headCellSx, width: 160 }}>طرف حساب</TableCell>
                <TableCell align="center" style={CENTER} sx={headCellSx}>نام قرارداد</TableCell>
                <TableCell align="center" style={CENTER} sx={{ ...headCellSx, width: 105 }}>وضعیت</TableCell>
                <TableCell align="center" style={CENTER} sx={{ ...headCellSx, width: 105 }}>تاریخ پایان</TableCell>
                <TableCell align="center" style={CENTER} sx={{ ...headCellSx, width: 125 }}>{countHeaderLabel || `تعداد ${countLabel}`}</TableCell>
                <TableCell align="center" style={CENTER} sx={{ ...headCellSx, width: 170 }}>مبلغ قرارداد</TableCell>
                <TableCell align="center" style={CENTER} sx={{ ...headCellSx, width: 85 }}>انتخاب</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6, color: theme.palette.text.secondary, fontSize: 12 }}>
                    قراردادی با این مشخصات یافت نشد.
                  </TableCell>
                </TableRow>
              ) : filtered.map((contract) => {
                const count = countFor(contract);
                const selected = selectedId != null && String(selectedId) === String(contract.id);
                const endDate = contract.effective_end_date || contract.end_date;
                const amount = contract.effective_amount ?? contract.amount ?? 0;
                const currency = normalizeCurrencyLabel(contract.currency_name || contract.currency_symbol);
                return (
                  <TableRow
                    key={contract.id}
                    hover
                    onClick={() => onSelect(contract)}
                    sx={{
                      cursor: 'pointer',
                      bgcolor: selected ? alpha(accent, 0.055) : 'transparent',
                      '&:hover': { bgcolor: alpha(accent, 0.045) },
                    }}
                  >
                    <TableCell align="center" style={CENTER} sx={bodyCellSx}>
                      <Typography sx={{ fontWeight: 800, fontSize: 12, color: '#334155' }}>
                        {toPersianDigits(contract.number || '—')}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ ...bodyCellSx, maxWidth: 170 }}>
                      <Tooltip title={contract.party_name || ''}>
                        <Typography noWrap sx={{ fontWeight: 700, fontSize: 12, color: '#7c2d12' }}>
                          {contract.party_name || '—'}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right" sx={{ ...bodyCellSx, maxWidth: 280 }}>
                      <Tooltip title={contract.subject || ''}>
                        <Typography noWrap sx={{ fontWeight: 800, fontSize: 12, color: '#0f172a' }}>
                          {contract.subject || '—'}
                        </Typography>
                      </Tooltip>
                      <Typography noWrap sx={{ fontSize: 12, color: '#64748b' }}>
                        {contract.contract_type_master_name || TYPE_LABELS[contract.contract_type] || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center" style={CENTER} sx={bodyCellSx}>
                      <Chip size="small" label={STATUS_LABELS[contract.status] || contract.status || '—'}
                        sx={{
                          height: 21, fontSize: 12, fontWeight: 800,
                          bgcolor: alpha(STATUS_COLORS[contract.status] || '#64748b', 0.09),
                          color: STATUS_COLORS[contract.status] || '#64748b',
                        }} />
                    </TableCell>
                    <TableCell align="center" style={CENTER} sx={bodyCellSx}>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
                        {endDate ? toJalali(endDate) : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center" style={CENTER} sx={bodyCellSx}>
                      <Chip size="small" label={`${formatPersianNumber(count)} ${countLabel}`}
                        sx={{
                          height: 22, fontSize: 12, fontWeight: 800,
                          bgcolor: count > 0 ? alpha(accent, 0.08) : '#f1f5f9',
                          color: count > 0 ? accent : '#64748b',
                        }} />
                    </TableCell>
                    <TableCell align="center" style={CENTER} sx={bodyCellSx}>
                      <Typography sx={{ fontSize: 12, fontWeight: 900, color: '#b45309' }}>
                        {formatPersianNumber(amount)}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>{currency}</Typography>
                    </TableCell>
                    <TableCell align="center" style={CENTER} sx={bodyCellSx}>
                      <Button size="small" variant={selected ? 'contained' : 'outlined'}
                        onClick={(event) => { event.stopPropagation(); onSelect(contract); }}
                        sx={{ minWidth: 58, fontSize: 12, px: 0.9 }}>
                        انتخاب
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      <Stack direction="row" spacing={1} sx={{ mt: 0.8 }}>
        <Typography sx={{ fontSize: 12, color: '#64748b' }}>{formatPersianNumber(filtered.length)} قرارداد</Typography>
      </Stack>
    </Box>
  );
};

export default ContractListPicker;

