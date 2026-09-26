import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../../../core/api/axiosConfig';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, Grid,
} from '@mui/material';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import {
  COLOR_DARK, BLUE, GREEN,
  glass, ReportHeader, StatCard, Loading, EmptyState, StatGrid,
} from './reportHelpers';
import { formatPersianNumber } from '../../../core/utils/numberUtils';

const TreeTrialBalancePage = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['acc-report-tree-tb'],
    queryFn: () => axiosInstance.get('/accounting/reports/tree-trial-balance/').then((r) => r.data),
  });

  if (isLoading) return <Loading />;

  const flatten = (nodes, depth = 0, acc = []) => {
    (nodes || []).forEach((n) => {
      acc.push({ ...n, depth });
      if (n.children?.length) flatten(n.children, depth + 1, acc);
    });
    return acc;
  };
  const rows = flatten(data?.tree || []);

  return (
    <>
      <ReportHeader
        icon={<AccountTreeIcon sx={{ fontSize: 28, color: '#fff' }} />}
        title="تراز درختی حساب‌ها"
        subtitle="سلسله‌مراتب حساب‌ها با جمع‌شوندگی گردش فرزندان به والد"
        color="#8b5cf6"
        dark={COLOR_DARK}
      />

      {isError ? (
        <EmptyState message="خطا در بارگذاری تراز درختی. دوباره تلاش کنید." />
      ) : (
        <>
          <StatGrid>
            <Grid item xs={12} sm={4}><StatCard label="جمع بدهکار" value={data?.total_debit || 0} color={BLUE} /></Grid>
            <Grid item xs={12} sm={4}><StatCard label="جمع بستانکار" value={data?.total_credit || 0} color={GREEN} /></Grid>
            <Grid item xs={12} sm={4}><StatCard label="تعداد گره‌ها" value={rows.length} color={COLOR_DARK} /></Grid>
          </StatGrid>

          {rows.length === 0 ? (
            <EmptyState message="گردش ثبت‌شده‌ای وجود ندارد" />
          ) : (
            <div style={{ ...glass, padding: 16, overflow: 'hidden' }}>
              <TableContainer sx={{ maxHeight: 600 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800, bgcolor: 'rgba(139,92,246,0.08)' }}>کد حساب</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: 'rgba(139,92,246,0.08)' }}>نام حساب</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: 'rgba(139,92,246,0.08)' }}>گردش بدهکار</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: 'rgba(139,92,246,0.08)' }}>گردش بستانکار</TableCell>
                      <TableCell sx={{ fontWeight: 800, bgcolor: 'rgba(139,92,246,0.08)' }}>مانده</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((n) => (
                      <TableRow key={n.id} hover sx={{ bgcolor: n.depth === 0 ? 'rgba(139,92,246,0.04)' : undefined }}>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          <Typography variant="body2" fontWeight={n.depth === 0 ? 800 : 500} sx={{ pl: n.depth * 3 }}>
                            {'— '.repeat(n.depth)}{n.code}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={n.depth === 0 ? 800 : 500}>{n.name}</Typography>
                        </TableCell>
                        <TableCell sx={{ color: BLUE }}>{formatPersianNumber(n.debit)}</TableCell>
                        <TableCell sx={{ color: GREEN }}>{formatPersianNumber(n.credit)}</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: n.balance >= 0 ? BLUE : '#be123c' }}>
                          {formatPersianNumber(n.balance)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </div>
          )}
        </>
      )}
    </>
  );
};

export default TreeTrialBalancePage;