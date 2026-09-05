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
  absence: { icon: <PersonOffIcon />, color: '#ef4444', desc: 'ثبت غیبت موجه و غیرموجه با تعداد روز' },
  salary: { icon: <PaymentsIcon />, color: '#f59e0b', desc: 'ثبت فیش حقوقی ماهانه، درون‌ریزی گروهی و لیست' },
  benefit: { icon: <CardGiftcardIcon />, color: '#10b981', desc: 'ثبت مزایای رفاهی و مناسبتی (عیدی، بن کارت، وام و ...)' },
  deduction: { icon: <MoneyOffIcon />, color: '#8b5cf6', desc: 'ثبت کسورات (مالیات، بیمه، اقساط وام و ...)' },
};

const TABS = [
  { key: 'absence', label: 'غیبت', icon: <PersonOffIcon /> },
  { key: 'salary', label: 'حقوق', icon: <PaymentsIcon /> },
  { key: 'benefit', label: 'مزایا', icon: <CardGiftcardIcon /> },
  { key: 'deduction', label: 'کسورات', icon: <MoneyOffIcon /> },
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
        borderRadius: 3,
      }}>
        <Avatar sx={{
          width: 56, height: 56,
          background: 'linear-gradient(135deg, #6366f1, #ec4899)',
          boxShadow: '0 6px 20px rgba(99,102,241,0.4)',
        }}>
          <InputIcon sx={{ fontSize: 28, color: '#fff' }} />
        </Avatar>
        <Box>
          <Typography variant="h5" fontWeight={800}>ورود اطلاعات</Typography>
          <Typography variant="body2" color="textSecondary">ثبت تخصصی غیبت، حقوق، مزایا و کسورات پرسنل</Typography>
        </Box>
      </Paper>

      {/* Glass container with colored tabs */}
      <Paper sx={{
        mb: 3, overflow: 'hidden',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.55), rgba(255,255,255,0.3))',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.4)',
        borderRadius: 3,
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
            borderRadius: 2,
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
        borderRadius: 3,
      }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>تراکنش‌های اخیر</Typography>
        {isLoading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={24} /></Box>
        ) : !items.length ? (
          <Typography color="textSecondary" sx={{ textAlign: 'center', py: 3 }}>تراکنشی ثبت نشده است</Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>پرسنل</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>نوع</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>زیرنوع</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>مبلغ (ریال)</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>مقدار</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>تاریخ</TableCell>
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
                      <TableCell>{SUB_TYPE_LABELS[tx.sub_type] || '—'}</TableCell>
                      <TableCell>{tx.amount ? formatPersianNumber(tx.amount) : '—'}</TableCell>
                      <TableCell>{tx.quantity ? formatPersianNumber(tx.quantity) : '—'}</TableCell>
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