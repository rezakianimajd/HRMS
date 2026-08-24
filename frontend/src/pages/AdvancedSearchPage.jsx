import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, TextField, InputAdornment, Paper, Tabs, Tab, CircularProgress,
  Grid, Card, CardContent, Avatar, Chip, Button, Collapse, FormControl,
  InputLabel, Select, MenuItem, Divider, IconButton, Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import BadgeIcon from '@mui/icons-material/Badge';
import DescriptionIcon from '@mui/icons-material/Description';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import BusinessIcon from '@mui/icons-material/Business';
import WorkIcon from '@mui/icons-material/Work';
import { useDepartments, useJobTitles, useWorkLocations } from '../core/hooks/useEmployees';
import { useDocumentTypes } from '../core/hooks/useDocuments';
import { toJalali } from '../core/utils/dateUtils';

const avatarColors = [
  'linear-gradient(135deg, #6366f1, #8b5cf6)', 'linear-gradient(135deg, #ec4899, #f472b6)',
  'linear-gradient(135deg, #10b981, #34d399)', 'linear-gradient(135deg, #f59e0b, #fbbf24)',
  'linear-gradient(135deg, #3b82f6, #60a5fa)', 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
];
const getAvatarColor = (name) => {
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
};

const AdvancedSearchPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    department: '', job_title: '', work_location: '', gender: '',
    marital_status: '', status: '', document_type: '',
  });

  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => { const tm = setTimeout(() => setDebouncedQuery(query), 400); return () => clearTimeout(tm); }, [query]);

  const { data: departments } = useDepartments();
  const { data: jobTitles } = useJobTitles();
  const { data: workLocations } = useWorkLocations();
  const { data: docTypes } = useDocumentTypes();

  // Build request payload
  const payload = {
    query: debouncedQuery,
    filters: Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== '')),
    type: tab === 0 ? 'employees' : 'documents',
  };

  const { data, isLoading } = useQuery({
    queryKey: ['advanced-search', payload],
    queryFn: () => axiosInstance.post('/search/', payload).then(r => r.data),
    enabled: debouncedQuery.length >= 2 || Object.values(filters).some(v => v !== ''),
  });

  const employees = data?.employees || [];
  const documents = data?.documents || [];
  const results = tab === 0 ? employees : documents;
  const hasQuery = debouncedQuery.length >= 2 || Object.values(filters).some(v => v !== '');

  const handleFilterChange = (field, value) => setFilters(prev => ({ ...prev, [field]: value }));
  const resetFilters = () => setFilters({ department: '', job_title: '', work_location: '', gender: '', marital_status: '', status: '', document_type: '' });

  const mapOpts = (data) => Array.isArray(data) ? data.map(d => ({ value: d.id, label: d.name })) : [];

  const filterRow = (label, field, options) => (
    <FormControl size="small" sx={{ minWidth: 150 }}>
      <InputLabel>{label}</InputLabel>
      <Select value={filters[field] || ''} label={label} onChange={e => handleFilterChange(field, e.target.value)}>
        <MenuItem value="">همه</MenuItem>
        {options.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
      </Select>
    </FormControl>
  );

  return (
    <Box>
      {/* Glass header */}
      <Paper sx={{
        mb: 3, p: 2.5,
        display: 'flex', alignItems: 'center', gap: 2,
        background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(236,72,153,0.05))',
        border: '1px solid rgba(99,102,241,0.2)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderRadius: 3,
      }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #6366f1, #ec4899)', boxShadow: '0 6px 20px rgba(99,102,241,0.4)' }}>
          <SearchIcon sx={{ fontSize: 28, color: '#fff' }} />
        </Avatar>
        <Box>
          <Typography variant="h5" fontWeight={800}>{t('search.title')}</Typography>
          <Typography variant="body2" color="textSecondary">جستجو در پرسنل و مدارک با فیلترهای پیشرفته</Typography>
        </Box>
      </Paper>

      {/* Search Bar - glass */}
      <Paper sx={{
        p: 2, mb: 2, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.55), rgba(255,255,255,0.3))',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.4)',
        borderRadius: 3,
      }}>
        <TextField
          fullWidth size="medium" autoFocus
          placeholder={t('search.placeholder')}
          value={query} onChange={e => setQuery(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon color="primary" /></InputAdornment>,
            sx: { borderRadius: 3 }
          }}
          sx={{ flex: 1, minWidth: 280 }}
        />
        <Button variant={showFilters ? 'contained' : 'outlined'}
          onClick={() => setShowFilters(!showFilters)} size="small">
          {t('common.filter')}
        </Button>
      </Paper>

      {/* Tabs - glass */}
      <Paper sx={{
        mb: 2, overflow: 'hidden',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.5), rgba(255,255,255,0.3))',
        backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
        border: '1px solid rgba(255,255,255,0.4)', borderRadius: 2.5,
      }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ px: 2, borderBottom: '1px solid rgba(255,255,255,0.4)' }}>
          <Tab label={`${t('search.employees_tab')} (${employees.length})`} sx={{ fontWeight: 600 }} />
          <Tab label={`${t('search.documents_tab')} (${documents.length})`} sx={{ fontWeight: 600 }} />
        </Tabs>
      </Paper>

      {/* Advanced Filters */}
      <Collapse in={showFilters}>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="body2" fontWeight={600} gutterBottom>فیلترهای پیشرفته</Typography>
          <Divider sx={{ mb: 1.5 }} />
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 1.5 }}>
            {filterRow(t('employees.department'), 'department', mapOpts(departments))}
            {filterRow(t('employees.job_title'), 'job_title', mapOpts(jobTitles))}
            {filterRow(t('employees.work_location'), 'work_location', mapOpts(workLocations))}
            {filterRow(t('employees.gender'), 'gender', [{ value: 'male', label: t('employees.male') }, { value: 'female', label: t('employees.female') }])}
            {filterRow(t('employees.marital_status'), 'marital_status', [
              { value: 'single', label: t('employees.single') }, { value: 'married', label: t('employees.married') },
              { value: 'divorced', label: t('employees.divorced') }, { value: 'widowed', label: t('employees.widowed') }
            ])}
            {filterRow(t('employees.status'), 'status', [
              { value: 'active', label: t('employees.active') }, { value: 'leave', label: t('employees.on_leave') },
              { value: 'retired', label: t('employees.retired') }, { value: 'terminated', label: t('employees.terminated') }
            ])}
            {filterRow(t('documents.document_type'), 'document_type', mapOpts(docTypes))}
          </Box>
          <Button size="small" onClick={resetFilters}>پاک‌سازی فیلترها</Button>
        </Paper>
      </Collapse>

      {/* Results */}
      {isLoading ? (
        <Box sx={{ textAlign: 'center', p: 6 }}><CircularProgress /></Box>
      ) : !hasQuery ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <SearchIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography color="textSecondary">{t('search.type_query')}</Typography>
          <Typography variant="caption" color="textDisabled">
            می‌توانید بر اساس نام، کد ملی، کد پرسنلی، شماره تماس، ایمیل، آدرس و ... جستجو کنید
          </Typography>
        </Paper>
      ) : results.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="textSecondary">{t('search.no_results')}</Typography>
        </Paper>
      ) : tab === 0 ? (
        /* Employee Results */
        <Grid container spacing={2}>
          {employees.map(emp => (
            <Grid item xs={12} sm={6} md={4} key={emp.id}>
              <Card sx={{ cursor: 'pointer' }} onClick={() => navigate(`/employees/${emp.id}`)}>
                <CardContent>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Avatar sx={{ width: 48, height: 48, background: getAvatarColor(emp.full_name), fontWeight: 700 }}>
                      {emp.first_name?.charAt(0)}{emp.last_name?.charAt(0)}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={700} noWrap>{emp.full_name}</Typography>
                      <Typography variant="caption" color="textSecondary">{emp.department_name} — {emp.job_title_name}</Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                        <Chip icon={<BadgeIcon sx={{ fontSize: 14 }} />} label={emp.employee_id} size="small" />
                        {emp.mobile && <Chip icon={<SmartphoneIcon sx={{ fontSize: 14 }} />} label={emp.mobile} size="small" variant="outlined" />}
                      </Box>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        /* Document Results */
        <Grid container spacing={2}>
          {documents.map(doc => (
            <Grid item xs={12} sm={6} md={4} key={doc.id}>
              <Card>
                <CardContent>
                  <Typography variant="body2" fontWeight={700} noWrap>{doc.title}</Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                    <Chip icon={<DescriptionIcon sx={{ fontSize: 14 }} />} label={doc.document_type_name} size="small" />
                    <Chip label={doc.file_extension} size="small" variant="outlined" color="primary" />
                    {doc.expiry_date && <Chip label={`انقضا: ${toJalali(doc.expiry_date)}`} size="small" variant="outlined"
                      color={doc.is_expired ? 'error' : doc.days_until_expiry <= 30 ? 'warning' : 'default'} />}
                  </Box>
                  <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 0.5 }}>
                    پرسنل: {doc.employee_name}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default AdvancedSearchPage;