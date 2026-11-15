/**
 * صفحهٔ «برنامه‌ریزی شخصی» — یادداشت‌ها و وظایف.
 *
 * چیدمان: هدر → تب‌ها → نوار جستجو/فیلتر استاندارد → کارت‌ها؛ افزودن فقط در هدر.
 * همهٔ رنگ/شعاع/سایه از استودیو تم می‌آید و هیچ مقدار hard-code ندارد.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Chip, Stack } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AddIcon from '@mui/icons-material/Add';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import StickyNote2OutlinedIcon from '@mui/icons-material/StickyNote2Outlined';
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined';
import axiosInstance from '../../core/api/axiosConfig';
import PageHeader from '../../core/components/ui/PageHeader';
import { TabsCard } from '../../core/components/settings/settingsUi';
import { toPersianDigits } from '../../core/utils/numberUtils';
import PlanningNotesView from './PlanningNotesView';
import PlanningTasksView from './PlanningTasksView';
import { GroupsDialog, NoteDialog, ShareDialog, TaskDialog } from './PlanningDialogs';
import {
  EMPTY_NOTE, EMPTY_TASK, TASK_PRIORITY_META, TASK_STATUS_META, htmlToText,
  normalizeChecklist, usePlanningTheme,
} from './planningTheme';

const pickRows = (payload) => (Array.isArray(payload) ? payload : payload?.results || []);

const PlanningPanel = ({ initialTab = 0 }) => {
  const theme = usePlanningTheme();
  const qc = useQueryClient();

  const [tab, setTab] = useState(Number(initialTab) || 0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [toast, setToast] = useState(null);

  const [noteForm, setNoteForm] = useState(EMPTY_NOTE);
  const [noteOpen, setNoteOpen] = useState(false);
  const [taskForm, setTaskForm] = useState(EMPTY_TASK);
  const [taskOpen, setTaskOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState(null);
  const [shareUsers, setShareUsers] = useState([]);
  const [sharePermission, setSharePermission] = useState('view');
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [groupForm, setGroupForm] = useState({
    id: null, name: '', color: theme.accent, members: [],
  });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(timer);
  }, [toast]);

  const summaryQuery = useQuery({
    queryKey: ['planning', 'summary'],
    queryFn: () => axiosInstance.get('/planning/summary/').then((response) => response.data),
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
  const summary = summaryQuery.data || {};

  const directoryQuery = useQuery({
    queryKey: ['chat-directory'],
    queryFn: () => axiosInstance.get('/chat/directory/').then((response) => response.data),
    staleTime: 5 * 60 * 1000,
  });
  const directory = useMemo(() => pickRows(directoryQuery.data), [directoryQuery.data]);

  const groupsQuery = useQuery({
    queryKey: ['planning', 'groups'],
    queryFn: () => axiosInstance.get('/planning/groups/').then((response) => response.data),
    staleTime: 60000,
  });
  const groups = useMemo(() => pickRows(groupsQuery.data), [groupsQuery.data]);

  const notify = (text, ok = true) => setToast({ text, ok });
  const onError = (message) => (error) => notify(
    error?.response?.data?.detail || message, false,
  );
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['planning'] });
    qc.invalidateQueries({ queryKey: ['chat-unread'] });
  };

  const saveNote = useMutation({
    mutationFn: () => {
      const body = {
        title: String(noteForm.title || '').trim(),
        body: noteForm.body || '',
        color: noteForm.color || theme.accent,
        tags: noteForm.tags || [],
        checklist: normalizeChecklist(noteForm.checklist),
        is_pinned: Boolean(noteForm.is_pinned),
      };
      return noteForm.id
        ? axiosInstance.patch(`/planning/notes/${noteForm.id}/`, body)
        : axiosInstance.post('/planning/notes/', body);
    },
    onSuccess: () => {
      const editing = Boolean(noteForm.id);
      setNoteOpen(false);
      setNoteForm(EMPTY_NOTE);
      invalidate();
      notify(editing ? 'یادداشت به‌روزرسانی شد' : 'یادداشت ساخته شد');
    },
    onError: onError('ذخیرهٔ یادداشت انجام نشد'),
  });

  const toggleNotePin = useMutation({
    mutationFn: (row) => axiosInstance.patch(`/planning/notes/${row.id}/`, {
      is_pinned: !row.is_pinned,
    }),
    onSuccess: invalidate,
    onError: onError('تغییر سنجاق یادداشت انجام نشد'),
  });

  const removeNote = useMutation({
    mutationFn: (row) => axiosInstance.delete(`/planning/notes/${row.id}/`),
    onSuccess: () => { invalidate(); notify('یادداشت حذف شد'); },
    onError: onError('حذف یادداشت انجام نشد'),
  });

  const saveTask = useMutation({
    mutationFn: () => {
      const body = {
        title: String(taskForm.title || '').trim(),
        description: taskForm.description || '',
        status: taskForm.status,
        priority: taskForm.priority,
        due_date: taskForm.due_date || null,
        due_time: taskForm.due_time || null,
        tags: taskForm.tags || [],
        checklist: normalizeChecklist(taskForm.checklist),
        is_pinned: Boolean(taskForm.is_pinned),
        assignees: taskForm.assignMode === 'people' ? (taskForm.assigneeIds || []) : [],
        groups: taskForm.assignMode === 'group' ? (taskForm.groupIds || []) : [],
      };
      if (taskForm.related_label) body.related_label = taskForm.related_label;
      if (taskForm.related_module) body.related_module = taskForm.related_module;
      return taskForm.id
        ? axiosInstance.patch(`/planning/tasks/${taskForm.id}/`, body)
        : axiosInstance.post('/planning/tasks/', body);
    },
    onSuccess: () => {
      const editing = Boolean(taskForm.id);
      setTaskOpen(false);
      setTaskForm(EMPTY_TASK);
      invalidate();
      notify(editing ? 'وظیفه به‌روزرسانی شد' : 'وظیفه ساخته شد');
    },
    onError: onError('ذخیرهٔ وظیفه انجام نشد'),
  });

  const toggleTask = useMutation({
    mutationFn: (row) => axiosInstance.post(`/planning/tasks/${row.id}/toggle/`),
    onSuccess: invalidate,
    onError: onError('تغییر وضعیت وظیفه انجام نشد'),
  });

  const removeTask = useMutation({
    mutationFn: (row) => axiosInstance.delete(`/planning/tasks/${row.id}/`),
    onSuccess: () => { invalidate(); notify('وظیفه حذف شد'); },
    onError: onError('حذف وظیفه انجام نشد'),
  });

  const shareItem = useMutation({
    mutationFn: () => axiosInstance.post(
      `/planning/${shareTarget?.kind === 'note' ? 'notes' : 'tasks'}/${shareTarget?.row?.id}/share/`,
      { users: shareUsers, permission: sharePermission },
    ),
    onSuccess: () => {
      setShareTarget(null);
      setShareUsers([]);
      invalidate();
      notify('اشتراک‌گذاری انجام شد');
    },
    onError: onError('اشتراک‌گذاری انجام نشد'),
  });

  const unshareItem = useMutation({
    mutationFn: ({ kind, row, userId }) => axiosInstance.delete(
      `/planning/${kind === 'note' ? 'notes' : 'tasks'}/${row.id}/share/${userId}/`,
    ),
    onSuccess: () => {
      setShareTarget(null);
      invalidate();
      notify('دسترسی حذف شد');
    },
    onError: onError('حذف دسترسی انجام نشد'),
  });

  const saveGroup = useMutation({
    mutationFn: () => {
      const body = {
        name: groupForm.name, color: groupForm.color, members: groupForm.members,
      };
      return groupForm.id
        ? axiosInstance.patch(`/planning/groups/${groupForm.id}/`, body)
        : axiosInstance.post('/planning/groups/', body);
    },
    onSuccess: () => {
      const editing = Boolean(groupForm.id);
      setGroupForm({ id: null, name: '', color: theme.accent, members: [] });
      qc.invalidateQueries({ queryKey: ['planning', 'groups'] });
      notify(editing ? 'گروه به‌روزرسانی شد' : 'گروه ساخته شد');
    },
    onError: onError('ذخیرهٔ گروه انجام نشد'),
  });

  const deleteGroup = useMutation({
    mutationFn: (group) => axiosInstance.delete(`/planning/groups/${group.id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planning', 'groups'] });
      notify('گروه حذف شد');
    },
    onError: onError('حذف گروه انجام نشد'),
  });

  const openNoteNew = () => {
    setNoteForm({ ...EMPTY_NOTE, color: theme.accent });
    setNoteOpen(true);
  };
  const openNoteEdit = (row) => {
    setNoteForm({
      id: row.id,
      title: row.title || '',
      body: row.body || '',
      color: row.color || theme.accent,
      tags: Array.isArray(row.tags) ? row.tags : [],
      checklist: normalizeChecklist(row.checklist),
      is_pinned: Boolean(row.is_pinned),
    });
    setNoteOpen(true);
  };
  const openTaskNew = (status = 'todo', seed = {}) => {
    setTaskForm({ ...EMPTY_TASK, status, ...seed });
    setTaskOpen(true);
  };
  const openTaskEdit = (row) => {
    const assigneeIds = (row.assignees || []).map((person) => person.id);
    const groupIds = (row.assignee_groups || []).map((group) => group.id);
    setTaskForm({
      id: row.id,
      title: row.title || '',
      description: row.description || '',
      status: row.status || 'todo',
      priority: row.priority || 'normal',
      due_date: row.due_date || '',
      due_time: row.due_time || '',
      tags: Array.isArray(row.tags) ? row.tags : [],
      checklist: normalizeChecklist(row.checklist),
      is_pinned: Boolean(row.is_pinned),
      related_label: row.related_label || '',
      related_module: row.related_module || '',
      assigneeIds,
      groupIds,
      assignMode: groupIds.length ? 'group' : (assigneeIds.length ? 'people' : 'me'),
    });
    setTaskOpen(true);
  };
  const createTaskFromNote = (note) => openTaskNew('todo', {
    title: note.title || 'وظیفه از یادداشت',
    description: htmlToText(note.body),
    tags: Array.isArray(note.tags) ? note.tags : [],
    checklist: normalizeChecklist(note.checklist),
    related_label: `یادداشت: ${note.title || ''}`.trim(),
  });
  const openShare = (kind, row) => {
    setShareTarget({ kind, row });
    setShareUsers([]);
    setSharePermission('view');
  };
  const openGroupNew = () => {
    setGroupForm({ id: null, name: '', color: theme.accent, members: [] });
    setGroupsOpen(true);
  };
  const openGroupEdit = (group) => {
    setGroupForm({
      id: group.id,
      name: group.name || '',
      color: group.color || theme.accent,
      members: (group.members || []).map((person) => person.id),
    });
    setGroupsOpen(true);
  };
  const confirmDelete = (mutation, row, label) => {
    if (!window.confirm(`${label} «${row.title || row.name || ''}» حذف شود؟`)) return;
    mutation.mutate(row);
  };
  const refreshAll = () => {
    summaryQuery.refetch();
    qc.invalidateQueries({ queryKey: ['planning', 'notes'] });
    qc.invalidateQueries({ queryKey: ['planning', 'tasks'] });
  };

  return (
    <Box sx={{ pb: 1 }}>
      <PageHeader
        icon={<TaskAltOutlinedIcon />}
        title="برنامه‌ریزی شخصی"
        subtitle="یادداشت‌ها و وظایف شما خصوصی هستند؛ فقط با اشتراک‌گذاری صریح برای دیگران دیده می‌شوند."
        badge={(
          <Stack direction="row" spacing={0.6} useFlexGap flexWrap="wrap" alignItems="center">
            <Chip
              size="small"
              label={`${toPersianDigits(summary.notes || 0)} یادداشت`}
              sx={{
                height: 23, fontSize: 10.5, fontWeight: 800,
                bgcolor: alpha(theme.accent, 0.08), color: theme.accent,
              }}
            />
            <Chip
              size="small"
              label={`${toPersianDigits(summary.open_tasks || 0)} وظیفهٔ باز`}
              sx={{
                height: 23, fontSize: 10.5, fontWeight: 800,
                bgcolor: alpha(theme.tones.info, 0.1), color: theme.tones.info,
              }}
            />
            {summary.overdue ? (
              <Chip
                size="small"
                label={`${toPersianDigits(summary.overdue)} معوق`}
                sx={{
                  height: 23, fontSize: 10.5, fontWeight: 800,
                  bgcolor: alpha(theme.tones.danger, 0.1), color: theme.tones.danger,
                }}
              />
            ) : null}
          </Stack>
        )}
        sx={{ mb: 1.5, py: 1 }}
        actions={(
          <>
            <Button size="small" variant="text" startIcon={<RefreshIcon />} onClick={refreshAll}>
              به‌روزرسانی
            </Button>
            <Button size="small" variant="outlined" startIcon={<GroupOutlinedIcon />} onClick={openGroupNew}>
              گروه‌ها
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={<AddIcon />}
              onClick={tab === 0 ? openNoteNew : () => openTaskNew('todo')}
            >
              {tab === 0 ? 'یادداشت جدید' : 'وظیفه جدید'}
            </Button>
          </>
        )}
      />

      {toast ? (
        <Alert
          severity={toast.ok ? 'success' : 'error'}
          onClose={() => setToast(null)}
          sx={{ mb: 1.25, borderRadius: theme.radii.medium, fontSize: 12.5 }}
        >
          {toast.text}
        </Alert>
      ) : null}

      <TabsCard
        dense
        activeColor={theme.accent}
        value={tab}
        onChange={setTab}
        sx={{ mb: 1.5 }}
        tabs={[
          {
            key: 'notes',
            label: 'یادداشت‌ها',
            icon: <StickyNote2OutlinedIcon />,
            badge: toPersianDigits(summary.notes || 0),
          },
          {
            key: 'tasks',
            label: 'وظایف',
            icon: <TaskAltOutlinedIcon />,
            badge: toPersianDigits(summary.open_tasks || 0),
          },
        ]}
      />

      {tab === 0 ? (
        <PlanningNotesView
          theme={theme}
          search={search}
          apiSearch={debouncedSearch}
          onSearch={setSearch}
          onCreate={openNoteNew}
          onEdit={openNoteEdit}
          onShare={(row) => openShare('note', row)}
          onDelete={(row) => confirmDelete(removeNote, row, 'یادداشت')}
          onTogglePin={(row) => toggleNotePin.mutate(row)}
          onCreateTask={createTaskFromNote}
        />
      ) : (
        <PlanningTasksView
          theme={theme}
          search={search}
          apiSearch={debouncedSearch}
          onSearch={setSearch}
          onCreate={(status) => openTaskNew(status || 'todo')}
          onEdit={openTaskEdit}
          onShare={(row) => openShare('task', row)}
          onDelete={(row) => confirmDelete(removeTask, row, 'وظیفه')}
          onToggle={(row) => toggleTask.mutate(row)}
        />
      )}

      <NoteDialog
        open={noteOpen}
        form={noteForm}
        setForm={setNoteForm}
        onClose={() => setNoteOpen(false)}
        onSave={() => saveNote.mutate()}
        saving={saveNote.isPending}
        theme={theme}
      />

      <TaskDialog
        open={taskOpen}
        form={taskForm}
        setForm={setTaskForm}
        onClose={() => setTaskOpen(false)}
        onSave={() => saveTask.mutate()}
        saving={saveTask.isPending}
        theme={theme}
        directory={directory}
        groups={groups}
        onCreateGroup={openGroupNew}
      />

      <ShareDialog
        open={Boolean(shareTarget)}
        target={shareTarget}
        theme={theme}
        directory={directory}
        selected={shareUsers}
        onSelectedChange={setShareUsers}
        permission={sharePermission}
        onPermissionChange={setSharePermission}
        onShare={() => shareItem.mutate()}
        onUnshare={(userId) => unshareItem.mutate({
          kind: shareTarget?.kind, row: shareTarget?.row, userId,
        })}
        saving={shareItem.isPending}
        onClose={() => setShareTarget(null)}
      />

      <GroupsDialog
        open={groupsOpen}
        onClose={() => setGroupsOpen(false)}
        theme={theme}
        groups={groups}
        directory={directory}
        form={groupForm}
        setForm={setGroupForm}
        onSave={() => saveGroup.mutate()}
        onDelete={(group) => confirmDelete(deleteGroup, group, 'گروه')}
        onEdit={openGroupEdit}
        saving={saveGroup.isPending}
      />
    </Box>
  );
};

/** صفحهٔ کامل برنامه‌ریزی (مسیر `/planning`). */
const PlanningPage = () => <PlanningPanel />;

export { PlanningPanel, TASK_PRIORITY_META, TASK_STATUS_META };
export default PlanningPage;
