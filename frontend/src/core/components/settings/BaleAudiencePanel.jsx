import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, TextField, Button, Checkbox, Chip,
  CircularProgress, Alert, Divider, Stack, IconButton, Collapse,
  MenuItem, InputLabel, FormControl, Select,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PeopleIcon from '@mui/icons-material/People';
import PersonAddAltIcon from '@mui/icons-material/PersonAddAlt';
import BoltIcon from '@mui/icons-material/Bolt';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { formatPersianNumber } from '../../utils/numberUtils';
import SegmentsPicker from './SegmentsPicker';

const EVENT_TYPES = [
  { value: 'birthday', label: 'طھظˆظ„ط¯', color: '#ec4899' },
  { value: 'benefits', label: 'ظ…ط²ط§غŒط§', color: '#10b981' },
  { value: 'payslip', label: 'ظپغŒط´ ط­ظ‚ظˆظ‚غŒ', color: '#3b82f6' },
  { value: 'eid', label: 'ط§ط¹غŒط§ط¯', color: '#f59e0b' },
  { value: 'announcement', label: 'ط§ط·ظ„ط§ط¹غŒظ‡', color: '#6366f1' },
  { value: 'other', label: 'ط³ط§غŒط±', color: '#64748b' },
];

const eventColor = (val) => (EVENT_TYPES.find(e => e.value === val) || {}).color || '#64748b';
const eventLabel = (val) => (EVENT_TYPES.find(e => e.value === val) || {}).label || val;

