import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, FormControl, Grid, IconButton, InputLabel, LinearProgress, MenuItem,
  Paper, Select, Stack, Tab, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Tabs, TextField, Tooltip, Typography,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ReplayIcon from '@mui/icons-material/Replay';
import HistoryIcon from '@mui/icons-material/History';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
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
const LEVELS = {
  low: { label: 'کم', color: '#10b981' },
  medium: { label: 'متوسط', color: '#f59e0b' },
  high: { label: 'زیاد', color: '#f97316' },
  critical: { label: 'بحرانی', color: '#ef4444' },
};
const LEVEL_ORDER = ['critical', 'high', 'medium', 'low'];
const RISK_STATUS = {
  open: { label: 'باز', color: '#64748b' },
  mitigating: { label: 'در حال کاهش', color: '#0ea5e9' },
  monitoring: { label: 'تحت پایش', color: '#8b5cf6' },
  occurred: { label: 'رخ‌داده', color: '#ef4444' },
  accepted: { label: 'پذیرفته‌شده', color: '#f59e0b' },
  closed: { label: 'بسته', color: '#10b981' },
};
const ACTION_STATUS = {
  planned: { label: 'برنامه‌ریزی‌شده', color: '#64748b' },
  in_progress: { label: 'در حال اجرا', color: '#0ea5e9' },
  done: { label: 'انجام‌شده', color: '#10b981' },
  cancelled: { label: 'لغو شده', color: '#94a3b8' },
};
const TYPE_LABELS = { threat: 'تهدید', opportunity: 'فرصت' };
const RESPONSE_LABELS = {
  avoid: 'اجتناب', transfer: 'انتقال', mitigate: 'کاهش', accept: 'پذیرش',
  exploit: 'بهره‌گیری', enhance: 'تشدید', share: 'تقسیم',
};

const emptyRisk = () => ({
  project: '', number: '', title: '', description: '', root_cause: '', trigger: '',
  category: '', risk_type: 'threat', response_strategy: 'mitigate',
  probability: 3, impact_cost: 3, impact_time: 1, impact_quality: 1, impact_hse: 1,
  cost_impact: '', schedule_impact_days: 0,
  residual_probability: 0, residual_impact: 0,
  owner_name: '', identified_by_name: '', identified_date: '', due_date: '',
  review_date: '', mitigation_plan: '', contingency_plan: '', note: '',
});

const emptyAction = (riskId = '') => ({
  risk: riskId, title: '', description: '', owner_name: '', start_date: '',
  due_date: '', cost: '', sort_order: 0,
});

const emptyReview = () => ({
  date: '', probability: '', impact: '', residual_probability: '',
  residual_impact: '', next_review_date: '', note: '',
});

const levelChip = (level) => {
  const meta = LEVELS[level] || { label: level, color: '#64748b' };
  return (
    <Chip size="small" label={meta.label}
      sx={{ fontWeight: 800, fontSize: 11.5, bgcolor: `${meta.color}22`, color: meta.color }} />
  );
};

const KpiCard = ({ title, value, sub, color = '#8b5cf6', icon = null }) => (
  <InfoCard icon={icon} label={title} value={value} suffix={sub} color={color} />
);

