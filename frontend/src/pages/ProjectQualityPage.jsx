import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, FormControl, FormControlLabel, Grid, IconButton, InputLabel,
  LinearProgress, MenuItem, Paper, Select, Stack, Tab, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Tabs, TextField, Tooltip, Typography, Checkbox,
} from '@mui/material';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import { formatPersianNumber, toPersianDigits } from '../core/utils/numberUtils';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';
import InfoCard from '../core/components/ui/InfoCard';

const FONT = 'Vazirmatn, IRANSans, sans-serif';
const money = (v) => formatPersianNumber(v || 0);
const numSx = { direction: 'ltr', textAlign: 'center !important', whiteSpace: 'nowrap', fontFamily: FONT };
const headSx = {
  fontWeight: 800, whiteSpace: 'nowrap', fontSize: 12.5,
  textAlign: 'center !important', bgcolor: 'rgba(248,250,252,0.9)',
};
const NCR_STATUS = {
  open: { label: 'باز', color: '#ef4444' },
  correcting: { label: 'در حال اصلاح', color: '#f59e0b' },
  verifying: { label: 'در حال تأیید', color: '#0ea5e9' },
  closed: { label: 'بسته', color: '#10b981' },
  cancelled: { label: 'لغو شده', color: '#94a3b8' },
};
const SEVERITY = {
  minor: { label: 'جزئی', color: '#64748b' },
  major: { label: 'عمده', color: '#f59e0b' },
  critical: { label: 'بحرانی', color: '#ef4444' },
};
const PUNCH_STATUS = {
  open: { label: 'باز', color: '#ef4444' },
  in_progress: { label: 'در حال رفع', color: '#f59e0b' },
  fixed: { label: 'رفع‌شده', color: '#0ea5e9' },
  verified: { label: 'تأییدشده', color: '#10b981' },
  rejected: { label: 'رد شده', color: '#94a3b8' },
};
const PRIORITY = {
  low: { label: 'کم', color: '#64748b' },
  medium: { label: 'متوسط', color: '#f59e0b' },
  high: { label: 'زیاد', color: '#ef4444' },
};
const HSE_STATUS = {
  open: { label: 'باز', color: '#ef4444' },
  investigating: { label: 'در حال بررسی', color: '#f59e0b' },
  closed: { label: 'بسته', color: '#10b981' },
};
const HSE_TYPE = {
  near_miss: 'شبه‌حادثه', first_aid: 'کمک‌های اولیه', medical_treatment: 'درمان پزشکی',
  lost_time: 'از کارافتادگی (LTI)', environmental: 'زیست‌محیطی',
  property_damage: 'خسارت به اموال', fire: 'آتش‌سوزی', other: 'سایر',
};
const INSP_TYPE = {
  material: 'کنترل مواد', shop: 'کارگاهی', site: 'محلی', test: 'آزمون',
  commissioning: 'راه‌اندازی', survey: 'نقشه‌برداری', document: 'بازنگری مدارک', other: 'سایر',
};
const POINT_TYPE = { hold: 'توقف (H)', witness: 'شاهد (W)', review: 'بازنگری (R)', surveillance: 'پایش (S)' };
const ITEM_STATUS = {
  not_started: { label: 'شروع‌نشده', color: '#94a3b8' },
  in_progress: { label: 'در جریان', color: '#0ea5e9' },
  passed: { label: 'قبول‌شده', color: '#10b981' },
  failed: { label: 'رد شده', color: '#ef4444' },
  waived: { label: 'معاف‌شده', color: '#64748b' },
};
const RESULT = {
  pass: { label: 'قبول', color: '#10b981' },
  fail: { label: 'رد', color: '#ef4444' },
  conditional: { label: 'قبول مشروط', color: '#f59e0b' },
  na: { label: 'قابل‌اجرا نبود', color: '#94a3b8' },
};

const chipOf = (map, key) => {
  const meta = map[key] || { label: key || '—', color: '#64748b' };
  return (
    <Chip size="small" label={meta.label}
      sx={{ fontWeight: 700, fontSize: 12, bgcolor: `${meta.color}22`, color: meta.color }} />
  );
};

const KpiCard = ({ title, value, sub, color = '#0ea5e9', icon }) => (
  <InfoCard icon={icon} label={title} value={value} suffix={sub} color={color} />
);

const emptyPlan = () => ({
  project: '', number: '', title: '', revision: '00', date: '', status: 'active',
  prepared_by_name: '', approved_by_name: '', description: '',
  items: [{ item_no: '1', description: '', inspection_type: 'site', point_type: 'hold', reference: '', frequency: '', planned_date: '' }],
});
const emptyInspection = () => ({
  project: '', plan_item: '', number: '', title: '', date: '', inspector_name: '',
  location: '', report_ref: '', remarks: '',
});
const emptyNcr = () => ({
  project: '', number: '', title: '', description: '', severity: 'minor', discipline: '',
  source: 'inspection', detected_date: '', due_date: '', responsible_name: '', cost_impact: '',
  root_cause: '', corrective_action: '', preventive_action: '', requires_rework: false,
});
const emptyPunch = () => ({
  project: '', number: '', description: '', location: '', discipline: '', priority: 'medium',
  responsible_name: '', reported_date: '', due_date: '', cost: '',
});
const emptyHse = () => ({
  project: '', number: '', title: '', incident_type: 'near_miss', severity: 'low', date: '',
  time: '', location: '', description: '', involved_persons: '', lost_days: 0, man_hours: 0,
  root_cause: '', corrective_action: '', preventive_action: '', reported_by_name: '', cost_impact: '',
});

