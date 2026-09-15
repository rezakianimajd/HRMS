import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, Button, CircularProgress, Chip, Stack,
  TextField, FormControl, InputLabel, Select, MenuItem, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert, Autocomplete,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Divider,
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LockIcon from '@mui/icons-material/Lock';
import UndoIcon from '@mui/icons-material/Undo';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import { formatPersianNumber, toPersianDigits } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';

const COLOR = '#3b82f6';
const COLOR_DARK = '#2563eb';

const glass = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.70), rgba(255,255,255,0.32))',
  backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)',
  border: '1px solid rgba(255,255,255,0.6)',
  boxShadow: '0 14px 40px rgba(59,130,246,0.12)',
  borderRadius: '16px',
};

const STATUS_META = {
  draft: { label: 'پیش‌نویس', color: '#64748b' },
  submitted: { label: 'در انتظار تأیید', color: '#f59e0b' },
  approved: { label: 'تأییدشده', color: '#10b981' },
  posted: { label: 'ثبت‌شده', color: '#3b82f6' },
  locked: { label: 'قفل‌شده', color: '#6366f1' },
  reversed: { label: 'برگشت‌خورده', color: '#ef4444' },
};

const num = (v) => Number(v) || 0;

const AccountingDocumentsPage = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [doc, setDoc] = useState({ lines: [] });
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['accounting-documents'],
    queryFn: () => axiosInstance.get('/accounting/documents/').then(r => r.data),
  });
  const list = Array.isArray(data) ? data : data?.results || [];

  const { data: journals } = useQuery({ queryKey: ['accounting-journals'], queryFn: () => axiosInstance.get('/accounting/journals/').then(r => r.data) });
  const { data: years } = useQuery({ queryKey: ['accounting-fy'], queryFn: () => axiosInstance.get('/accounting/fiscal-years/').then(r => r.data) });
  const { data: accounts } = useQuery({ queryKey: ['accounting-accounts'], queryFn: () => axiosInstance.get('/accounting/accounts/').then(r => r.data) });
  const { data: auxiliaries } = useQuery({ queryKey: ['accounting-auxiliary'], queryFn: () => axiosInstance.get('/accounting/auxiliary-accounts/').then(r => r.data) });
  const { data: costCenters } = useQuery({ queryKey: ['accounting-cost-centers'], queryFn: () => axiosInstance.get('/accounting/cost-centers/').then(r => r.data) });
  const { data: projects } = useQuery({ queryKey: ['acc-projects'], queryFn: () => axiosInstance.get('/projects/').then(r => r.data) });
  const { data: contracts } = useQuery({ queryKey: ['acc-contracts'], queryFn: () => axiosInstance.get('/external-contracts/').then(r => r.data) });

  const journalList = Array.isArray(journals) ? journals : journals?.results || [];
  const yearList = Array.isArray(years) ? years : years?.results || [];
  const accountList = Array.isArray(accounts) ? accounts : accounts?.results || [];
  const auxiliaryList = Array.isArray(auxiliaries) ? auxiliaries : auxiliaries?.results || [];
  const costCenterList = Array.isArray(costCenters) ? costCenters : costCenters?.results || [];
  const projectList = Array.isArray(projects) ? projects : projects?.results || [];
  const contractList = Array.isArray(contracts) ? contracts : contracts?.results || [];

  const save = useMutation({
    mutationFn: (payload) => editing
      ? axiosInstance.patch(`/accounting/documents/${editing.id}/`, payload)
      : axiosInstance.post('/accounting/documents/', payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['accounting-documents'] }); setOpen(false); setEditing(null); },
  });

  const action = useMutation({
    mutationFn: ({ id, act }) => axiosInstance.post(`/accounting/documents/${id}/${act}/`),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['accounting-documents'] });
      setActionMsg({ ok: true, text: 'عملیات با موفقیت انجام شد' });
      setTimeout(() => setActionMsg(null), 2500);
    },
    onError: (e) => {
      setActionMsg({ ok: false, text: e.response?.data?.error || 'خطا در عملیات' });
      setTimeout(() => setActionMsg(null), 4000);
    },
  });

  const del = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/accounting/documents/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounting-documents'] }),
  });

  const setField = (k, v) => setDoc(p => ({ ...p, [k]: v }));
  const setLine = (i, k, v) => setDoc(p => {
    const lines = [...(p.lines || [])];
    lines[i] = { ...lines[i], [k]: v };
    return { ...p, lines };
  });
  const addLine = () => setDoc(p => ({ ...p, lines: [...(p.lines || []), { account: '', description: '', debit: '', credit: '', auxiliary: '', cost_center: '', project: '', contract: '' }] }));
  const removeLine = (i) => setDoc(p => ({ ...p, lines: p.lines.filter((_, idx) => idx !== i) }));

  const totalDebit = (doc.lines || []).reduce((s, l) => s + num(l.debit), 0);
  const totalCredit = (doc.lines || []).reduce((s, l) => s + num(l.credit), 0);
  const diff = totalDebit - totalCredit;

  const openNew = () => { setEditing(null); setDoc({ lines: [] }); setOpen(true); };
  const openEdit = (row) => {
    setEditing(row);
    setDoc({ ...row, lines: Array.isArray(row.lines) ? row.lines.map(l => ({
      account: l.account, auxiliary: l.auxiliary, description: l.description,
      debit: l.debit, credit: l.credit, cost_center: l.cost_center,
      project: l.project, contract: l.contract, reference: l.reference,
    })) : [] });
    setOpen(true);
  };

  const submitEditor = () => {
    setError('');
    const payload = {
      ...doc,
      journal: doc.journal,
      fiscal_year: doc.fiscal_year,
      period: doc.period,
      date: doc.date,
      description: doc.description || '',
      lines: (doc.lines || []).map((l, i) => ({
        account: l.account,
        auxiliary: l.auxiliary || null,
        description: l.description || '',
        debit: num(l.debit),
        credit: num(l.credit),
        cost_center: l.cost_center || null,
        project: l.project || null,
        contract: l.contract || null,
        reference: l.reference || '',
        line_no: i + 1,
      })),
    };
    save.mutate(payload, { onError: (e) => setError(e.response?.data?.error || 'خطا') });
  };

  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        background: `linear-gradient(120deg, ${COLOR}1a, rgba(255,255,255,0.3))`, border: `1px solid ${COLOR}30`, borderRadius: '16px' }}>
        <Avatar sx={{ width: 56, height: 56, background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, boxShadow: `0 8px 24px ${COLOR}55` }}>
          <DescriptionIcon sx={{ fontSize: 28, color: '#fff' }} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography variant="h6" fontWeight={800} color={COLOR_DARK}>اسناد حسابداری</Typography>
          <Typography variant="body2" color="textSecondary">ثبت، تأیید و ثبت نهایی اسناد با چرخهٔ دوطرفه</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}
          sx={{ background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, borderRadius: '12px', px: 3 }}>
          سند جدید
        </Button>
      </Paper>

      {actionMsg && <Alert severity={actionMsg.ok ? 'success' : 'error'} sx={{ mb: 2, borderRadius: '12px' }}>{actionMsg.text}</Alert>}

      <Paper sx={{ ...glass, p: 2 }}>
        {isLoading ? <Box textAlign="center" py={4}><CircularProgress /></Box> : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>شماره</TableCell>
                  <TableCell>تاریخ</TableCell>
                  <TableCell>دفتر</TableCell>
                  <TableCell>شرح</TableCell>
                  <TableCell>بدهکار</TableCell>
                  <TableCell>بستانکار</TableCell>
                  <TableCell>وضعیت</TableCell>
                  <TableCell>عملیات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {list.length === 0 ? (
                  <TableRow><TableCell colSpan={8} align="center" sx={{ color: 'text.secondary' }}>سندی ثبت نشده است</TableCell></TableRow>
                ) : list.map(row => (
                  <TableRow key={row.id} hover>
                    <TableCell>{row.number || `#${row.id}`}</TableCell>
                    <TableCell>{toJalali(row.date)}</TableCell>
                    <TableCell>{row.journal_name || '—'}</TableCell>
                    <TableCell sx={{ maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.description}</TableCell>
                    <TableCell>{formatPersianNumber(row.total_debit)}</TableCell>
                    <TableCell>{formatPersianNumber(row.total_credit)}</TableCell>
                    <TableCell>
                      <Chip size="small" label={STATUS_META[row.status]?.label || row.status}
                        sx={{ bgcolor: `${STATUS_META[row.status]?.color || '#64748b'}18`, color: STATUS_META[row.status]?.color || '#64748b', fontWeight: 700 }} />
                    </TableCell>
                    <TableCell>
                      {row.status === 'draft' && <Tooltip title="ویرایش"><IconButton size="small" onClick={() => openEdit(row)}><EditIcon fontSize="small" /></IconButton></Tooltip>}
                      {row.status === 'draft' && <Tooltip title="ارسال"><IconButton size="small" color="primary" onClick={() => action.mutate({ id: row.id, act: 'submit' })}><SendIcon fontSize="small" /></IconButton></Tooltip>}
                      {row.status === 'submitted' && <Tooltip title="تأیید"><IconButton size="small" color="success" onClick={() => action.mutate({ id: row.id, act: 'approve' })}><CheckCircleIcon fontSize="small" /></IconButton></Tooltip>}
                      {(row.status === 'approved' || row.status === 'submitted') && <Tooltip title="ثبت نهایی"><IconButton size="small" color="info" onClick={() => action.mutate({ id: row.id, act: 'post_document' })}><LockIcon fontSize="small" /></IconButton></Tooltip>}
                      {(row.status === 'posted' || row.status === 'locked') && <Tooltip title="برگشت"><IconButton size="small" color="warning" onClick={() => action.mutate({ id: row.id, act: 'reverse' })}><UndoIcon fontSize="small" /></IconButton></Tooltip>}
                      {row.status === 'draft' && <Tooltip title="حذف"><IconButton size="small" color="error" onClick={() => { if (window.confirm('حذف؟')) del.mutate(row.id); }}><DeleteIcon fontSize="small" /></IconButton></Tooltip>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Editor dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ color: COLOR_DARK }}>{editing ? 'ویرایش سند' : 'سند جدید'}</DialogTitle>
        <DialogContent sx={{ mt: 1 }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>دفتر روزنامه</InputLabel>
              <Select value={doc.journal || ''} label="دفتر روزنامه" onChange={e => setField('journal', e.target.value)}>
                {journalList.map(j => <MenuItem key={j.id} value={j.id}>{j.name}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>سال مالی</InputLabel>
              <Select value={doc.fiscal_year || ''} label="سال مالی" onChange={e => setField('fiscal_year', e.target.value)}>
                {yearList.map(y => <MenuItem key={y.id} value={y.id}>{y.name}</MenuItem>)}
              </Select>
            </FormControl>
            <JalaliDatePicker label="تاریخ سند" value={doc.date || ''} onChange={v => setField('date', v)} />
          </Stack>

          <TextField fullWidth size="small" multiline rows={2} label="شرح سند" value={doc.description || ''} onChange={e => setField('description', e.target.value)} sx={{ mb: 2 }} />

          <TableContainer sx={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>حساب</TableCell>
                  <TableCell>شرح سطر</TableCell>
                  <TableCell>بدهکار</TableCell>
                  <TableCell>بستانکار</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(doc.lines || []).map((l, i) => (
                  <React.Fragment key={i}>
                    <TableRow>
                      <TableCell sx={{ minWidth: 220 }}>
                        <Autocomplete
                          size="small"
                          options={accountList}
                          getOptionLabel={(o) => `${o.code} - ${o.name}`}
                          value={accountList.find(a => a.id === l.account) || null}
                          onChange={(e, v) => setLine(i, 'account', v ? v.id : '')}
                          renderInput={(params) => <TextField {...params} placeholder="جستجوی حساب" />}
                        />
                      </TableCell>
                      <TableCell><TextField size="small" fullWidth value={l.description || ''} onChange={e => setLine(i, 'description', e.target.value)} /></TableCell>
                      <TableCell><TextField size="small" type="number" value={l.debit || ''} onChange={e => setLine(i, 'debit', e.target.value)} sx={{ width: 110 }} /></TableCell>
                      <TableCell><TextField size="small" type="number" value={l.credit || ''} onChange={e => setLine(i, 'credit', e.target.value)} sx={{ width: 110 }} /></TableCell>
                      <TableCell><IconButton size="small" color="error" onClick={() => removeLine(i)}><RemoveCircleIcon fontSize="small" /></IconButton></TableCell>
                    </TableRow>
                    <TableRow sx={{ '& td': { borderBottom: '2px dashed rgba(59,130,246,0.2)' } }}>
                      <TableCell colSpan={5}>
                        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                          <Autocomplete
                            size="small" sx={{ minWidth: 180 }}
                            options={auxiliaryList}
                            getOptionLabel={(o) => `${o.code} - ${o.name}`}
                            value={auxiliaryList.find(a => a.id === l.auxiliary) || null}
                            onChange={(e, v) => setLine(i, 'auxiliary', v ? v.id : '')}
                            renderInput={(params) => <TextField {...params} label="تفصیلی" />}
                          />
                          <Autocomplete
                            size="small" sx={{ minWidth: 170 }}
                            options={costCenterList}
                            getOptionLabel={(o) => `${o.code} - ${o.name}`}
                            value={costCenterList.find(a => a.id === l.cost_center) || null}
                            onChange={(e, v) => setLine(i, 'cost_center', v ? v.id : '')}
                            renderInput={(params) => <TextField {...params} label="مرکز هزینه" />}
                          />
                          <Autocomplete
                            size="small" sx={{ minWidth: 180 }}
                            options={projectList}
                            getOptionLabel={(o) => `${o.code || ''} ${o.name}`}
                            value={projectList.find(a => a.id === l.project) || null}
                            onChange={(e, v) => setLine(i, 'project', v ? v.id : '')}
                            renderInput={(params) => <TextField {...params} label="پروژه" />}
                          />
                          <Autocomplete
                            size="small" sx={{ minWidth: 200 }}
                            options={contractList}
                            getOptionLabel={(o) => `${o.number || ''} - ${o.subject || o.name || ''}`}
                            value={contractList.find(a => a.id === l.contract) || null}
                            onChange={(e, v) => setLine(i, 'contract', v ? v.id : '')}
                            renderInput={(params) => <TextField {...params} label="قرارداد" />}
                          />
                        </Stack>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Button size="small" startIcon={<AddCircleIcon />} onClick={addLine} sx={{ mt: 1 }}>افزودن سطر</Button>

          <Stack direction="row" spacing={3} alignItems="center" sx={{ mt: 2, p: 2, background: 'rgba(59,130,246,0.05)', borderRadius: '10px' }}>
            <Typography variant="body2">بدهکار: <b>{formatPersianNumber(totalDebit)}</b></Typography>
            <Typography variant="body2">بستانکار: <b>{formatPersianNumber(totalCredit)}</b></Typography>
            <Chip label={diff === 0 ? 'متوازن ✓' : `اختلاف: ${formatPersianNumber(diff)}`}
              color={diff === 0 ? 'success' : 'error'} size="small" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>انصراف</Button>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={submitEditor} disabled={save.isLoading || diff !== 0}
            sx={{ background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})` }}>
            {save.isLoading ? <CircularProgress size={20} /> : 'ذخیره پیش‌نویس'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AccountingDocumentsPage;