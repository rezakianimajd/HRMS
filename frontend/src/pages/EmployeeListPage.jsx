import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box, Typography, Button, TextField, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, IconButton,
  Tooltip, TablePagination, Collapse, Grid, FormControl, InputLabel,
  Select, MenuItem, InputAdornment, CircularProgress, Avatar,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import PeopleIcon from '@mui/icons-material/People';
import { useEmployees, useDeleteEmployee, useDepartments, useJobTitles, useWorkLocations } from '../core/hooks/useEmployees';
import StatusBadge from '../core/components/ui/StatusBadge';
import EmployeeAvatar from '../core/components/ui/EmployeeAvatar';
import { toPersianDigits } from '../core/utils/numberUtils';

const EmployeeListPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    department: '', job_title: '', work_location: '', status: '', gender: '',
  });
  const [debouncedSearch, setDebouncedSearch] = useState('');

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const queryParams = {
    page: page + 1,
    page_size: rowsPerPage,
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(filters.department && { department: filters.department }),
    ...(filters.job_title && { job_title: filters.job_title }),
    ...(filters.work_location && { work_location: filters.work_location }),
    ...(filters.status && { status: filters.status }),
    ...(filters.gender && { gender: filters.gender }),
  };

  const { data, isLoading } = useEmployees(queryParams);
  const { data: departments } = useDepartments();
  const { data: jobTitles } = useJobTitles();
  const { data: workLocations } = useWorkLocations();
  const deleteMutation = useDeleteEmployee();

  const employees = data?.results || [];
  const totalCount = data?.count || 0;

  const handlePageChange = (event, newPage) => setPage(newPage);
  const handleRowsPerPageChange = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  const handleDelete = (id) => {
    if (window.confirm(t('employees.delete_confirm'))) deleteMutation.mutate(id);
  };
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(0);
  };
  const resetFilters = () => {
    setFilters({ department: '', job_title: '', work_location: '', status: '', gender: '' });
    setSearch('');
    setPage(0);
  };

  return (
    <Box>
      {/* Glass header */}
      <Paper sx={{
        mb: 3, p: 2.5,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap',
        background: 'linear-gradient(135deg, rgba(236,72,153,0.12), rgba(99,102,241,0.06))',
        border: '1px solid rgba(236,72,153,0.2)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderRadius: 3,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #ec4899, #6366f1)', boxShadow: '0 6px 20px rgba(236,72,153,0.4)' }}>
            <PeopleIcon sx={{ fontSize: 28, color: '#fff' }} />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight={800}>{t('employees.title')}</Typography>
            <Typography variant="body2" color="textSecondary">{toPersianDigits(totalCount)} پرسنل</Typography>
          </Box>
        </Box>
        <Button variant="contained" onClick={() => navigate('/employees/new')}>
          {t('employees.add_employee')}
        </Button>
      </Paper>

      {/* Search & Filter Toolbar - glass */}
      <Paper sx={{
        p: 2, mb: 2,
        background: 'linear-gradient(135deg, rgba(255,255,255,0.55), rgba(255,255,255,0.3))',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.4)',
        borderRadius: 3,
      }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder={t('common.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
            sx={{ minWidth: 280, flex: 1 }}
          />
          <Button variant="outlined" onClick={() => setShowFilters(!showFilters)} color={showFilters ? 'primary' : 'inherit'}>
            {t('common.filter')}
          </Button>
        </Box>

        <Collapse in={showFilters}>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small"><InputLabel>{t('employees.department')}</InputLabel>
                <Select value={filters.department} label={t('employees.department')} onChange={(e) => handleFilterChange('department', e.target.value)}>
                  <MenuItem value="">{t('common.all')}</MenuItem>
                  {Array.isArray(departments) && departments.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small"><InputLabel>{t('employees.job_title')}</InputLabel>
                <Select value={filters.job_title} label={t('employees.job_title')} onChange={(e) => handleFilterChange('job_title', e.target.value)}>
                  <MenuItem value="">{t('common.all')}</MenuItem>
                  {Array.isArray(jobTitles) && jobTitles.map(j => <MenuItem key={j.id} value={j.id}>{j.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small"><InputLabel>{t('employees.work_location')}</InputLabel>
                <Select value={filters.work_location} label={t('employees.work_location')} onChange={(e) => handleFilterChange('work_location', e.target.value)}>
                  <MenuItem value="">{t('common.all')}</MenuItem>
                  {Array.isArray(workLocations) && workLocations.map(w => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small"><InputLabel>{t('employees.status')}</InputLabel>
                <Select value={filters.status} label={t('employees.status')} onChange={(e) => handleFilterChange('status', e.target.value)}>
                  <MenuItem value="">{t('common.all')}</MenuItem>
                  <MenuItem value="active">{t('employees.active')}</MenuItem>
                  <MenuItem value="leave">{t('employees.on_leave')}</MenuItem>
                  <MenuItem value="retired">{t('employees.retired')}</MenuItem>
                  <MenuItem value="terminated">{t('employees.terminated')}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2} sx={{ display: 'flex', alignItems: 'center' }}>
              <Button size="small" variant="outlined" onClick={resetFilters}>{t('filters.reset')}</Button>
            </Grid>
          </Grid>
        </Collapse>
      </Paper>

      {/* Table - glass */}
      <TableContainer component={Paper} sx={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.55), rgba(255,255,255,0.3))',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.4)',
        borderRadius: 3,
      }}>
        {isLoading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('table.row')}</TableCell>
                <TableCell>{t('employees.full_name')}</TableCell>
                <TableCell>{t('employees.employee_id')}</TableCell>
                <TableCell>{t('employees.department')}</TableCell>
                <TableCell>{t('employees.job_title')}</TableCell>
                <TableCell>{t('employees.work_location')}</TableCell>
                <TableCell>{t('employees.status')}</TableCell>
                <TableCell>{t('common.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {employees.length === 0 ? (
                <TableRow><TableCell colSpan={8} align="center">{t('table.no_results')}</TableCell></TableRow>
              ) : (
                employees.map((emp, index) => (
                  <TableRow key={emp.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/employees/${emp.id}`)}>
                    <TableCell>{toPersianDigits(page * rowsPerPage + index + 1)}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <EmployeeAvatar employee={emp} size={34} />
                        <Typography variant="body2" fontWeight={600}>{emp.full_name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{toPersianDigits(emp.employee_id)}</TableCell>
                    <TableCell>{emp.department_name}</TableCell>
                    <TableCell>{emp.job_title_name}</TableCell>
                    <TableCell>{emp.work_location_name}</TableCell>
                    <TableCell><StatusBadge status={emp.status} /></TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Tooltip title={t('common.edit')}><IconButton size="small" onClick={() => navigate(`/employees/${emp.id}/edit`)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title={t('common.delete')}><IconButton size="small" onClick={() => handleDelete(emp.id)}><DeleteIcon fontSize="small" color="error" /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={handlePageChange}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleRowsPerPageChange}
          labelRowsPerPage={t('common.rowsPerPage')}
        />
      </TableContainer>
    </Box>
  );
};

export default EmployeeListPage;