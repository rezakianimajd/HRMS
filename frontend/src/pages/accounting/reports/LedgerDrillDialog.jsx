import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../../../core/api/axiosConfig';
import {
  Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { toJalali } from '../../../core/utils/dateUtils';
import { formatPersianNumber, toPersianDigits } from '../../../core/utils/numberUtils';
import { BLUE, COLOR_DARK, GREEN, glass } from './reportHelpers';

const FONT = 'Vazirmatn, IRANSans, sans-serif';

const KIND_LABEL = {
  group: 'گروه حساب', account: 'حساب', aux1: 'تفصیلی ۱', aux2: 'تفصیلی ۲', aux3: 'تفصیلی ۳',
};

/** پارامترهای API «ریز گردش» بر اساس نوع گره (حساب / گروه / تفصیلی) */
const buildParams = (node) => {
  const params = {};
  if (!node) return params;
  if (node.kind === 'group') {
    params.kind = 'group';
  } else if (node.kind && node.kind.startsWith('aux')) {
    params.kind = node.kind;
    const account = (node.__parents || []).find((p) => p.kind === 'account');
    if (account) params.account = account.id;
    (node.__parents || [])
      .filter((p) => p.kind && p.kind.startsWith('aux'))
      .forEach((p) => { params[`aux${p.kind.slice(-1)}`] = p.id; });
  }
  return params;
};

const fmtMoney = (v) => (v ? formatPersianNumber(v) : '—');

const headSx = { fontWeight: 800, whiteSpace: 'nowrap', bgcolor: 'rgba(37,99,235,0.06)' };

/**
 * دیالوگ «ریز گردش» — با دوبار کلیک روی هر ردیف گزارش ماتریس باز می‌شود
 * و ردیف‌های گردش همان حساب/گروه/تفصیلی را با ماندهٔ تجمعی نشان می‌دهد.
 */
const LedgerDrillDialog = ({ node, dateFrom, dateTo, onClose }) => {
  const params = useMemo(
    () => ({ ...buildParams(node), date_from: dateFrom || undefined, date_to: dateTo || undefined }),
    [node, dateFrom, dateTo],
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: ['acc-drill-ledger', node?.__key, dateFrom, dateTo],
    queryFn: () => axiosInstance
      .get(`/accounting/reports/account-ledger/${node.id}/`, { params })
      .then((r) => r.data),
    enabled: Boolean(node),
  });

  const rows = data?.rows || [];
  const acc = data?.account || {};
  const range = `${dateFrom ? toJalali(dateFrom) : 'ابتدا'} — ${dateTo ? toJalali(dateTo) : 'تا امروز'}`;

  return (
    <Dialog open={Boolean(node)} onClose={onClose} fullWidth maxWidth="md"
      slotProps={{ paper: { sx: { borderRadius: '20px', overflow: 'hidden', fontFamily: FONT } } }}>
      <DialogTitle component="div" sx={{ p: 0 }}>
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap',
          background: `linear-gradient(120deg, ${BLUE}1f, rgba(255,255,255,0.35))`, borderBottom: `1px solid ${BLUE}33` }}>
          <ReceiptLongIcon sx={{ color: BLUE }} />
          <Box sx={{ flex: 1, minWidth: 160 }}>
            <Typography variant="subtitle1" fontWeight={800} sx={{ color: COLOR_DARK, fontFamily: FONT }}>
              ریز گردش {node?.code != null ? toPersianDigits(node.code) : ''} — {node?.name || ''}
            </Typography>
            <Typography variant="caption" color="textSecondary" sx={{ fontFamily: FONT }}>
              {KIND_LABEL[node?.kind] || 'حساب'} · بازه: {range}
            </Typography>
          </Box>
          <Chip size="small" label={acc.nature === 'credit' ? 'ماهیت: بستانکار' : 'ماهیت: بدهکار'}
            sx={{ bgcolor: 'rgba(37,99,235,0.12)', color: BLUE, fontWeight: 700, fontFamily: FONT }} />
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 2 }}>
        {node ? (
          <Stack direction="row" spacing={1} sx={{ mb: 1.5 }} flexWrap="wrap" useFlexGap>
            <Chip size="small" label={`مانده ابتدای دوره: ${fmtMoney(node.opening_balance_debit)} بدهکار / ${fmtMoney(node.opening_balance_credit)} بستانکار`}
              sx={{ bgcolor: 'rgba(139,92,246,0.12)', color: '#7c3aed', fontWeight: 700, fontFamily: FONT }} />
            <Chip size="small" label={`گردش دوره: ${fmtMoney(node.debit)} بدهکار / ${fmtMoney(node.credit)} بستانکار`}
              sx={{ bgcolor: 'rgba(37,99,235,0.10)', color: BLUE, fontWeight: 700, fontFamily: FONT }} />
            <Chip size="small" label={`مانده پایان دوره: ${fmtMoney(node.closing_balance_debit)} بدهکار / ${fmtMoney(node.closing_balance_credit)} بستانکار`}
              sx={{ bgcolor: 'rgba(5,150,105,0.12)', color: GREEN, fontWeight: 700, fontFamily: FONT }} />
          </Stack>
        ) : null}

        <Divider sx={{ mb: 1.5 }} />
        {isLoading ? (
          <Box textAlign="center" py={4}><CircularProgress /></Box>
        ) : isError ? (
          <Typography variant="body2" color="error" textAlign="center" py={3}>
            خطا در دریافت ریز گردش — دوباره تلاش کنید
          </Typography>
        ) : rows.length === 0 ? (
          <Typography variant="body2" color="textSecondary" textAlign="center" py={3}>
            گردشی در این بازه برای این {KIND_LABEL[node?.kind] || 'حساب'} ثبت نشده است
          </Typography>
        ) : (
          <TableContainer sx={{ ...glass, maxHeight: 460 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={headSx}>ردیف</TableCell>
                  <TableCell sx={headSx}>تاریخ</TableCell>
                  <TableCell sx={headSx}>شماره سند</TableCell>
                  <TableCell sx={headSx}>شرح</TableCell>
                  <TableCell sx={{ ...headSx, color: BLUE, bgcolor: 'rgba(37,99,235,0.08)' }}>بدهکار</TableCell>
                  <TableCell sx={{ ...headSx, color: GREEN, bgcolor: 'rgba(5,150,105,0.08)' }}>بستانکار</TableCell>
                  <TableCell sx={headSx}>مانده</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={`${r.document_id}-${i}`} hover>
                    <TableCell sx={{ color: 'text.secondary' }}>{toPersianDigits(i + 1)}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{toJalali(r.date)}</TableCell>
                    <TableCell>{r.document_number}</TableCell>
                    <TableCell sx={{ maxWidth: 260, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {r.description}
                    </TableCell>
                    <TableCell sx={{ color: BLUE, fontWeight: 600, direction: 'ltr', textAlign: 'right' }}>
                      {r.debit ? formatPersianNumber(r.debit) : '—'}
                    </TableCell>
                    <TableCell sx={{ color: GREEN, fontWeight: 600, direction: 'ltr', textAlign: 'right' }}>
                      {r.credit ? formatPersianNumber(r.credit) : '—'}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, direction: 'ltr', textAlign: 'right' }}>
                      {formatPersianNumber(r.balance)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow sx={{ bgcolor: 'rgba(139,92,246,0.13)' }}>
                  <TableCell colSpan={4} sx={{ fontWeight: 900, color: COLOR_DARK }}>جمع</TableCell>
                  <TableCell sx={{ fontWeight: 900, color: BLUE, direction: 'ltr', textAlign: 'right' }}>
                    {formatPersianNumber(data?.total_debit || 0)}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 900, color: GREEN, direction: 'ltr', textAlign: 'right' }}>
                    {formatPersianNumber(data?.total_credit || 0)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2, py: 1.5, borderTop: '1px solid rgba(148,163,184,0.22)' }}>
        <Button size="small" variant="outlined" startIcon={<PrintIcon />} onClick={() => window.print()}
          sx={{ borderRadius: '12px', fontFamily: FONT }}>چاپ</Button>
        <Box sx={{ flex: 1 }} />
        <Button size="small" variant="contained" onClick={onClose}
          sx={{ borderRadius: '12px', fontFamily: FONT, background: `linear-gradient(135deg,${BLUE},#1d4ed8)` }}>بستن</Button>
      </DialogActions>
    </Dialog>
  );
};

export default LedgerDrillDialog;
