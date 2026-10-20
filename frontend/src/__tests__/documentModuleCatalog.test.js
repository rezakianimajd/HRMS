import { getModuleIcon, getModuleLandingPath, MODULE_ICONS } from '../core/constants/moduleIcons';
import { MODULE_DEFAULT_ACCENTS } from '../core/context/ModulePaletteContext';
import menuConfig, { getMenuForApp } from '../core/config/menuConfig';

test('documents module is registered for selector, switcher and landing route', () => {
  expect(MODULE_ICONS.documents).toBeTruthy();
  expect(getModuleIcon('documents')).toBe(MODULE_ICONS.documents);
  expect(getModuleLandingPath('documents')).toBe('/document-management');
  expect(MODULE_DEFAULT_ACCENTS.documents).toBe('#0f766e');
});

test('documents has its own complete menu and is not embedded in HRMS menu', () => {
  const documentsMenu = getMenuForApp('documents');
  const documentPaths = documentsMenu.flatMap((group) => group.items.map((item) => item.path));
  expect(documentsMenu.map((group) => group.title)).toEqual(expect.arrayContaining([
    'خانه', 'کتابخانه اسناد', 'پایش و بایگانی', 'گزارش‌ها و تاریخچه',
  ]));
  expect(documentPaths).toEqual(expect.arrayContaining([
    '/document-management',
    '/document-management?scope=all',
    '/document-management?status=draft',
    '/document-management?status=archived',
    '/document-management/reports',
    '/document-management/activity',
  ]));

  const hrmsPaths = menuConfig.flatMap((group) => group.items.map((item) => item.path));
  expect(hrmsPaths.some((path) => String(path || '').startsWith('/document-management'))).toBe(false);
});
