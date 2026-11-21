import {
  buildPhonebookContacts, filterPhonebookContacts, phoneHref,
  normalizePhonebookText, sortPhonebookContacts,
} from '../core/utils/phonebook';

const parties = [{
  id: 1,
  name: 'شرکت پارس',
  national_id: '10101010101',
  party_type_display: 'پیمانکار',
  person_type_display: 'شخص حقوقی',
  company_type_display: 'سهامی خاص',
  establishment_date: '2015-03-21',
  registered_capital: 1000000000,
  phone: '021-88776655',
  mobile: '09121234567',
  email: 'info@pars.example',
  contact_person: 'رضا احمدی',
  ceo_name: 'علی پارس',
  bank_name: 'بانک ملی',
  contracts_count: 4,
}];

const suppliers = [{
  id: 2,
  code: 'SUP-1',
  name: 'تأمین‌کنندهٔ الف',
  category_name: 'تجهیزات',
  phone: '021-11223344',
  mobile: '',
  email: '',
  contact_person: 'سارا محمدی',
  status_display: 'فعال',
  rating: 4.5,
}];

test('phonebook normalizes Persian digits and makes tel links', () => {
  expect(normalizePhonebookText('شركت ۱۲۳')).toBe('شرکت 123');
  expect(phoneHref('۰۲۱ ۸۸۷۷ ۶۶۵۵')).toBe('tel:02188776655');
});

test('phonebook merges contract parties and procurement suppliers', () => {
  const rows = buildPhonebookContacts(parties, suppliers);
  expect(rows).toHaveLength(2);
  expect(rows[0].source).toBe('contracts');
  expect(rows[1].source).toBe('procurement');
  expect(rows[0].sourceLabel).toContain('قرارداد');
});

test('phonebook search, source and availability filters work together', () => {
  const rows = buildPhonebookContacts(parties, suppliers);
  expect(filterPhonebookContacts(rows, { search: 'پارس' })).toHaveLength(1);
  expect(filterPhonebookContacts(rows, { search: '۰۹۱۲' })).toHaveLength(1);
  expect(filterPhonebookContacts(rows, { search: 'تجهیزات' })).toHaveLength(1);
  expect(filterPhonebookContacts(rows, { source: 'procurement' })).toHaveLength(1);
  expect(filterPhonebookContacts(rows, { availability: 'email' })).toHaveLength(1);
});

test('phonebook keeps legal, representative and bank details for the detail dialog', () => {
  const [row] = buildPhonebookContacts(parties, []);
  expect(row.companyType).toBe('سهامی خاص');
  expect(row.registeredCapital).toBe(1000000000);
  expect(row.ceoName).toBe('علی پارس');
  expect(row.contactPerson).toBe('رضا احمدی');
  expect(row.bankName).toBe('بانک ملی');
  expect(filterPhonebookContacts([row], { search: 'بانک ملی' })).toHaveLength(1);
});

test('phonebook sorting prioritizes contract count when requested', () => {
  const rows = buildPhonebookContacts(parties, suppliers);
  const sorted = sortPhonebookContacts(rows, 'contracts');
  expect(sorted[0].name).toBe('شرکت پارس');
});
