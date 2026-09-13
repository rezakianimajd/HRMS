import React, { useState } from 'react';
import {
  Box, Typography, Paper, Button, IconButton, Chip, Avatar, Grid,
  Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel,
  Select, MenuItem, TextField, CircularProgress, Stack, Checkbox, LinearProgress,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import LogoutIcon from '@mui/icons-material/Logout';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CheckboxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import { useChecklists, useCreateChecklist, useToggleChecklistItem } from '../core/hooks/useLifecycle';
import { useEmployees } from '../core/hooks/useEmployees';
import { toPersianDigits } from '../core/utils/numberUtils';

const KIND_META = {
  onboarding: { label: 'ظˆط±ظˆط¯ / ط®ظˆط´â€Œط¢ظ…ط¯ع¯ظˆغŒغŒ', color: '#10b981', icon: <PersonAddAlt1Icon fontSize="small" /> },
  offboarding: { label: 'ط®ط±ظˆط¬ / طھط³ظˆغŒظ‡', color: '#ef4444', icon: <LogoutIcon fontSize="small" /> },
};

const DEFAULT_ONBOARDING_ITEMS = [
  'طھع©ظ…غŒظ„ ظ…ط¯ط§ط±ع© ظ‡ظˆغŒطھغŒ ظˆ ظ‚ط±ط§ط±ط¯ط§ط¯',
  'طھط­ظˆغŒظ„ طھط¬ظ‡غŒط²ط§طھ (ظ„ظ¾â€Œطھط§ظ¾ / ظ…ظˆط¨ط§غŒظ„ / ظ…غŒط²)',
  'طھط¹ط±غŒظپ ط¯ط³طھط±ط³غŒ ظ†ط±ظ…â€Œط§ظپط²ط§ط±ظ‡ط§',
  'ظ…ط¹ط±ظپغŒ ط¨ظ‡ طھغŒظ… ظˆ ط³ط±ظ¾ط±ط³طھ',
];

const DEFAULT_OFFBOARDING_ITEMS = [
  'طھط­ظˆغŒظ„ ط§ظ…ظˆط§ظ„ ظˆ طھط¬ظ‡غŒط²ط§طھ',
  'طھط³ظˆغŒظ‡ ظ…ط§ظ„غŒ (ط­ظ‚ظˆظ‚طŒ ظˆط§ظ…طŒ ظ…ط³ط§ط¹ط¯ظ‡)',
  'طھط³ظˆغŒظ‡ ظ…ط±ط®طµغŒ ظ…ط§ظ†ط¯ظ‡',
  'ط؛غŒط±ظپط¹ط§ظ„â€Œط³ط§ط²غŒ ط¯ط³طھط±ط³غŒâ€Œظ‡ط§',
];

const LifecyclePage = () => {
  const [tab, setTab] = useState('onboarding');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ employee: '', kind: 'onboarding', items: [] });

  const { data, isLoading } = useChecklists({ kind: tab });
  const { data: employees } = useEmployees({ is_active: true });
  const empList = Array.isArray(employees) ? employees : employees?.results || [];

  const createMutation = useCreateChecklist();
  const toggleMutation = useToggleChecklistItem();

  const items = Array.isArray(data) ? data : data?.results || [];

  const openAdd = () => {
    setForm({ employee: '', kind: tab, items: [] });
    setOpen(true);
  };

  const toggleDefaultItem = (item) => {
    setForm((p) => {
      const exists = p.items.includes(item);
      return { ...p, items: exists ? p.items.filter((x) => x !== item) : [...p.items, item] };
    });
  };

  const doCreate = () => {
    const defaults = form.kind === 'onboarding' ? DEFAULT_ONBOARDING_ITEMS : DEFAULT_OFFBOARDING_ITEMS;
    const finalItems = [...new Set([...defaults, ...form.items])];
    createMutation.mutate(
      { employee: form.employee, kind: form.kind },
      {
        onSuccess: (checklist) => {
          const cid = checklist.id;
          // create checklist items sequentially
          (async () => {
            for (const title of finalItems) {
              try {
                const axios = (await import('../core/api/axiosConfig')).default;
                await axios.post('/checklist-items/', { checklist: cid, title });
              } catch (e) { /* ignore */ }
            }
          })();
          setOpen(false);
        },
      }
    );
  };

  return (
    <Box>
      {/* Header */}
      <Paper sx={{
        p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2,
        background: 'linear-gradient(120deg, rgba(139,92,246,0.09), rgba(236,72,153,0.04), rgba(255,255,255,0.3))',
        border: '1px solid rgba(139,92,246,0.16)', borderRadius: '10px',
      }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', boxShadow: '0 8px 24px rgba(139,92,246,0.35)' }}>
          <PlaylistAddCheckIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={800} color="#6d28d9">ط¢ظ†â€Œط¨ظˆط±ط¯غŒظ†ع¯ ظˆ ط¢ظپâ€Œط¨ظˆط±ط¯غŒظ†ع¯</Typography>
          <Typography variant="body2" color="textSecondary">ع†ع©â€Œظ„غŒط³طھ ظˆط±ظˆط¯ ظˆ ط®ط±ظˆط¬ ع©ط§ط±ع©ظ†ط§ظ† ط¨ظ‡â€Œطµظˆط±طھ ع¯ط±ط¯ط´â€Œع©ط§ط± ط§ط³طھط§ظ†ط¯ط§ط±ط¯</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}
          sx={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', borderRadius: '10px', px: 2.5 }}>
          ع†ع©â€Œظ„غŒط³طھ ط¬ط¯غŒط¯
        </Button>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ p: 1, mb: 2, borderRadius: '10px', background: 'rgba(255,255,255,0.6)' }}>
        <Stack direction="row" spacing={1}>
          {Object.entries(KIND_META).map(([k, m]) => (
            <Button key={k} variant={tab === k ? 'contained' : 'outlined'} startIcon={m.icon}
              onClick={() => setTab(k)}
              sx={
                tab === k
                  ? { background: `linear-gradient(135deg, ${m.color}, ${m.color}bb)`, borderRadius: '10px' }
                  : { borderRadius: '10px' }
              }>
              {m.label}
            </Button>
          ))}
        </Stack>
      </Paper>

      {/* Checklists */}
      {isLoading ? (
        <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress /></Box>
      ) : items.length === 0 ? (
        <Paper sx={{ py: 6, textAlign: 'center', borderRadius: '10px', background: 'rgba(255,255,255,0.6)' }}>
          <Typography color="textSecondary">ع†ع©â€Œظ„غŒط³طھغŒ ط«ط¨طھ ظ†ط´ط¯ظ‡ ط§ط³طھ</Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {items.map((c) => {
            const km = KIND_META[c.kind] || KIND_META.onboarding;
            const done = c.items.filter((i) => i.is_completed).length;
            const total = c.items.length;
            const pct = total ? Math.round((done / total) * 100) : 0;
            return (
              <Grid item xs={12} md={6} key={c.id}>
                <Paper sx={{ p: 2, borderRadius: '10px', background: 'rgba(255,255,255,0.6)', border: `1px solid ${km.color}20` }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                    <Avatar sx={{ width: 36, height: 36, bgcolor: km.color }}>{km.icon}</Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body1" fontWeight={700}>{c.employee_name || `ظ¾ط±ط³ظ†ظ„ #${c.employee}`}</Typography>
                      <Typography variant="caption" color="textSecondary">{c.kind_display}</Typography>
                    </Box>
                    <Chip size="small" color={pct === 100 ? 'success' : 'primary'} label={`${toPersianDigits(pct)}ظھ`} />
                  </Box>

                  <LinearProgress variant="determinate" value={pct} sx={{ height: 6, borderRadius: '10px', mb: 1.5, bgcolor: `${km.color}15`, '& .MuiLinearProgress-bar': { bgcolor: km.color } }} />

                  <Stack spacing={0.25}>
                    {c.items.map((it) => (
                      <Box key={it.id} onClick={() => toggleMutation.mutate({ checklistId: c.id, itemId: it.id })}
                        sx={{
                          display: 'flex', alignItems: 'center', gap: 1, py: 0.5, cursor: 'pointer',
                          borderRadius: '10px', px: 0.5, '&:hover': { background: `${km.color}0a` },
                        }}>
                        {it.is_completed ? (
                          <CheckCircleIcon fontSize="small" sx={{ color: km.color }} />
                        ) : (
                          <CheckboxOutlineBlankIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                        )}
                        <Typography variant="body2" sx={{
                          textDecoration: it.is_completed ? 'line-through' : 'none',
                          color: it.is_completed ? 'text.secondary' : 'text.primary',
                        }}>
                          {it.title}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Add dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: '#6d28d9' }}>ع†ع©â€Œظ„غŒط³طھ ط¬ط¯غŒط¯</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <FormControl fullWidth size="small">
            <InputLabel>ظ†ظˆط¹</InputLabel>
            <Select value={form.kind} label="ظ†ظˆط¹" onChange={(e) => setForm((p) => ({ ...p, kind: e.target.value }))}>
              {Object.entries(KIND_META).map(([k, m]) => <MenuItem key={k} value={k}>{m.label}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel>ظ¾ط±ط³ظ†ظ„ *</InputLabel>
            <Select value={form.employee || ''} label="ظ¾ط±ط³ظ†ظ„ *" onChange={(e) => setForm((p) => ({ ...p, employee: e.target.value }))}>
              {empList.map((e) => <MenuItem key={e.id} value={e.id}>{e.full_name} ({e.employee_id})</MenuItem>)}
            </Select>
          </FormControl>

          <Typography variant="caption" color="textSecondary">
            ط§ظ‚ظ„ط§ظ… ظ¾غŒط´â€Œظپط±ط¶ (ط¨ط±ط§غŒ طھغŒع©â€Œع©ط±ط¯ظ† غŒع© ظ…ظˆط±ط¯ ط§ط®طھغŒط§ط±غŒ ع©ظ„غŒع© ع©ظ†غŒط¯):
          </Typography>
          <Stack spacing={0.5}>
            {(form.kind === 'onboarding' ? DEFAULT_ONBOARDING_ITEMS : DEFAULT_OFFBOARDING_ITEMS).map((item) => (
              <Box key={item} onClick={() => toggleDefaultItem(item)} sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }}>
                <Checkbox size="small" checked={form.items.includes(item)} onChange={() => toggleDefaultItem(item)} />
                <Typography variant="body2">{item}</Typography>
              </Box>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>ط§ظ†طµط±ط§ظپ</Button>
          <Button variant="contained" disabled={!form.employee} onClick={doCreate}
            sx={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}>
            ط§غŒط¬ط§ط¯ ع†ع©â€Œظ„غŒط³طھ
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LifecyclePage;