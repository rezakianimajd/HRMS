import React, { useState, useEffect } from 'react';
import axiosInstance from '../../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, CircularProgress, Button,
  IconButton, Chip, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, InputAdornment,
} from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PaymentsIcon from '@mui/icons-material/Payments';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { formatPersianNumber, toPersianDigits } from '../../core/utils/numberUtils';
import { toJalali } from '../../core/utils/dateUtils';

const FONT = 'Vazirmatn, IRANSans, sans-serif';
const COLOR = '#f59e0b';
const COLOR_DARK = '#b45309';

const glass = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.78), rgba(255,255,255,0.46))',
  backdropFilter: 'blur(22px) saturate(180%)',
  WebkitBackdropFilter: 'blur(22px) saturate(180%)',
  border: '1px solid rgba(255,255,255,0.7)',
  boxShadow: '0 14px 40px rgba(245,158,11,0.12)',
  borderRadius: '16px',
};

const STATUS = {
  draft: { label: 'پیش‌نویس', color: '#64748b' },
  submitted: { label: 'در انتظار', color: '#f59e0b' },
  approved: { label: 'تأییدشده', color: '#10b981' },
  rejected: { label: 'رد شده', color: '#ef4444' },
  ordered: { label: 'تبدیل به سفارش', color: '#3b82f6' },
  sent: { label: 'ارسال شده', color: '#0ea5e9' },
  partial: { label: 'تحویل جزئی', color: '#f59e0b' },
  received: { label: 'تحویل کامل', color: '#10b981' },
  invoiced: { label: 'صورتحساب شده', color: '#8b5cf6' },
  closed: { label: 'بسته', color: '#64748b' },
  paid: { label: 'پرداخت‌شده', color: '#10b981' },
  cancelled: { label: 'لغو', color: '#ef4444' },
  posted: { label: 'ثبت شده', color: '#10b981' },
  active: { label: 'فعال', color: '#10b981' },
  inactive: { label: 'غیرفعال', color: '#64748b' },
  blacklisted: { label: 'لیست سیاه', color: '#ef4444' },
};

export const StatusChip = ({ status }) => {
  const meta = STATUS[status] || { label: status, color: '#64748b' };
  return <Chip size="small" label={meta.label} sx={{ bgcolor: `${meta.color}18`, color: meta.color, fontWeight: 700, fontFamily: FONT }} />;
};

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

const listOf = (r) => Array.isArray(r.data) ? r.data : r.data?.results || [];

