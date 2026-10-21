import {
  buildPersonnelRows, classifyDocument, fileFormat, groupPersonnelDocuments,
} from '../pages/contracts/personnelDocuments';

const employees = [
  {
    id: 7, employee_id: '1001', full_name: 'علی رضایی', first_name: 'علی',
    last_name: 'رضایی', department_name: 'فنی', photo_url: 'https://example.test/ali.jpg',
  },
  {
    id: 8, employee_id: '1002', full_name: 'مریم احمدی', first_name: 'مریم',
    last_name: 'احمدی', department_name: 'مالی',
  },
];

const documents = [
  {
    id: 1, title: 'کارت ملی', folder_path: 'پرسنل / 1001_علی_رضایی',
    file_name: 'national-id.jpg', file_extension: '.jpg', description: 'پشت و رو',
  },
  {
    id: 2, title: 'شناسنامه', folder_path: 'پرسنل / 1001_علی_رضایی',
    file_name: 'birth.pdf', file_extension: '.pdf', description: '',
  },
  {
    id: 3, title: 'مدرک تحصیلی', related_entity_type: 'employee',
    related_entity_id: '8', file_name: 'degree.pdf', file_extension: '.pdf',
    description: 'کارشناسی',
  },
  {
    id: 4, title: 'سند بدون پرونده', folder_path: 'پرسنل / نامشخص',
    file_name: 'unknown.docx', file_extension: '.docx',
  },
];

test('classifies personnel documents by upload category and file format', () => {
  expect(classifyDocument({ title: 'عکس پرسنلی' }).key).toBe('photo');
  expect(classifyDocument({ title: 'کارت ملی' }).key).toBe('national_id');
  expect(classifyDocument({ title: 'شناسنامه' }).key).toBe('birth_certificate');
  expect(classifyDocument({ title: 'مدرک تحصیلی' }).key).toBe('education');
  expect(classifyDocument({ title: 'قرارداد کار' }).key).toBe('contract');
  expect(classifyDocument({ title: 'سایر' }).key).toBe('other');
  expect(fileFormat({ file_name: 'a.pdf' }).label).toBe('PDF');
  expect(fileFormat({ file_extension: 'jpg' }).label).toBe('تصویر');
  expect(fileFormat({ file_name: 'a.docx' }).label).toBe('Word');
});

test('groups documents under the matching employee and keeps unassigned files', () => {
  const result = buildPersonnelRows(employees, documents);
  expect(result.rows).toHaveLength(2);
  const ali = result.rows.find((row) => row.employee.id === 7);
  expect(ali.count).toBe(3);
  expect(ali.groups.map((group) => group.key)).toEqual(['photo', 'birth_certificate', 'national_id']);
  expect(ali.groups.find((group) => group.key === 'photo').files[0].isEmployeePhoto).toBe(true);
  const maryam = result.rows.find((row) => row.employee.id === 8);
  expect(maryam.count).toBe(1);
  expect(maryam.groups[0].key).toBe('education');
  expect(result.unassigned.map((row) => row.id)).toEqual([4]);
  expect(groupPersonnelDocuments(documents)).toHaveLength(4);
});

test('filters personnel cards by employee or document text', () => {
  const byName = buildPersonnelRows(employees, documents, 'مریم');
  expect(byName.rows).toHaveLength(1);
  expect(byName.rows[0].employee.id).toBe(8);

  const byDocument = buildPersonnelRows(employees, documents, 'کارت ملی');
  expect(byDocument.rows).toHaveLength(1);
  expect(byDocument.rows[0].employee.id).toBe(7);
});
