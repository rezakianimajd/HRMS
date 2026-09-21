import React from 'react';
import { Box, Typography, Paper, Stack } from '@mui/material';
import {
  AddCircleOutline as CreatedIcon,
  EditOutlined as EditedIcon,
  SendOutlined as SubmittedIcon,
  CheckCircleOutline as ApprovedIcon,
  LockOutlined as PostedIcon,
  UndoOutlined as ReversedIcon,
  DescriptionOutlined as DefaultIcon,
} from '@mui/icons-material';

const STEP_META = {
  created: { label: 'ایجاد', icon: CreatedIcon, color: '#6366f1' },
  edited: { label: 'ویرایش', icon: EditedIcon, color: '#f59e0b' },
  submitted: { label: 'ارسال به حسابداری', icon: SubmittedIcon, color: '#0ea5e9' },
  approved: { label: 'تأیید', icon: ApprovedIcon, color: '#10b981' },
  posted: { label: 'ثبت نهایی', icon: PostedIcon, color: '#3b82f6' },
  locked: { label: 'قفل', icon: PostedIcon, color: '#8b5cf6' },
  reversed: { label: 'برگشت', icon: ReversedIcon, color: '#ef4444' },
  rejected: { label: 'برگشت خورده', icon: ReversedIcon, color: '#ef4444' },
};

const fmtDate = (iso) => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(d);
  } catch { return iso; }
};

const Timeline = ({ events = [], emptyText = 'هنوز رویدادی ثبت نشده است' }) => {
  const list = Array.isArray(events) ? events : [];
  if (list.length === 0) {
    return (
      <Typography variant="body2" color="textSecondary" textAlign="center" py={3}>{emptyText}</Typography>
    );
  }

  return (
    <Box>
      <Stack spacing={0}>
        {list.map((ev, i) => {
          const meta = STEP_META[ev.step] || { label: ev.step, icon: DefaultIcon, color: '#64748b' };
          const Icon = meta.icon;
          const last = i === list.length - 1;
          return (
            <Box key={i} sx={{ display: 'flex', gap: 2 }}>
              {/* ستون عمودی نشانگر */}
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Paper sx={{
                  width: 34, height: 34, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  background: `linear-gradient(135deg, ${meta.color}, ${meta.color}cc)`, boxShadow: `0 6px 14px ${meta.color}44`,
                }}>
                  <Icon sx={{ fontSize: 18, color: '#fff' }} />
                </Paper>
                {!last && <Box sx={{ width: 2, flex: 1, minHeight: 24, background: 'linear-gradient(180deg, rgba(100,116,139,0.4), rgba(100,116,139,0.1))' }} />}
              </Box>
              {/* متن رویداد */}
              <Box sx={{ pb: last ? 0 : 2 }}>
                <Typography variant="body2" fontWeight={800} sx={{ color: meta.color }}>{meta.label}</Typography>
                <Typography variant="caption" color="textSecondary">{ev.note || ''}</Typography>
                <Typography variant="caption" color="textSecondary" display="block">
                  {ev.by || '—'} · {fmtDate(ev.at)}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
};

export default Timeline;