import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../../../core/api/axiosConfig';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, Grid, Chip,
} from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import {
  COLOR_DARK, BLUE, GREEN,
  glass, ReportHeader, StatCard, Loading, EmptyState, StatGrid, SectionCard,
} from './reportHelpers';
import { formatPersianNumber } from '../../../core/utils/numberUtils';
import { toJalali } from '../../../core/utils/dateUtils';

const LedgerReviewPage = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['acc-report-ledger-review'],
    queryFn: () => axiosInstance.get('/accounting/reports/ledger-review/').then((r) => r.data),
  });

  const totals = useMemo(() => {
    const journals = data?.journals || [];
    return journals.reduce(
      (acc, j) => ({
        total_debit: acc.total_debit + (j.total_debit || 0),
        total_credit: acc.total_credit + (j.total_credit || 0),
        steps: acc.steps + (j.steps?.length || 0),
      }),
      { total_debit: 0, total_credit: 0, steps: 0 },
    );
  }, [data]);

  if (isLoading) return <Loading />;

  const journals = data?.journals || [];
  const nonEmpty = journals.filter((j) => j.steps?.length > 0);

  return (
    <>
      <ReportHeader
        icon={<MenuBookIcon sx={{ fontSize: 28, color: '#fff' }} />}
        title="مرور پله‌ای دفاتر"
        subtitle="گردش هر دفتر با ماندهٔ تجمعی پله‌به‌پله"
        color="#f59e0b"
        dark="#b45309"
      />

      {isError ? (
        <EmptyState message="خطا در بارگذاری مرور دفاتر. دوباره تلاش کنید." />
      ) : (
        <>
          <StatGrid>
            <Grid item xs={12} sm={4}><StatCard label="جمع بدهکار" value={totals.total_debit} color={BLUE} /></Grid>
            <Grid item xs={12} sm={4}><StatCard label="جمع بستانکار" value={totals.total_credit} color={GREEN} /></Grid>
            <Grid item xs={12} sm={4}><StatCard label="تعداد اسناد" value={totals.steps} color={COLOR_DARK} /></Grid>
          </StatGrid>

          {nonEmpty.length === 0 ? (
            <EmptyState message="سند ثبت‌شده‌ای برای مرور وجود ندارد" />
          ) : (
            nonEmpty.map((j) => (
              <SectionCard
                key={j.journal_id ?? 'general'}
                title={`${j.code} - ${j.name}`}
                color={COLOR_DARK}
                action={<Chip size="small" label={`${toPersianDigits(j.steps.length)} سند`} sx={{ bgcolor: 'rgba(139,92,246,0.12)', color: COLOR_DARK, fontWeight: 700 }} />}
              >
                <TableContainer sx={{ maxHeight: 360 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 800 }}>تاریخ</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>شماره</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>شرح</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>بدهکار</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>بستانکار</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>ماندهٔ تجمعی</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {j.steps.map((s, i) => (
                        <TableRow key={i} hover>
                          <TableCell>{toJalali(s.date)}</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>{s.number}</TableCell>
                          <TableCell sx={{ maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.description}</TableCell>
                          <TableCell sx={{ color: BLUE }}>{formatPersianNumber(s.debit)}</TableCell>
                          <TableCell sx={{ color: GREEN }}>{formatPersianNumber(s.credit)}</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: s.running >= 0 ? BLUE : '#be123c' }}>{formatPersianNumber(s.running)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow sx={{ bgcolor: 'rgba(139,92,246,0.05)' }}>
                        <TableCell colSpan={3} sx={{ fontWeight: 800 }}>جمع / ماندهٔ پایانی دفتر</TableCell>
                        <TableCell sx={{ fontWeight: 800, color: BLUE }}>{formatPersianNumber(j.total_debit)}</TableCell>
                        <TableCell sx={{ fontWeight: 800, color: GREEN }}>{formatPersianNumber(j.total_credit)}</TableCell>
                        <TableCell sx={{ fontWeight: 900, color: COLOR_DARK }}>{formatPersianNumber(j.closing)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </SectionCard>
            ))
          )}
        </>
      )}
    </>
  );
};

export default LedgerReviewPage;