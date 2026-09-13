import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { parseContractText } from '../../utils/contractTextParser';

const ContractPdf = ({ textValue, companyLogo, profile }) => {
  const companyName = profile?.legal_name || profile?.company_name || '';
  const companyAddress = profile?.address || '';

  return (
    <Paper
      dir="rtl"
      id="contract-print-area"
      className="professional-contract"
      sx={{
        p: 4,
        m: 'auto',
        maxWidth: 820,
        background: '#fff',
        borderRadius: '10px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
      }}
    >
      {/* Header: logo + company */}
      {companyLogo && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <img src={companyLogo} alt="logo" style={{ maxHeight: 80, marginBottom: 8 }} />
        </Box>
      )}
      {companyName && (
        <Typography
          variant="h5"
          fontWeight={900}
          align="center"
          sx={{ color: '#1a2744', fontSize: '1.35rem', letterSpacing: '-0.01em' }}
        >
          {companyName}
        </Typography>
      )}
      {companyAddress && (
        <Typography
          variant="caption"
          align="center"
          display="block"
          sx={{ color: 'text.secondary', fontSize: 10, mb: 1 }}
        >
          {companyAddress}
        </Typography>
      )}

      {/* Body text */}
      <Typography
        component="div"
        variant="body1"
        sx={{
          fontSize: 14,
          lineHeight: 2.1,
          textAlign: 'justify',
          fontFamily: 'Vazirmatn, Tahoma, sans-serif',
        }}
      >
        {textValue}
      </Typography>
    </Paper>
  );
};

export default ContractPdf;