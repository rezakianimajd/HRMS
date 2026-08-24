import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../core/api/axiosConfig';
import {
  Box, Typography, Paper, TextField, InputAdornment, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Chip, FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import { formatPersianNumber, toPersianDigits } from '../../core/utils/numberUtils';
import { BENEFIT_TYPES, BENEFIT_TYPE_LABELS } from './config';
import { MONTHS } from './BenefitForm';

const BenefitList = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [benefitType, setBenefitType] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['benefits', debouncedSearch, year, month, benefitType],
    queryFn: () => axiosInstance.get('/benefits/', {
      params: {
        search: debouncedSearch || undefined,
        year: year || undefined,
        month: month || undefined,
        benefit_type: benefitType || undefined,
        page_size: 100,
      },
    }).then(r => r.data),
  });

  const { data: years } = useQuery({
    queryKey: ['benefit-years'],
    queryFn: () => axiosInstance.get('/benefits/years/').then(r => r.data),
  });

  const items = Array.isArray(data) ? data : data?.results || [];

  const handleDelete = async (id) => {
    if (!window.confirm('آیا از حذف این مزایا مطمئن هستید؟')) return;
    await axiosInstance.delete(`/benefits/${id}/`);
    queryClient.invalidateQueries({ queryKey: ['benefits'] });
    queryClient.invalidateQueries({ queryKey: ['benefit-years'] });
  };

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small" placeholder="جستجو (نام، کد پرسنلی)"
          value={search} onChange={e => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          sx={{ flex: 1, minWidth: 200 }}
        />
        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel>سال</InputLabel>
          <Select value={year} label="سال" onChange={e => setYear(e.target.value)}>
            <MenuItem value="">همه</MenuItem>
            {Array.isArray(years) && years.map(y => <MenuItem key={y} value={y}>{toPersianDigits(y)}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 110 }}>
          <InputLabel>ماه</InputLabel>
          <Select value={month} label="ماه" onChange={e => setMonth(e.target.value)}>
            <MenuItem value="">همه</MenuItem>
            {MONTHS.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>نوع مزایا</InputLabel>
          <Select value={benefitType} label="نوع مزایا" onChange={e => setBenefitType(e.target.value)}>
            <MenuItem value="">همه</MenuItem>
            {BENEFIT_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
          </Select>
        </FormControl>
      </Paper>

      <TableContainer component={Paper}>
        {isLoading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>
        ) : !items.length ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><Typography color="textSecondary">مزایایی یافت نشد</Typography></Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>ردیف</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>کد پرسنلی</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>نام و نام خانوادگی</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>سال/ماه</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>نوع مزایا</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>مبلغ ناخالص</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>مالیات ذخیره</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>مبلغ پرداختی</TableCell>
                <TableCell width={60}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((rec, i) => (
                <TableRow key={rec.id} hover>
                  <TableCell>{toPersianDigits(i + 1)}</TableCell>
                  <TableCell>{toPersianDigits(rec.employee_code)}</TableCell>
                  <TableCell>{rec.employee_name}</TableCell>
                  <TableCell>{toPersianDigits(rec.year)}/{toPersianDigits(rec.month)}</TableCell>
                  <TableCell>
                    <Chip size="small" label={BENEFIT_TYPE_LABELS[rec.benefit_type] || rec.benefit_type} color="success" variant="outlined" />
                  </TableCell>
                  <TableCell>{formatPersianNumber(rec.gross_amount)}</TableCell>
                  <TableCell>{formatPersianNumber(rec.reserved_tax)}</TableCell>
                  <TableCell><Typography fontWeight={700} color="primary.main">{formatPersianNumber(rec.paid_amount)}</Typography></TableCell>
                  <TableCell>
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

export default BenefitList;