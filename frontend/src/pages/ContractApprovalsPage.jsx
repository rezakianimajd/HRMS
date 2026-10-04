import React, { useState } from 'react';
import {
  Box, Typography, Paper, Button, Chip, Avatar, Grid, CircularProgress, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, Tooltip, Alert, Divider,
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import RuleIcon from '@mui/icons-material/Rule';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { toJalali } from '../core/utils/dateUtils';
import { toPersianDigits } from '../core/utils/numberUtils';

const APPROVAL_STATUS = {
  pending: { label: 'در انتظار', color: '#f59e0b' },
  approved: { label: 'تأیید شد', color: '#10b981' },
  rejected: { label: 'رد شد', color: '#ef4444' },
};

const ContractApprovalsPage = () => {
  const qc = useQueryClient();
  const [selected, setSelected] = useState(null);
  const [comment, setComment] = useState('');
  const [msg, setMsg] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['contract-drafts-pending'],
    queryFn: () => axiosInstance.get('/contract-drafts/', { params: { status: 'pending_approval' } }).then(r => r.data),
  });
  const pending = Array.isArray(data) ? data : data?.results || [];

  const decide = useMutation({
    mutationFn: ({ id, decision, comment }) => axiosInstance.post(`/contract-approvals/${id}/decide/`, { decision, comment }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contract-drafts'] });
      qc.invalidateQueries({ queryKey: ['contract-drafts-pending'] });
      setMsg('اقدام ثبت شد.'); setTimeout(() => setMsg(''), 2500);
    },
  });

  const finalize = useMutation({
    mutationFn: ({ id, action }) => axiosInstance.post(`/contract-drafts/${id}/${action}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contract-drafts'] });
      qc.invalidateQueries({ queryKey: ['contract-drafts-pending'] });
      setSelected(null);
      setMsg('نتیجه نهایی ثبت شد.'); setTimeout(() => setMsg(''), 2500);
    },
  });

  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        background: 'linear-gradient(120deg, rgba(245,158,11,0.10), rgba(249,115,22,0.05), rgba(255,255,255,0.3))',
        border: '1px solid rgba(245,158,11,0.16)', borderRadius: '12px' }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #f59e0b, #f97316)', boxShadow: '0 8px 24px rgba(245,158,11,0.35)' }}>
          <RuleIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 220 }}>
          <Typography variant="h6" fontWeight={800} color="#b45309">در انتظار تأیید</Typography>
          <Typography variant="body2" color="textSecondary">گردش‌کار تأیید پیش‌نویس‌های قرارداد</Typography>
        </Box>
        <Chip label={`${toPersianDigits(pending.length)} در انتظار`} sx={{ fontWeight: 800, bgcolor: 'rgba(245,158,11,0.1)', color: '#b45309' }} />
      </Paper>

      {msg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg('')}>{msg}</Alert>}

      {isLoading ? (
        <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress /></Box>
      ) : pending.length === 0 ? (
        <Paper sx={{ py: 6, textAlign: 'center', borderRadius: '12px', background: 'rgba(255,255,255,0.6)' }}>
          <RuleIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1.5 }} />
          <Typography color="textSecondary">موردی در انتظار تأیید نیست.</Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {pending.map(d => {
            const approvals = d.approvals || [];
            return (
              <Grid item xs={12} md={6} key={d.id}>
                <Paper sx={{ p: 2, borderRadius: '14px', background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(245,158,11,0.25)', borderTop: '3px solid #f59e0b' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                    <Avatar sx={{ width: 40, height: 40, bgcolor: '#f59e0b' }}><RuleIcon sx={{ color: '#fff', fontSize: 20 }} /></Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body1" fontWeight={800} noWrap>{d.title}</Typography>
                      <Typography variant="caption" color="textSecondary">{d.submitted_by || '—'}</Typography>
                    </Box>
                    <Tooltip title="مشاهده و اقدام">
                      <IconButton size="small" color="primary" onClick={() => { setSelected(d); setComment(''); }}><VisibilityIcon fontSize="small" /></IconButton>
                    </Tooltip>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                    {approvals.length === 0 ? (
                      <Typography variant="caption" color="textSecondary">مرحله‌ای تعریف نشده است.</Typography>
                    ) : (
                      approvals.map(a => {
                        const s = APPROVAL_STATUS[a.status] || APPROVAL_STATUS.pending;
                        return (
                          <Chip key={a.id} size="small" label={`${a.approver} · ${s.label}`}
                            sx={{ bgcolor: `${s.color}18`, color: s.color, fontWeight: 700, fontSize: 11 }} />
                        );
                      })
                    )}
                  </Box>
                  <Box sx={{ mt: 1, display: 'flex', gap: 0.5 }}>
                    <Button size="small" color="success" onClick={() => finalize.mutate({ id: d.id, action: 'approve' })}>تأیید نهایی</Button>
                    <Button size="small" color="error" onClick={() => finalize.mutate({ id: d.id, action: 'reject' })}>رد</Button>
                  </Box>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Detail / action dialog */}
      <Dialog open={!!selected} onClose={() => setSelected(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: '#b45309', borderBottom: '1px solid rgba(245,158,11,0.15)' }}>گردش‌کار تأیید</DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {selected && (
            <Stack spacing={2}>
              <Box>
                <Typography variant="h6" fontWeight={800}>{selected.title}</Typography>
                <Typography variant="caption" color="textSecondary">{selected.submitted_by || '—'} · {selected.submitted_at ? toJalali(String(selected.submitted_at).slice(0, 10)) : ''}</Typography>
              </Box>
              <Divider />
              <Typography variant="subtitle2" fontWeight={800} color="#b45309">مراحل تأیید</Typography>
              <Stack spacing={1}>
                {(selected.approvals || []).map(a => {
                  const s = APPROVAL_STATUS[a.status] || APPROVAL_STATUS.pending;
                  return (
                    <Paper key={a.id} variant="outlined" sx={{ p: 1.25, borderRadius: '10px', borderColor: `${s.color}44`, background: 'rgba(255,255,255,0.6)' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip size="small" label={`مرحله ${toPersianDigits(a.step)}`} sx={{ fontWeight: 800, bgcolor: `${s.color}18`, color: s.color, fontSize: 11 }} />
                        <Typography variant="body2" fontWeight={700} sx={{ flex: 1 }}>{a.approver}</Typography>
                        <Chip size="small" label={s.label} sx={{ bgcolor: `${s.color}18`, color: s.color, fontWeight: 700, fontSize: 11 }} />
                      </Box>
                      {a.comment && <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.5 }}>{a.comment}</Typography>}
                      {a.status === 'pending' && (
                        <Box sx={{ display: 'flex', gap: 0.5, mt: 0.75 }}>
                          <Button size="small" color="success" startIcon={<CheckCircleIcon fontSize="small" />}
                            onClick={() => decide.mutate({ id: a.id, decision: 'approve', comment })}>تأیید</Button>
                          <Button size="small" color="error" startIcon={<CancelIcon fontSize="small" />}
                            onClick={() => decide.mutate({ id: a.id, decision: 'reject', comment })}>رد</Button>
                        </Box>
                      )}
                    </Paper>
                  );
                })}
              </Stack>
              <TextField size="small" fullWidth label="نظر" value={comment} onChange={e => setComment(e.target.value)} />
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button fullWidth variant="contained" color="success" onClick={() => finalize.mutate({ id: selected.id, action: 'approve' })}>تأیید نهایی پیش‌نویس</Button>
                <Button fullWidth variant="contained" color="error" onClick={() => finalize.mutate({ id: selected.id, action: 'reject' })}>رد پیش‌نویس</Button>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="contained" onClick={() => setSelected(null)} sx={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', borderRadius: '10px', px: 3 }}>بستن</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ContractApprovalsPage;


