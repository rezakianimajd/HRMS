import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../api/axiosConfig';
import {
  Alert, Avatar, Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, IconButton, LinearProgress, Paper, Stack,
  TextField, Tooltip, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import NotificationImportantIcon from '@mui/icons-material/NotificationImportant';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import EditNoteIcon from '@mui/icons-material/EditNote';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { toPersianDigits } from '../../utils/numberUtils';

const FONT = 'Vazirmatn, Roboto, sans-serif';

const fmtAt = (iso) => {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
  } catch { return iso; }
};

/**
 * چک‌لیست نواقص سند — مثل یک to-do:
 *  • از داخل سند: افزودن/تیک زدن/حذف (readOnly=false)
 *  • از لیست اسناد: فقط مشاهده (readOnly)؛ برای تیک زدن باید سند باز شود
 * تا وقتی نواقص رفع‌نشده وجود دارد، شمارهٔ سند در لیست اسناد قرمز می‌شود؛
 * با تیک خوردن همه، رنگ اصلی برمی‌گردد و سوابق برای همیشه باقی می‌ماند.
 */
const DocumentIssuesDialog = ({ document: doc, open, readOnly = false, onClose }) => {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [msg, setMsg] = useState(null);
  const docId = doc?.id;

  const { data: fresh, isLoading } = useQuery({
    queryKey: ['doc-issues', docId],
    queryFn: () => axiosInstance.get(`/accounting/documents/${docId}/`).then(r => r.data),
    enabled: Boolean(docId) && Boolean(open),
  });

  const mut = useMutation({
    mutationFn: ({ act, body }) => axiosInstance
      .post(`/accounting/documents/${docId}/${act}/`, body)
      .then(r => r.data),
    onSuccess: (data) => {
      qc.setQueryData(['doc-issues', docId], (old) => ({
        ...(old || {}),
        issues: data.issues,
        issues_count: data.issues_count,
        open_issues_count: data.open_issues_count,
      }));
      qc.invalidateQueries({ queryKey: ['accounting-documents'] });
      qc.invalidateQueries({ queryKey: ['accounting-document'] });
      setText('');
      setMsg(null);
    },
    onError: (e) => setMsg(e.response?.data?.error || 'خطا در ثبت نواقص سند'),
  });

  const items = fresh?.issues || [];
  const number = doc?.number || fresh?.number || (docId ? `#${docId}` : '');
  const total = items.length;
  const done = items.filter(i => i.done).length;
  const openCount = total - done;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const allDone = total > 0 && openCount === 0;
  const accent = total === 0 ? '#64748b' : (allDone ? '#16a34a' : '#ef4444');

  const addItem = () => {
    const t = text.trim();
    if (!t) { setMsg('متن نقص را وارد کنید.'); return; }
    mut.mutate({ act: 'issue_add', body: { text: t } });
  };

  const goToDocument = () => { onClose?.(); navigate(`/accounting/documents/${docId}/edit`); };

  return (
    <Dialog open={Boolean(open)} onClose={onClose} fullWidth maxWidth="sm"
      slotProps={{ paper: { sx: { borderRadius: '22px', overflow: 'hidden', fontFamily: FONT,
        background: 'linear-gradient(160deg,#ffffff,#f8fafc 60%,#f1f5f9)' } } }}>
      <DialogTitle component="div" sx={{ p: 0 }}>
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5,
          background: `linear-gradient(120deg, ${accent}22, rgba(255,255,255,0.35))`,
          borderBottom: `1px solid ${accent}33` }}>
          <Avatar sx={{ width: 42, height: 42, background: `linear-gradient(135deg,${accent},${accent}cc)`, boxShadow: `0 8px 20px ${accent}44` }}>
            {allDone ? <TaskAltIcon sx={{ color: '#fff' }} /> : <NotificationImportantIcon sx={{ color: '#fff' }} />}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 120 }}>
            <Typography variant="subtitle1" fontWeight={800} sx={{ color: accent, fontFamily: FONT, lineHeight: 1.3 }}>
              رفع نواقص سند {number}
            </Typography>
            <Typography variant="caption" color="textSecondary" sx={{ fontFamily: FONT }}>
              {total === 0 ? 'چک‌لیست خالی است' : (allDone ? 'همهٔ نواقص رفع شد' : `${toPersianDigits(String(openCount))} مورد نیازمند اصلاح`)}
            </Typography>
          </Box>
          {readOnly && (
            <Chip size="small" icon={<OpenInNewIcon />} label="حالت مشاهده"
              sx={{ bgcolor: 'rgba(148,163,184,0.18)', color: '#475569', fontWeight: 700, fontFamily: FONT }} />
          )}
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 2 }}>
        {msg && <Alert severity="error" sx={{ mb: 2, borderRadius: '12px', fontFamily: FONT }} onClose={() => setMsg(null)}>{msg}</Alert>}

        <Paper elevation={0} sx={{ p: 1.5, mb: 2, borderRadius: '16px', border: `1px solid ${accent}33`, background: 'rgba(255,255,255,0.78)' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="body2" fontWeight={700} sx={{ fontFamily: FONT }}>
              {toPersianDigits(String(done))} از {toPersianDigits(String(total))} مورد رفع شد
            </Typography>
            <Chip size="small" label={`${toPersianDigits(String(pct))}٪`}
              sx={{ bgcolor: `${accent}1a`, color: accent, fontWeight: 800, fontFamily: FONT }} />
          </Stack>
          <LinearProgress variant="determinate" value={pct}
            sx={{ height: 9, borderRadius: 5, bgcolor: `${accent}22`, '& .MuiLinearProgress-bar': { borderRadius: 5, background: `linear-gradient(90deg,${accent},${accent}bb)` } }} />
        </Paper>

        {readOnly && total > 0 && !allDone && (
          <Alert severity="info" icon={<EditNoteIcon />} sx={{ mb: 2, borderRadius: '12px', fontFamily: FONT, fontSize: 13 }}>
            برای تیک زدن هر مورد، سند را باز کنید و از دکمهٔ «رفع نقص» استفاده کنید.
          </Alert>
        )}

        {!readOnly && (
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <TextField size="small" fullWidth multiline maxRows={4} placeholder="مشکل یا نقص این سند چیست؟"
              value={text} onChange={e => setText(e.target.value)}
              sx={{ '& .MuiInputBase-root': { borderRadius: '12px', fontFamily: FONT } }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addItem(); } }} />
            <Button variant="contained" startIcon={<AddIcon />} onClick={addItem} disabled={mut.isPending}
              sx={{ borderRadius: '12px', fontFamily: FONT, whiteSpace: 'nowrap', background: `linear-gradient(135deg,${accent},${accent}cc)`, boxShadow: `0 8px 18px ${accent}44` }}>
              افزودن
            </Button>
          </Stack>
        )}
        {!readOnly && (
          <Typography variant="caption" color="textSecondary" sx={{ fontFamily: FONT }}>
            با Enter اضافه می‌شود؛ Shift+Enter برای خط جدید.
          </Typography>
        )}

        <Divider sx={{ my: 2 }} />
        {isLoading ? (
          <Box textAlign="center" py={3}><CircularProgress size={22} /></Box>
        ) : total === 0 ? (
          <Box textAlign="center" py={3}>
            <TaskAltIcon sx={{ fontSize: 44, color: '#cbd5e1' }} />
            <Typography variant="body2" color="textSecondary" sx={{ fontFamily: FONT, mt: 0.5 }}>
              هنوز نواقصی برای این سند ثبت نشده است
            </Typography>
            {readOnly && (
              <Typography variant="caption" color="textSecondary" sx={{ fontFamily: FONT }}>
                برای ثبت نقص، سند را باز کنید.
              </Typography>
            )}
          </Box>
        ) : (
          <Stack spacing={1}>
            {items.map(it => (
              <Paper key={it.id} elevation={0}
                sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, borderRadius: '14px',
                  border: `1px solid ${it.done ? 'rgba(34,197,94,0.30)' : 'rgba(239,68,68,0.30)'}`,
                  borderRight: `4px solid ${it.done ? '#22c55e' : '#ef4444'}`,
                  background: it.done ? 'rgba(34,197,94,0.07)' : 'rgba(239,68,68,0.05)',
                  transition: 'box-shadow .15s ease',
                  '&:hover': { boxShadow: '0 6px 18px rgba(15,23,42,0.08)' } }}>
                <Tooltip title={readOnly ? (it.done ? 'رفع شده' : 'نیازمند اصلاح') : (it.done ? 'برداشتن تیک (بازگشایی نقص)' : 'رفع شد')}>
                  <span>
                    <Checkbox checked={!!it.done} disabled={readOnly || mut.isPending}
                      onChange={() => mut.mutate({ act: 'issue_toggle', body: { id: it.id } })}
                      icon={<RadioButtonUncheckedIcon sx={{ fontSize: 22, color: '#ef4444' }} />}
                      checkedIcon={<CheckCircleIcon sx={{ fontSize: 22, color: '#22c55e' }} />} />
                  </span>
                </Tooltip>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={600}
                    sx={{ fontFamily: FONT, wordBreak: 'break-word',
                      textDecoration: it.done ? 'line-through' : 'none',
                      color: it.done ? 'text.secondary' : 'text.primary' }}>
                    {it.text}
                  </Typography>
                  <Typography variant="caption" color="textSecondary" sx={{ fontFamily: FONT }}>
                    {it.done
                      ? `رفع: ${it.done_by || '—'} · ${fmtAt(it.done_at)}`
                      : `ثبت: ${it.by || '—'} · ${fmtAt(it.at)}`}
                  </Typography>
                </Box>
                {!readOnly && (
                  <Tooltip title="حذف این مورد">
                    <IconButton size="small" color="error" disabled={mut.isPending}
                      onClick={() => mut.mutate({ act: 'issue_remove', body: { id: it.id } })}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Paper>
            ))}
          </Stack>
        )}

        {mut.isPending && <Box textAlign="center" pt={1}><CircularProgress size={18} /></Box>}
      </DialogContent>

      <DialogActions sx={{ px: 2, py: 1.5, gap: 1, borderTop: '1px solid rgba(148,163,184,0.22)' }}>
        {readOnly && openCount > 0 && (
          <Button size="small" variant="contained" startIcon={<EditNoteIcon />} onClick={goToDocument}
            sx={{ borderRadius: '12px', fontFamily: FONT, background: `linear-gradient(135deg,${accent},${accent}cc)`, boxShadow: `0 8px 18px ${accent}44` }}>
            باز کردن سند برای رفع نقص
          </Button>
        )}
        <Box sx={{ flex: 1 }} />
        <Button size="small" onClick={onClose} variant="outlined" sx={{ borderRadius: '12px', fontFamily: FONT }}>بستن</Button>
      </DialogActions>
    </Dialog>
  );
};

export default DocumentIssuesDialog;
