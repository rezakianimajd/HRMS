import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, Tabs, Tab, Button, CircularProgress,
  Grid, TextField, FormControl, InputLabel, Select, MenuItem, Chip,
  Stack, Divider, IconButton, Tooltip, Alert, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow,
} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AddIcon from '@mui/icons-material/Add';
import ArchiveIcon from '@mui/icons-material/Archive';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CategoryIcon from '@mui/icons-material/Category';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SaveIcon from '@mui/icons-material/Save';
import { formatPersianNumber, toPersianDigits } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';

const COLOR = '#f59e0b';
const COLOR_DARK = '#d97706';

const glass = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.72), rgba(255,255,255,0.34))',
  backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)',
  border: '1px solid rgba(255,255,255,0.6)',
  boxShadow: '0 14px 40px rgba(245,158,11,0.12)',
  borderRadius: '16px',
};

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px', background: 'rgba(255,255,255,0.55)',
    '&:hover': { background: 'rgba(255,255,255,0.8)' },
    '&.Mui-focused': { background: 'rgba(255,255,255,0.95)', boxShadow: `0 0 0 3px ${COLOR}22` },
  },
};

/* ------------------------------- dashboard (نمای کلی) ------------------------------- */
const DashboardTab = () => {
  const { data: funds, isLoading } = useQuery({
    queryKey: ['petty-cash-funds'],
    queryFn: () => axiosInstance.get('/petty-cash-funds/').then(r => r.data),
  });
  const list = Array.isArray(funds) ? funds : funds?.results || [];
  const active = list.filter(f => f.status === 'active');
  const totalBalance = active.reduce((s, f) => s + Number(f.balance || 0), 0);

  if (isLoading) return <Box textAlign="center" py={4}><CircularProgress /></Box>;

  return (
    <Box>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ ...glass, p: 2.5, textAlign: 'center' }}>
            <Typography variant="caption" color="textSecondary">تعداد تنخواه فعال</Typography>
            <Typography variant="h5" fontWeight={900} color={COLOR_DARK}>{toPersianDigits(active.length)}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ ...glass, p: 2.5, textAlign: 'center' }}>
            <Typography variant="caption" color="textSecondary">مجموع ماندهٔ تنخواه‌ها</Typography>
            <Typography variant="h5" fontWeight={900} color={COLOR_DARK}>{formatPersianNumber(totalBalance)}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ ...glass, p: 2.5, textAlign: 'center' }}>
            <Typography variant="caption" color="textSecondary">کل تنخواه‌ها</Typography>
            <Typography variant="h5" fontWeight={900}>{toPersianDigits(list.length)}</Typography>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ ...glass, p: 4, mt: 2, textAlign: 'center' }}>
        <AccountBalanceWalletIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
        <Typography variant="body1" fontWeight={700} color={COLOR_DARK}>مدیریت تنخواه</Typography>
        <Typography variant="body2" color="textSecondary" mt={0.5}>
          ثبت و بایگانی تنخواه‌ها، تراکنش‌ها و دسته‌بندی‌ها از تب‌های «تنخواه‌ها»، «تراکنش‌ها» و «دسته‌بندی‌ها» انجام می‌شود.
        </Typography>
      </Paper>
    </Box>
  );
};

