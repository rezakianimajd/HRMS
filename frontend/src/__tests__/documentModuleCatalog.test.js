import { getModuleIcon, getModuleLandingPath, MODULE_ICONS } from '../core/constants/moduleIcons';
import { MODULE_DEFAULT_ACCENTS } from '../core/context/ModulePaletteContext';
import menuConfig, { buildDocumentsMenu, getMenuForApp } from '../core/config/menuConfig';

test('documents module is registered for selector, switcher and landing route', () => {
  expect(MODULE_ICONS.documents).toBeTruthy();
  expect(getModuleIcon('documents')).toBe(MODULE_ICONS.documents);
  expect(getModuleLandingPath('documents')).toBe('/document-management');
  expect(MODULE_DEFAULT_ACCENTS.documents).toBe('#0f766e');
});

test('DMS library nests module folders and organizational menu lists only company folders', () => {
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
  const organizational = menu.find((group) => group.id === 'documents-organizational');
  const hr = library.items.find((item) => item.id === 'dms-module-20');
  const contracts = library.items.find((item) => item.id === 'dms-module-30');

  expect(hr.title).toBe('منابع انسانی');
  expect(hr.children.map((item) => item.title)).toEqual(['نسخه‌ها', 'پیوست‌ها']);
  expect(contracts.children).toBeUndefined();
  expect(organizational.items.map((item) => item.title)).toEqual(['روزنامه‌های رسمی', 'مدارک هیئت مدیره']);
  expect(organizational.items.some((item) => String(item.path).includes('type='))).toBe(false);
  expect(getMenuForApp('documents', { folders })).toBeTruthy();
});

test('documents has its own complete menu and is not embedded in HRMS menu', () => {
  const documentsMenu = getMenuForApp('documents');
  const documentPaths = documentsMenu.flatMap((group) => group.items.map((item) => item.path));
  expect(documentsMenu.map((group) => group.title)).toEqual(expect.arrayContaining([
    'خانه', 'کتابخانه اسناد', 'اسناد سازمانی', 'گردش‌کار اسناد',
    'پایش و بایگانی', 'ساختار و مدیریت', 'گزارش‌ها و تاریخچه',
  ]));
  expect(documentPaths).toEqual(expect.arrayContaining([
    '/document-management',
    '/document-management/library?scope=all',
    '/document-management/library?workflow=draft',
    '/document-management/library?workflow=in_review',
    '/document-management/library?type=company',
    '/document-management/library?status=archived',
    '/document-management/folders',
    '/document-management/reports',
    '/document-management/activity',
  ]));

  const hrmsPaths = menuConfig.flatMap((group) => group.items.map((item) => item.path));
  expect(hrmsPaths.some((path) => String(path || '').startsWith('/document-management'))).toBe(false);
});
