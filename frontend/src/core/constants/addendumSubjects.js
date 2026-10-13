/**
 * فهرست استاندارد «موضوع الحاقیه» — هم‌تراز با `Addendum.SubjectType` در بک‌اند
 * (`GET /contract-addendums/subject-types/`). این نسخه فقط به‌عنوان پشتیبان (fallback)
 * استفاده می‌شود تا فرم حتی اگر آن سرویس در دسترس نباشد پر شود.
 */
export const ADDENDUM_SUBJECTS = [
  { value: 'provisions', label: 'اصلاح و تکمیل مفاد قرارداد' },
  { value: 'amount', label: 'تغییر مبلغ، بهای قرارداد و تعدیل قیمت' },
  { value: 'duration', label: 'تغییر مدت، تمدید و اصلاح برنامه زمانی قرارداد' },
  { value: 'scope', label: 'تغییر موضوع، دامنه و حجم کار قرارداد' },
  { value: 'technical', label: 'تغییر مشخصات فنی، نقشه‌ها و استانداردهای اجرایی' },
  { value: 'payment', label: 'تغییر شرایط پرداخت، پیش‌پرداخت و تسویه‌حساب' },
  { value: 'guarantees', label: 'تغییر تضامین، ضمانت‌نامه‌ها و وثایق' },
  { value: 'deductions', label: 'تغییر کسورات، جرایم و خسارات قراردادی' },
  { value: 'obligations', label: 'تغییر تعهدات، مسئولیت‌ها و حدود اختیارات طرفین' },
  { value: 'parties', label: 'تغییر مشخصات طرفین، نمایندگان و صاحبان امضای مجاز' },
  { value: 'project', label: 'تغییر پروژه، محل اجرا و نحوه تخصیص کار' },
  { value: 'consultants', label: 'تغییر ناظر، مشاور، پیمانکاران جزء و عوامل اجرایی' },
  { value: 'supply', label: 'تغییر شرایط تأمین مصالح، تجهیزات و تحویل کالا' },
  { value: 'legal', label: 'تغییر شرایط بیمه، مالیات و الزامات قانونی' },
  { value: 'suspension', label: 'تغییر شرایط تعلیق، توقف، ازسرگیری و خاتمه قرارداد' },
  { value: 'delivery', label: 'تغییر شرایط تحویل، آزمایش، تأیید و تضمین کیفیت' },
  { value: 'currency', label: 'تغییر ارز قرارداد، نرخ تسعیر و شرایط مالی بین‌المللی' },
  { value: 'other', label: 'سایر تغییرات و الحاق موارد جدید' },
];

export const addendumSubjectLabel = (value) =>
  ADDENDUM_SUBJECTS.find((item) => item.value === value)?.label || '';

export default ADDENDUM_SUBJECTS;
