import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Box, Button, ButtonBase, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, Drawer, FormControl, Grid, IconButton, InputAdornment,
  InputLabel, MenuItem, Paper, Select, Snackbar, Stack, Table, TableBody, TableCell,
  TableHead, TableRow, TextField, ToggleButton, ToggleButtonGroup,
  Tooltip, Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DescriptionIcon from '@mui/icons-material/Description';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import EditIcon from '@mui/icons-material/Edit';
import EditNoteIcon from '@mui/icons-material/EditNote';
import FilterListIcon from '@mui/icons-material/FilterList';
import HistoryIcon from '@mui/icons-material/History';
import PrintIcon from '@mui/icons-material/Print';
import RefreshIcon from '@mui/icons-material/Refresh';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import TableRowsIcon from '@mui/icons-material/TableRows';
import TimelineIcon from '@mui/icons-material/Timeline';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TuneIcon from '@mui/icons-material/Tune';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import axiosInstance from '../core/api/axiosConfig';
import PageHeader from '../core/components/ui/PageHeader';
import ContractPicker from '../core/components/ui/ContractPicker';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';
import { useModulePalette } from '../core/context/ModulePaletteContext';
import { DEFAULT_TYPOGRAPHY } from '../core/theme/appearanceDefaults';
import { formatPersianNumber, normalizeCurrencyLabel } from '../core/utils/numberUtils';
import {
  ADDENDUM_GROUPS, ADDENDUM_SCHEMA, CONTRACT_TARGET_LABELS,
  addendumSubject,
} from '../core/constants/addendumSubjects';
import { KpiTile, SurfaceCard, INK, MUTED, SOFT_BG } from './accounting/AccountingDashboardUI';
import {
  AmendmentCard, AmendmentTable, AmendmentTimeline, ContractSnapshotCard,
  EffectiveProfileCard, EffectTable, EditorStepNav, EmptyState, InfoLine,
  SectionTitle, SubjectPill, dateLabel, dayDiff, deltaTone, effectDelta,
  groupTone, money, signedMoney, toNumber, useAddendumStyle,
} from './contracts/AddendumWorkspaceUI';

const EMPTY = {
  id: null,
  contract: '',
  number: '',
  subject: '',
  date: '',
  currency: '',
  change_description: '',
  provisions: [],
  subjects: [],
};

const MIRROR_KEYS = Object.values(ADDENDUM_SCHEMA.subjects)
  .flatMap((subject) => subject.fields)
  .filter((field) => field.effect)
  .map((field) => field.key);

const collectMirrors = (subjects) => {
  const mirrors = {};
  MIRROR_KEYS.forEach((key) => { mirrors[key] = null; });
  (subjects || []).forEach((item) => {
    Object.entries(item.fields || {}).forEach(([key, value]) => {
      if (MIRROR_KEYS.includes(key) && value !== '' && value != null) mirrors[key] = value;
    });
  });
  return mirrors;
};

const sanitize = (payload) => ({
  ...payload,
  contract: payload.contract || null,
  date: payload.date || null,
  currency: payload.currency || null,
  provisions: Array.isArray(payload.provisions) ? payload.provisions : [],
  subjects: (payload.subjects || []).map((item) => ({
    type: item.type,
    fields: Object.fromEntries(
      Object.entries(item.fields || {}).filter(([, value]) => value !== '' && value != null),
    ),
  })),
  ...collectMirrors(payload.subjects),
  subject_type: payload.subjects?.[0]?.type || '',
});

const fieldValue = (spec, value, currency = 'ریال') => {
  if (value === null || value === undefined || value === '') return '—';
  if (spec?.type === 'money') return money(value, currency);
  if (spec?.type === 'date') return dateLabel(value);
  if (spec?.type === 'percent') return `${formatPersianNumber(value)}٪`;
  if (spec?.type === 'select') {
    return spec.choices?.find((choice) => String(choice.value) === String(value))?.label || value;
  }
  return String(value);
};

