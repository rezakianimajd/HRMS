/**
 * Configuration for all transaction types in the data entry module.
 * Each type defines its icon, color, sub-types, and fields.
 */

export const TRANSACTION_TYPES = {
  leave: {
    key: 'leave',
    label: 'مرخصی',
    icon: 'EventBusy',
    color: '#6366f1',
    subTypes: [
      { value: 'annual', label: 'استحقاقی' },
      { value: 'sick', label: 'استعلاجی' },
      { value: 'unpaid', label: 'بدون حقوق' },
      { value: 'maternity', label: 'زایمان' },
      { value: 'marriage', label: 'ازدواج' },
      { value: 'bereavement', label: 'فوت بستگان' },
      { value: 'hourly', label: 'ساعتی' },
    ],
  },
  absence: {
    key: 'absence',
    label: 'غیبت',
    icon: 'PersonOff',
    color: '#ef4444',
    subTypes: [
      { value: 'excused', label: 'موجه' },
      { value: 'unexcused', label: 'غیرموجه' },
      { value: 'truancy', label: 'غیبت غیرقانونی' },
    ],
  },
  salary: {
    key: 'salary',
    label: 'حقوق پرداختی',
    icon: 'Payments',
    color: '#f59e0b',
    subTypes: [
      { value: 'basic', label: 'حقوق پایه' },
      { value: 'overtime', label: 'اضافه‌کاری' },
      { value: 'commission', label: 'پورسانت' },
      { value: 'bonus', label: 'پاداش' },
    ],
  },
  benefit: {
    key: 'benefit',
    label: 'مزایای رفاهی',
    icon: 'CardGiftcard',
    color: '#10b981',
    subTypes: [
      { value: 'eidi', label: 'عیدی' },
      { value: 'bonus', label: 'پاداش' },
      { value: 'loan', label: 'وام' },
      { value: 'housing', label: 'حق مسکن' },
      { value: 'food', label: 'بن کارت' },
      { value: 'allowance', label: 'حق اولاد' },
      { value: 'transport', label: 'حق ایاب و ذهاب' },
      { value: 'mission', label: 'حق مأموریت' },
    ],
  },
  deduction: {
    key: 'deduction',
    label: 'کسورات',
    icon: 'MoneyOff',
    color: '#8b5cf6',
    subTypes: [
      { value: 'tax', label: 'مالیات' },
      { value: 'insurance', label: 'بیمه' },
      { value: 'loan', label: 'اقساط وام' },
      { value: 'advance', label: 'مساعده (سلف)' },
      { value: 'absence_penalty', label: 'جریمه غیبت' },
      { value: 'other', label: 'سایر' },
    ],
  },
};

export const SUB_TYPE_LABELS = Object.values(TRANSACTION_TYPES).reduce((acc, t) => {
  t.subTypes.forEach(s => { acc[s.value] = s.label; });
  return acc;
}, {});

/* -------------------------------------------------------------------------
 * Benefit record types (مزایای رفاهی)
 * ------------------------------------------------------------------------- */
export const BENEFIT_TYPES = [
  { value: 'performance', label: 'کارانه' },
  { value: 'eid_fitr', label: 'عید سعید فطر' },
  { value: 'eid_adha', label: 'عید سعید قربان' },
  { value: 'eid_ghadir', label: 'عید سعید غدیر خم' },
  { value: 'imam_reza_birthday', label: 'تولد امام رضا (ع)' },
  { value: 'sports_allowance', label: 'کمک هزینه ورزش' },
  { value: 'yalda_night', label: 'شب یلدا' },
  { value: 'bahman_22', label: '۲۲ بهمن' },
  { value: 'eid_mabath', label: 'عید مبعث' },
  { value: 'nowruz_basket', label: 'سبد نوروزی' },
  { value: 'fatima_birthday', label: 'تولد حضرت زهرا (س) و روز زن' },
  { value: 'ali_birthday', label: 'تولد حضرت علی (ع) و روز مرد' },
  { value: 'allowance', label: 'کمک هزینه' },
  { value: 'birthday', label: 'زادروز' },
  { value: 'ramadan_basket', label: 'سبد ماه مبارک رمضان' },
];

export const BENEFIT_TYPE_LABELS = BENEFIT_TYPES.reduce((acc, t) => {
  acc[t.value] = t.label;
  return acc;
}, {});
