/** ابزارهای خالصِ گروه‌بندی مدارک پرسنلی در کتابخانهٔ اسناد. */

export const CATEGORY_RULES = [
  {
    key: 'photo', label: 'عکس پرسنلی', color: '#0284c7',
    keywords: ['عکس', 'photo', 'تصویر'],
  },
  {
    key: 'birth_certificate', label: 'شناسنامه', color: '#c026d3',
    keywords: ['شناسنامه', 'birth certificate', 'birth_certificate', 'شناسنامه'],
  },
  {
    key: 'national_id', label: 'کارت ملی', color: '#7c3aed',
    keywords: ['کارت ملی', 'national id', 'national_id', 'ملی'],
  },
  {
    key: 'education', label: 'مدرک تحصیلی', color: '#2563eb',
    keywords: ['مدرک تحصیلی', 'تحصیل', 'دانشگاه', 'degree', 'diploma', 'education'],
  },
  {
    key: 'contract', label: 'قرارداد و الحاقیه', color: '#0f766e',
    keywords: ['قرارداد', 'contract', 'الحاقیه', 'addendum'],
  },
  {
    key: 'insurance', label: 'بیمه و تأمین اجتماعی', color: '#059669',
    keywords: ['بیمه', 'insurance', 'تأمین اجتماعی', 'تامین اجتماعی', 'سابقه بیمه'],
  },
  {
    key: 'service', label: 'پایان خدمت', color: '#b45309',
    keywords: ['پایان خدمت', 'خدمت', 'military', 'سربازی'],
  },
  {
    key: 'certificate', label: 'گواهی و گواهینامه', color: '#d97706',
    keywords: ['گواهی', 'گواهینامه', 'certificate', 'license'],
  },
  {
    key: 'payroll', label: 'فیش و احکام حقوقی', color: '#be123c',
    keywords: ['فیش', 'حقوق', 'حکم', 'payroll', 'salary'],
  },
  {
    key: 'other', label: 'سایر مدارک پرسنلی', color: '#64748b',
    keywords: [],
  },
];

export const CATEGORY_ORDER = CATEGORY_RULES.map((rule) => rule.key);

export const normalizeText = (value) => String(value ?? '')
  .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
  .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
  .replace(/[يى]/g, 'ی')
  .replace(/ك/g, 'ک')
  .replace(/[^\w\u0600-\u06FF]+/g, '')
  .toLowerCase();

export const extensionOf = (row) => {
  const explicit = String(row?.file_extension || '').toLowerCase();
  if (explicit) return explicit.startsWith('.') ? explicit : `.${explicit}`;
  const name = String(row?.file_name || row?.original_name || row?.file || row?.storage_path || '');
  const match = name.match(/(\.[a-z0-9]{2,6})(?:$|\?)/i);
  return match ? match[1].toLowerCase() : '';
};

export const fileFormat = (row) => {
  const ext = extensionOf(row);
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'].includes(ext)) {
    return { key: 'image', label: 'تصویر', color: '#0284c7', ext };
  }
  if (ext === '.pdf') return { key: 'pdf', label: 'PDF', color: '#dc2626', ext };
  if (['.doc', '.docx', '.rtf', '.odt'].includes(ext)) {
    return { key: 'word', label: 'Word', color: '#2563eb', ext };
  }
  if (['.xls', '.xlsx', '.csv', '.ods'].includes(ext)) {
    return { key: 'excel', label: 'Excel', color: '#059669', ext };
  }
  if (['.ppt', '.pptx'].includes(ext)) {
    return { key: 'powerpoint', label: 'PowerPoint', color: '#ea580c', ext };
  }
  if (['.zip', '.rar', '.7z'].includes(ext)) {
    return { key: 'archive', label: 'بستهٔ فشرده', color: '#7c3aed', ext };
  }
  return { key: 'other', label: ext ? ext.replace('.', '').toUpperCase() : 'فایل', color: '#64748b', ext };
};

export const classifyDocument = (row) => {
  if (row?.isEmployeePhoto) return CATEGORY_RULES[0];
  const haystack = normalizeText([
    row?.title, row?.description, row?.file_name, row?.original_name,
    row?.folder_name, row?.folder_path, row?.document_type_display,
    row?.document_type, row?.related_entity_label, row?.source_module_key,
  ].filter(Boolean).join(' '));
  const found = CATEGORY_RULES.find((rule) => (
    rule.keywords.length && rule.keywords.some((keyword) => haystack.includes(normalizeText(keyword)))
  ));
  return found || CATEGORY_RULES[CATEGORY_RULES.length - 1];
};