const csvEscape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const downloadCsv = (rows) => {
  const headers = ['شماره', 'تاریخ', 'موضوع‌ها', 'شرح', 'تغییر مبلغ', 'تغییر مدت (روز)', 'تعداد اثر', 'تعداد بند'];
  const body = rows.map((row) => {
    const amount = effectDelta(row, 'amount');
    const duration = effectDelta(row, 'end_date');
    return [
      row.number || '',
      dateLabel(row.date),
      row.subjects_display || row.subject || '',
      row.change_description || '',
      amount === null ? '' : amount,
      duration?.days ?? '',
      (row.effect?.changes || []).length,
      (row.provisions || []).length,
    ];
  });
  const csv = `\uFEFF${[headers, ...body].map((line) => line.map(csvEscape).join(',')).join('\r\n')}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `contract-addendums-${Date.now()}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const validateForm = (form) => {
  if (!form.contract) return 'قرارداد را انتخاب کنید.';
  if (!form.date) return 'تاریخ الحاقیه را وارد کنید.';
  if (!(form.subjects || []).length) return 'حداقل یک موضوع برای الحاقیه انتخاب کنید.';
  return '';
};


const SubjectFieldControl = ({ spec, value, onChange }) => {
  if (spec.type === 'date') {
    return <JalaliDatePicker fullWidth label={spec.label} value={value || ''} onChange={onChange} />;
  }
  if (spec.type === 'select') {
    return (
      <FormControl size="small" fullWidth>
        <InputLabel>{spec.label}</InputLabel>
        <Select value={value ?? ''} label={spec.label} onChange={(event) => onChange(event.target.value)}>
          <MenuItem value="">—</MenuItem>
          {(spec.choices || []).map((choice) => (
            <MenuItem key={choice.value} value={choice.value}>{choice.label}</MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  }
  if (spec.type === 'textarea') {
    return (
      <TextField size="small" fullWidth multiline rows={2} label={spec.label}
        value={value ?? ''} onChange={(event) => onChange(event.target.value)} />
    );
  }
  const numeric = ['money', 'number', 'int', 'percent'].includes(spec.type);
  return (
    <TextField
      size="small"
      fullWidth
      type={numeric ? 'number' : 'text'}
      label={spec.label}
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value)}
      helperText={spec.help || ''}
      InputProps={spec.type === 'percent' ? { endAdornment: <InputAdornment position="end">٪</InputAdornment> } : undefined}
    />
  );
};

const SubjectEditor = ({ item, subject, onChangeFields, onRemove }) => {
  const tone = groupTone(subject?.group);
  return (
    <Paper elevation={0} sx={{
      p: 1.5, borderRadius: '14px', border: `1px solid ${alpha(tone, 0.22)}`,
      bgcolor: alpha(tone, 0.025),
    }}>
      <Stack direction="row" alignItems="center" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mb: 1.25 }}>
        <SubjectPill subject={subject} />
        <Box sx={{ flex: 1 }} />
        {subject?.fields?.some((field) => field.effect) ? (
          <Chip size="small" label="اثرگذار بر پروندهٔ قرارداد"
            sx={{ height: 21, fontSize: 8.8, fontWeight: 800, bgcolor: alpha(tone, 0.08), color: tone }} />
        ) : null}
        <Tooltip title="حذف موضوع">
          <IconButton size="small" color="error" onClick={onRemove}><RemoveCircleIcon fontSize="small" /></IconButton>
        </Tooltip>
      </Stack>
      <Grid container spacing={1.25}>
        {(subject?.fields || []).map((spec) => (
          <Grid item xs={12} sm={6} md={4} key={`${item.type}-${spec.key}`}>
            <SubjectFieldControl
              spec={spec}
              value={(item.fields || {})[spec.key]}
              onChange={(next) => onChangeFields({ ...(item.fields || {}), [spec.key]: next })}
            />
          </Grid>
        ))}
      </Grid>
      {subject?.fields?.some((field) => field.effect) ? (
        <Typography sx={{ mt: 1, fontSize: 8.8, color: MUTED }}>
          اثر مستقیم: {subject.fields.filter((field) => field.effect)
            .map((field) => `${field.label} → ${CONTRACT_TARGET_LABELS[field.effect[0]] || field.effect[0]}`)
            .join(' · ')}
        </Typography>
      ) : null}
    </Paper>
  );
};


const subjectsFromRow = (row) => {
  if (Array.isArray(row.subjects) && row.subjects.length) return row.subjects;
  return row.subject_type ? [{ type: row.subject_type, fields: {} }] : [];
};

const rowSubjects = (row, subjectMap) => {
  if (Array.isArray(row.subjects_detail) && row.subjects_detail.length) return row.subjects_detail;
  return subjectsFromRow(row).map((item) => {
    const subject = subjectMap.get(item.type);
    return subject ? { ...subject, type: item.type } : { type: item.type, label: item.type, group: 'other' };
  });
};

const ContractAddendumsPage = () => {
  const qc = useQueryClient();
  const theme = useTheme();
  const { getPalette, typography } = useModulePalette();
  const type = { ...DEFAULT_TYPOGRAPHY, ...(typography || {}) };
  const accent = getPalette('contracts')?.accent || '#f59e0b';
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlContract = searchParams.get('contract') || '';

  const [contractId, setContractId] = useState(urlContract);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [view, setView] = useState('cards');
  const [detail, setDetail] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(EMPTY);
  const [subjectSearch, setSubjectSearch] = useState('');
  const [subjectGroup, setSubjectGroup] = useState('all');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  const { data: contracts } = useQuery({
    queryKey: ['ext-contracts-addendum'],
    queryFn: () => axiosInstance.get('/external-contracts/', { params: { page_size: 500 } }).then((r) => r.data),
  });
  const contractList = Array.isArray(contracts) ? contracts : contracts?.results || [];

  const { data: currencies } = useQuery({
    queryKey: ['currencies-addendum'],
    queryFn: () => axiosInstance.get('/currencies/', { params: { page_size: 100 } }).then((r) => r.data),
  });
  const currencyList = Array.isArray(currencies) ? currencies : currencies?.results || [];

  const { data: schemaData } = useQuery({
    queryKey: ['addendum-subject-schema'],
    queryFn: () => axiosInstance.get('/contract-addendums/subject-types/').then((r) => r.data),
  });
  const subjectOptions = useMemo(() => {
    if (Array.isArray(schemaData)) {
      return schemaData.map((item) => ({ ...(addendumSubject(item.value) || {}), ...item }));
    }
    if (schemaData?.subjects?.length) return schemaData.subjects;
    return ADDENDUM_SCHEMA.subjects;
  }, [schemaData]);
  const subjectMap = useMemo(
    () => new Map(subjectOptions.map((item) => [item.value, item])),
    [subjectOptions],
  );

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['contract-addendums', contractId],
    queryFn: () => axiosInstance.get('/contract-addendums/', {
      params: { contract: contractId, page_size: 500 },
    }).then((r) => r.data),
    enabled: !!contractId,
  });
  const list = Array.isArray(data) ? data : data?.results || [];

  const { data: contractEffects, refetch: refetchEffects } = useQuery({
    queryKey: ['contract-effects', contractId],
    queryFn: () => axiosInstance.get(`/external-contracts/${contractId}/effective/`).then((r) => r.data),
    enabled: !!contractId,
  });

  const selectedContract = contractList.find((item) => String(item.id) === String(contractId)) || null;
  const baseContract = contractEffects?.base || (selectedContract ? {
    amount: selectedContract.amount,
    advance_payment: selectedContract.advance_payment,
    retention_percent: selectedContract.retention_percent,
    guarantee_amount: selectedContract.guarantee_amount,
    end_date: selectedContract.end_date,
  } : {});
  const effective = contractEffects?.effective || {
    amount: selectedContract?.effective_amount ?? selectedContract?.amount,
    advance_payment: selectedContract?.advance_payment,
    retention_percent: selectedContract?.retention_percent,
    guarantee_amount: selectedContract?.guarantee_amount,
    end_date: selectedContract?.effective_end_date ?? selectedContract?.end_date,
  };
  const selectedCurrency = currencyList.find((item) => String(item.id) === String(form.currency));
  const currencyLabel = normalizeCurrencyLabel(
    selectedCurrency?.name
    || selectedContract?.currency_name
    || selectedContract?.currency_symbol
    || 'ریال',
  );

  useEffect(() => {
    setContractId(urlContract);
  }, [urlContract]);

  useEffect(() => {
    setSearch('');
    setGroupFilter('all');
    setSortBy('newest');
    setView('cards');
    setDetail(null);
  }, [contractId]);

  const selectContract = (contract) => {
    const next = String(contract.id);
    setContractId(next);
    setSearchParams({ contract: next });
  };

  const clearContract = () => {
    setContractId('');
    setSearchParams({});
  };


  const getRowGroups = useMemo(
    () => (row) => rowSubjects(row, subjectMap).map((item) => item.group || 'other'),
    [subjectMap],
  );

  const groupCounts = useMemo(() => {
    const counts = { all: list.length };
    list.forEach((row) => {
      new Set(getRowGroups(row)).forEach((group) => {
        counts[group] = (counts[group] || 0) + 1;
      });
    });
    return counts;
  }, [list, getRowGroups]);

  const filtered = useMemo(() => {
    const q = (search || '').trim().toLowerCase();
    const rows = list.filter((row) => {
      if (groupFilter !== 'all' && !getRowGroups(row).includes(groupFilter)) return false;
      if (!q) return true;
      return [row.number, row.subject, row.subjects_display, row.change_description, row.subject_type_display]
        .some((value) => String(value || '').toLowerCase().includes(q));
    });
    return [...rows].sort((a, b) => {
      if (sortBy === 'oldest') return String(a.date || '').localeCompare(String(b.date || ''));
      if (sortBy === 'amount') return Math.abs(effectDelta(b, 'amount') || 0) - Math.abs(effectDelta(a, 'amount') || 0);
      if (sortBy === 'impact') return (b.effect?.changes || []).length - (a.effect?.changes || []).length;
      return String(b.date || '').localeCompare(String(a.date || ''));
    });
  }, [list, search, groupFilter, sortBy, getRowGroups]);

  const subjectCount = useMemo(() => {
    const set = new Set();
    list.forEach((row) => rowSubjects(row, subjectMap).forEach((item) => set.add(item.type)));
    return set.size;
  }, [list, subjectMap]);
  const amountDelta = toNumber(effective.amount) - toNumber(baseContract.amount);
  const durationDelta = dayDiff(baseContract.end_date, effective.end_date);
  const effectCount = list.reduce((total, row) => total + (row.effect?.changes || []).length, 0);
  const lastAmendment = [...list].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))[0];
  const contractsWithAddendums = contractList.filter((item) => item.has_addendum || item.addendums?.length).length;
  const activeContracts = contractList.filter((item) => item.status === 'active').length;
  const totalAddendums = contractList.reduce((total, item) => total + (item.addendums?.length || 0), 0);


  const previewEffect = useMutation({
    mutationFn: () => axiosInstance.post('/contract-addendums/effect-preview/', {
      contract: contractId,
      subjects: form.subjects,
      ...collectMirrors(form.subjects),
      ignore: form.id || undefined,
    }).then((r) => r.data),
  });

  useEffect(() => {
    if (!editorOpen || !contractId) return undefined;
    const timer = setTimeout(() => previewEffect.mutate(), 450);
    return () => clearTimeout(timer);
  }, [editorOpen, contractId, form.subjects, form.id]);

  const save = useMutation({
    mutationFn: (payload) => {
      const clean = sanitize(payload);
      return clean.id
        ? axiosInstance.patch(`/contract-addendums/${clean.id}/`, clean)
        : axiosInstance.post('/contract-addendums/', clean);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contract-addendums'] });
      qc.invalidateQueries({ queryKey: ['contract-effects'] });
      qc.invalidateQueries({ queryKey: ['external-contracts'] });
      qc.invalidateQueries({ queryKey: ['ext-contracts-addendum'] });
      setEditorOpen(false);
      setForm(EMPTY);
      setError('');
      setToast('الحاقیه ذخیره شد');
    },
    onError: (event) => {
      const detail = event.response?.data;
      let message = 'خطا در ذخیرهٔ الحاقیه';
      if (detail) {
        if (typeof detail === 'string') message = detail;
        else if (Array.isArray(detail)) message = detail[0];
        else if (detail.detail) message = detail.detail;
        else if (detail.error) message = detail.error;
        else if (detail.non_field_errors) message = detail.non_field_errors[0];
        else if (Array.isArray(detail.subjects)) message = detail.subjects[0];
        else {
          const first = Object.values(detail).flat()[0];
          if (first) message = first;
        }
      }
      setError(message);
    },
  });

  const del = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/contract-addendums/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contract-addendums'] });
      qc.invalidateQueries({ queryKey: ['contract-effects'] });
      qc.invalidateQueries({ queryKey: ['external-contracts'] });
      qc.invalidateQueries({ queryKey: ['ext-contracts-addendum'] });
      setConfirmDelete(null);
      setDetail(null);
      setToast('الحاقیه حذف شد');
    },
    onError: () => setToast('حذف الحاقیه انجام نشد'),
  });

  const openNew = () => {
    setDetail(null);
    previewEffect.reset();
    setForm({ ...EMPTY, contract: contractId, currency: selectedContract?.currency || '' });
    setStep(0);
    setSubjectSearch('');
    setSubjectGroup('all');
    setError('');
    setEditorOpen(true);
  };

  const openEdit = (row) => {
    setDetail(null);
    previewEffect.reset();
    setForm({
      id: row.id,
      contract: row.contract || contractId,
      number: row.number || '',
      subject: row.subject || '',
      date: row.date || '',
      currency: row.currency || '',
      change_description: row.change_description || '',
      provisions: row.provisions || [],
      subjects: subjectsFromRow(row).map((item) => ({
        type: item.type,
        fields: { ...(item.fields || {}) },
      })),
    });
    setStep(0);
    setSubjectSearch('');
    setSubjectGroup('all');
    setError('');
    setEditorOpen(true);
  };

  const openDuplicate = (row) => {
    setDetail(null);
    previewEffect.reset();
    setForm({
      id: null,
      contract: row.contract || contractId,
      number: row.number ? `${row.number} - کپی` : 'کپی الحاقیه',
      subject: row.subject || '',
      date: row.date || '',
      currency: row.currency || '',
      change_description: row.change_description || '',
      provisions: (row.provisions || []).map((item) => ({ ...item })),
      subjects: subjectsFromRow(row).map((item) => ({
        type: item.type,
        fields: { ...(item.fields || {}) },
      })),
    });
    setStep(0);
    setSubjectSearch('');
    setSubjectGroup('all');
    setError('');
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setForm(EMPTY);
    setError('');
    setStep(0);
  };

  const toggleSubject = (option) => {
    setForm((previous) => {
      const exists = (previous.subjects || []).some((item) => item.type === option.value);
      return {
        ...previous,
        subjects: exists
          ? previous.subjects.filter((item) => item.type !== option.value)
          : [...(previous.subjects || []), { type: option.value, fields: {} }],
      };
    });
  };

  const updateSubjectFields = (typeValue, fields) => setForm((previous) => ({
    ...previous,
    subjects: (previous.subjects || []).map((item) => (
      item.type === typeValue ? { ...item, fields } : item
    )),
  }));

  const removeSubject = (typeValue) => setForm((previous) => ({
    ...previous,
    subjects: (previous.subjects || []).filter((item) => item.type !== typeValue),
  }));

  const addProvision = () => setForm((previous) => ({
    ...previous,
    provisions: [...(previous.provisions || []), { title: '', text: '' }],
  }));

  const updateProvision = (index, key, value) => setForm((previous) => ({
    ...previous,
    provisions: (previous.provisions || []).map((row, rowIndex) => (
      rowIndex === index ? { ...row, [key]: value } : row
    )),
  }));

  const removeProvision = (index) => setForm((previous) => ({
    ...previous,
    provisions: (previous.provisions || []).filter((_, rowIndex) => rowIndex !== index),
  }));

  const submit = () => {
    const message = validateForm(form);
    setError(message);
    if (!message) save.mutate(form);
    return !message;
  };


  const steps = [
    { key: 'base', title: 'اطلاعات پایه', hint: 'شماره، تاریخ و ارز' },
    { key: 'subjects', title: 'موضوع‌ها', hint: 'انتخاب چندموضوعی' },
    { key: 'provisions', title: 'بندها', hint: 'مفاد و تعهدات' },
    { key: 'review', title: 'بازبینی', hint: 'اثر و ثبت نهایی' },
  ];
  const selectedSubjects = form.subjects || [];
  const filteredSubjectOptions = subjectOptions.filter((option) => {
    if (subjectGroup !== 'all' && option.group !== subjectGroup) return false;
    const q = subjectSearch.trim().toLowerCase();
    if (!q) return true;
    return `${option.label || ''} ${option.group_label || ''}`.toLowerCase().includes(q);
  });
  const warnings = (editorOpen && previewEffect.data?.warnings) || contractEffects?.warnings || [];
  const preview = previewEffect.data || (contractEffects ? {
    ...contractEffects,
    base: contractEffects.base,
    effective: contractEffects.effective,
    deltas: contractEffects.deltas,
    changed: contractEffects.changed,
  } : null);

  return (
    <Box sx={{ pb: 1 }}>
      <PageHeader
        icon={<EditNoteIcon />}
        title="الحاقیه‌های قرارداد"
        badge={(
          <Chip size="small" label={contractId ? `${formatPersianNumber(list.length)} الحاقیه` : 'مدیریت تغییرات قرارداد'}
            sx={{ height: 23, fontWeight: 800, bgcolor: alpha(accent, 0.08), color: accent }} />
        )}
        actions={(
          <>
            {contractId ? (
              <Tooltip title="به‌روزرسانی">
                <span>
                  <Button variant="outlined" onClick={() => { refetch(); refetchEffects(); }} disabled={isFetching} sx={{ minWidth: 40, px: 1 }}>
                    <RefreshIcon fontSize="small" />
                  </Button>
                </span>
              </Tooltip>
            ) : null}
            {contractId ? (
              <Button variant="outlined" startIcon={<DescriptionIcon />}
                onClick={() => navigate(`/external-contracts/${contractId}`)}>
                پرونده
              </Button>
            ) : null}
            {contractId ? <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => window.print()}>چاپ</Button> : null}
            {contractId ? <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => downloadCsv(filtered)}>خروجی</Button> : null}
            {contractId ? <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>الحاقیه جدید</Button> : null}
          </>
        )}
      />

      {!contractId ? (
        <LandingContent
          accent={accent}
          contractList={contractList}
          contractsWithAddendums={contractsWithAddendums}
          activeContracts={activeContracts}
          totalAddendums={totalAddendums}
          onSelect={selectContract}
        />
      ) : (
        <WorkspaceContent
          contract={selectedContract}
          accent={accent}
          base={baseContract}
          effective={effective}
          list={list}
          filtered={filtered}
          view={view}
          setView={setView}
          search={search}
          setSearch={setSearch}
          groupFilter={groupFilter}
          setGroupFilter={setGroupFilter}
          groupCounts={groupCounts}
          sortBy={sortBy}
          setSortBy={setSortBy}
          subjectCount={subjectCount}
          amountDelta={amountDelta}
          durationDelta={durationDelta}
          effectCount={effectCount}
          lastAmendment={lastAmendment}
          currencyLabel={currencyLabel}
          isLoading={isLoading}
          warnings={warnings}
          onBack={clearContract}
          onNew={openNew}
          onDetail={setDetail}
          onEdit={openEdit}
          onDuplicate={openDuplicate}
          onDelete={setConfirmDelete}
        />
      )}

      <AddendumEditorDialog
        open={editorOpen}
        onClose={closeEditor}
        form={form}
        setForm={setForm}
        step={step}
        setStep={setStep}
        steps={steps}
        selectedSubjects={selectedSubjects}
        subjectOptions={subjectOptions}
        filteredSubjectOptions={filteredSubjectOptions}
        subjectSearch={subjectSearch}
        setSubjectSearch={setSubjectSearch}
        subjectGroup={subjectGroup}
        setSubjectGroup={setSubjectGroup}
        toggleSubject={toggleSubject}
        updateSubjectFields={updateSubjectFields}
        removeSubject={removeSubject}
        addProvision={addProvision}
        updateProvision={updateProvision}
        removeProvision={removeProvision}
        preview={preview}
        previewLoading={previewEffect.isLoading}
        warnings={warnings}
        error={error}
        setError={setError}
        onSave={submit}
        saving={save.isLoading}
        contract={selectedContract}
        accent={accent}
        currencyLabel={currencyLabel}
        currencyList={currencyList}
      />

      <AddendumDetailDrawer
        row={detail}
        onClose={() => setDetail(null)}
        onEdit={openEdit}
        onDuplicate={openDuplicate}
        onDelete={setConfirmDelete}
        accent={accent}
        currencyLabel={currencyLabel}
        subjectOptions={subjectOptions}
      />

      <Dialog open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900, fontSize: 14 }}>حذف الحاقیه</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ borderRadius: '10px' }}>
            الحاقیه {confirmDelete?.number ? `شماره ${confirmDelete.number}` : 'انتخاب‌شده'} حذف شود؟ اثر آن از پروندهٔ مؤثر قرارداد برداشته می‌شود.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>انصراف</Button>
          <Button color="error" variant="contained" onClick={() => del.mutate(confirmDelete.id)} disabled={del.isLoading}>
            حذف
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={3200} onClose={() => setToast('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={toast.includes('نشد') ? 'error' : 'success'} onClose={() => setToast('')}>{toast}</Alert>
      </Snackbar>

    </Box>
  );
};


