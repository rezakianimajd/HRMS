import React from 'react';
import CloseIcon from '@mui/icons-material/Close';
import { ReportHeader } from './annualHelpers';
import YearAction from './YearAction';

const CloseAccountsPage = () => (
  <>
    <ReportHeader
      icon={<CloseIcon sx={{ fontSize: 28, color: '#fff' }} />}
      title="بستن حساب‌ها"
      subtitle="بستن حساب‌های موقت (درآمد / هزینه / بهای تمام‌شده) به حساب سود و زیان"
    />
    <YearAction
      endpoint="/accounting/annual/close-accounts/"
      title="بستن حساب‌های موقت"
      description="ماندهٔ حساب‌های درآمد، هزینه و بهای تمام‌شده در پایان سال مالی صفر شده و به حساب سود و زیان منتقل می‌شود."
      buttonLabel="بستن حساب‌ها"
    />
  </>
);

export default CloseAccountsPage;