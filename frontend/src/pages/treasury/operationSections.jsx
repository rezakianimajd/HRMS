import React, { useState, useEffect } from 'react';
import axiosInstance from '../../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, CircularProgress, Button,
  Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import CallReceivedIcon from '@mui/icons-material/CallReceived';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import AddIcon from '@mui/icons-material/Add';
import { formatPersianNumber } from '../../core/utils/numberUtils';
import { toJalali } from '../../core/utils/dateUtils';

const FONT = 'Vazirmatn, IRANSans, sans-serif';
const COLOR = '#14b8a6';
const COLOR_DARK = '#0f766e';

const glass = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.78), rgba(255,255,255,0.46))',
  backdropFilter: 'blur(22px) saturate(180%)',
  WebkitBackdropFilter: 'blur(22px) saturate(180%)',
  border: '1px solid rgba(255,255,255,0.7)',
  boxShadow: '0 14px 40px rgba(20,184,166,0.12)',
  borderRadius: '16px',
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

const StatusChip = ({ status, map }) => {
  const meta = map[status] || { label: status, color: '#64748b' };
  return <Chip size="small" label={meta.label} sx={{ bgcolor: `${meta.color}18`, color: meta.color, fontFamily: FONT, fontWeight: 700 }} />;
};

const RECEIPT_STATUS = {
  expected: { label: 'مورد انتظار', color: '#f59e0b' },
  received: { label: 'دریافت‌شده', color: '#3b82f6' },
  cleared: { label: 'وصول‌شده', color: '#10b981' },
  returned: { label: 'برگشت', color: '#ef4444' },
  cancelled: { label: 'لغو', color: '#64748b' },
};

const ADVANCE_STATUS = {
  open: { label: 'باز', color: '#f59e0b' },
  partial: { label: 'تسویه جزئی', color: '#0ea5e9' },
  settled: { label: 'تسویه‌شده', color: '#10b981' },
  cancelled: { label: 'لغو', color: '#64748b' },
};

const GUARANTEE_STATUS = {
  active: { label: 'فعال', color: '#10b981' },
  expired: { label: 'منقضی‌شده', color: '#ef4444' },
  released: { label: 'آزادشده', color: '#3b82f6' },
  cancelled: { label: 'لغو', color: '#64748b' },
};

export const ReceiptsSection = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = () => axiosInstance.get('/treasury/receipts/').then(r => setRows(listOf(r))).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);
  const act = (id, action) => axiosInstance.post(`/treasury/receipts/${id}/${action}/`).then(load);
  return (
    <Box>
      <Header icon={<CallReceivedIcon sx={{ fontSize: 28, color: '#fff' }} />} title="دریافت‌ها"
        subtitle="دریافت‌های بانکی/نقدی/چکی و چرخهٔ وصول"
        extra={<Button size="small" variant="contained" startIcon={<AddIcon />} sx={{ bgcolor: COLOR_DARK, borderRadius: '10px', fontFamily: FONT }}>دریافت جدید</Button>} />
      <Paper sx={{ ...glass, p: 2 }}>
        {loading ? <CircularProgress sx={{ color: COLOR }} /> : (
          <TableContainer><Table size="small">
            <TableHead><TableRow><TH>شماره</TH><TH>طرف</TH><TH>روش</TH><TH>مبلغ</TH><TH>تاریخ</TH><TH>وضعیت</TH><TH>عملیات</TH></TableRow></TableHead>
            <TableBody>
              {rows.map(r => (
                <TableRow key={r.id} hover>
                  <TD bold>{r.number || `#${r.id}`}</TD><TD>{r.party_name || '—'}</TD><TD>{r.method_display}</TD>
                  <TD>{formatPersianNumber(r.amount)}</TD><TD>{toJalali(r.expected_date || r.received_date)}</TD>
                  <TD><StatusChip status={r.status} map={RECEIPT_STATUS} /></TD>
                  <TD>
                    {r.status === 'expected' && <Button size="small" variant="outlined" onClick={() => act(r.id, 'receive')} sx={{ fontFamily: FONT, borderRadius: '8px' }}>دریافت</Button>}
                    {r.status === 'received' && <Button size="small" color="success" variant="outlined" onClick={() => act(r.id, 'clear')} sx={{ fontFamily: FONT, borderRadius: '8px' }}>وصول</Button>}
                  </TD>
                </TableRow>
              ))}
            </TableBody>
          </Table></TableContainer>
        )}
      </Paper>
    </Box>
  );
};

export const AdvancesSection = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = () => axiosInstance.get('/treasury/advance-accounts/').then(r => setRows(listOf(r))).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);
  return (
    <Box>
      <Header icon={<RequestQuoteIcon sx={{ fontSize: 28, color: '#fff' }} />} title="علی‌الحساب‌ها"
        subtitle="پیش‌پرداخت‌ها و علی‌الحساب با ماندهٔ خودکار"
        extra={<Button size="small" variant="contained" startIcon={<AddIcon />} sx={{ bgcolor: COLOR_DARK, borderRadius: '10px', fontFamily: FONT }}>علی‌الحساب جدید</Button>} />
      <Paper sx={{ ...glass, p: 2 }}>
        {loading ? <CircularProgress sx={{ color: COLOR }} /> : (
          <TableContainer><Table size="small">
            <TableHead><TableRow><TH>شماره</TH><TH>طرف</TH><TH>مبلغ</TH><TH>تسویه‌شده</TH><TH>مانده</TH><TH>تاریخ</TH><TH>وضعیت</TH></TableRow></TableHead>
            <TableBody>
              {rows.map(a => (
                <TableRow key={a.id} hover>
                  <TD bold>{a.number || `#${a.id}`}</TD><TD>{a.party_name || '—'}</TD>
                  <TD>{formatPersianNumber(a.amount)}</TD><TD>{formatPersianNumber(a.settled_amount)}</TD>
                  <TD><Typography component="span" sx={{ fontFamily: FONT, color: a.balance > 0 ? '#f59e0b' : '#10b981', fontWeight: 800 }}>{formatPersianNumber(a.balance)}</Typography></TD>
                  <TD>{toJalali(a.date)}</TD>
                  <TD><StatusChip status={a.status} map={ADVANCE_STATUS} /></TD>
                </TableRow>
              ))}
            </TableBody>
          </Table></TableContainer>
        )}
      </Paper>
    </Box>
  );
};

