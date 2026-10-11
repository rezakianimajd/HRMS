import React, { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../api/axiosConfig';
import {
  Alert, Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, IconButton, LinearProgress, List, ListItem,
  ListItemText, Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import NotificationImportantIcon from '@mui/icons-material/NotificationImportant';
import { toPersianDigits } from '../../utils/numberUtils';

const fmtAt = (iso) => {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
  } catch { return iso; }
};

/**
 * چک‌لیست نواقص سند — مثل یک to-do: هر ردیف یک مشکل است و با تیک سبز «رفع شد».
 * تا وقتی نواقص رفع‌نشده وجود دارد، در لیست اسناد کنار شمارهٔ سند آلارم قرمز نمایش داده می‌شود.
 */
const DocumentIssuesDialog = ({ document: doc, onClose }) => {
  const qc = useQueryClient();
  const [items, setItems] = useState([]);
  const [text, setText] = useState('');
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    setItems(doc?.issues || []);
    setText('');
    setMsg(null);
  }, [doc]);

  const mut = useMutation({
    mutationFn: ({ act, body }) => axiosInstance
      .post(`/accounting/documents/${doc.id}/${act}/`, body)
      .then(r => r.data),
    onSuccess: (data) => {
      setItems(data.issues || []);
      setText('');
      setMsg(null);
      qc.invalidateQueries({ queryKey: ['accounting-documents'] });
    },
    onError: (e) => setMsg(e.response?.data?.error || 'خطا در ثبت نواقص سند'),
  });

  if (!doc) return null;

  const total = items.length;
  const done = items.filter(i => i.done).length;
  const open = total - done;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const addItem = () => {
    const t = text.trim();
    if (!t) { setMsg('متن نواقص را وارد کنید.'); return; }
    mut.mutate({ act: 'issue_add', body: { text: t } });
  };
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm"
      slotProps={{ paper: { sx: { borderRadius: '20px', background: 'linear-gradient(150deg, #fff, #f8fafc)' } } }}>
      <DialogTitle sx={{ fontWeight: 800, color: '#b91c1c', display: 'flex', alignItems: 'center', gap: 1 }}>
        <NotificationImportantIcon sx={{ color: '#ef4444' }} />
        رفع نواقص سند {doc.number || `#${doc.id}`}
      </DialogTitle>

      <DialogContent dividers>
        {msg && <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }} onClose={() => setMsg(null)}>{msg}</Alert>}

        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
          <Chip size="small"
            label={`${toPersianDigits(String(done))} از ${toPersianDigits(String(total))} مورد رفع شد`}
            sx={{ bgcolor: open ? '#fee2e2' : '#dcfce7', color: open ? '#b91c1c' : '#15803d', fontWeight: 700 }} />
          {total > 0 && open === 0 && (
            <Chip size="small" icon={<TaskAltIcon />} label="همهٔ نواقص رفع شد"
              sx={{ bgcolor: '#dcfce7', color: '#15803d', fontWeight: 700 }} />
          )}
        </Stack>
        <LinearProgress variant="determinate" value={pct}
          sx={{ height: 8, borderRadius: 4, mb: 2, bgcolor: '#fee2e2', '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg,#22c55e,#16a34a)' } }} />

        <Stack direction="row" spacing={1} alignItems="flex-start">
          <TextField size="small" fullWidth multiline maxRows={4} placeholder="مشکل یا نقص این سند چیست؟"
            value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addItem(); } }} />
          <Button variant="contained" startIcon={<AddIcon />} onClick={addItem} disabled={mut.isPending}
            sx={{ background: 'linear-gradient(135deg,#ef4444,#b91c1c)', borderRadius: '12px', whiteSpace: 'nowrap' }}>
            افزودن
          </Button>
        </Stack>
        <Typography variant="caption" color="textSecondary">با Enter اضافه می‌شود؛ Shift+Enter برای خط جدید.</Typography>

        <Divider sx={{ my: 2 }} />

        {total === 0 ? (
          <Typography variant="body2" color="textSecondary" textAlign="center" py={3}>
            هنوز نواقصی برای این سند ثبت نشده است
          </Typography>
        ) : (
          <List dense disablePadding>
            {items.map(it => (
              <ListItem key={it.id} disableGutters
                sx={{ borderRadius: '12px', px: 1, mb: 0.5, bgcolor: it.done ? 'rgba(34,197,94,0.06)' : 'transparent' }}
                secondaryAction={(
                  <Tooltip title="حذف ردیف">
                    <IconButton edge="end" size="small" color="error" disabled={mut.isPending}
                      onClick={() => mut.mutate({ act: 'issue_remove', body: { id: it.id } })}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}>
                <Tooltip title={it.done ? 'برداشتن تیک (نقص دوباره باز می‌شود)' : 'رفع شد'}>
                  <Checkbox checked={!!it.done} disabled={mut.isPending}
                    onChange={() => mut.mutate({ act: 'issue_toggle', body: { id: it.id } })}
                    sx={{ color: '#ef4444', '&.Mui-checked': { color: '#22c55e' } }} />
                </Tooltip>
                <ListItemText
                  primary={(
                    <Typography variant="body2" fontWeight={600}
                      sx={{ textDecoration: it.done ? 'line-through' : 'none', color: it.done ? 'text.secondary' : 'text.primary' }}>
                      {it.text}
                    </Typography>
                  )}
                  secondary={it.done
                    ? `رفع‌شده توسط ${it.done_by || '—'} · ${fmtAt(it.done_at)}`
                    : `ثبت: ${it.by || '—'} · ${fmtAt(it.at)}`} />
              </ListItem>
            ))}
          </List>
        )}

        {mut.isPending && <Box textAlign="center" pt={1}><CircularProgress size={18} /></Box>}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderRadius: '12px' }}>بستن</Button>
      </DialogActions>
    </Dialog>
  );
};

export default DocumentIssuesDialog;
