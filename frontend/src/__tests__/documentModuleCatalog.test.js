import { getModuleIcon, getModuleLandingPath, MODULE_ICONS } from '../core/constants/moduleIcons';
import { MODULE_DEFAULT_ACCENTS } from '../core/context/ModulePaletteContext';
import menuConfig, { buildDocumentsMenu, getMenuForApp } from '../core/config/menuConfig';
import { libraryModuleForApplication, libraryModuleLabel, moduleRootFolders, scopedLibraryFolders } from '../core/config/documentLibraryModules';

test('documents module is registered for selector, switcher and landing route', () => {
  expect(MODULE_ICONS.documents).toBeTruthy();
  expect(getModuleIcon('documents')).toBe(MODULE_ICONS.documents);
  expect(getModuleLandingPath('documents')).toBe('/document-management');
  expect(MODULE_DEFAULT_ACCENTS.documents).toBe('#0f766e');
});

test('DMS library exposes the requested module catalogue and organization submenu', () => {
  const folders = [
    { id: 10, name: 'مدارک و مستندات شرکت', parent: null, code: 'company.documents', order: 0, color: '#0f172a' },
    { id: 11, name: 'روزنامه‌های رسمی', parent: 10, code: 'company.documents.1', order: 1 },
    { id: 12, name: 'مدارک هیئت مدیره', parent: 10, code: 'company.documents.2', order: 2 },
    { id: 20, name: 'منابع انسانی', parent: null, code: 'hr.employees', order: 2, color: '#ec4899' },
    { id: 21, name: 'نسخه‌ها', parent: 20, code: 'hr.employees.sub.1', order: 1 },
    { id: 22, name: 'پیوست‌ها', parent: 20, code: 'hr.employees.sub.2', order: 2 },
    { id: 30, name: 'قراردادها', parent: null, code: 'contracts', order: 3, color: '#f59e0b' },
  ];

  const menu = buildDocumentsMenu(folders);
  const library = menu.find((group) => group.id === 'documents-library');
  const organizationalGroup = menu.find((group) => group.id === 'documents-organizational');
  const hr = library.items.find((item) => item.id === 'dms-library-hr');
  const contracts = library.items.find((item) => item.id === 'dms-library-contracts');
  const organizational = library.items.find((item) => item.id === 'dms-library-organization');

  expect(library.items.map((item) => item.title)).toEqual([
    'منابع انسانی', 'مدیریت قراردادها', 'مدیریت پروژه‌ها', 'تنخواه',
    'حقوق و دستمزد', 'حسابداری', 'خرید و تدارکات', 'خزانه‌داری',
    'اسناد سازمانی', 'مکاتبات رسمی',
  ]);
  expect(hr.children.map((item) => item.title)).toEqual(['پرسنل', 'جذب و استخدام']);
  expect(hr.children.find((item) => item.id === 'dms-library-employees').path).toContain('folder=20');
  expect(hr.path).toContain('module=hr');
  expect(contracts.children).toBeUndefined();
  expect(contracts.path).toContain('folder=30');
  expect(organizational.children.map((item) => item.title)).toEqual(['روزنامه‌های رسمی', 'مدارک هیئت مدیره']);
  expect(organizational.path).toContain('folder=10');
  expect(organizationalGroup).toBeUndefined();
  expect(getMenuForApp('documents', { folders })).toBeTruthy();
});

test('library folder scope only includes the selected module tree', () => {
  const folders = [
    { id: 10, name: 'مدارک و مستندات شرکت', parent: null, code: 'company.documents' },
    { id: 11, name: 'روزنامه‌های رسمی', parent: 10 },
    { id: 20, name: 'منابع انسانی', parent: null, code: 'hr.employees' },
    { id: 21, name: 'نسخه‌ها', parent: 20 },
    { id: 30, name: 'قراردادها', parent: null, code: 'contracts' },
    { id: 50, name: 'جذب و استخدام', parent: null, code: 'hrms.recruitment' },
  ];
  expect(moduleRootFolders(folders, 'hr').map((folder) => folder.id)).toEqual([20, 50]);
  expect([...scopedLibraryFolders(folders, { moduleKey: 'hr' }).folders].map((folder) => folder.id).sort()).toEqual([20, 21, 50]);
  expect([...scopedLibraryFolders(folders, { folderId: 21 }).folders].map((folder) => folder.id).sort()).toEqual([20, 21]);
  expect([...scopedLibraryFolders(folders, { moduleKey: 'contracts' }).folders].map((folder) => folder.id)).toEqual([30]);
});

test('each application gets its own document library module', () => {
  expect(libraryModuleForApplication('hrms')).toBe('hr');
  expect(libraryModuleForApplication('hr')).toBe('hr');
  expect(libraryModuleForApplication('contracts')).toBe('contracts');
  expect(libraryModuleForApplication('accounting')).toBe('accounting');
  expect(libraryModuleForApplication('projects')).toBe('projects');
  expect(libraryModuleForApplication('documents')).toBe('documents');
  expect(libraryModuleForApplication('settings')).toBe('organization');
  expect(libraryModuleForApplication('unknown')).toBe('');
  expect(libraryModuleLabel('contracts')).toBe('مدیریت قراردادها');
});

test('documents has its own complete menu and is not embedded in HRMS menu', () => {
  const documentsMenu = getMenuForApp('documents');
  const documentPaths = documentsMenu.flatMap((group) => group.items.map((item) => item.path));
  expect(documentsMenu.map((group) => group.title)).toEqual(expect.arrayContaining([
    'خانه', 'نمای کلی', 'کتابخانه اسناد', 'گردش‌کار اسناد',
    'پایش و بایگانی', 'ساختار و مدیریت', 'گزارش‌ها و تاریخچه',
  ]));
  expect(documentPaths).toEqual(expect.arrayContaining([
    '/document-management',
    '/document-management/library?scope=all',
    '/document-management/library?workflow=draft',
    '/document-management/library?workflow=in_review',
    '/document-management/library?module=hr',
    '/document-management/library?module=organization',
    '/document-management/library?status=archived',
    '/document-management/folders',
    '/document-management/reports',
    '/document-management/activity',
  ]));

  const hrmsPaths = menuConfig.flatMap((group) => group.items.map((item) => item.path));
  expect(hrmsPaths.some((path) => String(path || '').startsWith('/document-management'))).toBe(false);
});
