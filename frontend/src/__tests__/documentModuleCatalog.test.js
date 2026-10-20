import { getModuleIcon, getModuleLandingPath, MODULE_ICONS } from '../core/constants/moduleIcons';
import { MODULE_DEFAULT_ACCENTS } from '../core/context/ModulePaletteContext';

test('documents module is registered for selector, switcher and landing route', () => {
  expect(MODULE_ICONS.documents).toBeTruthy();
  expect(getModuleIcon('documents')).toBe(MODULE_ICONS.documents);
  expect(getModuleLandingPath('documents')).toBe('/document-management');
  expect(MODULE_DEFAULT_ACCENTS.documents).toBe('#0f766e');
});