const ProjectQualityPage = () => {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const projectId = params.get('project') || '';
  const [tab, setTab] = useState(0);
  const [message, setMessage] = useState(null);
  const [search, setSearch] = useState('');
  const [planOpen, setPlanOpen] = useState(false);
  const [planForm, setPlanForm] = useState(emptyPlan());
  const [inspectionOpen, setInspectionOpen] = useState(false);
  const [inspectionForm, setInspectionForm] = useState(emptyInspection());
  const [editId, setEditId] = useState(null);
  const [completeTarget, setCompleteTarget] = useState(null);
  const [completeForm, setCompleteForm] = useState({ result: 'pass', date: '', remarks: '', severity: 'minor' });
  const [ncrOpen, setNcrOpen] = useState(false);
  const [ncrForm, setNcrForm] = useState(emptyNcr());
  const [ncrEditId, setNcrEditId] = useState(null);
  const [punchOpen, setPunchOpen] = useState(false);
  const [punchForm, setPunchForm] = useState(emptyPunch());
  const [punchEditId, setPunchEditId] = useState(null);
  const [hseOpen, setHseOpen] = useState(false);
  const [hseForm, setHseForm] = useState(emptyHse());
  const [hseEditId, setHseEditId] = useState(null);
  const [noteDialog, setNoteDialog] = useState(null);   // {kind, id, target, label}
  const [noteText, setNoteText] = useState('');
  const [verifyTarget, setVerifyTarget] = useState(null);
  const [verifiedBy, setVerifiedBy] = useState('');

  const { data: projects } = useQuery({
    queryKey: ['quality-projects'],
    queryFn: () => axiosInstance.get('/projects/', { params: { page_size: 500 } }).then(r => r.data),
  });
  const projectList = Array.isArray(projects) ? projects : projects?.results || [];

  useEffect(() => {
    if (!projectId && projectList.length) {
      setParams({ project: String(projectList[0].id) }, { replace: true });
    }
  }, [projectId, projectList, setParams]);

  const { data: kpis } = useQuery({
    queryKey: ['quality-kpis', projectId],
    queryFn: () => axiosInstance.get('/quality-kpis/', { params: { project: projectId } }).then(r => r.data),
    enabled: !!projectId,
  });
  const { data: plans, isLoading: loadingPlans } = useQuery({
    queryKey: ['quality-plans', projectId],
    queryFn: () => axiosInstance.get('/quality-plans/', { params: { project: projectId, page_size: 200 } }).then(r => r.data),
    enabled: !!projectId,
  });
  const planList = Array.isArray(plans) ? plans : plans?.results || [];
  const { data: items } = useQuery({
    queryKey: ['quality-plan-items', projectId],
    queryFn: () => axiosInstance.get('/quality-plan-items/', { params: { project: projectId, page_size: 500 } }).then(r => r.data),
    enabled: !!projectId,
  });
  const itemList = Array.isArray(items) ? items : items?.results || [];
  const { data: inspections, isLoading: loadingInsp } = useQuery({
    queryKey: ['inspections', projectId],
    queryFn: () => axiosInstance.get('/inspections/', { params: { project: projectId, page_size: 500 } }).then(r => r.data),
    enabled: !!projectId,
  });
  const inspectionList = Array.isArray(inspections) ? inspections : inspections?.results || [];
  const { data: ncrs, isLoading: loadingNcr } = useQuery({
    queryKey: ['ncrs', projectId],
    queryFn: () => axiosInstance.get('/ncrs/', { params: { project: projectId, page_size: 500 } }).then(r => r.data),
    enabled: !!projectId,
  });
  const ncrList = Array.isArray(ncrs) ? ncrs : ncrs?.results || [];
  const { data: punch, isLoading: loadingPunch } = useQuery({
    queryKey: ['punch-items', projectId],
    queryFn: () => axiosInstance.get('/punch-items/', { params: { project: projectId, page_size: 500 } }).then(r => r.data),
    enabled: !!projectId,
  });
  const punchList = Array.isArray(punch) ? punch : punch?.results || [];
  const { data: hse, isLoading: loadingHse } = useQuery({
    queryKey: ['hse-incidents', projectId],
    queryFn: () => axiosInstance.get('/hse-incidents/', { params: { project: projectId, page_size: 500 } }).then(r => r.data),
    enabled: !!projectId,
  });
  const hseList = Array.isArray(hse) ? hse : hse?.results || [];

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['quality-kpis'] });
    qc.invalidateQueries({ queryKey: ['quality-plans'] });
    qc.invalidateQueries({ queryKey: ['quality-plan-items'] });
    qc.invalidateQueries({ queryKey: ['inspections'] });
    qc.invalidateQueries({ queryKey: ['ncrs'] });
    qc.invalidateQueries({ queryKey: ['punch-items'] });
    qc.invalidateQueries({ queryKey: ['hse-incidents'] });
  };

  const filterBySearch = (rows, keys) => {
    if (!search.trim()) return rows;
    const q = search.trim();
    return rows.filter((row) => keys.some((key) => String(row[key] || '').includes(q)));
  };
  const visibleItems = useMemo(() => filterBySearch(itemList, ['item_no', 'description']), [itemList, search]);
  const visibleInspections = useMemo(() => filterBySearch(inspectionList, ['number', 'title', 'inspector_name']), [inspectionList, search]);
  const visibleNcrs = useMemo(() => filterBySearch(ncrList, ['number', 'title', 'responsible_name']), [ncrList, search]);
  const visiblePunch = useMemo(() => filterBySearch(punchList, ['number', 'description', 'location']), [punchList, search]);
  const visibleHse = useMemo(() => filterBySearch(hseList, ['number', 'title', 'location']), [hseList, search]);

  const savePlan = useMutation({
    mutationFn: (payload) => axiosInstance.post('/quality-plans/', payload).then(r => r.data),
    onSuccess: (data) => {
      setMessage({ type: 'success', text: `طرح بازرسی ${data.number} با ${toPersianDigits(data.items_count)} ردیف ثبت شد.` });
      setPlanOpen(false);
      setPlanForm(emptyPlan());
      invalidate();
    },
    onError: (err) => setMessage({ type: 'error', text: err?.response?.data?.detail || 'ثبت طرح بازرسی ناموفق بود.' }),
  });

  const saveInspection = useMutation({
    mutationFn: (payload) => (payload.id
      ? axiosInstance.patch(`/inspections/${payload.id}/`, payload.body).then(r => r.data)
      : axiosInstance.post('/inspections/', payload.body).then(r => r.data)),
    onSuccess: (data) => {
      setMessage({ type: 'success', text: `بازرسی ${data.number} ذخیره شد.` });
      setInspectionOpen(false);
      setEditId(null);
      setInspectionForm(emptyInspection());
      invalidate();
    },
    onError: (err) => setMessage({ type: 'error', text: err?.response?.data?.detail || 'ثبت بازرسی ناموفق بود.' }),
  });

  const completeInspection = useMutation({
    mutationFn: ({ id, body }) => axiosInstance.post(`/inspections/${id}/complete/`, body).then(r => r.data),
    onSuccess: (data) => {
      const ncr = data.ncr;
      setMessage({
        type: ncr ? 'warning' : 'success',
        text: ncr
          ? `نتیجه ثبت شد و NCR ${ncr.number} به‌صورت خودکار ایجاد شد.`
          : `نتیجهٔ بازرسی ${data.inspection.number} ثبت شد: ${(RESULT[data.inspection.result] || {}).label || ''}`,
      });
      setCompleteTarget(null);
      setCompleteForm({ result: 'pass', date: '', remarks: '', severity: 'minor' });
      invalidate();
    },
    onError: (err) => setMessage({ type: 'error', text: err?.response?.data?.detail || 'ثبت نتیجه ناموفق بود.' }),
  });

  const saveNcr = useMutation({
    mutationFn: (payload) => (payload.id
      ? axiosInstance.patch(`/ncrs/${payload.id}/`, payload.body).then(r => r.data)
      : axiosInstance.post('/ncrs/', payload.body).then(r => r.data)),
    onSuccess: (data) => {
      setMessage({ type: 'success', text: `NCR ${data.number} ذخیره شد.` });
      setNcrOpen(false);
      setNcrEditId(null);
      setNcrForm(emptyNcr());
      invalidate();
    },
    onError: (err) => setMessage({ type: 'error', text: err?.response?.data?.detail || 'ثبت NCR ناموفق بود.' }),
  });

  const ncrStatus = useMutation({
    mutationFn: ({ id, status, note }) => axiosInstance
      .post(`/ncrs/${id}/set-status/`, { status, note: note || '' }).then(r => r.data),
    onSuccess: (data) => {
      setMessage({ type: 'success', text: `وضعیت NCR ${data.number}: ${(NCR_STATUS[data.status] || {}).label || data.status}` });
      setNoteDialog(null);
      setNoteText('');
      invalidate();
    },
    onError: (err) => setMessage({ type: 'error', text: err?.response?.data?.detail || 'تغییر وضعیت NCR ناموفق بود.' }),
  });

  const savePunch = useMutation({
    mutationFn: (payload) => (payload.id
      ? axiosInstance.patch(`/punch-items/${payload.id}/`, payload.body).then(r => r.data)
      : axiosInstance.post('/punch-items/', payload.body).then(r => r.data)),
    onSuccess: (data) => {
      setMessage({ type: 'success', text: `مورد کسرکار ${data.number} ذخیره شد.` });
      setPunchOpen(false);
      setPunchEditId(null);
      setPunchForm(emptyPunch());
      invalidate();
    },
    onError: (err) => setMessage({ type: 'error', text: err?.response?.data?.detail || 'ثبت کسرکار ناموفق بود.' }),
  });

  const punchStatus = useMutation({
    mutationFn: ({ id, status, verified_by_name }) => axiosInstance
      .post(`/punch-items/${id}/${status === 'verified' ? 'verify' : 'set-status'}/`,
        status === 'verified' ? { verified_by_name: verified_by_name || '' } : { status })
      .then(r => r.data),
    onSuccess: (data) => {
      setMessage({ type: 'success', text: `کسرکار ${data.number}: ${(PUNCH_STATUS[data.status] || {}).label || data.status}` });
      setVerifyTarget(null);
      setVerifiedBy('');
      invalidate();
    },
    onError: (err) => setMessage({ type: 'error', text: err?.response?.data?.detail || 'عملیات کسرکار ناموفق بود.' }),
  });

  const saveHse = useMutation({
    mutationFn: (payload) => (payload.id
      ? axiosInstance.patch(`/hse-incidents/${payload.id}/`, payload.body).then(r => r.data)
      : axiosInstance.post('/hse-incidents/', payload.body).then(r => r.data)),
    onSuccess: (data) => {
      setMessage({ type: 'success', text: `رویداد HSE ${data.number} ذخیره شد.` });
      setHseOpen(false);
      setHseEditId(null);
      setHseForm(emptyHse());
      invalidate();
    },
    onError: (err) => setMessage({ type: 'error', text: err?.response?.data?.detail || 'ثبت رویداد ناموفق بود.' }),
  });

  const hseStatus = useMutation({
    mutationFn: ({ id, status, note }) => axiosInstance
      .post(`/hse-incidents/${id}/set-status/`, { status, note: note || '' }).then(r => r.data),
    onSuccess: (data) => {
      setMessage({ type: 'success', text: `رویداد ${data.number}: ${(HSE_STATUS[data.status] || {}).label || data.status}` });
      setNoteDialog(null);
      setNoteText('');
      invalidate();
    },
    onError: (err) => setMessage({ type: 'error', text: err?.response?.data?.detail || 'تغییر وضعیت رویداد ناموفق بود.' }),
  });

  const planItemStatus = useMutation({
    mutationFn: ({ id, status }) => axiosInstance
      .post(`/quality-plan-items/${id}/set-status/`, { status }).then(r => r.data),
    onSuccess: (data) => {
      setMessage({ type: 'success', text: `ردیف ${data.item_no}: ${(ITEM_STATUS[data.status] || {}).label || data.status}` });
      invalidate();
    },
    onError: (err) => setMessage({ type: 'error', text: err?.response?.data?.detail || 'تغییر وضعیت ردیف ناموفق بود.' }),
  });

  const removeEntity = useMutation({
    mutationFn: ({ kind, id }) => axiosInstance.delete(`/${kind}/${id}/`),
    onSuccess: () => {
      setMessage({ type: 'success', text: 'حذف انجام شد.' });
      invalidate();
    },
    onError: () => setMessage({ type: 'error', text: 'حذف ناموفق بود.' }),
  });

  const submitPlan = () => {
    if (!planForm.project || !planForm.number || !planForm.title) {
      setMessage({ type: 'error', text: 'پروژه، شماره و عنوان طرح بازرسی الزامی است.' });
      return;
    }
    savePlan.mutate({
      ...planForm,
      date: planForm.date || null,
      items: (planForm.items || [])
        .filter((it) => it.description)
        .map((it, index) => ({ ...it, sort_order: index + 1, planned_date: it.planned_date || null })),
    });
  };

  const submitInspection = () => {
    if (!inspectionForm.project || !inspectionForm.number) {
      setMessage({ type: 'error', text: 'پروژه و شمارهٔ بازرسی الزامی است.' });
      return;
    }
    saveInspection.mutate({
      id: editId,
      body: {
        ...inspectionForm,
        plan_item: inspectionForm.plan_item || null,
        date: inspectionForm.date || null,
      },
    });
  };

  const submitComplete = () => {
    if (!completeTarget) return;
    completeInspection.mutate({
      id: completeTarget.id,
      body: {
        result: completeForm.result,
        date: completeForm.date || null,
        remarks: completeForm.remarks || '',
        severity: completeForm.severity,
      },
    });
  };

  const submitNcr = () => {
    if (!ncrForm.project || !ncrForm.number || !ncrForm.title) {
      setMessage({ type: 'error', text: 'پروژه، شماره و عنوان NCR الزامی است.' });
      return;
    }
    saveNcr.mutate({
      id: ncrEditId,
      body: {
        ...ncrForm,
        detected_date: ncrForm.detected_date || null,
        due_date: ncrForm.due_date || null,
        cost_impact: Number(ncrForm.cost_impact || 0),
      },
    });
  };

  const submitPunch = () => {
    if (!punchForm.project || !punchForm.number || !punchForm.description) {
      setMessage({ type: 'error', text: 'پروژه، شماره و شرح کسرکار الزامی است.' });
      return;
    }
    savePunch.mutate({
      id: punchEditId,
      body: {
        ...punchForm,
        reported_date: punchForm.reported_date || null,
        due_date: punchForm.due_date || null,
        cost: Number(punchForm.cost || 0),
      },
    });
  };

  const submitHse = () => {
    if (!hseForm.project || !hseForm.number || !hseForm.title) {
      setMessage({ type: 'error', text: 'پروژه، شماره و عنوان رویداد الزامی است.' });
      return;
    }
    saveHse.mutate({
      id: hseEditId,
      body: {
        ...hseForm,
        date: hseForm.date || null,
        time: hseForm.time || null,
        lost_days: Number(hseForm.lost_days || 0),
        man_hours: Number(hseForm.man_hours || 0),
        cost_impact: Number(hseForm.cost_impact || 0),
      },
    });
  };

  const kpiInsp = kpis?.inspections || {};
  const kpiNcr = kpis?.ncr || {};
  const kpiPunch = kpis?.punch || {};
  const kpiHse = kpis?.hse || {};
  const kpiPlans = kpis?.plans || {};

  return (
    <Box sx={{ p: { xs: 1.5, md: 2 }, fontFamily: FONT }}>
      <Paper sx={{ p: 2, mb: 1.5, borderRadius: '16px' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}
          alignItems={{ md: 'center' }} justifyContent="space-between">
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <HealthAndSafetyIcon sx={{ color: '#0284c7' }} />
              <Typography variant="h6" sx={{ fontWeight: 800, fontFamily: FONT }}>
                کیفیت و HSE پروژه
              </Typography>
            </Stack>
            <Typography variant="body2" color="textSecondary" sx={{ fontFamily: FONT, mt: 0.5 }}>
              طرح بازرسی (ITP)، بازرسی‌ها، عدم انطباق‌ها (NCR)، لیست کسرکار و رویدادهای ایمنی/محیط‌زیست
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 0.5 }} flexWrap="wrap" useFlexGap>
              <Chip size="small" label={`${toPersianDigits(planList.length)} طرح بازرسی`}
                sx={{ fontWeight: 700, bgcolor: 'rgba(14,165,233,0.12)', color: '#0369a1' }} />
              <Chip size="small" label={`${toPersianDigits(inspectionList.length)} بازرسی`}
                sx={{ fontWeight: 700, bgcolor: 'rgba(16,185,129,0.12)', color: '#047857' }} />
              <Chip size="small" label={`NCR باز: ${toPersianDigits(kpiNcr.open || 0)}`}
                color={(kpiNcr.open || 0) ? 'error' : 'success'} sx={{ fontWeight: 700 }} />
              <Chip size="small" label={`کسرکار باز: ${toPersianDigits(kpiPunch.open || 0)}`}
                color={(kpiPunch.open || 0) ? 'warning' : 'success'} sx={{ fontWeight: 700 }} />
              <Chip size="small" label={`نقاط توقف باز: ${toPersianDigits(kpiPlans.pending_hold_points || 0)}`}
                sx={{ fontWeight: 700, bgcolor: 'rgba(239,68,68,0.12)', color: '#b91c1c' }} />
            </Stack>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField size="small" label="جستجو" value={search}
              onChange={(e) => setSearch(e.target.value)} sx={{ minWidth: 200 }} />
            <FormControl size="small" sx={{ minWidth: 240 }}>
              <InputLabel>پروژه</InputLabel>
              <Select value={projectId} label="پروژه" onChange={e => setParams({ project: e.target.value })}>
                {projectList.map(p => (
                  <MenuItem key={p.id} value={String(p.id)}>{p.code} — {p.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </Stack>
      </Paper>

      {message ? (
        <Alert severity={message.type} sx={{ mb: 2, borderRadius: '10px' }}
          onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      ) : null}

      <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard title="نرخ قبولی بازرسی" color="#10b981"
            value={`${toPersianDigits(kpiInsp.pass_rate || 0)}٪`}
            sub={`${toPersianDigits(kpiInsp.passed || 0)} قبول — ${toPersianDigits(kpiInsp.failed || 0)} رد — ${toPersianDigits(kpiInsp.conditional || 0)} مشروط`} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard title="عدم انطباق‌ها (NCR)" color="#ef4444"
            value={`${toPersianDigits(kpiNcr.open || 0)} باز`}
            sub={`معوق: ${toPersianDigits(kpiNcr.overdue || 0)} — بحرانی: ${toPersianDigits(kpiNcr.critical || 0)} — میانگین بستن: ${toPersianDigits(kpiNcr.avg_close_days || 0)} روز`} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 1.5, borderRadius: '14px', height: '100%' }}>
            <Typography sx={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: '#64748b' }}>
              پیشرفت لیست کسرکار
            </Typography>
            <Typography sx={{ fontFamily: FONT, fontSize: 20, fontWeight: 800, color: '#f59e0b' }}>
              {toPersianDigits(kpiPunch.percent || 0)}٪
            </Typography>
            <LinearProgress variant="determinate" value={kpiPunch.percent || 0}
              sx={{ height: 7, borderRadius: 4, my: 0.5, bgcolor: '#e2e8f0',
                '& .MuiLinearProgress-bar': { bgcolor: '#f59e0b' } }} />
            <Typography sx={{ fontFamily: FONT, fontSize: 12, color: '#94a3b8' }}>
              {toPersianDigits(kpiPunch.verified || 0)} تأییدشده از {toPersianDigits(kpiPunch.total || 0)} — معوق: {toPersianDigits(kpiPunch.overdue || 0)}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard title="ایمنی (HSE)" color="#0284c7"
            value={kpiHse.days_since_last_incident === '' ? '—' : `${toPersianDigits(kpiHse.days_since_last_incident)} روز بدون حادثه`}
            sub={`LTI: ${toPersianDigits(kpiHse.lti || 0)} — LTIFR: ${toPersianDigits(kpiHse.ltifr || 0)} — روزهای از کارافتادگی: ${toPersianDigits(kpiHse.lost_days || 0)}`} />
        </Grid>
      </Grid>

      <Paper sx={{ p: 1, mb: 1.5, borderRadius: '12px' }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} variant="scrollable" scrollButtons="auto"
          sx={{ '& .MuiTab-root': { fontFamily: FONT, fontWeight: 700, fontSize: 13.5 } }}>
          <Tab label={`طرح بازرسی و بازرسی‌ها (${toPersianDigits(itemList.length)} / ${toPersianDigits(inspectionList.length)})`} />
          <Tab label={`عدم انطباق (${toPersianDigits(ncrList.length)})`} />
          <Tab label={`کسرکار (${toPersianDigits(punchList.length)})`} />
          <Tab label={`HSE (${toPersianDigits(hseList.length)})`} />
        </Tabs>
      </Paper>

      {tab === 0 && (
        <Stack spacing={1.5}>
          <Paper sx={{ p: 1.5, borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.7)' }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography sx={{ fontFamily: FONT, fontWeight: 800, fontSize: 13.5 }}>
                ردیفهای طرح بازرسی و آزمون (ITP)
              </Typography>
              <Button size="small" variant="contained" startIcon={<AddIcon />}
                onClick={() => { setPlanForm({ ...emptyPlan(), project: projectId }); setPlanOpen(true); }}
                sx={{ borderRadius: '10px' }}>
                طرح بازرسی جدید
              </Button>
            </Stack>
            {loadingPlans ? (
              <Box textAlign="center" py={4}><CircularProgress /></Box>
            ) : visibleItems.length === 0 ? (
              <Typography sx={{ fontFamily: FONT, fontSize: 13, color: '#94a3b8', textAlign: 'center', py: 3 }}>
                ردیف طرح بازرسی ثبت نشده است.
              </Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={headSx}>ردیف</TableCell>
                      <TableCell sx={headSx}>شرح فعالیت</TableCell>
                      <TableCell sx={headSx}>نوع بازرسی</TableCell>
                      <TableCell sx={headSx}>نقطهٔ کنترلی</TableCell>
                      <TableCell sx={headSx}>مرجع</TableCell>
                      <TableCell sx={headSx}>تواتر</TableCell>
                      <TableCell sx={headSx}>تاریخ برنامه</TableCell>
                      <TableCell sx={headSx}>مسئول</TableCell>
                      <TableCell sx={headSx}>وضعیت</TableCell>
                      <TableCell sx={headSx}>عملیات</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {visibleItems.map((item) => (
                      <TableRow key={item.id} hover>
                        <TableCell sx={{ ...numSx, fontWeight: 700 }}>{toPersianDigits(item.item_no)}</TableCell>
                        <TableCell sx={{ fontFamily: FONT, fontSize: 12.5, minWidth: 220 }}>
                          {item.description}
                        </TableCell>
                        <TableCell sx={{ fontFamily: FONT, fontSize: 12, textAlign: 'center' }}>
                          {INSP_TYPE[item.inspection_type] || item.inspection_type}
                        </TableCell>
                        <TableCell sx={{ fontFamily: FONT, fontSize: 12, textAlign: 'center' }}>
                          {POINT_TYPE[item.point_type] || item.point_type}
                        </TableCell>
                        <TableCell sx={{ fontFamily: FONT, fontSize: 12 }}>{item.reference || '—'}</TableCell>
                        <TableCell sx={{ fontFamily: FONT, fontSize: 12 }}>{item.frequency || '—'}</TableCell>
                        <TableCell sx={numSx}>{item.planned_date_jalali || '—'}</TableCell>
                        <TableCell sx={{ fontFamily: FONT, fontSize: 12 }}>{item.responsible_name || '—'}</TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>{chipOf(ITEM_STATUS, item.status)}</TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Stack direction="row" spacing={0.25} justifyContent="center">
                            {item.status === 'not_started' ? (
                              <Tooltip title="شروع">
                                <IconButton size="small" color="info"
                                  onClick={() => planItemStatus.mutate({ id: item.id, status: 'in_progress' })}>
                                  <PlayArrowIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            ) : null}
                            {item.status !== 'passed' ? (
                              <Tooltip title="قبول">
                                <IconButton size="small" color="success"
                                  onClick={() => planItemStatus.mutate({ id: item.id, status: 'passed' })}>
                                  <CheckCircleIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            ) : null}
                            {item.status !== 'failed' ? (
                              <Tooltip title="رد">
                                <IconButton size="small" color="error"
                                  onClick={() => planItemStatus.mutate({ id: item.id, status: 'failed' })}>
                                  <CancelIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            ) : null}
                            {item.status !== 'waived' ? (
                              <Tooltip title="معاف">
                                <IconButton size="small"
                                  onClick={() => planItemStatus.mutate({ id: item.id, status: 'waived' })}>
                                  <WarningAmberIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            ) : null}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
          {/* INSPECTIONS_TABLE */}
          <Paper sx={{ p: 1.5, borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.7)' }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography sx={{ fontFamily: FONT, fontWeight: 800, fontSize: 13.5 }}>
                بازرسیها و آزمونهای اجراشده
              </Typography>
              <Button size="small" variant="contained" startIcon={<AddIcon />}
                onClick={() => {
                  setEditId(null);
                  setInspectionForm({ ...emptyInspection(), project: projectId });
                  setInspectionOpen(true);
                }}
                sx={{ borderRadius: '10px', background: 'linear-gradient(135deg,#0ea5e9,#10b981)' }}>
                بازرسی جدید
              </Button>
            </Stack>
            {loadingInsp ? (
              <Box textAlign="center" py={4}><CircularProgress /></Box>
            ) : visibleInspections.length === 0 ? (
              <Typography sx={{ fontFamily: FONT, fontSize: 13, color: '#94a3b8', textAlign: 'center', py: 3 }}>
                بازرسی ثبت نشده است.
              </Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={headSx}>شماره</TableCell>
                      <TableCell sx={headSx}>عنوان</TableCell>
                      <TableCell sx={headSx}>ردیف ITP</TableCell>
                      <TableCell sx={headSx}>تاریخ</TableCell>
                      <TableCell sx={headSx}>بازرس</TableCell>
                      <TableCell sx={headSx}>نتیجه</TableCell>
                      <TableCell sx={headSx}>وضعیت</TableCell>
                      <TableCell sx={headSx}>NCR</TableCell>
                      <TableCell sx={headSx}>عملیات</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {visibleInspections.map((row) => (
                      <TableRow key={row.id} hover>
                        <TableCell sx={{ ...numSx, fontWeight: 700 }}>{row.number}</TableCell>
                        <TableCell sx={{ fontFamily: FONT, fontSize: 12.5, minWidth: 200 }}>
                          {row.title || '—'}
                        </TableCell>
                        <TableCell sx={numSx}>{row.plan_item_no || '—'}</TableCell>
                        <TableCell sx={numSx}>{row.date_jalali || '—'}</TableCell>
                        <TableCell sx={{ fontFamily: FONT, fontSize: 12 }}>{row.inspector_name || '—'}</TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          {row.result ? chipOf(RESULT, row.result) : '—'}
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Chip size="small" label={row.status_display}
                            sx={{ fontWeight: 700, bgcolor: '#f1f5f9' }} />
                        </TableCell>
                        <TableCell sx={numSx}>
                          {row.ncr_count ? (
                            <Chip size="small" color="error" label={toPersianDigits(row.ncr_count)}
                              sx={{ fontWeight: 700 }} />
                          ) : '—'}
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Stack direction="row" spacing={0.25} justifyContent="center">
                            <Tooltip title="ثبت نتیجه">
                              <IconButton size="small" color="success"
                                onClick={() => {
                                  setCompleteTarget(row);
                                  setCompleteForm({ result: 'pass', date: '', remarks: '', severity: 'minor' });
                                }}>
                                <FactCheckIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="ویرایش">
                              <IconButton size="small" color="primary"
                                onClick={() => {
                                  setEditId(row.id);
                                  setInspectionForm({
                                    ...emptyInspection(),
                                    ...row,
                                    plan_item: row.plan_item || '',
                                    date: row.date || '',
                                    remarks: row.remarks || '',
                                  });
                                  setInspectionOpen(true);
                                }}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="حذف">
                              <IconButton size="small" color="error"
                                onClick={() => removeEntity.mutate({ kind: 'inspections', id: row.id })}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Stack>
      )}

      {tab === 1 && (
        <Paper sx={{ p: 1.5, borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.7)' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography sx={{ fontFamily: FONT, fontWeight: 800, fontSize: 13.5 }}>
              گزارشهای عدم انطباق (NCR)
            </Typography>
            <Button size="small" variant="contained" startIcon={<AddIcon />}
              onClick={() => {
                setNcrEditId(null);
                setNcrForm({ ...emptyNcr(), project: projectId });
                setNcrOpen(true);
              }}
              sx={{ borderRadius: '10px', background: 'linear-gradient(135deg,#ef4444,#f59e0b)' }}>
              NCR جدید
            </Button>
          </Stack>
          {loadingNcr ? (
            <Box textAlign="center" py={4}><CircularProgress /></Box>
          ) : visibleNcrs.length === 0 ? (
            <Typography sx={{ fontFamily: FONT, fontSize: 13, color: '#94a3b8', textAlign: 'center', py: 3 }}>
              NCR ثبت نشده است.
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={headSx}>شماره</TableCell>
                    <TableCell sx={headSx}>عنوان</TableCell>
                    <TableCell sx={headSx}>منبع</TableCell>
                    <TableCell sx={headSx}>شدت</TableCell>
                    <TableCell sx={headSx}>تاریخ تشخیص</TableCell>
                    <TableCell sx={headSx}>مهلت</TableCell>
                    <TableCell sx={headSx}>سن (روز)</TableCell>
                    <TableCell sx={headSx}>مسئول</TableCell>
                    <TableCell sx={headSx}>اثر مالی</TableCell>
                    <TableCell sx={headSx}>وضعیت</TableCell>
                    <TableCell sx={headSx}>گردش کار</TableCell>
                    <TableCell sx={headSx}>عملیات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visibleNcrs.map((ncr) => (
                    <TableRow key={ncr.id} hover>
                      <TableCell sx={{ ...numSx, fontWeight: 800 }}>{ncr.number}</TableCell>
                      <TableCell sx={{ fontFamily: FONT, fontSize: 12.5, minWidth: 220 }}>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          {ncr.overdue ? (
                            <Tooltip title="مهلت گذشته">
                              <WarningAmberIcon sx={{ fontSize: 16, color: '#ef4444' }} />
                            </Tooltip>
                          ) : null}
                          <span>{ncr.title}</span>
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ fontFamily: FONT, fontSize: 12, textAlign: 'center' }}>
                        {ncr.source_display}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>{chipOf(SEVERITY, ncr.severity)}</TableCell>
                      <TableCell sx={numSx}>{ncr.detected_date_jalali || '—'}</TableCell>
                      <TableCell sx={numSx}>{ncr.due_date_jalali || '—'}</TableCell>
                      <TableCell sx={numSx}>
                        {ncr.age_days === null ? '—' : toPersianDigits(ncr.age_days)}
                      </TableCell>
                      <TableCell sx={{ fontFamily: FONT, fontSize: 12 }}>
                        {ncr.responsible_full_name || ncr.responsible_name || '—'}
                      </TableCell>
                      <TableCell sx={numSx}>{money(ncr.cost_impact)}</TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>{chipOf(NCR_STATUS, ncr.status)}</TableCell>
                      {/* NCR_ACTIONS */}
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Stack direction="row" spacing={0.5} justifyContent="center" flexWrap="wrap">
                          {(ncr.next_statuses || []).filter(s => s !== 'closed').map((status) => (
                            <Button key={status} size="small" variant="outlined"
                              onClick={() => {
                                setNoteDialog({ kind: 'ncr', id: ncr.id, target: status, label: ncr.number });
                                setNoteText('');
                              }}
                              sx={{ borderRadius: '8px', fontSize: 12, fontWeight: 700, minWidth: 0, px: 1 }}>
                              {(NCR_STATUS[status] || {}).label || status}
                            </Button>
                          ))}
                          {ncr.status !== 'closed' && ncr.status !== 'cancelled' ? (
                            <Button size="small" color="success" variant="contained"
                              onClick={() => ncrStatus.mutate({ id: ncr.id, status: 'closed', note: '' })}
                              sx={{ borderRadius: '8px', fontSize: 12, fontWeight: 700, minWidth: 0, px: 1 }}>
                              بستن
                            </Button>
                          ) : null}
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Stack direction="row" spacing={0.25} justifyContent="center">
                          <Tooltip title="ویرایش">
                            <IconButton size="small" color="primary"
                              onClick={() => {
                                setNcrEditId(ncr.id);
                                setNcrForm({
                                  ...emptyNcr(),
                                  ...ncr,
                                  detected_date: ncr.detected_date || '',
                                  due_date: ncr.due_date || '',
                                  cost_impact: ncr.cost_impact ?? '',
                                  description: ncr.description || '',
                                  root_cause: ncr.root_cause || '',
                                  corrective_action: ncr.corrective_action || '',
                                  preventive_action: ncr.preventive_action || '',
                                });
                                setNcrOpen(true);
                              }}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="حذف">
                            <IconButton size="small" color="error"
                              onClick={() => removeEntity.mutate({ kind: 'ncrs', id: ncr.id })}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {tab === 2 && (
        <Paper sx={{ p: 1.5, borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.7)' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography sx={{ fontFamily: FONT, fontWeight: 800, fontSize: 13.5 }}>
              لیست کسرکار / نقص (Punch List)
            </Typography>
            <Button size="small" variant="contained" startIcon={<AddIcon />}
              onClick={() => {
                setPunchEditId(null);
                setPunchForm({ ...emptyPunch(), project: projectId });
                setPunchOpen(true);
              }}
              sx={{ borderRadius: '10px', background: 'linear-gradient(135deg,#f59e0b,#0ea5e9)' }}>
              کسرکار جدید
            </Button>
          </Stack>
          {loadingPunch ? (
            <Box textAlign="center" py={4}><CircularProgress /></Box>
          ) : visiblePunch.length === 0 ? (
            <Typography sx={{ fontFamily: FONT, fontSize: 13, color: '#94a3b8', textAlign: 'center', py: 3 }}>
              مورد کسرکاری ثبت نشده است.
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={headSx}>شماره</TableCell>
                    <TableCell sx={headSx}>شرح نقص/کسرکار</TableCell>
                    <TableCell sx={headSx}>محل</TableCell>
                    <TableCell sx={headSx}>اولویت</TableCell>
                    <TableCell sx={headSx}>مسئول</TableCell>
                    <TableCell sx={headSx}>سررسید</TableCell>
                    <TableCell sx={headSx}>تاریخ رفع</TableCell>
                    <TableCell sx={headSx}>تأیید</TableCell>
                    <TableCell sx={headSx}>هزینه</TableCell>
                    <TableCell sx={headSx}>وضعیت</TableCell>
                    <TableCell sx={headSx}>گردش کار</TableCell>
                    <TableCell sx={headSx}>عملیات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visiblePunch.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell sx={{ ...numSx, fontWeight: 700 }}>{row.number}</TableCell>
                      <TableCell sx={{ fontFamily: FONT, fontSize: 12.5, minWidth: 240 }}>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          {row.overdue ? (
                            <Tooltip title="سررسید گذشته">
                              <WarningAmberIcon sx={{ fontSize: 16, color: '#ef4444' }} />
                            </Tooltip>
                          ) : null}
                          <span>{row.description}</span>
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ fontFamily: FONT, fontSize: 12 }}>{row.location || '—'}</TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>{chipOf(PRIORITY, row.priority)}</TableCell>
                      <TableCell sx={{ fontFamily: FONT, fontSize: 12 }}>
                        {row.responsible_full_name || row.responsible_name || '—'}
                      </TableCell>
                      <TableCell sx={numSx}>{row.due_date_jalali || '—'}</TableCell>
                      <TableCell sx={numSx}>{row.fixed_date_jalali || '—'}</TableCell>
                      <TableCell sx={numSx}>{row.verified_date_jalali || '—'}</TableCell>
                      <TableCell sx={numSx}>{money(row.cost)}</TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>{chipOf(PUNCH_STATUS, row.status)}</TableCell>
                      {/* PUNCH_ACTIONS */}
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Stack direction="row" spacing={0.5} justifyContent="center" flexWrap="wrap">
                          {row.status === 'open' || row.status === 'rejected' ? (
                            <Button size="small" variant="outlined" color="info"
                              onClick={() => punchStatus.mutate({ id: row.id, status: 'in_progress' })}
                              sx={{ borderRadius: '8px', fontSize: 12, fontWeight: 700, minWidth: 0, px: 1 }}>
                              شروع رفع
                            </Button>
                          ) : null}
                          {row.status !== 'fixed' && row.status !== 'verified' ? (
                            <Button size="small" variant="outlined"
                              onClick={() => punchStatus.mutate({ id: row.id, status: 'fixed' })}
                              sx={{ borderRadius: '8px', fontSize: 12, fontWeight: 700, minWidth: 0, px: 1 }}>
                              رفع شد
                            </Button>
                          ) : null}
                          {row.status === 'fixed' ? (
                            <Button size="small" variant="contained" color="success"
                              onClick={() => { setVerifyTarget(row); setVerifiedBy(''); }}
                              sx={{ borderRadius: '8px', fontSize: 12, fontWeight: 700, minWidth: 0, px: 1 }}>
                              تأیید
                            </Button>
                          ) : null}
                          {row.status !== 'rejected' && row.status !== 'verified' ? (
                            <Button size="small" variant="outlined" color="error"
                              onClick={() => punchStatus.mutate({ id: row.id, status: 'rejected' })}
                              sx={{ borderRadius: '8px', fontSize: 12, fontWeight: 700, minWidth: 0, px: 1 }}>
                              رد
                            </Button>
                          ) : null}
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Stack direction="row" spacing={0.25} justifyContent="center">
                          <Tooltip title="ویرایش">
                            <IconButton size="small" color="primary"
                              onClick={() => {
                                setPunchEditId(row.id);
                                setPunchForm({
                                  ...emptyPunch(),
                                  ...row,
                                  reported_date: row.reported_date || '',
                                  due_date: row.due_date || '',
                                  cost: row.cost ?? '',
                                });
                                setPunchOpen(true);
                              }}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="حذف">
                            <IconButton size="small" color="error"
                              onClick={() => removeEntity.mutate({ kind: 'punch-items', id: row.id })}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* HSE_TAB */}
      {tab === 3 && (
        <Stack spacing={1.5}>
          <Paper sx={{ p: 1.5, borderRadius: '14px' }}>
            <Stack direction="row" spacing={1} sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
              <Chip label={`روزهای بدون حادثه: ${kpiHse.days_since_last_incident === '' ? '—' : toPersianDigits(kpiHse.days_since_last_incident)}`}
                color="success" sx={{ fontWeight: 700 }} />
              <Chip label={`روزهای بدون LTI: ${kpiHse.days_since_last_lti === '' ? '—' : toPersianDigits(kpiHse.days_since_last_lti)}`}
                sx={{ fontWeight: 700, bgcolor: 'rgba(14,165,233,0.12)', color: '#0369a1' }} />
              <Chip label={`نرخ LTIFR: ${toPersianDigits(kpiHse.ltifr || 0)}`}
                color={kpiHse.ltifr ? 'warning' : 'success'} sx={{ fontWeight: 700 }} />
              <Chip label={`شبه‌حوادث: ${toPersianDigits(kpiHse.near_miss || 0)}`}
                sx={{ fontWeight: 700, bgcolor: 'rgba(148,163,184,0.2)' }} />
              <Chip label={`نفر-ساعت ثبت‌شده: ${money(kpiHse.man_hours)}`}
                sx={{ fontWeight: 700, bgcolor: 'rgba(16,185,129,0.12)', color: '#047857' }} />
              <Chip label={`مجموع روزهای از کارافتادگی: ${toPersianDigits(kpiHse.lost_days || 0)}`}
                sx={{ fontWeight: 700, bgcolor: 'rgba(239,68,68,0.12)', color: '#b91c1c' }} />
            </Stack>
          </Paper>
          <Paper sx={{ p: 1.5, borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.7)' }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography sx={{ fontFamily: FONT, fontWeight: 800, fontSize: 13.5 }}>
                رویدادهای ایمنی، بهداشت و محیط‌زیست (HSE)
              </Typography>
              <Button size="small" variant="contained" startIcon={<AddIcon />}
                onClick={() => {
                  setHseEditId(null);
                  setHseForm({ ...emptyHse(), project: projectId });
                  setHseOpen(true);
                }}
                sx={{ borderRadius: '10px', background: 'linear-gradient(135deg,#0284c7,#0ea5e9)' }}>
                رویداد جدید
              </Button>
            </Stack>
            {loadingHse ? (
              <Box textAlign="center" py={4}><CircularProgress /></Box>
            ) : visibleHse.length === 0 ? (
              <Typography sx={{ fontFamily: FONT, fontSize: 13, color: '#94a3b8', textAlign: 'center', py: 3 }}>
                رویدادی ثبت نشده است.
              </Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={headSx}>شماره</TableCell>
                      <TableCell sx={headSx}>عنوان</TableCell>
                      <TableCell sx={headSx}>نوع</TableCell>
                      <TableCell sx={headSx}>شدت</TableCell>
                      <TableCell sx={headSx}>تاریخ</TableCell>
                      <TableCell sx={headSx}>محل</TableCell>
                      <TableCell sx={headSx}>افراد درگیر</TableCell>
                      <TableCell sx={headSx}>روز از کارافتادگی</TableCell>
                      <TableCell sx={headSx}>نفر-ساعت</TableCell>
                      <TableCell sx={headSx}>اثر مالی</TableCell>
                      <TableCell sx={headSx}>وضعیت</TableCell>
                      <TableCell sx={headSx}>گردش کار</TableCell>
                      <TableCell sx={headSx}>عملیات</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {/* HSE_ROWS */}
                    {visibleHse.map((row) => (
                      <TableRow key={row.id} hover>
                        <TableCell sx={{ ...numSx, fontWeight: 700 }}>{row.number}</TableCell>
                        <TableCell sx={{ fontFamily: FONT, fontSize: 12.5, minWidth: 220 }}>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            {row.is_lti ? (
                              <Tooltip title="حادثهٔ منجر به از کارافتادگی (LTI)">
                                <WarningAmberIcon sx={{ fontSize: 16, color: '#ef4444' }} />
                              </Tooltip>
                            ) : null}
                            <span>{row.title}</span>
                          </Stack>
                        </TableCell>
                        <TableCell sx={{ fontFamily: FONT, fontSize: 12, textAlign: 'center' }}>
                          {HSE_TYPE[row.incident_type] || row.incident_type}
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>{chipOf(SEVERITY, row.severity)}</TableCell>
                        <TableCell sx={numSx}>{row.date_jalali || '—'}</TableCell>
                        <TableCell sx={{ fontFamily: FONT, fontSize: 12 }}>{row.location || '—'}</TableCell>
                        <TableCell sx={{ fontFamily: FONT, fontSize: 12, minWidth: 150 }}>
                          {row.involved_persons || '—'}
                        </TableCell>
                        <TableCell sx={numSx}>{toPersianDigits(row.lost_days || 0)}</TableCell>
                        <TableCell sx={numSx}>{toPersianDigits(row.man_hours || 0)}</TableCell>
                        <TableCell sx={numSx}>{money(row.cost_impact)}</TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>{chipOf(HSE_STATUS, row.status)}</TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Stack direction="row" spacing={0.5} justifyContent="center" flexWrap="wrap">
                            {(row.next_statuses || []).filter(s => s !== 'closed').map((status) => (
                              <Button key={status} size="small" variant="outlined"
                                onClick={() => {
                                  setNoteDialog({ kind: 'hse', id: row.id, target: status, label: row.number });
                                  setNoteText('');
                                }}
                                sx={{ borderRadius: '8px', fontSize: 12, fontWeight: 700, minWidth: 0, px: 1 }}>
                                {(HSE_STATUS[status] || {}).label || status}
                              </Button>
                            ))}
                            {row.status !== 'closed' ? (
                              <Button size="small" color="success" variant="contained"
                                onClick={() => hseStatus.mutate({ id: row.id, status: 'closed', note: '' })}
                                sx={{ borderRadius: '8px', fontSize: 12, fontWeight: 700, minWidth: 0, px: 1 }}>
                                بستن
                              </Button>
                            ) : null}
                          </Stack>
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Stack direction="row" spacing={0.25} justifyContent="center">
                            <Tooltip title="ویرایش">
                              <IconButton size="small" color="primary"
                                onClick={() => {
                                  setHseEditId(row.id);
                                  setHseForm({
                                    ...emptyHse(),
                                    ...row,
                                    date: row.date || '',
                                    time: row.time || '',
                                    cost_impact: row.cost_impact ?? '',
                                    description: row.description || '',
                                    root_cause: row.root_cause || '',
                                    corrective_action: row.corrective_action || '',
                                    preventive_action: row.preventive_action || '',
                                  });
                                  setHseOpen(true);
                                }}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="حذف">
                              <IconButton size="small" color="error"
                                onClick={() => removeEntity.mutate({ kind: 'hse-incidents', id: row.id })}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Stack>
      )}
      {/* ------------------------------ دیالوگ طرح بازرسی ------------------------------ */}
      <Dialog open={planOpen} onClose={() => setPlanOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ fontFamily: FONT, fontWeight: 800 }}>ثبت طرح بازرسی و آزمون (ITP)</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={1.5} sx={{ mt: 0 }}>
            <Grid item xs={12} md={3}>
              <TextField size="small" fullWidth label="شماره *" value={planForm.number}
                onChange={e => setPlanForm(p => ({ ...p, number: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField size="small" fullWidth label="عنوان *" value={planForm.title}
                onChange={e => setPlanForm(p => ({ ...p, title: e.target.value }))} />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField size="small" fullWidth label="ویرایش" value={planForm.revision}
                onChange={e => setPlanForm(p => ({ ...p, revision: e.target.value }))} />
            </Grid>
            <Grid item xs={6} md={3}>
              <JalaliDatePicker fullWidth label="تاریخ" value={planForm.date}
                onChange={(g) => setPlanForm(p => ({ ...p, date: g }))} />
            </Grid>
            <Grid item xs={6} md={3}>
              <FormControl size="small" fullWidth>
                <InputLabel>وضعیت</InputLabel>
                <Select value={planForm.status} label="وضعیت"
                  onChange={e => setPlanForm(p => ({ ...p, status: e.target.value }))}>
                  <MenuItem value="draft">پیش‌نویس</MenuItem>
                  <MenuItem value="active">جاری</MenuItem>
                  <MenuItem value="superseded">نسخهٔ قدیمی</MenuItem>
                  <MenuItem value="cancelled">لغو شده</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField size="small" fullWidth label="تهیه‌کننده" value={planForm.prepared_by_name}
                onChange={e => setPlanForm(p => ({ ...p, prepared_by_name: e.target.value }))} />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField size="small" fullWidth label="تأییدکننده" value={planForm.approved_by_name}
                onChange={e => setPlanForm(p => ({ ...p, approved_by_name: e.target.value }))} />
            </Grid>
          </Grid>

          <Divider sx={{ my: 1.5 }} />
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography sx={{ fontFamily: FONT, fontWeight: 800, fontSize: 13 }}>
              ردیف‌های بازرسی
            </Typography>
            <Button size="small" startIcon={<AddIcon />} onClick={() => setPlanForm(p => ({
              ...p,
              items: [...p.items, {
                item_no: String(p.items.length + 1), description: '', inspection_type: 'site',
                point_type: 'hold', reference: '', frequency: '', planned_date: '',
              }],
            }))}>
              افزودن ردیف
            </Button>
          </Stack>
          <Stack spacing={1} sx={{ mt: 1 }}>
            {/* PLAN_ITEM_ROWS */}
            {(planForm.items || []).map((item, index) => (
              <Grid container spacing={1} key={index} alignItems="center">
                <Grid item xs={2} md={1}>
                  <TextField size="small" fullWidth label="ردیف" value={item.item_no}
                    onChange={e => setPlanForm(p => ({
                      ...p, items: p.items.map((it, i) => (i === index ? { ...it, item_no: e.target.value } : it)),
                    }))} />
                </Grid>
                <Grid item xs={10} md={4}>
                  <TextField size="small" fullWidth label="شرح فعالیت/آیتم" value={item.description}
                    onChange={e => setPlanForm(p => ({
                      ...p, items: p.items.map((it, i) => (i === index ? { ...it, description: e.target.value } : it)),
                    }))} />
                </Grid>
                <Grid item xs={6} md={2}>
                  <FormControl size="small" fullWidth>
                    <InputLabel>نوع</InputLabel>
                    <Select value={item.inspection_type} label="نوع"
                      onChange={e => setPlanForm(p => ({
                        ...p, items: p.items.map((it, i) => (i === index ? { ...it, inspection_type: e.target.value } : it)),
                      }))}>
                      {Object.entries(INSP_TYPE).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6} md={2}>
                  <FormControl size="small" fullWidth>
                    <InputLabel>نقطهٔ کنترلی</InputLabel>
                    <Select value={item.point_type} label="نقطهٔ کنترلی"
                      onChange={e => setPlanForm(p => ({
                        ...p, items: p.items.map((it, i) => (i === index ? { ...it, point_type: e.target.value } : it)),
                      }))}>
                      {Object.entries(POINT_TYPE).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6} md={2}>
                  <TextField size="small" fullWidth label="مرجع/استاندارد" value={item.reference}
                    onChange={e => setPlanForm(p => ({
                      ...p, items: p.items.map((it, i) => (i === index ? { ...it, reference: e.target.value } : it)),
                    }))} />
                </Grid>
                <Grid item xs={6} md={1}>
                  <IconButton size="small" color="error" onClick={() => setPlanForm(p => ({
                    ...p, items: p.items.filter((_, i) => i !== index),
                  }))}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Grid>
              </Grid>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPlanOpen(false)}>انصراف</Button>
          <Button variant="contained" onClick={submitPlan} disabled={savePlan.isPending}>ثبت طرح</Button>
        </DialogActions>
      </Dialog>

      {/* ------------------------------ دیالوگ بازرسی ------------------------------ */}
      <Dialog open={inspectionOpen} onClose={() => setInspectionOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontFamily: FONT, fontWeight: 800 }}>
          {editId ? 'ویرایش بازرسی' : 'ثبت بازرسی/آزمون'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={1.5} sx={{ mt: 0 }}>
            <Grid item xs={12} md={3}>
              <TextField size="small" fullWidth label="شمارهٔ بازرسی *" value={inspectionForm.number}
                onChange={e => setInspectionForm(p => ({ ...p, number: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={5}>
              <TextField size="small" fullWidth label="عنوان" value={inspectionForm.title}
                onChange={e => setInspectionForm(p => ({ ...p, title: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl size="small" fullWidth>
                <InputLabel>ردیف طرح بازرسی (ITP)</InputLabel>
                <Select value={inspectionForm.plan_item} label="ردیف طرح بازرسی (ITP)"
                  onChange={e => setInspectionForm(p => ({ ...p, plan_item: e.target.value }))}>
                  <MenuItem value="">— بدون اتصال —</MenuItem>
                  {itemList.map(it => (
                    <MenuItem key={it.id} value={it.id}>{it.item_no} — {it.description}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} md={3}>
              <JalaliDatePicker fullWidth label="تاریخ بازرسی" value={inspectionForm.date}
                onChange={(g) => setInspectionForm(p => ({ ...p, date: g }))} />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField size="small" fullWidth label="بازرس" value={inspectionForm.inspector_name}
                onChange={e => setInspectionForm(p => ({ ...p, inspector_name: e.target.value }))} />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField size="small" fullWidth label="محل" value={inspectionForm.location}
                onChange={e => setInspectionForm(p => ({ ...p, location: e.target.value }))} />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField size="small" fullWidth label="مرجع گزارش" value={inspectionForm.report_ref}
                onChange={e => setInspectionForm(p => ({ ...p, report_ref: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField size="small" fullWidth multiline minRows={2} label="ملاحظات"
                value={inspectionForm.remarks}
                onChange={e => setInspectionForm(p => ({ ...p, remarks: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInspectionOpen(false)}>انصراف</Button>
          <Button variant="contained" onClick={submitInspection} disabled={saveInspection.isPending}>
            {editId ? 'ذخیره تغییرات' : 'ثبت بازرسی'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---------------------- دیالوگ ثبت نتیجهٔ بازرسی ---------------------- */}
      <Dialog open={!!completeTarget} onClose={() => setCompleteTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontFamily: FONT, fontWeight: 800 }}>
          ثبت نتیجهٔ بازرسی {completeTarget ? completeTarget.number : ''}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={1.5} sx={{ mt: 0 }}>
            <Grid item xs={12} md={6}>
              <FormControl size="small" fullWidth>
                <InputLabel>نتیجه</InputLabel>
                <Select value={completeForm.result} label="نتیجه"
                  onChange={e => setCompleteForm(p => ({ ...p, result: e.target.value }))}>
                  <MenuItem value="pass">قبول</MenuItem>
                  <MenuItem value="fail">رد (ایجاد NCR)</MenuItem>
                  <MenuItem value="conditional">قبول مشروط</MenuItem>
                  <MenuItem value="na">قابل‌اجرا نبود</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <JalaliDatePicker fullWidth label="تاریخ بازرسی" value={completeForm.date}
                onChange={(g) => setCompleteForm(p => ({ ...p, date: g }))} />
            </Grid>
            {completeForm.result === 'fail' ? (
              <Grid item xs={12} md={6}>
                <FormControl size="small" fullWidth>
                  <InputLabel>شدت NCR</InputLabel>
                  <Select value={completeForm.severity} label="شدت NCR"
                    onChange={e => setCompleteForm(p => ({ ...p, severity: e.target.value }))}>
                    <MenuItem value="minor">جزئی</MenuItem>
                    <MenuItem value="major">عمده</MenuItem>
                    <MenuItem value="critical">بحرانی</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            ) : null}
            <Grid item xs={12}>
              <TextField size="small" fullWidth multiline minRows={2} label="ملاحظات/شرح عدم انطباق"
                value={completeForm.remarks}
                onChange={e => setCompleteForm(p => ({ ...p, remarks: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompleteTarget(null)}>انصراف</Button>
          <Button variant="contained" onClick={submitComplete} disabled={completeInspection.isPending}>
            ثبت نتیجه
          </Button>
        </DialogActions>
      </Dialog>

      {/* MORE_DIALOGS */}

      {/* ------------------------------ دیالوگ NCR ------------------------------ */}
      <Dialog open={ncrOpen} onClose={() => setNcrOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontFamily: FONT, fontWeight: 800 }}>
          {ncrEditId ? 'ویرایش عدم انطباق (NCR)' : 'ثبت عدم انطباق (NCR)'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={1.5} sx={{ mt: 0 }}>
            <Grid item xs={12} md={3}>
              <TextField size="small" fullWidth label="شماره *" value={ncrForm.number}
                onChange={e => setNcrForm(p => ({ ...p, number: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField size="small" fullWidth label="عنوان *" value={ncrForm.title}
                onChange={e => setNcrForm(p => ({ ...p, title: e.target.value }))} />
            </Grid>
            <Grid item xs={6} md={3}>
              <FormControl size="small" fullWidth>
                <InputLabel>شدت</InputLabel>
                <Select value={ncrForm.severity} label="شدت"
                  onChange={e => setNcrForm(p => ({ ...p, severity: e.target.value }))}>
                  <MenuItem value="minor">جزئی</MenuItem>
                  <MenuItem value="major">عمده</MenuItem>
                  <MenuItem value="critical">بحرانی</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} md={3}>
              <FormControl size="small" fullWidth>
                <InputLabel>منشأ</InputLabel>
                <Select value={ncrForm.source} label="منشأ"
                  onChange={e => setNcrForm(p => ({ ...p, source: e.target.value }))}>
                  <MenuItem value="inspection">بازرسی/آزمون</MenuItem>
                  <MenuItem value="site">مشاهدهٔ محل</MenuItem>
                  <MenuItem value="audit">ممیزی</MenuItem>
                  <MenuItem value="client">کارفرما/مشاور</MenuItem>
                  <MenuItem value="other">سایر</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField size="small" fullWidth label="رشته/دیسیپلین" value={ncrForm.discipline}
                onChange={e => setNcrForm(p => ({ ...p, discipline: e.target.value }))} />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField size="small" fullWidth label="مسئول رفع" value={ncrForm.responsible_name}
                onChange={e => setNcrForm(p => ({ ...p, responsible_name: e.target.value }))} />
            </Grid>
            <Grid item xs={6} md={3}>
              <JalaliDatePicker fullWidth label="تاریخ تشخیص" value={ncrForm.detected_date}
                onChange={(g) => setNcrForm(p => ({ ...p, detected_date: g }))} />
            </Grid>
            <Grid item xs={6} md={3}>
              <JalaliDatePicker fullWidth label="مهلت رفع" value={ncrForm.due_date}
                onChange={(g) => setNcrForm(p => ({ ...p, due_date: g }))} />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField size="small" fullWidth type="number" label="اثر مالی (ریال)" value={ncrForm.cost_impact}
                onChange={e => setNcrForm(p => ({ ...p, cost_impact: e.target.value }))} />
            </Grid>
            <Grid item xs={6} md={3}>
              <FormControlLabel control={
                <Checkbox checked={!!ncrForm.requires_rework}
                  onChange={e => setNcrForm(p => ({ ...p, requires_rework: e.target.checked }))} />
              } label={<span style={{ fontFamily: 'inherit' }}>نیازمند اجرای مجدد</span>} />
            </Grid>
            <Grid item xs={12}>
              <TextField size="small" fullWidth multiline minRows={2} label="شرح عدم انطباق"
                value={ncrForm.description}
                onChange={e => setNcrForm(p => ({ ...p, description: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField size="small" fullWidth multiline minRows={2} label="علت ریشه‌ای"
                value={ncrForm.root_cause}
                onChange={e => setNcrForm(p => ({ ...p, root_cause: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField size="small" fullWidth multiline minRows={2} label="اقدام اصلاحی"
                value={ncrForm.corrective_action}
                onChange={e => setNcrForm(p => ({ ...p, corrective_action: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField size="small" fullWidth multiline minRows={2} label="اقدام پیشگیرانه"
                value={ncrForm.preventive_action}
                onChange={e => setNcrForm(p => ({ ...p, preventive_action: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNcrOpen(false)}>انصراف</Button>
          <Button variant="contained" onClick={submitNcr} disabled={saveNcr.isPending}>
            {ncrEditId ? 'ذخیره تغییرات' : 'ثبت NCR'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ------------------------------ دیالوگ کسرکار ------------------------------ */}
      <Dialog open={punchOpen} onClose={() => setPunchOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontFamily: FONT, fontWeight: 800 }}>
          {punchEditId ? 'ویرایش مورد کسرکار' : 'ثبت مورد کسرکار (Punch)'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={1.5} sx={{ mt: 0 }}>
            <Grid item xs={12} md={3}>
              <TextField size="small" fullWidth label="شماره *" value={punchForm.number}
                onChange={e => setPunchForm(p => ({ ...p, number: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={9}>
              <TextField size="small" fullWidth label="شرح نقص/کسرکار *" value={punchForm.description}
                onChange={e => setPunchForm(p => ({ ...p, description: e.target.value }))} />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField size="small" fullWidth label="محل/موقعیت" value={punchForm.location}
                onChange={e => setPunchForm(p => ({ ...p, location: e.target.value }))} />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField size="small" fullWidth label="رشته/دیسیپلین" value={punchForm.discipline}
                onChange={e => setPunchForm(p => ({ ...p, discipline: e.target.value }))} />
            </Grid>
            <Grid item xs={6} md={2}>
              <FormControl size="small" fullWidth>
                <InputLabel>اولویت</InputLabel>
                <Select value={punchForm.priority} label="اولویت"
                  onChange={e => setPunchForm(p => ({ ...p, priority: e.target.value }))}>
                  <MenuItem value="low">کم</MenuItem>
                  <MenuItem value="medium">متوسط</MenuItem>
                  <MenuItem value="high">زیاد</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} md={4}>
              <TextField size="small" fullWidth label="مسئول رفع" value={punchForm.responsible_name}
                onChange={e => setPunchForm(p => ({ ...p, responsible_name: e.target.value }))} />
            </Grid>
            <Grid item xs={6} md={3}>
              <JalaliDatePicker fullWidth label="تاریخ ثبت" value={punchForm.reported_date}
                onChange={(g) => setPunchForm(p => ({ ...p, reported_date: g }))} />
            </Grid>
            <Grid item xs={6} md={3}>
              <JalaliDatePicker fullWidth label="مهلت رفع" value={punchForm.due_date}
                onChange={(g) => setPunchForm(p => ({ ...p, due_date: g }))} />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField size="small" fullWidth type="number" label="هزینهٔ رفع (ریال)" value={punchForm.cost}
                onChange={e => setPunchForm(p => ({ ...p, cost: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPunchOpen(false)}>انصراف</Button>
          <Button variant="contained" onClick={submitPunch} disabled={savePunch.isPending}>
            {punchEditId ? 'ذخیره تغییرات' : 'ثبت کسرکار'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* --------------------------- دیالوگ تأیید رفع --------------------------- */}
      <Dialog open={!!verifyTarget} onClose={() => setVerifyTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontFamily: FONT, fontWeight: 800 }}>
          تأیید رفع {verifyTarget ? verifyTarget.number : ''}
        </DialogTitle>
        <DialogContent dividers>
          <TextField size="small" fullWidth label="تأییدکننده" value={verifiedBy}
            onChange={e => setVerifiedBy(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVerifyTarget(null)}>انصراف</Button>
          <Button variant="contained" color="success"
            onClick={() => punchStatus.mutate({ id: verifyTarget.id, status: 'verified', verified_by_name: verifiedBy })}>
            تأیید
          </Button>
        </DialogActions>
      </Dialog>

      {/* ------------------------------ دیالوگ HSE ------------------------------ */}
      <Dialog open={hseOpen} onClose={() => setHseOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontFamily: FONT, fontWeight: 800 }}>
          {hseEditId ? 'ویرایش رویداد HSE' : 'ثبت رویداد HSE'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={1.5} sx={{ mt: 0 }}>
            <Grid item xs={12} md={3}>
              <TextField size="small" fullWidth label="شماره *" value={hseForm.number}
                onChange={e => setHseForm(p => ({ ...p, number: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField size="small" fullWidth label="عنوان *" value={hseForm.title}
                onChange={e => setHseForm(p => ({ ...p, title: e.target.value }))} />
            </Grid>
            <Grid item xs={6} md={3}>
              <FormControl size="small" fullWidth>
                <InputLabel>شدت</InputLabel>
                <Select value={hseForm.severity} label="شدت"
                  onChange={e => setHseForm(p => ({ ...p, severity: e.target.value }))}>
                  <MenuItem value="low">کم</MenuItem>
                  <MenuItem value="medium">متوسط</MenuItem>
                  <MenuItem value="high">زیاد</MenuItem>
                  <MenuItem value="critical">بحرانی</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl size="small" fullWidth>
                <InputLabel>نوع رویداد</InputLabel>
                <Select value={hseForm.incident_type} label="نوع رویداد"
                  onChange={e => setHseForm(p => ({ ...p, incident_type: e.target.value }))}>
                  {Object.entries(HSE_TYPE).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} md={4}>
              <JalaliDatePicker fullWidth label="تاریخ رویداد" value={hseForm.date}
                onChange={(g) => setHseForm(p => ({ ...p, date: g }))} />
            </Grid>
            <Grid item xs={6} md={4}>
              <TextField size="small" fullWidth label="ساعت (HH:MM)" value={hseForm.time}
                onChange={e => setHseForm(p => ({ ...p, time: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField size="small" fullWidth label="محل رویداد" value={hseForm.location}
                onChange={e => setHseForm(p => ({ ...p, location: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField size="small" fullWidth label="افراد درگیر" value={hseForm.involved_persons}
                onChange={e => setHseForm(p => ({ ...p, involved_persons: e.target.value }))} />
            </Grid>
            <Grid item xs={6} md={2}>
              <TextField size="small" fullWidth type="number" label="روز از کارافتادگی" value={hseForm.lost_days}
                onChange={e => setHseForm(p => ({ ...p, lost_days: e.target.value }))} />
            </Grid>
            <Grid item xs={6} md={2}>
              <TextField size="small" fullWidth type="number" label="نفر-ساعت" value={hseForm.man_hours}
                onChange={e => setHseForm(p => ({ ...p, man_hours: e.target.value }))} />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField size="small" fullWidth type="number" label="اثر مالی (ریال)" value={hseForm.cost_impact}
                onChange={e => setHseForm(p => ({ ...p, cost_impact: e.target.value }))} />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField size="small" fullWidth label="گزارش‌دهنده" value={hseForm.reported_by_name}
                onChange={e => setHseForm(p => ({ ...p, reported_by_name: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField size="small" fullWidth multiline minRows={2} label="شرح رویداد"
                value={hseForm.description}
                onChange={e => setHseForm(p => ({ ...p, description: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField size="small" fullWidth multiline minRows={2} label="علت ریشه‌ای"
                value={hseForm.root_cause}
                onChange={e => setHseForm(p => ({ ...p, root_cause: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField size="small" fullWidth multiline minRows={2} label="اقدام اصلاحی"
                value={hseForm.corrective_action}
                onChange={e => setHseForm(p => ({ ...p, corrective_action: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField size="small" fullWidth multiline minRows={2} label="اقدام پیشگیرانه"
                value={hseForm.preventive_action}
                onChange={e => setHseForm(p => ({ ...p, preventive_action: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHseOpen(false)}>انصراف</Button>
          <Button variant="contained" onClick={submitHse} disabled={saveHse.isPending}>
            {hseEditId ? 'ذخیره تغییرات' : 'ثبت رویداد'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ------------------------ دیالوگ یادداشت تغییر وضعیت ------------------------ */}
      <Dialog open={!!noteDialog} onClose={() => setNoteDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontFamily: FONT, fontWeight: 800 }}>
          تغییر وضعیت {noteDialog?.label || ''} به «
          {(noteDialog?.kind === 'hse' ? HSE_STATUS : NCR_STATUS)[noteDialog?.target]?.label || noteDialog?.target}»
        </DialogTitle>
        <DialogContent dividers>
          <TextField size="small" fullWidth multiline minRows={2} label="یادداشت (اختیاری)"
            value={noteText} onChange={e => setNoteText(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNoteDialog(null)}>انصراف</Button>
          <Button variant="contained"
            onClick={() => {
              const payload = { id: noteDialog?.id, status: noteDialog?.target, note: noteText };
              if (noteDialog?.kind === 'hse') hseStatus.mutate(payload);
              else ncrStatus.mutate(payload);
            }}>
            ثبت
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default ProjectQualityPage;

