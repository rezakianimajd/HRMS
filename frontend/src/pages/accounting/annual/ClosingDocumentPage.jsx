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
      kind="closing"
      title="ایجاد سند اختتامیه"
      dateLabel="تاریخ سند اختتامیه"
      description="ماندهٔ حساب‌های دارایی، بدهی، حقوق مالکانه و حساب‌های انتظامی — با همان معین و آخرین تفصیل — برگشت داده و صفر می‌شود. اگر «بستن حساب‌ها» را قبلاً اجرا کرده باشید، جمع بدهکار و بستانکار خودِ همین برگشت‌ها برابر است و سند بدون هیچ سطر حساب هدفی متوازن می‌شود؛ در غیر این صورت تنها یک سطر «توازن اختتامیه» اضافه و علت آن اعلام می‌شود."
      buttonLabel="ایجاد سند اختتامیه"
    />
  </>
);

export default ClosingDocumentPage;