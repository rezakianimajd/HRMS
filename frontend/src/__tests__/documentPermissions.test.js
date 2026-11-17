import {
  hasOrganizationDocumentsPermission, ORGANIZATION_DOCUMENTS_PERMISSION,
  ORGANIZATION_DOCUMENTS_PATH,
} from '../core/utils/documentPermissions';
import { getMenuForApp } from '../core/config/menuConfig';

const user = (overrides = {}) => ({
  is_superuser: false,
  is_full_access: false,
  fine_permissions: {},
  permissions: {},
  ...overrides,
});

test('organization documents permission requires the explicit menu view code', () => {
  expect(hasOrganizationDocumentsPermission(user())).toBe(false);
  expect(hasOrganizationDocumentsPermission(user({
    fine_permissions: { [ORGANIZATION_DOCUMENTS_PERMISSION]: true },
  }))).toBe(true);
});

test('other documents permissions do not open organization documents', () => {
  expect(hasOrganizationDocumentsPermission(user({
    fine_permissions: {
      'documents.all.view': true,
      'documents.confidential.view': true,
    },
  }))).toBe(false);
});

test('superuser, full access and legacy managers can open organization documents', () => {
  expect(hasOrganizationDocumentsPermission(user({ is_superuser: true }))).toBe(true);
  expect(hasOrganizationDocumentsPermission(user({ is_full_access: true }))).toBe(true);
  expect(hasOrganizationDocumentsPermission(user({
    permissions: { can_manage_documents: true },
  }))).toBe(true);
});

test('documents menu exposes the organization documents permission item', () => {
  const groups = getMenuForApp('documents', { folders: [], permissions: {} });
  const items = groups.flatMap((group) => group.items || []);
  const item = items.find((row) => row.id === 'documents-organization');
  expect(item).toBeTruthy();
  expect(item.path).toBe(ORGANIZATION_DOCUMENTS_PATH);
});