const LandingContent = ({
  accent, contractList, contractsWithAddendums, activeContracts, totalAddendums, onSelect,
}) => (
  <>
    <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
      <Grid item xs={6} md={3}>
        <KpiTile icon={EditNoteIcon} label="کل قراردادها" value={formatPersianNumber(contractList.length)}
          suffix="قرارداد" color={accent} hint="پرونده‌های قابل انتخاب" />
      </Grid>
      <Grid item xs={6} md={3}>
        <KpiTile icon={HistoryIcon} label="دارای الحاقیه" value={formatPersianNumber(contractsWithAddendums)}
          suffix="قرارداد" color="#0f766e" hint={`${formatPersianNumber(totalAddendums)} الحاقیه ثبت‌شده`} />
      </Grid>
      <Grid item xs={6} md={3}>
        <KpiTile icon={CheckCircleIcon} label="در حال اجرا" value={formatPersianNumber(activeContracts)}
          suffix="قرارداد" color="#2563eb" hint="وضعیت فعال" />
      </Grid>
      <Grid item xs={6} md={3}>
        <KpiTile icon={TuneIcon} label="ظرفیت ویرایش" value="چندموضوعی" color="#7c3aed" hint="مالی، زمان، دامنه و..." />
      </Grid>
    </Grid>
    <Grid container spacing={1.5}>
      <Grid item xs={12} lg={8}>
        <SurfaceCard title="انتخاب قرارداد" icon={EditNoteIcon} color={accent}>
          <ContractPicker contracts={contractList} onSelect={onSelect} height={520} />
        </SurfaceCard>
      </Grid>
      <Grid item xs={12} lg={4}>
        <SurfaceCard title="فضای کاری الحاقیه‌ها" icon={TuneIcon} color={accent}>
          <Stack spacing={1.25}>
            {[
              ['۱', 'پروندهٔ مؤثر قرارداد را ببینید', 'مبلغ، پیش‌پرداخت، پایان، تضمین و حسن انجام کار بعد از همهٔ الحاقیه‌ها.'],
              ['۲', 'با چند موضوع در یک الحاقیه', 'تغییر مالی، زمانی، دامنه، طرفین و شرایط حقوقی را یک‌جا ثبت کنید.'],
              ['۳', 'اثر زنده و قابل ردیابی', 'هر تغییر قبل از ذخیره پیش‌نمایش داده می‌شود و مبلغ پایه بازنویسی نمی‌شود.'],
            ].map(([number, title, description]) => (
              <Stack key={number} direction="row" spacing={1}>
                <Box sx={{
                  width: 25, height: 25, borderRadius: '8px', flexShrink: 0,
                  bgcolor: alpha(accent, 0.08), color: accent,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 900,
                }}>{number}</Box>
                <Box>
                  <Typography sx={{ fontSize: 10.8, fontWeight: 800, color: INK }}>{title}</Typography>
                  <Typography sx={{ fontSize: 9.5, color: MUTED, lineHeight: 1.7 }}>{description}</Typography>
                </Box>
              </Stack>
            ))}
          </Stack>
        </SurfaceCard>
      </Grid>
    </Grid>
  </>
);