export const TransfersSection = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = () => axiosInstance.get('/treasury/treasury-transfers/').then(r => setRows(listOf(r))).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);
  const act = (id) => axiosInstance.post(`/treasury/treasury-transfers/${id}/post_transfer/`).then(load);
  return (
    <Box>
      <Header icon={<SwapHorizIcon sx={{ fontSize: 28, color: '#fff' }} />} title="انتقال‌های وجه"
        subtitle="انتقال بین حساب‌های بانکی و صندوق‌ها"
        extra={<Button size="small" variant="contained" startIcon={<AddIcon />} sx={{ bgcolor: COLOR_DARK, borderRadius: '10px', fontFamily: FONT }}>انتقال جدید</Button>} />
      <Paper sx={{ ...glass, p: 2 }}>
        {loading ? <CircularProgress sx={{ color: COLOR }} /> : (
          <TableContainer><Table size="small">
            <TableHead><TableRow><TH>شماره</TH><TH>مبدأ</TH><TH>مقصد</TH><TH>مبلغ</TH><TH>تاریخ</TH><TH>وضعیت</TH><TH>عملیات</TH></TableRow></TableHead>
            <TableBody>
              {rows.map(t => (
                <TableRow key={t.id} hover>
                  <TD bold>{t.number || `#${t.id}`}</TD><TD>{t.source_name}</TD><TD>{t.destination_name}</TD>
                  <TD>{formatPersianNumber(t.amount)}</TD><TD>{toJalali(t.date)}</TD>
                  <TD><StatusChip status={t.status} map={{ draft: { label: 'پیش‌نویس', color: '#64748b' }, posted: { label: 'ثبت‌شده', color: '#10b981' }, cancelled: { label: 'لغو', color: '#64748b' } }} /></TD>
                  <TD>{t.status === 'draft' && <Button size="small" variant="outlined" onClick={() => act(t.id)} sx={{ fontFamily: FONT, borderRadius: '8px' }}>ثبت</Button>}</TD>
                </TableRow>
              ))}
            </TableBody>
          </Table></TableContainer>
        )}
      </Paper>
    </Box>
  );
};

export const GuaranteesSection = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = () => axiosInstance.get('/treasury/guarantees/').then(r => setRows(listOf(r))).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);
  const act = (id) => axiosInstance.post(`/treasury/guarantees/${id}/release/`).then(load);
  return (
    <Box>
      <Header icon={<VerifiedUserIcon sx={{ fontSize: 28, color: '#fff' }} />} title="سپرده‌ها و ضمانت‌نامه‌ها"
        subtitle="سپرده حسن انجام کار، مناقصه، بیمه، مالیاتی و ضمانت‌نامه با هشدار سررسید"
        extra={<Button size="small" variant="contained" startIcon={<AddIcon />} sx={{ bgcolor: COLOR_DARK, borderRadius: '10px', fontFamily: FONT }}>سپرده جدید</Button>} />
      <Paper sx={{ ...glass, p: 2 }}>
        {loading ? <CircularProgress sx={{ color: COLOR }} /> : (
          <TableContainer><Table size="small">
            <TableHead><TableRow><TH>شماره</TH><TH>نوع</TH><TH>صادرکننده</TH><TH>ذی‌نفع</TH><TH>مبلغ</TH><TH>انقضا</TH><TH>مانده روز</TH><TH>وضعیت</TH><TH>عملیات</TH></TableRow></TableHead>
            <TableBody>
              {rows.map(g => (
                <TableRow key={g.id} hover>
                  <TD bold>{g.number || `#${g.id}`}</TD><TD>{g.kind_display}</TD><TD>{g.issuer || '—'}</TD><TD>{g.beneficiary || '—'}</TD>
                  <TD>{formatPersianNumber(g.amount)}</TD><TD>{toJalali(g.expiry_date)}</TD>
                  <TD>
                    {g.days_to_expiry !== null && (
                      <Chip size="small" label={g.days_to_expiry >= 0 ? `${g.days_to_expiry} روز` : 'منقضی'}
                        sx={{ bgcolor: g.days_to_expiry < 0 || g.days_to_expiry <= 30 ? '#ef444418' : '#10b98118', color: g.days_to_expiry < 0 || g.days_to_expiry <= 30 ? '#ef4444' : '#10b981', fontFamily: FONT, fontWeight: 700 }} />
                    )}
                  </TD>
                  <TD><StatusChip status={g.status} map={GUARANTEE_STATUS} /></TD>
                  <TD>{g.status === 'active' && <Button size="small" color="primary" variant="outlined" onClick={() => act(g.id)} sx={{ fontFamily: FONT, borderRadius: '8px' }}>آزادسازی</Button>}</TD>
                </TableRow>
              ))}
            </TableBody>
          </Table></TableContainer>
        )}
      </Paper>
    </Box>
  );
};