import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import UserAvatar from '../core/components/ui/UserAvatar';

const renderAvatar = async (user, size = 34) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(<UserAvatar user={user} size={size} />);
  });
  return { container, root };
};

afterEach(() => {
  document.body.innerHTML = '';
});

test('user avatar prefers the linked personnel photo', async () => {
  const { container, root } = await renderAvatar({
    username: 'ali', first_name: 'علی', last_name: 'رضایی',
    employee_photo: 'https://example.test/media/employees/ali.jpg',
    employee_gender: 'male',
  });
  const image = container.querySelector('img');
  expect(image).toBeTruthy();
  expect(image.getAttribute('src')).toBe('https://example.test/media/employees/ali.jpg');
  root.unmount();
});

test('user avatar falls back to a gendered avatar when no photo exists', async () => {
  const male = await renderAvatar({ username: 'ali', employee_gender: 'male' });
  expect(male.container.querySelector('[data-testid="ManOutlinedIcon"]')).toBeTruthy();
  male.root.unmount();

  const female = await renderAvatar({ username: 'sara', employee_gender: 'female' });
  expect(female.container.querySelector('[data-testid="WomanOutlinedIcon"]')).toBeTruthy();
  female.root.unmount();
});

test('user avatar falls back to initials when there is no personnel link', async () => {
  const { container, root } = await renderAvatar({ username: 'sara', first_name: 'سارا', last_name: 'محمدی' });
  expect(container.textContent).toContain('سم');
  expect(container.querySelector('img')).toBeNull();
  expect(container.querySelector('[data-testid="WomanOutlinedIcon"]')).toBeNull();
  root.unmount();
});