const WorkspaceContent = ({
  contract, accent, base, effective, list, filtered, view, setView, search, setSearch,
  groupFilter, setGroupFilter, groupCounts, sortBy, setSortBy, subjectCount, amountDelta,
  durationDelta, effectCount, lastAmendment, currencyLabel, isLoading, warnings,
  onBack, onNew, onDetail, onEdit, onDuplicate, onDelete,
}) => {
  const { theme } = useAddendumStyle();
  return (
    <Grid container spacing={1.5}>
      <Grid item xs={12} lg={3} sx={{ order: { xs: 2, lg: 1 } }}>
        <Stack spacing={1.5} sx={{ position: { lg: 'sticky' }, top: 16 }}>
          <ContractSnapshotCard contract={contract} accent={accent} onBack={onBack} />
          <EffectiveProfileCard base={base} effective={effective} accent={accent} currency={currencyLabel} />
          <SurfaceCard title="فیلتر موضوع" icon={FilterListIcon} color={accent}>
            <Stack spacing={0.2}>
              <ButtonBase onClick={() => setGroupFilter('all')} sx={{
                width: '100%', p: 0.7, borderRadius: '9px', justifyContent: 'space-between',
                bgcolor: groupFilter === 'all' ? alpha(accent, 0.07) : 'transparent',
              }}>
                <Typography sx={{ fontSize: 9.8, fontWeight: 800 }}>همهٔ موضوع‌ها</Typography>
                <Chip size="small" label={formatPersianNumber(groupCounts.all || 0)} sx={{ height: 19, fontSize: 8.5 }} />
              </ButtonBase>
              {Object.entries(ADDENDUM_GROUPS).map(([key, label]) => (
                <ButtonBase key={key} onClick={() => setGroupFilter(key)} sx={{
                  width: '100%', p: 0.7, borderRadius: '9px', justifyContent: 'space-between',
                  bgcolor: groupFilter === key ? alpha(groupTone(key), 0.07) : 'transparent',
                }}>
                  <Stack direction="row" alignItems="center" spacing={0.6}>
                    <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: groupTone(key) }} />
                    <Typography sx={{ fontSize: 9.5, fontWeight: groupFilter === key ? 900 : 600, color: theme.palette.text.primary }}>
                      {label}
                    </Typography>
                  </Stack>
                  <Chip size="small" label={formatPersianNumber(groupCounts[key] || 0)} sx={{ height: 19, fontSize: 8.5 }} />
                </ButtonBase>
              ))}
            </Stack>
          </SurfaceCard>
          {lastAmendment ? (
            <Paper elevation={0} sx={{ p: 1.25, borderRadius: '14px', border: `1px solid ${theme.palette.divider}` }}>
              <Typography sx={{ fontSize: 9.2, color: theme.palette.text.secondary }}>آخرین الحاقیه</Typography>
              <Typography sx={{ mt: 0.2, fontSize: 10.5, fontWeight: 800 }}>{dateLabel(lastAmendment.date)}</Typography>
              <Typography sx={{ fontSize: 9.2, color: theme.palette.text.secondary }}>
                {lastAmendment.number ? `شماره ${lastAmendment.number}` : lastAmendment.subjects_display || 'بدون عنوان'}
              </Typography>
            </Paper>
          ) : null}
        </Stack>
      </Grid>


      <Grid item xs={12} lg={9} sx={{ order: { xs: 1, lg: 2 } }}>
        <Stack spacing={1.5}>
          <Grid container spacing={1.25}>
            <Grid item xs={6} md={3}>
              <KpiTile icon={HistoryIcon} label="تعداد الحاقیه" value={formatPersianNumber(list.length)} suffix="مورد" color={accent} hint={`${formatPersianNumber(subjectCount)} موضوع متمایز`} />
            </Grid>
            <Grid item xs={6} md={3}>
              <KpiTile icon={TrendingUpIcon} label="خالص تغییر مبلغ" value={signedMoney(amountDelta, currencyLabel)} color={amountDelta === 0 ? MUTED : deltaTone(amountDelta)} hint="مبلغ مؤثر منهای مبلغ پایه" />
            </Grid>
            <Grid item xs={6} md={3}>
              <KpiTile icon={CalendarMonthIcon} label="تمدید مدت" value={durationDelta === null ? '—' : `${durationDelta > 0 ? '+' : ''}${formatPersianNumber(durationDelta)}`} suffix="روز" color="#2563eb" hint="تاریخ پایان مؤثر" />
            </Grid>
            <Grid item xs={6} md={3}>
              <KpiTile icon={CheckCircleIcon} label="اثرهای اعمال‌شده" value={formatPersianNumber(effectCount)} suffix="اثر" color="#0f766e" hint="قابل ردیابی در پرونده" />
            </Grid>
          </Grid>

          <Paper elevation={0} sx={{ p: 1.25, borderRadius: '16px', border: `1px solid ${theme.palette.divider}` }}>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
              <TextField size="small" placeholder="جست‌وجو در شماره، موضوع یا شرح..."
                value={search} onChange={(event) => setSearch(event.target.value)} sx={{ minWidth: { xs: '100%', sm: 235 }, flex: 1 }}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
              <FormControl size="small" sx={{ minWidth: 145 }}>
                <InputLabel>موضوع</InputLabel>
                <Select value={groupFilter} label="موضوع" onChange={(event) => setGroupFilter(event.target.value)}>
                  <MenuItem value="all">همهٔ موضوع‌ها</MenuItem>
                  {Object.entries(ADDENDUM_GROUPS).map(([key, label]) => (
                    <MenuItem key={key} value={key}>{label} ({formatPersianNumber(groupCounts[key] || 0)})</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 125 }}>
                <InputLabel>ترتیب</InputLabel>
                <Select value={sortBy} label="ترتیب" onChange={(event) => setSortBy(event.target.value)}>
                  <MenuItem value="newest">جدیدترین</MenuItem>
                  <MenuItem value="oldest">قدیمی‌ترین</MenuItem>
                  <MenuItem value="amount">بیشترین تغییر مبلغ</MenuItem>
                  <MenuItem value="impact">بیشترین اثر</MenuItem>
                </Select>
              </FormControl>
              <ToggleButtonGroup size="small" exclusive value={view} onChange={(_event, next) => next && setView(next)}>
                <ToggleButton value="cards" aria-label="نمای کارت" sx={{ px: 1 }}><Tooltip title="کارت"><ViewModuleIcon fontSize="small" /></Tooltip></ToggleButton>
                <ToggleButton value="table" aria-label="نمای جدول" sx={{ px: 1 }}><Tooltip title="جدول"><TableRowsIcon fontSize="small" /></Tooltip></ToggleButton>
                <ToggleButton value="timeline" aria-label="نمای تایم‌لاین" sx={{ px: 1 }}><Tooltip title="تایم‌لاین"><TimelineIcon fontSize="small" /></Tooltip></ToggleButton>
              </ToggleButtonGroup>
              <Button variant="contained" startIcon={<AddIcon />} onClick={onNew} sx={{ display: { xs: 'none', md: 'flex' } }}>
                الحاقیه جدید
              </Button>
            </Stack>
          </Paper>


          {warnings.map((warning) => (
            <Alert key={warning} severity="warning" icon={<WarningAmberIcon />} sx={{ borderRadius: '12px', py: 0.35 }}>
              <Typography sx={{ fontSize: 10 }}>{warning}</Typography>
            </Alert>
          ))}

          {isLoading ? (
            <Paper elevation={0} sx={{ py: 7, textAlign: 'center', borderRadius: '16px', border: `1px solid ${theme.palette.divider}` }}>
              <CircularProgress size={28} sx={{ color: accent }} />
            </Paper>
          ) : filtered.length === 0 ? (
            <EmptyState
              title={list.length ? 'نتیجه‌ای برای این فیلتر پیدا نشد' : 'هنوز الحاقیه‌ای ثبت نشده است'}
              description={list.length
                ? 'جست‌وجو یا فیلتر موضوع را تغییر دهید.'
                : 'اولین تغییر قرارداد را با انتخاب موضوع‌های مالی، زمانی یا دامنه ثبت کنید.'}
              action={<Button variant="contained" startIcon={<AddIcon />} onClick={onNew}>الحاقیه جدید</Button>}
            />
          ) : view === 'table' ? (
            <AmendmentTable
              rows={filtered}
              accent={accent}
              currency={currencyLabel}
              onView={onDetail}
              onEdit={onEdit}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
            />
          ) : view === 'timeline' ? (
            <AmendmentTimeline
              rows={filtered}
              accent={accent}
              currency={currencyLabel}
              onView={onDetail}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ) : (
            <Grid container spacing={1.5}>
              {filtered.map((row, index) => (
                <Grid item xs={12} md={6} xl={4} key={row.id}>
                  <AmendmentCard
                    row={row}
                    index={index}
                    accent={accent}
                    currency={currencyLabel}
                    onView={() => onDetail(row)}
                    onEdit={() => onEdit(row)}
                    onDuplicate={() => onDuplicate(row)}
                    onDelete={() => onDelete(row)}
                  />
                </Grid>
              ))}
            </Grid>
          )}

          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} useFlexGap flexWrap="wrap">
            <Typography sx={{ fontSize: 9.2, color: theme.palette.text.secondary }}>
              نمایش {formatPersianNumber(filtered.length)} از {formatPersianNumber(list.length)} الحاقیه
            </Typography>
            <Typography sx={{ fontSize: 9.2, color: theme.palette.text.secondary }}>
              مبلغ پایه هرگز بازنویسی نمی‌شود؛ همهٔ اثرها مشتق‌شده و قابل برگشت‌اند.
            </Typography>
          </Stack>
        </Stack>
      </Grid>
    </Grid>
  );
};


