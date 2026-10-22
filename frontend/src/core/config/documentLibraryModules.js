/**
 * کاتالوگ ماژول‌های کتابخانهٔ اسناد.
 *
 * هم منوی کناربرگ و هم درخت‌وارهٔ صفحه از این فایل استفاده می‌کنند تا
 * محدودهٔ هر ماژول یکسان باشد و پوشه‌های سایر ماژول‌ها نمایش داده نشوند.
 */

const normalize = (value) => String(value ?? '')
  .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
  .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
  .replace(/[يى]/g, 'ی')
  .replace(/ك/g, 'ک')
  .replace(/[^\w\u0600-\u06FF]+/g, '')
  .toLowerCase();

export const DOCUMENT_LIBRARY_MODULES = [
  {
    key: 'hr', label: 'منابع انسانی', color: '#db2777', icon: 'people',
    keywords: ['منابع انسانی', 'hr.employees', 'hrms.recruitment', 'پرسنل', 'جذب و استخدام'],
    children: [
      {
        key: 'employees', label: 'پرسنل', color: '#ec4899', icon: 'person',
        keywords: ['پرسنل', 'employees', 'hr.employees'],
      },
      {
        key: 'recruitment', label: 'جذب و استخدام', color: '#0ea5e9', icon: 'person_search',
        keywords: ['جذب و استخدام', 'recruitment', 'hrms.recruitment'],
      },
    ],
  },
  {
    key: 'contracts', label: 'مدیریت قراردادها', color: '#f59e0b', icon: 'contract',
    keywords: ['قراردادها', 'مدیریت قراردادها', 'contracts', 'hrms.contracts'],
  },
  {
    key: 'projects', label: 'مدیریت پروژه‌ها', color: '#8b5cf6', icon: 'project',
    keywords: ['پروژه‌ها', 'مدیریت پروژه‌ها', 'projects', 'hrms.projects'],
  },
  {
    key: 'pettycash', label: 'تنخواه', color: '#f97316', icon: 'pettycash',
    keywords: ['تنخواه', 'pettycash', 'hrms.pettycash'],
  },
  {
    key: 'payroll', label: 'حقوق و دستمزد', color: '#10b981', icon: 'payroll',
    keywords: ['حقوق و دستمزد', 'payroll', 'hrms.payroll'],
  },
  {
    key: 'accounting', label: 'حسابداری', color: '#3b82f6', icon: 'accounting',
    keywords: ['حسابداری', 'accounting', 'hrms.accounting'],
  },
  {
    key: 'procurement', label: 'خرید و تدارکات', color: '#06b6d4', icon: 'procurement',
    keywords: ['خرید و تدارکات', 'خرید', 'تدارکات', 'procurement', 'purchasing'],
  },
  {
    key: 'treasury', label: 'خزانه‌داری', color: '#0f766e', icon: 'treasury',
    keywords: ['خزانه‌داری', 'خزانه داری', 'خزانه', 'treasury'],
  },
  {
    key: 'organization', label: 'اسناد سازمانی', color: '#2563eb', icon: 'organization',
    keywords: [
      'اسناد سازمانی', 'مدارک شرکت', 'مدارک و مستندات شرکت',
      'company.documents', 'organization_documents', 'organization', 'بایگانی اسناد سازمان',
    ],
  },
  {
    key: 'correspondence', label: 'مکاتبات رسمی', color: '#0ea5e9', icon: 'correspondence',
    keywords: ['مکاتبات رسمی', 'مکاتبات', 'correspondence', 'correspondences'],
  },
];

const moduleChildren = DOCUMENT_LIBRARY_MODULES.flatMap((module) => module.children || []);

export const DOCUMENT_LIBRARY_MODULE_CHILDREN = moduleChildren;

export const findDocumentModule = (key) => (
  DOCUMENT_LIBRARY_MODULES.find((module) => module.key === key)
  || moduleChildren.find((module) => module.key === key)
  || null
);

export const folderSearchText = (folder) => normalize([
  folder?.name, folder?.code, folder?.path,
].filter(Boolean).join(' '));

export const folderMatchesModule = (folder, module) => {
  if (!folder || !module) return false;
  const text = folderSearchText(folder);
  return (module.keywords || []).some((keyword) => text.includes(normalize(keyword)));
};


export const topLevelFolder = (folder, folders = []) => {
  if (!folder) return null;
  let current = folder;
  const visited = new Set();
  while (current?.parent && !visited.has(String(current.id))) {
    visited.add(String(current.id));
    const parent = folders.find((row) => String(row.id) === String(current.parent));
    if (!parent) break;
    current = parent;
  }
  return current;
};

