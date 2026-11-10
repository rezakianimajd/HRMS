import React, { useMemo, useState } from 'react';
import {
  Alert, Avatar, Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, IconButton, InputAdornment, MenuItem, Select,
  Stack, Tab, Tabs, TextField, Tooltip, Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import SearchIcon from '@mui/icons-material/Search';
import ShareOutlinedIcon from '@mui/icons-material/ShareOutlined';
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined';
import StickyNote2OutlinedIcon from '@mui/icons-material/StickyNote2Outlined';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import axiosInstance from '../../core/api/axiosConfig';
import JalaliMaskedDateInput from '../../core/components/ui/JalaliMaskedDateInput';
import { useModulePalette } from '../../core/context/ModulePaletteContext';
import useAuth from '../../core/hooks/useAuth';
import { toJalali } from '../../core/utils/dateUtils';
import { toPersianDigits } from '../../core/utils/numberUtils';

const FALLBACK = '#6366f1';
const INK = '#0f172a';
const MUTED = '#64748b';

export const NOTE_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#64748b'];

export const TASK_STATUS_META = {
  todo: { label: 'انجام‌نشده', color: '#64748b' },
  doing: { label: 'در حال انجام', color: '#0ea5e9' },
  done: { label: 'انجام‌شده', color: '#10b981' },
  cancelled: { label: 'لغو‌شده', color: '#be123c' },
};

export const TASK_PRIORITY_META = {
  low: { label: 'کم', color: '#64748b' },
  normal: { label: 'معمولی', color: '#0ea5e9' },
  high: { label: 'زیاد', color: '#f59e0b' },
  urgent: { label: 'فوری', color: '#be123c' },
};

const EMPTY_NOTE = { id: null, title: '', body: '', color: FALLBACK, tags: '', is_pinned: false };
const EMPTY_TASK = {
  id: null, title: '', description: '', status: 'todo', priority: 'normal',
  due_date: '', due_time: '', is_pinned: false,
  assigneeIds: [], groupIds: [], assignMode: 'me',
};

const tagsOf = (value) => String(value || '')
  .split(',')
  .map((tag) => tag.trim())
  .filter(Boolean);

const dueLabel = (value) => {
  if (!value) return '';
  const iso = String(value).slice(0, 10);
  return toJalali(iso);
};

const PlanningPanel = ({ initialTab = 0 }) => {
  const { getPalette } = useModulePalette();
  const { user } = useAuth();
  const qc = useQueryClient();
  const accent = getPalette('planning')?.accent || getPalette('chat')?.accent || FALLBACK;

  const [tab, setTab] = useState(Number(initialTab) || 0);
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState('mine');
  const [taskFilter, setTaskFilter] = useState('open');
  const [toast, setToast] = useState('');
  const [noteForm, setNoteForm] = useState(EMPTY_NOTE);
  const [noteOpen, setNoteOpen] = useState(false);
  const [taskForm, setTaskForm] = useState(EMPTY_TASK);
  const [taskOpen, setTaskOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState(null);
  const [shareUsers, setShareUsers] = useState([]);
  const [sharePermission, setSharePermission] = useState('view');
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [groupForm, setGroupForm] = useState({ id: null, name: '', color: '#6366f1', members: [] });

  const summaryQuery = useQuery({
    queryKey: ['planning-summary'],
    queryFn: () => axiosInstance.get('/planning/summary/').then((response) => response.data),
  });
  const summary = summaryQuery.data || {};

  const notesQuery = useQuery({
    queryKey: ['planning-notes', search, scope],
    queryFn: () => axiosInstance.get('/planning/notes/', {
      params: { page_size: 200, q: search || undefined, scope: scope === 'all' ? undefined : scope },
    }).then((response) => response.data),
  });
  const notes = useMemo(() => {
    const payload = notesQuery.data;
    return Array.isArray(payload) ? payload : payload?.results || [];
  }, [notesQuery.data]);

  const tasksQuery = useQuery({
    queryKey: ['planning-tasks', search, scope, taskFilter],
    queryFn: () => axiosInstance.get('/planning/tasks/', {
      params: {
        page_size: 300,
        q: search || undefined,
        scope: scope === 'all' ? undefined : scope,
        open: taskFilter === 'open' ? 1 : undefined,
        due: taskFilter === 'due' ? 1 : undefined,
        status: ['todo', 'doing', 'done', 'cancelled'].includes(taskFilter) ? taskFilter : undefined,
      },
    }).then((response) => response.data),
  });
  const tasks = useMemo(() => {
    const payload = tasksQuery.data;
    return Array.isArray(payload) ? payload : payload?.results || [];
  }, [tasksQuery.data]);

  const directoryQuery = useQuery({
    queryKey: ['chat-directory'],
    queryFn: () => axiosInstance.get('/chat/directory/').then((response) => response.data),
    staleTime: 5 * 60 * 1000,
  });
  const directory = useMemo(
    () => (Array.isArray(directoryQuery.data) ? directoryQuery.data : []),
    [directoryQuery.data],
  );

  const groupsQuery = useQuery({
    queryKey: ['planning-groups'],
    queryFn: () => axiosInstance.get('/planning/groups/').then((response) => response.data),
  });
  const groups = useMemo(() => {
    const payload = groupsQuery.data;
    return Array.isArray(payload) ? payload : payload?.results || [];
  }, [groupsQuery.data]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['planning-notes'] });
    qc.invalidateQueries({ queryKey: ['planning-tasks'] });
    qc.invalidateQueries({ queryKey: ['planning-summary'] });
    qc.invalidateQueries({ queryKey: ['chat-unread'] });
  };

  const saveNote = useMutation({
    mutationFn: () => {
      const body = {
        title: noteForm.title,
        body: noteForm.body,
        color: noteForm.color,
        tags: tagsOf(noteForm.tags),
        is_pinned: Boolean(noteForm.is_pinned),
      };
      return noteForm.id
        ? axiosInstance.patch(`/planning/notes/${noteForm.id}/`, body)
        : axiosInstance.post('/planning/notes/', body);
    },
    onSuccess: () => { setNoteOpen(false); setNoteForm(EMPTY_NOTE); invalidate(); },
    onError: () => setToast('ذخیرهٔ یادداشت انجام نشد'),
  });

  const removeNote = useMutation({
    mutationFn: (row) => axiosInstance.delete(`/planning/notes/${row.id}/`),
    onSuccess: invalidate,
    onError: () => setToast('حذف یادداشت انجام نشد'),
  });

  const saveTask = useMutation({
    mutationFn: () => {
      const body = {
        title: taskForm.title,
        description: taskForm.description,
        status: taskForm.status,
        priority: taskForm.priority,
        due_date: taskForm.due_date || null,
        due_time: taskForm.due_time || null,
        is_pinned: Boolean(taskForm.is_pinned),
        assignees: taskForm.assignMode === 'people' ? taskForm.assigneeIds : [],
        groups: taskForm.assignMode === 'group' ? taskForm.groupIds : [],
      };
      return taskForm.id
        ? axiosInstance.patch(`/planning/tasks/${taskForm.id}/`, body)
        : axiosInstance.post('/planning/tasks/', body);
    },
    onSuccess: () => { setTaskOpen(false); setTaskForm(EMPTY_TASK); invalidate(); },
    onError: () => setToast('ذخیرهٔ وظیفه انجام نشد'),
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
      setGroupsOpen(false);
      setGroupForm({ id: null, name: '', color: '#6366f1', members: [] });
      qc.invalidateQueries({ queryKey: ['planning-groups'] });
      setToast('گروه ذخیره شد');
    },
    onError: () => setToast('ذخیرهٔ گروه انجام نشد'),
  });

  const toggleTask = useMutation({
    mutationFn: (row) => axiosInstance.post(`/planning/tasks/${row.id}/toggle/`),
    onSuccess: invalidate,
    onError: () => setToast('تغییر وضعیت وظیفه انجام نشد'),
  });

  const removeTask = useMutation({
    mutationFn: (row) => axiosInstance.delete(`/planning/tasks/${row.id}/`),
    onSuccess: invalidate,
    onError: () => setToast('حذف وظیفه انجام نشد'),
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
      setToast('اشتراک‌گذاری انجام شد');
    },
    onError: () => setToast('اشتراک‌گذاری انجام نشد'),
  });


  const chipTone = {
    height: 20, fontSize: 10, fontWeight: 800,
    bgcolor: alpha(accent, 0.1), color: accent,
  };
  const openNoteNew = () => { setNoteForm({ ...EMPTY_NOTE, color: accent }); setNoteOpen(true); };
  const openNoteEdit = (row) => {
    setNoteForm({
      id: row.id, title: row.title || '', body: row.body || '',
      color: row.color || accent, tags: (row.tags || []).join('، '), is_pinned: row.is_pinned,
    });
    setNoteOpen(true);
  };
  const openTaskNew = () => { setTaskForm(EMPTY_TASK); setTaskOpen(true); };
  const openTaskEdit = (row) => {
    const assigneeIds = (row.assignees || []).map((person) => person.id);
    const groupIds = (row.assignee_groups || []).map((group) => group.id);
    setTaskForm({
      id: row.id, title: row.title || '', description: row.description || '',
      status: row.status || 'todo', priority: row.priority || 'normal',
      due_date: row.due_date || '', due_time: row.due_time || '', is_pinned: row.is_pinned,
      assigneeIds,
      groupIds,
      assignMode: groupIds.length ? 'group' : (assigneeIds.length ? 'people' : 'me'),
    });
    setTaskOpen(true);
  };
  const openGroupNew = () => {
    setGroupForm({ id: null, name: '', color: accent, members: [] });
    setGroupsOpen(true);
  };

  return (
    <Box sx={{ pb: 1 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems="center"
        sx={{ mb: 1.25 }}>
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ flex: 1 }}>
          <Avatar sx={{ width: 38, height: 38, bgcolor: alpha(accent, 0.14), color: accent }}>
            <TaskAltOutlinedIcon sx={{ fontSize: 20 }} />
          </Avatar>
          <Box>
            <Typography sx={{ fontSize: 14, fontWeight: 900, color: INK }}>
              برنامه‌ریزی شخصی
            </Typography>
            <Typography sx={{ fontSize: 10.5, color: MUTED }}>
              یادداشت‌ها و وظایف شما خصوصی هستند؛ فقط با «اشتراک‌گذاری» صریح برای دیگران دیده می‌شوند.
            </Typography>
          </Box>
        </Stack>
        <TextField
          size="small" placeholder="جست‌وجو در عنوان/برچسب…" value={search}
          onChange={(event) => setSearch(event.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16 }} /></InputAdornment>
            ),
          }}
          sx={{ minWidth: 220, '& .MuiInputBase-input': { fontSize: 11.5 } }}
        />
        <Select size="small" value={scope} onChange={(event) => setScope(event.target.value)}
          sx={{ fontSize: 11, height: 34, minWidth: 150 }}>
          <MenuItem value="mine">فقط من</MenuItem>
          <MenuItem value="shared">اشتراکی با من</MenuItem>
          <MenuItem value="all">همه (من + اشتراکی)</MenuItem>
        </Select>
        <Button
          variant="contained" size="small" startIcon={<AddIcon />}
          onClick={tab === 0 ? openNoteNew : openTaskNew}
          sx={{ bgcolor: accent, '&:hover': { bgcolor: accent }, fontSize: 11.5 }}
        >
          {tab === 0 ? 'یادداشت جدید' : 'وظیفه جدید'}
        </Button>
        {tab === 1 ? (
          <Select
            size="small" value={taskFilter}
            onChange={(event) => setTaskFilter(event.target.value)}
            sx={{ fontSize: 11, height: 34, minWidth: 140 }}
          >
            <MenuItem value="open">وظایف باز</MenuItem>
            <MenuItem value="due">سررسیدشده</MenuItem>
            <MenuItem value="todo">انجام‌نشده</MenuItem>
            <MenuItem value="doing">در حال انجام</MenuItem>
            <MenuItem value="done">انجام‌شده</MenuItem>
            <MenuItem value="cancelled">لغو‌شده</MenuItem>
          </Select>
        ) : null}
        {tab === 1 ? (
          <Button
            size="small" variant="outlined" startIcon={<GroupOutlinedIcon fontSize="small" />}
            onClick={openGroupNew} sx={{ fontSize: 11.5 }}
          >
            گروه‌ها
          </Button>
        ) : null}
      </Stack>

      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 1.25 }}>
        {[
          ['یادداشت‌ها', summary.notes],
          ['وظایف باز', summary.open_tasks],
          ['سررسید امروز', summary.due_today],
          ['سررسید گذشته', summary.overdue],
        ].map(([label, value]) => (
          <Box key={label} sx={{
            px: 1.5, py: 0.85, borderRadius: 'var(--hrms-radius, 12px)',
            border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper',
            minWidth: 120,
          }}>
            <Typography sx={{ fontSize: 10, color: MUTED }}>{label}</Typography>
            <Typography sx={{ fontSize: 16, fontWeight: 900, color: INK }}>
              {toPersianDigits(value || 0)}
            </Typography>
          </Box>
        ))}
      </Stack>

      <Tabs value={tab} onChange={(_event, value) => setTab(value)}
        sx={{
          mb: 1.25, minHeight: 34,
          '& .MuiTab-root': { minHeight: 34, fontSize: 11.5, fontWeight: 800 },
        }}>
        <Tab icon={<StickyNote2OutlinedIcon sx={{ fontSize: 16 }} />} iconPosition="start"
          label="یادداشت‌ها" />
        <Tab icon={<TaskAltOutlinedIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="وظایف" />
      </Tabs>

      {toast ? (
        <Alert severity="info" onClose={() => setToast('')} sx={{ mb: 1 }}>{toast}</Alert>
      ) : null}


      {tab === 0 ? (
        notesQuery.isLoading ? (
          <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress size={22} /></Box>
        ) : notes.length ? (
          <Box sx={{
            display: 'grid', gap: 1.25,
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(3, 1fr)' },
          }}>
            {notes.map((note) => (
              <Box key={note.id} sx={{
                p: 1.4, borderRadius: 'var(--hrms-radius-large, 16px)',
                border: '1px solid', borderColor: alpha(note.color || accent, 0.28),
                bgcolor: alpha(note.color || accent, 0.06),
                display: 'flex', flexDirection: 'column', minHeight: 130,
              }}>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 900, color: INK, flex: 1 }}>
                    {note.title}
                  </Typography>
                  {note.is_pinned ? <PushPinOutlinedIcon sx={{ fontSize: 14, color: accent }} /> : null}
                </Stack>
                <Typography sx={{
                  fontSize: 11.5, color: 'text.secondary', whiteSpace: 'pre-wrap',
                  mt: 0.5, flex: 1, overflow: 'hidden',
                }}>
                  {note.body || '—'}
                </Typography>
                <Stack direction="row" spacing={0.4} useFlexGap flexWrap="wrap" sx={{ mt: 0.75 }}>
                  {(note.tags || []).slice(0, 4).map((tag) => (
                    <Chip key={tag} size="small" label={tag} sx={chipTone} />
                  ))}
                  {note.is_shared ? <Chip size="small" label="اشتراکی" sx={chipTone} /> : null}
                  {!note.is_mine ? (
                    <Chip size="small" label={note.owner_name || 'همکار'}
                      sx={{ height: 20, fontSize: 10, fontWeight: 800 }} />
                  ) : null}
                </Stack>
                <Stack direction="row" spacing={0.25} sx={{ mt: 0.5 }}>
                  <Tooltip title="ویرایش">
                    <IconButton size="small" aria-label="ویرایش یادداشت" onClick={() => openNoteEdit(note)}>
                      <EditOutlinedIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="اشتراک‌گذاری">
                    <IconButton size="small" aria-label="اشتراک‌گذاری یادداشت"
                      onClick={() => { setShareTarget({ kind: 'note', row: note }); setShareUsers([]); }}>
                      <ShareOutlinedIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                  </Tooltip>
                  <Box sx={{ flex: 1 }} />
                  {note.is_mine ? (
                    <Tooltip title="حذف">
                      <IconButton size="small" aria-label="حذف یادداشت" color="error"
                        onClick={() => removeNote.mutate(note)}>
                        <DeleteOutlineIcon sx={{ fontSize: 15 }} />
                      </IconButton>
                    </Tooltip>
                  ) : null}
                </Stack>
              </Box>
            ))}
          </Box>
        ) : (
          <Alert severity="info">یادداشتی یافت نشد؛ اولین یادداشت را بسازید.</Alert>
        )
      ) : null}


      {tab === 1 ? (
        tasksQuery.isLoading ? (
          <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress size={22} /></Box>
        ) : tasks.length ? (
          <Stack spacing={0.75}>
            {tasks.map((task) => {
              const statusMeta = TASK_STATUS_META[task.status] || TASK_STATUS_META.todo;
              const priorityMeta = TASK_PRIORITY_META[task.priority] || TASK_PRIORITY_META.normal;
              return (
                <Box key={task.id} sx={{
                  display: 'flex', alignItems: 'center', gap: 1, px: 1.25, py: 0.9,
                  borderRadius: 'var(--hrms-radius, 12px)', border: '1px solid',
                  borderColor: task.is_overdue ? alpha('#be123c', 0.4) : 'divider',
                  bgcolor: 'background.paper',
                }}>
                  <Checkbox
                    size="small" checked={task.status === 'done'}
                    onChange={() => toggleTask.mutate(task)}
                    inputProps={{ 'aria-label': `وضعیت وظیفه ${task.title}` }}
                    sx={{ p: 0.4, color: statusMeta.color, '&.Mui-checked': { color: statusMeta.color } }}
                  />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography noWrap sx={{
                      fontSize: 12.5, fontWeight: 800, color: INK,
                      textDecoration: task.status === 'done' ? 'line-through' : 'none',
                    }}>
                      {task.title}
                    </Typography>
                    <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap"
                      alignItems="center" sx={{ mt: 0.25 }}>
                      {task.due_date ? (
                        <Stack direction="row" spacing={0.3} alignItems="center">
                          <EventOutlinedIcon sx={{ fontSize: 12, color: MUTED }} />
                          <Typography sx={{ fontSize: 10, color: task.is_overdue ? '#be123c' : MUTED }}>
                            {dueLabel(task.due_date)}
                          </Typography>
                        </Stack>
                      ) : null}
                      <Chip size="small" label={statusMeta.label}
                        sx={{ height: 18, fontSize: 9.5, fontWeight: 800, bgcolor: alpha(statusMeta.color, 0.12), color: statusMeta.color }} />
                      <Chip size="small" label={priorityMeta.label}
                        sx={{ height: 18, fontSize: 9.5, fontWeight: 800, bgcolor: alpha(priorityMeta.color, 0.12), color: priorityMeta.color }} />
                      {(task.assignee_groups || []).map((group) => (
                        <Chip
                          key={`group-${group.id}`} size="small"
                          icon={<GroupOutlinedIcon sx={{ fontSize: 12 }} />}
                          label={group.name}
                          sx={{
                            height: 18, fontSize: 9.5, fontWeight: 800,
                            bgcolor: alpha(group.color || accent, 0.12),
                            color: group.color || accent,
                          }}
                        />
                      ))}
                      {(task.assignees || []).length ? (
                        <Stack direction="row" spacing={-0.5} alignItems="center">
                          {(task.assignees || []).slice(0, 3).map((person) => (
                            <Tooltip key={`assignee-${person.id}`} title={`مسئول: ${person.name}`}>
                              <Avatar sx={{
                                width: 18, height: 18, fontSize: 8.5, fontWeight: 900,
                                bgcolor: alpha(accent, 0.16), color: accent,
                                border: '1px solid', borderColor: 'background.paper',
                              }}>
                                {String(person.name || '?').trim().slice(0, 2)}
                              </Avatar>
                            </Tooltip>
                          ))}
                          {task.assignees.length > 3 ? (
                            <Typography sx={{ fontSize: 9.5, color: MUTED, ml: 0.5 }}>
                              +{toPersianDigits(task.assignees.length - 3)}
                            </Typography>
                          ) : null}
                        </Stack>
                      ) : null}
                      {task.is_private ? (
                        <Chip size="small" label="فقط من"
                          sx={{ height: 18, fontSize: 9.5, fontWeight: 800 }} />
                      ) : null}
                      {!task.is_mine ? (
                        <Typography sx={{ fontSize: 9.5, color: MUTED }}>
                          · {task.owner_name}
                        </Typography>
                      ) : null}
                    </Stack>
                  </Box>
                  <Tooltip title="ویرایش">
                    <IconButton size="small" aria-label="ویرایش وظیفه" onClick={() => openTaskEdit(task)}>
                      <EditOutlinedIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="اشتراک‌گذاری">
                    <IconButton size="small" aria-label="اشتراک‌گذاری وظیفه"
                      onClick={() => { setShareTarget({ kind: 'task', row: task }); setShareUsers([]); }}>
                      <ShareOutlinedIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                  </Tooltip>
                  {task.is_mine ? (
                    <Tooltip title="حذف">
                      <IconButton size="small" aria-label="حذف وظیفه" color="error"
                        onClick={() => removeTask.mutate(task)}>
                        <DeleteOutlineIcon sx={{ fontSize: 15 }} />
                      </IconButton>
                    </Tooltip>
                  ) : null}
                </Box>
              );
            })}
          </Stack>
        ) : (
          <Alert severity="info">وظیفه‌ای با این فیلتر یافت نشد.</Alert>
        )
      ) : null}


      {/* ---------------- دیالوگ یادداشت ---------------- */}
      <Dialog open={noteOpen} onClose={() => setNoteOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 13.5, fontWeight: 900, pb: 0.5 }}>
          {noteForm.id ? 'ویرایش یادداشت' : 'یادداشت جدید'}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.1} sx={{ pt: 0.5 }}>
            <TextField
              size="small" label="عنوان" value={noteForm.title}
              onChange={(event) => setNoteForm((previous) => ({
                ...previous, title: event.target.value,
              }))}
            />
            <TextField
              size="small" label="متن یادداشت" multiline minRows={5}
              value={noteForm.body}
              onChange={(event) => setNoteForm((previous) => ({
                ...previous, body: event.target.value,
              }))}
            />
            <TextField
              size="small" label="برچسب‌ها (با کاما جدا شود)" value={noteForm.tags}
              onChange={(event) => setNoteForm((previous) => ({
                ...previous, tags: event.target.value,
              }))}
            />
            <Stack direction="row" spacing={0.6} alignItems="center">
              <Typography sx={{ fontSize: 10.5, color: MUTED, mr: 0.5 }}>رنگ:</Typography>
              {NOTE_COLORS.map((color) => (
                <Box
                  key={color}
                  onClick={() => setNoteForm((previous) => ({ ...previous, color }))}
                  sx={{
                    width: 20, height: 20, borderRadius: '50%', bgcolor: color, cursor: 'pointer',
                    border: noteForm.color === color ? `2px solid ${INK}` : '2px solid transparent',
                  }}
                />
              ))}
              <Box sx={{ flex: 1 }} />
              <Button
                size="small"
                variant={noteForm.is_pinned ? 'contained' : 'outlined'}
                startIcon={<PushPinOutlinedIcon sx={{ fontSize: 15 }} />}
                onClick={() => setNoteForm((previous) => ({
                  ...previous, is_pinned: !previous.is_pinned,
                }))}
                sx={{ fontSize: 10.5 }}
              >
                سنجاق
              </Button>
            </Stack>
            <Typography sx={{ fontSize: 10, color: MUTED }}>
              متن یادداشت رمزنگاری می‌شود؛ فقط شما و افرادی که به اشتراک می‌گذارید آن را می‌بینید.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNoteOpen(false)}>انصراف</Button>
          <Button variant="contained" disabled={!noteForm.title.trim() || saveNote.isPending}
            onClick={() => saveNote.mutate()}
            sx={{ bgcolor: accent, '&:hover': { bgcolor: accent } }}>
            ذخیره
          </Button>
        </DialogActions>
      </Dialog>


      {/* ---------------- دیالوگ وظیفه ---------------- */}
      <Dialog open={taskOpen} onClose={() => setTaskOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 13.5, fontWeight: 900, pb: 0.5 }}>
          {taskForm.id ? 'ویرایش وظیفه' : 'وظیفهٔ جدید'}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.1} sx={{ pt: 0.5 }}>
            <TextField
              size="small" label="عنوان وظیفه" value={taskForm.title}
              onChange={(event) => setTaskForm((previous) => ({
                ...previous, title: event.target.value,
              }))}
            />
            <TextField
              size="small" label="توضیح" multiline minRows={3} value={taskForm.description}
              onChange={(event) => setTaskForm((previous) => ({
                ...previous, description: event.target.value,
              }))}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Select
                size="small" value={taskForm.status}
                onChange={(event) => setTaskForm((previous) => ({
                  ...previous, status: event.target.value,
                }))}
                sx={{ fontSize: 11, flex: 1 }}
              >
                {Object.entries(TASK_STATUS_META).map(([key, meta]) => (
                  <MenuItem key={key} value={key}>{meta.label}</MenuItem>
                ))}
              </Select>
              <Select
                size="small" value={taskForm.priority}
                onChange={(event) => setTaskForm((previous) => ({
                  ...previous, priority: event.target.value,
                }))}
                sx={{ fontSize: 11, flex: 1 }}
              >
                {Object.entries(TASK_PRIORITY_META).map(([key, meta]) => (
                  <MenuItem key={key} value={key}>{meta.label}</MenuItem>
                ))}
              </Select>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center">
              <JalaliMaskedDateInput
                value={taskForm.due_date}
                onChange={(iso) => setTaskForm((previous) => ({ ...previous, due_date: iso }))}
                label="سررسید (شمسی)"
                variant="outlined"
                inputSx={{ fontSize: 11 }}
              />
              <TextField
                size="small" type="time" label="ساعت" value={taskForm.due_time || ''}
                onChange={(event) => setTaskForm((previous) => ({
                  ...previous, due_time: event.target.value,
                }))}
                inputProps={{ step: 60 }}
                sx={{ width: 140, '& .MuiInputBase-input': { fontSize: 11 } }}
              />
            </Stack>
            <Divider />
            <Box>
              <Typography sx={{ fontSize: 11, fontWeight: 900, color: INK, mb: 0.6 }}>
                این وظیفه برای چه کسی است؟
              </Typography>
              <ToggleButtonGroup
                size="small" exclusive fullWidth value={taskForm.assignMode}
                onChange={(_event, value) => {
                  if (!value) return;
                  setTaskForm((previous) => ({
                    ...previous,
                    assignMode: value,
                    assigneeIds: value === 'people' ? previous.assigneeIds : [],
                    groupIds: value === 'group' ? previous.groupIds : [],
                  }));
                }}
                sx={{ mb: 0.75, '& .MuiToggleButton-root': { fontSize: 10.5, py: 0.4, fontWeight: 800 } }}
              >
                <ToggleButton value="me">
                  <PersonOutlineIcon sx={{ fontSize: 14, mr: 0.4 }} /> فقط خودم
                </ToggleButton>
                <ToggleButton value="people">
                  <PersonOutlineIcon sx={{ fontSize: 14, mr: 0.4 }} /> یک یا چند نفر
                </ToggleButton>
                <ToggleButton value="group">
                  <GroupOutlinedIcon sx={{ fontSize: 14, mr: 0.4 }} /> گروه
                </ToggleButton>
              </ToggleButtonGroup>

              {taskForm.assignMode === 'people' ? (
                <Select
                  size="small" multiple fullWidth displayEmpty
                  value={taskForm.assigneeIds}
                  onChange={(event) => setTaskForm((previous) => ({
                    ...previous, assigneeIds: event.target.value,
                  }))}
                  renderValue={(selected) => (selected.length
                    ? (selected
                      .map((id) => directory.find((person) => person.id === id)?.name)
                      .filter(Boolean).join('، '))
                    : 'یک یا چند همکار را انتخاب کنید')}
                  sx={{ fontSize: 11 }}
                >
                  {directory
                    .filter((person) => String(person.id) !== String(user?.id))
                    .map((person) => (
                      <MenuItem key={person.id} value={person.id}>{person.name}</MenuItem>
                    ))}
                </Select>
              ) : null}

              {taskForm.assignMode === 'group' ? (
                <Stack spacing={0.6}>
                  <Select
                    size="small" multiple fullWidth displayEmpty
                    value={taskForm.groupIds}
                    onChange={(event) => setTaskForm((previous) => ({
                      ...previous, groupIds: event.target.value,
                    }))}
                    renderValue={(selected) => (selected.length
                      ? (selected
                        .map((id) => groups.find((group) => group.id === id)?.name)
                        .filter(Boolean).join('، '))
                      : 'یک یا چند گروه را انتخاب کنید')}
                    sx={{ fontSize: 11 }}
                  >
                    {groups.map((group) => (
                      <MenuItem key={group.id} value={group.id}>
                        {group.name} · {toPersianDigits(group.member_count || 0)} عضو
                      </MenuItem>
                    ))}
                  </Select>
                  <Button
                    size="small" variant="text" startIcon={<AddIcon sx={{ fontSize: 15 }} />}
                    onClick={openGroupNew} sx={{ fontSize: 10.5, alignSelf: 'flex-start' }}
                  >
                    ساخت گروه جدید
                  </Button>
                  {!groups.length ? (
                    <Typography sx={{ fontSize: 10, color: MUTED }}>
                      هنوز گروهی نساخته‌اید؛ از دکمهٔ «گروه‌ها» بالای صفحه یک تیم بسازید.
                    </Typography>
                  ) : null}
                </Stack>
              ) : null}

              {taskForm.assignMode === 'me' ? (
                <Typography sx={{ fontSize: 10, color: MUTED }}>
                  این وظیفه فقط برای شماست و هیچ‌کس دیگری آن را نمی‌بیند.
                </Typography>
              ) : (
                <Typography sx={{ fontSize: 10, color: MUTED }}>
                  افراد انتخاب‌شده وظیفه را در «وظایف من» می‌بینند، اعلان می‌گیرند و می‌توانند وضعیت را تغییر دهند.
                </Typography>
              )}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTaskOpen(false)}>انصراف</Button>
          <Button variant="contained" disabled={!taskForm.title.trim() || saveTask.isPending}
            onClick={() => saveTask.mutate()}
            sx={{ bgcolor: accent, '&:hover': { bgcolor: accent } }}>
            ذخیره
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---------------- دیالوگ اشتراک‌گذاری ---------------- */}
      <Dialog open={Boolean(shareTarget)} onClose={() => setShareTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 13, fontWeight: 900, pb: 0.5 }}>
          اشتراک‌گذاری «{shareTarget?.row?.title || ''}»
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.1} sx={{ pt: 0.5 }}>
            <Select
              size="small" multiple displayEmpty fullWidth
              value={shareUsers}
              onChange={(event) => setShareUsers(event.target.value)}
              renderValue={(selected) => (selected.length
                ? `${toPersianDigits(selected.length)} نفر انتخاب شد`
                : 'انتخاب کاربران')}
            >
              {directory.map((person) => (
                <MenuItem key={person.id} value={person.id}>{person.name}</MenuItem>
              ))}
            </Select>
            <Select
              size="small" value={sharePermission}
              onChange={(event) => setSharePermission(event.target.value)}
              sx={{ fontSize: 11 }}
            >
              <MenuItem value="view">فقط مشاهده</MenuItem>
              <MenuItem value="edit">مشاهده و ویرایش</MenuItem>
            </Select>
            <Typography sx={{ fontSize: 10, color: MUTED }}>
              کاربران انتخاب‌شده اعلان دریافت می‌کنند و آیتم در بخش «اشتراکی» آن‌ها نمایش داده می‌شود.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareTarget(null)}>انصراف</Button>
          <Button variant="contained" disabled={!shareUsers.length || shareItem.isPending}
            onClick={() => shareItem.mutate()}
            sx={{ bgcolor: accent, '&:hover': { bgcolor: accent } }}>
            اشتراک‌گذاری
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---------------- دیالوگ گروه‌ها ---------------- */}
      <Dialog open={groupsOpen} onClose={() => setGroupsOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 13, fontWeight: 900, pb: 0.5 }}>
          گروه‌های محول‌کردن وظیفه
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1} sx={{ pt: 0.5 }}>
            <TextField
              size="small" label="نام گروه (مثلاً تیم مالی)" value={groupForm.name}
              onChange={(event) => setGroupForm((previous) => ({
                ...previous, name: event.target.value,
              }))}
            />
            <Select
              size="small" multiple fullWidth displayEmpty
              value={groupForm.members}
              onChange={(event) => setGroupForm((previous) => ({
                ...previous, members: event.target.value,
              }))}
              renderValue={(selected) => (selected.length
                ? `${toPersianDigits(selected.length)} عضو`
                : 'انتخاب اعضا')}
              sx={{ fontSize: 11 }}
            >
              {directory.map((person) => (
                <MenuItem key={person.id} value={person.id}>{person.name}</MenuItem>
              ))}
            </Select>
            <Divider />
            <Typography sx={{ fontSize: 10.5, color: MUTED }}>گروه‌های ساخته‌شده</Typography>
            {groups.length ? groups.map((group) => (
              <Stack key={group.id} direction="row" alignItems="center" spacing={0.6}
                sx={{ p: 0.5, borderRadius: '8px', '&:hover': { bgcolor: 'action.hover' } }}>
                <GroupOutlinedIcon sx={{ fontSize: 15, color: group.color || accent }} />
                <Typography sx={{ fontSize: 11.5, flex: 1 }}>
                  {group.name}
                  <Typography component="span" sx={{ fontSize: 10, color: MUTED }}>
                    {' · '}{toPersianDigits(group.member_count || 0)} عضو
                  </Typography>
                </Typography>
                <IconButton size="small" aria-label={`ویرایش ${group.name}`}
                  onClick={() => setGroupForm({
                    id: group.id, name: group.name, color: group.color || accent,
                    members: (group.members || []).map((person) => person.id),
                  })}>
                  <EditOutlinedIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Stack>
            )) : (
              <Typography sx={{ fontSize: 10.5, color: MUTED }}>
                هنوز گروهی ساخته نشده است.
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGroupsOpen(false)}>بستن</Button>
          <Button
            variant="contained" disabled={!groupForm.name.trim() || saveGroup.isPending}
            onClick={() => saveGroup.mutate()}
            sx={{ bgcolor: accent, '&:hover': { bgcolor: accent } }}
          >
            {groupForm.id ? 'ذخیرهٔ تغییرات' : 'ساخت گروه'}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

/** صفحهٔ کامل برنامه‌ریزی (مسیر `/planning`). */
const PlanningPage = () => <PlanningPanel />;

export { PlanningPanel };
export default PlanningPage;