/* ------------------------------- funds ------------------------------- */
const FundsTab = () => {
  const qc = useQueryClient();
  const [form, setForm] = useState({});
  const [editing, setEditing] = useState(null);
  const { data: funds, isLoading } = useQuery({
    queryKey: ['petty-cash-funds'],
    queryFn: () => axiosInstance.get('/petty-cash-funds/').then(r => r.data),
  });
  const { data: employees } = useQuery({
    queryKey: ['emp-dropdown'],
    queryFn: () => axiosInstance.get('/employees/', { params: { page_size: 500 } }).then(r => r.data.results || r.data),
  });
  const { data: generalAccounts } = useQuery({
    queryKey: ['fund-general-accounts'],
    queryFn: () => axiosInstance.get('/accounting/accounts/', { params: { kind: 'general' } }).then(r => r.data),
  });
  const { data: subsidiaryAccounts } = useQuery({
    queryKey: ['fund-subsidiary-accounts'],
    queryFn: () => axiosInstance.get('/accounting/accounts/', { params: { kind: 'subsidiary' } }).then(r => r.data),
  });
  const { data: auxiliaries } = useQuery({
    queryKey: ['fund-auxiliaries'],
    queryFn: () => axiosInstance.get('/accounting/auxiliary-accounts/').then(r => r.data),
  });
  const list = Array.isArray(funds) ? funds : funds?.results || [];
  const generalList = Array.isArray(generalAccounts) ? generalAccounts : generalAccounts?.results || [];
  const subsidiaryList = Array.isArray(subsidiaryAccounts) ? subsidiaryAccounts : subsidiaryAccounts?.results || [];
  const auxList = Array.isArray(auxiliaries) ? auxiliaries : auxiliaries?.results || [];

  const selectedGeneral = generalList.find(a => a.id === form.general_account);
  const selectedSubsidiary = subsidiaryList.find(a => a.id === form.account);
  // معینها فیلتر بر اساس کل انتخاب‌شده
  const filteredSubsidiaries = form.general_account ? subsidiaryList.filter(a => a.parent === form.general_account) : subsidiaryList;
  // تفصیلها فیلتر بر اساس دسته‌های مرتبط با معین
  const auxSlots = [
    { key: 'auxiliary_1', cat: selectedSubsidiary?.auxiliary_category_1 },
    { key: 'auxiliary_2', cat: selectedSubsidiary?.auxiliary_category_2 },
    { key: 'auxiliary_3', cat: selectedSubsidiary?.auxiliary_category_3 },
  ];

  const save = useMutation({
    mutationFn: (p) => editing
      ? axiosInstance.patch(`/petty-cash-funds/${editing.id}/`, p)
      : axiosInstance.post('/petty-cash-funds/', p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['petty-cash-funds'] }); setForm({}); setEditing(null); },
  });
  const archive = useMutation({
    mutationFn: (id) => axiosInstance.post(`/petty-cash-funds/${id}/archive/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['petty-cash-funds'] }),
  });
  const del = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/petty-cash-funds/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['petty-cash-funds'] }),
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <Box>
      <Paper sx={{ ...glass, p: 2.5, mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={800} sx={{ color: COLOR_DARK, mb: 2 }}>
          {editing ? 'ویرایش تنخواه' : 'ثبت تنخواه جدید'}
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}><TextField size="small" fullWidth sx={fieldSx} label="کد تنخواه" value={form.code || ''} onChange={e => set('code', e.target.value)} /></Grid>
          <Grid item xs={12} md={4}><TextField size="small" fullWidth sx={fieldSx} label="عنوان تنخواه" value={form.title || ''} onChange={e => set('title', e.target.value)} /></Grid>
          <Grid item xs={12} md={3}>
            <FormControl size="small" fullWidth>
              <InputLabel>تنخواه‌دار</InputLabel>
              <Select value={form.custodian || ''} label="تنخواه‌دار" onChange={e => set('custodian', e.target.value)} sx={{ borderRadius: '12px' }}>
                {Array.isArray(employees) && employees.map(e => <MenuItem key={e.id} value={e.id}>{e.full_name}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={3}><TextField size="small" fullWidth sx={fieldSx} label="اعتبار اولیه" type="number" value={form.opening_balance || ''} onChange={e => set('opening_balance', e.target.value)} /></Grid>
          <Grid item xs={6} md={3}><TextField size="small" fullWidth sx={fieldSx} label="سقف (اختیاری)" type="number" value={form.limit || ''} onChange={e => set('limit', e.target.value)} /></Grid>
          <Grid item xs={12} md={6}><TextField size="small" fullWidth sx={fieldSx} label="توضیحات" value={form.description || ''} onChange={e => set('description', e.target.value)} /></Grid>
          <Grid item xs={12} md={3}>
            <FormControl size="small" fullWidth>
              <InputLabel>حساب کل</InputLabel>
              <Select value={form.general_account || ''} label="حساب کل" onChange={e => { set('general_account', e.target.value); set('account', ''); set('auxiliary_1', ''); set('auxiliary_2', ''); set('auxiliary_3', ''); }} sx={{ borderRadius: '12px' }}>
                <MenuItem value="">—</MenuItem>
                {generalList.map(a => <MenuItem key={a.id} value={a.id}>{a.code} - {a.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl size="small" fullWidth>
              <InputLabel>حساب معین (بستانکار)</InputLabel>
              <Select value={form.account || ''} label="حساب معین (بستانکار)" onChange={e => { set('account', e.target.value); set('auxiliary_1', ''); set('auxiliary_2', ''); set('auxiliary_3', ''); }} sx={{ borderRadius: '12px' }}>
                <MenuItem value="">—</MenuItem>
                {filteredSubsidiaries.map(a => <MenuItem key={a.id} value={a.id}>{a.code} - {a.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          {auxSlots.map(slot => (
            <Grid item xs={12} md={3} key={slot.key}>
              <FormControl size="small" fullWidth>
                <InputLabel>{slot.key === 'auxiliary_1' ? 'تفصیل ۱' : slot.key === 'auxiliary_2' ? 'تفصیل ۲' : 'تفصیل ۳'}</InputLabel>
                <Select value={form[slot.key] || ''} label={slot.key} onChange={e => set(slot.key, e.target.value)} disabled={!slot.cat} sx={{ borderRadius: '12px' }}>
                  <MenuItem value="">—</MenuItem>
                  {(slot.cat ? auxList.filter(a => a.category === slot.cat) : []).map(a => <MenuItem key={a.id} value={a.id}>{a.code} - {a.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
          ))}
          <Grid item xs={12}>
            <Stack direction="row" spacing={2}>
              <Button variant="contained" startIcon={<SaveIcon />} onClick={() => save.mutate({ ...form, opening_balance: Number(form.opening_balance) || 0, limit: form.limit ? Number(form.limit) : null })} disabled={save.isLoading} sx={{ background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, borderRadius: '12px' }}>
                {save.isLoading ? <CircularProgress size={20} /> : 'ذخیره'}
              </Button>
              {editing && <Button variant="outlined" onClick={() => { setEditing(null); setForm({}); }}>انصراف</Button>}
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {isLoading ? <Box textAlign="center" py={4}><CircularProgress /></Box> : (
        <Stack spacing={1}>
          {list.map(f => (
            <Paper key={f.id} sx={{ ...glass, p: 1.75, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 180 }}>
                <Typography variant="body2" fontWeight={700}>{f.title}</Typography>
                <Typography variant="caption" color="textSecondary">{f.code} · {f.custodian_name}</Typography>
              </Box>
              <Typography variant="body2" fontWeight={800} color={COLOR_DARK}>{formatPersianNumber(f.balance || 0)} ریال</Typography>
              <Chip size="small" label={f.status_display} />
              <IconButton size="small" onClick={() => { setEditing(f); setForm(f); }}><EditIcon fontSize="small" /></IconButton>
              {f.status !== 'archived' && (
                <Tooltip title="بایگانی"><IconButton size="small" color="warning" onClick={() => archive.mutate(f.id)}><ArchiveIcon fontSize="small" /></IconButton></Tooltip>
              )}
              <IconButton size="small" color="error" onClick={() => { if (window.confirm('حذف؟')) del.mutate(f.id); }}><DeleteIcon fontSize="small" /></IconButton>
            </Paper>
          ))}
        </Stack>
      )}
    </Box>
  );
};

/* ------------------------------- transactions ------------------------------- */
const TransactionsTab = () => {
  const qc = useQueryClient();
  const [form, setForm] = useState({ entry_type: 'debit' });
  const [fundId, setFundId] = useState('');
  const { data: funds } = useQuery({ queryKey: ['petty-cash-funds'], queryFn: () => axiosInstance.get('/petty-cash-funds/').then(r => r.data) });
  const { data: categories } = useQuery({ queryKey: ['petty-cash-categories'], queryFn: () => axiosInstance.get('/petty-cash-categories/').then(r => r.data) });
  const { data: txs, isLoading } = useQuery({
    queryKey: ['petty-cash-transactions', fundId],
    queryFn: () => axiosInstance.get('/petty-cash-transactions/', { params: { fund: fundId } }).then(r => r.data),
    enabled: !!fundId,
  });
  const fundList = Array.isArray(funds) ? funds : funds?.results || [];
  const catList = Array.isArray(categories) ? categories : categories?.results || [];
  const txList = Array.isArray(txs) ? txs : txs?.results || [];

  const save = useMutation({
    mutationFn: (p) => axiosInstance.post('/petty-cash-transactions/', p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['petty-cash-transactions', fundId] }); qc.invalidateQueries({ queryKey: ['petty-cash-funds'] }); setForm({ entry_type: 'debit' }); },
  });

  const toggleArchive = useMutation({
    mutationFn: (id) => axiosInstance.post(`/petty-cash-transactions/${id}/toggle_archive/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['petty-cash-transactions', fundId] }),
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <Box>
      <Paper sx={{ ...glass, p: 2.5, mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={800} sx={{ color: COLOR_DARK, mb: 2 }}>ثبت تراکنش جدید</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <FormControl size="small" fullWidth>
              <InputLabel>تنخواه</InputLabel>
              <Select value={form.fund || ''} label="تنخواه" onChange={e => { set('fund', e.target.value); setFundId(e.target.value); }} sx={{ borderRadius: '12px' }}>
                {fundList.map(f => <MenuItem key={f.id} value={f.id}>{f.title}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={2}>
            <FormControl size="small" fullWidth>
              <InputLabel>نوع</InputLabel>
              <Select value={form.entry_type} label="نوع" onChange={e => set('entry_type', e.target.value)} sx={{ borderRadius: '12px' }}>
                <MenuItem value="credit">دریافت / شارژ</MenuItem>
                <MenuItem value="debit">هزینه / پرداخت</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}><TextField size="small" fullWidth sx={fieldSx} label="عنوان" value={form.title || ''} onChange={e => set('title', e.target.value)} /></Grid>
          <Grid item xs={6} md={2}><TextField size="small" fullWidth sx={fieldSx} label="مبلغ" type="number" value={form.amount || ''} onChange={e => set('amount', e.target.value)} /></Grid>
          <Grid item xs={6} md={2}>
            <FormControl size="small" fullWidth>
              <InputLabel>دسته‌بندی</InputLabel>
              <Select value={form.category || ''} label="دسته‌بندی" onChange={e => set('category', e.target.value)} sx={{ borderRadius: '12px' }}>
                <MenuItem value="">—</MenuItem>
                {catList.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}><JalaliDatePicker fullWidth label="تاریخ" value={form.date || ''} onChange={g => set('date', g)} /></Grid>
          <Grid item xs={12}>
            <Button variant="contained" startIcon={<SaveIcon />} onClick={() => save.mutate({ ...form, amount: Number(form.amount) || 0 })} disabled={!form.fund || save.isLoading} sx={{ background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, borderRadius: '12px' }}>
              {save.isLoading ? <CircularProgress size={20} /> : 'ثبت تراکنش'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ ...glass, p: 2 }}>
        <FormControl size="small" sx={{ minWidth: 260, mb: 2 }}>
          <InputLabel>فیلتر بر اساس تنخواه</InputLabel>
          <Select value={fundId} label="فیلتر بر اساس تنخواه" onChange={e => setFundId(e.target.value)} sx={{ borderRadius: '12px' }}>
            {fundList.map(f => <MenuItem key={f.id} value={f.id}>{f.title}</MenuItem>)}
          </Select>
        </FormControl>
        {isLoading ? <Box textAlign="center" py={3}><CircularProgress /></Box> : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>تاریخ</TableCell><TableCell>نوع</TableCell><TableCell>عنوان</TableCell>
                  <TableCell>دسته</TableCell><TableCell>مبلغ</TableCell><TableCell>عملیات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {txList.map(t => (
                  <TableRow key={t.id} hover>
                    <TableCell>{toJalali(t.date)}</TableCell>
                    <TableCell>
                      <Chip size="small" label={t.entry_type_display} sx={{ bgcolor: t.entry_type === 'credit' ? '#10b98118' : '#ef444418', color: t.entry_type === 'credit' ? '#059669' : '#dc2626' }} />
                    </TableCell>
                    <TableCell>{t.title}</TableCell>
                    <TableCell>{t.category_name || '—'}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{formatPersianNumber(t.amount)}</TableCell>
                    <TableCell>
                      <Tooltip title={t.is_archived ? 'خروج از بایگانی' : 'بایگانی'}>
                        <IconButton size="small" onClick={() => toggleArchive.mutate(t.id)}><ArchiveIcon fontSize="small" color={t.is_archived ? 'warning' : 'inherit'} /></IconButton>
                      </Tooltip>
                    </TableCell>
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

/* ------------------------------- categories ------------------------------- */
const CategoriesTab = () => {
  const qc = useQueryClient();
  const [form, setForm] = useState({});
  const { data, isLoading } = useQuery({ queryKey: ['petty-cash-categories'], queryFn: () => axiosInstance.get('/petty-cash-categories/').then(r => r.data) });
  const list = Array.isArray(data) ? data : data?.results || [];
  const save = useMutation({
    mutationFn: (p) => axiosInstance.post('/petty-cash-categories/', p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['petty-cash-categories'] }); setForm({}); },
  });
  const del = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/petty-cash-categories/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['petty-cash-categories'] }),
  });

  return (
    <Box>
      <Paper sx={{ ...glass, p: 2.5, mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={800} sx={{ color: COLOR_DARK, mb: 2 }}>ثبت دسته‌بندی</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}><TextField size="small" fullWidth sx={fieldSx} label="کد" value={form.code || ''} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} /></Grid>
          <Grid item xs={12} md={6}><TextField size="small" fullWidth sx={fieldSx} label="عنوان دسته‌بندی" value={form.name || ''} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></Grid>
          <Grid item xs={12} md={2}><Button variant="contained" startIcon={<SaveIcon />} onClick={() => save.mutate(form)} sx={{ background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, borderRadius: '12px' }}>افزودن</Button></Grid>
        </Grid>
      </Paper>

      <Stack spacing={1}>
        {list.map(c => (
          <Paper key={c.id} sx={{ ...glass, p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: COLOR }}><CategoryIcon /></Avatar>
            <Box sx={{ flex: 1 }}><Typography variant="body2" fontWeight={700}>{c.name}</Typography><Typography variant="caption" color="textSecondary">{c.code}</Typography></Box>
            <IconButton size="small" color="error" onClick={() => { if (window.confirm('حذف؟')) del.mutate(c.id); }}><DeleteIcon fontSize="small" /></IconButton>
          </Paper>
        ))}
      </Stack>
    </Box>
  );
};

const PettyCashPage = () => {
  const { tab } = useParams(); // dashboard | funds | transactions | categories
  const navigate = useNavigate();
  const tabIndex = { dashboard: 0, funds: 1, transactions: 2, categories: 3 }[tab] ?? 0;
  const tabs = [
    { key: 'dashboard', label: 'نمای کلی', icon: <DashboardIcon /> },
    { key: 'funds', label: 'تنخواه‌ها', icon: <AccountBalanceWalletIcon /> },
    { key: 'transactions', label: 'تراکنش‌ها', icon: <ReceiptLongIcon /> },
    { key: 'categories', label: 'دسته‌بندی‌ها', icon: <CategoryIcon /> },
  ];

  return (
    <Box>
      <Paper sx={{
        p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2,
        background: `linear-gradient(120deg, ${COLOR}1a, rgba(255,255,255,0.3))`,
        border: `1px solid ${COLOR}30`, borderRadius: '16px',
      }}>
        <Avatar sx={{ width: 56, height: 56, background: `linear-gradient(135deg, ${COLOR}, ${COLOR_DARK})`, boxShadow: `0 8px 24px ${COLOR}55` }}>
          <AccountBalanceWalletIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box>
          <Typography variant="h6" fontWeight={800} color={COLOR_DARK}>تنخواه</Typography>
          <Typography variant="body2" color="textSecondary">مدیریت تنخواه‌داران، تراکنش‌ها و دفتر حساب — ثبت، بایگانی و حساب‌کتاب</Typography>
        </Box>
      </Paper>

      {tabIndex === 0 && <DashboardTab />}
      {tabIndex === 1 && <FundsTab />}
      {tabIndex === 2 && <TransactionsTab />}
      {tabIndex === 3 && <CategoriesTab />}
    </Box>
  );
};

export default PettyCashPage;
