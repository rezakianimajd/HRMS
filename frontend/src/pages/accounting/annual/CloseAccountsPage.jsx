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
      kind="close-accounts"
      title="بستن حساب‌های موقت"
      dateLabel="تاریخ سند بستن حساب‌ها"
      description="ماندهٔ حساب‌های درآمد، هزینه و بهای تمام‌شده — تا آخرین تفکیک تفصیلیِ هر حساب — صفر شده و به حساب سود و زیان منتقل می‌شود. سطرها پیش‌نمایش و قابل ویرایش هستند."
      buttonLabel="بستن حساب‌ها"
    />
  </>
);

export default CloseAccountsPage;