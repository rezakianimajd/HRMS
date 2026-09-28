import React, { useState, useEffect } from 'react';
import axiosInstance from '../../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, CircularProgress, Button,
  Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import CallReceivedIcon from '@mui/icons-material/CallReceived';
import CallMadeIcon from '@mui/icons-material/CallMade';
import AddIcon from '@mui/icons-material/Add';
import { formatPersianNumber } from '../../core/utils/numberUtils';
import { toJalali } from '../../core/utils/dateUtils';

const FONT = 'Vazirmatn, IRANSans, sans-serif';
const COLOR = '#8b5cf6';
const COLOR_DARK = '#6d28d9';

const glass = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.78), rgba(255,255,255,0.46))',
  backdropFilter: 'blur(22px) saturate(180%)',
  WebkitBackdropFilter: 'blur(22px) saturate(180%)',
  border: '1px solid rgba(255,255,255,0.7)',
  boxShadow: '0 14px 40px rgba(139,92,246,0.12)',
  borderRadius: '16px',
};

const RECEIVED_STATUS = {
  registered: { label: 'ثبت‌شده', color: '#64748b' },
  deposited: { label: 'واریز شده', color: '#3b82f6' },
  cleared: { label: 'پاس‌شده', color: '#10b981' },
  bounced: { label: 'برگشتی', color: '#ef4444' },
  endorsed: { label: 'ظهرنویسی‌شده', color: '#8b5cf6' },
  cancelled: { label: 'لغو', color: '#64748b' },
};

const ISSUED_STATUS = {
  draft: { label: 'پیش‌نویس', color: '#64748b' },
  issued: { label: 'صادرشده', color: '#f59e0b' },
  cleared: { label: 'پاس‌شده', color: '#10b981' },
  bounced: { label: 'برگشتی', color: '#ef4444' },
  cancelled: { label: 'لغو', color: '#64748b' },
};

const TH = ({ children }) => <TableCell sx={{ fontFamily: FONT, fontWeight: 700 }}>{children}</TableCell>;
const TD = ({ children, bold }) => <TableCell sx={{ fontFamily: FONT, ...(bold ? { fontWeight: 700 } : {}) }}>{children}</TableCell>;

