import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import RequestQuoteOutlinedIcon from '@mui/icons-material/RequestQuoteOutlined';

/**
 * نوع‌های پرداخت قرارداد — تعریف مشترک بین صفحهٔ لیست پرداخت‌ها و دیالوگ
 * ثبت/ویرایش، تا برچسب‌ها، رنگ‌ها و آیکون‌ها هرگز دو جا از هم جدا نشوند.
 */
export const PAYMENT_TYPES = [
  {
    key: 'normal',
    label: 'پرداخت عادی',
    shortLabel: 'عادی',
    color: '#0f766e',
    icon: PaymentsOutlinedIcon,
    allowsAllocation: true,
  },
  {
    key: 'advance',
    label: 'پیش‌پرداخت',
    shortLabel: 'پیش‌پرداخت',
    color: '#b45309',
    icon: AccountBalanceWalletOutlinedIcon,
    allowsAllocation: false,
  },
  {
    key: 'on_account',
    label: 'علی‌الحساب',
    shortLabel: 'علی‌الحساب',
    color: '#7c3aed',
    icon: RequestQuoteOutlinedIcon,
    allowsAllocation: true,
  },
];

export const PAYMENT_TYPE_META = PAYMENT_TYPES.reduce((acc, item) => {
  acc[item.key] = item;
  return acc;
}, {});

export const paymentTypeOf = (row = {}) => (
  PAYMENT_TYPE_META[row?.payment_type] || PAYMENT_TYPE_META.normal
);

export const ALLOCATABLE_PAYMENT_TYPES = PAYMENT_TYPES
  .filter((item) => item.allowsAllocation)
  .map((item) => item.key);