const ProjectRiskPage = () => {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const projectId = params.get('project') || '';
  const [tab, setTab] = useState(0);
  const [message, setMessage] = useState(null);
  const [levelFilter, setLevelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [matrixFilter, setMatrixFilter] = useState(null);   // {probability, impact}
  const [riskOpen, setRiskOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [riskForm, setRiskForm] = useState(emptyRisk());
  const [detailId, setDetailId] = useState(null);
  const [actionOpen, setActionOpen] = useState(false);
  const [actionRisk, setActionRisk] = useState('');
  const [actionForm, setActionForm] = useState(emptyAction());
  const [actionEditId, setActionEditId] = useState(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewForm, setReviewForm] = useState(emptyReview());
  const [noteDialog, setNoteDialog] = useState(null);       // {type:'status'|'close', risk, target}
  const [noteText, setNoteText] = useState('');
  const [deleteId, setDeleteId] = useState(null);

  const { data: projects } = useQuery({
    queryKey: ['risk-projects'],
    queryFn: () => axiosInstance.get('/projects/', { params: { page_size: 500 } }).then(r => r.data),
  });
  const projectList = Array.isArray(projects) ? projects : projects?.results || [];

  useEffect(() => {
    if (!projectId && projectList.length) {
      setParams({ project: String(projectList[0].id) }, { replace: true });
    }
  }, [projectId, projectList, setParams]);

  const { data: categories } = useQuery({
    queryKey: ['risk-categories'],
    queryFn: () => axiosInstance.get('/risk-categories/', { params: { page_size: 200 } }).then(r => r.data),
  });
  const categoryList = Array.isArray(categories) ? categories : categories?.results || [];

  const riskParams = useMemo(() => {
    const p = { project: projectId, page_size: 500 };
    if (levelFilter) p.level = levelFilter;
    if (statusFilter) p.status = statusFilter;
    if (search) p.search = search;
    return p;
  }, [projectId, levelFilter, statusFilter, search]);

  const { data: risks, isLoading: loadingRisks } = useQuery({
    queryKey: ['risks', riskParams],
    queryFn: () => axiosInstance.get('/risks/', { params: riskParams }).then(r => r.data),
    enabled: !!projectId,
  });
  const riskList = Array.isArray(risks) ? risks : risks?.results || [];

  const { data: matrixData } = useQuery({
    queryKey: ['risks-matrix', projectId],
    queryFn: () => axiosInstance.get('/risks/matrix/', { params: { project: projectId } }).then(r => r.data),
    enabled: !!projectId,
  });

  const { data: actions } = useQuery({
    queryKey: ['risk-actions', projectId],
    queryFn: () => axiosInstance.get('/risk-actions/', { params: { project: projectId, page_size: 500 } }).then(r => r.data),
    enabled: !!projectId,
  });
  const actionList = Array.isArray(actions) ? actions : actions?.results || [];

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['risks'] });
    qc.invalidateQueries({ queryKey: ['risks-matrix'] });
    qc.invalidateQueries({ queryKey: ['risk-actions'] });
  };

  const detailRisk = riskList.find(r => r.id === detailId) || null;
  const visibleRisks = useMemo(() => {
    let list = riskList;
    if (matrixFilter) {
      list = list.filter(r => r.probability === matrixFilter.probability
        && r.impact_cost === matrixFilter.impact);
    }
    if (search) {
      const q = search.trim();
      list = list.filter(r => `${r.number} ${r.title} ${r.owner_name || ''} ${r.owner_full_name || ''}`.includes(q));
    }
    return list;
  }, [riskList, matrixFilter, search]);

  const cellMap = useMemo(() => {
    const cells = matrixData?.matrix?.cells || [];
    const map = {};
    cells.forEach((c) => { map[`${c.probability}-${c.impact}`] = c; });
    return map;
  }, [matrixData]);
  const maxCount = matrixData?.matrix?.max_count || 0;
  const kpis = matrixData?.kpis || null;

  const saveRisk = useMutation({
    mutationFn: (payload) => (payload.id
      ? axiosInstance.patch(`/risks/${payload.id}/`, payload.body).then(r => r.data)
      : axiosInstance.post('/risks/', payload.body).then(r => r.data)),
    onSuccess: (data, variables) => {
      setMessage({
        type: 'success',
        text: `ریسک ${data.number} ${variables.id ? 'به‌روزرسانی' : 'ثبت'} شد — امتیاز ${toPersianDigits(data.score)} (${data.level_display})`,
      });
      setRiskOpen(false);
      setEditId(null);
      setRiskForm(emptyRisk());
      invalidate();
    },
    onError: (err) => setMessage({
      type: 'error',
      text: err?.response?.data?.detail || 'ثبت ریسک ناموفق بود. شمارهٔ تکراری یا دادهٔ نامعتبر؟',
    }),
  });

  const riskStatus = useMutation({
    mutationFn: ({ id, status, note }) => axiosInstance
      .post(`/risks/${id}/set-status/`, { status, note: note || '' }).then(r => r.data),
    onSuccess: (data) => {
      setMessage({
        type: 'success',
        text: `وضعیت ریسک ${data.number}: ${(RISK_STATUS[data.status] || {}).label || data.status}`,
      });
      setNoteDialog(null);
      setNoteText('');
      invalidate();
    },
    onError: (err) => setMessage({ type: 'error', text: err?.response?.data?.detail || 'تغییر وضعیت ناموفق بود.' }),
  });

  const reopenRisk = useMutation({
    mutationFn: ({ id, note }) => axiosInstance.post(`/risks/${id}/reopen/`, { note: note || '' }).then(r => r.data),
    onSuccess: (data) => {
      setMessage({ type: 'success', text: `ریسک ${data.number} بازگشایی شد.` });
      invalidate();
    },
    onError: (err) => setMessage({ type: 'error', text: err?.response?.data?.detail || 'بازگشایی ناموفق بود.' }),
  });

  const addReview = useMutation({
    mutationFn: ({ id, body }) => axiosInstance.post(`/risks/${id}/review/`, body).then(r => r.data),
    onSuccess: (data) => {
      setMessage({
        type: 'success',
        text: `بازنگری ثبت شد — امتیاز جدید ${toPersianDigits(data.risk.score)} (${data.risk.level_display})`,
      });
      setReviewOpen(false);
      setReviewForm(emptyReview());
      invalidate();
    },
    onError: (err) => setMessage({ type: 'error', text: err?.response?.data?.detail || 'ثبت بازنگری ناموفق بود.' }),
  });

  const removeRisk = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/risks/${id}/`),
    onSuccess: () => {
      setMessage({ type: 'success', text: 'ریسک حذف شد.' });
      setDeleteId(null);
      setDetailId(null);
      invalidate();
    },
    onError: () => setMessage({ type: 'error', text: 'حذف ریسک ناموفق بود.' }),
  });

  const saveAction = useMutation({
    mutationFn: (payload) => (payload.id
      ? axiosInstance.patch(`/risk-actions/${payload.id}/`, payload.body).then(r => r.data)
      : axiosInstance.post('/risk-actions/', payload.body).then(r => r.data)),
    onSuccess: () => {
      setMessage({ type: 'success', text: 'اقدام کاهش ثبت شد.' });
      setActionOpen(false);
      setActionEditId(null);
      setActionForm(emptyAction());
      invalidate();
    },
    onError: (err) => setMessage({ type: 'error', text: err?.response?.data?.detail || 'ثبت اقدام ناموفق بود.' }),
  });

  const actionStatus = useMutation({
    mutationFn: ({ id, status }) => axiosInstance
      .post(`/risk-actions/${id}/set-status/`, { status }).then(r => r.data),
    onSuccess: (data) => {
      setMessage({
        type: 'success',
        text: `اقدام «${data.title}»: ${(ACTION_STATUS[data.status] || {}).label || data.status}`,
      });
      invalidate();
    },
    onError: (err) => setMessage({ type: 'error', text: err?.response?.data?.detail || 'تغییر وضعیت اقدام ناموفق بود.' }),
  });

  const removeAction = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/risk-actions/${id}/`),
    onSuccess: () => {
      setMessage({ type: 'success', text: 'اقدام حذف شد.' });
      invalidate();
    },
    onError: () => setMessage({ type: 'error', text: 'حذف اقدام ناموفق بود.' }),
  });

  const openRiskDialog = (risk = null) => {
    if (risk) {
      setEditId(risk.id);
      setRiskForm({
        ...emptyRisk(),
        ...risk,
        category: risk.category || '',
        owner_name: risk.owner_name || risk.owner_full_name || '',
        cost_impact: risk.cost_impact ?? '',
        identified_date: risk.identified_date || '',
        due_date: risk.due_date || '',
        review_date: risk.review_date || '',
        description: risk.description || '',
        root_cause: risk.root_cause || '',
        trigger: risk.trigger || '',
        mitigation_plan: risk.mitigation_plan || '',
        contingency_plan: risk.contingency_plan || '',
        note: risk.note || '',
      });
    } else {
      setEditId(null);
      setRiskForm({ ...emptyRisk(), project: projectId });
    }
    setRiskOpen(true);
  };

  const openActionDialog = (riskId, action = null) => {
    if (action) {
      setActionEditId(action.id);
      setActionForm({
        ...emptyAction(riskId),
        ...action,
        owner_name: action.owner_name || action.owner_full_name || '',
        start_date: action.start_date || '',
        due_date: action.due_date || '',
        cost: action.cost ?? '',
      });
    } else {
      setActionEditId(null);
      setActionForm(emptyAction(riskId));
    }
    setActionRisk(String(riskId));
    setActionOpen(true);
  };

  const submitRisk = () => {
    if (!riskForm.project || !riskForm.number || !riskForm.title) {
      setMessage({ type: 'error', text: 'پروژه، شمارهٔ ریسک و عنوان الزامی است.' });
      return;
    }
    const body = {
      project: riskForm.project,
      number: riskForm.number,
      title: riskForm.title,
      description: riskForm.description || '',
      root_cause: riskForm.root_cause || '',
      trigger: riskForm.trigger || '',
      category: riskForm.category || null,
      risk_type: riskForm.risk_type,
      response_strategy: riskForm.response_strategy,
      probability: Number(riskForm.probability || 1),
      impact_cost: Number(riskForm.impact_cost || 1),
      impact_time: Number(riskForm.impact_time || 1),
      impact_quality: Number(riskForm.impact_quality || 1),
      impact_hse: Number(riskForm.impact_hse || 1),
      cost_impact: Number(riskForm.cost_impact || 0),
      schedule_impact_days: Number(riskForm.schedule_impact_days || 0),
      residual_probability: Number(riskForm.residual_probability || 0),
      residual_impact: Number(riskForm.residual_impact || 0),
      owner_name: riskForm.owner_name || '',
      identified_by_name: riskForm.identified_by_name || '',
      identified_date: riskForm.identified_date || null,
      due_date: riskForm.due_date || null,
      review_date: riskForm.review_date || null,
      mitigation_plan: riskForm.mitigation_plan || '',
      contingency_plan: riskForm.contingency_plan || '',
      note: riskForm.note || '',
    };
    saveRisk.mutate({ id: editId, body });
  };

  const submitAction = () => {
    if (!actionForm.title) {
      setMessage({ type: 'error', text: 'عنوان اقدام الزامی است.' });
      return;
    }
    const body = {
      risk: actionForm.risk || actionRisk,
      title: actionForm.title,
      description: actionForm.description || '',
      owner_name: actionForm.owner_name || '',
      start_date: actionForm.start_date || null,
      due_date: actionForm.due_date || null,
      cost: Number(actionForm.cost || 0),
      sort_order: Number(actionForm.sort_order || 0),
    };
    saveAction.mutate({ id: actionEditId, body });
  };

  const submitReview = () => {
    if (!detailRisk) return;
    const body = {
      date: reviewForm.date || null,
      probability: reviewForm.probability === '' ? null : Number(reviewForm.probability),
      impact: reviewForm.impact === '' ? null : Number(reviewForm.impact),
      residual_probability: reviewForm.residual_probability === '' ? null : Number(reviewForm.residual_probability),
      residual_impact: reviewForm.residual_impact === '' ? null : Number(reviewForm.residual_impact),
      next_review_date: reviewForm.next_review_date || null,
      note: reviewForm.note || '',
    };
    addReview.mutate({ id: detailRisk.id, body });
  };

  const matrixRows = [5, 4, 3, 2, 1];
  const impactCols = [1, 2, 3, 4, 5];
  const cellStyle = (cell) => {
    const meta = LEVELS[cell?.level] || LEVELS.low;
    if (!cell || !cell.count) {
      return { bgcolor: 'rgba(241,245,249,0.85)', border: '1px solid #e2e8f0', color: '#94a3b8' };
    }
    const strength = maxCount ? 0.28 + 0.62 * Math.min(cell.count / maxCount, 1) : 0.7;
    return {
      bgcolor: `${meta.color}${Math.round(strength * 255).toString(16).padStart(2, '0')}`,
      border: `1px solid ${meta.color}`,
      color: '#0f172a',
    };
  };

  const renderMatrix = () => (
    <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems="flex-start">
      <Paper sx={{ p: 1.5, borderRadius: '14px', flex: 1, width: '100%' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography sx={{ fontFamily: FONT, fontWeight: 800, fontSize: 13.5 }}>
            ماتریس ریسک (احتمال × شدت اثر)
          </Typography>
          {matrixFilter ? (
            <Chip size="small" color="primary" label="حذف فیلتر ماتریس"
              onDelete={() => setMatrixFilter(null)} sx={{ fontFamily: FONT, fontWeight: 700 }} />
          ) : null}
        </Stack>
        <Box sx={{ display: 'grid', gridTemplateColumns: '52px repeat(5, minmax(0,1fr))', gap: 0.5 }}>
          <Box />
          {impactCols.map((impact) => (
            <Box key={`h-${impact}`} sx={{ textAlign: 'center', fontSize: 12, fontWeight: 800,
              color: '#475569', fontFamily: FONT }}>
              شدت {toPersianDigits(impact)}
            </Box>
          ))}
          {matrixRows.map((probability) => (
            <React.Fragment key={`r-${probability}`}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 800, color: '#475569', fontFamily: FONT }}>
                احت. {toPersianDigits(probability)}
              </Box>
              {impactCols.map((impact) => {
                const cell = cellMap[`${probability}-${impact}`];
                const style = cellStyle(cell);
                const levelMeta = LEVELS[cell?.level] || LEVELS.low;
                return (
                  <Tooltip key={`c-${probability}-${impact}`} arrow
                    title={cell?.count
                      ? cell.risks.map(r => `${r.number}: ${r.title}`).join(' | ')
                      : 'بدون ریسک'}>
                    <Box
                      onClick={() => {
                        if (!cell?.count) return;
                        setMatrixFilter({ probability, impact });
                        setTab(1);
                      }}
                      sx={{
                        ...style, minHeight: 56, borderRadius: '10px',
                        cursor: cell?.count ? 'pointer' : 'default',
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        justifyContent: 'center', transition: 'all 0.15s',
                        boxShadow: cell?.count ? '0 2px 6px rgba(15,23,42,0.08)' : 'none',
                        '&:hover': cell?.count ? { transform: 'translateY(-1px)' } : {},
                      }}>
                      <Typography sx={{ fontSize: 16, fontWeight: 800, fontFamily: FONT }}>
                        {cell?.count ? toPersianDigits(cell.count) : '—'}
                      </Typography>
                      <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: levelMeta.color,
                        fontFamily: FONT }}>
                        {toPersianDigits(probability * impact)}
                      </Typography>
                    </Box>
                  </Tooltip>
                );
              })}
            </React.Fragment>
          ))}
        </Box>
        <Stack direction="row" spacing={1.5} sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>
          {LEVEL_ORDER.slice().reverse().map((level) => (
            <Stack key={level} direction="row" spacing={0.5} alignItems="center">
              <Box sx={{ width: 12, height: 12, borderRadius: '3px', bgcolor: LEVELS[level].color }} />
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#475569', fontFamily: FONT }}>
                {LEVELS[level].label}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Paper>

      <Paper sx={{ p: 1.5, borderRadius: '14px', width: { xs: '100%', lg: 360 } }}>
        <Typography sx={{ fontFamily: FONT, fontWeight: 800, fontSize: 13.5, mb: 1 }}>
          ۵ ریسک مهم
        </Typography>
        <Stack spacing={0.75}>
          {(kpis?.top_risks || []).length === 0 ? (
            <Typography sx={{ fontFamily: FONT, fontSize: 12.5, color: '#94a3b8' }}>
              ریسکی ثبت نشده است.
            </Typography>
          ) : (kpis?.top_risks || []).map((risk) => (
            <Stack key={risk.id} direction="row" spacing={1} alignItems="center"
              onClick={() => setDetailId(risk.id)}
              sx={{ p: 0.75, borderRadius: '10px', bgcolor: 'rgba(248,250,252,0.9)', cursor: 'pointer' }}>
              <Box sx={{ width: 30, height: 30, borderRadius: '8px', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13,
                bgcolor: `${(LEVELS[risk.level] || LEVELS.low).color}22`,
                color: (LEVELS[risk.level] || LEVELS.low).color, fontFamily: FONT }}>
                {toPersianDigits(risk.score)}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontFamily: FONT, fontSize: 12.5, fontWeight: 700,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {risk.title}
                </Typography>
                <Typography sx={{ fontFamily: FONT, fontSize: 11, color: '#94a3b8' }}>
                  {risk.number} — {(RISK_STATUS[risk.status] || {}).label || risk.status}
                </Typography>
              </Box>
            </Stack>
          ))}
        </Stack>
        <Divider sx={{ my: 1.25 }} />
        <Stack spacing={0.75}>
          {LEVEL_ORDER.map((level) => {
            const count = kpis?.by_level?.[level] || 0;
            const total = kpis?.total || 0;
            const percent = total ? Math.round((count / total) * 100) : 0;
            return (
              <Box key={level}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography sx={{ fontFamily: FONT, fontSize: 12, fontWeight: 700,
                    color: LEVELS[level].color }}>
                    {LEVELS[level].label}
                  </Typography>
                  <Typography sx={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: '#64748b' }}>
                    {toPersianDigits(count)} ({toPersianDigits(percent)}٪)
                  </Typography>
                </Stack>
                <LinearProgress variant="determinate" value={percent}
                  sx={{ height: 7, borderRadius: 4, bgcolor: '#e2e8f0',
                    '& .MuiLinearProgress-bar': { bgcolor: LEVELS[level].color } }} />
              </Box>
            );
          })}
        </Stack>
      </Paper>
    </Stack>
  );

  return (
    <Box sx={{ p: { xs: 1.5, md: 2 }, fontFamily: FONT }}>
      <Paper sx={{ p: 2, mb: 1.5, borderRadius: '16px' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}
          alignItems={{ md: 'center' }} justifyContent="space-between">
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <WarningAmberIcon sx={{ color: '#ef4444' }} />
              <Typography variant="h6" sx={{ fontWeight: 800, fontFamily: FONT }}>
                رجیستر ریسک پروژه
              </Typography>
            </Stack>
            <Typography variant="body2" color="textSecondary" sx={{ fontFamily: FONT, mt: 0.5 }}>
              شناسایی، ارزیابی (ماتریس ۵×۵)، برنامهٔ کاهش و پایش ریسک‌ها و فرصت‌های پروژه
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 0.5 }} flexWrap="wrap" useFlexGap>
              <Chip size="small" label={`${toPersianDigits(kpis?.active || 0)} ریسک فعال`}
                sx={{ fontWeight: 700, bgcolor: 'rgba(239,68,68,0.12)', color: '#b91c1c' }} />
              <Chip size="small"
                label={`بحرانی/زیاد: ${toPersianDigits((kpis?.by_level?.critical || 0) + (kpis?.by_level?.high || 0))}`}
                sx={{ fontWeight: 700, bgcolor: 'rgba(249,115,22,0.12)', color: '#c2410c' }} />
              <Chip size="small" label={`اقدام معوق: ${toPersianDigits(kpis?.actions?.overdue || 0)}`}
                color={(kpis?.actions?.overdue || 0) ? 'warning' : 'success'} sx={{ fontWeight: 700 }} />
              <Chip size="small" label={`بسته‌شده: ${toPersianDigits(kpis?.closed || 0)}`}
                sx={{ fontWeight: 700, bgcolor: 'rgba(16,185,129,0.12)', color: '#047857' }} />
            </Stack>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <FormControl size="small" sx={{ minWidth: 240 }}>
              <InputLabel>پروژه</InputLabel>
              <Select value={projectId} label="پروژه"
                onChange={e => { setParams({ project: e.target.value }); setMatrixFilter(null); }}>
                {projectList.map(p => (
                  <MenuItem key={p.id} value={String(p.id)}>{p.code} — {p.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => openRiskDialog()}
              sx={{ borderRadius: '12px', background: 'linear-gradient(135deg,#ef4444,#f97316)' }}>
              ریسک جدید
            </Button>
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
          <KpiCard title="ریسک‌های فعال" color="#ef4444"
            value={toPersianDigits(kpis?.active || 0)}
            sub={`از مجموع ${toPersianDigits(kpis?.total || 0)} ریسک`} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard title="میانگین امتیاز" color="#f97316"
            value={toPersianDigits(kpis?.average_score || 0)}
            sub={`ارزش کل اثر مالی: ${money(kpis?.gross_exposure)}`} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard title="تعهد مالی مورد انتظار (EMV)" color="#8b5cf6"
            value={money(kpis?.exposure)}
            sub={`باقی‌مانده پس از کاهش: ${money(kpis?.residual_exposure)} (${toPersianDigits(kpis?.exposure_reduction_percent || 0)}٪ کاهش)`} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 1.5, borderRadius: '14px', height: '100%' }}>
            <Typography sx={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: '#64748b' }}>
              پیشرفت اقدام‌های کاهش
            </Typography>
            <Typography sx={{ fontFamily: FONT, fontSize: 20, fontWeight: 800, color: '#0ea5e9' }}>
              {toPersianDigits(kpis?.actions?.percent || 0)}٪
            </Typography>
            <LinearProgress variant="determinate" value={kpis?.actions?.percent || 0}
              sx={{ height: 7, borderRadius: 4, my: 0.5, bgcolor: '#e2e8f0',
                '& .MuiLinearProgress-bar': { bgcolor: '#0ea5e9' } }} />
            <Typography sx={{ fontFamily: FONT, fontSize: 11.5, color: '#94a3b8' }}>
              {toPersianDigits(kpis?.actions?.done || 0)} انجام‌شده از {toPersianDigits(kpis?.actions?.total || 0)} اقدام
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 1, mb: 1.5, borderRadius: '12px' }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} variant="scrollable" scrollButtons="auto"
          sx={{ '& .MuiTab-root': { fontFamily: FONT, fontWeight: 700, fontSize: 13.5 } }}>
          <Tab label="ماتریس و شاخص‌ها" />
          <Tab label={`رجیستر ریسک (${toPersianDigits(visibleRisks.length)})`} />
          <Tab label={`اقدام‌های کاهش (${toPersianDigits(actionList.length)})`} />
        </Tabs>
      </Paper>

      {tab === 0 && renderMatrix()}

      {tab === 1 && (
        <Paper sx={{ p: 1.5, borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.7)' }}>
          <Stack direction="row" spacing={1} sx={{ mb: 1.5 }} flexWrap="wrap" useFlexGap alignItems="center">
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>سطح ریسک</InputLabel>
              <Select value={levelFilter} label="سطح ریسک" onChange={e => setLevelFilter(e.target.value)}>
                <MenuItem value="">همه</MenuItem>
                {LEVEL_ORDER.map(l => <MenuItem key={l} value={l}>{LEVELS[l].label}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 170 }}>
              <InputLabel>وضعیت</InputLabel>
              <Select value={statusFilter} label="وضعیت" onChange={e => setStatusFilter(e.target.value)}>
                <MenuItem value="">همه</MenuItem>
                {Object.entries(RISK_STATUS).map(([key, meta]) => (
                  <MenuItem key={key} value={key}>{meta.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField size="small" label="جستجو (شماره، عنوان، مالک)" value={search}
              onChange={e => setSearch(e.target.value)} sx={{ minWidth: 240 }} />
            {matrixFilter ? (
              <Chip color="primary" sx={{ fontWeight: 700 }}
                label={`فیلتر ماتریس: احتمال ${toPersianDigits(matrixFilter.probability)} × شدت ${toPersianDigits(matrixFilter.impact)}`}
                onDelete={() => setMatrixFilter(null)} />
            ) : null}
          </Stack>
          {loadingRisks ? (
            <Box textAlign="center" py={6}><CircularProgress /></Box>
          ) : visibleRisks.length === 0 ? (
            <Typography variant="body2" color="textSecondary" textAlign="center" py={4}
              sx={{ fontFamily: FONT }}>
              ریسکی با این شرایط یافت نشد.
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={headSx}>شماره</TableCell>
                    <TableCell sx={headSx}>عنوان</TableCell>
                    <TableCell sx={headSx}>دسته</TableCell>
                    <TableCell sx={headSx}>نوع</TableCell>
                    <TableCell sx={headSx}>احت.</TableCell>
                    <TableCell sx={headSx}>شدت</TableCell>
                    <TableCell sx={headSx}>امتیاز</TableCell>
                    <TableCell sx={headSx}>سطح</TableCell>
                    <TableCell sx={headSx}>تعهد مورد انتظار</TableCell>
                    <TableCell sx={headSx}>مالک</TableCell>
                    <TableCell sx={headSx}>مهلت</TableCell>
                    <TableCell sx={headSx}>وضعیت</TableCell>
                    <TableCell sx={headSx}>اقدام‌ها</TableCell>
                    <TableCell sx={headSx}>عملیات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visibleRisks.map((risk) => {
                    const statusMeta = RISK_STATUS[risk.status] || RISK_STATUS.open;
                    return (
                      <TableRow key={risk.id} hover sx={{ cursor: 'pointer' }}
                        onClick={() => setDetailId(risk.id)}>
                        <TableCell sx={{ ...numSx, fontWeight: 800 }}>{risk.number}</TableCell>
                        <TableCell sx={{ fontFamily: FONT, fontSize: 12.5, minWidth: 220 }}>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            {risk.overdue ? (
                              <Tooltip title="مهلت پاسخ گذشته است">
                                <WarningAmberIcon sx={{ fontSize: 16, color: '#ef4444' }} />
                              </Tooltip>
                            ) : null}
                            <span>{risk.title}</span>
                          </Stack>
                        </TableCell>
                        <TableCell sx={{ fontFamily: FONT, fontSize: 12 }}>
                          {risk.category_name || '—'}
                        </TableCell>
                        <TableCell sx={{ fontFamily: FONT, fontSize: 12, textAlign: 'center' }}>
                          {TYPE_LABELS[risk.risk_type] || risk.risk_type}
                        </TableCell>
                        <TableCell sx={numSx}>{toPersianDigits(risk.probability)}</TableCell>
                        <TableCell sx={numSx}>{toPersianDigits(risk.worst_impact)}</TableCell>
                        <TableCell sx={{ ...numSx, fontWeight: 800 }}>
                          {toPersianDigits(risk.score)}
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>{levelChip(risk.level)}</TableCell>
                        <TableCell sx={numSx}>{money(risk.expected_cost)}</TableCell>
                        <TableCell sx={{ fontFamily: FONT, fontSize: 12 }}>
                          {risk.owner_full_name || risk.owner_name || '—'}
                        </TableCell>
                        <TableCell sx={numSx}>{risk.due_date_jalali || '—'}</TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Chip size="small" label={statusMeta.label}
                            sx={{ fontWeight: 700, fontSize: 11.5,
                              bgcolor: `${statusMeta.color}22`, color: statusMeta.color }} />
                        </TableCell>
                        <TableCell sx={numSx}>
                          {toPersianDigits(risk.actions_stats?.done || 0)}/
                          {toPersianDigits(risk.actions_stats?.total || 0)}
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Stack direction="row" spacing={0.25} justifyContent="center"
                            onClick={e => e.stopPropagation()}>
                            <Tooltip title="ویرایش">
                              <IconButton size="small" color="primary"
                                onClick={() => openRiskDialog(risk)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="اقدام جدید">
                              <IconButton size="small" color="info"
                                onClick={() => openActionDialog(risk.id)}>
                                <AddIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="حذف">
                              <IconButton size="small" color="error"
                                onClick={() => setDeleteId(risk.id)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {tab === 2 && (
        <Paper sx={{ p: 1.5, borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.7)' }}>
          {actionList.length === 0 ? (
            <Typography variant="body2" color="textSecondary" textAlign="center" py={4}
              sx={{ fontFamily: FONT }}>
              اقدامی ثبت نشده است. از تب رجیستر یا پنجرهٔ جزئیات ریسک، اقدام کاهش اضافه کنید.
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={headSx}>ریسک</TableCell>
                    <TableCell sx={headSx}>عنوان اقدام</TableCell>
                    <TableCell sx={headSx}>مسئول</TableCell>
                    <TableCell sx={headSx}>شروع</TableCell>
                    <TableCell sx={headSx}>سررسید</TableCell>
                    <TableCell sx={headSx}>وضعیت</TableCell>
                    <TableCell sx={headSx}>هزینه</TableCell>
                    <TableCell sx={headSx}>عملیات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {actionList.map((action) => {
                    const meta = ACTION_STATUS[action.status] || ACTION_STATUS.planned;
                    return (
                      <TableRow key={action.id} hover>
                        <TableCell sx={{ ...numSx, fontWeight: 700 }}>{action.risk_number}</TableCell>
                        <TableCell sx={{ fontFamily: FONT, fontSize: 12.5, minWidth: 240 }}>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            {action.overdue ? (
                              <Tooltip title="سررسید گذشته است">
                                <WarningAmberIcon sx={{ fontSize: 16, color: '#ef4444' }} />
                              </Tooltip>
                            ) : null}
                            <span>{action.title}</span>
                          </Stack>
                        </TableCell>
                        <TableCell sx={{ fontFamily: FONT, fontSize: 12 }}>
                          {action.owner_full_name || action.owner_name || '—'}
                        </TableCell>
                        <TableCell sx={numSx}>{action.start_date_jalali || '—'}</TableCell>
                        <TableCell sx={numSx}>{action.due_date_jalali || '—'}</TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Chip size="small" label={meta.label}
                            sx={{ fontWeight: 700, fontSize: 11.5,
                              bgcolor: `${meta.color}22`, color: meta.color }} />
                        </TableCell>
                        <TableCell sx={numSx}>{money(action.cost)}</TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <Stack direction="row" spacing={0.25} justifyContent="center">
                            {action.status === 'planned' ? (
                              <Tooltip title="شروع اجرا">
                                <IconButton size="small" color="info"
                                  onClick={() => actionStatus.mutate({ id: action.id, status: 'in_progress' })}>
                                  <PlayArrowIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            ) : null}
                            {action.status !== 'done' && action.status !== 'cancelled' ? (
                              <Tooltip title="انجام شد">
                                <IconButton size="small" color="success"
                                  onClick={() => actionStatus.mutate({ id: action.id, status: 'done' })}>
                                  <CheckCircleIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            ) : null}
                            {action.status === 'done' || action.status === 'cancelled' ? (
                              <Tooltip title="بازگشایی">
                                <IconButton size="small" color="warning"
                                  onClick={() => actionStatus.mutate({ id: action.id, status: 'in_progress' })}>
                                  <ReplayIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            ) : null}
                            <Tooltip title="ویرایش">
                              <IconButton size="small" color="primary"
                                onClick={() => openActionDialog(action.risk, action)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="حذف">
                              <IconButton size="small" color="error"
                                onClick={() => removeAction.mutate(action.id)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* ------------------------------ دیالوگ ریسک ------------------------------ */}
      <Dialog open={riskOpen} onClose={() => setRiskOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontFamily: FONT, fontWeight: 800 }}>
          {editId ? 'ویرایش ریسک' : 'ثبت ریسک جدید'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={1.5} sx={{ mt: 0 }}>
            <Grid item xs={12} md={3}>
              <TextField size="small" fullWidth label="شمارهٔ ریسک *" value={riskForm.number}
                onChange={e => setRiskForm(p => ({ ...p, number: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField size="small" fullWidth label="عنوان *" value={riskForm.title}
                onChange={e => setRiskForm(p => ({ ...p, title: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl size="small" fullWidth>
                <InputLabel>نوع</InputLabel>
                <Select value={riskForm.risk_type} label="نوع"
                  onChange={e => setRiskForm(p => ({ ...p, risk_type: e.target.value }))}>
                  <MenuItem value="threat">تهدید</MenuItem>
                  <MenuItem value="opportunity">فرصت</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl size="small" fullWidth>
                <InputLabel>دستهٔ ریسک</InputLabel>
                <Select value={riskForm.category} label="دستهٔ ریسک"
                  onChange={e => setRiskForm(p => ({ ...p, category: e.target.value }))}>
                  <MenuItem value="">— بدون دسته —</MenuItem>
                  {categoryList.map(c => (
                    <MenuItem key={c.id} value={c.id}>{c.code} — {c.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl size="small" fullWidth>
                <InputLabel>راهبرد پاسخ</InputLabel>
                <Select value={riskForm.response_strategy} label="راهبرد پاسخ"
                  onChange={e => setRiskForm(p => ({ ...p, response_strategy: e.target.value }))}>
                  {Object.entries(RESPONSE_LABELS).map(([key, label]) => (
                    <MenuItem key={key} value={key}>{label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField size="small" fullWidth type="number" label="احتمال (۱-۵)"
                value={riskForm.probability} inputProps={{ min: 1, max: 5 }}
                onChange={e => setRiskForm(p => ({ ...p, probability: e.target.value }))} />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField size="small" fullWidth type="number" label="اثر مالی (ریال)"
                value={riskForm.cost_impact}
                onChange={e => setRiskForm(p => ({ ...p, cost_impact: e.target.value }))} />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField size="small" fullWidth type="number" label="شدت اثر هزینه (۱-۵)"
                value={riskForm.impact_cost} inputProps={{ min: 1, max: 5 }}
                onChange={e => setRiskForm(p => ({ ...p, impact_cost: e.target.value }))} />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField size="small" fullWidth type="number" label="شدت اثر زمان (۱-۵)"
                value={riskForm.impact_time} inputProps={{ min: 1, max: 5 }}
                onChange={e => setRiskForm(p => ({ ...p, impact_time: e.target.value }))} />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField size="small" fullWidth type="number" label="شدت اثر کیفیت (۱-۵)"
                value={riskForm.impact_quality} inputProps={{ min: 1, max: 5 }}
                onChange={e => setRiskForm(p => ({ ...p, impact_quality: e.target.value }))} />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField size="small" fullWidth type="number" label="شدت اثر HSE (۱-۵)"
                value={riskForm.impact_hse} inputProps={{ min: 1, max: 5 }}
                onChange={e => setRiskForm(p => ({ ...p, impact_hse: e.target.value }))} />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField size="small" fullWidth type="number" label="اثر زمانی (روز)"
                value={riskForm.schedule_impact_days}
                onChange={e => setRiskForm(p => ({ ...p, schedule_impact_days: e.target.value }))} />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField size="small" fullWidth type="number" label="احتمال باقی‌مانده (۰-۵)"
                value={riskForm.residual_probability} inputProps={{ min: 0, max: 5 }}
                onChange={e => setRiskForm(p => ({ ...p, residual_probability: e.target.value }))} />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField size="small" fullWidth type="number" label="شدت باقی‌مانده (۰-۵)"
                value={riskForm.residual_impact} inputProps={{ min: 0, max: 5 }}
                onChange={e => setRiskForm(p => ({ ...p, residual_impact: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField size="small" fullWidth label="مالک ریسک" value={riskForm.owner_name}
                onChange={e => setRiskForm(p => ({ ...p, owner_name: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField size="small" fullWidth label="شناسایی‌کننده" value={riskForm.identified_by_name}
                onChange={e => setRiskForm(p => ({ ...p, identified_by_name: e.target.value }))} />
            </Grid>
            <Grid item xs={6} md={3}>
              <JalaliDatePicker fullWidth label="تاریخ شناسایی" value={riskForm.identified_date}
                onChange={(g) => setRiskForm(p => ({ ...p, identified_date: g }))} />
            </Grid>
            <Grid item xs={6} md={3}>
              <JalaliDatePicker fullWidth label="مهلت پاسخ" value={riskForm.due_date}
                onChange={(g) => setRiskForm(p => ({ ...p, due_date: g }))} />
            </Grid>
            <Grid item xs={6} md={3}>
              <JalaliDatePicker fullWidth label="بازنگری بعدی" value={riskForm.review_date}
                onChange={(g) => setRiskForm(p => ({ ...p, review_date: g }))} />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField size="small" fullWidth label="نشانهٔ وقوع (Trigger)" value={riskForm.trigger}
                onChange={e => setRiskForm(p => ({ ...p, trigger: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField size="small" fullWidth multiline minRows={2} label="شرح ریسک"
                value={riskForm.description}
                onChange={e => setRiskForm(p => ({ ...p, description: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField size="small" fullWidth multiline minRows={2} label="علت ریشه‌ای"
                value={riskForm.root_cause}
                onChange={e => setRiskForm(p => ({ ...p, root_cause: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField size="small" fullWidth multiline minRows={2} label="برنامهٔ کاهش/پاسخ"
                value={riskForm.mitigation_plan}
                onChange={e => setRiskForm(p => ({ ...p, mitigation_plan: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField size="small" fullWidth multiline minRows={2} label="برنامهٔ واکنش اضطراری"
                value={riskForm.contingency_plan}
                onChange={e => setRiskForm(p => ({ ...p, contingency_plan: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField size="small" fullWidth multiline minRows={2} label="یادداشت"
                value={riskForm.note}
                onChange={e => setRiskForm(p => ({ ...p, note: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRiskOpen(false)}>انصراف</Button>
          <Button variant="contained" onClick={submitRisk} disabled={saveRisk.isPending}>
            {editId ? 'ذخیره تغییرات' : 'ثبت ریسک'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* --------------------------- جزئیات ریسک --------------------------- */}
      <Dialog open={!!detailRisk} onClose={() => setDetailId(null)} maxWidth="md" fullWidth>
        {detailRisk ? (
          <>
            <DialogTitle sx={{ fontFamily: FONT, fontWeight: 800 }}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <span>{detailRisk.number} — {detailRisk.title}</span>
                {levelChip(detailRisk.level)}
                <Chip size="small" label={(RISK_STATUS[detailRisk.status] || {}).label}
                  sx={{ fontWeight: 700, bgcolor: '#f1f5f9' }} />
                {detailRisk.overdue ? (
                  <Chip size="small" color="error" label="مهلت گذشته" sx={{ fontWeight: 700 }} />
                ) : null}
              </Stack>
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={1.5}>
                {[
                  ['دسته', detailRisk.category_name || '—'],
                  ['نوع', TYPE_LABELS[detailRisk.risk_type] || '—'],
                  ['راهبرد پاسخ', RESPONSE_LABELS[detailRisk.response_strategy] || '—'],
                  ['مالک', detailRisk.owner_full_name || detailRisk.owner_name || '—'],
                  ['شناسایی‌کننده', detailRisk.identified_by_name || '—'],
                  ['تاریخ شناسایی', detailRisk.identified_date_jalali || '—'],
                  ['مهلت پاسخ', detailRisk.due_date_jalali || '—'],
                  ['بازنگری بعدی', detailRisk.review_date_jalali || '—'],
                  ['احتمال', toPersianDigits(detailRisk.probability)],
                  ['بیشترین شدت اثر', toPersianDigits(detailRisk.worst_impact)],
                  ['امتیاز ریسک', toPersianDigits(detailRisk.score)],
                  ['امتیاز باقی‌مانده', toPersianDigits(detailRisk.residual_score)],
                  ['اثر مالی', money(detailRisk.cost_impact)],
                  ['تعهد مورد انتظار (EMV)', money(detailRisk.expected_cost)],
                  ['باقی‌مانده پس از کاهش', money(detailRisk.residual_cost)],
                  ['کاهش امتیاز', `${toPersianDigits(detailRisk.score_reduction)}٪`],
                  ['اثر زمانی', `${toPersianDigits(detailRisk.schedule_impact_days)} روز`],
                  ['نشانهٔ وقوع', detailRisk.trigger || '—'],
                ].map(([label, value]) => (
                  <Grid item xs={6} md={3} key={label}>
                    <Typography sx={{ fontFamily: FONT, fontSize: 11.5, color: '#94a3b8' }}>
                      {label}
                    </Typography>
                    <Typography sx={{ fontFamily: FONT, fontSize: 13, fontWeight: 700 }}>
                      {value}
                    </Typography>
                  </Grid>
                ))}
                <Grid item xs={12} md={6}>
                  <Typography sx={{ fontFamily: FONT, fontSize: 11.5, color: '#94a3b8' }}>
                    شرح ریسک
                  </Typography>
                  <Typography sx={{ fontFamily: FONT, fontSize: 12.5 }}>
                    {detailRisk.description || '—'}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography sx={{ fontFamily: FONT, fontSize: 11.5, color: '#94a3b8' }}>
                    علت ریشه‌ای
                  </Typography>
                  <Typography sx={{ fontFamily: FONT, fontSize: 12.5 }}>
                    {detailRisk.root_cause || '—'}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography sx={{ fontFamily: FONT, fontSize: 11.5, color: '#94a3b8' }}>
                    برنامهٔ کاهش/پاسخ
                  </Typography>
                  <Typography sx={{ fontFamily: FONT, fontSize: 12.5 }}>
                    {detailRisk.mitigation_plan || '—'}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography sx={{ fontFamily: FONT, fontSize: 11.5, color: '#94a3b8' }}>
                    برنامهٔ واکنش اضطراری
                  </Typography>
                  <Typography sx={{ fontFamily: FONT, fontSize: 12.5 }}>
                    {detailRisk.contingency_plan || '—'}
                  </Typography>
                </Grid>
              </Grid>
              <Divider sx={{ my: 1.5 }} />
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Typography sx={{ fontFamily: FONT, fontSize: 12.5, fontWeight: 800 }}>
                  گردش کار:
                </Typography>
                {(detailRisk.next_statuses || []).filter(s => s !== 'closed').map((status) => (
                  <Button key={status} size="small" variant="outlined"
                    onClick={() => { setNoteDialog({ risk: detailRisk, target: status }); setNoteText(''); }}
                    sx={{ borderRadius: '10px', fontFamily: FONT, fontWeight: 700 }}>
                    {(RISK_STATUS[status] || {}).label || status}
                  </Button>
                ))}
                {detailRisk.status !== 'closed' ? (
                  <Button size="small" color="success" variant="contained"
                    onClick={() => { setNoteDialog({ risk: detailRisk, target: 'closed' }); setNoteText(''); }}
                    sx={{ borderRadius: '10px', fontFamily: FONT, fontWeight: 700 }}>
                    بستن ریسک
                  </Button>
                ) : (
                  <Button size="small" color="warning" variant="contained" startIcon={<ReplayIcon />}
                    onClick={() => reopenRisk.mutate({ id: detailRisk.id, note: '' })}
                    sx={{ borderRadius: '10px', fontFamily: FONT, fontWeight: 700 }}>
                    بازگشایی
                  </Button>
                )}
                <Button size="small" variant="outlined" startIcon={<HistoryIcon />}
                  onClick={() => {
                    setReviewForm({
                      ...emptyReview(),
                      probability: detailRisk.probability,
                      impact: detailRisk.impact_cost,
                      residual_probability: detailRisk.residual_probability,
                      residual_impact: detailRisk.residual_impact,
                      next_review_date: detailRisk.review_date || '',
                    });
                    setReviewOpen(true);
                  }}
                  sx={{ borderRadius: '10px', fontFamily: FONT, fontWeight: 700 }}>
                  ثبت بازنگری
                </Button>
              </Stack>
              <Divider sx={{ my: 1.5 }} />
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
                <Typography sx={{ fontFamily: FONT, fontSize: 12.5, fontWeight: 800 }}>
                  اقدام‌های کاهش ({(detailRisk.actions || []).length})
                </Typography>
                <Button size="small" startIcon={<AddIcon />}
                  onClick={() => openActionDialog(detailRisk.id)}
                  sx={{ fontFamily: FONT, fontWeight: 700 }}>
                  اقدام جدید
                </Button>
              </Stack>
              <Stack spacing={0.75}>
                {(detailRisk.actions || []).length === 0 ? (
                  <Typography sx={{ fontFamily: FONT, fontSize: 12, color: '#94a3b8' }}>
                    اقدامی برای این ریسک ثبت نشده است.
                  </Typography>
                ) : (detailRisk.actions || []).map((action) => {
                  const meta = ACTION_STATUS[action.status] || ACTION_STATUS.planned;
                  return (
                    <Stack key={action.id} direction="row" spacing={1} alignItems="center"
                      sx={{ p: 0.75, borderRadius: '10px', bgcolor: 'rgba(248,250,252,0.9)' }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontFamily: FONT, fontSize: 12.5, fontWeight: 700 }}>
                          {action.title}
                        </Typography>
                        <Typography sx={{ fontFamily: FONT, fontSize: 11, color: '#94a3b8' }}>
                          {action.owner_name || action.owner_full_name || '—'}
                          {' — سررسید: '}{action.due_date_jalali || '—'}
                          {' — هزینه: '}{money(action.cost)}
                        </Typography>
                      </Box>
                      <Chip size="small" label={meta.label}
                        sx={{ fontWeight: 700, fontSize: 11, bgcolor: `${meta.color}22`, color: meta.color }} />
                      {action.status !== 'done' ? (
                        <Tooltip title="انجام شد">
                          <IconButton size="small" color="success"
                            onClick={() => actionStatus.mutate({ id: action.id, status: 'done' })}>
                            <CheckCircleIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Tooltip title="بازگشایی">
                          <IconButton size="small" color="warning"
                            onClick={() => actionStatus.mutate({ id: action.id, status: 'in_progress' })}>
                            <ReplayIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <IconButton size="small" color="primary"
                        onClick={() => openActionDialog(detailRisk.id, action)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error"
                        onClick={() => removeAction.mutate(action.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  );
                })}
              </Stack>

              <Divider sx={{ my: 1.5 }} />
              <Typography sx={{ fontFamily: FONT, fontSize: 12.5, fontWeight: 800, mb: 0.5 }}>
                تاریخچهٔ بازنگری ({(detailRisk.reviews || []).length})
              </Typography>
              <Stack spacing={0.5}>
                {(detailRisk.reviews || []).length === 0 ? (
                  <Typography sx={{ fontFamily: FONT, fontSize: 12, color: '#94a3b8' }}>
                    بازنگری ثبت نشده است.
                  </Typography>
                ) : (detailRisk.reviews || []).map((review) => (
                  <Stack key={review.id} direction="row" spacing={1} alignItems="center">
                    <Chip size="small" icon={<HistoryIcon sx={{ fontSize: 14 }} />}
                      label={review.date_jalali || '—'} sx={{ fontFamily: FONT, fontWeight: 700 }} />
                    <Typography sx={{ fontFamily: FONT, fontSize: 12 }}>
                      امتیاز {toPersianDigits(review.score)} (باقی‌مانده {toPersianDigits(review.residual_score)}) —
                      {' '}{review.reviewer_name || 'سیستم'} — {review.note || 'بدون یادداشت'}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button color="error" startIcon={<DeleteIcon />}
                onClick={() => setDeleteId(detailRisk.id)}>حذف</Button>
              <Box sx={{ flex: 1 }} />
              <Button startIcon={<EditIcon />}
                onClick={() => { setDetailId(null); openRiskDialog(detailRisk); }}>
                ویرایش
              </Button>
              <Button onClick={() => setDetailId(null)}>بستن</Button>
            </DialogActions>
          </>
        ) : null}
      </Dialog>

      {/* ------------------------------ دیالوگ اقدام ------------------------------ */}
      <Dialog open={actionOpen} onClose={() => setActionOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontFamily: FONT, fontWeight: 800 }}>
          {actionEditId ? 'ویرایش اقدام کاهش' : 'اقدام کاهش جدید'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={1.5} sx={{ mt: 0 }}>
            <Grid item xs={12}>
              <TextField size="small" fullWidth label="عنوان اقدام *" value={actionForm.title}
                onChange={e => setActionForm(p => ({ ...p, title: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField size="small" fullWidth label="مسئول" value={actionForm.owner_name}
                onChange={e => setActionForm(p => ({ ...p, owner_name: e.target.value }))} />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField size="small" fullWidth type="number" label="هزینهٔ اقدام" value={actionForm.cost}
                onChange={e => setActionForm(p => ({ ...p, cost: e.target.value }))} />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField size="small" fullWidth type="number" label="ترتیب" value={actionForm.sort_order}
                onChange={e => setActionForm(p => ({ ...p, sort_order: e.target.value }))} />
            </Grid>
            <Grid item xs={6} md={6}>
              <JalaliDatePicker fullWidth label="تاریخ شروع" value={actionForm.start_date}
                onChange={(g) => setActionForm(p => ({ ...p, start_date: g }))} />
            </Grid>
            <Grid item xs={6} md={6}>
              <JalaliDatePicker fullWidth label="سررسید" value={actionForm.due_date}
                onChange={(g) => setActionForm(p => ({ ...p, due_date: g }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField size="small" fullWidth multiline minRows={2} label="توضیحات"
                value={actionForm.description}
                onChange={e => setActionForm(p => ({ ...p, description: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionOpen(false)}>انصراف</Button>
          <Button variant="contained" onClick={submitAction} disabled={saveAction.isPending}>
            {actionEditId ? 'ذخیره تغییرات' : 'ثبت اقدام'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ----------------------------- دیالوگ بازنگری ----------------------------- */}
      <Dialog open={reviewOpen} onClose={() => setReviewOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontFamily: FONT, fontWeight: 800 }}>ثبت بازنگری ریسک</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={1.5} sx={{ mt: 0 }}>
            <Grid item xs={12} md={6}>
              <JalaliDatePicker fullWidth label="تاریخ بازنگری" value={reviewForm.date}
                onChange={(g) => setReviewForm(p => ({ ...p, date: g }))} />
            </Grid>
            <Grid item xs={12} md={6}>
              <JalaliDatePicker fullWidth label="بازنگری بعدی" value={reviewForm.next_review_date}
                onChange={(g) => setReviewForm(p => ({ ...p, next_review_date: g }))} />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField size="small" fullWidth type="number" label="احتمال جدید" value={reviewForm.probability}
                inputProps={{ min: 1, max: 5 }}
                onChange={e => setReviewForm(p => ({ ...p, probability: e.target.value }))} />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField size="small" fullWidth type="number" label="شدت جدید" value={reviewForm.impact}
                inputProps={{ min: 1, max: 5 }}
                onChange={e => setReviewForm(p => ({ ...p, impact: e.target.value }))} />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField size="small" fullWidth type="number" label="احتمال باقی‌مانده"
                value={reviewForm.residual_probability} inputProps={{ min: 0, max: 5 }}
                onChange={e => setReviewForm(p => ({ ...p, residual_probability: e.target.value }))} />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField size="small" fullWidth type="number" label="شدت باقی‌مانده"
                value={reviewForm.residual_impact} inputProps={{ min: 0, max: 5 }}
                onChange={e => setReviewForm(p => ({ ...p, residual_impact: e.target.value }))} />
            </Grid>
            <Grid item xs={12}>
              <TextField size="small" fullWidth multiline minRows={2} label="یادداشت بازنگری"
                value={reviewForm.note}
                onChange={e => setReviewForm(p => ({ ...p, note: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewOpen(false)}>انصراف</Button>
          <Button variant="contained" onClick={submitReview} disabled={addReview.isPending}>
            ثبت بازنگری
          </Button>
        </DialogActions>
      </Dialog>
      {/* ------------------------ دیالوگ یادداشت تغییر وضعیت ------------------------ */}
      <Dialog open={!!noteDialog} onClose={() => setNoteDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontFamily: FONT, fontWeight: 800 }}>
          تغییر وضعیت به «{(RISK_STATUS[noteDialog?.target] || {}).label || noteDialog?.target}»
        </DialogTitle>
        <DialogContent dividers>
          <TextField size="small" fullWidth multiline minRows={2} label="یادداشت (اختیاری)"
            value={noteText} onChange={e => setNoteText(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNoteDialog(null)}>انصراف</Button>
          <Button variant="contained"
            onClick={() => riskStatus.mutate({
              id: noteDialog?.risk?.id, status: noteDialog?.target, note: noteText,
            })}>
            ثبت
          </Button>
        </DialogActions>
      </Dialog>

      {/* ------------------------------ حذف ریسک ------------------------------ */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontFamily: FONT, fontWeight: 800 }}>حذف ریسک</DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ fontFamily: FONT, fontSize: 13 }}>
            آیا از حذف این ریسک و همهٔ اقدام‌ها/بازنگری‌های آن اطمینان دارید؟ این عملیات قابل بازگشت نیست.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>انصراف</Button>
          <Button color="error" variant="contained" onClick={() => deleteId && removeRisk.mutate(deleteId)}>
            حذف
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProjectRiskPage;
