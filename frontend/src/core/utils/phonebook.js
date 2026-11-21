import { toEnglishDigits } from './numberUtils';

/**
 * داده‌های دفترچه تلفن از دو ماژول می‌آیند: طرف حساب‌های قرارداد و
 * تأمین‌کنندگان خرید. این ماژول خالص است تا نرمال‌سازی، جست‌وجو و مرتب‌سازی
 * بدون وابستگی به UI قابل تست باشد.
 */
export const PHONEBOOK_ACCENT = '#7c3aed';

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';

export const normalizePhonebookText = (value) => String(value ?? '')
  .replace(/[۰-۹]/g, (digit) => String(FA_DIGITS.indexOf(digit)))
  .replace(/[٠-٩]/g, (digit) => String(AR_DIGITS.indexOf(digit)))
  .replace(/[يى]/g, 'ی')
  .replace(/ك/g, 'ک')
  .replace(/[\u200c\u200e\u200f]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase();

export const phonebookDigits = (value) => toEnglishDigits(String(value ?? ''))
  .replace(/[^\d+]/g, '');

export const phoneHref = (value) => {
  const digits = phonebookDigits(value).replace(/^\+/, '');
  return digits ? `tel:${digits}` : '';
};

export const phonebookInitial = (name) => {
  const clean = String(name || '').trim();
  return clean ? Array.from(clean)[0] : '؟';
};

const TONES = ['#0ea5e9', '#7c3aed', '#0f766e', '#f59e0b', '#db2777', '#2563eb'];

export const phonebookTone = (name) => {
  const text = normalizePhonebookText(name);
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) % 9973;
  }
  return TONES[hash % TONES.length];
};

const codeLabelOf = (row, fallback) => {
  if (row.national_id) return 'شناسه ملی';
  if (row.economic_code) return 'کد اقتصادی';
  if (row.registration_number) return 'شماره ثبت';
  if (row.code) return fallback;
  return '';
};

const searchTextOf = (contact) => {
  const values = [
    contact.name, contact.code, contact.codeLabel, contact.nationalId,
    contact.economicCode, contact.registrationNumber, contact.typeLabel,
    contact.personLabel, contact.contactPerson, contact.ceoName, contact.ceoPhone,
    contact.financeManagerName, contact.financeManagerPhone,
    contact.technicalContactName, contact.technicalContactPhone, contact.phone,
    contact.mobile, contact.email, contact.address, contact.categoryName,
    contact.statusLabel, contact.sourceLabel, contact.contractsCount,
    contact.companyType, contact.partyType, contact.establishmentDate,
    contact.registeredCapital, contact.bankName, contact.accountNumber,
    contact.shebaNumber, contact.postalCode, contact.taxId,
    contact.creditLimit, contact.paymentTerms, contact.description,
  ];
  const compactPhones = [contact.phone, contact.mobile, contact.ceoPhone,
    contact.financeManagerPhone, contact.technicalContactPhone]
    .map((value) => phonebookDigits(value).replace(/\D/g, ''))
    .join(' ');
  return normalizePhonebookText([...values, compactPhones].filter(Boolean).join(' '));
};

export const normalizeContractParty = (row = {}) => {
  const contact = {
    key: `contract-party-${row.id}`,
    id: row.id,
    source: 'contracts',
    sourceLabel: 'طرف حساب قرارداد',
    sourceShort: 'قرارداد',
    sourceColor: '#0ea5e9',
    name: row.name || 'بدون نام',
    code: row.national_id || row.economic_code || row.registration_number || '',
    codeLabel: codeLabelOf(row, 'شناسه'),
    nationalId: row.national_id || '',
    economicCode: row.economic_code || '',
    registrationNumber: row.registration_number || '',
    typeLabel: row.party_type_display || row.person_type_display || 'طرف حساب',
    partyType: row.party_type_display || '',
    personLabel: row.person_type_display || '',
    companyType: row.company_type_display || '',
    establishmentDate: row.establishment_date || '',
    registeredCapital: row.registered_capital ?? null,
    contactPerson: row.contact_person || '',
    phone: row.phone || '',
    mobile: row.mobile || '',
    email: row.email || '',
    address: row.address || '',
    bankName: row.bank_name || '',
    accountNumber: row.account_number || '',
    shebaNumber: row.sheba_number || '',
    description: row.description || '',
    ceoName: row.ceo_name || '',
    ceoPhone: row.ceo_phone || '',
    financeManagerName: row.finance_manager_name || '',
    financeManagerPhone: row.finance_manager_phone || '',
    technicalContactName: row.technical_contact_name || '',
    technicalContactPhone: row.technical_contact_phone || '',
    categoryName: '',
    statusLabel: '',
    rating: null,
    contractsCount: Number(row.contracts_count) || 0,
    createdAt: row.created_at || '',
    raw: row,
  };
  return { ...contact, searchText: searchTextOf(contact) };
};

