import React, { useState, useEffect } from 'react';
import axiosInstance from '../../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, CircularProgress, Button,
  Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import AddIcon from '@mui/icons-material/Add';
import { formatPersianNumber } from '../../core/utils/numberUtils';
import { toJalali } from '../../core/utils/dateUtils';

const FONT = 'Vazirmatn, IRANSans, sans-serif';
const COLOR = '#3b82f6';
const COLOR_DARK = '#2563eb';

const glass = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.78), rgba(255,255,255,0.46))',
  backdropFilter: 'blur(22px) saturate(180%)',
  WebkitBackdropFilter: 'blur(22px) saturate(180%)',
  border: '1px solid rgba(255,255,255,0.7)',
  boxShadow: '0 14px 40px rgba(59,130,246,0.12)',
  borderRadius: '16px',
};

const PR_STATUS = {
  draft: { label: 'پیش‌نویس', color: '#64748b' },
  submitted: { label: 'ثبت‌شده', color: '#f59e0b' },
  under_review: { label: 'در حال بررسی', color: '#0ea5e9' },
  approved: { label: 'تأییدشده', color: '#10b981' },
  scheduled: { label: 'برنامه‌ریزی‌شده', color: '#8b5cf6' },
  payment_ordered: { label: 'دستور صادرشده', color: '#6366f1' },
  paid: { label: 'پرداخت‌شده', color: '#16a34a' },
  rejected: { label: 'رد شده', color: '#ef4444' },
  returned: { label: 'برگشت‌خورده', color: '#f97316' },
  cancelled: { label: 'لغو', color: '#64748b' },
};

const COMMIT_STATUS = {
  open: { label: 'باز', color: '#f59e0b' },
  scheduled: { label: 'برنامه‌ریزی‌شده', color: '#8b5cf6' },
  partial: { label: 'پرداخت جزئی', color: '#0ea5e9' },
  paid: { label: 'تسویه‌شده', color: '#10b981' },
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

const ActionBtn = ({ label, color, onClick, mr = 0.5 }) => (
  <Button size="small" variant="outlined" color={color} onClick={onClick}
    sx={{ fontFamily: FONT, borderRadius: '8px', mr }}>{label}</Button>
);

export const PaymentRequestsSection = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = () => axiosInstance.get('/treasury/payment-requests/').then(r => setRows(listOf(r))).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);
  const act = (id, action) => axiosInstance.post(`/treasury/payment-requests/${id}/${action}/`).then(load);

  return (
    <Box>
      <Header icon={<RequestQuoteIcon sx={{ fontSize: 28, color: '#fff' }} />} title="درخواست‌های پرداخت"
        subtitle="گردش کامل: درخواست → بررسی → تأیید → برنامه‌ریزی → دستور → پرداخت"
        extra={<Button size="small" variant="contained" startIcon={<AddIcon />} sx={{ bgcolor: COLOR_DARK, borderRadius: '10px', fontFamily: FONT }}>درخواست جدید</Button>} />
      <Paper sx={{ ...glass, p: 2 }}>
        {loading ? <CircularProgress sx={{ color: COLOR }} /> : (
          <TableContainer>
            <Table size="small">
              <TableHead><TableRow><TH>شماره</TH><TH>عنوان</TH><TH>طرف</TH><TH>مبلغ</TH><TH>تاریخ</TH><TH>وضعیت</TH><TH>عملیات</TH></TableRow></TableHead>
              <TableBody>
                {rows.map(r => {
                  const meta = PR_STATUS[r.status] || { label: r.status, color: '#64748b' };
                  return (
                    <TableRow key={r.id} hover>
                      <TD bold>{r.number || `#${r.id}`}</TD><TD>{r.title}</TD><TD>{r.party_name || '—'}</TD>
                      <TD>{formatPersianNumber(r.amount)}</TD><TD>{toJalali(r.requested_date)}</TD>
                      <TD><Chip size="small" label={meta.label} sx={{ bgcolor: `${meta.color}18`, color: meta.color, fontFamily: FONT, fontWeight: 700 }} /></TD>
                      <TD>
                        {r.status === 'draft' && <ActionBtn label="ثبت" color="primary" onClick={() => act(r.id, 'submit')} />}
                        {r.status === 'submitted' && <ActionBtn label="بررسی" color="info" onClick={() => act(r.id, 'under_review')} />}
                        {r.status === 'under_review' && (<><ActionBtn label="تأیید" color="success" onClick={() => act(r.id, 'approve')} /><ActionBtn label="رد" color="error" onClick={() => act(r.id, 'reject')} /><ActionBtn label="برگشت" color="warning" onClick={() => act(r.id, 'return_')} /></>)}
                        {r.status === 'approved' && <ActionBtn label="برنامه‌ریزی" color="secondary" onClick={() => act(r.id, 'schedule')} />}
                        {r.status === 'scheduled' && <ActionBtn label="دستور پرداخت" color="info" onClick={() => act(r.id, 'issue_order')} />}
                        {r.status === 'payment_ordered' && <ActionBtn label="ثبت پرداخت" color="success" onClick={() => act(r.id, 'mark_paid')} />}
                      </TD>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
};

export const PaymentCommitmentsSection = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = () => axiosInstance.get('/treasury/payment-commitments/').then(r => setRows(listOf(r))).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);
  return (
    <Box>
      <Header icon={<EventAvailableIcon sx={{ fontSize: 28, color: '#fff' }} />} title="تعهدات نقدی"
        subtitle="بدهی‌های قطعی قابل پرداخت و سررسیدها" />
      <Paper sx={{ ...glass, p: 2 }}>
        {loading ? <CircularProgress sx={{ color: COLOR }} /> : (
          <TableContainer>
            <Table size="small">
              <TableHead><TableRow><TH>شماره</TH><TH>عنوان</TH><TH>طرف</TH><TH>مبلغ</TH><TH>پرداخت‌شده</TH><TH>مانده</TH><TH>سررسید</TH><TH>وضعیت</TH></TableRow></TableHead>
              <TableBody>
                {rows.map(c => {
                  const meta = COMMIT_STATUS[c.status] || { label: c.status, color: '#64748b' };
                  return (
                    <TableRow key={c.id} hover>
                      <TD bold>{c.number || `#${c.id}`}</TD><TD>{c.title}</TD><TD>{c.party_name || '—'}</TD>
                      <TD>{formatPersianNumber(c.amount)}</TD><TD>{formatPersianNumber(c.amount_paid)}</TD>
                      <TD><Typography component="span" sx={{ fontFamily: FONT, color: c.balance > 0 ? '#f59e0b' : '#10b981', fontWeight: 800 }}>{formatPersianNumber(c.balance)}</Typography></TD>
                      <TD>{c.due_date ? toJalali(c.due_date) : '—'}</TD>
                      <TD><Chip size="small" label={meta.label} sx={{ bgcolor: `${meta.color}18`, color: meta.color, fontFamily: FONT, fontWeight: 700 }} /></TD>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
};