const BaleAudiencePanel = () => {
  const qc = useQueryClient();

  const [subject, setSubject] = useState('');
  const [text, setText] = useState('');
  const [selected, setSelected] = useState([]);
  const [result, setResult] = useState(null);
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // templates
  const [tplDialog, setTplDialog] = useState(false);
  const [tplForm, setTplForm] = useState({ title: '', event_type: 'announcement', text: '' });
  const [tplOpen, setTplOpen] = useState(true);
  const [audienceOpen, setAudienceOpen] = useState(true);
  const [segmentsOpen, setSegmentsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const importFileRef = React.useRef(null);

  // recipients
  const [contactDialog, setContactDialog] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', chat_id: '', category: '', tag: '' });
  const [tagFilter, setTagFilter] = useState('');
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

  const { data: templates } = useQuery({
    queryKey: ['bale-templates'],
    queryFn: () => axiosInstance.get('/bale-templates/').then(r => r.data),
  });
  const templateList = Array.isArray(templates) ? templates : templates?.results || [];

  // mutations
  const saveTemplate = useMutation({
    mutationFn: (payload) =>
      payload.id
        ? axiosInstance.patch(`/bale-templates/${payload.id}/`, payload)
        : axiosInstance.post('/bale-templates/', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bale-templates'] });
      setTplDialog(false);
      setTplForm({ title: '', event_type: 'announcement', text: '' });
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/bale-templates/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bale-templates'] }),
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

  const importContacts = useMutation({
    mutationFn: (file) => {
      const fd = new FormData();
      fd.append('file', file);
      return axiosInstance.post('/notifications/bale-contacts-import/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: (res) => {
      setResult({ ok: true, message: `ظˆط§ط±ط¯ ط´ط¯: ${formatPersianNumber(res.data.imported_count)} ظ…ط®ط§ط·ط¨` });
      qc.invalidateQueries({ queryKey: ['bale-audience'] });
      qc.invalidateQueries({ queryKey: ['bale-contacts'] });
    },
    onError: (e) => setResult({ ok: false, message: e.response?.data?.error || 'ط®ط·ط§' }),
  });

  const onImportFile = (e) => {
    const file = e.target.files?.[0];
    if (file) importContacts.mutate(file);
    e.target.value = '';
  };

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
      const d = e.department || '(ط¨ط¯ظˆظ† ط¯ظ¾ط§ط±طھظ…ط§ظ†)';
      (map[d] = map[d] || []).push(e);
    });
    return Object.entries(map);
  }, [audience]);

  const allTags = useMemo(() => {
    const set = new Set();
    (audience?.contacts || []).forEach(c => c.tag && set.add(c.tag));
    return [...set];
  }, [audience]);

  const filteredContacts = useMemo(() => {
    const list = audience?.contacts || [];
    if (tagFilter) return list.filter(c => c.tag === tagFilter);
    return list;
  }, [audience, tagFilter]);

  const contactsByCat = useMemo(() => {
    const map = {};
    filteredContacts.forEach(c => {
      const cat = c.category || '(ط¨ط¯ظˆظ† ط¯ط³طھظ‡)';
      (map[cat] = map[cat] || []).push(c);
    });
    return Object.entries(map);
  }, [filteredContacts]);

  const allRecipients = useMemo(() => {
    const set = new Set();
    (audience?.employees || []).forEach(e => e.chat_id && set.add(e.chat_id));
    (audience?.contacts || []).forEach(c => c.chat_id && set.add(c.chat_id));
    return [...set];
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
      if (allSelected) return prev.filter(x => !ids.includes(x));
      const set = new Set(prev);
      ids.forEach(id => set.add(id));
      return [...set];
    });
  };

  // Quick send: template -> all recipients immediately
  const quickSend = async (tpl) => {
    if (!allRecipients.length) {
      setResult({ ok: false, message: 'ظ‡غŒع† ع¯غŒط±ظ†ط¯ظ‡â€Œط§غŒ ط¨ط§ chat_id ط«ط¨طھ ظ†ط´ط¯ظ‡ ط§ط³طھ' });
      return;
    }
    setSending(true);
    try {
      const res = await axiosInstance.post('/notifications/bale-bulk-send/', {
        subject: tpl.title,
        text: tpl.text,
        chat_ids: allRecipients,
      });
      setResult({ ok: true, message: `ط§ط±ط³ط§ظ„ ط´ط¯: ${formatPersianNumber(res.data.sent)} ظ…ظˆظپظ‚طŒ ${formatPersianNumber(res.data.failed.length)} ظ†ط§ظ…ظˆظپظ‚` });
    } catch (e) {
      setResult({ ok: false, message: e.response?.data?.error || 'ط®ط·ط§ ط¯ط± ط§ط±ط³ط§ظ„' });
    } finally {
      setSending(false);
    }
  };

  const sendBulk = async () => {
    if (!text.trim()) { setResult({ ok: false, message: 'ظ…طھظ† ظ¾غŒط§ظ… ط§ظ„ط²ط§ظ…غŒ ط§ط³طھ' }); return; }
    if (selected.length === 0) { setResult({ ok: false, message: 'ظ‡غŒع† ع¯غŒط±ظ†ط¯ظ‡â€Œط§غŒ ط§ظ†طھط®ط§ط¨ ظ†ط´ط¯ظ‡' }); return; }
    setSending(true);
    try {
      const res = await axiosInstance.post('/notifications/bale-bulk-send/', {
        subject,
        text,
        chat_ids: selected,
      });
      setResult({ ok: true, message: `ط§ط±ط³ط§ظ„ ط´ط¯: ${formatPersianNumber(res.data.sent)} ظ…ظˆظپظ‚طŒ ${formatPersianNumber(res.data.failed)} ظ†ط§ظ…ظˆظپظ‚` });
      setConfirmOpen(false);
      setSelected([]);
      setText('');
      setSubject('');
    } catch (e) {
      setResult({ ok: false, message: e.response?.data?.error || 'ط®ط·ط§ ط¯ط± ط§ط±ط³ط§ظ„' });
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
                    <TextField size="small" placeholder="chat_id" value={editId} sx={{ width: 140 }} onChange={e => setEditId(e.target.value)} />
                    <Button size="small" variant="contained" onClick={() => fillChatId.mutate({ id: x.id, chat_id: editId.trim() })}>ط°ط®غŒط±ظ‡</Button>
                    <Button size="small" onClick={() => { setEditTarget(null); setEditId(''); }}>ظ„ط؛ظˆ</Button>
                  </>
                ) : (
                  <>
                    <Typography variant="caption" color="textSecondary">{x.chat_id}</Typography>
                    {editable && (
                      <IconButton size="small" onClick={() => { setEditTarget(x.id); setEditId(x.chat_id); }}><EditIcon fontSize="small" /></IconButton>
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

      {/* ===== ظ‚ط§ظ„ط¨â€Œظ‡ط§ + ط§ظ‚ط¯ط§ظ… ط³ط±غŒط¹ ===== */}
      <Paper sx={{ p: 2.5, borderRadius: '10px', mb: 2, background: 'linear-gradient(135deg, rgba(245,158,11,0.06), rgba(255,255,255,0.3))', border: '1px solid rgba(245,158,11,0.18)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Button size="small" onClick={() => setTplOpen(!tplOpen)} startIcon={tplOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}>
            <Typography variant="subtitle1" fontWeight={800}>ظ‚ط§ظ„ط¨â€Œظ‡ط§غŒ ظ¾غŒط§ظ… ظˆ ط§ظ‚ط¯ط§ظ… ط³ط±غŒط¹</Typography>
          </Button>
          <Button size="small" startIcon={<AddIcon />} onClick={() => { setTplForm({ title: '', event_type: 'announcement', text: '' }); setTplDialog(true); }}>
            ظ‚ط§ظ„ط¨ ط¬ط¯غŒط¯
          </Button>
        </Box>
        <Collapse in={tplOpen}>
          {templateList.length === 0 ? (
            <Typography variant="caption" color="textSecondary">
              ظ‡ظ†ظˆط² ظ‚ط§ظ„ط¨غŒ ط°ط®غŒط±ظ‡ ظ†ط´ط¯ظ‡ ط§ط³طھ. ط¨ط±ط§غŒ ط§ط³طھظپط§ط¯ظ‡ظ” ط³ط±غŒط¹ (طھظˆظ„ط¯طŒ ظ…ط²ط§غŒط§طŒ ظپغŒط´ ظˆ â€¦) غŒع© ظ‚ط§ظ„ط¨ ط¨ط³ط§ط²غŒط¯.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {templateList.map(t => (
                <Box key={t.id} sx={{
                  p: 1.5, borderRadius: '10px', border: '1px solid rgba(245,158,11,0.15)',
                  background: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap',
                }}>
                  <Chip size="small" label={eventLabel(t.event_type)} sx={{ bgcolor: `${eventColor(t.event_type)}20`, color: eventColor(t.event_type), fontWeight: 700 }} />
                  <Typography variant="body2" fontWeight={700}>{t.title}</Typography>
                  <Typography variant="caption" color="textSecondary" sx={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.text}</Typography>
                  <Button size="small" variant="contained" onClick={() => quickSend(t)} disabled={sending}
                    sx={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)' }}>
                    <BoltIcon fontSize="small" /> ط§ط±ط³ط§ظ„ ط³ط±غŒط¹
                  </Button>
                  <IconButton size="small" onClick={() => { setTplForm({ id: t.id, title: t.title, event_type: t.event_type, text: t.text }); setTplDialog(true); }}><EditIcon fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => deleteTemplate.mutate(t.id)}><DeleteIcon fontSize="small" /></IconButton>
                </Box>
              ))}
            </Stack>
          )}
        </Collapse>
      </Paper>

      {/* ===== ع¯ط±ظˆظ‡â€Œظ‡ط§غŒ ظ‡ظˆط´ظ…ظ†ط¯ ===== */}
      <Paper sx={{ p: 2.5, borderRadius: '10px', mb: 2, background: 'rgba(255,255,255,0.5)' }}>
        <Button size="small" onClick={() => setSegmentsOpen(!segmentsOpen)} startIcon={segmentsOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}>
          <Typography variant="subtitle1" fontWeight={800}>ع¯ط±ظˆظ‡â€Œظ‡ط§غŒ ظ‡ظˆط´ظ…ظ†ط¯ (ط§ط±ط³ط§ظ„ ظ‡ط¯ظپظ…ظ†ط¯)</Typography>
        </Button>
        <Collapse in={segmentsOpen}>
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 1 }}>
              ط¨ط¯ظˆظ† طھغŒع© ط¯ط³طھغŒطŒ ط§ط² ظ…غŒط§ظ† ع¯ط±ظˆظ‡â€Œظ‡ط§غŒ ط§ط²ظ¾غŒط´â€Œط³ط§ط®طھظ‡â€Œط´ط¯ظ‡ ط§ظ†طھط®ط§ط¨ ع©ظ†غŒط¯.
            </Typography>
            <SegmentsPicker
              onSelect={(chatIds) => { setSelected(chatIds); setSegmentsOpen(false); }}
            />
          </Box>
        </Collapse>
      </Paper>

      {/* ===== ط§ظ†طھط®ط§ط¨ ع¯غŒط±ظ†ط¯ظ‡ + ط§ط±ط³ط§ظ„ ط¯ط³طھغŒ ===== */}
      <Paper sx={{ p: 2.5, borderRadius: '10px', mb: 2, background: 'rgba(255,255,255,0.5)' }}>
        <Button size="small" onClick={() => setAudienceOpen(!audienceOpen)} startIcon={audienceOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}>
          <Typography variant="subtitle1" fontWeight={800}>ط§ظ†طھط®ط§ط¨ ع¯غŒط±ظ†ط¯ظ‡ ظˆ ط§ط±ط³ط§ظ„</Typography>
        </Button>
        <Collapse in={audienceOpen}>
          <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <TextField size="small" label="ظ…ظˆط¶ظˆط¹" value={subject} onChange={e => setSubject(e.target.value)} />
            <TextField size="small" label="ظ…طھظ† ظ¾غŒط§ظ…" value={text} multiline rows={3} onChange={e => setText(e.target.value)} />

            {/* recipients */}
            <Box>
              {/* stored contacts */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Button size="small" onClick={() => setOpenContacts(!openContacts)} startIcon={openContacts ? <ExpandLessIcon /> : <ExpandMoreIcon />}>
                  <Typography variant="body2" fontWeight={700}>ظ…ط®ط§ط·ط¨ط§ظ† ط°ط®غŒط±ظ‡â€Œط´ط¯ظ‡</Typography>
                </Button>
                <Button size="small" startIcon={<AddIcon />} onClick={() => { setContactForm({ name: '', chat_id: '', category: '', tag: '' }); setContactDialog(true); }}>ط§ظپط²ظˆط¯ظ†</Button>
                <Button size="small" onClick={() => importFileRef.current?.click()} color="secondary">ظˆط§ط±ط¯ع©ط±ط¯ظ† ط§ع©ط³ظ„</Button>
                <input ref={importFileRef} type="file" hidden accept=".xlsx,.xls" onChange={onImportFile} />
              </Box>
              {allTags.length > 0 && (
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                  <Chip size="small" label="ظ‡ظ…ظ‡" variant={tagFilter === '' ? 'filled' : 'outlined'} color="primary" onClick={() => setTagFilter('')} />
                  {allTags.map(t => (
                    <Chip key={t} size="small" label={t} variant={tagFilter === t ? 'filled' : 'outlined'} color="secondary" onClick={() => setTagFilter(tagFilter === t ? '' : t)} />
                  ))}
                </Box>
              )}
              <Collapse in={openContacts}>
                {contactsByCat.length === 0 ? (
                  <Typography variant="caption" color="textSecondary">ظ…ط®ط§ط·ط¨ ط°ط®غŒط±ظ‡â€Œط´ط¯ظ‡â€Œط§غŒ ظ†غŒط³طھ.</Typography>
                ) : contactsByCat.map(([cat, items]) => (
                  <Box key={cat} sx={{ mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                      <Checkbox size="small" checked={items.every(x => selected.includes(x.chat_id))}
                        indeterminate={items.some(x => selected.includes(x.chat_id)) && !items.every(x => selected.includes(x.chat_id))}
                        onChange={() => toggleGroup(items)} />
                      <Typography variant="body2" fontWeight={700}>{cat}</Typography>
                      <Chip size="small" label={formatPersianNumber(items.length)} />
                    </Box>
                    <Stack spacing={0.15} sx={{ pl: 2.5 }}>
                      {items.map(c => (
                        <Box key={c.chat_id} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <Checkbox size="small" checked={selected.includes(c.chat_id)} onChange={() => toggle(c.chat_id)} />
                          <Typography variant="body2" noWrap>{c.name}</Typography>
                          {c.tag && <Chip size="small" label={c.tag} sx={{ height: 18, fontSize: 10 }} color="secondary" />}
                          <Typography variant="caption" color="textSecondary">{c.chat_id}</Typography>
                          <IconButton size="small" onClick={() => { setContactForm({ id: c.id, name: c.name, chat_id: c.chat_id, category: c.category, tag: c.tag || '' }); setContactDialog(true); }}><EditIcon fontSize="small" /></IconButton>
                          <IconButton size="small" color="error" onClick={() => deleteContact.mutate(c.id)}><DeleteIcon fontSize="small" /></IconButton>
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                ))}
              </Collapse>

              {/* employees */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5, mt: 1 }}>
                <Button size="small" onClick={() => setOpenEmployees(!openEmployees)} startIcon={openEmployees ? <ExpandLessIcon /> : <ExpandMoreIcon />}>
                  <Typography variant="body2" fontWeight={700}>ظ¾ط±ط³ظ†ظ„ (ط¨ط± ط§ط³ط§ط³ ط¯ظ¾ط§ط±طھظ…ط§ظ†)</Typography>
                </Button>
              </Box>
              <Collapse in={openEmployees}>
                {employeesByDept.length === 0 ? (
                  <Typography variant="caption" color="textSecondary">ظ¾ط±ط³ظ†ظ„غŒ ط¨ط§ chat_id ط«ط¨طھ ظ†ط´ط¯ظ‡ ط§ط³طھ.</Typography>
                ) : employeesByDept.map(([dept, items]) => group(dept, items, '#6366f1', <PeopleIcon sx={{ fontSize: 14 }} />, true))}
              </Collapse>

              {/* missing employees */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5, mt: 1 }}>
                <Button size="small" onClick={() => setOpenMissing(!openMissing)} startIcon={openMissing ? <ExpandLessIcon /> : <ExpandMoreIcon />}>
                  <Typography variant="body2" fontWeight={700}>ظ¾ط±ط³ظ†ظ„ ط¨ط¯ظˆظ† chat_id (ط«ط¨طھ ط³ط±غŒط¹)</Typography>
                </Button>
              </Box>
              <Collapse in={openMissing}>
                {(audience?.employees_without_chat_id || []).length === 0 ? (
                  <Typography variant="caption" color="textSecondary">ظ‡ظ…ظ‡ظ” ظ¾ط±ط³ظ†ظ„ ط¯ط§ط±ط§غŒ chat_id ظ‡ط³طھظ†ط¯.</Typography>
                ) : (
                  <Stack spacing={0.5}>
                    {(audience.employees_without_chat_id || []).map(emp => (
                      <Box key={emp.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography variant="body2" sx={{ minWidth: 160 }}>{emp.name}</Typography>
                        <Chip size="small" label={emp.mobile} variant="outlined" />
                        {fillTarget === emp.id ? (
                          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                            <TextField size="small" placeholder="chat_id" value={fillId} sx={{ width: 130 }} onChange={e => setFillId(e.target.value)} />
                            <Button size="small" variant="contained" onClick={() => fillChatId.mutate({ id: emp.id, chat_id: fillId.trim() })}>ط°ط®غŒط±ظ‡</Button>
                            <Button size="small" onClick={() => { setFillTarget(null); setFillId(''); }}>ظ„ط؛ظˆ</Button>
                          </Box>
                        ) : (
                          <Button size="small" variant="outlined" onClick={() => { setFillTarget(emp.id); setFillId(''); }}>ط«ط¨طھ chat_id</Button>
                        )}
                      </Box>
                    ))}
                  </Stack>
                )}
              </Collapse>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Chip label={`${formatPersianNumber(selected.length)} ع¯غŒط±ظ†ط¯ظ‡`} color="primary" />
              <Button variant="contained" startIcon={<SendIcon />} disabled={sending || !text || selected.length === 0}
                onClick={() => setConfirmOpen(true)}
                sx={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}>
                {sending ? <CircularProgress size={18} color="inherit" /> : 'ط§ط¯ط§ظ…ظ‡'}
              </Button>
            </Box>
          </Box>
        </Collapse>
      </Paper>

      {/* Dialogs */}
      <Dialog open={tplDialog} onClose={() => setTplDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>ظ‚ط§ظ„ط¨ ظ¾غŒط§ظ…</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <TextField size="small" label="ط¹ظ†ظˆط§ظ† ظ‚ط§ظ„ط¨" value={tplForm.title}
            onChange={e => setTplForm(p => ({ ...p, title: e.target.value }))} />
          <FormControl size="small" fullWidth>
            <InputLabel>ظ†ظˆط¹ ظ…ظ†ط§ط³ط¨طھ</InputLabel>
            <Select value={tplForm.event_type} label="ظ†ظˆط¹ ظ…ظ†ط§ط³ط¨طھ"
              onChange={e => setTplForm(p => ({ ...p, event_type: e.target.value }))}>
              {EVENT_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField size="small" label="ظ…طھظ† ظ¾غŒط§ظ…" value={tplForm.text} multiline rows={4}
            helperText="ظ…طھط؛غŒط±ظ‡ط§: {name}طŒ {first_name}طŒ {last_name}طŒ {employee_id}طŒ {national_id}طŒ {mobile}طŒ {department}طŒ {job_title}"
            onChange={e => setTplForm(p => ({ ...p, text: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTplDialog(false)}>ط§ظ†طµط±ط§ظپ</Button>
          <Button variant="contained" disabled={!tplForm.title || !tplForm.text}
            onClick={() => saveTemplate.mutate({ id: tplForm.id, ...tplForm })}
            sx={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)' }}>
            ط°ط®غŒط±ظ‡ ظ‚ط§ظ„ط¨
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={contactDialog} onClose={() => setContactDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>ظ…ط®ط§ط·ط¨ ط¨ظ„ظ‡</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <TextField size="small" label="ظ†ط§ظ… / ط¹ظ†ظˆط§ظ†" value={contactForm.name}
            onChange={e => setContactForm(p => ({ ...p, name: e.target.value }))} />
          <TextField size="small" label="chat_id" value={contactForm.chat_id}
            onChange={e => setContactForm(p => ({ ...p, chat_id: e.target.value }))} />
          <TextField size="small" label="ط¯ط³طھظ‡â€Œط¨ظ†ط¯غŒ (ظ…ط«ظ„ط§ظ‹ ظ…ط§ظ„غŒطŒ ظپظ†غŒ)" value={contactForm.category}
            onChange={e => setContactForm(p => ({ ...p, category: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setContactDialog(false)}>ط§ظ†طµط±ط§ظپ</Button>
          <Button variant="contained" disabled={!contactForm.name || !contactForm.chat_id}
            onClick={() => saveContact.mutate({ id: contactForm.id, ...contactForm })}
            sx={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>ط°ط®غŒط±ظ‡</Button>
        </DialogActions>
      </Dialog>

      {/* ===== Confirm send dialog ===== */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>طھط£غŒغŒط¯ ط§ط±ط³ط§ظ„</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            ظ¾غŒط§ظ… ط²غŒط± ط¨ظ‡ <strong>{formatPersianNumber(selected.length)} ع¯غŒط±ظ†ط¯ظ‡</strong> ط§ط±ط³ط§ظ„ ظ…غŒط´ظˆط¯:
          </Typography>
          <Paper sx={{ p: 1.25, mt: 1, background: 'rgba(255,255,255,0.6)', borderRadius: '10px' }}>
            {subject && <Typography variant="subtitle2" fontWeight={700}>{subject}</Typography>}
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{text}</Typography>
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>ط¨ط§ط²ع¯ط´طھ</Button>
          <Button variant="contained" startIcon={<SendIcon />} onClick={sendBulk} disabled={sending}
            sx={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}>
            {sending ? <CircularProgress size={18} color="inherit" /> : 'ط§ط±ط³ط§ظ„ ظ‚ط·ط¹غŒ'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BaleAudiencePanel;
