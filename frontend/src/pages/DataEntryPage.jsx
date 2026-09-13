import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Tabs, Tab, Avatar, Chip, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import PaymentsIcon from '@mui/icons-material/Payments';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import MoneyOffIcon from '@mui/icons-material/MoneyOff';
import InputIcon from '@mui/icons-material/Input';
import { formatPersianNumber } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import AbsenceForm from '../modules/dataEntry/AbsenceForm';
import SalaryTab from '../modules/dataEntry/SalaryTab';
import BenefitTab from '../modules/dataEntry/BenefitTab';
import DeductionForm from '../modules/dataEntry/DeductionForm';
import { SUB_TYPE_LABELS } from '../modules/dataEntry/config';

const TYPE_META = {
  absence: { icon: <PersonOffIcon />, color: '#ef4444', desc: 'ط«ط¨طھ ط؛غŒط¨طھ ظ…ظˆط¬ظ‡ ظˆ ط؛غŒط±ظ…ظˆط¬ظ‡ ط¨ط§ طھط¹ط¯ط§ط¯ ط±ظˆط²' },
  salary: { icon: <PaymentsIcon />, color: '#f59e0b', desc: 'ط«ط¨طھ ظپغŒط´ ط­ظ‚ظˆظ‚غŒ ظ…ط§ظ‡ط§ظ†ظ‡طŒ ط¯ط±ظˆظ†â€Œط±غŒط²غŒ ع¯ط±ظˆظ‡غŒ ظˆ ظ„غŒط³طھ' },
  benefit: { icon: <CardGiftcardIcon />, color: '#10b981', desc: 'ط«ط¨طھ ظ…ط²ط§غŒط§غŒ ط±ظپط§ظ‡غŒ ظˆ ظ…ظ†ط§ط³ط¨طھغŒ (ط¹غŒط¯غŒطŒ ط¨ظ† ع©ط§ط±طھطŒ ظˆط§ظ… ظˆ ...)' },
  deduction: { icon: <MoneyOffIcon />, color: '#8b5cf6', desc: 'ط«ط¨طھ ع©ط³ظˆط±ط§طھ (ظ…ط§ظ„غŒط§طھطŒ ط¨غŒظ…ظ‡طŒ ط§ظ‚ط³ط§ط· ظˆط§ظ… ظˆ ...)' },
};

const TABS = [
  { key: 'absence', label: 'ط؛غŒط¨طھ', icon: <PersonOffIcon /> },
  { key: 'salary', label: 'ط­ظ‚ظˆظ‚', icon: <PaymentsIcon /> },
  { key: 'benefit', label: 'ظ…ط²ط§غŒط§', icon: <CardGiftcardIcon /> },
  { key: 'deduction', label: 'ع©ط³ظˆط±ط§طھ', icon: <MoneyOffIcon /> },
];

