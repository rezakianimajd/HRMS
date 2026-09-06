import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, TextField, InputAdornment, Paper, Avatar, Chip,
  CircularProgress, Divider, Grid, Card, CardContent, Stack,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import DescriptionIcon from '@mui/icons-material/Description';
import MailIcon from '@mui/icons-material/Mail';
import AssignmentIcon from '@mui/icons-material/Assignment';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import PaymentsIcon from '@mui/icons-material/Payments';
import NorthIcon from '@mui/icons-material/North';
import { useGlobalSearch } from '../core/hooks/useGlobalSearch';
import { toPersianDigits, formatPersianNumber } from '../core/utils/numberUtils';

const SECTIONS = [
  { key: 'employees', label: 'پرسنل', icon: <PersonIcon fontSize="small" />, color: '#6366f1' },
  { key: 'documents', label: 'مدارک', icon: <DescriptionIcon fontSize="small" />, color: '#14b8a6' },
  { key: 'letters', label: 'نامه‌ها', icon: <MailIcon fontSize="small" />, color: '#06b6d4' },
  { key: 'hr_requests', label: 'درخواست‌های اداری', icon: <AssignmentIcon fontSize="small" />, color: '#8b5cf6' },
  { key: 'leave_requests', label: 'مرخصی‌ها', icon: <EventBusyIcon fontSize="small" />, color: '#f59e0b' },
  { key: 'salary_records', label: 'فیش‌های حقوقی', icon: <PaymentsIcon fontSize="small" />, color: '#10b981' },
];

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

function resultTitle(section, r) {
  switch (section) {
    case 'employees': return r.full_name || r.first_name || '';
    case 'documents': return r.title || '';
    case 'letters': return r.subject || '';
    case 'hr_requests': return r.employee_name || '';
    case 'leave_requests': return r.employee_name || '';
    case 'salary_records': return r.employee_name || '';
    default: return '';
  }
}

function resultSubtitle(section, r) {
  switch (section) {
    case 'employees': return `${r.department_name || ''}${r.job_title_name ? ' — ' + r.job_title_name : ''}`;
    case 'documents': return `${r.document_type_name || ''}${r.employee_name ? ' · ' + r.employee_name : ''}`;
    case 'letters': return `${r.kind === 'incoming' ? 'از' : 'به'}: ${r.counterparty || ''} · ${r.number || ''}`;
    case 'hr_requests': return `${r.request_type || ''} · ${r.status || ''}`;
    case 'leave_requests': return `${r.leave_type || ''} · ${r.days ? toPersianDigits(r.days) + ' روز' : ''}`;
    case 'salary_records': return `دوره ${r.period || ''} · ${formatPersianNumber(r.net_payable)} ریال`;
    default: return '';
  }
}

