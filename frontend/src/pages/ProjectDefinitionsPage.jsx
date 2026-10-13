import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Alert, Autocomplete, Box, Avatar, Button, Chip, CircularProgress, Dialog,
  DialogActions, DialogContent, DialogTitle, Divider, FormControl,
  FormControlLabel, Grid, IconButton, InputLabel, MenuItem, Paper, Select,
  Stack, Switch, Tab, Tabs, TextField, Tooltip, Typography,
} from '@mui/material';
import CategoryIcon from '@mui/icons-material/Category';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ScienceIcon from '@mui/icons-material/Science';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import { formatPersianNumber } from '../core/utils/numberUtils';
import { PageHeader, glassPaper } from './projects/ProjectsShared';

const API = '/projects/project-account-definitions/';
const AUX_API = '/projects/project-auxiliaries/';
const COLOR = '#6d28d9';

const listOf = (data) => (Array.isArray(data) ? data : data?.results || []);

const KIND_COLORS = {
  expense: '#ef4444', material: '#f59e0b', labor: '#8b5cf6', machinery: '#0ea5e9',
  transport: '#14b8a6', overhead: '#64748b', revenue: '#10b981', advance: '#6366f1',
  retention: '#f97316', insurance: '#0891b2', tax: '#dc2626', guarantee: '#7c3aed',
  petty_cash: '#eab308', payroll: '#db2777', other: '#94a3b8',
};

const labelOfCode = (row) => (row ? `${row.code}${row.name ? ` - ${row.name}` : ''}` : '');

/* --------------------------------------------------------------- انتخاب‌گر کد */
const CodePicker = ({ label, options, value, onChange, loading, disabled, helper }) => {
  const selected = useMemo(
    () => (options || []).find((row) => row.id === value) || null,
    [options, value],
  );
  return (
    <Autocomplete
      size="small" fullWidth disabled={disabled || loading}
      options={options || []}
      value={selected}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      onChange={(e, next) => onChange(next ? next.id : null)}
      getOptionLabel={(row) => labelOfCode(row)}
      renderInput={(params) => (
        <TextField {...params} label={label} helperText={helper}
          InputProps={{ ...params.InputProps, endAdornment: (
            <>
              {loading ? <CircularProgress size={16} /> : null}
              {params.InputProps.endAdornment}
            </>
          ) }} />
      )}
    />
  );
};

/* ------------------------------------------------------------ پیش‌نمایش کدینگ */
const CodingPreview = ({ coding }) => {
  if (!coding) return null;
  const rows = [
    ['حساب کل', coding.general_account],
    ['حساب معین', coding.subsidiary_account],
    ['تفصیل یک', coding.auxiliary_1],
    ['تفصیل دو', coding.auxiliary_2],
    ['تفصیل سه', coding.auxiliary_3],
    ['مرکز هزینه', coding.cost_center],
  ];
  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: '12px', background: 'rgba(109,40,217,0.04)' }}>
      <Stack direction="row" alignItems="center" gap={1} mb={1}>
        <ScienceIcon sx={{ color: COLOR, fontSize: 18 }} />
        <Typography variant="subtitle2" fontWeight={800} color={COLOR}>نتیجهٔ آزمایش نگاشت</Typography>
        <Chip size="small" color={coding.ready ? 'success' : 'warning'} sx={{ fontWeight: 700 }}
          label={coding.ready ? 'آمادهٔ ثبت' : 'نیازمند تکمیل'} />
        {coding.created_auxiliaries?.length ? (
          <Chip size="small" variant="outlined" color="info"
            label={`${formatPersianNumber(coding.created_auxiliaries.length)} تفصیل ساخته می‌شود`} />
        ) : null}
      </Stack>
      <Grid container spacing={1}>
        {rows.map(([label, row]) => (
          <Grid item xs={12} sm={6} md={4} key={label}>
            <Typography variant="caption" color="textSecondary" display="block">{label}</Typography>
            <Typography variant="body2" fontWeight={700}
              sx={{ color: row ? '#0f172a' : '#cbd5e1' }}>
              {row ? labelOfCode(row) : '—'}
            </Typography>
          </Grid>
        ))}
      </Grid>
      {coding.preview ? (
        <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
          {coding.preview}
        </Typography>
      ) : null}
      {(coding.warnings || []).map((warning) => (
        <Alert key={warning} severity="warning" sx={{ mt: 1, py: 0, borderRadius: '10px' }}>
          <Typography variant="caption">{warning}</Typography>
        </Alert>
      ))}
    </Paper>
  );
};

