import React from 'react';
import LockIcon from '@mui/icons-material/Lock';
import { ReportHeader } from './annualHelpers';
import YearAction from './YearAction';

const ClosingDocumentPage = () => (
  <>
    <ReportHeader
      icon={<LockIcon sx={{ fontSize: 28, color: '#fff' }} />}
      title="سند اختتامیه"
      subtitle="صفر کردن حساب‌های ترازنامه‌ای در پایان سال مالی"
    />
    <YearAction
      endpoint="/accounting/annual/closing-document/"
      title="ایجاد سند اختتامیه"
      description="ماندهٔ حساب‌های دارایی، بدهی و حقوق مالکانه به‌صورت خودکار صفر شده و به حساب هدف منتقل می‌شود."
      buttonLabel="ایجاد سند اختتامیه"
    />
  </>
);

export default ClosingDocumentPage;