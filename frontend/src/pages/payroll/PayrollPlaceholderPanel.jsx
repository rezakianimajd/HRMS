import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Paper, Stack, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { payrollCardSx } from './payrollUi';

const PayrollPlaceholderPanel = ({ accent, description, requirements = [], related = [] }) => {
  const navigate = useNavigate();
  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Paper elevation={0} sx={payrollCardSx({ display: 'flex', gap: 1.5, alignItems: 'flex-start' })}>
        <InfoOutlinedIcon sx={{ color: accent, mt: 0.25 }} />
        <Box>
          <Typography sx={{ fontSize: 14, fontWeight: 800, mb: 0.75 }}>این صفحه در ساختار ماژول تعریف شده است</Typography>
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', lineHeight: 1.9 }}>{description}</Typography>
        </Box>
      </Paper>
      <Alert severity="info" sx={{ fontSize: 12.5 }}>
        برای فعال‌شدن محاسبات این صفحه، داده‌های پایه و قوانین سال ۱۴۰۵ باید در «تعاریف اولیه» تکمیل شود.
        محاسبات حقوقی هیچ نرخ قانونی را در کد ثابت نمی‌کنند و از نرخ‌های تاریخ‌محور شرکت استفاده می‌کنند.
      </Alert>
      {requirements.length > 0 && (
        <Paper elevation={0} sx={payrollCardSx()}>
          <Typography sx={{ fontSize: 13, fontWeight: 800, mb: 1 }}>پیش‌نیازهای این بخش</Typography>
          <Stack component="ul" spacing={0.75} sx={{ m: 0, pr: 2.5 }}>
            {requirements.map((row) => <Typography component="li" key={row} sx={{ fontSize: 12.5 }}>{row}</Typography>)}
          </Stack>
        </Paper>
      )}
      {related.length > 0 && (
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
          {related.map((row) => (
            <Button key={row.path} size="small" variant="outlined" onClick={() => navigate(row.path)}>{row.label}</Button>
          ))}
        </Stack>
      )}
    </Box>
  );
};

export default PayrollPlaceholderPanel;