const AdvancedSearchPage = () => {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [input, setInput] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const tm = setTimeout(() => setDebounced(input), 400);
    return () => clearTimeout(tm);
  }, [input]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const { data, isLoading } = useGlobalSearch(debounced);

  const total = useMemo(() => {
    if (!data) return 0;
    return SECTIONS.reduce((sum, s) => sum + (data[s.key]?.length || 0), 0);
  }, [data]);

  const hasQuery = debounced.trim().length >= 2;

  const handleSelect = (section, r) => {
    const map = {
      employees: () => navigate(`/employees/${r.id}`),
      documents: () => navigate(`/employees/${r.employee}`),
      letters: () => navigate('/correspondences'),
      hr_requests: () => navigate('/requests'),
      leave_requests: () => navigate('/leaves'),
      salary_records: () => navigate(`/employees/${r.id}`),
    };
    // salary records don't carry employee id; ignore navigation.
    if (section !== 'salary_records') map[section]?.();
  };

  return (
    <Box sx={{ maxWidth: 960, mx: 'auto' }}>
      {/* Hero */}
      <Paper sx={{
        mb: 3, p: 3, textAlign: 'center',
        background: 'linear-gradient(135deg, rgba(99,102,241,0.14), rgba(236,72,153,0.07))',
        border: '1px solid rgba(99,102,241,0.18)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderRadius: 4,
      }}>
        <Avatar sx={{
          width: 64, height: 64, mx: 'auto', mb: 1.5,
          background: 'linear-gradient(135deg, #6366f1, #ec4899)',
          boxShadow: '0 8px 28px rgba(99,102,241,0.45)',
        }}>
          <SearchIcon sx={{ fontSize: 32, color: '#fff' }} />
        </Avatar>
        <Typography variant="h5" fontWeight={800}>جستجوی سراسری</Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
          پرسنل، مدارک، نامه‌ها، درخواست‌ها، مرخصی‌ها و فیش‌های حقوقی را یکجا جستجو کنید
        </Typography>
      </Paper>

      {/* Search bar */}
      <Paper sx={{
        p: 1.5, mb: 3,
        background: 'rgba(255,255,255,0.55)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.5)',
        borderRadius: 3,
      }}>
        <TextField
          fullWidth
          inputRef={inputRef}
          placeholder="تایپ کنید… (حداقل ۲ حرف)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="primary" />
              </InputAdornment>
            ),
            sx: { fontSize: 16 },
          }}
          variant="standard"
        />
      </Paper>

      {/* Results */}
      {!hasQuery ? (
        <Paper sx={{
          p: 5, textAlign: 'center',
          background: 'rgba(99,102,241,0.03)', border: '1px dashed rgba(99,102,241,0.25)', borderRadius: 3,
        }}>
          <SearchIcon sx={{ fontSize: 52, color: 'text.disabled', mb: 1 }} />
          <Typography color="textSecondary">برای شروع جستجو حداقل ۲ حرف وارد کنید</Typography>
        </Paper>
      ) : isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}><CircularProgress /></Box>
      ) : total === 0 ? (
        <Paper sx={{
          p: 5, textAlign: 'center',
          background: 'rgba(239,68,68,0.04)', border: '1px dashed rgba(239,68,68,0.25)', borderRadius: 3,
        }}>
          <Typography color="textSecondary">نتیجه‌ای برای «{debounced}» یافت نشد</Typography>
        </Paper>
      ) : (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Typography variant="h6" fontWeight={800}>نتایج</Typography>
            <Chip label={`${toPersianDigits(total)} مورد`} color="primary" size="small" />
          </Box>

          <Stack spacing={2.5}>
            {SECTIONS.map((sec) => {
              const items = data?.[sec.key] || [];
              if (items.length === 0) return null;
              return (
                <Paper key={sec.key} sx={{
                  p: 2,
                  background: `linear-gradient(135deg, ${sec.color}0d, ${sec.color}05)`,
                  border: `1px solid ${sec.color}20`,
                  borderRadius: 3,
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                    <Avatar sx={{ width: 30, height: 30, background: `linear-gradient(135deg, ${sec.color}, ${sec.color}99)`, color: '#fff' }}>
                      {sec.icon}
                    </Avatar>
                    <Typography variant="subtitle1" fontWeight={800} color={sec.color}>{sec.label}</Typography>
                    <Chip size="small" label={toPersianDigits(items.length)} sx={{ bgcolor: `${sec.color}20`, color: sec.color }} />
                    <Divider sx={{ flex: 1, borderColor: `${sec.color}22` }} />
                  </Box>

                  <Grid container spacing={1.5}>
                    {items.map((r, i) => (
                      <Grid item xs={12} sm={6} key={`${sec.key}-${r.id}-${i}`}>
                        <Card
                          elevation={0}
                          onClick={() => handleSelect(sec.key, r)}
                          sx={{
                            cursor: 'pointer', height: '100%',
                            background: 'rgba(255,255,255,0.5)',
                            border: `1px solid ${sec.color}18`,
                            borderRadius: 2.5,
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              transform: 'translateY(-2px)',
                              borderColor: `${sec.color}40`,
                              boxShadow: `0 8px 20px ${sec.color}20`,
                            },
                          }}
                        >
                          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Avatar sx={{
                                width: 38, height: 38,
                                background: sec.key === 'employees' ? getAvatarColor(r.full_name || r.id) : `${sec.color}20`,
                                color: sec.key === 'employees' ? '#fff' : sec.color,
                                fontSize: 15, fontWeight: 700,
                              }}>
                                {sec.key === 'employees'
                                  ? (r.first_name?.charAt(0) || '')
                                  : sec.icon}
                              </Avatar>
                              <Box sx={{ minWidth: 0 }}>
                                <Typography variant="body2" fontWeight={700} noWrap>
                                  {resultTitle(sec.key, r)}
                                </Typography>
                                <Typography variant="caption" color="textSecondary" noWrap display="block">
                                  {resultSubtitle(sec.key, r)}
                                </Typography>
                              </Box>
                              <Box sx={{ ml: 'auto', color: sec.color, display: 'flex', alignItems: 'center' }}>
                                <NorthIcon sx={{ fontSize: 14, transform: 'rotate(45deg)' }} />
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              );
            })}
          </Stack>
        </Box>
      )}
    </Box>
  );
};

export default AdvancedSearchPage;