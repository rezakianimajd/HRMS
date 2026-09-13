import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../api/axiosConfig';
import {
  Box, Typography, Paper, TextField, Button, Chip, CircularProgress, Alert,
  Grid, Avatar, IconButton, Divider, Stack, Switch, Dialog, DialogTitle,
  DialogContent, DialogActions, LinearProgress, Tooltip,
} from '@mui/material';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import LibraryBooksOutlinedIcon from '@mui/icons-material/LibraryBooksOutlined';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import EditNoteIcon from '@mui/icons-material/EditNote';
import StorageIcon from '@mui/icons-material/Storage';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ShieldIcon from '@mui/icons-material/Shield';
import { toPersianDigits } from '../../utils/numberUtils';

/* =============================================================================
 * ظ…ط¯غŒط±غŒطھ ظ…ط³غŒط±ظ‡ط§غŒ ط°ط®غŒط±ظ‡â€Œط³ط§ط²غŒ â€” ع¯ظ„ط³ظ…ظˆط±ظپغŒط³ظ… غ²غ°غ²غ¶
 * ============================================================================= */
const StorageManager = () => {
  const qc = useQueryClient();
  const [message, setMessage] = useState(null);
  const [storage, setStorage] = useState({
    base_storage_path: '',
    storage_path_employees: '',
    storage_path_correspondences: '',
    storage_path_documents: '',
  });

  const { data: profile, isLoading } = useQuery({
    queryKey: ['company-profile'],
    queryFn: () => axiosInstance.get('/settings/company-profile/').then(r => r.data),
  });

  useEffect(() => {
    if (profile) {
      setStorage({
        base_storage_path: profile.base_storage_path || '',
        storage_path_employees: profile.storage_path_employees || '',
        storage_path_correspondences: profile.storage_path_correspondences || '',
        storage_path_documents: profile.storage_path_documents || '',
      });
    }
  }, [profile]);

  const saveStorage = useMutation({
    mutationFn: (data) => axiosInstance.put('/settings/company-profile/update/', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company-profile'] });
      setMessage({ ok: true, text: 'ظ…ط³غŒط±ظ‡ط§غŒ ط°ط®غŒط±ظ‡â€Œط³ط§ط²غŒ ط¨ط§ ظ…ظˆظپظ‚غŒطھ ط°ط®غŒط±ظ‡ ط´ط¯ âœ“' });
    },
    onError: (e) => {
      setMessage({ ok: false, text: e.response?.data?.error || 'ط®ط·ط§ ط¯ط± ط°ط®غŒط±ظ‡ ظ…ط³غŒط±ظ‡ط§' });
    },
  });

  if (isLoading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;

  const field = (key, label, sub, icon) => (
    <Box sx={{
      p: 1.5, borderRadius: '10px', mb: 1.5,
      background: 'rgba(59,130,246,0.05)',
      border: '1px solid rgba(59,130,246,0.15)',
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
        <Avatar sx={{ width: 28, height: 28, background: 'linear-gradient(135deg,#3b82f6,#6366f1)', color: '#fff' }}>
          {icon}
        </Avatar>
        <Box>
          <Typography variant="body2" fontWeight={800}>{label}</Typography>
          {sub && <Typography variant="caption" color="textSecondary" display="block">{sub}</Typography>}
        </Box>
      </Box>
      <TextField
        fullWidth size="small" variant="outlined" value={storage[key]}
        placeholder="/var/hr_data/..."
        onChange={e => setStorage(p => ({ ...p, [key]: e.target.value }))}
        dir="ltr"
        sx={{ '& input': { textAlign: 'left', fontFamily: 'monospace' } }}
      />
    </Box>
  );

  return (
    <Box>
      {message && (
        <Alert severity={message.ok ? 'success' : 'error'} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12}>
          {field('base_storage_path', 'ظ…ط³غŒط± ظ¾ط§غŒظ‡ظ” ط°ط®غŒط±ظ‡â€Œط³ط§ط²غŒ', 'ط±غŒط´ظ‡ظ” ظ‡ظ…ظ‡ظ” ظپط§غŒظ„â€Œظ‡ط§غŒ ط¢ظ¾ظ„ظˆط¯غŒ (ظ…ط«ط§ظ„: /var/hr_data)', <StorageIcon sx={{ fontSize: 16 }} />)}
        </Grid>
        <Grid item xs={12} md={4}>
          {field('storage_path_employees', 'ظ…ط¯ط§ط±ع© ظ¾ط±ط³ظ†ظ„', 'ظ¾ط±ظˆظ†ط¯ظ‡â€Œظ‡ط§غŒ ع©ط§ط±ع©ظ†ط§ظ†', <PeopleOutlineIcon sx={{ fontSize: 16 }} />)}
        </Grid>
        <Grid item xs={12} md={4}>
          {field('storage_path_correspondences', 'ظ…ع©ط§طھط¨ط§طھ', 'ظ†ط§ظ…ظ‡â€Œظ‡ط§ ظˆ ط§ط¨ظ„ط§ط؛â€Œظ‡ط§', <LibraryBooksOutlinedIcon sx={{ fontSize: 16 }} />)}
        </Grid>
        <Grid item xs={12} md={4}>
          {field('storage_path_documents', 'ط¨ط§غŒع¯ط§ظ†غŒ ط§ط³ظ†ط§ط¯', 'ط§ط³ظ†ط§ط¯ ط¹ظ…ظˆظ…غŒ ط³ط§ط²ظ…ط§ظ†', <FolderOpenIcon sx={{ fontSize: 16 }} />)}
        </Grid>
      </Grid>

      <Button
        variant="contained"
        startIcon={<CheckCircleIcon />}
        onClick={() => saveStorage.mutate(storage)}
        disabled={saveStorage.isLoading}
        sx={{ mt: 1, background: 'linear-gradient(135deg,#3b82f6,#6366f1)', borderRadius: '10px', px: 2.5 }}
      >
        {saveStorage.isLoading ? 'ط¯ط± ط­ط§ظ„ ط°ط®غŒط±ظ‡...' : 'ط°ط®غŒط±ظ‡ ظ…ط³غŒط±ظ‡ط§'}
      </Button>
    </Box>
  );
};

/* =============================================================================
 * طµط§ط­ط¨ط§ظ† ط§ظ…ط¶ط§ â€” ط¨ط§ ظ†ظ…ظˆظ†ظ‡ ط§ظ…ط¶ط§غŒ ظ‚ط§ط¨ظ„ ط¢ظ¾ظ„ظˆط¯
 * ============================================================================= */
const SignatoryManager = () => {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [message, setMessage] = useState(null);
  const [form, setForm] = useState({ id: null, full_name: '', position: '', national_id: '', signature_image: null });

  const { data, isLoading } = useQuery({
    queryKey: ['signatories'],
    queryFn: () => axiosInstance.get('/signatories/').then(r => r.data),
  });
  const list = Array.isArray(data) ? data : data?.results || [];

  const save = useMutation({
    mutationFn: (payload) => {
      const fd = new FormData();
      fd.append('full_name', payload.full_name || '');
      fd.append('position', payload.position || '');
      fd.append('national_id', payload.national_id || '');
      if (payload.signature_image) fd.append('signature_image', payload.signature_image);
      // Do NOT set Content-Type manually: with FormData the browser/axios sets
      // the correct multipart boundary automatically.
      return payload.id
        ? axiosInstance.patch(`/signatories/${payload.id}/`, fd)
        : axiosInstance.post('/signatories/', fd);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['signatories'] });
      setDialog(false);
      setMessage({ ok: true, text: 'طµط§ط­ط¨ ط§ظ…ط¶ط§ ط°ط®غŒط±ظ‡ ط´ط¯ âœ“' });
      setForm({ id: null, full_name: '', position: '', national_id: '', signature_image: null });
    },
    onError: (e) => {
      setMessage({ ok: false, text: e.response?.data?.error || 'ط®ط·ط§ ط¯ط± ط°ط®غŒط±ظ‡ طµط§ط­ط¨ ط§ظ…ط¶ط§' });
    },
  });

  const remove = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/signatories/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['signatories'] });
      setMessage({ ok: true, text: 'ط­ط°ظپ ط´ط¯' });
    },
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, is_active }) => axiosInstance.patch(`/signatories/${id}/`, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['signatories'] }),
  });

  if (isLoading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;

  return (
    <Box>
      {message && (
        <Alert severity={message.ok ? 'success' : 'error'} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="body2" color="textSecondary" sx={{ maxWidth: 460 }}>
          ط§ظپط±ط§ط¯غŒ ع©ظ‡ ط­ظ‚ ط§ظ…ط¶ط§غŒ ظ‚ط±ط§ط±ط¯ط§ط¯/ط³ظ†ط¯ ط¯ط§ط±ظ†ط¯. ط­ط¯ط§ظ‚ظ„ غ³ ظ†ظپط± ظ¾غŒط´ظ†ظ‡ط§ط¯ ظ…غŒâ€Œط´ظˆط¯ط› ظ‡ظ†ع¯ط§ظ… ط§ظ…ط¶ط§غŒ ظ‚ط±ط§ط±ط¯ط§ط¯ ط§ط² ظ‡ظ…غŒظ† ظپظ‡ط±ط³طھ ط§ظ†طھط®ط§ط¨ ظ…غŒâ€Œط´ظˆظ†ط¯.
        </Typography>
        <Button
          variant="contained" startIcon={<AddIcon />}
          onClick={() => { setForm({ id: null, full_name: '', position: '', national_id: '', signature_image: null }); setDialog(true); }}
          sx={{ background: 'linear-gradient(135deg,#10b981,#059669)', borderRadius: '10px', px: 2 }}
        >
          ط§ظپط²ظˆط¯ظ† طµط§ط­ط¨ ط§ظ…ط¶ط§
        </Button>
      </Box>

      {list.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: '10px' }}>
          <ShieldIcon sx={{ fontSize: 52, color: 'text.disabled', mb: 1 }} />
          <Typography variant="body2" color="textSecondary">ظ‡ظ†ظˆط² طµط§ط­ط¨ ط§ظژظ…ط¶ط§غŒغŒ طھط¹ط±غŒظپ ظ†ط´ط¯ظ‡ ط§ط³طھ.</Typography>
        </Paper>
      ) : (
        <Grid container spacing={1.5}>
          {list.map(s => (
            <Grid item xs={12} sm={6} md={4} key={s.id}>
              <Paper sx={{
                p: 2, borderRadius: '10px', position: 'relative',
                background: 'linear-gradient(135deg, rgba(16,185,129,0.06), rgba(255,255,255,0.4))',
                border: '1px solid rgba(16,185,129,0.18)',
                transition: 'all .2s ease',
                '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 10px 26px rgba(16,185,129,0.15)' },
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                  {s.signature_image_url ? (
                    <img
                      src={s.signature_image_url} alt="ط§ظ…ط¶ط§"
                      style={{ width: 88, height: 46, objectFit: 'contain', background: '#f8fafc', borderRadius: '10px', padding: 4 }}
                    />
                  ) : (
                    <Avatar sx={{ width: 88, height: 46, background: 'rgba(16,185,129,0.12)', borderRadius: '10px' }}>
                      <EditNoteIcon sx={{ color: '#10b981', fontSize: 28 }} />
                    </Avatar>
                  )}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2" fontWeight={800} noWrap>{s.full_name}</Typography>
                    <Typography variant="caption" color="textSecondary" display="block">{s.position || 'â€”'}</Typography>
                    {s.national_id && (
                      <Typography variant="caption" color="textSecondary" display="block">
                        ع©ط¯ ظ…ظ„غŒ: {toPersianDigits(s.national_id)}
                      </Typography>
                    )}
                  </Box>
                </Box>
                <Divider sx={{ mb: 1 }} />
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Switch
                      size="small"
                      checked={Boolean(s.is_active !== false)}
                      onChange={e => toggleActive.mutate({ id: s.id, is_active: e.target.checked })}
                    />
                    <Chip size="small" label={s.is_active !== false ? 'ظپط¹ط§ظ„' : 'ط؛غŒط±ظپط¹ط§ظ„'} color={s.is_active !== false ? 'success' : 'default'} variant="outlined" />
                  </Box>
                  <Box>
                    <Tooltip title="ظˆغŒط±ط§غŒط´">
                      <IconButton size="small" color="primary"
                        onClick={() => { setForm({ id: s.id, full_name: s.full_name, position: s.position, national_id: s.national_id, signature_image: null }); setDialog(true); }}>
                        <EditNoteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="ط­ط°ظپ">
                      <IconButton size="small" color="error" onClick={() => remove.mutate(s.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: '#10b981' }}>{form.id ? 'ظˆغŒط±ط§غŒط´ طµط§ط­ط¨ ط§ظ…ط¶ط§' : 'ط§ظپط²ظˆط¯ظ† طµط§ط­ط¨ ط§ظ…ط¶ط§'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <TextField fullWidth size="small" label="ظ†ط§ظ… ظˆ ظ†ط§ظ… ط®ط§ظ†ظˆط§ط¯ع¯غŒ *" value={form.full_name}
            onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} />
          <TextField fullWidth size="small" label="ط³ظ…طھ / ط¹ظ†ظˆط§ظ†" value={form.position}
            onChange={e => setForm(p => ({ ...p, position: e.target.value }))} />
          <TextField fullWidth size="small" label="ع©ط¯ ظ…ظ„غŒ" value={form.national_id}
            onChange={e => setForm(p => ({ ...p, national_id: e.target.value }))} />
          <Button component="label" variant="outlined" startIcon={<UploadFileIcon />} fullWidth>
            {form.signature_image ? form.signature_image.name : 'ط¢ظ¾ظ„ظˆط¯ ظ†ظ…ظˆظ†ظ‡ ط§ظ…ط¶ط§ (طھطµظˆغŒط±)'}
            <input type="file" hidden accept="image/*"
              onChange={e => setForm(p => ({ ...p, signature_image: e.target.files?.[0] || null }))} />
          </Button>
          {save.isLoading && <LinearProgress sx={{ borderRadius: '10px' }} />}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)}>ط§ظ†طµط±ط§ظپ</Button>
          <Button variant="contained" disabled={!form.full_name || save.isLoading}
            onClick={() => save.mutate(form)}
            sx={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
            ط°ط®غŒط±ظ‡
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

const ManagementSettingsPanel = () => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Storage paths */}
      <Paper sx={{
        p: 2.5, borderRadius: '10px',
        background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(255,255,255,0.3))',
        border: '1px solid rgba(59,130,246,0.2)',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <Avatar sx={{ width: 40, height: 40, background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}>
            <StorageIcon sx={{ color: '#fff', fontSize: 22 }} />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight={800} sx={{ color: '#1d4ed8' }}>ظ…ط¯غŒط±غŒطھ ظ…ط³غŒط± ط°ط®غŒط±ظ‡â€Œط³ط§ط²غŒ ظپط§غŒظ„â€Œظ‡ط§</Typography>
            <Typography variant="caption" color="textSecondary">ظ‡ط± ظ†ظˆط¹ ظپط§غŒظ„ ط¯ط± ظ¾ظˆط´ظ‡ظ” ظ…ط®طµظˆطµ ط®ظˆط¯ ط°ط®غŒط±ظ‡ ظ…غŒâ€Œط´ظˆط¯ â€” ظ‚ط§ط¨ظ„ ظ…ط³غŒط±ط¯ظ‡غŒ ط¯ظ‚غŒظ‚</Typography>
          </Box>
        </Box>
        <Divider sx={{ mb: 2 }} />
        <StorageManager />
      </Paper>

      {/* Signatories */}
      <Paper sx={{
        p: 2.5, borderRadius: '10px',
        background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(255,255,255,0.3))',
        border: '1px solid rgba(16,185,129,0.2)',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <Avatar sx={{ width: 40, height: 40, background: 'linear-gradient(135deg,#10b981,#059669)' }}>
            <EditNoteIcon sx={{ color: '#fff', fontSize: 22 }} />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight={800} sx={{ color: '#047857' }}>طµط§ط­ط¨ط§ظ† ط§ظ…ط¶ط§ (ط§ظ…ط¶ط§غŒ ظ…ط¬ط§ط²)</Typography>
            <Typography variant="caption" color="textSecondary">ط§ظپط±ط§ط¯ ط¯ط§ط±ط§غŒ ط­ظ‚ ط§ظ…ط¶ط§غŒ ظ‚ط±ط§ط±ط¯ط§ط¯ + ظ†ظ…ظˆظ†ظ‡ ط§ظ…ط¶ط§غŒ ط¢ظ¾ظ„ظˆط¯غŒ</Typography>
          </Box>
        </Box>
        <Divider sx={{ mb: 2 }} />
        <SignatoryManager />
      </Paper>
    </Box>
  );
};

export default ManagementSettingsPanel;