export const moduleRootFolders = (folders = [], moduleKey) => {
  const rows = Array.isArray(folders) ? folders : [];
  const module = findDocumentModule(moduleKey);
  if (!module) return [];
  const candidates = module.children?.length ? [...module.children, module] : [module];
  const matchIndex = (folder) => {
    const index = candidates.findIndex((candidate) => folderMatchesModule(folder, candidate));
    return index === -1 ? candidates.length : index;
  };
  return rows
    .filter((folder) => !folder.parent && matchIndex(folder) < candidates.length)
    .sort((a, b) => matchIndex(a) - matchIndex(b)
      || (Number(a.order) || 0) - (Number(b.order) || 0)
      || String(a.name || '').localeCompare(String(b.name || ''), 'fa'));
};

export const folderDescendants = (folders = [], rootIds = []) => {
  const ids = new Set((rootIds || []).map(String));
  let changed = true;
  while (changed) {
    changed = false;
    (folders || []).forEach((folder) => {
      if (folder.parent && ids.has(String(folder.parent)) && !ids.has(String(folder.id))) {
        ids.add(String(folder.id));
        changed = true;
      }
    });
  }
  return ids;
};

export const moduleFolderIds = (folders = [], moduleKey) => {
  const roots = moduleRootFolders(folders, moduleKey);
  if (!roots.length) return null;
  return folderDescendants(folders, roots.map((folder) => folder.id));
};

export const findModuleForFolder = (folder, folders = []) => {
  if (!folder) return null;
  const root = topLevelFolder(folder, folders);
  if (!root) return null;
  const matchingChild = moduleChildren.find((module) => folderMatchesModule(root, module));
  if (matchingChild) return matchingChild;
  return DOCUMENT_LIBRARY_MODULES.find((module) => folderMatchesModule(root, module)) || null;
};

export const scopedLibraryFolders = (folders = [], { moduleKey = '', folderId = '' } = {}) => {
  const rows = Array.isArray(folders) ? folders : [];
  if (!rows.length) return { folders: [], roots: [], module: null };

  if (moduleKey) {
    const module = findDocumentModule(moduleKey);
    const roots = moduleRootFolders(rows, moduleKey);
    if (roots.length) {
      const ids = folderDescendants(rows, roots.map((folder) => folder.id));
      return {
        folders: rows.filter((folder) => ids.has(String(folder.id))),
        roots,
        module,
      };
    }
    return { folders: [], roots: [], module };
  }

  if (folderId) {
    const selected = rows.find((folder) => String(folder.id) === String(folderId));
    const root = topLevelFolder(selected, rows);
    if (root) {
      const ids = folderDescendants(rows, [root.id]);
      return {
        folders: rows.filter((folder) => ids.has(String(folder.id))),
        roots: [root],
        module: findModuleForFolder(root, rows),
      };
    }
  }

  return {
    folders: rows,
    roots: rows.filter((folder) => !folder.parent),
    module: null,
  };
};

export const documentMatchesModuleText = (row, moduleKey) => {
  const module = findDocumentModule(moduleKey);
  if (!module) return true;
  const text = normalize([
    row?.related_entity_type, row?.source_module_key, row?.folder_path,
    row?.folder_name, row?.owner_department, row?.document_type_display,
    row?.document_type, row?.issuing_authority,
  ].filter(Boolean).join(' '));
  return (module.keywords || []).some((keyword) => text.includes(normalize(keyword)));
};

/**
 * نگاشت slug ماژول برنامه به کلید ماژول کتابخانهٔ اسناد.
 * ماژول «مدیریت اسناد» همهٔ پوشه‌ها را می‌بیند و اسناد سازمانی به
 * پوشهٔ organization نگاشت می‌شود.
 */
export const APPLICATION_LIBRARY_MODULES = {
  hrms: 'hr',
  hr: 'hr',
  contracts: 'contracts',
  contract: 'contracts',
  projects: 'projects',
  project: 'projects',
  accounting: 'accounting',
  payroll: 'payroll',
  pettycash: 'pettycash',
  'petty-cash': 'pettycash',
  procurement: 'procurement',
  treasury: 'treasury',
  documents: 'documents',
  document: 'documents',
  correspondence: 'correspondence',
  settings: 'organization',
};

export const libraryModuleForApplication = (appSlug) => (
  APPLICATION_LIBRARY_MODULES[appSlug] || ''
);

export const libraryModuleLabel = (moduleKey, fallback = '') => (
  findDocumentModule(moduleKey)?.label || fallback || moduleKey || 'کتابخانه'
);