export const normalizeSupplier = (row = {}) => {
  const contact = {
    key: `supplier-${row.id}`,
    id: row.id,
    source: 'procurement',
    sourceLabel: 'تأمین‌کنندهٔ خرید',
    sourceShort: 'خرید',
    sourceColor: '#f59e0b',
    name: row.name || 'بدون نام',
    code: row.code || row.national_id || '',
    codeLabel: codeLabelOf(row, 'کد تأمین‌کننده'),
    nationalId: row.national_id || '',
    economicCode: row.economic_code || '',
    registrationNumber: row.registration_number || '',
    typeLabel: row.category_name || 'تأمین‌کننده',
    personLabel: 'تأمین‌کننده',
    companyType: '',
    establishmentDate: '',
    registeredCapital: null,
    contactPerson: row.contact_person || '',
    phone: row.phone || '',
    mobile: row.mobile || '',
    email: row.email || '',
    address: row.address || '',
    bankName: row.bank_name || '',
    accountNumber: row.account_number || '',
    shebaNumber: row.sheba_number || '',
    description: row.description || '',
    postalCode: row.postal_code || '',
    taxId: row.tax_id || '',
    creditLimit: row.credit_limit ?? null,
    paymentTerms: row.payment_terms || '',
    ceoName: '',
    ceoPhone: '',
    financeManagerName: '',
    financeManagerPhone: '',
    technicalContactName: '',
    technicalContactPhone: '',
    categoryName: row.category_name || '',
    statusLabel: row.status_display || '',
    rating: row.rating == null ? null : Number(row.rating),
    contractsCount: 0,
    createdAt: row.created_at || '',
    raw: row,
  };
  return { ...contact, searchText: searchTextOf(contact) };
};

export const buildPhonebookContacts = (parties = [], suppliers = []) => [
  ...(Array.isArray(parties) ? parties.map(normalizeContractParty) : []),
  ...(Array.isArray(suppliers) ? suppliers.map(normalizeSupplier) : []),
];


export const phonebookTypeOptions = (contacts = []) => {
  const counts = new Map();
  contacts.forEach((contact) => {
    const label = contact.typeLabel || 'سایر';
    counts.set(label, (counts.get(label) || 0) + 1);
  });
  return Array.from(counts.entries())
    .sort((a, b) => a[0].localeCompare(b[0], 'fa'))
    .map(([label, count]) => ({ label, count }));
};

export const phonebookFilters = (contact, filters = {}) => {
  const { search = '', source = 'all', type = 'all', availability = 'all' } = filters;
  if (source !== 'all' && contact.source !== source) return false;
  if (type !== 'all' && contact.typeLabel !== type) return false;
  if (availability === 'phone' && !contact.phone) return false;
  if (availability === 'mobile' && !contact.mobile) return false;
  if (availability === 'email' && !contact.email) return false;
  const term = normalizePhonebookText(search);
  if (!term) return true;
  return term.split(' ').every((part) => contact.searchText.includes(part));
};

export const filterPhonebookContacts = (contacts = [], filters = {}) => contacts
  .filter((contact) => phonebookFilters(contact, filters));

export const sortPhonebookContacts = (contacts = [], sortBy = 'name_asc') => {
  const rows = [...contacts];
  if (sortBy === 'name_desc') {
    return rows.sort((a, b) => String(b.name).localeCompare(String(a.name), 'fa'));
  }
  if (sortBy === 'contracts') {
    return rows.sort((a, b) => (b.contractsCount || 0) - (a.contractsCount || 0)
      || String(a.name).localeCompare(String(b.name), 'fa'));
  }
  if (sortBy === 'rating') {
    return rows.sort((a, b) => (b.rating || 0) - (a.rating || 0)
      || String(a.name).localeCompare(String(b.name), 'fa'));
  }
  if (sortBy === 'recent') {
    return rows.sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));
  }
  return rows.sort((a, b) => String(a.name).localeCompare(String(b.name), 'fa'));
};

