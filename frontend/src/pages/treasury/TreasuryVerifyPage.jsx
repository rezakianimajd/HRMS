import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Alert, Box, Chip, CircularProgress, Divider, Paper, Stack, Typography,
} from '@mui/material';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import axiosInstance from '../../core/api/axiosConfig';
import { moneyLabel } from './treasuryMasterUi';

/**
 * صفحهٔ عمومی اعتبارسنجی سند خزانه (§33) — با اسکن QR فیش، فقط اطلاعات
 * غیرمحرمانه (شماره، تاریخ، مبلغ، نوع و وضعیت) نمایش داده می‌شود.
 */
const TreasuryVerifyPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const verifyQuery = useQuery({
    queryKey: ['treasury-verify', token],
    queryFn: () => axiosInstance.get('/treasury/verify/', { params: { token } })
      .then((response) => response.data)
      .catch((error) => ({ valid: false, detail: error?.response?.data?.detail || 'سند معتبر نیست.' })),
    enabled: Boolean(token),
    retry: false,
  });

  const data = verifyQuery.data;

  return (
    <Box sx={{ maxWidth: 520, mx: 'auto', py: 4 }}>
      <Paper elevation={0} sx={{
        p: 2,
        borderRadius: 'var(--hrms-table-radius, 16px)',
        border: '1px solid',
        borderColor: 'divider',
      }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <VerifiedOutlinedIcon sx={{ fontSize: 26, color: '#0f766e' }} />
          <Typography sx={{ fontSize: 14, fontWeight: 900 }}>اعتبارسنجی سند خزانه</Typography>
        </Stack>

        {!token ? (
          <Alert severity="warning" sx={{ fontSize: 11.5 }}>
            توکن سند در نشانی وجود ندارد؛ QR روی فیش را دوباره اسکن کنید.
          </Alert>
        ) : null}

        {verifyQuery.isLoading ? <CircularProgress size={20} /> : null}

        {data && data.valid ? (
          <Stack spacing={0.75}>
            <Chip size="small" label={data.kind_label}
              sx={{ alignSelf: 'flex-start', bgcolor: '#0f766e14', color: '#0f766e' }} />
            <Divider />
            <Typography sx={{ fontSize: 12 }}>شماره سند: <b>{data.number}</b></Typography>
            <Typography sx={{ fontSize: 12 }}>تاریخ: <b>{data.date}</b></Typography>
            <Typography sx={{ fontSize: 12 }}>
              مبلغ: <b>{moneyLabel(data.amount)}</b>
            </Typography>
            <Typography sx={{ fontSize: 11.5 }}>{data.amount_words}</Typography>
            <Typography sx={{ fontSize: 12 }}>وضعیت: <b>{data.status}</b></Typography>
          </Stack>
        ) : null}

        {data && !data.valid ? (
          <Alert severity="error" sx={{ fontSize: 11.5 }}>
            {data.detail || 'این سند معتبر نیست.'}
          </Alert>
        ) : null}
      </Paper>
    </Box>
  );
};

export default TreasuryVerifyPage;