const DataEntryPage = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState(0);

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => axiosInstance.get('/transactions/').then(r => r.data),
  });

  const items = Array.isArray(transactions) ? transactions : transactions?.results || [];

  const handleDelete = async (id) => {
    await axiosInstance.delete(`/transactions/${id}/`);
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
  };

  const active = TABS[tab];
  const activeMeta = TYPE_META[active.key];

  const renderForm = () => {
    const onSuccess = () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['employee-transactions'] });
    };
    switch (active.key) {
      case 'absence': return <AbsenceForm onSuccess={onSuccess} />;
      case 'salary': return <SalaryTab onSuccess={onSuccess} />;
      case 'benefit': return <BenefitTab onSuccess={onSuccess} />;
      case 'deduction': return <DeductionForm onSuccess={onSuccess} />;
      default: return null;
    }
  };

  return (
    <Box>
      {/* Glass header */}
      <Paper sx={{
        mb: 3, p: 2.5,
        display: 'flex', alignItems: 'center', gap: 2,
        background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(236,72,153,0.05))',
        border: '1px solid rgba(99,102,241,0.2)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderRadius: '10px',
      }}>
        <Avatar sx={{
          width: 56, height: 56,
          background: 'linear-gradient(135deg, #6366f1, #ec4899)',
          boxShadow: '0 6px 20px rgba(99,102,241,0.4)',
        }}>
          <InputIcon sx={{ fontSize: 28, color: '#fff' }} />
        </Avatar>
        <Box>
          <Typography variant="h5" fontWeight={800}>ظˆط±ظˆط¯ ط§ط·ظ„ط§ط¹ط§طھ</Typography>
          <Typography variant="body2" color="textSecondary">ط«ط¨طھ طھط®طµطµغŒ ط؛غŒط¨طھطŒ ط­ظ‚ظˆظ‚طŒ ظ…ط²ط§غŒط§ ظˆ ع©ط³ظˆط±ط§طھ ظ¾ط±ط³ظ†ظ„</Typography>
        </Box>
      </Paper>

      {/* Glass container with colored tabs */}
      <Paper sx={{
        mb: 3, overflow: 'hidden',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.55), rgba(255,255,255,0.3))',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.4)',
        borderRadius: '10px',
      }}>
        <Tabs
          value={tab}
          onChange={(e, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: '1px solid rgba(255,255,255,0.4)', px: 2 }}
        >
          {TABS.map((titem, i) => (
            <Tab
              key={titem.key}
              label={titem.label}
              sx={{
                fontWeight: 600,
                py: 1.75,
                color: tab === i ? TYPE_META[titem.key].color : 'text.secondary',
              }}
            />
          ))}
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* Active tab description */}
          <Paper sx={{
            mb: 2, px: 1.5, py: 1,
            background: `linear-gradient(135deg, ${activeMeta.color}0d, ${activeMeta.color}04)`,
            border: `1px solid ${activeMeta.color}20`,
            borderRadius: '10px',
          }}>
            <Typography variant="body2" sx={{ color: activeMeta.color, fontWeight: 600 }}>{activeMeta.desc}</Typography>
          </Paper>

          {renderForm()}
        </Box>
      </Paper>

      {/* Recent transactions */}
      <Paper sx={{
        p: 3,
        background: 'linear-gradient(135deg, rgba(255,255,255,0.55), rgba(255,255,255,0.3))',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.4)',
        borderRadius: '10px',
      }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>طھط±ط§ع©ظ†ط´â€Œظ‡ط§غŒ ط§ط®غŒط±</Typography>
        {isLoading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={24} /></Box>
        ) : !items.length ? (
          <Typography color="textSecondary" sx={{ textAlign: 'center', py: 3 }}>طھط±ط§ع©ظ†ط´غŒ ط«ط¨طھ ظ†ط´ط¯ظ‡ ط§ط³طھ</Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>ظ¾ط±ط³ظ†ظ„</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>ظ†ظˆط¹</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>ط²غŒط±ظ†ظˆط¹</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>ظ…ط¨ظ„ط؛ (ط±غŒط§ظ„)</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>ظ…ظ‚ط¯ط§ط±</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>طھط§ط±غŒط®</TableCell>
                  <TableCell width={50}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.slice(0, 30).map(tx => {
                  const meta = TYPE_META[tx.transaction_type] || { color: '#999', icon: null };
                  return (
                    <TableRow key={tx.id} hover>
                      <TableCell>{tx.employee_name}</TableCell>
                      <TableCell>
                        <Chip size="small" label={tx.transaction_type_display} variant="outlined"
                          sx={{ color: meta.color, borderColor: meta.color }} />
                      </TableCell>
                      <TableCell>{SUB_TYPE_LABELS[tx.sub_type] || 'â€”'}</TableCell>
                      <TableCell>{tx.amount ? formatPersianNumber(tx.amount) : 'â€”'}</TableCell>
                      <TableCell>{tx.quantity ? formatPersianNumber(tx.quantity) : 'â€”'}</TableCell>
                      <TableCell>{toJalali(tx.date)}</TableCell>
                      <TableCell>
                        <IconButton size="small" color="error" onClick={() => handleDelete(tx.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
};

export default DataEntryPage;