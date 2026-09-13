import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../../api/axiosConfig';
import {
  Box, Typography, Paper, Grid, Card, CardContent, Avatar, Chip,
  CircularProgress, LinearProgress, Stack, Divider,
} from '@mui/material';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import PaymentsIcon from '@mui/icons-material/Payments';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import GavelIcon from '@mui/icons-material/Gavel';
import ShieldIcon from '@mui/icons-material/Shield';
import HistoryEduIcon from '@mui/icons-material/HistoryEdu';
import { formatPersianNumber, toPersianDigits } from '../../utils/numberUtils';
import { toJalali } from '../../utils/dateUtils';

const SectionHeader = ({ title, icon, color, count }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
    <Avatar sx={{ width: 30, height: 30, background: `linear-gradient(135deg, ${color}, ${color}90)`, color: '#fff' }}>
      {icon}
    </Avatar>
    <Typography variant="subtitle1" fontWeight={800} sx={{ color }}>{title}</Typography>
    {count != null && (
      <Chip size="small" label={toPersianDigits(count)} sx={{ bgcolor: `${color}18`, color, fontWeight: 700 }} />
    )}
    <Divider sx={{ flex: 1 }} />
  </Box>
);

const EmptyHint = ({ text }) => (
  <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderRadius: '10px', bgcolor: 'rgba(100,116,139,0.04)' }}>
    <Typography variant="caption" color="textSecondary">{text}</Typography>
  </Paper>
);