const AddendumEditorDialog = ({
  open, onClose, form, setForm, step, setStep, steps, selectedSubjects,
  subjectOptions, filteredSubjectOptions, subjectSearch, setSubjectSearch,
  subjectGroup, setSubjectGroup, toggleSubject, updateSubjectFields, removeSubject,
  addProvision, updateProvision, removeProvision, preview, previewLoading,
  warnings, error, setError, onSave, saving, contract, accent, currencyLabel, currencyList,
}) => {
  const { theme, type } = useAddendumStyle();
  const subjectFor = (typeValue) => subjectOptions.find((item) => item.value === typeValue)
    || addendumSubject(typeValue)
    || { value: typeValue, label: typeValue, group: 'other', fields: [] };
  const selectedTypes = new Set(selectedSubjects.map((item) => item.type));
  const changed = new Set(preview?.changed || []);
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xl"
      PaperProps={{ sx: { borderRadius: { xs: 0, md: '18px' }, height: { xs: '100%', md: '92vh' }, overflow: 'hidden' } }}>
      <DialogTitle sx={{
        px: { xs: 1.5, md: 2.25 }, py: 1.4, borderBottom: `1px solid ${theme.palette.divider}`,
        display: 'flex', alignItems: 'center', gap: 1.25, bgcolor: theme.palette.background.paper,
      }}>
        <Box sx={{
          width: 38, height: 38, borderRadius: '11px', color: accent,
          bgcolor: alpha(accent, 0.08), border: `1px solid ${alpha(accent, 0.16)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <EditNoteIcon sx={{ fontSize: 20 }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: Math.max(type.cardSize - 1, 12.5), fontWeight: 900 }}>
            {form.id ? 'ویرایش الحاقیه' : 'ثبت الحاقیهٔ جدید'}
          </Typography>
          <Typography sx={{ fontSize: 9.5, color: theme.palette.text.secondary }}>
            {contract?.number ? `قرارداد ${contract.number} · ` : ''}{contract?.subject || 'پروندهٔ قرارداد'}
          </Typography>
        </Box>
        <Chip size="small" label={steps[step]?.title || ''} sx={{ fontWeight: 800, bgcolor: alpha(accent, 0.08), color: accent }} />
        <Tooltip title="بستن"><IconButton onClick={onClose}><CloseIcon /></IconButton></Tooltip>
      </DialogTitle>

      <DialogContent sx={{ p: 0, bgcolor: SOFT_BG, overflow: 'hidden' }}>
        <Grid container sx={{ height: '100%' }}>
          <Grid item xs={12} md={3} sx={{ borderLeft: { md: `1px solid ${theme.palette.divider}` }, p: { xs: 1.25, md: 1.5 }, overflowY: 'auto' }}>
            <Stack spacing={1.5}>
              <Paper elevation={0} sx={{ p: 1.25, borderRadius: '14px', border: `1px solid ${theme.palette.divider}`, bgcolor: theme.palette.background.paper }}>
                <InfoLine label="قرارداد" value={contract?.number || '—'} />
                <InfoLine label="مبلغ پایه" value={money(contract?.amount, currencyLabel)} ltr />
                <InfoLine label="مبلغ مؤثر" value={money(contract?.effective_amount, currencyLabel)} ltr strong />
              </Paper>
              <Paper elevation={0} sx={{ p: 1.1, borderRadius: '14px', border: `1px solid ${theme.palette.divider}`, bgcolor: theme.palette.background.paper }}>
                <EditorStepNav steps={steps} active={step} onChange={setStep} accent={accent} />
              </Paper>
              <Paper elevation={0} sx={{ p: 1.25, borderRadius: '14px', border: `1px solid ${theme.palette.divider}`, bgcolor: theme.palette.background.paper }}>
                <SectionTitle icon={TuneIcon} title="اثر زنده" hint={previewLoading ? 'در حال محاسبه...' : 'پیش از ذخیره'} color={accent} />
                {previewLoading ? <CircularProgress size={18} sx={{ color: accent }} /> : (
                  <Stack spacing={0.4}>
                    {!changed.size ? (
                      <Typography sx={{ fontSize: 9.2, color: theme.palette.text.secondary }}>هنوز اثر مالی ثبت نشده است.</Typography>
                    ) : Object.entries(CONTRACT_TARGET_LABELS).filter(([field]) => changed.has(field)).map(([field, label]) => (
                      <InfoLine key={field} label={label}
                        value={field === 'end_date' ? dateLabel(preview?.effective?.[field]) : money(preview?.effective?.[field], currencyLabel)}
                        ltr />
                    ))}
                  </Stack>
                )}
                {warnings.slice(0, 2).map((warning) => (
                  <Typography key={warning} sx={{ mt: 0.75, fontSize: 8.8, color: '#b45309', lineHeight: 1.6 }}>
                    ⚠ {warning}
                  </Typography>
                ))}
              </Paper>
            </Stack>
          </Grid>

          <Grid item xs={12} md={9} sx={{ p: { xs: 1.25, md: 2 }, overflowY: 'auto', height: '100%' }}>


            {step === 0 ? (
              <Paper elevation={0} sx={{ p: { xs: 1.5, md: 2 }, borderRadius: '16px', border: `1px solid ${theme.palette.divider}` }}>
                <SectionTitle icon={EditNoteIcon} title="اطلاعات پایه" hint="شماره، تاریخ و واحد ارز الحاقیه" color={accent} />
                <Grid container spacing={1.5}>
                  <Grid item xs={12} md={4}>
                    <TextField size="small" fullWidth label="شماره الحاقیه" value={form.number || ''}
                      onChange={(event) => setForm((previous) => ({ ...previous, number: event.target.value }))} />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <JalaliDatePicker fullWidth label="تاریخ الحاقیه" value={form.date || ''}
                      onChange={(value) => setForm((previous) => ({ ...previous, date: value }))} />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControl size="small" fullWidth>
                      <InputLabel>واحد ارز</InputLabel>
                      <Select value={form.currency || ''} label="واحد ارز"
                        onChange={(event) => setForm((previous) => ({ ...previous, currency: event.target.value }))}>
                        <MenuItem value="">—</MenuItem>
                        {currencyList.map((currency) => (
                          <MenuItem key={currency.id} value={currency.id}>
                            {normalizeCurrencyLabel(currency.name || currency.symbol)} ({currency.code})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField size="small" fullWidth label="شرح موضوع (اختیاری)" value={form.subject || ''}
                      onChange={(event) => setForm((previous) => ({ ...previous, subject: event.target.value }))} />
                  </Grid>
                </Grid>
                {contract ? (
                  <Box sx={{ mt: 1.5, p: 1.25, borderRadius: '12px', bgcolor: alpha(accent, 0.035), border: `1px solid ${alpha(accent, 0.12)}` }}>
                    <Typography sx={{ fontSize: 9.5, fontWeight: 800, mb: 0.5 }}>مرجع قرارداد</Typography>
                    <Grid container spacing={1}>
                      <Grid item xs={6} md={3}><InfoLine label="طرف" value={contract.party_name} /></Grid>
                      <Grid item xs={6} md={3}><InfoLine label="مبلغ پایه" value={money(contract.amount, currencyLabel)} ltr /></Grid>
                      <Grid item xs={6} md={3}><InfoLine label="پایان" value={dateLabel(contract.effective_end_date || contract.end_date)} /></Grid>
                      <Grid item xs={6} md={3}><InfoLine label="وضعیت" value={contract.status_display} /></Grid>
                    </Grid>
                  </Box>
                ) : null}
                {!form.date ? (
                  <Alert severity="info" sx={{ mt: 1.5, borderRadius: '10px', py: 0.2 }}>
                    <Typography sx={{ fontSize: 9.5 }}>تاریخ الحاقیه برای ترتیب اثرگذاری در پروندهٔ مؤثر الزامی است.</Typography>
                  </Alert>
                ) : null}
              </Paper>
            ) : null}


            {step === 1 ? (
              <Stack spacing={1.5}>
                <Paper elevation={0} sx={{ p: { xs: 1.5, md: 2 }, borderRadius: '16px', border: `1px solid ${theme.palette.divider}` }}>
                  <SectionTitle icon={AddCircleIcon} title="انتخاب موضوع‌های الحاقیه"
                    hint="می‌توانید چند موضوع را در یک الحاقیه ترکیب کنید"
                    action={<Chip size="small" label={`${formatPersianNumber(selectedSubjects.length)} انتخاب‌شده`} sx={{ fontWeight: 800, bgcolor: alpha(accent, 0.08), color: accent }} />}
                    color={accent} />
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center" sx={{ mb: 1.25 }}>
                    <TextField size="small" placeholder="جست‌وجوی موضوع..." value={subjectSearch}
                      onChange={(event) => setSubjectSearch(event.target.value)} sx={{ flex: 1, minWidth: 200 }}
                      InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
                    <ButtonBase onClick={() => setSubjectGroup('all')} sx={{
                      px: 1, py: 0.55, borderRadius: '8px', fontSize: 9.5, fontWeight: 800,
                      bgcolor: subjectGroup === 'all' ? alpha(accent, 0.08) : theme.palette.action.hover,
                      color: subjectGroup === 'all' ? accent : theme.palette.text.secondary,
                    }}>همه</ButtonBase>
                    {Object.entries(ADDENDUM_GROUPS).map(([key, label]) => (
                      <ButtonBase key={key} onClick={() => setSubjectGroup(key)} sx={{
                        px: 1, py: 0.55, borderRadius: '8px', fontSize: 9, fontWeight: 800,
                        bgcolor: subjectGroup === key ? alpha(groupTone(key), 0.1) : theme.palette.action.hover,
                        color: subjectGroup === key ? groupTone(key) : theme.palette.text.secondary,
                      }}>{label}</ButtonBase>
                    ))}
                  </Stack>
                  <Grid container spacing={1}>
                    {filteredSubjectOptions.map((option) => {
                      const selected = selectedTypes.has(option.value);
                      const tone = groupTone(option.group);
                      return (
                        <Grid item xs={12} sm={6} lg={4} key={option.value}>
                          <ButtonBase onClick={() => toggleSubject(option)} sx={{
                            width: '100%', height: '100%', p: 1.1, borderRadius: '11px', textAlign: 'right',
                            border: `1px solid ${selected ? alpha(tone, 0.45) : theme.palette.divider}`,
                            bgcolor: selected ? alpha(tone, 0.055) : theme.palette.background.paper,
                            display: 'block', '&:hover': { borderColor: alpha(tone, 0.45) },
                          }}>
                            <Stack direction="row" alignItems="flex-start" spacing={0.75}>
                              <Box sx={{
                                width: 26, height: 26, borderRadius: '8px', flexShrink: 0,
                                bgcolor: alpha(tone, 0.08), color: tone,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>
                                {selected ? <CheckCircleIcon sx={{ fontSize: 16 }} /> : <AddCircleIcon sx={{ fontSize: 16 }} />}
                              </Box>
                              <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Typography sx={{ fontSize: 9.8, fontWeight: 800, lineHeight: 1.55, color: theme.palette.text.primary }}>
                                  {option.label}
                                </Typography>
                                <Stack direction="row" spacing={0.6} useFlexGap flexWrap="wrap" sx={{ mt: 0.35 }}>
                                  <Typography sx={{ fontSize: 8.5, color: tone }}>{option.group_label}</Typography>
                                  <Typography sx={{ fontSize: 8.5, color: theme.palette.text.secondary }}>
                                    {formatPersianNumber((option.fields || []).length)} فیلد
                                  </Typography>
                                  {(option.fields || []).some((field) => field.effect) ? (
                                    <Typography sx={{ fontSize: 8.5, color: '#0f766e', fontWeight: 800 }}>اثرگذار</Typography>
                                  ) : null}
                                </Stack>
                              </Box>
                            </Stack>
                          </ButtonBase>
                        </Grid>
                      );
                    })}
                  </Grid>
                  {!filteredSubjectOptions.length ? (
                    <Typography sx={{ py: 2, textAlign: 'center', fontSize: 10, color: theme.palette.text.secondary }}>
                      موضوعی با این جست‌وجو پیدا نشد.
                    </Typography>
                  ) : null}
                </Paper>

                {!selectedSubjects.length ? (
                  <Alert severity="info" sx={{ borderRadius: '12px' }}>
                    <Typography sx={{ fontSize: 10 }}>با انتخاب موضوع‌ها، فیلدهای تخصصی و اثرشان روی پروندهٔ قرارداد نمایش داده می‌شود.</Typography>
                  </Alert>
                ) : (
                  <Stack spacing={1.25}>
                    {selectedSubjects.map((item) => (
                      <SubjectEditor
                        key={item.type}
                        item={item}
                        subject={subjectFor(item.type)}
                        onChangeFields={(fields) => updateSubjectFields(item.type, fields)}
                        onRemove={() => removeSubject(item.type)}
                      />
                    ))}
                  </Stack>
                )}
              </Stack>
            ) : null}


            {step === 2 ? (
              <Paper elevation={0} sx={{ p: { xs: 1.5, md: 2 }, borderRadius: '16px', border: `1px solid ${theme.palette.divider}` }}>
                <SectionTitle icon={EditNoteIcon} title="مفاد و بندهای الحاقیه"
                  hint="هر بند را با عنوان و متن دقیق ثبت کنید"
                  action={<Button size="small" startIcon={<AddCircleIcon />} onClick={addProvision}>افزودن بند</Button>}
                  color={accent} />
                {!(form.provisions || []).length ? (
                  <Alert severity="info" sx={{ borderRadius: '12px' }}>
                    <Typography sx={{ fontSize: 10 }}>بندی ثبت نشده است؛ می‌توانید متن کامل مفاد الحاقیه را در بخش «شرح تغییرات» مرحلهٔ بازبینی وارد کنید.</Typography>
                  </Alert>
                ) : (
                  <Stack spacing={1.1}>
                    {(form.provisions || []).map((provision, index) => (
                      <Paper key={index} elevation={0} sx={{
                        p: 1.25, borderRadius: '12px', border: `1px solid ${theme.palette.divider}`, bgcolor: SOFT_BG,
                      }}>
                        <Grid container spacing={1} alignItems="center">
                          <Grid item xs={12} sm={4}>
                            <TextField size="small" fullWidth label={`عنوان بند ${formatPersianNumber(index + 1)}`}
                              value={provision.title || ''} onChange={(event) => updateProvision(index, 'title', event.target.value)} />
                          </Grid>
                          <Grid item xs={12} sm={7}>
                            <TextField size="small" fullWidth label="متن بند" value={provision.text || ''}
                              onChange={(event) => updateProvision(index, 'text', event.target.value)} />
                          </Grid>
                          <Grid item xs={12} sm={1} sx={{ textAlign: 'left' }}>
                            <Tooltip title="حذف بند">
                              <IconButton size="small" color="error" onClick={() => removeProvision(index)}>
                                <RemoveCircleIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Grid>
                        </Grid>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Paper>
            ) : null}


            {step === 3 ? (
              <Stack spacing={1.5}>
                <Paper elevation={0} sx={{ p: { xs: 1.5, md: 2 }, borderRadius: '16px', border: `1px solid ${theme.palette.divider}` }}>
                  <SectionTitle icon={CheckCircleIcon} title="بازبینی نهایی" hint="خلاصهٔ الحاقیه و اثر آن بر پرونده" color={accent} />
                  <Grid container spacing={1.5}>
                    <Grid item xs={12} md={5}>
                      <InfoLine label="شماره" value={form.number || '—'} />
                      <InfoLine label="تاریخ" value={dateLabel(form.date)} />
                      <InfoLine label="واحد ارز" value={currencyLabel} />
                      <InfoLine label="تعداد موضوع" value={formatPersianNumber(selectedSubjects.length)} />
                      <InfoLine label="تعداد بند" value={formatPersianNumber((form.provisions || []).length)} />
                      <Divider sx={{ my: 1 }} />
                      <Stack direction="row" spacing={0.4} useFlexGap flexWrap="wrap">
                        {selectedSubjects.map((item) => <SubjectPill key={item.type} subject={subjectFor(item.type)} compact />)}
                      </Stack>
                    </Grid>
                    <Grid item xs={12} md={7}>
                      <Typography sx={{ fontSize: 9.5, fontWeight: 800, mb: 0.5 }}>اثر نهایی بر پروندهٔ قرارداد</Typography>
                      {previewLoading ? (
                        <Box sx={{ py: 3, textAlign: 'center' }}><CircularProgress size={22} sx={{ color: accent }} /></Box>
                      ) : preview ? (
                        <EffectTable effect={preview} compact currency={currencyLabel} />
                      ) : (
                        <Typography sx={{ fontSize: 9.5, color: theme.palette.text.secondary }}>هنوز پیش‌نمایشی محاسبه نشده است.</Typography>
                      )}
                    </Grid>
                  </Grid>
                  {warnings.map((warning) => (
                    <Alert key={warning} severity="warning" sx={{ mt: 1, borderRadius: '10px', py: 0.2 }}>
                      <Typography sx={{ fontSize: 9.5 }}>{warning}</Typography>
                    </Alert>
                  ))}
                </Paper>
                <Paper elevation={0} sx={{ p: { xs: 1.5, md: 2 }, borderRadius: '16px', border: `1px solid ${theme.palette.divider}` }}>
                  <Typography sx={{ fontSize: 9.5, fontWeight: 800, mb: 0.75 }}>شرح تغییرات</Typography>
                  <TextField size="small" fullWidth multiline rows={4} placeholder="خلاصهٔ تغییر، دلیل و مستندات پشتوانه..."
                    value={form.change_description || ''}
                    onChange={(event) => setForm((previous) => ({ ...previous, change_description: event.target.value }))} />
                </Paper>
                {error ? <Alert severity="error" onClose={() => setError('')}>{error}</Alert> : null}
              </Stack>
            ) : null}
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{
        px: { xs: 1.5, md: 2.25 }, py: 1.25, borderTop: `1px solid ${theme.palette.divider}`,
        bgcolor: theme.palette.background.paper, justifyContent: 'space-between',
      }}>
        <Button onClick={onClose} disabled={saving}>انصراف</Button>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<ArrowBackIcon />} disabled={step === 0 || saving}
            onClick={() => setStep((previous) => Math.max(0, previous - 1))}>
            مرحلهٔ قبل
          </Button>
          {step < steps.length - 1 ? (
            <Button variant="contained" endIcon={<ArrowForwardIcon />}
              onClick={() => setStep((previous) => Math.min(steps.length - 1, previous + 1))}>
              مرحلهٔ بعد
            </Button>
          ) : (
            <Button variant="contained" startIcon={<SaveIcon />} onClick={onSave} disabled={saving}>
              {saving ? <CircularProgress size={18} color="inherit" /> : 'ثبت الحاقیه'}
            </Button>
          )}
        </Stack>
      </DialogActions>
    </Dialog>
  );
};


const AddendumDetailDrawer = ({
  row, onClose, onEdit, onDuplicate, onDelete, accent, currencyLabel, subjectOptions,
}) => {
  const { theme } = useAddendumStyle();
  if (!row) return null;
  const subjectFor = (typeValue) => subjectOptions.find((item) => item.value === typeValue)
    || addendumSubject(typeValue)
    || { value: typeValue, label: typeValue, group: 'other', fields: [] };
  const subjects = rowSubjects(row, new Map(subjectOptions.map((item) => [item.value, item])));
  return (
    <Drawer anchor="right" open={Boolean(row)} onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 540 }, bgcolor: SOFT_BG } }}>
      <Stack sx={{ height: '100%' }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{
          p: 1.5, borderBottom: `1px solid ${theme.palette.divider}`, bgcolor: theme.palette.background.paper,
        }}>
          <Box sx={{
            width: 38, height: 38, borderRadius: '11px', color: accent,
            bgcolor: alpha(accent, 0.08), border: `1px solid ${alpha(accent, 0.16)}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><EditNoteIcon sx={{ fontSize: 20 }} /></Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 12.5, fontWeight: 900 }}>جزئیات الحاقیه</Typography>
            <Typography sx={{ fontSize: 9.5, color: theme.palette.text.secondary }}>
              {row.number || 'بدون شماره'} · {dateLabel(row.date)}
            </Typography>
          </Box>
          <IconButton onClick={onClose}><CloseIcon /></IconButton>
        </Stack>
        <Box sx={{ p: 1.5, overflowY: 'auto', flex: 1 }}>
          <Stack spacing={1.5}>
            <Paper elevation={0} sx={{ p: 1.5, borderRadius: '14px', border: `1px solid ${theme.palette.divider}` }}>
              <Stack direction="row" spacing={0.4} useFlexGap flexWrap="wrap" sx={{ mb: 1 }}>
                {subjects.map((item) => <SubjectPill key={item.type} subject={item} />)}
              </Stack>
              <InfoLine label="تاریخ" value={dateLabel(row.date)} />
              <InfoLine label="واحد ارز" value={normalizeCurrencyLabel(row.currency_name || row.currency_symbol || currencyLabel)} />
              <InfoLine label="تعداد اثر" value={formatPersianNumber((row.effect?.changes || []).length)} />
              <InfoLine label="تعداد بند" value={formatPersianNumber((row.provisions || []).length)} />
            </Paper>

            {subjects.map((subject) => {
              const spec = subjectFor(subject.type);
              const values = (row.subjects || []).find((item) => item.type === subject.type)?.fields || {};
              const filled = (spec.fields || []).filter((field) => values[field.key] !== '' && values[field.key] != null);
              return (
                <Paper key={subject.type} elevation={0} sx={{ p: 1.5, borderRadius: '14px', border: `1px solid ${theme.palette.divider}` }}>
                  <SectionTitle title={spec.label} hint={spec.group_label} color={groupTone(spec.group)} />
                  {!filled.length ? (
                    <Typography sx={{ fontSize: 9.5, color: theme.palette.text.secondary }}>فیلد تخصصی پر نشده است.</Typography>
                  ) : filled.map((field) => (
                    <InfoLine key={field.key} label={field.label}
                      value={fieldValue(field, values[field.key], currencyLabel)}
                      ltr={['money', 'number', 'int'].includes(field.type)} />
                  ))}
                </Paper>
              );
            })}


            <Paper elevation={0} sx={{ p: 1.5, borderRadius: '14px', border: `1px solid ${theme.palette.divider}` }}>
              <SectionTitle title="اثر اعمال‌شده" hint="این الحاقیه روی پروندهٔ قرارداد" color="#0f766e" />
              {!(row.effect?.changes || []).length ? (
                <Typography sx={{ fontSize: 9.5, color: theme.palette.text.secondary }}>این الحاقیه اثر مالی مستقیم ندارد.</Typography>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {['مورد', 'از', 'به', 'تغییر'].map((label) => (
                        <TableCell key={label} sx={{ fontSize: 9, fontWeight: 900, color: theme.palette.text.secondary }}>{label}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(row.effect.changes || []).map((change) => {
                      const isDate = change.field === 'end_date';
                      const delta = isDate ? dayDiff(change.from, change.to) : toNumber(change.to) - toNumber(change.from);
                      return (
                        <TableRow key={`${change.field}-${change.source_field}`}>
                          <TableCell sx={{ fontSize: 9 }}>{change.label || CONTRACT_TARGET_LABELS[change.field] || change.field}</TableCell>
                          <TableCell sx={{ fontSize: 9, color: theme.palette.text.secondary }}>
                            {isDate ? dateLabel(change.from) : money(change.from, currencyLabel)}
                          </TableCell>
                          <TableCell sx={{ fontSize: 9, fontWeight: 800 }}>
                            {isDate ? dateLabel(change.to) : money(change.to, currencyLabel)}
                          </TableCell>
                          <TableCell sx={{ fontSize: 9, fontWeight: 800, color: '#0f766e' }}>
                            {isDate ? `${delta > 0 ? '+' : ''}${formatPersianNumber(delta)} روز` : signedMoney(delta, currencyLabel)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </Paper>

            {(row.provisions || []).length ? (
              <Paper elevation={0} sx={{ p: 1.5, borderRadius: '14px', border: `1px solid ${theme.palette.divider}` }}>
                <SectionTitle title="بندهای الحاقیه" color="#7c3aed" />
                <Stack spacing={1}>
                  {row.provisions.map((provision, index) => (
                    <Box key={index}>
                      <Typography sx={{ fontSize: 9.8, fontWeight: 800 }}>
                        {formatPersianNumber(index + 1)}. {provision.title || 'بدون عنوان'}
                      </Typography>
                      <Typography sx={{ fontSize: 9.2, color: theme.palette.text.secondary, lineHeight: 1.8 }}>
                        {provision.text || '—'}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Paper>
            ) : null}

            {row.change_description ? (
              <Paper elevation={0} sx={{ p: 1.5, borderRadius: '14px', border: `1px solid ${theme.palette.divider}` }}>
                <SectionTitle title="شرح تغییرات" color="#b45309" />
                <Typography sx={{ fontSize: 9.5, color: theme.palette.text.secondary, lineHeight: 1.9 }}>{row.change_description}</Typography>
              </Paper>
            ) : null}
          </Stack>
        </Box>
        <Stack direction="row" spacing={0.75} sx={{ p: 1.5, borderTop: `1px solid ${theme.palette.divider}`, bgcolor: theme.palette.background.paper }}>
          <Button fullWidth variant="contained" startIcon={<EditIcon />} onClick={() => onEdit(row)}>ویرایش</Button>
          <Button variant="outlined" startIcon={<ContentCopyIcon />} onClick={() => onDuplicate(row)}>کپی</Button>
          <Button color="error" variant="outlined" onClick={() => onDelete(row)}><DeleteIcon fontSize="small" /></Button>
        </Stack>
      </Stack>
    </Drawer>
  );
};

export default ContractAddendumsPage;

