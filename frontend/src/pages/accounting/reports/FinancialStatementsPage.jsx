import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../../../core/api/axiosConfig';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, Grid,
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import {
  COLOR_DARK, BLUE, GREEN, RED, AMBER,
  ReportHeader, Loading, EmptyState, StatGrid, StatCard, SectionCard, formatPercent,
} from './reportHelpers';
import { formatPersianNumber } from '../../../core/utils/numberUtils';

const RatiosSection = ({ ratios }) => {
  const items = [
    { label: 'نسبت بدهی', value: ratios?.debt_ratio },
    { label: 'نسبت حقوق مالکانه', value: ratios?.equity_ratio },
    { label: 'حاشیهٔ سود ناخالص', value: ratios?.gross_margin },
    { label: 'حاشیهٔ سود خالص', value: ratios?.net_margin },
    { label: 'بازده حقوق مالکانه', value: ratios?.return_on_equity },
    { label: 'بازده دارایی‌ها', value: ratios?.return_on_assets },
  ];

  return (
    <SectionCard title="نسبت‌های مالی" color={COLOR_DARK}>
      <StatGrid>
        {items.map((it) => (
          <Grid item xs={6} sm={4} md={4} key={it.label}>
            <StatCard label={it.label} value={it.value == null ? '—' : formatPercent(it.value)} color={COLOR_DARK} />
          </Grid>
        ))}
      </StatGrid>
    </SectionCard>
  );
};

const FinancialStatementsPage = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['acc-report-fs'],
    queryFn: () => axiosInstance.get('/accounting/reports/financial-statements/').then((r) => r.data),
  });

  if (isLoading) return <Loading />;

  const bs = data?.balance_sheet || {};
  const isst = data?.income_statement || {};
  const cf = data?.cash_flow || {};
  const ratios = data?.ratios || {};

  return (
    <>
      <ReportHeader
        icon={<DescriptionIcon sx={{ fontSize: 28, color: '#fff' }} />}
        title="صورت‌های مالی"
        subtitle="نمای یکپارچهٔ ترازنامه، سود و زیان، جریان نقدی و نسبت‌ها"
        color="#8b5cf6"
        dark={COLOR_DARK}
      />

      {isError ? (
        <EmptyState message="خطا در بارگذاری صورت‌های مالی. دوباره تلاش کنید." />
      ) : (
        <>
          <StatGrid>
            <Grid item xs={12} sm={4}><StatCard label="جمع دارایی‌ها" value={bs.total_assets || 0} color={BLUE} /></Grid>
            <Grid item xs={12} sm={4}><StatCard label="سود / زیان خالص" value={isst.net_profit || 0} color={isst.net_profit >= 0 ? GREEN : RED} /></Grid>
            <Grid item xs={12} sm={4}><StatCard label="خالص تغییر وجه نقد" value={cf.net_change || 0} color={AMBER} /></Grid>
          </StatGrid>

          <RatiosSection ratios={ratios} />

          <SectionCard title="ترازنامه" color={BLUE}>
            <TableContainer>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>جمع دارایی‌ها</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: BLUE }}>{formatPersianNumber(bs.total_assets || 0)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>جمع بدهی‌ها</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: RED }}>{formatPersianNumber(bs.total_liabilities || 0)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>حقوق مالکانه</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: GREEN }}>{formatPersianNumber(bs.total_equity || 0)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </SectionCard>

          <SectionCard title="سود و زیان" color={GREEN}>
            <TableContainer>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell>درآمد</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: GREEN }}>{formatPersianNumber(isst.revenue || 0)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>سود ناخالص</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: BLUE }}>{formatPersianNumber(isst.gross_profit || 0)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>سود / زیان خالص</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: isst.net_profit >= 0 ? GREEN : RED }}>{formatPersianNumber(isst.net_profit || 0)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </SectionCard>

          <SectionCard title="جریان وجوه نقد" color={AMBER}>
            <TableContainer>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell>خالص عملیاتی</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: GREEN }}>{formatPersianNumber(cf.operating || 0)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>سرمایه‌گذاری</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: AMBER }}>{formatPersianNumber(cf.investing || 0)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>تأمین مالی</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: BLUE }}>{formatPersianNumber(cf.financing || 0)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>خالص تغییر نقد</TableCell>
                    <TableCell sx={{ fontWeight: 900, color: COLOR_DARK }}>{formatPersianNumber(cf.net_change || 0)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </SectionCard>
        </>
      )}
    </>
  );
};

export default FinancialStatementsPage;