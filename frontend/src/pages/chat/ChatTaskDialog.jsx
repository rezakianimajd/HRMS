/**
 * دیالوگ «تبدیل پیام به وظیفه» — عنوان/توضیح از خود پیام پر می‌شود و کاربر
 * می‌تواند مسئول (خودم / افراد / گروه)، سررسید و اولویت را تعیین کند.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, FormControl, InputLabel, MenuItem, Select, Stack, TextField,
  ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import AssignmentIndOutlinedIcon from '@mui/icons-material/AssignmentIndOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import axiosInstance from '../../core/api/axiosConfig';
import JalaliDatePicker from '../../core/components/ui/JalaliDatePicker';
import { toPersianDigits } from '../../core/utils/numberUtils';

const PRIORITIES = [
  { value: 'low', label: 'کم' },
  { value: 'normal', label: 'معمولی' },
  { value: 'high', label: 'زیاد' },
  { value: 'urgent', label: 'فوری' },
];

const EMPTY = {
  title: '', description: '', priority: 'normal', due_date: '', mode: 'me', assignees: [], groups: [],
};

const ChatTaskDialog = ({ open, onClose, message, directory = [], accent = '#4a86c8', onCreated }) => {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const groupsQuery = useQuery({
    queryKey: ['planning-groups', 'chat-task'],
    queryFn: () => axiosInstance.get('/planning/groups/').then((response) => response.data),
    enabled: Boolean(open),
    staleTime: 60_000,
  });
  const groups = useMemo(() => {
    const payload = groupsQuery.data;
    return Array.isArray(payload) ? payload : payload?.results || [];
  }, [groupsQuery.data]);

  useEffect(() => {
    if (!open || !message) return;
    const suggestion = message.task_suggestion || {};
    setForm({
      ...EMPTY,
      title: suggestion.title || (message.body || '').slice(0, 140),
      description: message.body || '',
      priority: suggestion.priority || 'normal',
    });
    setError('');
  }, [open, message]);

  const update = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));

  const submit = async () => {
    if (!message) return;
    if (!form.title.trim()) {
      setError('عنوان وظیفه را وارد کنید.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority,
        due_date: form.due_date || null,
      };
      if (form.mode === 'people' && form.assignees.length) payload.assignees = form.assignees;
      if (form.mode === 'group' && form.groups.length) payload.groups = form.groups;
      const response = await axiosInstance.post(
        `/chat/messages/${message.id}/make-task/`, payload,
      );
      onCreated?.(response.data);
      onClose?.();
    } catch (failure) {
      const data = failure?.response?.data;
      setError(typeof data === 'string' ? data : (data?.detail || 'ساخت وظیفه انجام نشد.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontSize: 13.5, fontWeight: 900, pb: 0.5 }}>
        ساخت وظیفه از پیام
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.2} sx={{ pt: 0.5 }}>
          {message ? (
            <Box sx={{
              px: 1, py: 0.7, borderRadius: '10px',
              bgcolor: alpha(accent, 0.07),
              border: '1px solid', borderColor: alpha(accent, 0.18),
            }}>
              <Typography sx={{ fontSize: 10, fontWeight: 800, color: accent }}>
                {message.sender_name || 'کاربر'} · پیام چت
              </Typography>
              <Typography noWrap sx={{ fontSize: 11, color: 'text.primary' }}>
                {message.body || 'پیوست'}
              </Typography>
              {message.task_suggestion ? (
                <Chip
                  size="small" label={`پیشنهاد: ${message.task_suggestion.reason}`}
                  sx={{ mt: 0.4, height: 18, fontSize: 9.5, fontWeight: 800,
                    bgcolor: alpha(accent, 0.12), color: accent }}
                />
              ) : null}
            </Box>
          ) : null}

          <TextField
            size="small" fullWidth label="عنوان وظیفه" value={form.title}
            onChange={(event) => update('title', event.target.value)}
            inputProps={{ maxLength: 220 }}
          />
          <TextField
            size="small" fullWidth multiline minRows={2} maxRows={5}
            label="توضیح" value={form.description}
            onChange={(event) => update('description', event.target.value)}
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2}>
            <FormControl size="small" fullWidth>
              <InputLabel>اولویت</InputLabel>
              <Select label="اولویت" value={form.priority}
                onChange={(event) => update('priority', event.target.value)}>
                {PRIORITIES.map((item) => (
                  <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ width: '100%' }}>
              <JalaliDatePicker
                fullWidth label="سررسید (اختیاری)" value={form.due_date}
                onChange={(value) => update('due_date', value || '')}
              />
            </Box>
          </Stack>

          <Divider />
          <Typography sx={{ fontSize: 10.5, fontWeight: 900, color: 'text.secondary' }}>
            مسئول انجام
          </Typography>
          <ToggleButtonGroup
            size="small" exclusive value={form.mode}
            onChange={(_event, value) => { if (value) update('mode', value); }}
            sx={{ '& .MuiToggleButton-root': { fontSize: 10.5, px: 1.2, py: 0.4, gap: 0.4 } }}
          >
            <ToggleButton value="me"><PersonOutlineIcon sx={{ fontSize: 15 }} /> فقط خودم</ToggleButton>
            <ToggleButton value="people">
              <AssignmentIndOutlinedIcon sx={{ fontSize: 15 }} /> افراد
            </ToggleButton>
            <ToggleButton value="group"><GroupsOutlinedIcon sx={{ fontSize: 15 }} /> گروه</ToggleButton>
          </ToggleButtonGroup>

          {form.mode === 'people' ? (
            <Select
              size="small" multiple fullWidth displayEmpty value={form.assignees}
              onChange={(event) => update('assignees', event.target.value)}
              renderValue={(selected) => (selected.length
                ? `${toPersianDigits(selected.length)} نفر انتخاب شد`
                : 'انتخاب همکاران')}
            >
              {(directory || []).map((person) => (
                <MenuItem key={person.id} value={person.id}>{person.name}</MenuItem>
              ))}
            </Select>
          ) : null}

          {form.mode === 'group' ? (
            <Select
              size="small" multiple fullWidth displayEmpty value={form.groups}
              onChange={(event) => update('groups', event.target.value)}
              renderValue={(selected) => (selected.length
                ? `${toPersianDigits(selected.length)} گروه انتخاب شد`
                : 'انتخاب گروه')}
            >
              {groupsQuery.isLoading ? (
                <MenuItem disabled value="">
                  در حال بارگذاری…
                </MenuItem>
              ) : groups.length ? groups.map((group) => (
                <MenuItem key={group.id} value={group.id}>{group.name}</MenuItem>
              )) : (
                <MenuItem disabled value="">گروهی تعریف نشده است</MenuItem>
              )}
            </Select>
          ) : null}

          {error ? <Alert severity="error">{error}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} size="small">انصراف</Button>
        <Button
          variant="contained" size="small" onClick={submit} disabled={saving}
          sx={{ bgcolor: accent, '&:hover': { bgcolor: accent } }}
        >
          {saving ? <CircularProgress size={16} color="inherit" /> : 'ساخت وظیفه'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ChatTaskDialog;

