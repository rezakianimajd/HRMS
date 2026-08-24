import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../core/api/axiosConfig';
import {
  Box, Typography, Paper, Grid, Avatar, Chip, CircularProgress, TextField,
  InputAdornment, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { toJalali } from '../../core/utils/dateUtils';
import { toPersianDigits } from '../../core/utils/numberUtils';
import { PRIORITY_LABELS, PRIORITY_COLORS } from './config';
import JalaliDatePicker from '../../core/components/ui/JalaliDatePicker';

/* Generic glassmorphism CRUD for correspondences. */
export const CorrespondenceCRUD = ({
  endpoint, title, color, icon, searchPlaceholder, fields, columns, defaultForm = {},
}) => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [file, setFile] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: [endpoint],
    queryFn: () => axiosInstance.get(endpoint).then(r => r.data.results || r.data),
  });

  const saveMutation = useMutation({
    mutationFn: (payload) => {
      if (file) {
        const fd = new FormData();
        Object.entries(payload).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== '') fd.append(k, v);
        });
        fd.append('file', file);
        return editing
          ? axiosInstance.patch(`${endpoint}${editing.id}/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
          : axiosInstance.post(endpoint, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      return editing
        ? axiosInstance.patch(`${endpoint}${editing.id}/`, payload)
        : axiosInstance.post(endpoint, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [endpoint] });
      setOpen(false); setEditing(null); setForm({}); setFile(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => axiosInstance.delete(`${endpoint}${id}/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [endpoint] }),
  });

  const items = Array.isArray(data) ? data : data?.results || [];
  const filtered = search.trim()
    ? items.filter(it => fields.some(f => String(it[f.key] || '').toLowerCase().includes(search.toLowerCase())))
    : items;

  const openNew = () => { setEditing(null); setForm({ ...defaultForm }); setFile(null); setOpen(true); };
  const openEdit = (it) => { setEditing(it); setForm({ ...it }); setFile(null); setOpen(true); };

  const renderValue = (it, col) => {
    if (col.render) return col.render(it);
    const v = it[col.key];
    if (col.key === 'priority') {
      return <Chip size="small" label={PRIORITY_LABELS[v] || v} sx={{ color: PRIORITY_COLORS[v], borderColor: PRIORITY_COLORS[v] }} variant="outlined" />;
    }
    if (col.key === 'date' || col.key.endsWith('_date')) return toJalali(v);
    if (col.key === 'number' || col.key === 'code') return toPersianDigits(v);
    return v || '—';
  };

  const renderField = (f) => {
    if (f.render) return React.cloneElement(f.render(form, setForm), { key: f.key });
    if (f.type === 'date') {
      return (
        <JalaliDatePicker key={f.key} fullWidth label={f.label} required={f.required}
          value={form[f.key] || ''} onChange={g => setForm(p => ({ ...p, [f.key]: g }))} />
      );
    }
    return (
      <TextField key={f.key} fullWidth size="small" label={f.label}
        type={f.type || 'text'} value={form[f.key] || ''}
        onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
        multiline={f.multiline} rows={f.multiline ? 3 : 1} required={f.required} />
    );
  };

  return (
    <Box>
      {/* Toolbar - glass */}
      <Paper sx={{
        mb: 2, p: 1.5,
        display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap',
        background: `linear-gradient(135deg, ${color}0d, ${color}04)`,
        border: `1px solid ${color}20`,
        backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
        borderRadius: 3,
      }}>
        <TextField
          size="small" placeholder={searchPlaceholder}
          value={search} onChange={e => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          sx={{ flex: 1, minWidth: 220 }}
        />
        <Button variant="contained" onClick={openNew}
          sx={{ background: `linear-gradient(135deg, ${color}, ${color}90)`, '&:hover': { background: color } }}>
          افزودن
        </Button>
      </Paper>

      {/* Cards */}
      {isLoading ? (
        <Box sx={{ p: 6, textAlign: 'center' }}><CircularProgress size={24} /></Box>
      ) : filtered.length === 0 ? (
        <Paper sx={{
          p: 5, textAlign: 'center',
          background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(10px)', borderRadius: 3,
        }}>
          <Typography color="textSecondary">موردی یافت نشد</Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {filtered.map((it) => (
            <Grid item xs={12} sm={6} lg={4} key={it.id}>
              <Paper sx={{
                p: 2, height: '100%',
                background: `linear-gradient(160deg, ${color}0a, rgba(255,255,255,0.4))`,
                border: `1px solid ${color}20`,
                backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
                borderRadius: 3,
                transition: 'all 0.25s ease',
                '&:hover': { transform: 'translateY(-3px)', boxShadow: `0 12px 28px ${color}22` },
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                  <Avatar sx={{
                    width: 42, height: 42,
                    background: `linear-gradient(135deg, ${color}, ${color}90)`,
                    boxShadow: `0 4px 12px ${color}40`,
                  }}>
                    {icon}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    {columns.find(c => c.primary) && (
                      <Typography variant="subtitle1" fontWeight={700} noWrap>
                        {renderValue(it, columns.find(c => c.primary))}
                      </Typography>
                    )}
                    {columns.find(c => c.secondary) && (
                      <Typography variant="caption" color="textSecondary" noWrap display="block">
                        {renderValue(it, columns.find(c => c.secondary))}
                      </Typography>
                    )}
                  </Box>
                </Box>

                {/* Detail rows */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  {columns.filter(c => !c.primary && !c.secondary).map(c => (
                    <Box key={c.key} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="caption" color="textSecondary" sx={{ minWidth: 70 }}>{c.label}</Typography>
                      <Box sx={{ flex: 1 }}>{renderValue(it, c)}</Box>
                    </Box>
                  ))}
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 0.5, mt: 1, pt: 1, borderTop: `1px solid ${color}18` }}>
                  {/* Attachment indicator + open/download */}
                  {it.file ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Chip
                        label="پیوست دارد"
                        size="small"
                        variant="outlined"
                        component="a"
                        href={it.file}
                        target="_blank"
                        rel="noreferrer"
                        clickable
                        sx={{ color, borderColor: `${color}55`, fontWeight: 600, '&:hover': { background: `${color}14` } }}
                      />
                    </Box>
                  ) : (
                    <Typography variant="caption" color="textSecondary">بدون پیوست</Typography>
                  )}
                  <Box sx={{ display: 'flex', gap: 0.25 }}>
                    {it.file && (
                      <Tooltip title="باز کردن پیوست" placement="top">
                        <IconButton size="small" component="a" href={it.file} target="_blank" rel="noreferrer">
                          <OpenInNewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <IconButton size="small" onClick={() => openEdit(it)}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => deleteMutation.mutate(it.id)}><DeleteIcon fontSize="small" /></IconButton>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color, background: `linear-gradient(135deg, ${color}10, transparent)` }}>
          {editing ? `ویرایش ${title}` : `افزودن ${title}`}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
            {fields.map(renderField)}
            <Box>
              <Typography variant="caption" color="textSecondary" sx={{ mb: 0.5, display: 'block' }}>
                فایل پیوست (اختیاری)
              </Typography>
              <input id={`file-${endpoint}`} type="file" hidden onChange={e => setFile(e.target.files[0] || null)} />
              <Button variant="outlined" size="small" onClick={() => document.getElementById(`file-${endpoint}`).click()}>
                {file ? file.name : (editing?.file ? 'تعویض فایل پیوست' : 'انتخاب فایل پیوست')}
              </Button>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>انصراف</Button>
          <Button variant="contained" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isLoading}
            sx={{ background: `linear-gradient(135deg, ${color}, ${color}90)` }}>
            {saveMutation.isLoading ? <CircularProgress size={20} /> : 'ذخیره'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CorrespondenceCRUD;