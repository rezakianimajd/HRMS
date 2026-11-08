import React, { useContext } from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { AuthContext, AuthProvider } from '../core/context/AuthContext';
import AuthEngine from '../core/engines/authEngine';

jest.mock('../core/engines/authEngine', () => ({
  __esModule: true,
  default: {
    isAuthenticated: jest.fn(() => true),
    isTokenExpired: jest.fn(() => false),
    getStoredUser: jest.fn(() => ({ id: 8, fine_permissions: {} })),
    getCurrentUser: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
  },
}));

const wait = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));

const DELETE_CODE = 'correspondence.incoming.delete';

const Probe = () => {
  const { user } = useContext(AuthContext);
  const granted = Boolean(user?.fine_permissions?.[DELETE_CODE]);
  return <div data-testid="state">{granted ? 'has-delete' : 'no-delete'}</div>;
};

const render = async () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await wait(220);
  });
  return { container, root };
};

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  // نکته: CRA گزینهٔ resetMocks را فعال می‌کند؛ پیاده‌سازی‌ها باید هر تست ست شوند
  AuthEngine.isAuthenticated.mockReturnValue(true);
  AuthEngine.isTokenExpired.mockReturnValue(false);
  AuthEngine.getStoredUser.mockReturnValue({ id: 8, fine_permissions: {} });
  AuthEngine.getCurrentUser.mockReset();
  AuthEngine.getCurrentUser.mockResolvedValue({ id: 8, fine_permissions: {} });
  AuthEngine.logout.mockResolvedValue(undefined);
});

test('granted permissions appear after the window regains focus (no re-login)', async () => {
  const { container, root } = await render();

  expect(container.querySelector('[data-testid="state"]').textContent).toBe('no-delete');

  // مدیر در «مجوزهای کاربران» دسترسی حذف را می‌دهد
  AuthEngine.getCurrentUser.mockResolvedValue({
    id: 8,
    fine_permissions: { [DELETE_CODE]: true },
  });

  await act(async () => {
    window.dispatchEvent(new Event('focus'));
    await wait(220);
  });

  expect(container.querySelector('[data-testid="state"]').textContent).toBe('has-delete');

  root.unmount();
  container.remove();
});

test('refreshUser is exposed for manual refresh (e.g. after saving permissions)', async () => {
  let context = null;
  const Captured = () => {
    context = useContext(AuthContext);
    return null;
  };
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(<AuthProvider><Captured /></AuthProvider>);
    await wait(200);
  });

  expect(typeof context.refreshUser).toBe('function');

  AuthEngine.getCurrentUser.mockResolvedValue({
    id: 8,
    fine_permissions: { [DELETE_CODE]: true },
  });
  await act(async () => {
    await context.refreshUser();
    await wait(120);
  });

  expect(AuthEngine.getCurrentUser).toHaveBeenCalled();
  expect(context.user.fine_permissions[DELETE_CODE]).toBe(true);

  root.unmount();
  container.remove();
});
