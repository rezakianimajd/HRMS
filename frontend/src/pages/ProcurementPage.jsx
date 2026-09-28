import React, { useState, useEffect } from 'react';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, Tabs, Tab, CircularProgress, Stack, Button,
  IconButton, Chip, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, InputAdornment,
} from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import { formatPersianNumber, toPersianDigits } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';

const COLOR = '#3b82f6';
const COLOR_DARK = '#2563eb';
const FONT = 'Vazirmatn, IRANSans, sans-serif';

const glass = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.78), rgba(255,255,255,0.46))',
  backdropFilter: 'blur(22px) saturate(180%)',
  WebkitBackdropFilter: 'blur(22px) saturate(180%)',
  border: '1px solid rgba(255,255,255,0.7)',
  boxShadow: '0 14px 40px rgba(59,130,246,0.12)',
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
};

const StatusChip = ({ status }) => {
  const meta = STATUS[status] || { label: status, color: '#64748b' };
  return <Chip size="small" label={meta.label} sx={{ bgcolor: `${meta.color}18`, color: meta.color, fontWeight: 700, fontFamily: FONT }} />;
};

const ProcurementPage = () => {
  const [tab, setTab] = useState(0);
  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        background: `linear-gradient(120deg, ${COLOR}1a, rgba(255,255,255,0.35))`, border: `1px solid ${COLOR}28`, borderRadius: '16px' }}>
        <Avatar sx={{ width: 56, height: 56, background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, boxShadow: `0 8px 24px ${COLOR}55` }}>
          <ShoppingCartIcon sx={{ fontSize: 28, color: '#fff' }} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography variant="h6" fontWeight={800} color={COLOR_DARK} sx={{ fontFamily: FONT }}>خرید و تدارکات</Typography>
          <Typography variant="body2" color="textSecondary" sx={{ fontFamily: FONT }}>چرخهٔ کامل تدارکات: درخواست → سفارش → رسید → صورتحساب → پرداخت</Typography>
        </Box>
      </Paper>

      <Paper sx={{ ...glass, overflow: 'hidden', mb: 2 }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} variant="scrollable" scrollButtons="auto"
          sx={{ borderBottom: '1px solid rgba(225,225,225,0.5)', px: 2, '& .MuiTab-root': { fontFamily: FONT } }}>
          {['تأمین‌کنندگان', 'کالاها', 'درخواست‌ها', 'سفارش‌ها', 'رسید کالا', 'صورتحساب‌ها', 'پرداخت‌ها'].map((t, i) => (
            <Tab key={t} label={t} />
          ))}
        </Tabs>
      </Paper>

      {tab === 0 && <SuppliersTab />}
      {tab === 1 && <ItemsTab />}
      {tab === 2 && <RequestsTab />}
      {tab === 3 && <OrdersTab />}
      {tab === 4 && <ReceiptsTab />}
      {tab === 5 && <InvoicesTab />}
      {tab === 6 && <PaymentsTab />}
    </Box>
  );
};

