import {
  buildPersonnelRows, classifyDocument, documentGroup, documentTypeLabel,
  fileFormat, groupPersonnelDocuments,
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

test('uses document type definitions instead of guessing from filenames', () => {
  const rows = [
    {
      id: 10, title: 'scan-001.jpg', file_name: 'scan-001.jpg',
      source_document_type_name: 'کارت ملی', source_document_type_code: 'NATIONAL_ID',
    },
    {
      id: 11, title: 'scan-002.pdf', file_name: 'scan-002.pdf',
      source_document_type_name: 'گواهی اشتغال', source_document_type_code: 'EMPLOYMENT',
    },
  ];

  expect(documentTypeLabel(rows[0])).toBe('کارت ملی');
  expect(documentGroup(rows[0]).key).not.toBe('national_id');
  expect(documentGroup(rows[1]).iconKey).toBe('certificate');

  const groups = groupPersonnelDocuments(rows);
  expect(groups.map((group) => group.label)).toEqual(['کارت ملی', 'گواهی اشتغال']);
  expect(groups.every((group) => group.isTypeGroup)).toBe(true);
});

test('does not confuse internal employee id with another employee personnel number', () => {
  const collisionEmployees = [
    { id: 16, employee_id: '1', full_name: 'دانیال گلپایگانی', first_name: 'دانیال', last_name: 'گلپایگانی' },
    { id: 1, employee_id: '200016', full_name: 'رضا کیانی مجد', first_name: 'رضا', last_name: 'کیانی مجد' },
  ];
  const result = buildPersonnelRows(collisionEmployees, [{
    id: 40, title: 'کارت ملی رضا کیانی مجد', file_name: 'reza.pdf',
    source_document_employee_id: '1', related_entity_type: 'employee',
    related_entity_id: '1', related_entity_label: 'رضا کیانی مجد',
    folder_path: 'پرسنل / 200016_کیانی_مجد', source_document_type_name: 'کارت ملی',
  }]);

  const reza = result.rows.find((row) => row.employee.id === 1);
  const danial = result.rows.find((row) => row.employee.id === 16);
  expect(reza?.count).toBe(1);
  expect(danial).toBeUndefined();
  expect(result.unassigned).toHaveLength(0);
});
