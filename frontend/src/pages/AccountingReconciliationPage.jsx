import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, Button, CircularProgress, Stack, Chip,
  TextField, Alert, IconButton, Tooltip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { formatPersianNumber, toPersianDigits } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';

const COLOR = '#14b8a6';
const COLOR_DARK = '#0d9488';

const glass = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.72), rgba(255,255,255,0.34))',
  backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)',
  border: '1px solid rgba(255,255,255,0.6)',
  boxShadow: '0 14px 40px rgba(20,184,166,0.12)', borderRadius: '16px',
};

const AccountingReconciliationPage = () => {
  const qc = useQueryClient();
  const [accountId, setAccountId] = useState('');
  const [statement, setStatement] = useState({ lines: [] });
  const [reconForm, setReconForm] = useState({ account: '', as_of: '', statement_balance: '' });

  const { data: accounts } = useQuery({ queryKey: ['recon-accounts'], queryFn: () => axiosInstance.get('/accounting/accounts/', { params: { kind: 'general' } }).then(r => r.data) });
  const accountList = (Array.isArray(accounts) ? accounts : accounts?.results || []).filter(a => a.is_bank_cash);

  const { data: recons } = useQuery({ queryKey: ['bank-reconciliations', accountId], queryFn: () => axiosInstance.get('/accounting/bank-reconciliations/', { params: { account: accountId || undefined } }).then(r => r.data), enabled: !!accountId });
  const reconList = Array.isArray(recons) ? recons : recons?.results || [];

  const addLine = () => setStatement(p => ({ ...p, lines: [...p.lines, { date: '', description: '', amount: '', currency: 'debit' }] }));
  const setLine = (i, k, v) => setStatement(p => { const lines = [...p.lines]; lines[i] = { ...lines[i], [k]: v }; return { ...p, lines }; });

  const saveStatement = useMutation({
    mutationFn: (p) => axiosInstance.post('/accounting/bank-statements/', p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bank-statements'] }); setStatement({ lines: [] }); },
  });
  const saveRecon = useMutation({
    mutationFn: (p) => axiosInstance.post('/accounting/bank-reconciliations/', p),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bank-reconciliations', accountId] }),
  });

  const submitStatement = () => {
    if (!statement.account) return;
    saveStatement.mutate({
      account: statement.account,
      statement_date: statement.statement_date,
      reference: statement.reference,
      opening_balance: Number(statement.opening_balance) || 0,
      closing_balance: Number(statement.closing_balance) || 0,
      lines: statement.lines.map(l => ({ date: l.date || null, description: l.description, amount: Number(l.amount) || 0, currency: l.currency })),
    });
  };

  const matchedCount = statement.lines.filter(l => l.matched).length;

  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2,
        background: `linear-gradient(120deg, ${COLOR}1a, rgba(255,255,255,0.3))`, border: `1px solid ${COLOR}30`, borderRadius: '16px' }}>
        <Avatar sx={{ width: 56, height: 56, background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, boxShadow: `0 8px 24px ${COLOR}55` }}>
          <CompareArrowsIcon sx={{ fontSize: 28, color: '#fff' }} />
        </Avatar>
        <Box>
          <Typography variant="h6" fontWeight={800} color={COLOR_DARK}>مغایرت‌گیری بانکی</Typography>
          <Typography variant="body2" color="textSecondary">وارد کردن صورتحساب، تطبیق و گزارش فاصله</Typography>
        </Box>
      </Paper>

      {/* فرم صورتحساب */}
      <Paper sx={{ ...glass, p: 2, mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={800} color={COLOR_DARK} mb={2}>صورتحساب بانکی</Typography>
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap mb={2}>
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>حساب بانکی</InputLabel>
            <Select value={statement.account || ''} label="حساب بانکی" onChange={e => setStatement(p => ({ ...p, account: e.target.value }))}>
              {accountList.map(a => <MenuItem key={a.id} value={a.id}>{a.code} - {a.name}</MenuItem>)}
            </Select>
          </FormControl>
          <JalaliDatePicker noHelper label="تاریخ صورتحساب" value={statement.statement_date} onChange={v => setStatement(p => ({ ...p, statement_date: v }))} sx={{ width: 160 }} />
          <TextField size="small" label="شماره صورتحساب" value={statement.reference || ''} onChange={e => setStatement(p => ({ ...p, reference: e.target.value }))} sx={{ width: 160 }} />
          <TextField size="small" label="مانده ابتدا" type="number" value={statement.opening_balance || ''} onChange={e => setStatement(p => ({ ...p, opening_balance: e.target.value }))} sx={{ width: 140 }} />
          <TextField size="small" label="مانده انتها" type="number" value={statement.closing_balance || ''} onChange={e => setStatement(p => ({ ...p, closing_balance: e.target.value }))} sx={{ width: 140 }} />
        </Stack>

        <Button size="small" variant="outlined" onClick={addLine} startIcon={<span>+</span>} sx={{ mb: 1.5 }}>افزودن ردیف</Button>
        {statement.lines.map((l, i) => (
          <Stack key={i} direction="row" spacing={1} mb={1} flexWrap="wrap" useFlexGap>
            <JalaliDatePicker noHelper label="تاریخ" value={l.date} onChange={v => setLine(i, 'date', v)} sx={{ width: 140 }} />
            <TextField size="small" label="شرح" value={l.description} onChange={e => setLine(i, 'description', e.target.value)} sx={{ width: 220 }} />
            <TextField size="small" label="مبلغ" type="number" value={l.amount} onChange={e => setLine(i, 'amount', e.target.value)} sx={{ width: 140 }} />
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>جهت</InputLabel>
              <Select value={l.currency} label="جهت" onChange={e => setLine(i, 'currency', e.target.value)}>
                <MenuItem value="debit">برداشت</MenuItem>
                <MenuItem value="credit">واریز</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        ))}
        <Button variant="contained" onClick={submitStatement} disabled={!statement.account}
          sx={{ background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, borderRadius: '12px' }}>ثبت صورتحساب</Button>
      </Paper>

      {/* مغایرت‌گیری */}
      <Paper sx={{ ...glass, p: 2, mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={800} color={COLOR_DARK} mb={2}>مغایرت‌گیری</Typography>
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap mb={2}>
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>حساب</InputLabel>
            <Select value={reconForm.account} label="حساب" onChange={e => setReconForm(p => ({ ...p, account: e.target.value }))}>
              {accountList.map(a => <MenuItem key={a.id} value={a.id}>{a.code} - {a.name}</MenuItem>)}
            </Select>
          </FormControl>
          <JalaliDatePicker noHelper label="تاریخ" value={reconForm.as_of} onChange={v => setReconForm(p => ({ ...p, as_of: v }))} sx={{ width: 160 }} />
          <TextField size="small" label="مانده نظام بانکی" type="number" value={reconForm.statement_balance} onChange={e => setReconForm(p => ({ ...p, statement_balance: e.target.value }))} sx={{ width: 160 }} />
          <Button variant="contained" disabled={!reconForm.account || !reconForm.statement_balance}
            onClick={() => saveRecon.mutate({ account: reconForm.account, as_of: reconForm.as_of, statement_balance: Number(reconForm.statement_balance) || 0 })}
            sx={{ background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, borderRadius: '12px' }}>محاسبه مغایرت</Button>
        </Stack>

        <TableContainer>
          <Table size="small">
            <TableHead><TableRow><TableCell>حساب</TableCell><TableCell>تاریخ</TableCell><TableCell>مانده بانک</TableCell><TableCell>مانده دفتری</TableCell><TableCell>اختلاف</TableCell></TableRow></TableHead>
            <TableBody>
              {reconList.length === 0 ? <TableRow><TableCell colSpan={5} align="center" sx={{ color: 'text.secondary' }}>مغایرت‌گیری‌ای ثبت نشده است</TableCell></TableRow> :
                reconList.map(r => (
                  <TableRow key={r.id} hover>
                    <TableCell>{r.account_code} - {r.account_name}</TableCell>
                    <TableCell>{toJalali(r.as_of)}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{formatPersianNumber(r.statement_balance)}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{formatPersianNumber(r.book_balance)}</TableCell>
                    <TableCell><Chip size="small" label={formatPersianNumber(r.difference)} color={Math.abs(Number(r.difference)) < 0.01 ? 'success' : 'warning'} /></TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default AccountingReconciliationPage;