/* ------------------------------------------------------------- فرم تعریف */
const DefinitionDialog = ({ open, onClose, scope, projectTypeId, projectId, definition, meta, defaultKind = 'expense' }) => {
  const qc = useQueryClient();
  const [form, setForm] = useState(emptyForm());
  const [preview, setPreview] = useState(null);
  const [previewProject, setPreviewProject] = useState('');
  const [previewParty, setPreviewParty] = useState('');
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (!open) return;
    setForm(definition ? toForm(definition) : { ...emptyForm(), kind: defaultKind });
    setPreview(null);
    setError('');
    setPreviewParty('');
    setPreviewProject(projectId ? String(projectId) : '');
  }, [open, definition, projectId, defaultKind]);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const lookups = useLookups(open, form.general_account);
  const sources = meta?.sources || [];
  const kinds = meta?.kinds || [];

  const runPreview = useMutation({
    mutationFn: () => axiosInstance.post(`${API}preview/`, {
      project: previewProject,
      definition: form.id || undefined,
      code: form.id ? undefined : form.code,
      party: previewParty || undefined,
      create: false,
    }).then((r) => r.data),
    onSuccess: (data) => setPreview(data),
    onError: (e) => setError(e?.response?.data?.detail || 'آزمایش نگاشت ناموفق بود.'),
  });

  const save = useMutation({
    mutationFn: (payload) => (payload.id
      ? axiosInstance.patch(`${API}${payload.id}/`, payload)
      : axiosInstance.post(API, payload)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-account-definitions'] });
      onClose(true);
    },
    onError: (e) => {
      const data = e?.response?.data;
      const first = data && typeof data === 'object' ? Object.values(data).flat().join(' | ') : null;
      setError(first || 'ذخیره ناموفق بود.');
    },
  });

  const submit = () => {
    setError('');
    if (!form.code.trim() || !form.title.trim()) {
      setError('کد و عنوان تعریف الزامی است.');
      return;
    }
    const body = {
      code: form.code.trim(), title: form.title.trim(), kind: form.kind,
      description: form.description,
      general_account: form.general_account || null,
      subsidiary_account: form.subsidiary_account || null,
      cost_center: form.cost_center || null,
      auto_create_auxiliaries: form.auto_create_auxiliaries,
      sort_order: Number(form.sort_order) || 0,
      auxiliary_rules: form.auxiliary_rules
        .filter((rule) => rule.source !== 'none')
        .map((rule) => ({
          slot: rule.slot, source: rule.source, category: rule.category || null,
          auxiliary: rule.source === 'fixed' ? (rule.auxiliary || null) : null,
          auto_create: rule.auto_create,
        })),
    };
    if (scope === 'project' && projectId) body.project = projectId;
    if (scope === 'project_type' && projectTypeId) body.project_type = projectTypeId;
    // scope === 'all' → بدون حوزه: تعریف عمومی برای همهٔ پروژه‌ها
    if (form.id) body.id = form.id;
    save.mutate(body);
  };

  return (
    <Dialog open={open} onClose={() => onClose(false)} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, color: COLOR }}>
        {form.id ? 'ویرایش تعریف نگاشت' : 'تعریف نگاشت جدید'}
        <Typography variant="caption" color="textSecondary" sx={{ ml: 1 }}>
          {scope === 'all' ? 'حوزه: همهٔ پروژه‌ها (عمومی)'
            : scope === 'project' ? 'حوزه: پروژهٔ خاص' : 'حوزه: نوع پروژه (الگو)'}
        </Typography>
      </DialogTitle>
      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {error ? <Alert severity="error" sx={{ borderRadius: '12px' }}>{error}</Alert> : null}

        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={3}>
            <TextField size="small" fullWidth label="کد تعریف" value={form.code}
              onChange={(e) => set('code', e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={5}>
            <TextField size="small" fullWidth label="عنوان" value={form.title}
              onChange={(e) => set('title', e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl size="small" fullWidth>
              <InputLabel>نوع آیتم</InputLabel>
              <Select value={form.kind} label="نوع آیتم"
                onChange={(e) => set('kind', e.target.value)}>
                {kinds.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <CodePicker label="حساب کل" options={lookups.generalAccounts}
              value={form.general_account}
              onChange={(value) => { set('general_account', value); set('subsidiary_account', null); }} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <CodePicker label="حساب معین" options={lookups.subsidiaryAccounts}
              loading={lookups.loadingSubsidiary} value={form.subsidiary_account}
              onChange={(value) => set('subsidiary_account', value)}
              helper={form.general_account ? 'فقط معین‌های زیرمجموعهٔ کل انتخابی' : 'همهٔ معین‌ها'} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <CodePicker label="مرکز هزینه (اختیاری)" options={lookups.costCenters}
              value={form.cost_center} onChange={(value) => set('cost_center', value)} />
          </Grid>
          <Grid item xs={12} sm={8}>
            <TextField size="small" fullWidth multiline rows={1} label="توضیحات"
              value={form.description} onChange={(e) => set('description', e.target.value)} />
          </Grid>
          <Grid item xs={6} sm={2}>
            <TextField size="small" fullWidth type="number" label="ترتیب" value={form.sort_order}
              onChange={(e) => set('sort_order', e.target.value)} />
          </Grid>
          <Grid item xs={6} sm={2}>
            <FormControlLabel control={(
              <Switch size="small" checked={form.auto_create_auxiliaries}
                onChange={(e) => set('auto_create_auxiliaries', e.target.checked)} />
            )} label={<Typography variant="caption">ساخت تفصیل‌ها</Typography>} />
          </Grid>
        </Grid>

        <Divider textAlign="right">
          <Typography variant="caption" fontWeight={800} color={COLOR}>تفصیل‌ها (تفصیل یک تا سه)</Typography>
        </Divider>
        <Stack spacing={1}>
          {form.auxiliary_rules.map((rule, index) => (
            <RuleRow key={rule.slot} rule={rule} index={index} sources={sources}
              categories={lookups.categories} auxiliaries={lookups.auxiliaries}
              onChange={(next) => set('auxiliary_rules',
                form.auxiliary_rules.map((item) => (item.slot === next.slot ? next : item)))} />
          ))}
        </Stack>

        <Divider textAlign="right">
          <Typography variant="caption" fontWeight={800} color={COLOR}>آزمایش نگاشت</Typography>
        </Divider>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>پروژهٔ آزمایشی</InputLabel>
            <Select value={previewProject} label="پروژهٔ آزمایشی"
              onChange={(e) => setPreviewProject(e.target.value)}>
              {lookups.projects.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>طرف حساب (اختیاری)</InputLabel>
            <Select value={previewParty} label="طرف حساب (اختیاری)"
              onChange={(e) => setPreviewParty(e.target.value)}>
              <MenuItem value="">—</MenuItem>
              {lookups.parties.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
            </Select>
          </FormControl>
          <Button variant="outlined" startIcon={<ScienceIcon />} disabled={!previewProject}
            onClick={() => runPreview.mutate()} sx={{ borderRadius: '12px' }}>
            آزمایش نگاشت
          </Button>
        </Stack>
        <CodingPreview coding={preview} />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose(false)}>انصراف</Button>
        <Button variant="contained" onClick={submit} disabled={save.isLoading}
          sx={{ background: `linear-gradient(135deg,${COLOR},#8b5cf6)`, borderRadius: '12px' }}>
          {form.id ? 'ذخیره تغییرات' : 'ثبت تعریف'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const RuleRow = ({ rule, index, sources, categories, auxiliaries, onChange }) => {
  const category = (categories || []).find((item) => item.id === rule.category) || null;
  const needsFixed = rule.source === 'fixed'
    || (rule.source === 'auto' && category && category.source === 'manual');
  return (
    <Paper variant="outlined" sx={{ p: 1.25, borderRadius: '12px', background: 'rgba(255,255,255,0.6)' }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25} alignItems="center">
        <Chip size="small" label={`تفصیل ${['یک', 'دو', 'سه'][index]}`}
          sx={{ fontWeight: 800, bgcolor: 'rgba(109,40,217,0.12)', color: COLOR, minWidth: 74 }} />
        <Box sx={{ minWidth: 220, flex: 1 }}>
          <CodePicker label="دستهٔ تفصیلی" options={categories}
            value={rule.category} onChange={(value) => onChange({ ...rule, category: value })}
            helper={category
              ? `نوع دسته: ${category.source_display || category.source}`
              : 'مثلاً پروژه، قراردادها، ریز هزینه‌ها'} />
        </Box>
        <FormControl size="small" sx={{ minWidth: 190 }}>
          <InputLabel>نحوهٔ خواندن</InputLabel>
          <Select value={rule.source} label="نحوهٔ خواندن"
            onChange={(e) => onChange({ ...rule, source: e.target.value })}>
            {sources.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}
          </Select>
        </FormControl>
        {needsFixed ? (
          <Box sx={{ minWidth: 200, flex: 1 }}>
            <CodePicker label="تفصیل ثابت" options={auxiliaries} value={rule.auxiliary}
              onChange={(value) => onChange({ ...rule, auxiliary: value })} />
          </Box>
        ) : null}
        <FormControlLabel sx={{ m: 0 }} control={(
          <Switch size="small" checked={rule.auto_create}
            onChange={(e) => onChange({ ...rule, auto_create: e.target.checked })} />
        )} label={<Typography variant="caption">ساخت خودکار</Typography>} />
      </Stack>
    </Paper>
  );
};

const emptyRule = (slot) => ({ slot, source: 'auto', category: null, auxiliary: null, auto_create: true });

const emptyForm = () => ({
  id: null, code: '', title: '', kind: 'expense', description: '',
  general_account: null, subsidiary_account: null, cost_center: null,
  auto_create_auxiliaries: true, sort_order: 0,
  auxiliary_rules: [emptyRule(1), emptyRule(2), emptyRule(3)],
});

const toForm = (row) => ({
  id: row.id, code: row.code, title: row.title, kind: row.kind,
  description: row.description || '',
  general_account: row.general_account || null,
  subsidiary_account: row.subsidiary_account || null,
  cost_center: row.cost_center || null,
  auto_create_auxiliaries: row.auto_create_auxiliaries !== false,
  sort_order: row.sort_order || 0,
  auxiliary_rules: [1, 2, 3].map((slot) => {
    const rule = (row.auxiliary_rules || []).find((item) => item.slot === slot);
    return rule ? {
      slot, source: rule.source || 'auto', category: rule.category || null,
      auxiliary: rule.auxiliary || null, auto_create: rule.auto_create !== false,
    } : emptyRule(slot);
  }),
});

const SCOPES = [
  { value: 'all', label: 'همهٔ پروژه‌ها (عمومی)' },
  { value: 'project_type', label: 'نوع پروژه (الگو)' },
  { value: 'project', label: 'پروژهٔ خاص (جایگزین)' },
];

const useLookups = (enabled, generalAccount) => {
  const { data: generalData } = useQuery({
    queryKey: ['def-general-accounts'],
    queryFn: () => axiosInstance.get('/accounting/accounts/', { params: { kind: 'general' } }).then((r) => r.data),
    enabled,
  });
  const { data: subsidiaryData, isFetching: loadingSubsidiary } = useQuery({
    queryKey: ['def-subsidiary-accounts', generalAccount],
    queryFn: () => axiosInstance.get('/accounting/accounts/', {
      params: { kind: 'subsidiary', ...(generalAccount ? { parent: generalAccount } : {}) },
    }).then((r) => r.data),
    enabled,
  });
  const { data: costCenterData } = useQuery({
    queryKey: ['def-cost-centers'],
    queryFn: () => axiosInstance.get('/accounting/cost-centers/', { params: { page_size: 500 } }).then((r) => r.data),
    enabled,
  });
  const { data: categoryData } = useQuery({
    queryKey: ['def-aux-categories'],
    queryFn: () => axiosInstance.get('/accounting/auxiliary-categories/', { params: { page_size: 500 } }).then((r) => r.data),
    enabled,
  });
  const { data: auxiliaryData } = useQuery({
    queryKey: ['def-auxiliaries'],
    queryFn: () => axiosInstance.get('/accounting/auxiliary-accounts/', { params: { page_size: 1000 } }).then((r) => r.data),
    enabled,
  });
  const { data: projectData } = useQuery({
    queryKey: ['def-projects'],
    queryFn: () => axiosInstance.get('/projects/', { params: { page_size: 500 } }).then((r) => r.data),
    enabled,
  });
  const { data: partyData } = useQuery({
    queryKey: ['def-parties'],
    queryFn: () => axiosInstance.get('/contracts/contract-parties/', { params: { page_size: 500 } }).then((r) => r.data),
    enabled,
  });
  return {
    generalAccounts: listOf(generalData),
    subsidiaryAccounts: listOf(subsidiaryData),
    loadingSubsidiary,
    costCenters: listOf(costCenterData),
    categories: listOf(categoryData),
    auxiliaries: listOf(auxiliaryData),
    projects: listOf(projectData),
    parties: listOf(partyData),
  };
};

/* ------------------------------------------------------- قالب پیشنهادی */
const TemplateDialog = ({ open, onClose, scope, projectTypeId, projectId }) => {
  const qc = useQueryClient();
  const [selected, setSelected] = useState([]);
  const { data, isLoading } = useQuery({
    queryKey: ['def-suggested'],
    queryFn: () => axiosInstance.get(`${API}suggested/`).then((r) => r.data),
    enabled: open,
  });
  const rows = listOf(data);

  const apply = useMutation({
    mutationFn: () => axiosInstance.post(`${API}apply-template/`, {
      ...(scope === 'project' ? { project: projectId } : { project_type: projectTypeId }),
      rows: rows.filter((row) => selected.includes(row.code)).map((row) => ({
        code: row.code, title: row.title, kind: row.kind, description: row.description,
      })),
    }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-account-definitions'] });
      onClose(true);
    },
  });

  return (
    <Dialog open={open} onClose={() => onClose(false)} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, color: COLOR }}>قالب پیشنهادی تعاریف</DialogTitle>
      <DialogContent dividers>
        <Typography variant="caption" color="textSecondary">
          ردیف‌های دلخواه را انتخاب کنید؛ پس از ساخت، حساب کل/معین و تفصیل‌ها را در فرم هر تعریف تعیین کنید.
        </Typography>
        {isLoading ? <Box textAlign="center" py={3}><CircularProgress size={22} /></Box> : (
          <Stack spacing={0.75} sx={{ mt: 1.5 }}>
            {rows.map((row) => (
              <Paper key={row.code} variant="outlined" sx={{ p: 1, borderRadius: '10px', display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip size="small" label={row.code} sx={{ fontWeight: 800 }} />
                <Typography variant="body2" sx={{ flex: 1 }}>{row.title}</Typography>
                {row.already_exists ? <Chip size="small" color="default" label="موجود" /> : (
                  <Switch size="small" checked={selected.includes(row.code)}
                    onChange={(e) => setSelected((prev) => (e.target.checked
                      ? [...prev, row.code] : prev.filter((code) => code !== row.code)))} />
                )}
              </Paper>
            ))}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose(false)}>انصراف</Button>
        <Button variant="contained" disabled={!selected.length || apply.isLoading}
          onClick={() => apply.mutate()} sx={{ background: `linear-gradient(135deg,${COLOR},#8b5cf6)` }}>
          افزودن موارد انتخابی
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/* --------------------------------------------------- تب نگاشت حساب‌ها */
const DefinitionsTab = ({ meta }) => {
  const qc = useQueryClient();
  const [scope, setScope] = useState('all');
  const [projectTypeId, setProjectTypeId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [kindFilter, setKindFilter] = useState('expense');
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [templateOpen, setTemplateOpen] = useState(false);

  const { data: typeData } = useQuery({
    queryKey: ['def-project-types'],
    queryFn: () => axiosInstance.get('/projects/project-types/', { params: { page_size: 500 } }).then((r) => r.data),
  });
  const projectTypes = listOf(typeData);
  const { data: projectData } = useQuery({
    queryKey: ['def-projects'],
    queryFn: () => axiosInstance.get('/projects/', { params: { page_size: 500 } }).then((r) => r.data),
  });
  const projects = listOf(projectData);

  // «همهٔ پروژهها» نیاز به انتخاب ندارد؛ برای دو حوزهٔ دیگر انتخاب الزامی است
  const scopeReady = scope === 'all'
    ? true
    : (scope === 'project_type' ? !!projectTypeId : !!projectId);
  const scopeParams = scope === 'all'
    ? { scope: 'all' }
    : (scope === 'project_type' ? { project_type: projectTypeId } : { project: projectId });
  const params = { ...scopeParams, ...(kindFilter ? { kind: kindFilter } : {}) };

  const { data, isLoading } = useQuery({
    queryKey: ['project-account-definitions', scope, projectTypeId, projectId, kindFilter],
    queryFn: () => axiosInstance.get(API, { params }).then((r) => r.data),
    enabled: scopeReady,
  });
  const rows = listOf(data);

  const remove = useMutation({
    mutationFn: (id) => axiosInstance.delete(`${API}${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-account-definitions'] }),
  });

  const summary = (row) => {
    const rules = (row.auxiliary_rules || []).filter((rule) => rule.source !== 'none');
    if (!rules.length) return 'بدون تفصیل';
    return rules
      .map((rule) => `تفصیل ${rule.slot}: ${rule.category_name || rule.source_display}`)
      .join(' · ');
  };


  return (
    <Box>
      <Paper sx={{ ...glassPaper, p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>حوزهٔ تعریف</InputLabel>
            <Select value={scope} label="حوزهٔ تعریف" onChange={(e) => setScope(e.target.value)}>
              {SCOPES.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}
            </Select>
          </FormControl>
          {scope === 'project_type' ? (
            <FormControl size="small" sx={{ minWidth: 240 }}>
              <InputLabel>نوع پروژه</InputLabel>
              <Select value={projectTypeId} label="نوع پروژه" onChange={(e) => setProjectTypeId(e.target.value)}>
                {projectTypes.map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}
              </Select>
            </FormControl>
          ) : scope === 'project' ? (
            <FormControl size="small" sx={{ minWidth: 260 }}>
              <InputLabel>پروژه</InputLabel>
              <Select value={projectId} label="پروژه" onChange={(e) => setProjectId(e.target.value)}>
                {projects.map((item) => <MenuItem key={item.id} value={item.id}>{item.code} - {item.name}</MenuItem>)}
              </Select>
            </FormControl>
          ) : null}
          <FormControl size="small" sx={{ minWidth: 190 }}>
            <InputLabel>نوع آیتم</InputLabel>
            <Select value={kindFilter} label="نوع آیتم" onChange={(e) => setKindFilter(e.target.value)}>
              <MenuItem value="">همه</MenuItem>
              {(meta?.kinds || []).map((item) => (
                <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box sx={{ flex: 1 }} />
          <Button size="small" variant="outlined" startIcon={<AutoAwesomeIcon />} disabled={!scopeReady}
            onClick={() => setTemplateOpen(true)}>قالب پیشنهادی</Button>
          <Button size="small" variant="contained" startIcon={<AddIcon />} disabled={!scopeReady}
            onClick={() => { setEditing(null); setDialog(true); }}
            sx={{ background: `linear-gradient(135deg,${COLOR},#8b5cf6)` }}>تعریف جدید</Button>
        </Stack>
        {scope === 'all' && (
          <Alert severity="info" sx={{ mt: 1.5, borderRadius: '12px', py: 0 }}>
            <Typography variant="caption">
              تعریف‌های «همهٔ پروژه‌ها» برای تمام پروژه‌ها خوانده می‌شوند؛ اگر پروژه یا نوع پروژهٔ خاصی
              تعریف هم‌کد داشته باشد، همان اولویت می‌گیرد (پروژه ← نوع پروژه ← همهٔ پروژه‌ها).
            </Typography>
          </Alert>
        )}
        {scope === 'project' && (
          <Alert severity="info" sx={{ mt: 1.5, borderRadius: '12px', py: 0 }}>
            <Typography variant="caption">
              تعریف‌های این پروژه، تعریف‌های هم‌کد «نوع پروژه» و «همهٔ پروژه‌ها» را جایگزین می‌کنند.
            </Typography>
          </Alert>
        )}
      </Paper>

      {!scopeReady ? (
        <Paper sx={{ ...glassPaper, p: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="textSecondary">
            برای مشاهده و ثبت تعاریف، «نوع پروژه» یا «پروژه» را انتخاب کنید.
          </Typography>
        </Paper>
      ) : isLoading ? (
        <Box textAlign="center" py={4}><CircularProgress /></Box>
      ) : rows.length === 0 ? (
        <Paper sx={{ ...glassPaper, p: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="textSecondary">
            هنوز تعریفی ثبت نشده است. با «تعریف جدید» یا «قالب پیشنهادی» شروع کنید.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {rows.map((row) => (
            <Grid item xs={12} md={6} key={row.id}>
              <Paper sx={{ ...glassPaper, p: 2, height: '100%' }}>
                <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                  <Chip size="small" label={row.code} sx={{ fontWeight: 800 }} />
                  <Typography variant="subtitle2" fontWeight={800} sx={{ flex: 1 }}>{row.title}</Typography>
                  <Chip size="small" label={row.kind_display}
                    sx={{ bgcolor: `${KIND_COLORS[row.kind] || '#94a3b8'}22`, color: KIND_COLORS[row.kind] || '#94a3b8', fontWeight: 700 }} />
                  <Chip size="small" variant="outlined" label={row.scope_label} />
                  {row.subsidiary_under_general ? (
                    <Tooltip title="معین زیرمجموعهٔ کل است">
                      <CheckCircleIcon sx={{ color: '#10b981', fontSize: 18 }} />
                    </Tooltip>
                  ) : null}
                  <IconButton size="small" onClick={() => { setEditing(row); setDialog(true); }}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="error"
                    onClick={() => { if (window.confirm(`حذف تعریف «${row.title}»؟`)) remove.mutate(row.id); }}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
                <Divider sx={{ my: 1 }} />
                <Stack spacing={0.4}>
                  <Typography variant="caption" color="textSecondary">
                    حساب کل: {row.general_account_code || '—'} {row.general_account_name || ''}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    حساب معین: {row.subsidiary_account_code || '—'} {row.subsidiary_account_name || ''}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    مرکز هزینه: {row.cost_center_name || '—'}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">تفصیل‌ها: {summary(row)}</Typography>
                </Stack>
                {(row.coding_warnings || []).map((warning) => (
                  <Alert key={warning} severity="warning" sx={{ mt: 1, py: 0, borderRadius: '10px' }}>
                    <Typography variant="caption">{warning}</Typography>
                  </Alert>
                ))}
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      <DefinitionDialog open={dialog} onClose={(saved) => { setDialog(false); if (saved) setEditing(null); }}
        scope={scope} projectTypeId={projectTypeId} projectId={projectId}
        definition={editing} meta={meta} defaultKind={kindFilter || 'expense'} />
      <TemplateDialog open={templateOpen} onClose={() => setTemplateOpen(false)}
        scope={scope} projectTypeId={projectTypeId} projectId={projectId} />
    </Box>
  );
};


/* ------------------------------------------------------ تب تفصیل‌های پروژه */
const AuxiliariesTab = () => {
  const qc = useQueryClient();
  const [projectId, setProjectId] = useState('');

  const { data: projectData } = useQuery({
    queryKey: ['def-projects'],
    queryFn: () => axiosInstance.get('/projects/', { params: { page_size: 500 } }).then((r) => r.data),
  });
  const projects = listOf(projectData);

  const { data, isLoading } = useQuery({
    queryKey: ['project-auxiliaries', projectId],
    queryFn: () => axiosInstance.get(AUX_API, { params: { project: projectId } }).then((r) => r.data),
    enabled: !!projectId,
  });

  const ensure = useMutation({
    mutationFn: () => axiosInstance.post(`${AUX_API}ensure/`, { project: projectId }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-auxiliaries'] }),
  });

  const auxiliaries = data?.auxiliaries || [];
  const usage = data?.accounts_usage || [];
  const usageTotal = usage.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const projectAux = data?.project_auxiliary;

  const kpi = (title, value, color) => (
    <Grid item xs={12} sm={6} md={3}>
      <Paper sx={{ ...glassPaper, p: 1.75, textAlign: 'center' }}>
        <Typography variant="caption" color="textSecondary">{title}</Typography>
        <Typography variant="subtitle1" fontWeight={800} sx={{ color }}>{value}</Typography>
      </Paper>
    </Grid>
  );

  return (
    <Box>
      <Paper sx={{ ...glassPaper, p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 280 }}>
            <InputLabel>پروژه</InputLabel>
            <Select value={projectId} label="پروژه" onChange={(e) => setProjectId(e.target.value)}>
              {projects.map((item) => <MenuItem key={item.id} value={item.id}>{item.code} - {item.name}</MenuItem>)}
            </Select>
          </FormControl>
          <Box sx={{ flex: 1 }} />
          <Button size="small" variant="contained" startIcon={<PlaylistAddCheckIcon />} disabled={!projectId}
            onClick={() => ensure.mutate()} sx={{ background: `linear-gradient(135deg,${COLOR},#8b5cf6)` }}>
            ساخت / به‌روزرسانی تفصیل پروژه
          </Button>
        </Stack>
        <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
          تفصیل‌های زیر همان تفضیل‌هایی هستند که این پروژه را «شامل می‌شوند» و در تعاریف نگاشت استفاده می‌شوند.
        </Typography>
      </Paper>

      {!projectId ? (
        <Paper sx={{ ...glassPaper, p: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="textSecondary">یک پروژه انتخاب کنید.</Typography>
        </Paper>
      ) : isLoading ? (
        <Box textAlign="center" py={4}><CircularProgress /></Box>
      ) : (
        <>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            {kpi('تفصیل پروژه', projectAux ? labelOfCode(projectAux) : 'ساخته نشده',
              projectAux ? '#10b981' : '#f59e0b')}
            {kpi('تفصیل‌های مرتبط', formatPersianNumber(auxiliaries.length), '#6366f1')}
            {kpi('حساب‌های معین در گردش', formatPersianNumber(usage.length), '#0ea5e9')}
            {kpi('جمع مبلغ هزینه‌ها', formatPersianNumber(usageTotal), '#ef4444')}
          </Grid>

          <Paper sx={{ ...glassPaper, p: 2, mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={800} color={COLOR} mb={1}>
              تفصیل‌های مرتبط با پروژه
            </Typography>
            <Stack spacing={0.75}>
              {auxiliaries.length === 0 && (
                <Typography variant="body2" color="textSecondary" textAlign="center" py={2}>
                  تفصیلی مرتبط پیدا نشد؛ با دکمهٔ بالا تفصیل پروژه را بسازید.
                </Typography>
              )}
              {auxiliaries.map((row) => (
                <Paper key={row.id} variant="outlined"
                  sx={{ p: 1, borderRadius: '10px', display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Chip size="small" label={row.code} sx={{ fontWeight: 800 }} />
                  <Typography variant="body2" sx={{ flex: 1 }}>{row.name}</Typography>
                  <Chip size="small" variant="outlined" label={row.aux_type_display} />
                  {row.category_name ? <Chip size="small" variant="outlined" label={row.category_name} /> : null}
                  {row.is_project ? <Chip size="small" color="success" label="تفصیل پروژه" /> : null}
                  {row.contract ? <Chip size="small" color="info" variant="outlined" label={`قرارداد ${row.contract}`} /> : null}
                  {row.party ? <Chip size="small" variant="outlined" label={row.party} /> : null}
                  {row.supplier ? <Chip size="small" variant="outlined" label={row.supplier} /> : null}
                  {row.employee ? <Chip size="small" variant="outlined" label={row.employee} /> : null}
                </Paper>
              ))}
            </Stack>
          </Paper>

          <Paper sx={{ ...glassPaper, p: 2 }}>
            <Typography variant="subtitle2" fontWeight={800} color="#0ea5e9" mb={1}>
              حساب‌های معین استفاده‌شده در هزینه‌های این پروژه
            </Typography>
            <Stack spacing={0.75}>
              {usage.length === 0 && (
                <Typography variant="body2" color="textSecondary" textAlign="center" py={2}>
                  هنوز هزینهٔ کدینگ‌شده‌ای برای این پروژه ثبت نشده است.
                </Typography>
              )}
              {usage.map((row) => (
                <Paper key={row.account_code} variant="outlined"
                  sx={{ p: 1, borderRadius: '10px', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip size="small" label={row.account_code} sx={{ fontWeight: 800 }} />
                  <Typography variant="body2" sx={{ flex: 1 }}>{row.account_name}</Typography>
                  <Chip size="small" variant="outlined" label={`${formatPersianNumber(row.lines)} ردیف`} />
                  <Chip size="small" color="error" variant="outlined" label={formatPersianNumber(row.amount)} />
                </Paper>
              ))}
            </Stack>
          </Paper>
        </>
      )}
    </Box>
  );
};

/* --------------------------------------------------------------- صفحهٔ اصلی */
export default function ProjectDefinitionsPage() {
  const [tab, setTab] = useState(0);
  const { data: meta } = useQuery({
    queryKey: ['def-meta'],
    queryFn: () => axiosInstance.get(`${API}meta/`).then((r) => r.data),
  });

  return (
    <Box>
      <PageHeader icon={<CategoryIcon sx={{ color: '#fff', fontSize: 28 }} />}
        title="تعاریف اولیهٔ پروژه‌ها"
        subtitle="نگاشت حساب کل/معین و تفصیل‌ها بر پایهٔ ماهیت پروژه — هزینه، درآمد، تضمین و ..."
        color={COLOR} gradient="#6d28d9,#6366f1" />

      <Paper sx={{ ...glassPaper, overflow: 'hidden', mb: 2 }}>
        <Tabs value={tab} onChange={(e, value) => setTab(value)}
          sx={{ borderBottom: '1px solid rgba(255,255,255,0.5)', px: 2 }}>
          <Tab icon={<AccountTreeIcon />} iconPosition="start" label="نگاشت حساب‌ها (کل/معین/تفصیل)"
            sx={{ fontWeight: 700, color: tab === 0 ? COLOR : undefined }} />
          <Tab icon={<AccountBalanceIcon />} iconPosition="start" label="تفصیل‌های پروژه"
            sx={{ fontWeight: 700, color: tab === 1 ? COLOR : undefined }} />
        </Tabs>
      </Paper>

      <Paper sx={{ mb: 2, px: 1.5, py: 1, background: `linear-gradient(135deg, ${COLOR}0d, ${COLOR}04)`,
        border: `1px solid ${COLOR}20`, borderRadius: '12px' }}>
        <Typography variant="body2" sx={{ color: COLOR, fontWeight: 600 }}>
          {tab === 0
            ? 'برای هر آیتم (هزینه، مصالح، دستمزد، درآمد و ...) حساب کل و معین را تعیین کنید و مشخص کنید تفصیل‌ها از کدام منبع پر شوند.'
            : 'تفصیل‌هایی که یک پروژه را شامل می‌شوند و محل نشستن معین‌های استفاده‌شده در هزینه‌های آن.'}
        </Typography>
      </Paper>

      {tab === 0 ? <DefinitionsTab meta={meta} /> : <AuxiliariesTab />}
    </Box>
  );
}

