import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Button, Chip, Avatar, Grid, CircularProgress, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl,
  InputLabel, Select, MenuItem, Tabs, Tab, Divider, IconButton, Tooltip,
} from '@mui/material';
import HandshakeIcon from '@mui/icons-material/Handshake';
import AddIcon from '@mui/icons-material/Add';
import DescriptionIcon from '@mui/icons-material/Description';
import ReceiptIcon from '@mui/icons-material/Receipt';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import LanguageIcon from '@mui/icons-material/Language';
import LockIcon from '@mui/icons-material/Lock';
import PaymentsIcon from '@mui/icons-material/Payments';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import { formatPersianNumber, toPersianDigits } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';

const TYPE_LABELS = {
  construction: 'پیمانکاری / اجرا',
  purchase: 'خرید',
  tender: 'مناقصه',
  consulting: 'مشاوره',
  service: 'خدمات',
  other: 'سایر',
};

const STATUS_LABELS = {
  draft: 'پیش‌نویس',
  active: 'در حال اجرا',
  suspended: 'متوقف',
  completed: 'تکمیل شده',
  terminated: 'فسخ شده',
};

const ExternalContractsPage = () => {
  const qc = useQueryClient();
  const [tab, setTab] = useState(0);
  const [openParty, setOpenParty] = useState(false);
  const [openContract, setOpenContract] = useState(false);
  const [selected, setSelected] = useState(null);

  const [partyForm, setPartyForm] = useState({ name: '', party_type: 'contractor', mobile: '', email: '', national_id: '' });
  const [contractForm, setContractForm] = useState({ number: '', subject: '', party: '', contract_type: 'purchase', status: 'draft', amount: '', start_date: '', end_date: '' });
  const [detailTab, setDetailTab] = useState(0);
  const [invoiceForm, setInvoiceForm] = useState({ contract: '', number: '', date: '', amount: '', vat: '', total: '' });
  const [statementForm, setStatementForm] = useState({ contract: '', number: '', date: '', amount: '' });
  const [addendumForm, setAddendumForm] = useState({ contract: '', number: '', date: '', change_description: '', amount_change: '' });
  const [guaranteeForm, setGuaranteeForm] = useState({ contract: '', guarantee_type: 'performance', number: '', amount: '', issue_date: '', expiry_date: '', bank: '' });
  const [paymentForm, setPaymentForm] = useState({ contract: '', invoice: '', date: '', amount: '', reference: '', method: '' });

  const { data: parties } = useQuery({ queryKey: ['contract-parties'], queryFn: () => axiosInstance.get('/contract-parties/').then(r => r.data) });
  const partyList = Array.isArray(parties) ? parties : parties?.results || [];

  const { data: contracts, isLoading } = useQuery({ queryKey: ['external-contracts'], queryFn: () => axiosInstance.get('/external-contracts/').then(r => r.data) });
  const contractList = Array.isArray(contracts) ? contracts : contracts?.results || [];

  const createParty = useMutation({
    mutationFn: (payload) => axiosInstance.post('/contract-parties/', payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contract-parties'] }); setOpenParty(false); setPartyForm({ name: '', party_type: 'contractor', mobile: '', email: '', national_id: '' }); },
  });

  const createContract = useMutation({
    mutationFn: (payload) => axiosInstance.post('/external-contracts/', payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['external-contracts'] }); setOpenContract(false); setContractForm({ number: '', subject: '', party: '', contract_type: 'purchase', status: 'draft', amount: '', start_date: '', end_date: '' }); },
  });

  const createChild = (endpoint, key, formSetter, reset) => ({
    mutationFn: (payload) => axiosInstance.post(endpoint, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [key] }); formSetter(reset); },
  });

  const invoiceMut = useMutation({
    mutationFn: (payload) => axiosInstance.post('/contract-invoices/', payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['external-contracts'] }); setInvoiceForm({ contract: '', number: '', date: '', amount: '', vat: '', total: '' }); },
  });

  const statementMut = useMutation({
    mutationFn: (payload) => axiosInstance.post('/contract-statements/', payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['external-contracts'] }); setStatementForm({ contract: '', number: '', date: '', amount: '' }); },
  });

  const addendumMut = useMutation({
    mutationFn: (payload) => axiosInstance.post('/contract-addendums/', payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['external-contracts'] }); setAddendumForm({ contract: '', number: '', date: '', change_description: '', amount_change: '' }); },
  });

  const guaranteeMut = useMutation({
    mutationFn: (payload) => axiosInstance.post('/contract-guarantees/', payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['external-contracts'] }); setGuaranteeForm({ contract: '', guarantee_type: 'performance', number: '', amount: '', issue_date: '', expiry_date: '', bank: '' }); },
  });

  const paymentMut = useMutation({
    mutationFn: (payload) => axiosInstance.post('/contract-payments/', payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['external-contracts'] }); setPaymentForm({ contract: '', invoice: '', date: '', amount: '', reference: '', method: '' }); },
  });

  if (isLoading) return <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box>;

  const current = selected ? contractList.find(c => c.id === selected.id) : null;

  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2,
        background: 'linear-gradient(120deg, rgba(245,158,11,0.10), rgba(249,115,22,0.05), rgba(255,255,255,0.3))',
        border: '1px solid rgba(245,158,11,0.16)', borderRadius: 3 }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #f59e0b, #f97316)', boxShadow: '0 8px 24px rgba(245,158,11,0.4)' }}>
          <HandshakeIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={800} color="#b45309">قراردادهای برون‌سازمانی</Typography>
          <Typography variant="body2" color="textSecondary">پیمانکاری، خرید، مناقصه + فاکتور، صورت‌وضعیت، الحاقیه، تضمین و پرداخت</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenContract(true)}
          sx={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', borderRadius: 2 }}>
          قرارداد جدید
        </Button>
        <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setOpenParty(true)}>طرف جدید</Button>
      </Paper>

      {selected ? (
        /* === Contract case file === */
        <Box>
          <Button onClick={() => setSelected(null)} size="small" sx={{ mb: 1 }}>← بازگشت به لیست</Button>
          <Paper sx={{ p: 2.5, borderRadius: 3, background: 'rgba(255,255,255,0.65)', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Typography variant="h6" fontWeight={800}>{current?.subject}</Typography>
              <Chip size="small" label={current?.number || 'بدون شماره'} variant="outlined" />
              <Chip size="small" color="primary" label={TYPE_LABELS[current?.contract_type] || ''} />
              <Chip size="small" color="success" label={STATUS_LABELS[current?.status] || ''} />
            </Box>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
              طرف: {current?.party_name} · مبلغ: {formatPersianNumber(current?.amount || 0)} ریال
            </Typography>
          </Paper>

          <Tabs value={detailTab} onChange={(e, v) => setDetailTab(v)} sx={{ mb: 2 }}>
            <Tab icon={<ReceiptIcon />} label="فاکتورها" />
            <Tab icon={<ReceiptLongIcon />} label="صورت‌وضعیت" />
            <Tab icon={<LanguageIcon />} label="الحاقیه" />
            <Tab icon={<LockIcon />} label="تضمین" />
            <Tab icon={<PaymentsIcon />} label="پرداخت" />
            <Tab icon={<FolderOpenIcon />} label="اسناد" />
          </Tabs>

          {detailTab === 0 && <Box>
            <TextField size="small" label="شماره فاکتور" value={invoiceForm.number} onChange={e => setInvoiceForm(p => ({ ...p, number: e.target.value, contract: selected.id }))} sx={{ mb: 1 }} />
            <TextField size="small" label="تاریخ" type="date" InputLabelProps={{ shrink: true }} value={invoiceForm.date} onChange={e => setInvoiceForm(p => ({ ...p, date: e.target.value, contract: selected.id }))} sx={{ mb: 1, ml: 1 }} />
            <TextField size="small" label="مبلغ" type="number" value={invoiceForm.amount} onChange={e => setInvoiceForm(p => ({ ...p, amount: e.target.value, contract: selected.id }))} sx={{ mb: 1, ml: 1 }} />
            <TextField size="small" label="مالیات" type="number" value={invoiceForm.vat} onChange={e => setInvoiceForm(p => ({ ...p, vat: e.target.value, contract: selected.id }))} sx={{ mb: 1, ml: 1 }} />
            <TextField size="small" label="مبلغ کل" type="number" value={invoiceForm.total} onChange={e => setInvoiceForm(p => ({ ...p, total: e.target.value, contract: selected.id }))} sx={{ mb: 1, ml: 1 }} />
            <Button size="small" variant="contained" onClick={() => invoiceMut.mutate({ ...invoiceForm, contract: selected.id, amount: Number(invoiceForm.amount), vat: Number(invoiceForm.vat), total: Number(invoiceForm.total) })} sx={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)' }}>ثبت</Button>
            <Stack spacing={1} sx={{ mt: 1.5 }}>
              {(current?.invoices || []).map(i => <Paper key={i.id} variant="outlined" sx={{ p: 1, borderRadius: 2 }}><Typography variant="body2">{i.number || '—'} · {formatPersianNumber(i.total)} ریال</Typography></Paper>)}
            </Stack>
          </Box>}

          {detailTab === 1 && <Box>
            <TextField size="small" label="شماره" value={statementForm.number} onChange={e => setStatementForm(p => ({ ...p, number: e.target.value }))} sx={{ mb: 1 }} />
            <TextField size="small" label="تاریخ" type="date" InputLabelProps={{ shrink: true }} value={statementForm.date} onChange={e => setStatementForm(p => ({ ...p, date: e.target.value }))} sx={{ mb: 1, ml: 1 }} />
            <TextField size="small" label="مبلغ" type="number" value={statementForm.amount} onChange={e => setStatementForm(p => ({ ...p, amount: e.target.value }))} sx={{ mb: 1, ml: 1 }} />
            <Button size="small" variant="contained" onClick={() => statementMut.mutate({ ...statementForm, contract: selected.id, amount: Number(statementForm.amount) })} sx={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)' }}>ثبت</Button>
            <Stack spacing={1} sx={{ mt: 1.5 }}>
              {(current?.statements || []).map(s => <Paper key={s.id} variant="outlined" sx={{ p: 1 }}><Typography variant="body2">{s.number || '—'} · {formatPersianNumber(s.amount)} ریال</Typography></Paper>)}
            </Stack>
          </Box>}

          {detailTab === 2 && <Box>
            <TextField size="small" label="شماره الحاقیه" value={addendumForm.number} onChange={e => setAddendumForm(p => ({ ...p, number: e.target.value }))} sx={{ mb: 1 }} />
            <TextField size="small" label="تاریخ" type="date" InputLabelProps={{ shrink: true }} value={addendumForm.date} onChange={e => setAddendumForm(p => ({ ...p, date: e.target.value }))} sx={{ mb: 1, ml: 1 }} />
            <TextField size="small" label="شرح تغییرات" value={addendumForm.change_description} onChange={e => setAddendumForm(p => ({ ...p, change_description: e.target.value }))} sx={{ mb: 1 }} />
            <Button size="small" variant="contained" onClick={() => addendumMut.mutate({ ...addendumForm, contract: selected.id })} sx={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)' }}>ثبت</Button>
            <Stack spacing={1} sx={{ mt: 1.5 }}>
              {(current?.addendums || []).map(a => <Paper key={a.id} variant="outlined" sx={{ p: 1 }}><Typography variant="body2">{a.number || '—'} · {a.change_description}</Typography></Paper>)}
            </Stack>
          </Box>}

          {detailTab === 3 && <Box>
            <Typography variant="body2" sx={{ mb: 1 }}>تضمین‌های قرارداد</Typography>
            <Stack spacing={1}>
              {(current?.guarantees || []).map(g => (
                <Paper key={g.id} variant="outlined" sx={{ p: 1 }}><Typography variant="body2">{g.guarantee_type_display} · {formatPersianNumber(g.amount)} ریال · تا {toJalali(g.expiry_date)}</Typography></Paper>
              ))}
            </Stack>
          </Box>}

          {detailTab === 4 && <Box>
            <TextField size="small" label="تاریخ پرداخت" type="date" InputLabelProps={{ shrink: true }} value={paymentForm.date} onChange={e => setPaymentForm(p => ({ ...p, date: e.target.value }))} sx={{ mb: 1 }} />
            <TextField size="small" label="مبلغ" type="number" value={paymentForm.amount} onChange={e => setPaymentForm(p => ({ ...p, amount: e.target.value }))} sx={{ mb: 1, ml: 1 }} />
            <TextField size="small" label="مرجع" value={paymentForm.reference} onChange={e => setPaymentForm(p => ({ ...p, reference: e.target.value }))} sx={{ mb: 1, ml: 1 }} />
            <Button size="small" variant="contained" onClick={() => paymentMut.mutate({ ...paymentForm, contract: selected.id, amount: Number(paymentForm.amount) })} sx={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)' }}>ثبت</Button>
            <Stack spacing={1} sx={{ mt: 1.5 }}>
              {(current?.payments || []).map(py => <Paper key={py.id} variant="outlined" sx={{ p: 1 }}><Typography variant="body2">{toJalali(py.date)} · {formatPersianNumber(py.amount)} ریال</Typography></Paper>)}
            </Stack>
          </Box>}

          {detailTab === 5 && <Box>
            <Typography variant="body2" color="textSecondary">اسناد قرارداد (به‌زودی آپلود فایل)</Typography>
            <Stack spacing={1} sx={{ mt: 1 }}>
              {(current?.documents || []).map(d => <Paper key={d.id} variant="outlined" sx={{ p: 1 }}><Typography variant="body2">{d.title}</Typography></Paper>)}
            </Stack>
          </Box>}
        </Box>
      ) : (
        /* === Contracts list === */
        <Paper sx={{ p: 2, borderRadius: 3, background: 'rgba(255,255,255,0.65)' }}>
          {contractList.length === 0 ? (
            <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 4 }}>قراردادی ثبت نشده است.</Typography>
          ) : (
            <Stack spacing={1}>
              {contractList.map(c => (
                <Paper key={c.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2.5, cursor: 'pointer', background: 'rgba(255,255,255,0.5)' }}
                  onClick={() => setSelected(c)}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                    <Box sx={{ flex: 1, minWidth: 200 }}>
                      <Typography variant="body2" fontWeight={700}>{c.subject}</Typography>
                      <Typography variant="caption" color="textSecondary">{c.party_name} · {TYPE_LABELS[c.contract_type]}</Typography>
                    </Box>
                    <Chip size="small" label={STATUS_LABELS[c.status]} color={c.status === 'active' ? 'success' : 'default'} variant="outlined" />
                    <Typography variant="caption" fontWeight={800}>{formatPersianNumber(c.amount || 0)}</Typography>
                  </Box>
                </Paper>
              ))}
            </Stack>
          )}
        </Paper>
      )}

      {/* Party dialog */}
      <Dialog open={openParty} onClose={() => setOpenParty(false)} maxWidth="sm" fullWidth>
        <DialogTitle>طرف قرارداد جدید</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <TextField size="small" label="نام / عنوان *" value={partyForm.name} onChange={e => setPartyForm(p => ({ ...p, name: e.target.value }))} />
          <FormControl size="small">
            <InputLabel>نوع طرف</InputLabel>
            <Select value={partyForm.party_type} label="نوع طرف" onChange={e => setPartyForm(p => ({ ...p, party_type: e.target.value }))}>
              <MenuItem value="contractor">پیمانکار</MenuItem>
              <MenuItem value="supplier">فروشنده / تأمین‌کننده</MenuItem>
              <MenuItem value="consultant">مشاور</MenuItem>
              <MenuItem value="other">سایر</MenuItem>
            </Select>
          </FormControl>
          <TextField size="small" label="شناسه ملی / کد ثبت" value={partyForm.national_id} onChange={e => setPartyForm(p => ({ ...p, national_id: e.target.value }))} />
          <TextField size="small" label="موبایل" value={partyForm.mobile} onChange={e => setPartyForm(p => ({ ...p, mobile: e.target.value }))} />
          <TextField size="small" label="ایمیل" value={partyForm.email} onChange={e => setPartyForm(p => ({ ...p, email: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenParty(false)}>انصراف</Button>
          <Button variant="contained" disabled={!partyForm.name} onClick={() => createParty.mutate(partyForm)} sx={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)' }}>ثبت</Button>
        </DialogActions>
      </Dialog>

      {/* Contract dialog */}
      <Dialog open={openContract} onClose={() => setOpenContract(false)} maxWidth="md" fullWidth>
        <DialogTitle>قرارداد جدید</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <TextField size="small" label="شماره قرارداد" value={contractForm.number} onChange={e => setContractForm(p => ({ ...p, number: e.target.value }))} />
          <TextField size="small" label="موضوع *" value={contractForm.subject} onChange={e => setContractForm(p => ({ ...p, subject: e.target.value }))} />
          <FormControl size="small">
            <InputLabel>طرف قرارداد *</InputLabel>
            <Select value={contractForm.party} label="طرف قرارداد *" onChange={e => setContractForm(p => ({ ...p, party: e.target.value }))}>
              {partyList.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small">
            <InputLabel>نوع قرارداد</InputLabel>
            <Select value={contractForm.contract_type} label="نوع قرارداد" onChange={e => setContractForm(p => ({ ...p, contract_type: e.target.value }))}>
              {Object.entries(TYPE_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField size="small" label="مبلغ (ریال)" type="number" value={contractForm.amount} onChange={e => setContractForm(p => ({ ...p, amount: e.target.value }))} />
          <Grid container spacing={1.5}>
            <Grid item xs={6}><TextField size="small" label="شروع" type="date" InputLabelProps={{ shrink: true }} value={contractForm.start_date} onChange={e => setContractForm(p => ({ ...p, start_date: e.target.value }))} /></Grid>
            <Grid item xs={6}><TextField size="small" label="پایان" type="date" InputLabelProps={{ shrink: true }} value={contractForm.end_date} onChange={e => setContractForm(p => ({ ...p, end_date: e.target.value }))} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenContract(false)}>انصراف</Button>
          <Button variant="contained" disabled={!contractForm.subject || !contractForm.party}
            onClick={() => createContract.mutate({ ...contractForm, amount: Number(contractForm.amount) || null })}
            sx={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)' }}>ثبت</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExternalContractsPage;