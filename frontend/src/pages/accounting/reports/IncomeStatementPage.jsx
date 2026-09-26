import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../../../core/api/axiosConfig';
import { Grid, Typography, Divider } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import {
  COLOR_DARK, BLUE, GREEN, RED, AMBER,
  ReportHeader, StatCard, Loading, EmptyState, StatGrid, SectionCard, MoneyRow,
} from './reportHelpers';
import { formatPersianNumber } from '../../../core/utils/numberUtils';

const IncomeStatementPage = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['acc-report-is-page'],
    queryFn: () => axiosInstance.get('/accounting/reports/income-statement/').then((r) => r.data),
  });

  if (isLoading) return <Loading />;

  const net = data?.net_profit || 0;

  return (
    <>
      <ReportHeader
        icon={<TrendingUpIcon sx={{ fontSize: 28, color: '#fff' }} />}
        title="صورت سود و زیان"
        subtitle="درآمد − بهای تمام‌شده = سود ناخالص؛ − هزینه‌ها = سود/زیان خالص"
        color="#10b981"
        dark="#047857"
      />

      {isError ? (
        <EmptyState message="خطا در بارگذاری سود و زیان. دوباره تلاش کنید." />
      ) : (
        <>
          <StatGrid>
            <Grid item xs={12} sm={4}><StatCard label="درآمد" value={data?.revenue || 0} color={GREEN} /></Grid>
            <Grid item xs={12} sm={4}><StatCard label="بهای تمام‌شده" value={data?.cost_of_sales || 0} color={AMBER} /></Grid>
            <Grid item xs={12} sm={4}><StatCard label="سود ناخالص" value={data?.gross_profit || 0} color={BLUE} /></Grid>
          </StatGrid>

          <SectionCard title="اجزای صورت سود و زیان" color={COLOR_DARK}>
            <MoneyRow label="درآمد" value={data?.revenue || 0} color={GREEN} />
            <MoneyRow label="بهای تمام‌شدهٔ کالای فروش‌رفته" value={data?.cost_of_sales || 0} color={AMBER} />
            <MoneyRow label="سود ناخالص" value={data?.gross_profit || 0} color={BLUE} bold border />
            <MoneyRow label="هزینه‌های عملیاتی" value={data?.expenses || 0} color={RED} />
            <MoneyRow label="سود / زیان خالص" value={net} color={net >= 0 ? GREEN : RED} bold border />
          </SectionCard>

          {(data?.expense_details?.length > 0) && (
            <SectionCard title="تفکیک هزینه‌ها" color={RED}>
              <MoneyRow label="گروه هزینه" value="مبلغ" bold />
              <Divider sx={{ my: 1 }} />
              {(data.expense_details || []).map((e, i) => (
                <MoneyRow key={i} label={e.group} value={e.amount} color={RED} />
              ))}
            </SectionCard>
          )}
        </>
      )}
    </>
  );
};

export default IncomeStatementPage;