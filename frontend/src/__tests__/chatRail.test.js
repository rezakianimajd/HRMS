/**
 * تست فیلتر فهرست گفتگوها (خالص): تب وضعیت + فیلتر نوع + شمارش نخوانده/سنجاق.
 */
import { filterConversations } from '../pages/chat/ChatConversationRail';

const rows = [
  { id: 1, kind: 'direct', unread_count: 2, membership: { is_pinned: false } },
  { id: 2, kind: 'group', unread_count: 0, membership: { is_pinned: true } },
  { id: 3, kind: 'channel', unread_count: 0, membership: null },
  { id: 4, kind: 'group', unread_count: 5, membership: { is_pinned: true } },
];

const ids = (list) => list.map((row) => row.id);

test('all tab keeps every conversation of the requested kind', () => {
  expect(ids(filterConversations(rows))).toEqual([1, 2, 3, 4]);
  expect(ids(filterConversations(rows, { kind: 'group' }))).toEqual([2, 4]);
  expect(ids(filterConversations(rows, { kind: 'channel' }))).toEqual([3]);
});

test('unread tab only keeps conversations with unseen messages', () => {
  expect(ids(filterConversations(rows, { tab: 'unread' }))).toEqual([1, 4]);
  expect(ids(filterConversations(rows, { tab: 'unread', kind: 'group' }))).toEqual([4]);
});

test('pinned tab only keeps my pinned conversations', () => {
  expect(ids(filterConversations(rows, { tab: 'pinned' }))).toEqual([2, 4]);
  expect(ids(filterConversations(rows, { tab: 'pinned', kind: 'direct' }))).toEqual([]);
});

test('empty or invalid payloads never break the rail', () => {
  expect(filterConversations(null)).toEqual([]);
  expect(filterConversations([], { tab: 'unread' })).toEqual([]);
});
