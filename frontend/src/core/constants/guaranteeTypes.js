// منبع یگانهٔ «نوع ضمانت / تضمین» در فرانت‌اند.
//
// این فهرست باید دقیقاً با Contract.GuaranteeKind در بک‌اند یکی باشد
// (hrms_project/contracts/models.py) و هم برای «نوع ضمانت» اقلام ضمانت قرارداد
// (صفحهٔ قرارداد) و هم برای «نوع تضمین» تضامین ثبت‌شده (صفحهٔ تضامین) استفاده می‌شود.
// ترتیب: گزینه‌های پایه، سپس گزینه‌های تکمیلی دوره‌ای/بازپرداخت، و در پایان «سایر».
export const GUARANTEE_TYPES = [
  { value: 'performance', label: 'ضمانت حسن انجام کار' },
  { value: 'advance', label: 'ضمانت پیش‌پرداخت' },
  { value: 'bid', label: 'ضمانت شرکت در مناقصه' },
  { value: 'execution', label: 'ضمانت اجرای تعهدات' },
  { value: 'insurance', label: 'سپرده حق بیمه' },
  { value: 'deduction_refund', label: 'ضمانت استرداد کسور وجه‌الضمان' },
  { value: 'warranty_period', label: 'ضمانت‌نامه دوره تضمین یا رفع عیب' },
  { value: 'maintenance_period', label: 'ضمانت‌نامه دوره نگهداری' },
  { value: 'funds_refund', label: 'ضمانت‌نامه بازپرداخت یا استرداد وجوه' },
  { value: 'insurance_social', label: 'ضمانت‌نامه تعهدات بیمه و تأمین اجتماعی' },
  { value: 'materials_supply', label: 'ضمانت‌نامه تأمین مصالح و تجهیزات' },
  { value: 'other', label: 'سایر' },
];

export const GUARANTEE_TYPE_LABELS = GUARANTEE_TYPES.reduce((acc, item) => {
  acc[item.value] = item.label;
  return acc;
}, {});

export default GUARANTEE_TYPE_LABELS;