const OverviewTab = ({ employeeId }) => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['employee-summary', employeeId],
    queryFn: () => axiosInstance.get(`/employees/${employeeId}/summary/`).then(r => r.data),
    enabled: !!employeeId,
  });

  if (isLoading) return <Box sx={{ textAlign: 'center', p: 4 }}><CircularProgress size={28} /></Box>;
  if (isError || !data) return <Typography color="error">ط®ط·ط§ ط¯ط± ط¯ط±غŒط§ظپطھ ظ†ظ…ط§غŒ ع©ظ„غŒ</Typography>;

  const assets = data.assets || [];
  const loans = data.loans || [];
  const checklists = data.checklists || [];
  const penalties = data.penalties || [];
  const insurance = data.insurance || [];
  const contracts = data.contracts || [];

  return (
    <Grid container spacing={2.5}>
      {/* ظ‚ط±ط§ط±ط¯ط§ط¯ظ‡ط§ */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2, borderRadius: '10px', height: '100%', background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(255,255,255,0.4))' }}>
          <SectionHeader title="ظ‚ط±ط§ط±ط¯ط§ط¯ظ‡ط§" icon={<HistoryEduIcon sx={{ fontSize: 16 }} />} color="#f59e0b" count={contracts.length} />
          {contracts.length === 0 ? <EmptyHint text="ظ‡غŒع† ظ†ط³ط®ظ‡ ظ‚ط±ط§ط±ط¯ط§ط¯غŒ ط«ط¨طھ ظ†ط´ط¯ظ‡ ط§ط³طھ" /> : (
            <Stack spacing={1}>
              {contracts.map(c => (
                <Card key={c.id} variant="outlined" sx={{ borderRadius: '10px' }}>
                  <CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="body2" fontWeight={700}>
                        ظ†ط³ط®ظ‡ {toPersianDigits(c.version)} ({toPersianDigits(c.year)})
                      </Typography>
                      {c.signed_by ? (
                        <Chip size="small" color="success" label={`ط§ظ…ط¶ط§: ${c.signed_by}`} />
                      ) : (
                        <Chip size="small" color="default" label="ط¨ط¯ظˆظ† ط§ظ…ط¶ط§" variant="outlined" />
                      )}
                    </Box>
                    <Typography variant="caption" color="textSecondary">
                      {c.contract_type || 'â€”'} آ· {toJalali(c.start_date)} طھط§ {c.end_date ? toJalali(c.end_date) : 'ط§ع©ظ†ظˆظ†'}
                    </Typography>
                    {c.base_salary > 0 && (
                      <Typography variant="caption" display="block" sx={{ mt: 0.25 }}>
                        ط­ظ‚ظˆظ‚ ظ¾ط§غŒظ‡: {formatPersianNumber(c.base_salary)} ط±غŒط§ظ„
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </Paper>
      </Grid>

      {/* ط§ظ…ظˆط§ظ„ */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2, borderRadius: '10px', height: '100%', background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(255,255,255,0.4))' }}>
          <SectionHeader title="ط§ظ…ظˆط§ظ„ ظˆ طھط¬ظ‡غŒط²ط§طھ" icon={<Inventory2Icon sx={{ fontSize: 16 }} />} color="#10b981" count={assets.length} />
          {assets.length === 0 ? <EmptyHint text="ظ‡غŒع† طھط¬ظ‡غŒط²غŒ ط¨ظ‡ ط§غŒظ† ظ¾ط±ط³ظ†ظ„ ظˆط§ع¯ط°ط§ط± ظ†ط´ط¯ظ‡ ط§ط³طھ" /> : (
            <Stack spacing={1}>
              {assets.map(a => (
                <Card key={a.id} variant="outlined" sx={{ borderRadius: '10px' }}>
                  <CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" fontWeight={700}>{a.name}</Typography>
                      <Chip size="small" label={a.status} variant="outlined" color={a.status === 'ظˆط§ع¯ط°ط§ط±ط´ط¯ظ‡' ? 'success' : 'default'} />
                    </Box>
                    <Typography variant="caption" color="textSecondary">
                      {a.asset_type}{a.serial_number ? ` آ· ${toPersianDigits(a.serial_number)}` : ''}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </Paper>
      </Grid>

      {/* ظˆط§ظ…â€Œظ‡ط§ */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2, borderRadius: '10px', height: '100%', background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(255,255,255,0.4))' }}>
          <SectionHeader title="ظˆط§ظ… ظˆ طھط³ظ‡غŒظ„ط§طھ" icon={<PaymentsIcon sx={{ fontSize: 16 }} />} color="#3b82f6" count={loans.length} />
          {loans.length === 0 ? <EmptyHint text="ظ‡غŒع† ظˆط§ظ…غŒ ط«ط¨طھ ظ†ط´ط¯ظ‡ ط§ط³طھ" /> : (
            <Stack spacing={1}>
              {loans.map(l => (
                <Card key={l.id} variant="outlined" sx={{ borderRadius: '10px' }}>
                  <CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" fontWeight={700}>{l.loan_type}</Typography>
                      <Chip size="small" label={l.status} variant="outlined" color={l.status === 'ظپط¹ط§ظ„' ? 'info' : 'success'} />
                    </Box>
                    <Typography variant="caption" color="textSecondary" display="block">
                      ظ…ط¨ظ„ط؛: {formatPersianNumber(l.amount)} ط±غŒط§ظ„ آ· {toPersianDigits(l.installment_count)} ظ‚ط³ط·
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </Paper>
      </Grid>

      {/* ع†ع©â€Œظ„غŒط³طھ ظˆط±ظˆط¯/ط®ط±ظˆط¬ */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2, borderRadius: '10px', height: '100%', background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(255,255,255,0.4))' }}>
          <SectionHeader title="ع†ع©â€Œظ„غŒط³طھ ظˆط±ظˆط¯ / ط®ط±ظˆط¬" icon={<PlaylistAddCheckIcon sx={{ fontSize: 16 }} />} color="#8b5cf6" count={checklists.length} />
          {checklists.length === 0 ? <EmptyHint text="ع†ع©â€Œظ„غŒط³طھغŒ ط«ط¨طھ ظ†ط´ط¯ظ‡ ط§ط³طھ" /> : (
            <Stack spacing={1.25}>
              {checklists.map(c => (
                <Box key={c.id}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" fontWeight={700}>{c.kind_display}</Typography>
                    <Typography variant="caption" color="textSecondary">{toPersianDigits(c.completed)}/{toPersianDigits(c.total)}</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={c.progress} sx={{ height: 6, borderRadius: '10px', bgcolor: 'rgba(139,92,246,0.12)', '& .MuiLinearProgress-bar': { bgcolor: '#8b5cf6' } }} />
                </Box>
              ))}
            </Stack>
          )}
        </Paper>
      </Grid>

      {/* ط¬ط±ط§ط¦ظ… */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2, borderRadius: '10px', height: '100%', background: 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(255,255,255,0.4))' }}>
          <SectionHeader title="ط¬ط±ط§ط¦ظ… ط§ظ†ط¶ط¨ط§ط·غŒ" icon={<GavelIcon sx={{ fontSize: 16 }} />} color="#ef4444" count={penalties.length} />
          {penalties.length === 0 ? <EmptyHint text="ط¬ط±غŒظ…ظ‡â€Œط§غŒ ط«ط¨طھ ظ†ط´ط¯ظ‡ ط§ط³طھ" /> : (
            <Stack spacing={1}>
              {penalties.map(p => (
                <Card key={p.id} variant="outlined" sx={{ borderRadius: '10px' }}>
                  <CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" fontWeight={700}>{formatPersianNumber(p.amount)} ط±غŒط§ظ„</Typography>
                      <Typography variant="caption" color="textSecondary">{toJalali(p.date)}</Typography>
                    </Box>
                    {p.reason && <Typography variant="caption" color="textSecondary">{p.reason}</Typography>}
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </Paper>
      </Grid>

      {/* ط¨غŒظ…ظ‡ طھع©ظ…غŒظ„غŒ */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2, borderRadius: '10px', height: '100%', background: 'linear-gradient(135deg, rgba(14,165,233,0.08), rgba(255,255,255,0.4))' }}>
          <SectionHeader title="ط¨غŒظ…ظ‡ طھع©ظ…غŒظ„غŒ" icon={<ShieldIcon sx={{ fontSize: 16 }} />} color="#0ea5e9" count={insurance.length} />
          {insurance.length === 0 ? <EmptyHint text="ط¨غŒظ…ظ‡ طھع©ظ…غŒظ„غŒ ط«ط¨طھ ظ†ط´ط¯ظ‡ ط§ط³طھ" /> : (
            <Stack spacing={1}>
              {insurance.map(i => (
                <Card key={i.id} variant="outlined" sx={{ borderRadius: '10px' }}>
                  <CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" fontWeight={700}>{i.insurance_name}</Typography>
                      <Chip size="small" label={`${toPersianDigits(i.dependents_count)} طھط­طھ طھع©ظپظ„`} variant="outlined" />
                    </Box>
                    <Typography variant="caption" color="textSecondary">
                      {i.plan || i.insurance_type || ''} آ· ظ…ط§ظ‡ط§ظ†ظ‡ {formatPersianNumber(i.monthly_amount)} ط±غŒط§ظ„
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </Paper>
      </Grid>
    </Grid>
  );
};

export default OverviewTab;