const SuppliersTab = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const load = () => axiosInstance.get('/procurement/suppliers/', { params: q ? { search: q } : {} }).then(r => setRows(Array.isArray(r.data) ? r.data : r.data?.results || [])).finally(() => setLoading(false));
  useEffect(() => { load(); }, [q]);
  const del = (id) => { if (!window.confirm('حذف تأمین‌کننده؟')) return; axiosInstance.delete(`/procurement/suppliers/${id}/`).then(load); };
  return (
    <Paper sx={{ ...glass, p: 2 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
        <TextField size="small" placeholder="جستجو…" value={q} onChange={e => setQ(e.target.value)} sx={{ width: 280, fontFamily: FONT }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
        <Box sx={{ flex: 1 }} />
        <Button size="small" variant="contained" startIcon={<AddIcon />} sx={{ bgcolor: COLOR_DARK, borderRadius: '10px', fontFamily: FONT }}>تأمین‌کننده جدید</Button>
      </Stack>
      {loading ? <CircularProgress sx={{ color: COLOR }} /> : (
        <TableContainer>
          <Table size="small">
            <TableHead><TableRow>
              <TableCell sx={{ fontFamily: FONT }}>کد</TableCell><TableCell sx={{ fontFamily: FONT }}>نام</TableCell>
              <TableCell sx={{ fontFamily: FONT }}>کد اقتصادی</TableCell><TableCell sx={{ fontFamily: FONT }}>امتیاز</TableCell>
              <TableCell sx={{ fontFamily: FONT }}>وضعیت</TableCell><TableCell sx={{ fontFamily: FONT }}></TableCell>
            </TableRow></TableHead>
            <TableBody>
              {rows.map(s => (
                <TableRow key={s.id} hover>
                  <TableCell sx={{ fontFamily: FONT }}>{s.code}</TableCell>
                  <TableCell sx={{ fontFamily: FONT, fontWeight: 700 }}>{s.name}</TableCell>
                  <TableCell sx={{ fontFamily: FONT }}>{s.economic_code || '—'}</TableCell>
                  <TableCell sx={{ fontFamily: FONT }}>{toPersianDigits(s.rating)}</TableCell>
                  <TableCell><StatusChip status={s.status} /></TableCell>
                  <TableCell><IconButton size="small" onClick={() => del(s.id)}><DeleteIcon fontSize="small" color="error" /></IconButton></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
};

const ItemsTab = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = () => axiosInstance.get('/procurement/items/').then(r => setRows(Array.isArray(r.data) ? r.data : r.data?.results || [])).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);
  return (
    <Paper sx={{ ...glass, p: 2 }}>
      <Stack direction="row" alignItems="center" mb={2}>
        <Typography variant="subtitle2" fontWeight={800} color={COLOR_DARK} sx={{ fontFamily: FONT }}>کاتالوگ کالاها</Typography>
        <Box sx={{ flex: 1 }} />
        <Button size="small" variant="contained" startIcon={<AddIcon />} sx={{ bgcolor: COLOR_DARK, borderRadius: '10px', fontFamily: FONT }}>کالای جدید</Button>
      </Stack>
      {loading ? <CircularProgress sx={{ color: COLOR }} /> : (
        <TableContainer>
          <Table size="small">
            <TableHead><TableRow>
              <TableCell sx={{ fontFamily: FONT }}>کد</TableCell><TableCell sx={{ fontFamily: FONT }}>نام</TableCell>
              <TableCell sx={{ fontFamily: FONT }}>دسته</TableCell><TableCell sx={{ fontFamily: FONT }}>واحد</TableCell>
              <TableCell sx={{ fontFamily: FONT }}>نوع</TableCell><TableCell sx={{ fontFamily: FONT }}>فعال</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {rows.map(i => (
                <TableRow key={i.id} hover>
                  <TableCell sx={{ fontFamily: FONT }}>{i.code}</TableCell>
                  <TableCell sx={{ fontFamily: FONT, fontWeight: 700 }}>{i.name}</TableCell>
                  <TableCell sx={{ fontFamily: FONT }}>{i.category_name || '—'}</TableCell>
                  <TableCell sx={{ fontFamily: FONT }}>{i.unit_name || '—'}</TableCell>
                  <TableCell sx={{ fontFamily: FONT }}>{i.nature_display}</TableCell>
                  <TableCell sx={{ fontFamily: FONT }}>{i.is_active ? '✓' : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
};

const RequestsTab = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = () => axiosInstance.get('/procurement/purchase-requests/').then(r => setRows(Array.isArray(r.data) ? r.data : r.data?.results || [])).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);
  const act = (id, action) => axiosInstance.post(`/procurement/purchase-requests/${id}/${action}/`).then(load);
  return (
    <Paper sx={{ ...glass, p: 2 }}>
      <Stack direction="row" alignItems="center" mb={2}>
        <Typography variant="subtitle2" fontWeight={800} color={COLOR_DARK} sx={{ fontFamily: FONT }}>درخواست‌های خرید</Typography>
        <Box sx={{ flex: 1 }} />
        <Button size="small" variant="contained" startIcon={<AddIcon />} sx={{ bgcolor: COLOR_DARK, borderRadius: '10px', fontFamily: FONT }}>درخواست جدید</Button>
      </Stack>
      {loading ? <CircularProgress sx={{ color: COLOR }} /> : (
        <TableContainer>
          <Table size="small">
            <TableHead><TableRow>
              <TableCell sx={{ fontFamily: FONT }}>شماره</TableCell><TableCell sx={{ fontFamily: FONT }}>تاریخ</TableCell>
              <TableCell sx={{ fontFamily: FONT }}>واحد</TableCell><TableCell sx={{ fontFamily: FONT }}>جمع</TableCell>
              <TableCell sx={{ fontFamily: FONT }}>وضعیت</TableCell><TableCell sx={{ fontFamily: FONT }}>عملیات</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {rows.map(r => (
                <TableRow key={r.id} hover>
                  <TableCell sx={{ fontFamily: FONT, fontWeight: 700 }}>{r.number || `#${r.id}`}</TableCell>
                  <TableCell sx={{ fontFamily: FONT }}>{toJalali(r.date)}</TableCell>
                  <TableCell sx={{ fontFamily: FONT }}>{r.department || '—'}</TableCell>
                  <TableCell sx={{ fontFamily: FONT }}>{formatPersianNumber(r.total)}</TableCell>
                  <TableCell><StatusChip status={r.status} /></TableCell>
                  <TableCell>
                    {r.status === 'draft' && <IconButton size="small" onClick={() => act(r.id, 'submit')}><SendIcon fontSize="small" /></IconButton>}
                    {r.status === 'submitted' && (<><IconButton size="small" onClick={() => act(r.id, 'approve')}><CheckCircleIcon fontSize="small" color="success" /></IconButton><IconButton size="small" onClick={() => act(r.id, 'reject')}><DeleteIcon fontSize="small" color="error" /></IconButton></>)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
};

const OrdersTab = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = () => axiosInstance.get('/procurement/purchase-orders/').then(r => setRows(Array.isArray(r.data) ? r.data : r.data?.results || [])).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);
  const act = (id, action) => axiosInstance.post(`/procurement/purchase-orders/${id}/${action}/`).then(load);
  return (
    <Paper sx={{ ...glass, p: 2 }}>
      <Stack direction="row" alignItems="center" mb={2}>
        <Typography variant="subtitle2" fontWeight={800} color={COLOR_DARK} sx={{ fontFamily: FONT }}>سفارش‌های خرید</Typography>
        <Box sx={{ flex: 1 }} />
        <Button size="small" variant="contained" startIcon={<AddIcon />} sx={{ bgcolor: COLOR_DARK, borderRadius: '10px', fontFamily: FONT }}>سفارش جدید</Button>
      </Stack>
      {loading ? <CircularProgress sx={{ color: COLOR }} /> : (
        <TableContainer>
          <Table size="small">
            <TableHead><TableRow>
              <TableCell sx={{ fontFamily: FONT }}>شماره</TableCell><TableCell sx={{ fontFamily: FONT }}>تأمین‌کننده</TableCell>
              <TableCell sx={{ fontFamily: FONT }}>تاریخ</TableCell><TableCell sx={{ fontFamily: FONT }}>مبلغ</TableCell>
              <TableCell sx={{ fontFamily: FONT }}>وضعیت</TableCell><TableCell sx={{ fontFamily: FONT }}>عملیات</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {rows.map(o => (
                <TableRow key={o.id} hover>
                  <TableCell sx={{ fontFamily: FONT, fontWeight: 700 }}>{o.number || `#${o.id}`}</TableCell>
                  <TableCell sx={{ fontFamily: FONT }}>{o.supplier_name}</TableCell>
                  <TableCell sx={{ fontFamily: FONT }}>{toJalali(o.date)}</TableCell>
                  <TableCell sx={{ fontFamily: FONT }}>{formatPersianNumber(o.total)}</TableCell>
                  <TableCell><StatusChip status={o.status} /></TableCell>
                  <TableCell>
                    {o.status === 'draft' && <IconButton size="small" onClick={() => act(o.id, 'submit')}><SendIcon fontSize="small" /></IconButton>}
                    {o.status === 'submitted' && <IconButton size="small" onClick={() => act(o.id, 'approve')}><CheckCircleIcon fontSize="small" color="success" /></IconButton>}
                    {o.status === 'approved' && <IconButton size="small" onClick={() => act(o.id, 'send')}><LocalShippingIcon fontSize="small" color="primary" /></IconButton>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
};

const ReceiptsTab = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = () => axiosInstance.get('/procurement/good-receipts/').then(r => setRows(Array.isArray(r.data) ? r.data : r.data?.results || [])).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);
  return (
    <Paper sx={{ ...glass, p: 2 }}>
      <Stack direction="row" alignItems="center" mb={2}>
        <Typography variant="subtitle2" fontWeight={800} color={COLOR_DARK} sx={{ fontFamily: FONT }}>قبض انبار (رسید کالا)</Typography>
        <Box sx={{ flex: 1 }} />
        <Button size="small" variant="contained" startIcon={<AddIcon />} sx={{ bgcolor: COLOR_DARK, borderRadius: '10px', fontFamily: FONT }}>رسید جدید</Button>
      </Stack>
      {loading ? <CircularProgress sx={{ color: COLOR }} /> : (
        <TableContainer>
          <Table size="small">
            <TableHead><TableRow>
              <TableCell sx={{ fontFamily: FONT }}>شماره</TableCell><TableCell sx={{ fontFamily: FONT }}>سفارش</TableCell>
              <TableCell sx={{ fontFamily: FONT }}>تاریخ</TableCell><TableCell sx={{ fontFamily: FONT }}>وضعیت</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {rows.map(g => (
                <TableRow key={g.id} hover>
                  <TableCell sx={{ fontFamily: FONT, fontWeight: 700 }}>{g.number || `#${g.id}`}</TableCell>
                  <TableCell sx={{ fontFamily: FONT }}>{g.order}</TableCell>
                  <TableCell sx={{ fontFamily: FONT }}>{toJalali(g.date)}</TableCell>
                  <TableCell><StatusChip status={g.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
};

const InvoicesTab = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = () => axiosInstance.get('/procurement/purchase-invoices/').then(r => setRows(Array.isArray(r.data) ? r.data : r.data?.results || [])).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);
  return (
    <Paper sx={{ ...glass, p: 2 }}>
      <Stack direction="row" alignItems="center" mb={2}>
        <Typography variant="subtitle2" fontWeight={800} color={COLOR_DARK} sx={{ fontFamily: FONT }}>صورتحساب‌های خرید</Typography>
        <Box sx={{ flex: 1 }} />
        <Button size="small" variant="contained" startIcon={<AddIcon />} sx={{ bgcolor: COLOR_DARK, borderRadius: '10px', fontFamily: FONT }}>صورتحساب جدید</Button>
      </Stack>
      {loading ? <CircularProgress sx={{ color: COLOR }} /> : (
        <TableContainer>
          <Table size="small">
            <TableHead><TableRow>
              <TableCell sx={{ fontFamily: FONT }}>شماره</TableCell><TableCell sx={{ fontFamily: FONT }}>تأمین‌کننده</TableCell>
              <TableCell sx={{ fontFamily: FONT }}>مبلغ</TableCell><TableCell sx={{ fontFamily: FONT }}>پرداخت‌شده</TableCell>
              <TableCell sx={{ fontFamily: FONT }}>مانده</TableCell><TableCell sx={{ fontFamily: FONT }}>وضعیت</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {rows.map(inv => (
                <TableRow key={inv.id} hover>
                  <TableCell sx={{ fontFamily: FONT, fontWeight: 700 }}>{inv.number || `#${inv.id}`}</TableCell>
                  <TableCell sx={{ fontFamily: FONT }}>{inv.supplier_name}</TableCell>
                  <TableCell sx={{ fontFamily: FONT }}>{formatPersianNumber(inv.total)}</TableCell>
                  <TableCell sx={{ fontFamily: FONT }}>{formatPersianNumber(inv.paid_amount)}</TableCell>
                  <TableCell sx={{ fontFamily: FONT, color: '#ef4444', fontWeight: 700 }}>{formatPersianNumber(inv.balance)}</TableCell>
                  <TableCell><StatusChip status={inv.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
};

const PaymentsTab = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = () => axiosInstance.get('/procurement/purchase-payments/').then(r => setRows(Array.isArray(r.data) ? r.data : r.data?.results || [])).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);
  return (
    <Paper sx={{ ...glass, p: 2 }}>
      <Typography variant="subtitle2" fontWeight={800} color={COLOR_DARK} mb={2} sx={{ fontFamily: FONT }}>پرداخت‌های خرید</Typography>
      {loading ? <CircularProgress sx={{ color: COLOR }} /> : (
        <TableContainer>
          <Table size="small">
            <TableHead><TableRow>
              <TableCell sx={{ fontFamily: FONT }}>صورتحساب</TableCell><TableCell sx={{ fontFamily: FONT }}>تاریخ</TableCell>
              <TableCell sx={{ fontFamily: FONT }}>مبلغ</TableCell><TableCell sx={{ fontFamily: FONT }}>روش</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {rows.map(p => (
                <TableRow key={p.id} hover>
                  <TableCell sx={{ fontFamily: FONT }}>#{p.invoice}</TableCell>
                  <TableCell sx={{ fontFamily: FONT }}>{toJalali(p.date)}</TableCell>
                  <TableCell sx={{ fontFamily: FONT }}>{formatPersianNumber(p.amount)}</TableCell>
                  <TableCell sx={{ fontFamily: FONT }}>{p.method_display}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
};

export default ProcurementPage;