export const SuppliersSection = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const load = () => axiosInstance.get('/procurement/suppliers/', { params: q ? { search: q } : {} }).then(r => setRows(listOf(r))).finally(() => setLoading(false));
  useEffect(() => { load(); }, [q]);
  const del = (id) => { if (!window.confirm('حذف تأمین‌کننده؟')) return; axiosInstance.delete(`/procurement/suppliers/${id}/`).then(load); };
  return (
    <Box>
      <SectionHeader icon={<StorefrontIcon sx={{ fontSize: 28, color: '#fff' }} />} title="تأمین‌کنندگان" subtitle="مدیریت تأمین‌کنندگان و ارزیابی آنها"
      />
      <Paper sx={{ ...glass, p: 2 }}>
        <TextField size="small" placeholder="جستجو…" value={q} onChange={e => setQ(e.target.value)} sx={{ width: 280, fontFamily: FONT, mb: 2 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
        {loading ? <CircularProgress sx={{ color: COLOR }} /> : (
          <TableContainer>
            <Table size="small">
              <TableHead><TableRow><TH>کد</TH><TH>نام</TH><TH>کد اقتصادی</TH><TH>امتیاز</TH><TH>وضعیت</TH><TH></TH></TableRow></TableHead>
              <TableBody>
                {rows.map(s => (
                  <TableRow key={s.id} hover>
                    <TD>{s.code}</TD><TD bold>{s.name}</TD><TD>{s.economic_code || '—'}</TD>
                    <TD>{toPersianDigits(s.rating)}</TD><TD><StatusChip status={s.status} /></TD>
                    <TD><IconButton size="small" onClick={() => del(s.id)}><DeleteIcon fontSize="small" color="error" /></IconButton></TD>
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

export const ItemsSection = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = () => axiosInstance.get('/procurement/items/').then(r => setRows(listOf(r))).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);
  return (
    <Box>
      <SectionHeader icon={<Inventory2Icon sx={{ fontSize: 28, color: '#fff' }} />} title="کالاها و خدمات" subtitle="کاتالوگ کالاها و خدمات قابل خرید"
      />
      <Paper sx={{ ...glass, p: 2 }}>
        {loading ? <CircularProgress sx={{ color: COLOR }} /> : (
          <TableContainer>
            <Table size="small">
              <TableHead><TableRow><TH>کد</TH><TH>نام</TH><TH>دسته</TH><TH>واحد</TH><TH>نوع</TH><TH>فعال</TH></TableRow></TableHead>
              <TableBody>
                {rows.map(i => (
                  <TableRow key={i.id} hover>
                    <TD>{i.code}</TD><TD bold>{i.name}</TD><TD>{i.category_name || '—'}</TD>
                    <TD>{i.unit_name || '—'}</TD><TD>{i.nature_display}</TD><TD>{i.is_active ? '✓' : '—'}</TD>
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

export const PurchaseRequestsSection = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = () => axiosInstance.get('/procurement/purchase-requests/').then(r => setRows(listOf(r))).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);
  const act = (id, action) => axiosInstance.post(`/procurement/purchase-requests/${id}/${action}/`).then(load);
  return (
    <Box>
      <SectionHeader icon={<RequestQuoteIcon sx={{ fontSize: 28, color: '#fff' }} />} title="درخواست‌های خرید" subtitle="درخواست‌های خرید و گردشکار تأیید"
      />
      <Paper sx={{ ...glass, p: 2 }}>
        {loading ? <CircularProgress sx={{ color: COLOR }} /> : (
          <TableContainer>
            <Table size="small">
              <TableHead><TableRow><TH>شماره</TH><TH>تاریخ</TH><TH>واحد</TH><TH>جمع</TH><TH>وضعیت</TH><TH>عملیات</TH></TableRow></TableHead>
              <TableBody>
                {rows.map(r => (
                  <TableRow key={r.id} hover>
                    <TD bold>{r.number || `#${r.id}`}</TD><TD>{toJalali(r.date)}</TD><TD>{r.department || '—'}</TD>
                    <TD>{formatPersianNumber(r.total)}</TD><TD><StatusChip status={r.status} /></TD>
                    <TD>
                      {r.status === 'draft' && <IconButton size="small" onClick={() => act(r.id, 'submit')}><SendIcon fontSize="small" /></IconButton>}
                      {r.status === 'submitted' && (<><IconButton size="small" onClick={() => act(r.id, 'approve')}><CheckCircleIcon fontSize="small" color="success" /></IconButton><IconButton size="small" onClick={() => act(r.id, 'reject')}><DeleteIcon fontSize="small" color="error" /></IconButton></>)}
                    </TD>
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

export const PurchaseOrdersSection = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = () => axiosInstance.get('/procurement/purchase-orders/').then(r => setRows(listOf(r))).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);
  const act = (id, action) => axiosInstance.post(`/procurement/purchase-orders/${id}/${action}/`).then(load);
  return (
    <Box>
      <SectionHeader icon={<ShoppingCartIcon sx={{ fontSize: 28, color: '#fff' }} />} title="سفارش‌های خرید" subtitle="سفارش‌های صادرشده و پیگیری تحویل"
      />
      <Paper sx={{ ...glass, p: 2 }}>
        {loading ? <CircularProgress sx={{ color: COLOR }} /> : (
          <TableContainer>
            <Table size="small">
              <TableHead><TableRow><TH>شماره</TH><TH>تأمین‌کننده</TH><TH>تاریخ</TH><TH>مبلغ</TH><TH>وضعیت</TH><TH>عملیات</TH></TableRow></TableHead>
              <TableBody>
                {rows.map(o => (
                  <TableRow key={o.id} hover>
                    <TD bold>{o.number || `#${o.id}`}</TD><TD>{o.supplier_name}</TD><TD>{toJalali(o.date)}</TD>
                    <TD>{formatPersianNumber(o.total)}</TD><TD><StatusChip status={o.status} /></TD>
                    <TD>
                      {o.status === 'draft' && <IconButton size="small" onClick={() => act(o.id, 'submit')}><SendIcon fontSize="small" /></IconButton>}
                      {o.status === 'submitted' && <IconButton size="small" onClick={() => act(o.id, 'approve')}><CheckCircleIcon fontSize="small" color="success" /></IconButton>}
                      {o.status === 'approved' && <IconButton size="small" onClick={() => act(o.id, 'send')}><LocalShippingIcon fontSize="small" color="primary" /></IconButton>}
                    </TD>
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

export const GoodsReceiptsSection = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = () => axiosInstance.get('/procurement/good-receipts/').then(r => setRows(listOf(r))).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);
  return (
    <Box>
      <SectionHeader icon={<LocalShippingIcon sx={{ fontSize: 28, color: '#fff' }} />} title="رسید کالا (قبض انبار)" subtitle="ثبت و پیگیری رسید کالا"
      />
      <Paper sx={{ ...glass, p: 2 }}>
        {loading ? <CircularProgress sx={{ color: COLOR }} /> : (
          <TableContainer>
            <Table size="small">
              <TableHead><TableRow><TH>شماره</TH><TH>سفارش</TH><TH>تاریخ</TH><TH>وضعیت</TH></TableRow></TableHead>
              <TableBody>
                {rows.map(g => (
                  <TableRow key={g.id} hover>
                    <TD bold>{g.number || `#${g.id}`}</TD><TD>{g.order_number || g.order}</TD><TD>{toJalali(g.date)}</TD><TD><StatusChip status={g.status} /></TD>
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

export const PurchaseInvoicesSection = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = () => axiosInstance.get('/procurement/purchase-invoices/').then(r => setRows(listOf(r))).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);
  return (
    <Box>
      <SectionHeader icon={<ReceiptLongIcon sx={{ fontSize: 28, color: '#fff' }} />} title="صورتحساب‌های خرید" subtitle="صورتحساب‌های تأمین‌کننده و مانده پرداخت"
      />
      <Paper sx={{ ...glass, p: 2 }}>
        {loading ? <CircularProgress sx={{ color: COLOR }} /> : (
          <TableContainer>
            <Table size="small">
              <TableHead><TableRow><TH>شماره</TH><TH>تأمین‌کننده</TH><TH>مبلغ</TH><TH>پرداخت‌شده</TH><TH>مانده</TH><TH>وضعیت</TH></TableRow></TableHead>
              <TableBody>
                {rows.map(inv => (
                  <TableRow key={inv.id} hover>
                    <TD bold>{inv.number || `#${inv.id}`}</TD><TD>{inv.supplier_name}</TD>
                    <TD>{formatPersianNumber(inv.total)}</TD><TD>{formatPersianNumber(inv.paid_amount)}</TD>
                    <TD><Typography component="span" sx={{ fontFamily: FONT, color: '#ef4444', fontWeight: 700 }}>{formatPersianNumber(inv.balance)}</Typography></TD>
                    <TD><StatusChip status={inv.status} /></TD>
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

export const PurchasePaymentsSection = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = () => axiosInstance.get('/procurement/purchase-payments/').then(r => setRows(listOf(r))).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);
  return (
    <Box>
      <SectionHeader icon={<PaymentsIcon sx={{ fontSize: 28, color: '#fff' }} />} title="پرداخت‌های خرید" subtitle="پرداخت‌های انجام‌شده به تأمین‌کنندگان" />
      <Paper sx={{ ...glass, p: 2 }}>
        {loading ? <CircularProgress sx={{ color: COLOR }} /> : (
          <TableContainer>
            <Table size="small">
              <TableHead><TableRow><TH>صورتحساب</TH><TH>تاریخ</TH><TH>مبلغ</TH><TH>روش</TH></TableRow></TableHead>
              <TableBody>
                {rows.map(p => (
                  <TableRow key={p.id} hover>
                    <TD>#{p.invoice}</TD><TD>{toJalali(p.date)}</TD><TD>{formatPersianNumber(p.amount)}</TD><TD>{p.method_display}</TD>
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