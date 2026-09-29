import React, { useState, useEffect } from 'react';
import axiosInstance from '../../api/axiosConfig';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  MenuItem, Stack, CircularProgress, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

const FONT = 'Vazirmatn, IRANSans, sans-serif';

function listOf(r) {
  return Array.isArray(r.data) ? r.data : r.data?.results || [];
}

function QuickCreateDialog({ open, onClose, title, endpoint, fields, onSaved, color = '#2563eb' }) {
  const [form, setForm] = useState({});
  const [remoteOptions, setRemoteOptions] = useState({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm({});
    setErr('');
    fields.filter(f => f.type === 'remote').forEach(f => {
      axiosInstance.get(f.endpoint).then(r => {
        const opts = listOf(r).map(o => ({ value: o[f.valueKey || 'id'], label: o[f.labelKey || 'name'] }));
        setRemoteOptions(prev => ({ ...prev, [f.name]: opts }));
      }).catch(() => {});
    });
  }, [open, fields]);

  const setField = (name, value) => setForm(prev => ({ ...prev, [name]: value }));

  const submit = async () => {
    for (const f of fields) {
      const v = form[f.name];
      if (f.required && (v === undefined || v === null || v === '')) {
        setErr(`فیلد «${f.label}» الزامی است.`);
        return;
      }
    }
    setSaving(true);
    setErr('');
    try {
      const payload = {};
      fields.forEach(f => {
        if (form[f.name] === undefined || form[f.name] === null || form[f.name] === '') return;
        payload[f.name] = f.type === 'number' ? Number(form[f.name]) : form[f.name];
      });
      await axiosInstance.post(endpoint, payload);
      onSaved && onSaved();
      onClose();
    } catch (e) {
      const d = e.response?.data;
      setErr(typeof d === 'string' ? d : (d ? JSON.stringify(d) : 'خطا در ذخیره'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: '18px', fontFamily: FONT } }}>
      <DialogTitle sx={{ fontFamily: FONT, fontWeight: 800, color }}>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {fields.map(f => {
            const common = { fullWidth: true, size: 'small', label: f.label, required: f.required };
            if (f.type === 'select') {
              return (
                <TextField key={f.name} {...common} select value={form[f.name] || ''} onChange={e => setField(f.name, e.target.value)}>
                  {(f.options || []).map(o => <MenuItem key={o.value} value={o.value} sx={{ fontFamily: FONT }}>{o.label}</MenuItem>)}
                </TextField>
              );
            }
            if (f.type === 'remote') {
              return (
                <TextField key={f.name} {...common} select value={form[f.name] || ''} onChange={e => setField(f.name, e.target.value)}>
                  {(remoteOptions[f.name] || []).map(o => <MenuItem key={o.value} value={o.value} sx={{ fontFamily: FONT }}>{o.label}</MenuItem>)}
                </TextField>
              );
            }
            return (
              <TextField
                key={f.name}
                {...common}
                type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                InputLabelProps={f.type === 'date' ? { shrink: true } : undefined}
                value={form[f.name] || ''}
                onChange={e => setField(f.name, e.target.value)}
              />
            );
          })}
          {err && <Typography color="error" variant="caption" sx={{ fontFamily: FONT }}>{err}</Typography>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ fontFamily: FONT }}>انصراف</Button>
        <Button variant="contained" onClick={submit} disabled={saving}
          sx={{ fontFamily: FONT, background: color, '&:hover': { background: color } }}>
          {saving ? <CircularProgress size={18} color="inherit" /> : 'ذخیره'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function QuickCreateButton({ title, endpoint, fields, onSaved, color = '#2563eb' }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}
        sx={{ bgcolor: color, borderRadius: '10px', fontFamily: FONT }}>
        {title}
      </Button>
      <QuickCreateDialog open={open} onClose={() => setOpen(false)} title={title}
        endpoint={endpoint} fields={fields} onSaved={onSaved} color={color} />
    </>
  );
}

export default QuickCreateDialog;