import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, TextField, Button, Checkbox, Chip,
  CircularProgress, Alert, Divider, Stack, IconButton, Tooltip,
  FormControl, InputLabel, Select, MenuItem, Collapse, Badge,
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import SendIcon from '@mui/icons-material/Send';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PeopleIcon from '@mui/icons-material/People';
import PersonAddAltIcon from '@mui/icons-material/PersonAddAlt';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
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
  const [rawIds, setRawIds] = useState('');

  // manual custom recipients (not persisted), chat_id -> label
  const [manualIds, setManualIds] = useState({});

  const [contactDialog, setContactDialog] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', chat_id: '', category: '' });
  const [result, setResult] = useState(null);
  const [sending, setSending] = useState(false);

  const [openContacts, setOpenContacts] = useState(true);
  const [openEmployees, setOpenEmployees] = useState(true);
  const [openMissing, setOpenMissing] = useState(true);

  const [fillTarget, setFillTarget] = useState(null);
  const [fillId, setFillId] = useState('');
  const [editTarget, setEditTarget] = useState(null);
  const [editId, setEditId] = useState('');

  const { data: audience, isLoading } = useQuery({
    queryKey: ['bale-audience'],
    queryFn: () => axiosInstance.get('/notifications/bale-recipients/').then(r => r.data),
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

  const fillChatId = useMutation({
    mutationFn: ({ id, chat_id }) => axiosInstance.patch(`/employees/${id}/`, { bale_chat_id: chat_id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bale-audience'] });
      setFillTarget(null); setFillId('');
      setEditTarget(null); setEditId('');
    },
  });

  const employeesByDept = useMemo(() => {
    const map = {};
    (audience?.employees || []).forEach(e => {
      const d = e.department || '(بدون دپارتمان)';
      (map[d] = map[d] || []).push(e);
    });
    return Object.entries(map);
  }, [audience]);

  const contactsByCat = useMemo(() => {
    const map = {};
    (audience?.contacts || []).forEach(c => {
      const cat = c.category || '(بدون دسته)';
      (map[cat] = map[cat] || []).push(c);
    });
    return Object.entries(map);
  }, [audience]);

  // Selections made from manual chat_ids
  const manualSelected = Object.entries(manualIds)
    .filter(([id]) => selected.includes(id))
    .map(([id, label]) => ({ id, chat_id: id, name: label, kind: 'manual' }));

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

  const addRawIds = () => {
    const tokens = rawIds
      .split(/[\s,;،\n]+/)
      .map(s => s.trim())
      .filter(Boolean);
    const next = { ...manualIds };
    const nextSel = new Set(selected);
    tokens.forEach(t => {
      if (!(t in next)) next[t] = `دلخواه ${t}`;
      nextSel.add(t);
    });
    setManualIds(next);
    setSelected([...nextSel]);
    setRawIds('');
  };

  const removeManual = (id) => {
    setSelected(prev => prev.filter(x => x !== id));
    setManualIds(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
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
    } catch (e) {
      setResult({ ok: false, message: e.response?.data?.error || 'خطا در ارسال' });
    } finally {
      setSending(false);
    }
  };

  if (isLoading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;

  const group = (title, items, color, icon, editable = false) => (
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
          {items.map(x => {
            const isEditing = editable && editTarget === x.id;
            return (
              <Box key={x.chat_id} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                <Checkbox size="small" checked={selected.includes(x.chat_id)} onChange={() => toggle(x.chat_id)} />
                <Typography variant="body2" noWrap>{x.name}</Typography>
                {isEditing ? (
                  <>
                    <TextField size="small" placeholder="chat_id" value={editId} sx={{ width: 140 }}
                      onChange={e => setEditId(e.target.value)} />
                    <Button size="small" variant="contained" onClick={() => fillChatId.mutate({ id: x.id, chat_id: editId.trim() })}>ذخیره</Button>
                    <Button size="small" onClick={() => { setEditTarget(null); setEditId(''); }}>لغو</Button>
                  </>
                ) : (
                  <>
                    <Typography variant="caption" color="textSecondary">{x.chat_id}</Typography>
                    {editable && (
                      <IconButton size="small" onClick={() => { setEditTarget(x.id); setEditId(x.chat_id); }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    )}
                  </>
                )}
              </Box>
            );
          })}
        </Stack>
      </Box>
    )
  );

  return (
    <Box>
      {result && <Alert severity={result.ok ? 'success' : 'error'} sx={{ mb: 2 }} onClose={() => setResult(null)}>{result.message}</Alert>}

      {/* ارسال */}
      <Paper sx={{ p: 2.5, borderRadius: 3, mb: 2, background: 'linear-gradient(135deg, rgba(236,72,153,0.06), rgba(255,255,255,0.3))', border: '1px solid rgba(236,72,153,0.18)' }}>
        <Typography variant="subtitle1" fontWeight={800} gutterBottom sx={{ color: '#ec4899' }}>ارسال پیام</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <TextField size="small" label="موضوع" value={subject} onChange={e => setSubject(e.target.value)} />
          <TextField size="small" label="متن پیام" value={text} multiline rows={3} onChange={e => setText(e.target.value)} />

          {/* ورود chat_id دلخواه (غیر پرسنل) */}
          <Box sx={{ p: 1.5, borderRadius: 2, background: 'rgba(16,185,129,0.04)', border: '1px dashed rgba(16,185,129,0.3)' }}>
            <Typography variant="caption" fontWeight={700} sx={{ color: '#10b981', display: 'block', mb: 0.5 }}>
              افزودن chat_id دلخواه (خارج از پرسنل)
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
              <TextField size="small" placeholder="مثلاً 100453025 ، 873575409"
                value={rawIds} onChange={e => setRawIds(e.target.value)}
                sx={{ flex: 1, minWidth: 200 }} />
              <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={addRawIds}
                sx={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                افزودن
              </Button>
            </Box>
            <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 0.5 }}>
              می‌توانید چند عدد را با فاصله، کاما، نقطه‌ویرگول یا اینتر جدا کنید.
            </Typography>
          </Box>

          {/* گیرنده‌های دستی */}
          {manualSelected.length > 0 && (
            <Stack spacing={0.5}>
              {manualSelected.map(m => (
                <Box key={m.chat_id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PhoneAndroidIcon sx={{ fontSize: 16, color: '#10b981' }} />
                  <Typography variant="body2" noWrap>دلخواه</Typography>
                  <Typography variant="caption" color="textSecondary">{m.chat_id}</Typography>
                  <IconButton size="small" color="error" onClick={() => removeManual(m.chat_id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Stack>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
            <Chip label={`${formatPersianNumber(selected.length)} گیرنده`} color="primary" />
            <Button variant="contained" startIcon={<SendIcon />} onClick={sendBulk} disabled={sending}
              sx={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}>
              {sending ? <CircularProgress size={18} color="inherit" /> : 'ارسال'}
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* مخاطبین دلخواه ذخیره‌شده */}
      <Paper sx={{ p: 2.5, borderRadius: 3, mb: 2, background: 'rgba(255,255,255,0.5)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Button size="small" onClick={() => setOpenContacts(!openContacts)} startIcon={openContacts ? <ExpandLessIcon /> : <ExpandMoreIcon />}>
            <Typography variant="subtitle1" fontWeight={800}>مخاطبان ذخیره‌شده (دسته‌بندی)</Typography>
          </Button>
          <Button size="small" startIcon={<AddIcon />} onClick={() => { setContactForm({ name: '', chat_id: '', category: '' }); setContactDialog(true); }}>
            افزودن
          </Button>
        </Box>
        <Collapse in={openContacts}>
          {contactsByCat.length === 0 ? (
            <Typography variant="caption" color="textSecondary">هنوز مخاطب ذخیره‌شده‌ای وجود ندارد.</Typography>
          ) : (
            contactsByCat.map(([cat, items]) => (
              <Box key={cat} sx={{ mb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Checkbox
                    size="small"
                    checked={items.every(x => selected.includes(x.chat_id))}
                    indeterminate={items.some(x => selected.includes(x.chat_id)) && !items.every(x => selected.includes(x.chat_id))}
                    onChange={() => toggleGroup(items)}
                  />
                  <Avatar sx={{ width: 22, height: 22, bgcolor: '#10b981' }}>
                    <PersonAddAltIcon sx={{ fontSize: 14 }} />
                  </Avatar>
                  <Typography variant="body2" fontWeight={800}>{cat}</Typography>
                  <Chip size="small" label={formatPersianNumber(items.length)} />
                </Box>
                <Stack spacing={0.25} sx={{ pl: 2 }}>
                  {items.map(c => (
                    <Box key={c.chat_id} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                      <Checkbox size="small" checked={selected.includes(c.chat_id)} onChange={() => toggle(c.chat_id)} />
                      <Typography variant="body2" noWrap>{c.name}</Typography>
                      <Typography variant="caption" color="textSecondary">{c.chat_id}</Typography>
                      <IconButton size="small" onClick={() => { setContactForm({ id: c.id, name: c.name, chat_id: c.chat_id, category: c.category }); setContactDialog(true); }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => deleteContact.mutate(c.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Stack>
              </Box>
            ))
          )}
        </Collapse>
      </Paper>

      {/* پرسنل */}
      <Paper sx={{ p: 2.5, borderRadius: 3, mb: 2, background: 'rgba(255,255,255,0.5)' }}>
        <Button size="small" onClick={() => setOpenEmployees(!openEmployees)} startIcon={openEmployees ? <ExpandLessIcon /> : <ExpandMoreIcon />}>
          <Typography variant="subtitle1" fontWeight={800}>پرسنل (بر اساس دپارتمان)</Typography>
        </Button>
        <Collapse in={openEmployees}>
          {employeesByDept.length === 0 ? (
            <Typography variant="caption" color="textSecondary">هنوز پرسنلی با chat_id ثبت نشده است.</Typography>
          ) : (
            employeesByDept.map(([dept, items]) => group(dept, items, '#6366f1', <PeopleIcon sx={{ fontSize: 14 }} />, true))
          )}
        </Collapse>
      </Paper>

      {/* پرسنل بدون chat_id */}
      <Paper sx={{ p: 2.5, borderRadius: 3, background: 'rgba(255,255,255,0.5)' }}>
        <Button size="small" onClick={() => setOpenMissing(!openMissing)} startIcon={openMissing ? <ExpandLessIcon /> : <ExpandMoreIcon />}>
          <Typography variant="subtitle1" fontWeight={800}>پرسنل بدون chat_id (ثبت سریع)</Typography>
        </Button>
        <Collapse in={openMissing}>
          {(audience?.employees_without_chat_id || []).length === 0 ? (
            <Typography variant="caption" color="textSecondary">همهٔ پرسنل دارای chat_id هستند.</Typography>
          ) : (
            <Stack spacing={1} sx={{ mt: 1 }}>
              {(audience.employees_without_chat_id || []).map(emp => (
                <Box key={emp.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="body2" sx={{ minWidth: 180 }}>{emp.name}</Typography>
                  <Chip size="small" label={emp.mobile} variant="outlined" />
                  <Chip size="small" label={emp.department} />
                  {fillTarget === emp.id ? (
                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                      <TextField size="small" placeholder="chat_id" value={fillId} sx={{ width: 140 }}
                        onChange={e => setFillId(e.target.value)} />
                      <Button size="small" variant="contained" onClick={() => fillChatId.mutate({ id: emp.id, chat_id: fillId.trim() })}>ذخیره</Button>
                      <Button size="small" onClick={() => { setFillTarget(null); setFillId(''); }}>لغو</Button>
                    </Box>
                  ) : (
                    <Button size="small" variant="outlined" onClick={() => { setFillTarget(emp.id); setFillId(''); }}>
                      ثبت chat_id
                    </Button>
                  )}
                </Box>
              ))}
            </Stack>
          )}
        </Collapse>
      </Paper>

      {/* Dialog مخاطب ذخیره‌شده */}
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