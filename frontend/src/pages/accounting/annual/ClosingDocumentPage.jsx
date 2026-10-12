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
      description="ماندهٔ حساب‌های دارایی، بدهی و حقوق مالکانه — تا آخرین تفکیک تفصیلیِ هر حساب — صفر شده و به حساب سود/زیان انباشته منتقل می‌شود. سطرها پیش‌نمایش و قابل ویرایش هستند."
      buttonLabel="ایجاد سند اختتامیه"
    />
  </>
);

export default ClosingDocumentPage;