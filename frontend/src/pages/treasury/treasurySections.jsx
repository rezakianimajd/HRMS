import React, { useState, useEffect } from 'react';
import axiosInstance from '../../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, CircularProgress, Button,
  Chip, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow,
} from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
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

const listOf = (r) => Array.isArray(r.data) ? r.data : r.data?.results || [];

const TH = ({ children }) => <TableCell sx={{ fontFamily: FONT, fontWeight: 700 }}>{children}</TableCell>;
const TD = ({ children, bold }) => <TableCell sx={{ fontFamily: FONT, ...(bold ? { fontWeight: 700 } : {}) }}>{children}</TableCell>;

const SectionHeader = ({ icon, title, subtitle, extra }) => (
  <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
    background: `linear-gradient(120deg, ${COLOR}1a, rgba(255,255,255,0.35))`, border: `1px solid ${COLOR}28`, borderRadius: '16px' }}>
    <Avatar sx={{ width: 56, height: 56, background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, boxShadow: `0 8px 24px ${COLOR}55` }}>{icon}</Avatar>
    <Box sx={{ flex: 1, minWidth: 200 }}>
      <Typography variant="h6" fontWeight={800} color={COLOR_DARK} sx={{ fontFamily: FONT }}>{title}</Typography>
      <Typography variant="body2" color="textSecondary" sx={{ fontFamily: FONT }}>{subtitle}</Typography>
    </Box>
    {extra}
  </Paper>
);

export const EntitiesSection = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = () => axiosInstance.get('/treasury/treasury-entities/').then(r => setRows(listOf(r))).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);
  return (
    <Box>
      <SectionHeader icon={<AccountBalanceIcon sx={{ fontSize: 28, color: '#fff' }} />} title="بانک‌ها و صندوق‌ها" subtitle="نهادهای پولی خزانه و ماندهٔ آنها"
      />
      <Paper sx={{ ...glass, p: 2 }}>
        {loading ? <CircularProgress sx={{ color: COLOR }} /> : (
          <TableContainer>
            <Table size="small">
              <TableHead><TableRow><TH>کد</TH><TH>نام</TH><TH>نوع</TH><TH>شماره حساب</TH><TH>مانده</TH><TH>وضعیت</TH></TableRow></TableHead>
              <TableBody>
                {rows.map(e => (
                  <TableRow key={e.id} hover>
                    <TD>{e.code}</TD><TD bold>{e.name}</TD><TD>{e.entity_type_display}</TD>
                    <TD>{e.account_number || '—'}</TD>
                    <TD><Typography component="span" sx={{ fontFamily: FONT, fontWeight: 800, color: e.balance >= 0 ? '#059669' : '#ef4444' }}>{formatPersianNumber(e.balance)}</Typography></TD>
                    <TD><Chip size="small" label={e.is_active ? 'فعال' : 'غیرفعال'} sx={{ bgcolor: e.is_active ? '#10b98118' : '#64748b18', color: e.is_active ? '#10b981' : '#64748b', fontFamily: FONT, fontWeight: 700 }} /></TD>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
};

export const TransactionsSection = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = () => axiosInstance.get('/treasury/treasury-transactions/').then(r => setRows(listOf(r))).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);
  return (
    <Box>
      <SectionHeader icon={<SwapHorizIcon sx={{ fontSize: 28, color: '#fff' }} />} title="تراکنش‌های خزانه" subtitle="دریافت‌ها و پرداخت‌ها"
      />
      <Paper sx={{ ...glass, p: 2 }}>
        {loading ? <CircularProgress sx={{ color: COLOR }} /> : (
          <TableContainer>
            <Table size="small">
              <TableHead><TableRow><TH>شماره</TH><TH>نهاد</TH><TH>تاریخ</TH><TH>جهت</TH><TH>مبلغ</TH><TH>طرف</TH><TH>وضعیت</TH></TableRow></TableHead>
              <TableBody>
                {rows.map(t => (
                  <TableRow key={t.id} hover>
                    <TD bold>{t.number || `#${t.id}`}</TD><TD>{t.entity_name}</TD><TD>{toJalali(t.date)}</TD>
                    <TD><Chip size="small" label={t.direction_display} sx={{ bgcolor: t.direction === 'receipt' ? '#10b98118' : '#ef444418', color: t.direction === 'receipt' ? '#10b981' : '#ef4444', fontFamily: FONT, fontWeight: 700 }} /></TD>
                    <TD>{formatPersianNumber(t.amount)}</TD><TD>{t.party || '—'}</TD>
                    <TD><Chip size="small" label={t.status_display} sx={{ fontFamily: FONT }} /></TD>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
};

export const PayablesSection = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const load = () => axiosInstance.get('/treasury/payable-items/').then(r => setRows(listOf(r))).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);
  const sync = () => { setSyncing(true); axiosInstance.post('/treasury/payable-items/sync_payables/').then(() => load()).finally(() => setSyncing(false)); };
  return (
    <Box>
      <SectionHeader icon={<ReceiptLongIcon sx={{ fontSize: 28, color: '#fff' }} />} title="قابل‌پرداخت‌ها" subtitle="تجمیع بدهی‌ها از تدارکات، حقوق، قرارداد و پروژه"
        extra={<Button size="small" variant="contained" startIcon={<AddIcon />} onClick={sync} disabled={syncing} sx={{ bgcolor: COLOR_DARK, borderRadius: '10px', fontFamily: FONT }}>{syncing ? 'در حال همگام‌سازی…' : 'همگام‌سازی قابل‌پرداخت‌ها'}</Button>} />
      <Paper sx={{ ...glass, p: 2 }}>
        {loading ? <CircularProgress sx={{ color: COLOR }} /> : (
          <TableContainer>
            <Table size="small">
              <TableHead><TableRow><TH>عنوان</TH><TH>نوع</TH><TH>طرف</TH><TH>مبلغ</TH><TH>پرداخت‌شده</TH><TH>مانده</TH><TH>سررسید</TH><TH>وضعیت</TH></TableRow></TableHead>
              <TableBody>
                {rows.map(p => (
                  <TableRow key={p.id} hover>
                    <TD bold>{p.title}</TD><TD>{p.source_type_display}</TD><TD>{p.party || '—'}</TD>
                    <TD>{formatPersianNumber(p.amount)}</TD><TD>{formatPersianNumber(p.paid)}</TD>
                    <TD><Typography component="span" sx={{ fontFamily: FONT, color: p.balance > 0 ? '#f59e0b' : '#10b981', fontWeight: 800 }}>{formatPersianNumber(p.balance)}</Typography></TD>
                    <TD>{p.due_date ? toJalali(p.due_date) : '—'}</TD>
                    <TD><Chip size="small" label={p.is_paid ? 'تسویه شده' : 'باز'} sx={{ bgcolor: p.is_paid ? '#10b98118' : '#f59e0b18', color: p.is_paid ? '#10b981' : '#f59e0b', fontFamily: FONT, fontWeight: 700 }} /></TD>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
};