const Header = ({ icon, title, subtitle, extra }) => (
  <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
    background: `linear-gradient(120deg, ${COLOR}1a, rgba(255,255,255,0.35))`, border: `1px solid ${COLOR}28`, borderRadius: '16px' }}>
    <Avatar sx={{ width: 56, height: 56, background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})` }}>{icon}</Avatar>
    <Box sx={{ flex: 1, minWidth: 200 }}>
      <Typography variant="h6" fontWeight={800} color={COLOR_DARK} sx={{ fontFamily: FONT }}>{title}</Typography>
      <Typography variant="body2" color="textSecondary" sx={{ fontFamily: FONT }}>{subtitle}</Typography>
    </Box>
    {extra}
  </Paper>
);

const listOf = (r) => Array.isArray(r.data) ? r.data : r.data?.results || [];

export const CheckBooksSection = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = () => axiosInstance.get('/treasury/check-books/').then(r => setRows(listOf(r))).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);
  return (
    <Box>
      <Header icon={<MenuBookIcon sx={{ fontSize: 28, color: '#fff' }} />} title="دسته‌چک‌ها" subtitle="دسته‌چک‌های بانکی و وضعیت مصرف برگ"
        extra={<Button size="small" variant="contained" startIcon={<AddIcon />} sx={{ bgcolor: COLOR_DARK, borderRadius: '10px', fontFamily: FONT }}>دسته‌چک جدید</Button>} />
      <Paper sx={{ ...glass, p: 2 }}>
        {loading ? <CircularProgress sx={{ color: COLOR }} /> : (
          <TableContainer><Table size="small">
            <TableHead><TableRow><TH>کد</TH><TH>بانک</TH><TH>شماره حساب</TH><TH>سری</TH><TH>برگ مصرف/کل</TH><TH>وضعیت</TH></TableRow></TableHead>
            <TableBody>
              {rows.map(c => (
                <TableRow key={c.id} hover>
                  <TD bold>{c.code}</TD><TD>{c.bank_name}</TD><TD>{c.account_number || '—'}</TD>
                  <TD>{c.series_start} تا {c.series_end}</TD>
                  <TD>{c.used_leaves} / {c.total_leaves}</TD>
                  <TD><Chip size="small" label={c.is_active ? 'فعال' : 'غیرفعال'} sx={{ bgcolor: c.is_active ? '#10b98118' : '#64748b18', color: c.is_active ? '#10b981' : '#64748b', fontFamily: FONT, fontWeight: 700 }} /></TD>
                </TableRow>
              ))}
            </TableBody>
          </Table></TableContainer>
        )}
      </Paper>
    </Box>
  );
};

export const ReceivedChecksSection = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = () => axiosInstance.get('/treasury/received-checks/').then(r => setRows(listOf(r))).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);
  const act = (id, action) => axiosInstance.post(`/treasury/received-checks/${id}/${action}/`).then(load);
  return (
    <Box>
      <Header icon={<CallReceivedIcon sx={{ fontSize: 28, color: '#fff' }} />} title="چک‌های دریافتی" subtitle="چک‌های دریافتی و چرخهٔ پاس/برگشت/ظهرنویسی"
        extra={<Button size="small" variant="contained" startIcon={<AddIcon />} sx={{ bgcolor: COLOR_DARK, borderRadius: '10px', fontFamily: FONT }}>چک دریافتی جدید</Button>} />
      <Paper sx={{ ...glass, p: 2 }}>
        {loading ? <CircularProgress sx={{ color: COLOR }} /> : (
          <TableContainer><Table size="small">
            <TableHead><TableRow><TH>شماره چک</TH><TH>بانک</TH><TH>صادرکننده</TH><TH>مبلغ</TH><TH>سررسید</TH><TH>وضعیت</TH><TH>عملیات</TH></TableRow></TableHead>
            <TableBody>
              {rows.map(c => {
                const meta = RECEIVED_STATUS[c.status] || { label: c.status, color: '#64748b' };
                return (
                  <TableRow key={c.id} hover>
                    <TD bold>{c.number}</TD><TD>{c.bank_name}</TD><TD>{c.party}</TD><TD>{formatPersianNumber(c.amount)}</TD><TD>{toJalali(c.due_date)}</TD>
                    <TD><Chip size="small" label={meta.label} sx={{ bgcolor: `${meta.color}18`, color: meta.color, fontFamily: FONT, fontWeight: 700 }} /></TD>
                    <TD>
                      {c.status === 'registered' && <Button size="small" variant="outlined" onClick={() => act(c.id, 'deposit')} sx={{ fontFamily: FONT, borderRadius: '8px' }}>واریز</Button>}
                      {c.status === 'deposited' && <Button size="small" color="success" variant="outlined" onClick={() => act(c.id, 'clear')} sx={{ fontFamily: FONT, borderRadius: '8px' }}>پاس</Button>}
                      {(c.status === 'deposited' || c.status === 'cleared') && <Button size="small" color="error" variant="outlined" onClick={() => act(c.id, 'bounce')} sx={{ fontFamily: FONT, borderRadius: '8px', ml: 0.5 }}>برگشت</Button>}
                    </TD>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table></TableContainer>
        )}
      </Paper>
    </Box>
  );
};

export const IssuedChecksSection = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = () => axiosInstance.get('/treasury/issued-checks/').then(r => setRows(listOf(r))).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);
  const act = (id, action) => axiosInstance.post(`/treasury/issued-checks/${id}/${action}/`).then(load);
  return (
    <Box>
      <Header icon={<CallMadeIcon sx={{ fontSize: 28, color: '#fff' }} />} title="چک‌های پرداختی" subtitle="چک‌های صادرشده از دسته‌چک"
        extra={<Button size="small" variant="contained" startIcon={<AddIcon />} sx={{ bgcolor: COLOR_DARK, borderRadius: '10px', fontFamily: FONT }}>چک پرداختی جدید</Button>} />
      <Paper sx={{ ...glass, p: 2 }}>
        {loading ? <CircularProgress sx={{ color: COLOR }} /> : (
          <TableContainer><Table size="small">
            <TableHead><TableRow><TH>شماره چک</TH><TH>ذینفع</TH><TH>مبلغ</TH><TH>صدور</TH><TH>سررسید</TH><TH>وضعیت</TH><TH>عملیات</TH></TableRow></TableHead>
            <TableBody>
              {rows.map(c => {
                const meta = ISSUED_STATUS[c.status] || { label: c.status, color: '#64748b' };
                return (
                  <TableRow key={c.id} hover>
                    <TD bold>{c.number}</TD><TD>{c.party}</TD><TD>{formatPersianNumber(c.amount)}</TD><TD>{toJalali(c.issue_date)}</TD><TD>{toJalali(c.due_date)}</TD>
                    <TD><Chip size="small" label={meta.label} sx={{ bgcolor: `${meta.color}18`, color: meta.color, fontFamily: FONT, fontWeight: 700 }} /></TD>
                    <TD>
                      {c.status === 'draft' && <Button size="small" variant="outlined" onClick={() => act(c.id, 'issue')} sx={{ fontFamily: FONT, borderRadius: '8px' }}>صدور</Button>}
                      {c.status === 'issued' && <Button size="small" color="success" variant="outlined" onClick={() => act(c.id, 'clear')} sx={{ fontFamily: FONT, borderRadius: '8px' }}>پاس</Button>}
                    </TD>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table></TableContainer>
        )}
      </Paper>
    </Box>
  );
};