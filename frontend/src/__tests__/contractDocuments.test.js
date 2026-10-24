import {
  countByFileType, countByRelation, documentTitleForFile, fileExtension, fileMeta,
  formatFileSize, matchesDocumentSearch, relationKeyOf, relationMetaOf,
  relationOptionLabel, relationTargetLabel,
} from '../pages/contracts/contractDocumentsHelpers';

test('detects contract document file types from extension and API metadata', () => {
  expect(fileMeta({ file_name: 'contract.pdf' }).key).toBe('pdf');
  expect(fileMeta({ file_name: 'scan.JPG' }).key).toBe('image');
  expect(fileMeta({ file_extension: 'docx' }).key).toBe('word');
  expect(fileExtension('archive.zip')).toBe('.zip');
  expect(formatFileSize(2048)).toBe('۲ KB');
});

test('resolves the document relation and a readable target', () => {
  const addendum = {
    addendum: 4, addendum_number: 'A-1405-01', addendum_subject: 'تمدید مدت',
  };
  const guarantee = { guarantee: 2, guarantee_number: 'G-900' };
  const statement = { statement: 7, statement_number: 'S-12' };
  expect(relationKeyOf(addendum)).toBe('addendum');
  expect(relationMetaOf(addendum).label).toBe('الحاقیه');
  expect(relationTargetLabel(addendum)).toContain('A-1405-01');
  expect(relationKeyOf(guarantee)).toBe('guarantee');
  expect(relationTargetLabel(guarantee)).toBe('G-900');
  expect(relationKeyOf(statement)).toBe('statement');
  expect(relationTargetLabel({})).toBe('مستندات عمومی قرارداد');
});

test('builds distinct titles for multi-file uploads', () => {
  expect(documentTitleForFile({ name: 'contract.pdf' }, '', false)).toBe('contract');
  expect(documentTitleForFile({ name: 'contract.pdf' }, 'مدارک قرارداد', true)).toBe('مدارک قرارداد — contract');
  expect(documentTitleForFile({ name: 'a.docx' }, '', true)).toBe('a');
});

test('counts relations and file types and searches metadata', () => {
  const rows = [
    { title: 'قرارداد اصلی', file_name: 'main.pdf', contract_number: 'C-1' },
    { title: 'الحاقیه', addendum_number: 'A-1', file_name: 'add.pdf' },
    { title: 'تضمین', guarantee_number: 'G-1', file_name: 'guarantee.jpg' },
  ];
  expect(countByRelation(rows)).toMatchObject({ all: 3, contract: 1, addendum: 1, guarantee: 1, statement: 0 });
  expect(countByFileType(rows)).toMatchObject({ pdf: 2, image: 1 });
  expect(matchesDocumentSearch(rows[1], 'a-1')).toBe(true);
  expect(matchesDocumentSearch(rows[0], 'ناموجود')).toBe(false);
});

test('labels relation options for addenda, guarantees and statements', () => {
  expect(relationOptionLabel('addendum', { number: 'A-1', subject: 'تمدید' })).toBe('A-1 — تمدید');
  expect(relationOptionLabel('guarantee', { number: 'G-1', guarantee_type_display: 'حسن انجام کار' })).toContain('G-1');
  expect(relationOptionLabel('statement', { number: 'S-3' })).toBe('صورت‌وضعیت S-3');
});
