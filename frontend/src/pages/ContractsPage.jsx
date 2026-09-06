import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box, Typography, Paper, Button, IconButton, Chip, Avatar, Grid,
  FormControl, InputLabel, Select, MenuItem, CircularProgress, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert,
  Table, TableHead, TableRow, TableCell, TableBody, Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import DrawIcon from '@mui/icons-material/Draw';
import HistoryEduIcon from '@mui/icons-material/HistoryEdu';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';
import { useEmployees, useContractTypes } from '../core/hooks/useEmployees';
import { toPersianDigits, formatPersianNumber } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';

const ContractsPage = () => {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [employeeFilter, setEmployeeFilter] = useState(searchParams.get('employee_id') || '');
  const [openCreate, setOpenCreate] = useState(false);
  const [compareInfo, setCompareInfo] = useState(null);
  const [signTarget, setSignTarget] = useState(null);
  const [compareWith, setCompareWith] = useState('');
  const [form, setForm] = useState({
    employee: '', version: 1, year: 1404, contract_type: '',
    start_date: '', end_date: '', base_salary: '', description: '',
  });

  const { data: employees } = useEmployees({ is_active: true });
  const empList = Array.isArray(employees) ? employees : employees?.results || [];
  const { data: contractTypes } = useContractTypes();
  const cts = Array.isArray(contractTypes) ? contractTypes : contractTypes?.results || [];

  const { data, isLoading } = useQuery({
    queryKey: ['contract-versions', employeeFilter],
    queryFn: () =>
      axiosInstance.get('/contract-versions/', { params: employeeFilter ? { employee_id: employeeFilter } : {} }).then(r => r.data),
  });
  const items = Array.isArray(data) ? data : data?.results || [];

  const createMutation = useMutation({
    mutationFn: (payload) => axiosInstance.post('/contract-versions/', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-versions'] });
      setOpenCreate(false);
    },
  });

  const signMutation = useMutation({
    mutationFn: ({ id, signed_by }) => axiosInstance.post(`/contract-versions/${id}/sign/`, { signed_by }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contract-versions'] }),
  });

  const compareQuery = useQuery({
    queryKey: ['contract-compare', compareInfo?.id, compareWith],
    queryFn: () => axiosInstance.get(`/contract-versions/${compareInfo.id}/compare/`, { params: { other_id: compareWith } }).then(r => r.data),
    enabled: !!compareInfo && !!compareWith,
  });

  const empName = (id) => empList.find((e) => String(e.id) === String(id))?.full_name || '—';

  const doCreate = () => {
    createMutation.mutate({
      employee: form.employee,
      version: Number(form.version),
      year: Number(form.year),
      contract_type: form.contract_type || null,
      start_date: form.start_date,
      end_date: form.end_date || null,
      base_salary: form.base_salary || null,
      description: form.description,
    });
  };

  return (
    <Box>
      {/* Header */}
      <Paper sx={{
        p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2,
        background: 'linear-gradient(120deg, rgba(245,158,11,0.09), rgba(239,68,68,0.04), rgba(255,255,255,0.3))',
        border: '1px solid rgba(245,158,11,0.16)', borderRadius: 3,
      }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #f59e0b, #ef4444)', boxShadow: '0 8px 24px rgba(245,158,11,0.35)' }}>
          <HistoryEduIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={800} color="#b45309">قراردادها و نسخه‌بندی</Typography>
          <Typography variant="body2" color="textSecondary">نسخه‌بندی هوشمند، مقایسهٔ نسخه‌ها و امضای دیجیتال</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenCreate(true)}
          sx={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)', borderRadius: 2, px: 2.5 }}>
          نسخهٔ جدید
        </Button>
      </Paper>

      {/* Filter */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 2.5, background: 'rgba(255,255,255,0.6)' }}>
        <FormControl sx={{ minWidth: { xs: '100%', md: 280 } }} size="small">
          <InputLabel>فیلتر بر اساس پرسنل</InputLabel>
          <Select value={employeeFilter || ''} label="فیلتر بر اساس پرسنل" onChange={(e) => setEmployeeFilter(e.target.value)}>
            <MenuItem value="">همه</MenuItem>
            {empList.map((e) => <MenuItem key={e.id} value={e.id}>{e.full_name} ({e.employee_id})</MenuItem>)}
          </Select>
        </FormControl>
      </Paper>

      {/* Table */}
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        {isLoading ? (
          <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress /></Box>
        ) : items.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography color="textSecondary">قراردادی ثبت نشده است</Typography>
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table dir="rtl" size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, color: '#475569', background: 'rgba(245,158,11,0.06)' } }}>
                  <TableCell>نسخه</TableCell>
                  <TableCell>سال</TableCell>
                  <TableCell>پرسنل</TableCell>
                  <TableCell>نوع</TableCell>
                  <TableCell>شروع</TableCell>
                  <TableCell>پایان</TableCell>
                  <TableCell>حقوق پایه</TableCell>
                  <TableCell>امضاء</TableCell>
                  <TableCell>اقدامات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((c) => (
                  <TableRow key={c.id} hover>
                    <TableCell>{toPersianDigits(c.version)}</TableCell>
                    <TableCell>{toPersianDigits(c.year)}</TableCell>
                    <TableCell>{c.employee_name || empName(c.employee)}</TableCell>
                    <TableCell>{c.contract_type_display || '—'}</TableCell>
                    <TableCell>{c.start_date ? toJalali(c.start_date) : '—'}</TableCell>
                    <TableCell>{c.end_date ? toJalali(c.end_date) : '—'}</TableCell>
                    <TableCell>{c.base_salary ? formatPersianNumber(c.base_salary) : '—'}</TableCell>
                    <TableCell>
                      {c.signed_by ? (
                        <Chip size="small" color="success" icon={<DrawIcon />} label={c.signed_by} />
                      ) : (
                        <Chip size="small" color="default" label="—" />
                      )}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      <Tooltip title="مقایسه">
                        <IconButton size="small" color="primary" onClick={() => setCompareInfo(c)}>
                          <CompareArrowsIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {!c.signed_by && (
                        <Tooltip title="امضاء">
                          <IconButton size="small" color="success" onClick={() => setSignTarget(c)}>
                            <DrawIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Paper>

      {/* Create dialog */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: '#b45309' }}>نسخهٔ جدید قرارداد</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <FormControl fullWidth size="small">
            <InputLabel>پرسنل *</InputLabel>
            <Select value={form.employee || ''} label="پرسنل *" onChange={(e) => setForm((p) => ({ ...p, employee: e.target.value }))}>
              {empList.map((e) => <MenuItem key={e.id} value={e.id}>{e.full_name} ({e.employee_id})</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel>نوع قرارداد</InputLabel>
            <Select value={form.contract_type || ''} label="نوع قرارداد" onChange={(e) => setForm((p) => ({ ...p, contract_type: e.target.value }))}>
              <MenuItem value="">—</MenuItem>
              {cts.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </Select>
          </FormControl>
          <Grid container spacing={1}>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="نسخه" type="number" value={form.version}
                onChange={(e) => setForm((p) => ({ ...p, version: e.target.value }))} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="سال" type="number" value={form.year}
                onChange={(e) => setForm((p) => ({ ...p, year: e.target.value }))} />
            </Grid>
          </Grid>
          <JalaliDatePicker fullWidth label="تاریخ شروع *" value={form.start_date}
            onChange={(g) => setForm((p) => ({ ...p, start_date: g }))} />
          <JalaliDatePicker fullWidth label="تاریخ پایان" value={form.end_date}
            onChange={(g) => setForm((p) => ({ ...p, end_date: g }))} />
          <TextField fullWidth size="small" label="حقوق پایه (ریال)" type="number" value={form.base_salary}
            onChange={(e) => setForm((p) => ({ ...p, base_salary: e.target.value }))} />
          <TextField fullWidth size="small" label="توضیحات" multiline rows={2} value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreate(false)}>انصراف</Button>
          <Button variant="contained" disabled={!form.employee || !form.start_date} onClick={doCreate}
            sx={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>
            ثبت نسخه
          </Button>
        </DialogActions>
      </Dialog>

      {/* Compare dialog */}
      <Dialog open={!!compareInfo} onClose={() => setCompareInfo(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ color: '#b45309' }}>مقایسهٔ نسخه‌ها</DialogTitle>
        <DialogContent>
          {compareInfo && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <FormControl fullWidth size="small">
                <InputLabel>مقایسه با نسخهٔ دیگر</InputLabel>
                <Select value={compareWith || ''} label="مقایسه با نسخهٔ دیگر" onChange={(e) => setCompareWith(e.target.value)}>
                  {items.filter((it) => it.id !== compareInfo.id).map((it) => (
                    <MenuItem key={it.id} value={it.id}>{`سال ${it.year} - نسخه ${it.version}`}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              {compareQuery.data && (
                <Alert severity="info">
                  {compareQuery.data.diffs.length === 0
                    ? 'هیچ تفاوتی بین دو نسخه وجود ندارد.'
                    : `${toPersianDigits(compareQuery.data.diffs.length)} تفاوت یافت شد.`}
                </Alert>
              )}

              {compareQuery.data?.diffs?.length > 0 && (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>فیلد</TableCell>
                      <TableCell>نسخهٔ قدیمی</TableCell>
                      <TableCell>نسخهٔ جدید</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {compareQuery.data.diffs.map((d, i) => (
                      <TableRow key={i}>
                        <TableCell>{d.label}</TableCell>
                        <TableCell>{String(d.old ?? '—')}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{String(d.new ?? '—')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setCompareInfo(null); setCompareWith(''); }}>بستن</Button>
        </DialogActions>
      </Dialog>

      {/* Sign dialog */}
      <Dialog open={!!signTarget} onClose={() => setSignTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: '#047857' }}>امضای دیجیتال</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus fullWidth size="small" label="نام امضاکننده" sx={{ mt: 1 }}
            onChange={(e) => setForm((p) => ({ ...p, signed_by: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSignTarget(null)}>انصراف</Button>
          <Button
            variant="contained"
            sx={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
            disabled={!form.signed_by}
            onClick={() => {
              signMutation.mutate({ id: signTarget.id, signed_by: form.signed_by }, {
                onSuccess: () => { setSignTarget(null); setForm((p) => ({ ...p, signed_by: '' })); },
              });
            }}
          >
            ثبت امضاء
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ContractsPage;