import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../../../core/api/axiosConfig';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, Grid,
} from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import {
  COLOR_DARK, BLUE, GREEN, RED,
  ReportHeader, StatCard, Loading, EmptyState, StatGrid, SectionCard,
} from './reportHelpers';
import { formatPersianNumber } from '../../../core/utils/numberUtils';

const Section = ({ title, rows, total, color }) => (
  <SectionCard title={title} color={color}>
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 800 }}>کد</TableCell>
            <TableCell sx={{ fontWeight: 800 }}>حساب</TableCell>
            <TableCell sx={{ fontWeight: 800 }}>مانده</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {(rows || []).map((r) => (
            <TableRow key={r.id} hover>
              <TableCell sx={{ color: 'text.secondary' }}>{r.code}</TableCell>
              <TableCell>{r.name}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{formatPersianNumber(r.balance)}</TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell colSpan={2} sx={{ fontWeight: 800 }}>جمع</TableCell>
            <TableCell sx={{ fontWeight: 900, color }}>{formatPersianNumber(total)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  </SectionCard>
);

const BalanceSheetPage = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['acc-report-bs-page'],
    queryFn: () => axiosInstance.get('/accounting/reports/balance-sheet/').then((r) => r.data),
  });

  if (isLoading) return <Loading />;

  const balanced = Math.round(((data?.total_assets || 0) - (data?.total_liabilities_equity || 0)) * 100) / 100;

  return (
    <>
      <ReportHeader
        icon={<AccountBalanceIcon sx={{ fontSize: 28, color: '#fff' }} />}
        title="ترازنامه"
        subtitle="دارایی‌ها = بدهی‌ها + حقوق مالکانه"
        color="#3b82f6"
        dark="#1d4ed8"
      />

      {isError ? (
        <EmptyState message="خطا در بارگذاری ترازنامه. دوباره تلاش کنید." />
      ) : (
        <>
          <StatGrid>
            <Grid item xs={12} sm={4}><StatCard label="جمع دارایی‌ها" value={data?.total_assets || 0} color={BLUE} /></Grid>
            <Grid item xs={12} sm={4}><StatCard label="جمع بدهی‌ها" value={data?.total_liabilities || 0} color={RED} /></Grid>
            <Grid item xs={12} sm={4}><StatCard label="حقوق مالکانه" value={data?.total_equity || 0} color={GREEN} /></Grid>
          </StatGrid>

          <Section title="دارایی‌ها" rows={data?.assets} total={data?.total_assets} color={BLUE} />
          <Section title="بدهی‌ها" rows={data?.liabilities} total={data?.total_liabilities} color={RED} />
          <Section title="حقوق مالکانه" rows={data?.equity} total={data?.total_equity} color={GREEN} />

          <SectionCard title="کنترل توازن معادلهٔ حسابداری" color={COLOR_DARK}>
            <TableContainer>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>جمع دارایی‌ها</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: BLUE }}>{formatPersianNumber(data?.total_assets || 0)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>بدهی‌ها + حقوق مالکانه</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: COLOR_DARK }}>{formatPersianNumber(data?.total_liabilities_equity || 0)}</TableCell>
                  </TableRow>
                  <TableRow sx={{ bgcolor: balanced === 0 ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)' }}>
                    <TableCell sx={{ fontWeight: 800 }}>اختلاف</TableCell>
                    <TableCell sx={{ fontWeight: 900, color: balanced === 0 ? GREEN : RED }}>
                      {balanced === 0 ? 'تراز ✓' : formatPersianNumber(balanced)}
                    </TableCell>
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

export default BalanceSheetPage;