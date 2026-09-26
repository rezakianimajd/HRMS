import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../../../core/api/axiosConfig';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, Grid,
} from '@mui/material';
import GridViewIcon from '@mui/icons-material/GridView';
import {
  COLOR_DARK, BLUE, GREEN, CYAN,
  glass, ReportHeader, StatCard, Loading, EmptyState, StatGrid,
} from './reportHelpers';
import { formatPersianNumber } from '../../../core/utils/numberUtils';

const MatrixReportPage = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['acc-report-matrix'],
    queryFn: () => axiosInstance.get('/accounting/reports/matrix/').then((r) => r.data),
  });

  const accounts = data?.accounts || [];
  const costCenters = data?.cost_centers || [];
  const cellBy = (accountId, costCenterId) => data?.cells?.[`${accountId}:${costCenterId}`] || { debit: 0, credit: 0 };

  if (isLoading) return <Loading />;

  return (
    <>
      <ReportHeader
        icon={<GridViewIcon sx={{ fontSize: 28, color: '#fff' }} />}
        title="مرور ترکیبی (ماتریس)"
        subtitle="حساب‌ها در ردیف، مراکز هزینه در ستون؛ جریان بدهکار/بستانکار به تفکیک مرکز هزینه"
        color={CYAN}
        dark="#0891b2"
      />

      {isError ? (
        <EmptyState message="خطا در بارگذاری ماتریس. دوباره تلاش کنید." />
      ) : (
        <>
          <StatGrid>
            <Grid item xs={12} sm={4}><StatCard label="جمع بدهکار" value={data?.total_debit || 0} color={BLUE} /></Grid>
            <Grid item xs={12} sm={4}><StatCard label="جمع بستانکار" value={data?.total_credit || 0} color={GREEN} /></Grid>
            <Grid item xs={12} sm={4}><StatCard label="تعداد حساب‌ها" value={accounts.length} color={COLOR_DARK} /></Grid>
          </StatGrid>

          {accounts.length === 0 ? (
            <EmptyState message="گردش ثبت‌شده‌ای در مراکز هزینه وجود ندارد" />
          ) : (
            <div style={{ ...glass, padding: 16, overflow: 'hidden' }}>
              <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 1 }}>
                هر سلول، جریان «بدهکار / بستانکار» میان حساب و مرکز هزینه را نشان می‌دهد.
              </Typography>
              <TableContainer sx={{ maxHeight: 560, overflowX: 'auto' }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ minWidth: 130, fontWeight: 800, bgcolor: 'rgba(139,92,246,0.08)' }}>حساب</TableCell>
                      {costCenters.map((cc) => (
                        <TableCell key={cc.id} sx={{ minWidth: 130, fontWeight: 800, bgcolor: 'rgba(6,182,212,0.08)' }}>
                          <Typography variant="body2" fontWeight={800}>{cc.code}</Typography>
                          <Typography variant="caption" color="textSecondary">{cc.name}</Typography>
                        </TableCell>
                      ))}
                      <TableCell sx={{ minWidth: 110, fontWeight: 800, bgcolor: 'rgba(139,92,246,0.12)' }}>جمع حساب</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {accounts.map((a) => (
                      <TableRow key={a.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={800}>{a.code}</Typography>
                          <Typography variant="caption" color="textSecondary">{a.name}</Typography>
                        </TableCell>
                        {costCenters.map((cc) => {
                          const cell = cellBy(a.id, cc.id);
                          return (
                            <TableCell key={cc.id}>
                              <Typography variant="body2" sx={{ color: cell.debit ? BLUE : 'text.disabled' }}>
                                {formatPersianNumber(cell.debit)}
                              </Typography>
                              <Typography variant="caption" sx={{ color: cell.credit ? GREEN : 'text.disabled' }}>
                                {formatPersianNumber(cell.credit)}
                              </Typography>
                            </TableCell>
                          );
                        })}
                        <TableCell>
                          <Typography variant="body2" fontWeight={800} color={BLUE}>{formatPersianNumber(a.debit)}</Typography>
                          <Typography variant="caption" color={GREEN}>{formatPersianNumber(a.credit)}</Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                    {costCenters.length > 0 && (
                      <TableRow sx={{ bgcolor: 'rgba(139,92,246,0.06)' }}>
                        <TableCell sx={{ fontWeight: 800 }}>جمع مرکز هزینه</TableCell>
                        {costCenters.map((cc) => (
                          <TableCell key={cc.id}>
                            <Typography variant="body2" fontWeight={800} color={BLUE}>{formatPersianNumber(cc.debit)}</Typography>
                            <Typography variant="caption" color={GREEN}>{formatPersianNumber(cc.credit)}</Typography>
                          </TableCell>
                        ))}
                        <TableCell>
                          <Typography variant="body2" fontWeight={900} color={COLOR_DARK}>{formatPersianNumber(data?.total_debit || 0)}</Typography>
                          <Typography variant="caption" color={COLOR_DARK}>{formatPersianNumber(data?.total_credit || 0)}</Typography>
                        </TableCell>
                      </TableRow>
                    )}
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

export default MatrixReportPage;