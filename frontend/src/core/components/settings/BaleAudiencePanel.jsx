import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, TextField, Button, Checkbox, Chip,
  CircularProgress, Alert, Divider, Stack, IconButton, Tooltip,
  FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import SendIcon from '@mui/icons-material/Send';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PeopleIcon from '@mui/icons-material/People';
import PersonAddAltIcon from '@mui/icons-material/PersonAddAlt';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { formatPersianNumber } from '../../utils/numberUtils';

const BaleAudiencePanel = () => {
  const qc = useQueryClient();

  const [subject, setSubject] = useState('');
  const [text, setText] = useState('');
  const [selected, setSelected] = useState([]); // chat ids
  const [contactDialog, setContactDialog] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', chat_id: '', category: '' });
  const [result, setResult] = useState(null);
  const [sending, setSending] = useState(false);

  const { data: audience, isLoading } = useQuery({
    queryKey: ['bale-audience'],
    queryFn: () => axiosInstance.get('/notifications/bale-recipients/').then(r => r.data),
  });

  const { data: contacts } = useQuery({
    queryKey: ['bale-contacts'],
    queryFn: () => axiosInstance.get('/bale-contacts/').then(r => r.data),
  });

  const saveContact = useMutation({
    mutationFn: (payload) =>
      payload.id
        ? axiosInstance.patch(`/bale-contacts/${payload.id}/`, payload)
        : axiosInstance.post('/bale-contacts/', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bale-contacts'] });
      qc.invalidateQueries({ queryKey: ['bale-audience'] });
      setContactDialog(false);
      setContactForm({ name: '', chat_id: '', category: '' });
    },
  });

  const deleteContact = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/bale-contacts/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bale-contacts'] });
      qc.invalidateQueries({ queryKey: ['bale-audience'] });
    },
  });

  // Employees grouped by department
  const employeesByDept = useMemo(() => {
    const map = {};
    (audience?.employees || []).forEach(e => {
      const d = e.department || '(بدون دپارتمان)';
      (map[d] = map[d] || []).push(e);
    });
    return Object.entries(map);
  }, [audience]);

  // Custom contacts grouped by category
  const contactsByCat = useMemo(() => {
    const map = {};
    (audience?.contacts || []).forEach(c => {
      const cat = c.category || '(بدون دسته)';
      (map[cat] = map[cat] || []).push(c);
    });
    return Object.entries(map);
  }, [audience]);

  const toggle = (chatId) => {
    setSelected(prev =>
      prev.includes(chatId) ? prev.filter(x => x !== chatId) : [...prev, chatId]
    );
  };

  const toggleGroup = (items) => {
    setSelected(prev => {
      const ids = items.map(x => x.chat_id);
      const allSelected = ids.every(id => prev.includes(id));
      if (allSelected) {
        return prev.filter(x => !ids.includes(x));
      }
      const set = new Set(prev);
      ids.forEach(id => set.add(id));
      return [...set];
    });
  };

  const sendBulk = async () => {
    if (!text.trim()) { setResult({ ok: false, message: 'متن پیام الزامی است' }); return; }
    if (selected.length === 0) { setResult({ ok: false, message: 'هیچ گیرنده‌ای انتخاب نشده' }); return; }
    setSending(true);
    try {
      const res = await axiosInstance.post('/notifications/bale-bulk-send/', {
        subject,
        text,
        chat_ids: selected,
      });
      setResult({ ok: true, message: `ارسال شد: ${formatPersianNumber(res.data.sent)} موفق، ${formatPersianNumber(res.data.failed.length)} ناموفق` });
      setSelected([]);
    } catch (e) {
      setResult({ ok: false, message: e.response?.data?.error || 'خطا در ارسال' });
    } finally {
      setSending(false);
    }
  };

  if (isLoading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;

  const group = (title, items, color, icon) => (
    items.length === 0 ? null : (
      <Box sx={{ mb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Checkbox
            size="small"
            checked={items.every(x => selected.includes(x.chat_id))}
            indeterminate={items.some(x => selected.includes(x.chat_id)) && !items.every(x => selected.includes(x.chat_id))}
            onChange={() => toggleGroup(items)}
          />
          <Avatar sx={{ width: 22, height: 22, bgcolor: color }}>{icon}</Avatar>
          <Typography variant="body2" fontWeight={800}>{title}</Typography>
          <Chip size="small" label={formatPersianNumber(items.length)} />
        </Box>
        <Stack spacing={0.25} sx={{ pl: 2 }}>
          {items.map(x => (
            <Box key={x.chat_id} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Checkbox size="small" checked={selected.includes(x.chat_id)} onChange={() => toggle(x.chat_id)} />
              <Typography variant="body2" noWrap>{x.name}</Typography>
              <Typography variant="caption" color="textSecondary">{x.chat_id}</Typography>
            </Box>
          ))}
        </Stack>
      </Box>
    )
  );

  return (
    <Box>
      {result && <Alert severity={result.ok ? 'success' : 'error'} sx={{ mb: 2 }} onClose={() => setResult(null)}>{result.message}</Alert>}

      {/* ارسال گروهی */}
      <Paper sx={{ p: 2.5, borderRadius: 3, mb: 2, background: 'linear-gradient(135deg, rgba(236,72,153,0.06), rgba(255,255,255,0.3))', border: '1px solid rgba(236,72,153,0.18)' }}>
        <Typography variant="subtitle1" fontWeight={800} gutterBottom sx={{ color: '#ec4899' }}>ارسال پیام گروهی</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <TextField size="small" label="موضوع" value={subject} onChange={e => setSubject(e.target.value)} />
          <TextField size="small" label="متن پیام" value={text} multiline rows={3} onChange={e => setText(e.target.value)} />
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Chip label={`${formatPersianNumber(selected.length)} گیرنده`} color="primary" />
            <Button variant="contained" startIcon={<SendIcon />} onClick={sendBulk} disabled={sending}
              sx={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}>
              {sending ? <CircularProgress size={18} color="inherit" /> : 'ارسال'}
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* مدیریت مخاطبین دلخواه */}
      <Paper sx={{ p: 2.5, borderRadius: 3, mb: 2, background: 'rgba(255,255,255,0.5)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="subtitle1" fontWeight={800}>مخاطبان دلخواه (شماره‌های خاص)</Typography>
          <Button size="small" startIcon={<AddIcon />} onClick={() => { setContactForm({ name: '', chat_id: '', category: '' }); setContactDialog(true); }}>
            افزودن
          </Button>
        </Box>

        {contactsByCat.length === 0 ? (
          <Typography variant="caption" color="textSecondary">هنوز مخاطب دلخواهی ثبت نشده است.</Typography>
        ) : (
          contactsByCat.map(([cat, items]) => group(cat, items, '#10b981', <PersonAddAltIcon sx={{ fontSize: 14 }} />))
        )}
      </Paper>

      {/* پرسنل دسته‌بندی‌شده */}
      <Paper sx={{ p: 2.5, borderRadius: 3, background: 'rgba(255,255,255,0.5)' }}>
        <Typography variant="subtitle1" fontWeight={800} gutterBottom>پرسنل (بر اساس دپارتمان)</Typography>
        {employeesByDept.length === 0 ? (
          <Typography variant="caption" color="textSecondary">
            هنوز پرسنلی با chat_id ثبت نشده است. در پروندهٔ هر پرسنل، فیلد «شناسه گفتگوی بله» را پر کنید.
          </Typography>
        ) : (
          employeesByDept.map(([dept, items]) => group(dept, items, '#6366f1', <PeopleIcon sx={{ fontSize: 14 }} />))
        )}
      </Paper>

      {/* Dialog افزودن/ویرایش مخاطب */}
      <Dialog open={contactDialog} onClose={() => setContactDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>مخاطب بله</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <TextField size="small" label="نام / عنوان" value={contactForm.name}
            onChange={e => setContactForm(p => ({ ...p, name: e.target.value }))} />
          <TextField size="small" label="chat_id" value={contactForm.chat_id}
            onChange={e => setContactForm(p => ({ ...p, chat_id: e.target.value }))} />
          <TextField size="small" label="دسته‌بندی (مثلاً مالی، فنی)" value={contactForm.category}
            onChange={e => setContactForm(p => ({ ...p, category: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setContactDialog(false)}>انصراف</Button>
          <Button variant="contained" disabled={!contactForm.name || !contactForm.chat_id}
            onClick={() => saveContact.mutate({ id: contactForm.id, ...contactForm })}
            sx={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            ذخیره
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BaleAudiencePanel;