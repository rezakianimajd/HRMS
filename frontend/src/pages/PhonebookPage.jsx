import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, TextField, InputAdornment, Button, CircularProgress,
  Grid, Card, CardContent, Avatar, Chip, IconButton, Tooltip,
  FormControl, InputLabel, Select, MenuItem, TablePagination, Collapse,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PhoneIcon from '@mui/icons-material/Phone';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import EmailIcon from '@mui/icons-material/Email';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import BadgeIcon from '@mui/icons-material/Badge';
import WorkIcon from '@mui/icons-material/Work';
import DownloadIcon from '@mui/icons-material/Download';
import FilterListIcon from '@mui/icons-material/FilterList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ViewListIcon from '@mui/icons-material/ViewList';
import EmergencyIcon from '@mui/icons-material/ContactEmergency';
import PeopleIcon from '@mui/icons-material/People';
import { useDepartments } from '../core/hooks/useEmployees';
import EmployeeAvatar from '../core/components/ui/EmployeeAvatar';
import { toPersianDigits } from '../core/utils/numberUtils';

const PhonebookPage = () => {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(24);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [showFilters, setShowFilters] = useState(false);

  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: departments } = useDepartments();

  const { data, isLoading } = useQuery({
    queryKey: ['phonebook', page, rowsPerPage, debouncedSearch, department],
    queryFn: () => axiosInstance.get('/phonebook/', {
      params: {
        page: page + 1, page_size: rowsPerPage,
        search: debouncedSearch || undefined,
        department: department || undefined,
      }
    }).then(r => r.data),
  });

  const employees = data?.results || [];
  const totalCount = data?.count || 0;

  const exportUrl = `${axiosInstance.defaults.baseURL}/phonebook/export/?search=${debouncedSearch}&department=${department}`;

  const CardView = () => (
    <Grid container spacing={2}>
      {employees.length === 0 ? (
        <Grid item xs={12}><Typography textAlign="center" color="textSecondary" sx={{ p: 6 }}>{t('table.no_results')}</Typography></Grid>
      ) : (
        employees.map(emp => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={emp.id}>
            <Card sx={{
              height: '100%',
              background: 'linear-gradient(145deg, rgba(255,255,255,0.65), rgba(255,255,255,0.35))',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.5)',
              boxShadow: '0 8px 28px rgba(15,23,42,0.08)',
              borderRadius: 3,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': { transform: 'translateY(-6px)', boxShadow: '0 20px 44px rgba(99,102,241,0.16)', border: '1px solid rgba(99,102,241,0.2)' },
            }}>
              <CardContent sx={{ px: 2.5, py: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <EmployeeAvatar employee={emp} size={68} sx={{ mb: 1.5, boxShadow: '0 6px 20px rgba(99,102,241,0.3)', border: '3px solid rgba(255,255,255,0.7)' }} />

                <Typography variant="subtitle1" fontWeight={800} noWrap sx={{ textAlign: 'center' }}>{emp.full_name}</Typography>

                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                  <WorkIcon sx={{ fontSize: 13, color: '#ec4899' }} />
                  <Typography variant="caption" color="textSecondary" sx={{ textAlign: 'center' }}>
                    {emp.department} — {emp.job_title}
                  </Typography>
                </Box>

                <Chip
                  icon={<BadgeIcon sx={{ fontSize: 13, color: '#6366f1 !important' }} />}
                  label={toPersianDigits(emp.employee_id)}
                  size="small"
                  sx={{ mt: 1.5, mb: 2, bgcolor: 'rgba(99,102,241,0.08)', color: '#6366f1', fontWeight: 700, border: '1px solid rgba(99,102,241,0.2)' }}
                />

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, width: '100%', textAlign: 'right' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SmartphoneIcon sx={{ fontSize: 16, color: '#6366f1', flexShrink: 0 }} />
                    <Typography variant="body2" component="a" href={`tel:${emp.mobile}`}
                      sx={{ color: 'text.primary', textDecoration: 'none', fontWeight: 600, direction: 'ltr' }}>
                      {toPersianDigits(emp.mobile)}
                    </Typography>
                  </Box>
                  {emp.phone && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PhoneIcon sx={{ fontSize: 16, color: '#ec4899', flexShrink: 0 }} />
                      <Typography variant="body2" component="a" href={`tel:${emp.phone}`}
                        sx={{ color: 'text.secondary', textDecoration: 'none', direction: 'ltr' }}>
                        {toPersianDigits(emp.phone)}
                      </Typography>
                    </Box>
                  )}
                  {emp.email && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <EmailIcon sx={{ fontSize: 16, color: '#10b981', flexShrink: 0 }} />
                      <Typography variant="body2" component="a" href={`mailto:${emp.email}`}
                        sx={{ color: 'text.secondary', textDecoration: 'none', wordBreak: 'break-all' }}>
                        {emp.email}
                      </Typography>
                    </Box>
                  )}
                  {emp.address && (
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                      <LocationOnIcon sx={{ fontSize: 16, color: 'text.disabled', flexShrink: 0, mt: '2px' }} />
                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.4 }}>
                        {emp.address.length > 50 ? emp.address.slice(0, 50) + '...' : emp.address}
                      </Typography>
                    </Box>
                  )}
                  {emp.emergency_contact_name && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <EmergencyIcon sx={{ fontSize: 16, color: '#f59e0b', flexShrink: 0 }} />
                      <Typography variant="body2" color="text.secondary" sx={{ direction: 'ltr' }}>
                        {emp.emergency_contact_name}: {toPersianDigits(emp.emergency_contact_phone)}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))
      )}
    </Grid>
  );

  const ListView = () => (
    <Grid container spacing={1}>
      {employees.length === 0 ? (
        <Grid item xs={12}><Typography textAlign="center" color="textSecondary" sx={{ p: 6 }}>{t('table.no_results')}</Typography></Grid>
      ) : (
        employees.map(emp => (
          <Grid item xs={12} key={emp.id}>
            <Card variant="outlined" sx={{
              background: 'linear-gradient(160deg, rgba(255,255,255,0.7), rgba(255,255,255,0.35))',
              backdropFilter: 'blur(12px)',
              borderRadius: 2,
            }}>
              <CardContent sx={{ py: 1.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <EmployeeAvatar employee={emp} size={40} />
                <Box sx={{ flex: 1, minWidth: 140, textAlign: 'center' }}>
                  <Typography variant="body2" fontWeight={700}>{emp.full_name}</Typography>
                  <Typography variant="caption" color="textSecondary" sx={{ textAlign: 'center' }}>
                    {emp.department} — {emp.job_title}
                  </Typography>
                </Box>
                <Chip icon={<SmartphoneIcon sx={{ fontSize: 14 }} />} label={toPersianDigits(emp.mobile)} size="small" variant="outlined"
                  component="a" href={`tel:${emp.mobile}`} clickable sx={{ direction: 'ltr' }} />
                {emp.phone && <Chip icon={<PhoneIcon sx={{ fontSize: 14 }} />} label={toPersianDigits(emp.phone)} size="small" variant="outlined"
                  component="a" href={`tel:${emp.phone}`} clickable sx={{ direction: 'ltr' }} />}
                {emp.email && <Chip icon={<EmailIcon sx={{ fontSize: 14 }} />} label={emp.email} size="small" variant="outlined"
                  component="a" href={`mailto:${emp.email}`} clickable />}
                <Chip icon={<BadgeIcon sx={{ fontSize: 14 }} />} label={toPersianDigits(emp.employee_id)} size="small" sx={{ bgcolor: 'rgba(99,102,241,0.08)' }} />
              </CardContent>
            </Card>
          </Grid>
        ))
      )}
    </Grid>
  );

  return (
    <Box>
      {/* Header - glass */}
      <Paper sx={{
        mb: 3, p: 2.5,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap',
        background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(99,102,241,0.06))',
        border: '1px solid rgba(16,185,129,0.2)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderRadius: 3,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{
            width: 56, height: 56,
            background: 'linear-gradient(135deg, #10b981, #6366f1)',
            boxShadow: '0 6px 20px rgba(16,185,129,0.4)',
          }}>
            <PeopleIcon sx={{ fontSize: 28, color: '#fff' }} />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight={800}>{t('phonebook.title')}</Typography>
            <Typography variant="body2" color="textSecondary">{toPersianDigits(totalCount)} مخاطب</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title={viewMode === 'grid' ? t('documents.list_view') : t('documents.grid_view')}>
            <IconButton onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')} sx={{ border: '1px solid rgba(0,0,0,0.12)' }}>
              {viewMode === 'grid' ? <ViewListIcon /> : <ViewModuleIcon />}
            </IconButton>
          </Tooltip>
          <Button variant="contained" component="a" href={exportUrl} target="_blank"
            sx={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            {t('phonebook.export_excel')}
          </Button>
        </Box>
      </Paper>

      {/* Search & Filter Bar */}
      <Paper sx={{ p: 2, mb: 3, background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(12px)', borderRadius: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="جستجو در دفترچه تلفن..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment>,
            }}
            sx={{ flex: 1, minWidth: 250 }}
          />
          <Button
            startIcon={<FilterListIcon />}
            onClick={() => setShowFilters(!showFilters)}
            color={showFilters ? 'primary' : 'inherit'}
            variant={showFilters ? 'contained' : 'outlined'}
            size="small"
          >
            {t('common.filter')}
          </Button>
        </Box>
        <Collapse in={showFilters}>
          <Box sx={{ mt: 1.5, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>{t('employees.department')}</InputLabel>
              <Select value={department} label={t('employees.department')}
                onChange={e => { setDepartment(e.target.value); setPage(0); }}>
                <MenuItem value="">{t('common.all')}</MenuItem>
                {Array.isArray(departments) && departments.map(d => (
                  <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button size="small" onClick={() => { setDepartment(''); setSearch(''); setPage(0); }}>
              پاک‌سازی فیلترها
            </Button>
          </Box>
        </Collapse>
      </Paper>

      {/* Results Count */}
      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
        {t('table.total', { count: totalCount })}
      </Typography>

      {/* Content */}
      {isLoading ? (
        <Box sx={{ textAlign: 'center', p: 6 }}><CircularProgress /></Box>
      ) : (
        viewMode === 'grid' ? <CardView /> : <ListView />
      )}

      {/* Pagination */}
      {totalCount > rowsPerPage && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            onPageChange={(e, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={e => { setRowsPerPage(Number(e.target.value)); setPage(0); }}
            rowsPerPageOptions={[12, 24, 48, 72]}
            labelRowsPerPage="تعداد در صفحه:"
          />
        </Box>
      )}
    </Box>
  );
};

export default PhonebookPage;