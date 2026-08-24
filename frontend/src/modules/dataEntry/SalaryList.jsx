import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../core/api/axiosConfig';
import {
  Box, Typography, Paper, TextField, InputAdornment, Button,
  FormControl, InputLabel, Select, MenuItem, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Chip, Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { formatPersianNumber, toPersianDigits } from '../../core/utils/numberUtils';
import { MONTHS } from './SalaryForm';

const SalaryList = ({ onEdit }) => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['salaries', debouncedSearch, year, month],
    queryFn: () => axiosInstance.get('/salaries/', {
      params: {
        search: debouncedSearch || undefined,
        year: year || undefined,
        month: month || undefined,
        page_size: 100,
      },
    }).then(r => r.data),
  });

  const { data: years } = useQuery({
    queryKey: ['salary-years'],
    queryFn: () => axiosInstance.get('/salaries/years/').then(r => r.data),
  });

  const items = Array.isArray(data) ? data : data?.results || [];

  const handleDelete = async (id) => {
    if (!window.confirm('آیا از حذف این فیش حقوقی مطمئن هستید؟')) return;
    await axiosInstance.delete(`/salaries/${id}/`);
    queryClient.invalidateQueries({ queryKey: ['salaries'] });
    queryClient.invalidateQueries({ queryKey: ['salary-years'] });
  };

  return (
    <Box>
      {/* Filter bar */}
      <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small" placeholder="جستجو (نام، کد پرسنلی، کد ملی)"
          value={search} onChange={e => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          sx={{ flex: 1, minWidth: 240 }}
        />
        <FormControl size="small" sx={{ minWidth: 110 }}>
          <InputLabel>سال</InputLabel>
          <Select value={year} label="سال" onChange={e => setYear(e.target.value)}>
            <MenuItem value="">همه</MenuItem>
            {Array.isArray(years) && years.map(y => <MenuItem key={y} value={y}>{toPersianDigits(y)}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>ماه</InputLabel>
          <Select value={month} label="ماه" onChange={e => setMonth(e.target.value)}>
            <MenuItem value="">همه</MenuItem>
            {MONTHS.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
          </Select>
        </FormControl>
        <Chip label={`${toPersianDigits(items.length)} فیش`} size="small" color="primary" variant="outlined" />
      </Paper>

      {/* Table */}
      <TableContainer component={Paper}>
        {isLoading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>
        ) : !items.length ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="textSecondary">فیش حقوقی یافت نشد</Typography>
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>ردیف</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>کد پرسنلی</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>نام و نام خانوادگی</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>سال/ماه</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>کارکرد</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>حقوق پایه</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>جمع مزایا</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>جمع کسور</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>قابل پرداخت</TableCell>
                <TableCell width={120} sx={{ fontWeight: 700 }}>عملیات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((rec, i) => (
                <TableRow key={rec.id} hover sx={{ cursor: 'pointer' }} onClick={() => onEdit && onEdit(rec)}>
                  <TableCell>{toPersianDigits(i + 1)}</TableCell>
                  <TableCell>{toPersianDigits(rec.employee_code)}</TableCell>
                  <TableCell>{rec.employee_name}</TableCell>
                  <TableCell>{toPersianDigits(rec.year)}/{toPersianDigits(rec.month)}</TableCell>
                  <TableCell>{formatPersianNumber(rec.work_days)}</TableCell>
                  <TableCell>{formatPersianNumber(rec.base_salary)}</TableCell>
                  <TableCell><Chip size="small" label={formatPersianNumber(rec.total_benefits)} color="success" variant="outlined" /></TableCell>
                  <TableCell><Chip size="small" label={formatPersianNumber(rec.total_deductions)} color="error" variant="outlined" /></TableCell>
                  <TableCell><Typography fontWeight={700} color="primary.main">{formatPersianNumber(rec.net_payable)}</Typography></TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <IconButton size="small" color="error" onClick={() => handleDelete(rec.id)}><DeleteIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableContainer>
    </Box>
  );
};

export default SalaryList;