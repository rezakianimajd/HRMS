import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box, Typography, Paper, Button, IconButton, Chip, Avatar, Grid,
  FormControl, InputLabel, Select, MenuItem, CircularProgress, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert,
  Table, TableHead, TableRow, TableCell, TableBody, Tooltip, Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import DrawIcon from '@mui/icons-material/Draw';
import HistoryEduIcon from '@mui/icons-material/HistoryEdu';
import PrintIcon from '@mui/icons-material/Print';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';
import { useEmployees, useContractTypes } from '../core/hooks/useEmployees';
import { toPersianDigits, formatPersianNumber } from '../core/utils/numberUtils';
import { buildContractPrintHtml } from '../core/utils/contractPrintHtml';
import { toJalali } from '../core/utils/dateUtils';

const EMPTY_FORM = {
  employee: '', version: 1, year: 1404, contract_type: '',
  start_date: '', end_date: '', base_salary: '',
  attraction_allowance: '', job_allowance: '', housing_allowance: '',
  meal_voucher: '', travel_cost: '', family_allowance: '', children_allowance: '',
  description: '',
};

function num(v) {
  return v === '' || v == null ? null : Number(v);
}

const ContractsPage = () => {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [employeeFilter, setEmployeeFilter] = useState(searchParams.get('employee_id') || '');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [compareInfo, setCompareInfo] = useState(null);
  const [signTarget, setSignTarget] = useState(null);
  const [compareWith, setCompareWith] = useState('');
  const [textTarget, setTextTarget] = useState(null);
  const [textValue, setTextValue] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: employees } = useEmployees({ is_active: true });
  const empList = Array.isArray(employees) ? employees : employees?.results || [];
  const { data: contractTypes } = useContractTypes();
  const cts = Array.isArray(contractTypes) ? contractTypes : contractTypes?.results || [];

  const { data: profile } = useQuery({
    queryKey: ['company-profile-contracts'],
    queryFn: () => axiosInstance.get('/settings/company-profile/').then(r => r.data).catch(() => null),
  });
  const companyLogo = profile?.logo_url || null;

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
      setCreating(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => axiosInstance.patch(`/contract-versions/${id}/`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-versions'] });
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/contract-versions/${id}/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contract-versions'] }),
  });

  const [signImageFile, setSignImageFile] = useState(null);
  const [selectedSignatory, setSelectedSignatory] = useState('');
  const signMutation = useMutation({
    mutationFn: ({ id, payload }) => axiosInstance.post(`/contract-versions/${id}/sign/`, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contract-versions'] }),
  });

  const { data: signatories } = useQuery({
    queryKey: ['signatories'],
    queryFn: () => axiosInstance.get('/signatories/').then(r => r.data),
  });
  const signatoryList = Array.isArray(signatories) ? signatories : signatories?.results || [];

  const generateTextMutation = useMutation({
    mutationFn: (id) => axiosInstance.post(`/contract-versions/${id}/generate_text/`),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contract-versions'] });
      setTextTarget(data);
      setTextValue(data.contract_text || '');
    },
  });

  const saveTextMutation = useMutation({
    mutationFn: ({ id, contract_text }) => axiosInstance.patch(`/contract-versions/${id}/`, { contract_text }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-versions'] });
      setTextTarget(null);
    },
  });

  const compareQuery = useQuery({
    queryKey: ['contract-compare', compareInfo?.id, compareWith],
    queryFn: () => axiosInstance.get(`/contract-versions/${compareInfo.id}/compare/`, { params: { other_id: compareWith } }).then(r => r.data),
    enabled: !!compareInfo && !!compareWith,
  });

  const empName = (id) => empList.find((e) => String(e.id) === String(id))?.full_name || '—';

  const openCreate = () => { setForm(EMPTY_FORM); setCreating(true); };
  const openEdit = (c) => {
    setForm({
      employee: c.employee || '',
      version: c.version || 1,
      year: c.year || 1404,
      contract_type: c.contract_type || '',
      start_date: c.start_date || '',
      end_date: c.end_date || '',
      base_salary: c.base_salary ?? '',
      attraction_allowance: c.attraction_allowance ?? '',
      job_allowance: c.job_allowance ?? '',
      housing_allowance: c.housing_allowance ?? '',
      meal_voucher: c.meal_voucher ?? '',
      travel_cost: c.travel_cost ?? '',
      family_allowance: c.family_allowance ?? '',
      children_allowance: c.children_allowance ?? '',
      description: c.description || '',
    });
    setEditing(c);
  };

  const buildPayload = () => ({
    employee: form.employee,
    version: Number(form.version),
    year: Number(form.year),
    contract_type: form.contract_type || null,
    start_date: form.start_date,
    end_date: form.end_date || null,
    base_salary: num(form.base_salary),
    attraction_allowance: num(form.attraction_allowance),
    job_allowance: num(form.job_allowance),
    housing_allowance: num(form.housing_allowance),
    meal_voucher: num(form.meal_voucher),
    travel_cost: num(form.travel_cost),
    family_allowance: num(form.family_allowance),
    children_allowance: num(form.children_allowance),
    description: form.description,
  });

  const handleDelete = (c) => {
    if (window.confirm(`حذف قرارداد نسخه ${c.version} (${c.year})؟`)) {
      deleteMutation.mutate(c.id);
    }
  };

  const openText = (contract) => {
    setTextTarget(contract);
    setTextValue(contract.contract_text || '');
  };

  const handlePrint = () => {
    const w = window.open('', '_blank', 'width=800,height=900');
    if (!w) return;
    const html = buildContractPrintHtml({
      textValue,
      logoUrl: companyLogo,
      companyName: profile?.legal_name || profile?.company_name,
      companyAddress: profile?.address,
      signatureImageUrl: textTarget?.signature_image_url,
      reportTitle: 'قرارداد کار',
    });
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  };

  const moneyField = (key, label) => (
    <TextField fullWidth size="small" label={label} type="number" value={form[key]}
      onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} />
  );

  return (
    <Box>
      {/* Header */}
      <Paper sx={{
        p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2,
        background: 'linear-gradient(120deg, rgba(245,158,11,0.09), rgba(239,68,68,0.04), rgba(255,255,255,0.3))',
        border: '1px solid rgba(245,158,11,0.16)', borderRadius: '10px',
      }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #f59e0b, #ef4444)', boxShadow: '0 8px 24px rgba(245,158,11,0.35)' }}>
          <HistoryEduIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={800} color="#b45309">قراردادها و نسخه‌بندی</Typography>
          <Typography variant="body2" color="textSecondary">نسخه‌بندی هوشمند، مقایسهٔ نسخه‌ها و امضای دیجیتال</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}
          sx={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)', borderRadius: '10px', px: 2.5 }}>
          نسخهٔ جدید
        </Button>
      </Paper>

      {/* Filter */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: '10px', background: 'rgba(255,255,255,0.6)' }}>
        <FormControl sx={{ minWidth: { xs: '100%', md: 280 } }} size="small">
          <InputLabel>فیلتر بر اساس پرسنل</InputLabel>
          <Select value={employeeFilter || ''} label="فیلتر بر اساس پرسنل" onChange={(e) => setEmployeeFilter(e.target.value)}>
            <MenuItem value="">همه</MenuItem>
            {empList.map((e) => <MenuItem key={e.id} value={e.id}>{e.full_name} ({e.employee_id})</MenuItem>)}
          </Select>
        </FormControl>
      </Paper>

      {/* Table */}
      <Paper variant="outlined" sx={{ borderRadius: '10px', overflow: 'hidden' }}>
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
                      <Tooltip title="ویرایش">
                        <IconButton size="small" color="primary" onClick={() => openEdit(c)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
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
                      {c.contract_text ? (
                        <Tooltip title="مشاهده / ویرایش متن">
                          <IconButton size="small" color="info" onClick={() => openText(c)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Tooltip title="تولید متن قرارداد">
                          <IconButton size="small" color="warning" onClick={() => generateTextMutation.mutate(c.id)}>
                            <TextFieldsIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="حذف">
                        <IconButton size="small" color="error" onClick={() => handleDelete(c)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Paper>

      {/* Create / Edit dialog */}
      <Dialog open={creating || !!editing} onClose={() => { setCreating(false); setEditing(null); }} maxWidth="md" fullWidth>
        <DialogTitle sx={{ color: '#b45309' }}>{editing ? 'ویرایش نسخهٔ قرارداد' : 'نسخهٔ جدید قرارداد'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <Grid container spacing={1.5}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>پرسنل *</InputLabel>
                <Select value={form.employee || ''} label="پرسنل *" onChange={(e) => setForm((p) => ({ ...p, employee: e.target.value }))}>
                  {empList.map((e) => <MenuItem key={e.id} value={e.id}>{e.full_name} ({e.employee_id})</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>نوع قرارداد</InputLabel>
                <Select value={form.contract_type || ''} label="نوع قرارداد" onChange={(e) => setForm((p) => ({ ...p, contract_type: e.target.value }))}>
                  <MenuItem value="">—</MenuItem>
                  {cts.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField fullWidth size="small" label="نسخه" type="number" value={form.version}
                onChange={(e) => setForm((p) => ({ ...p, version: e.target.value }))} />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField fullWidth size="small" label="سال" type="number" value={form.year}
                onChange={(e) => setForm((p) => ({ ...p, year: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={6}>
              <JalaliDatePicker fullWidth label="تاریخ شروع *" value={form.start_date}
                onChange={(g) => setForm((p) => ({ ...p, start_date: g }))} />
            </Grid>
            <Grid item xs={12} md={6}>
              <JalaliDatePicker fullWidth label="تاریخ پایان" value={form.end_date}
                onChange={(g) => setForm((p) => ({ ...p, end_date: g }))} />
            </Grid>
          </Grid>

          <Divider />
          <Typography variant="subtitle2" fontWeight={800} color="#b45309">حقوق و مزایا (ریال)</Typography>
          <Grid container spacing={1.5}>
            <Grid item xs={12} md={6}>{moneyField('base_salary', 'حقوق پایه')}</Grid>
            <Grid item xs={12} md={6}>{moneyField('attraction_allowance', 'حق جذب')}</Grid>
            <Grid item xs={12} md={6}>{moneyField('job_allowance', 'فوق‌العاده شغل')}</Grid>
            <Grid item xs={12} md={6}>{moneyField('housing_allowance', 'حق مسکن')}</Grid>
            <Grid item xs={12} md={6}>{moneyField('meal_voucher', 'بن و خواربار')}</Grid>
            <Grid item xs={12} md={6}>{moneyField('travel_cost', 'ایاب و ذهاب')}</Grid>
            <Grid item xs={12} md={6}>{moneyField('family_allowance', 'حق عائله‌مندی')}</Grid>
            <Grid item xs={12} md={6}>{moneyField('children_allowance', 'حق اولاد')}</Grid>
          </Grid>

          <TextField fullWidth size="small" label="توضیحات" multiline rows={2} value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setCreating(false); setEditing(null); }}>انصراف</Button>
          <Button
            variant="contained" disabled={!form.employee || !form.start_date}
            onClick={() => editing ? updateMutation.mutate({ id: editing.id, payload: buildPayload() }) : createMutation.mutate(buildPayload())}
            sx={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>
            {editing ? 'ذخیره تغییرات' : 'ثبت نسخه'}
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
                    <TableRow><TableCell>فیلد</TableCell><TableCell>نسخهٔ قدیمی</TableCell><TableCell>نسخهٔ جدید</TableCell></TableRow>
                  </TableHead>
                  <TableBody>
                    {compareQuery.data.diffs.map((d, i) => (
                      <TableRow key={i}><TableCell>{d.label}</TableCell><TableCell>{String(d.old ?? '—')}</TableCell><TableCell sx={{ fontWeight: 700 }}>{String(d.new ?? '—')}</TableCell></TableRow>
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

      {/* Contract text dialog (view / edit / print) */}
      <Dialog open={!!textTarget} onClose={() => setTextTarget(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>متن قرارداد {textTarget ? `(نسخه ${textTarget.version} - ${textTarget.year})` : ''}</span>
          <Button variant="contained" size="small" startIcon={<PrintIcon />} onClick={handlePrint}
            sx={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>چاپ</Button>
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth multiline minRows={18} maxRows={30} variant="outlined" size="small"
            label="متن قرارداد" value={textValue} dir="rtl"
            onChange={(e) => setTextValue(e.target.value)}
            sx={{ mt: 1, '& textarea': { fontFamily: 'Vazirmatn, Tahoma, sans-serif', lineHeight: 2, textAlign: 'right' } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTextTarget(null)}>بستن</Button>
          <Button variant="contained" onClick={() => textTarget && saveTextMutation.mutate({ id: textTarget.id, contract_text: textValue })}
            sx={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>ذخیره متن</Button>
        </DialogActions>
      </Dialog>

      {/* Sign dialog — select from authorized signatories */}
      <Dialog open={!!signTarget} onClose={() => setSignTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: '#047857' }}>امضای قرارداد</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <Typography variant="caption" color="textSecondary">
            صاحب امضا را از فهرست امضاهای مجاز انتخاب کنید.
          </Typography>
          <FormControl fullWidth size="small">
            <InputLabel>صاحب امضا *</InputLabel>
            <Select
              value={selectedSignatory || ''}
              label="صاحب امضا *"
              onChange={(e) => setSelectedSignatory(e.target.value)}
            >
              {signatoryList
                .filter((s) => s.is_active !== false)
                .map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.full_name}{s.position ? ` — ${s.position}` : ''}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
          {selectedSignatory && signatoryList.find((s) => s.id === selectedSignatory)?.signature_image_url && (
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <img
                src={signatoryList.find((s) => s.id === selectedSignatory)?.signature_image_url}
                alt="نمونه امضا"
                style={{ maxHeight: 80, objectFit: 'contain', background: '#f8fafc', borderRadius: '10px', padding: 6 }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setSignTarget(null); setSelectedSignatory(''); }}>انصراف</Button>
          <Button
            variant="contained"
            sx={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
            disabled={!selectedSignatory}
            onClick={() =>
              signMutation.mutate(
                { id: signTarget.id, payload: { signatory_id: selectedSignatory } },
                {
                  onSuccess: () => {
                    setSignTarget(null);
                    setSelectedSignatory('');
                  },
                }
              )
            }
          >
            ثبت امضاء
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ContractsPage;