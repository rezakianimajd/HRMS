import React from 'react';
import PostAddIcon from '@mui/icons-material/PostAdd';
import { ReportHeader } from './annualHelpers';
import YearAction from './YearAction';

const OpeningDocumentPage = () => (
  <>
    <ReportHeader
      icon={<PostAddIcon sx={{ fontSize: 28, color: '#fff' }} />}
      title="سند افتتاحیه"
      subtitle="انتقال ماندهٔ پایان سال مالی قبل به ابتدای سال جدید (حساب‌های ترازنامه‌ای)"
    />
    <YearAction
      endpoint="/accounting/annual/opening-document/"
      title="ایجاد سند افتتاحیه"
      description="ماندهٔ حساب‌های دارایی، بدهی و حقوق مالکانهٔ سال قبل به‌صورت خودکار به سال جدید منتقل و ثبت می‌شود. در صورت وجود اختلاف، با حساب سود و زیان توازن می‌یابد."
      buttonLabel="ایجاد سند افتتاحیه"
    />
  </>
);

export default OpeningDocumentPage;