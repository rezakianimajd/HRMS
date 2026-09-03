import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Button, Grid, CircularProgress, Alert, Paper,
  FormControl, InputLabel, Select, MenuItem, TextField, Chip,
  IconButton, Avatar, Dialog, DialogTitle, DialogContent, DialogActions, Stack,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import PersonIcon from '@mui/icons-material/Person';
import ContactPhoneIcon from '@mui/icons-material/ContactPhone';
import WorkOutlineIcon from '@mui/icons-material/WorkOutline';
import AssessmentIcon from '@mui/icons-material/Assessment';
import DescriptionIcon from '@mui/icons-material/Description';
import WorkHistoryIcon from '@mui/icons-material/WorkHistory';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import axiosInstance from '../core/api/axiosConfig';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';
import {
  useEmployee, useCreateEmployee, useUpdateEmployee,
  useDepartments, useJobTitles, useWorkLocations, useInsuranceLists, useContractTypes,
} from '../core/hooks/useEmployees';
import { useDocumentTypes, useUploadDocument, useDocuments, useDeleteDocument } from '../core/hooks/useDocuments';

const EMPTY_FORM = {
  first_name: '', last_name: '', national_id: '', birth_date: '', birth_place: '',
  gender: '', marital_status: '', children_count: 0, spouse_name: '',
  father_name: '', birth_certificate_number: '',
  national_id_serial: '', national_id_place: '', national_id_date: '',
  phone: '', mobile: '', email: '', address: '', postal_code: '',
  emergency_contact_name: '', emergency_contact_phone: '',
  employee_id: '', hire_date: '', probation_end_date: '', official_date: '',
  department: '', job_title: '', work_location: '', insurance_list: '',
  insurance_number: '',
  contract_type: '', contract_start_date: '', contract_end_date: '',
  status: 'active', status_change_date: '', work_shift: '',
  work_start_time: '', work_end_time: '', description: '',
  education_level: '', education_field: '', education_place: '', university_type: '',
  distance_to_work_km: 0,
  housing_type: '', has_car: false,
  performance_score: '', satisfaction_score: '',
  bank_name: '', account_number: '', sheba_number: '',
};

const SectionCard = ({ title, icon, color, children }) => (
  <Paper sx={{
    mb: 2, overflow: 'hidden',
    background: `linear-gradient(135deg, ${color}0d, ${color}04)`,
    border: `1px solid ${color}20`,
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    borderRadius: 3,
  }}>
    <Box sx={{
      px: 2.5, py: 1.5,
      borderBottom: `1px solid ${color}20`,
      background: `linear-gradient(135deg, ${color}14, ${color}06)`,
      display: 'flex', alignItems: 'center', gap: 1.5,
    }}>
      <Avatar sx={{ width: 32, height: 32, background: `linear-gradient(135deg, ${color}, ${color}90)`, boxShadow: `0 2px 8px ${color}40` }}>
        {icon}
      </Avatar>
      <Typography variant="subtitle1" fontWeight={700} sx={{ color }}>{title}</Typography>
    </Box>
    <Box sx={{ p: 2.5 }}>{children}</Box>
  </Paper>
);

