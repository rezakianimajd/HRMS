import React, { useState } from 'react';
import {
  Box, Typography, Paper, TextField, Button, Select, MenuItem,
  FormControl, InputLabel, IconButton, Tooltip, Stack, Chip, Divider,
  CircularProgress, Alert, Avatar,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../api/axiosConfig';

const CATEGORIES = {
  hr_policy: 'آیین‌نامه و قوانین',
  procedure: 'رویه‌ها و فرایندها',
  faq: 'پرسش متداول',
  general: 'عمومی',
};

const CATEGORY_COLORS = {
  hr_policy: '#3b82f6',
  procedure: '#10b981',
  faq: '#f59e0b',
  general: '#64748b',
};

const emptyForm = { title: '', content: '', category: 'general', tags: '' };

/**
 * پایگاه دانش دستیار هوشمند.
 * کاربران می‌توانند آیین‌نامه‌ها، رویه‌ها و پرسش‌های متداول را وارد کنند
 * تا دستیار در پاسخ‌های خود از آن‌ها استفاده کند.
 */
const KnowledgePanel = () => {
  const qc = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['assistant-knowledge'],
    queryFn: () => axiosInstance.get('/assistant/knowledge/').then(r => r.data),
  });
  const list = Array.isArray(data) ? data : [];

  const saveMutation = useMutation({
    mutationFn: (payload) => editingId
      ? axiosInstance.patch(`/assistant/knowledge/${editingId}/`, payload)
      : axiosInstance.post('/assistant/knowledge/create/', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assistant-knowledge'] });
      setForm(emptyForm);
      setEditingId(null);
      setMsg(editingId ? 'دانش ویرایش شد.' : 'دانش ثبت شد.');
      setTimeout(() => setMsg(''), 2500);
    },
    onError: (e) => setErr(e.response?.data?.error || 'خطا در ذخیره دانش'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/assistant/knowledge/${id}/delete/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assistant-knowledge'] });
      setMsg('دانش حذف شد.');
      setTimeout(() => setMsg(''), 2500);
    },
    onError: () => setErr('خطا در حذف دانش'),
  });

  const submit = () => {
    if (!form.title.trim() || !form.content.trim()) {
      setErr('عنوان و محتوا الزامی است');
      return;
    }
    setErr('');
    saveMutation.mutate({
      title: form.title.trim(),
      content: form.content.trim(),
      category: form.category,
      tags: form.tags.trim(),
    });
  };

  const startEdit = (k) => {
    setEditingId(k.id);
    setForm({ title: k.title, content: k.content, category: k.category, tags: k.tags || '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  return (
    <Paper sx={{
      p: 2,
      width: '100%',
      background: 'linear-gradient(135deg, rgba(16,185,129,0.06), rgba(245,158,11,0.03))',
      border: '1px solid rgba(16,185,129,0.2)',
      borderRadius: '14px',
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.5 }}>
        <Avatar sx={{ width: 36, height: 36, background: 'linear-gradient(135deg, #10b981, #f59e0b)' }}>
          <MenuBookIcon sx={{ color: '#fff', fontSize: 20 }} />
        </Avatar>
        <Box>
          <Typography variant="subtitle1" fontWeight={800}>پایگاه دانش سازمان</Typography>
          <Typography variant="caption" color="textSecondary">اطلاعاتی که وارد می‌کنید، دستیار در پاسخ‌ها استفاده می‌کند</Typography>
        </Box>
      </Box>

      {(msg || err) && (
        <Alert severity={err ? 'error' : 'success'} sx={{ mb: 1.5 }} onClose={() => { setMsg(''); setErr(''); }}>
          {err || msg}
        </Alert>
      )}

      {/* Form */}
      <Stack spacing={1.25}>
        <TextField fullWidth size="small" label="عنوان *" value={form.title}
          placeholder="مثلاً: آیین‌نامه مرخصی سالانه"
          onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
        <FormControl fullWidth size="small">
          <InputLabel>دسته‌بندی</InputLabel>
          <Select value={form.category} label="دسته‌بندی" onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
            {Object.keys(CATEGORIES).map(k => <MenuItem key={k} value={k}>{CATEGORIES[k]}</MenuItem>)}
          </Select>
        </FormControl>
        <TextField fullWidth size="small" label="برچسب‌ها (با ویرگول)" value={form.tags}
          placeholder="مثلاً: مرخصی، استحقاقی، سالانه"
          onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} />
        <TextField fullWidth size="small" label="محتوا *" multiline rows={4} value={form.content}
          placeholder="توضیح کامل موضوع…"
          onChange={e => setForm(p => ({ ...p, content: e.target.value }))} />
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="contained" startIcon={editingId ? <SaveIcon /> : <AddIcon />} onClick={submit}
            disabled={saveMutation.isPending}
            sx={{ background: 'linear-gradient(135deg, #10b981, #f59e0b)', borderRadius: '10px', flex: 1 }}>
            {editingId ? 'ذخیره تغییرات' : 'ثبت دانش'}
          </Button>
          {editingId && (
            <Button variant="outlined" onClick={cancelEdit} sx={{ borderRadius: '10px' }}>انصراف</Button>
          )}
        </Box>
      </Stack>

      <Divider sx={{ my: 2 }} />

      {/* List */}
      <Typography variant="subtitle2" fontWeight={800} color="textSecondary" sx={{ mb: 1 }}>
        دانش ثبت‌شده ({list.length})
      </Typography>
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress size={22} /></Box>
      ) : list.length === 0 ? (
        <Typography variant="caption" color="textSecondary">هنوز دانشی ثبت نشده است.</Typography>
      ) : (
        <Stack spacing={1}>
          {list.map(k => (
            <Paper key={k.id} variant="outlined" sx={{ p: 1.25, borderRadius: '10px', background: 'rgba(255,255,255,0.6)' }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <Chip size="small" label={k.category_display || CATEGORIES[k.category] || k.category}
                  sx={{ bgcolor: `${CATEGORY_COLORS[k.category] || '#64748b'}18`, color: CATEGORY_COLORS[k.category] || '#64748b', fontWeight: 700, fontSize: 10, height: 20 }} />
                <Typography variant="body2" fontWeight={800} sx={{ flex: 1 }}>{k.title}</Typography>
                <Box sx={{ display: 'flex', gap: 0.25 }}>
                  <Tooltip title="ویرایش">
                    <IconButton size="small" onClick={() => startEdit(k)}><EditIcon fontSize="small" /></IconButton>
                  </Tooltip>
                  <Tooltip title="حذف">
                    <IconButton size="small" color="error" onClick={() => deleteMutation.mutate(k.id)}><DeleteIcon fontSize="small" /></IconButton>
                  </Tooltip>
                </Box>
              </Box>
              <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.5, whiteSpace: 'pre-line' }}>
                {k.content.length > 160 ? k.content.slice(0, 160) + '…' : k.content}
              </Typography>
              {k.tags && (
                <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.5 }}>🏷 {k.tags}</Typography>
              )}
            </Paper>
          ))}
        </Stack>
      )}
    </Paper>
  );
};

export default KnowledgePanel;

