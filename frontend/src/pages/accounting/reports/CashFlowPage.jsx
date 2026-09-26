import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../../../core/api/axiosConfig';
import { Grid } from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import {
  COLOR_DARK, BLUE, GREEN, RED, AMBER,
  ReportHeader, StatCard, Loading, EmptyState, StatGrid, SectionCard, MoneyRow,
} from './reportHelpers';

const CashFlowPage = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['acc-report-cf-page'],
    queryFn: () => axiosInstance.get('/accounting/reports/cash-flow/').then((r) => r.data),
  });

  if (isLoading) return <Loading />;

  const op = data?.operating || {};

  return (
    <>
      <ReportHeader
        icon={<AccountBalanceWalletIcon sx={{ fontSize: 28, color: '#fff' }} />}
        title="جریان وجوه نقد"
        subtitle="روش مستقیم: عملیاتی + سرمایه‌گذاری + تأمین مالی"
        color="#06b6d4"
        dark="#0e7490"
      />

      {isError ? (
        <EmptyState message="خطا در بارگذاری جریان نقدی. دوباره تلاش کنید." />
      ) : (
        <>
          <StatGrid>
            <Grid item xs={12} sm={4}><StatCard label="جریان عملیاتی" value={op.net || 0} color={GREEN} /></Grid>
            <Grid item xs={12} sm={4}><StatCard label="سرمایه‌گذاری" value={data?.investing || 0} color={AMBER} /></Grid>
            <Grid item xs={12} sm={4}><StatCard label="تأمین مالی" value={data?.financing || 0} color={BLUE} /></Grid>
          </StatGrid>

          <SectionCard title="فعالیت‌های عملیاتی" color={GREEN}>
            <MoneyRow label="ورودی" value={op.inflows || 0} color={GREEN} />
            <MoneyRow label="خروجی" value={op.outflows || 0} color={RED} />
            <MoneyRow label="خالص عملیاتی" value={op.net || 0} color={GREEN} bold border />
          </SectionCard>

          <SectionCard title="فعالیت‌های سرمایه‌گذاری" color={AMBER}>
            <MoneyRow label="خالص سرمایه‌گذاری" value={data?.investing || 0} color={AMBER} bold />
          </SectionCard>

          <SectionCard title="فعالیت‌های تأمین مالی" color={BLUE}>
            <MoneyRow label="خالص تأمین مالی" value={data?.financing || 0} color={BLUE} bold />
          </SectionCard>

          <SectionCard title="خالص تغییر وجه نقد" color={COLOR_DARK}>
            <MoneyRow label="جمع کل" value={data?.net_change || 0} color={COLOR_DARK} bold />
          </SectionCard>
        </>
      )}
    </>
  );
};

export default CashFlowPage;