const selectField = (label, field, value, onChange, options = []) => (
  <Grid item xs={12} sm={6} md={4}>
    <FormControl fullWidth size="small">
      <InputLabel>{label}</InputLabel>
      <Select value={value || ''} label={label} onChange={e => onChange(field, e.target.value)}>
        {options.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
      </Select>
    </FormControl>
  </Grid>
);

const textField = (label, field, value, onChange, required = false, type = 'text') => (
  <Grid item xs={12} sm={6} md={4}>
    <TextField fullWidth size="small" label={label} type={type}
      value={value || ''}
      onChange={e => onChange(field, e.target.value)}
      required={required} />
  </Grid>
);

const timeField = (label, field, value, onChange) => (
  <Grid item xs={12} sm={6} md={4}>
    <TextField
      fullWidth size="small" label={label}
      placeholder="۰۸:۰۰"
      value={value || ''}
      onChange={e => {
        let v = e.target.value.replace(/[^\d:]/g, '');
        if (v.length === 2 && !v.includes(':') && e.target.value.length > 2) v = v + ':';
        onChange(field, v.slice(0, 5));
      }}
      inputProps={{ maxLength: 5, inputMode: 'numeric' }}
      helperText="فرمت ۲۴ ساعته، مثال ۰۸:۰۰ یا ۱۴:۳۰"
    />
  </Grid>
);

const dateField = (label, field, value, onChange) => (
  <Grid item xs={12} sm={6} md={4}>
    <JalaliDatePicker fullWidth label={label} value={value}
      onChange={gregorian => onChange(field, gregorian)} />
  </Grid>
);

const EmployeeForm = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const { data: employee, isLoading: loadingEmployee } = useEmployee(id);
  const { data: departments } = useDepartments();
  const { data: jobTitles } = useJobTitles();
  const { data: workLocations } = useWorkLocations();
  const { data: insuranceLists } = useInsuranceLists();
  const { data: contractTypes } = useContractTypes();
  const { data: docTypes } = useDocumentTypes();
  const { data: existingDocs } = useDocuments(id);
  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee();
  const uploadDocMutation = useUploadDocument();
  const deleteDocMutation = useDeleteDocument();

  const [pendingFiles, setPendingFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [workExperiences, setWorkExperiences] = useState([]);
  const [expDialogOpen, setExpDialogOpen] = useState(false);
  const [expForm, setExpForm] = useState({ id: null, company_name: '', job_title: '', start_date: '', end_date: '', description: '' });

  const queryClient = useQueryClient();

  // Work experiences are loaded separately so edit mode always shows fresh data
  const { data: existingExperiences } = useQuery({
    queryKey: ['work-experiences', id],
    queryFn: () => axiosInstance.get(`/work-experiences/?employee_id=${id}`).then(r => r.data),
    enabled: !!id,
    staleTime: 0,
  });

  useEffect(() => {
    if (employee) setForm(prev => ({ ...prev, ...employee }));
  }, [employee]);

  useEffect(() => {
    if (existingExperiences) {
      const list = Array.isArray(existingExperiences) ? existingExperiences : existingExperiences?.results || [];
      setWorkExperiences(list.map(x => ({
        id: x.id,
        company_name: x.company_name,
        job_title: x.job_title,
        start_date: x.start_date,
        end_date: x.end_date,
        description: x.description,
      })));
    }
  }, [existingExperiences]);

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const totalDocTypes = (docTypes || []).length;
  const filledDocTypes = (docTypes || []).filter(dt =>
    (existingDocs || []).some(d => d.document_type === dt.id) ||
    pendingFiles.some(f => f.docType === dt.id)
  ).length;

  const handleSubmit = async () => {
    setError('');
    setSubmitting(true);
    try {
      let empId = id;
      if (isEdit) {
        if (photo) {
          const fd = new FormData();
          Object.entries(form).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') fd.append(k, v); });
          fd.append('photo', photo);
          await updateMutation.mutateAsync({ id, data: fd });
        } else {
          await updateMutation.mutateAsync({ id, data: { ...form, photo: undefined } });
        }
      } else {
        if (photo) {
          const fd = new FormData();
          Object.entries(form).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') fd.append(k, v); });
          fd.append('photo', photo);
          const result = await createMutation.mutateAsync(fd);
          empId = result.id;
        } else {
          const result = await createMutation.mutateAsync(form);
          empId = result.id;
        }
      }

      if (pendingFiles.length > 0 && empId) {
        setUploading(true);
        for (const f of pendingFiles) {
          const fd = new FormData();
          fd.append('employee', empId);
          fd.append('title', f.name);
          fd.append('document_type', f.docType || '');
          fd.append('file', f);
          await uploadDocMutation.mutateAsync(fd);
        }
        setUploading(false);
      }

      if (empId) {
        for (const exp of workExperiences.filter(x => !x.id)) {
          await axiosInstance.post('/work-experiences/', {
            employee: empId,
            company_name: exp.company_name,
            job_title: exp.job_title,
            start_date: exp.start_date,
            end_date: exp.end_date || null,
            description: exp.description || '',
          });
        }
        for (const exp of workExperiences.filter(x => x.id)) {
          await axiosInstance.patch(`/work-experiences/${exp.id}/`, {
            company_name: exp.company_name,
            job_title: exp.job_title,
            start_date: exp.start_date,
            end_date: exp.end_date || null,
            description: exp.description || '',
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['employee', empId] });
      queryClient.invalidateQueries({ queryKey: ['work-experiences', empId] });

      setSuccess(true);
      setTimeout(() => navigate(`/employees/${empId}`), 1200);
    } catch (err) {
      setError(err.response?.data?.detail || t('employees.save_error'));
    } finally {
      setSubmitting(false);
    }
  };

  const removePendingFile = (index) => setPendingFiles(prev => prev.filter((_, i) => i !== index));
  const handleDeleteDoc = (docId) => { if (window.confirm(t('documents.delete_confirm'))) deleteDocMutation.mutate(docId); };

  const GENDERS = [{ value: 'male', label: t('employees.male') }, { value: 'female', label: t('employees.female') }];
  const MARITAL = [{ value: 'single', label: t('employees.single') }, { value: 'married', label: t('employees.married') }, { value: 'divorced', label: t('employees.divorced') }, { value: 'widowed', label: t('employees.widowed') }];
  const CONTRACT = (Array.isArray(contractTypes) ? contractTypes : []).map(ct => ({ value: ct.id, label: ct.name }));
  const STATUSES = [{ value: 'active', label: t('employees.active') }, { value: 'leave', label: t('employees.on_leave') }, { value: 'retired', label: t('employees.retired') }, { value: 'terminated', label: t('employees.terminated') }, { value: 'deceased', label: t('employees.deceased') }];
  const SHIFTS = [{ value: 'morning', label: t('employees.morning') }, { value: 'evening', label: t('employees.evening') }, { value: 'rotating', label: t('employees.rotating') }, { value: 'irregular', label: t('employees.irregular') }];
  const mapOpts = (data) => Array.isArray(data) ? data.map(d => ({ value: d.id, label: d.name })) : [];

  if (loadingEmployee) return <Box sx={{ textAlign: 'center', p: 6 }}><CircularProgress /></Box>;

  if (success) {
    return (
      <Box sx={{ textAlign: 'center', p: 8 }}>
        <CheckCircleIcon sx={{ fontSize: 72, color: 'success.main', mb: 2 }} />
        <Typography variant="h4" color="success.main" fontWeight={800}>✅ {t('employees.save_success')}</Typography>
        <Typography color="textSecondary">در حال انتقال به پرونده پرسنلی...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/employees')}>{t('common.back')}</Button>
        <Typography variant="h5" fontWeight={800}>{isEdit ? t('employees.edit_employee') : t('employees.add_employee')}</Typography>
        <Box sx={{ width: 100 }} />
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      <SectionCard title="اطلاعات فردی و هویتی" icon={<PersonIcon sx={{ color: '#fff', fontSize: 18 }} />} color="#6366f1">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, p: 2, bgcolor: 'rgba(99,102,241,0.04)', borderRadius: 2 }}>
          <Avatar src={photoPreview || form.photo_url || undefined} sx={{
            width: 80, height: 80, fontSize: 32, fontWeight: 800,
            background: 'linear-gradient(135deg, #6366f1, #ec4899)',
            boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
          }}>
            {!photoPreview && !form.photo_url && (form.first_name?.charAt(0) || '؟')}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5 }}>عکس پرسنلی</Typography>
            <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 1 }}>
              عکس در پرونده، لیست پرسنل و دفترچه تلفن نمایش داده می‌شود.
            </Typography>
            <input id="employee-photo-input" type="file" accept="image/*" hidden onChange={handlePhotoChange} />
            <Button variant="outlined" size="small" startIcon={<CloudUploadIcon />}
              onClick={() => document.getElementById('employee-photo-input').click()}>
              {photoPreview || form.photo_url ? 'تغییر عکس' : 'آپلود عکس'}
            </Button>
          </Box>
        </Box>

        <Grid container spacing={2}>
          {textField(t('employees.first_name'), 'first_name', form.first_name, handleChange, true)}
          {textField(t('employees.last_name'), 'last_name', form.last_name, handleChange, true)}
          {textField(t('employees.national_id'), 'national_id', form.national_id, handleChange, true)}
          {dateField(t('employees.birth_date'), 'birth_date', form.birth_date, handleChange)}
          {textField(t('employees.birth_place'), 'birth_place', form.birth_place, handleChange)}
          {selectField('میزان تحصیلات', 'education_level', form.education_level, handleChange, [
            { value: 'under_diploma', label: 'زیر دیپلم' },
            { value: 'diploma', label: 'دیپلم' },
            { value: 'associate', label: 'کاردانی' },
            { value: 'bachelor', label: 'کارشناسی' },
            { value: 'master', label: 'کارشناسی ارشد' },
            { value: 'phd', label: 'دکتری' },
          ])}
          {textField('رشته / مدرک تحصیلی', 'education_field', form.education_field, handleChange)}
          {selectField(t('employees.gender'), 'gender', form.gender, handleChange, GENDERS)}
          {selectField(t('employees.marital_status'), 'marital_status', form.marital_status, handleChange, MARITAL)}
          {textField(t('employees.children_count'), 'children_count', form.children_count, handleChange, false, 'number')}
          {textField(t('employees.spouse_name'), 'spouse_name', form.spouse_name, handleChange)}
          {textField('نام پدر', 'father_name', form.father_name, handleChange)}
          {textField('شماره شناسنامه', 'birth_certificate_number', form.birth_certificate_number, handleChange)}
          {textField(t('employees.national_id_serial'), 'national_id_serial', form.national_id_serial, handleChange)}
          {textField(t('employees.national_id_place'), 'national_id_place', form.national_id_place, handleChange)}
          {dateField(t('employees.national_id_date'), 'national_id_date', form.national_id_date, handleChange)}
          {textField('محل اخذ مدرک تحصیلی', 'education_place', form.education_place, handleChange)}
          {selectField('نوع دانشگاه', 'university_type', form.university_type, handleChange, [
            { value: 'state', label: 'دولتی' },
            { value: 'azad', label: 'آزاد' },
            { value: 'payam_noor', label: 'پیام نور' },
            { value: 'nonprofit', label: 'غیرانتفاعی' },
            { value: 'technical', label: 'فنی و حرفه‌ای' },
            { value: 'other', label: 'سایر' },
          ])}
        </Grid>
      </SectionCard>

      <SectionCard title="اطلاعات تماس و آدرس" icon={<ContactPhoneIcon sx={{ color: '#fff', fontSize: 18 }} />} color="#10b981">
        <Grid container spacing={2}>
          {textField(t('employees.mobile'), 'mobile', form.mobile, handleChange, true)}
          {textField(t('employees.phone'), 'phone', form.phone, handleChange)}
          {textField(t('employees.email'), 'email', form.email, handleChange)}
          <Grid item xs={12}>
            <TextField fullWidth size="small" label={t('employees.address')} value={form.address || ''}
              onChange={e => handleChange('address', e.target.value)} multiline rows={2} />
          </Grid>
          {textField('شهر', 'city', form.city, handleChange)}
          {textField(t('employees.postal_code'), 'postal_code', form.postal_code, handleChange)}
          {textField(t('employees.emergency_contact_name'), 'emergency_contact_name', form.emergency_contact_name, handleChange)}
          {textField(t('employees.emergency_contact_phone'), 'emergency_contact_phone', form.emergency_contact_phone, handleChange)}
        </Grid>
      </SectionCard>

      <SectionCard title="اطلاعات شغلی و استخدام" icon={<WorkOutlineIcon sx={{ color: '#fff', fontSize: 18 }} />} color="#f59e0b">
        <Grid container spacing={2}>
          {textField(t('employees.employee_id'), 'employee_id', form.employee_id, handleChange, true)}
          {dateField(t('employees.hire_date'), 'hire_date', form.hire_date, handleChange)}
          {dateField(t('employees.probation_end_date'), 'probation_end_date', form.probation_end_date, handleChange)}
          {dateField(t('employees.official_date'), 'official_date', form.official_date, handleChange)}
          {selectField(t('employees.department'), 'department', form.department, handleChange, mapOpts(departments))}
          {selectField(t('employees.job_title'), 'job_title', form.job_title, handleChange, mapOpts(jobTitles))}
          {selectField(t('employees.work_location'), 'work_location', form.work_location, handleChange, mapOpts(workLocations))}
          {selectField(t('employees.insurance_list'), 'insurance_list', form.insurance_list, handleChange, mapOpts(insuranceLists))}
          {textField('شماره بیمه', 'insurance_number', form.insurance_number, handleChange)}
          {selectField(t('employees.contract_type'), 'contract_type', form.contract_type, handleChange, CONTRACT)}
          {dateField(t('employees.contract_start_date'), 'contract_start_date', form.contract_start_date, handleChange)}
          {dateField(t('employees.contract_end_date'), 'contract_end_date', form.contract_end_date, handleChange)}
          {selectField(t('employees.status'), 'status', form.status, handleChange, STATUSES)}
          {dateField(t('employees.status_change_date'), 'status_change_date', form.status_change_date, handleChange)}
          {selectField(t('employees.work_shift'), 'work_shift', form.work_shift, handleChange, SHIFTS)}
          {timeField('ساعت شروع کار', 'work_start_time', form.work_start_time, handleChange)}
          {timeField('ساعت پایان کار', 'work_end_time', form.work_end_time, handleChange)}
          <Grid item xs={12}>
            <TextField fullWidth size="small" label={t('employees.description')} multiline rows={3}
              value={form.description || ''} onChange={e => handleChange('description', e.target.value)} />
          </Grid>
        </Grid>
      </SectionCard>

      <SectionCard title="ارزیابی و امتیازدهی" icon={<AssessmentIcon sx={{ color: '#fff', fontSize: 18 }} />} color="#3b82f6">
        <Grid container spacing={2}>
          {textField('مسافت خانه تا محل کار (کیلومتر)', 'distance_to_work_km', form.distance_to_work_km, handleChange, false, 'number')}
          {selectField('نوع مسکن', 'housing_type', form.housing_type, handleChange, [
            { value: 'owned', label: 'شخصی' },
            { value: 'mortgage', label: 'رهن' },
            { value: 'rental', label: 'اجاره' },
          ])}
          {selectField('خودروی شخصی', 'has_car', form.has_car ? 'true' : 'false', (f, v) => handleChange(f, v === 'true'), [
            { value: 'true', label: 'دارد' },
            { value: 'false', label: 'ندارد' },
          ])}
          {textField('نمره عملکرد (۰-۱۰۰)', 'performance_score', form.performance_score, handleChange, false, 'number')}
          {textField('نمره رضایت شغلی (۰-۱۰۰)', 'satisfaction_score', form.satisfaction_score, handleChange, false, 'number')}
        </Grid>
      </SectionCard>

      <SectionCard title="اطلاعات بانکی" icon={<AccountBalanceIcon sx={{ color: '#fff', fontSize: 18 }} />} color="#0ea5e9">
        <Grid container spacing={2}>
          {textField('بانک', 'bank_name', form.bank_name, handleChange)}
          {textField('شماره حساب', 'account_number', form.account_number, handleChange)}
          {textField('شماره شبا', 'sheba_number', form.sheba_number, handleChange)}
        </Grid>
      </SectionCard>

      <SectionCard title="سوابق کاری پیشین" icon={<WorkHistoryIcon sx={{ color: '#fff', fontSize: 18 }} />} color="#14b8a6">
        <Box sx={{ mb: 2 }}>
          {workExperiences.length === 0 ? (
            <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 2 }}>سابقه کاری ثبت نشده است</Typography>
          ) : (
            <Stack spacing={1} sx={{ mb: 2 }}>
              {workExperiences.map((exp, i) => (
                <Paper key={exp.id || i} variant="outlined" sx={{ p: 1.5, display: 'flex', gap: 1.5, alignItems: 'center' }}>
                  <Avatar sx={{ width: 34, height: 34, background: 'linear-gradient(135deg, #14b8a6, #0ea5e9)', fontSize: 14 }}>
                    <WorkHistoryIcon sx={{ fontSize: 18, color: '#fff' }} />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight={700}>{exp.company_name}</Typography>
                    <Typography variant="caption" color="textSecondary" display="block">
                      {exp.job_title || '—'}
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => {
                      setExpForm({ id: exp.id || null, company_name: exp.company_name, job_title: exp.job_title, start_date: exp.start_date, end_date: exp.end_date, description: exp.description });
                      setExpDialogOpen(true);
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small" color="error"
                    onClick={async () => {
                      if (exp.id && window.confirm('حذف این سابقه کاری؟')) {
                        await axiosInstance.delete(`/work-experiences/${exp.id}/`);
                      }
                      setWorkExperiences(prev => prev.filter(x => (x.id || x) !== (exp.id || exp)));
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Paper>
              ))}
            </Stack>
          )}
          <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={() => { setExpDialogOpen(true); setExpForm({ company_name: '', job_title: '', start_date: '', end_date: '', description: '' }); }}>
            افزودن سابقه کاری
          </Button>
        </Box>
      </SectionCard>

      <SectionCard title="مدارک پرسنلی" icon={<DescriptionIcon sx={{ color: '#fff', fontSize: 18 }} />} color="#ec4899">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, p: 1.5, bgcolor: 'rgba(236,72,153,0.05)', borderRadius: 2 }}>
          <Typography variant="body2">
            {filledDocTypes} از {totalDocTypes} مدرک بارگذاری شده
          </Typography>
          <Box sx={{ flex: 1, height: 6, bgcolor: 'rgba(236,72,153,0.15)', borderRadius: 3 }}>
            <Box sx={{ width: `${totalDocTypes ? (filledDocTypes / totalDocTypes) * 100 : 0}%`, height: 6, bgcolor: '#ec4899', borderRadius: 3, transition: 'width 0.3s' }} />
          </Box>
        </Box>

        <Grid container spacing={2}>
          {docTypes && docTypes.length > 0 ? (
            docTypes.map((dt) => {
              const existingByType = (existingDocs || []).filter(d => d.document_type === dt.id);
              const pendingByType = pendingFiles.filter(f => f.docType === dt.id);
              const hasAny = existingByType.length > 0 || pendingByType.length > 0;
              return (
                <Grid item xs={12} sm={6} md={4} key={dt.id}>
                  <Paper sx={{
                    p: 2, height: '100%',
                    background: hasAny ? 'linear-gradient(160deg, rgba(16,185,129,0.08), rgba(255,255,255,0.4))' : 'linear-gradient(160deg, rgba(99,102,241,0.06), rgba(255,255,255,0.4))',
                    border: hasAny ? '1px solid rgba(16,185,129,0.35)' : '1px dashed rgba(99,102,241,0.4)',
                    backdropFilter: 'blur(10px)', borderRadius: 2.5,
                    transition: 'all 0.2s ease',
                    '&:hover': { borderColor: hasAny ? '#10b981' : 'primary.main' },
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="subtitle2" fontWeight={700}>{dt.name}</Typography>
                      <Chip size="small" label={hasAny ? 'بارگذاری شده' : 'در انتظار'}
                        icon={hasAny ? <CheckCircleIcon /> : <RadioButtonUncheckedIcon />}
                        color={hasAny ? 'success' : 'default'} variant="outlined" />
                    </Box>

                    {existingByType.map(doc => (
                      <Box key={doc.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <InsertDriveFileIcon fontSize="small" color="primary" />
                        <Typography variant="caption" sx={{ flexGrow: 1, wordBreak: 'break-all' }}>{doc.title}</Typography>
                        <IconButton size="small" color="error" onClick={() => handleDeleteDoc(doc.id)}><CloseIcon fontSize="small" /></IconButton>
                      </Box>
                    ))}

                    {pendingByType.map((f, i) => (
                      <Box key={`p-${i}`} sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <InsertDriveFileIcon fontSize="small" color="secondary" />
                        <Typography variant="caption" sx={{ flexGrow: 1, wordBreak: 'break-all' }}>{f.name}</Typography>
                        <IconButton size="small" color="error" onClick={() => removePendingFile(pendingFiles.indexOf(f))}><CloseIcon fontSize="small" /></IconButton>
                      </Box>
                    ))}

                    <Button size="small" variant="outlined" startIcon={<CloudUploadIcon />}
                      onClick={() => document.getElementById(`doc-type-${dt.id}`).click()} sx={{ mt: 1 }}>
                      {hasAny ? 'تغییر مدرک' : 'بارگذاری مدرک'}
                    </Button>
                    <input id={`doc-type-${dt.id}`} type="file" hidden
                      onChange={e => {
                        const f = e.target.files[0];
                        if (!f) return;
                        setPendingFiles(prev => [...prev, Object.assign(f, { docType: dt.id })]);
                      }} />
                  </Paper>
                </Grid>
              );
            })
          ) : (
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="body2" color="textSecondary">
                  هنوز انواع مدرکی تعریف نشده است. ابتدا در «تعاریف اولیه → انواع مدارک» تعریف کنید.
                </Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      </SectionCard>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
        <Button variant="outlined" onClick={() => navigate('/employees')}>{t('common.cancel')}</Button>
        <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSubmit} disabled={submitting || uploading}
          sx={{ background: 'linear-gradient(135deg, #10b981, #059669)', px: 4, py: 1 }}>
          {(submitting || uploading) ? <CircularProgress size={20} /> : t('common.save')}
        </Button>
      </Box>

      <Dialog open={expDialogOpen} onClose={() => setExpDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: '#14b8a6' }}>{expForm.id ? 'ویرایش سابقه کاری' : 'افزودن سابقه کاری'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <TextField fullWidth size="small" label="نام شرکت / سازمان" value={expForm.company_name || ''}
            onChange={e => setExpForm(p => ({ ...p, company_name: e.target.value }))} required />
          <TextField fullWidth size="small" label="عنوان شغلی" value={expForm.job_title || ''}
            onChange={e => setExpForm(p => ({ ...p, job_title: e.target.value }))} />
          <JalaliDatePicker fullWidth label="تاریخ شروع" value={expForm.start_date}
            onChange={g => setExpForm(p => ({ ...p, start_date: g }))} />
          <JalaliDatePicker fullWidth label="تاریخ پایان (خالی = تاکنون/قبل از استخدام)" value={expForm.end_date}
            onChange={g => setExpForm(p => ({ ...p, end_date: g }))} />
          <TextField fullWidth size="small" label="شرح وظایف" multiline rows={2} value={expForm.description || ''}
            onChange={e => setExpForm(p => ({ ...p, description: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExpDialogOpen(false)}>انصراف</Button>
          <Button variant="contained" sx={{ background: '#14b8a6' }}
            onClick={() => {
              if (!expForm.company_name || !expForm.start_date) return;
              if (expForm.id) {
                setWorkExperiences(prev => prev.map(x => x.id === expForm.id ? { ...expForm } : x));
              } else {
                setWorkExperiences(prev => [...prev, { ...expForm }]);
              }
              setExpDialogOpen(false);
            }}>
            {expForm.id ? 'ذخیره تغییرات' : 'افزودن'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EmployeeForm;