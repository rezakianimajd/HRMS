import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';

import LetterTimeline from '../pages/correspondence/letterTimeline';

const referral = {
  id: 11,
  seq: 1,
  status: 'pending',
  purpose: 'action',
  referred_on: '2026-01-01',
  from_user: 7,
  from_user_name: 'رضا کیانی',
  target_label: 'واحد مالی',
  instruction: 'بررسی شود',
};

test('letter timeline shows edit/delete actions only for a manageable referral', async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const onEdit = jest.fn();
  const onDelete = jest.fn();
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <LetterTimeline
        letter={{ referrals: [referral], events: [], replies: [] }}
        canManageReferral={() => true}
        onEditReferral={onEdit}
        onDeleteReferral={onDelete}
      />,
    );
  });

  const buttons = Array.from(container.querySelectorAll('button'));
  const edit = buttons.find((button) => button.textContent.includes('ویرایش ارجاع'));
  const remove = buttons.find((button) => button.textContent.includes('حذف ارجاع'));
  expect(edit).toBeTruthy();
  expect(remove).toBeTruthy();

  await act(async () => { edit.click(); });
  await act(async () => { remove.click(); });
  expect(onEdit).toHaveBeenCalledWith(referral);
  expect(onDelete).toHaveBeenCalledWith(referral);

  await act(async () => { root.unmount(); });
  container.remove();
});