export const documentSourceLabel = (row) => {
  if (row?.isEmployeePhoto) return 'پروندهٔ پرسنلی';
  return row?.document_type_display || row?.folder_name || row?.source_module_key || 'کتابخانهٔ اسناد';
};

export const documentSearchText = (row) => normalizeText([
  row?.title, row?.description, row?.file_name, row?.original_name,
  row?.folder_path, row?.related_entity_label, row?.document_type_display,
  row?.document_type, row?.tags,
].filter(Boolean).join(' '));

const employeeName = (employee) => (
  employee?.full_name || `${employee?.first_name || ''} ${employee?.last_name || ''}`.trim()
);

const documentBelongsToEmployee = (employee, row) => {
  const relatedId = String(row?.related_entity_id || '').trim();
  const employeeId = String(employee?.id || '').trim();
  const personnelNumber = normalizeText(employee?.employee_id);
  if (relatedId && (relatedId === employeeId || relatedId === personnelNumber)) return true;

  const haystack = normalizeText([
    row?.related_entity_label, row?.folder_path, row?.folder_name,
    row?.source_module_key,
  ].filter(Boolean).join(' '));
  if (!haystack) return false;

  const fullName = normalizeText(employeeName(employee));
  const lastName = normalizeText(employee?.last_name);
  if (personnelNumber.length >= 3 && haystack.includes(personnelNumber)) return true;
  if (fullName.length >= 4 && haystack.includes(fullName)) return true;
  if (lastName.length >= 4 && haystack.includes(lastName)) return true;
  return false;
};

const employeePhotoRow = (employee) => {
  const url = employee?.photo_url || employee?.photo;
  if (!url) return null;
  return {
    id: `employee-photo-${employee.id}`,
    title: 'عکس پرسنلی',
    description: 'عکس ثبت‌شده در پروندهٔ پرسنلی',
    file_url: url,
    file_name: `employee-${employee.employee_id || employee.id}.jpg`,
    file_extension: '.jpg',
    isEmployeePhoto: true,
    created_at: employee.updated_at || employee.created_at,
  };
};

const buildGroups = (documents) => {
  const grouped = new Map(CATEGORY_ORDER.map((key) => [key, []]));
  documents.forEach((row) => {
    const category = classifyDocument(row);
    grouped.get(category.key).push(row);
  });
  return CATEGORY_RULES
    .map((category) => ({
      ...category,
      files: (grouped.get(category.key) || []).sort((a, b) => (
        String(b.created_at || b.issue_date || '').localeCompare(String(a.created_at || a.issue_date || ''))
      )),
    }))
    .filter((category) => category.files.length);
};

export const groupPersonnelDocuments = buildGroups;

export const buildPersonnelRows = (employees = [], documents = [], search = '') => {
  const people = Array.isArray(employees) ? employees : [];
  const docs = Array.isArray(documents) ? documents : [];
  const perEmployee = new Map();
  const unassigned = [];
  docs.forEach((row) => {
    const employee = people.find((person) => documentBelongsToEmployee(person, row));
    if (!employee) {
      unassigned.push(row);
      return;
    }
    const list = perEmployee.get(employee.id) || [];
    list.push(row);
    perEmployee.set(employee.id, list);
  });

  const query = normalizeText(search);
  const rows = people
    .map((employee) => {
      const ownDocs = perEmployee.get(employee.id) || [];
      const photo = employeePhotoRow(employee);
      if (!ownDocs.length && !photo) return null;
      const hasPhotoDocument = ownDocs.some((row) => classifyDocument(row).key === 'photo');
      const allDocs = photo && !hasPhotoDocument ? [photo, ...ownDocs] : ownDocs;
      const groups = buildGroups(allDocs);
      const formats = {};
      allDocs.forEach((row) => {
        const format = fileFormat(row);
        formats[format.key] = (formats[format.key] || 0) + 1;
      });
      const haystack = normalizeText([
        employeeName(employee), employee.employee_id, employee.department_name,
        employee.job_title_name, ...allDocs.map(documentSearchText),
      ].join(' '));
      if (query && !haystack.includes(query)) return null;
      return {
        employee,
        documents: allDocs,
        groups,
        formats,
        count: allDocs.length,
        lastUpdated: allDocs
          .map((row) => row.created_at || row.updated_at || row.issue_date || '')
          .sort()
          .slice(-1)[0] || '',
      };
    })
    .filter(Boolean)
    .sort((a, b) => String(employeeName(a.employee) || '').localeCompare(String(employeeName(b.employee) || ''), 'fa'));

  return { rows, unassigned };
};

