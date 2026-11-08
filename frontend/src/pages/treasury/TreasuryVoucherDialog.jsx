import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, Divider,
  Stack, Typography,
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import axiosInstance from '../../core/api/axiosConfig';
import { printElement, printHtml } from '../../core/print/printEngine';
import { chipSx, moneyLabel } from './treasuryMasterUi';

const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  #hrms-treasury-voucher, #hrms-treasury-voucher * { visibility: visible !important; }
  #hrms-treasury-voucher { position: fixed; inset: 0; margin: 0; padding: 18px; background: #fff; }
  .MuiDialogActions-root { display: none !important; }
}
`;

const Row = ({ label, value }) => (
  <Stack direction="row" spacing={1} sx={{ py: 0.25 }}>
    <Typography sx={{ fontSize: 11, opacity: 0.7, minWidth: 105 }}>{label}</Typography>
    <Typography sx={{ fontSize: 11.5, fontWeight: 700, flex: 1 }}>{value || '—'}</Typography>
  </Stack>
);

export const VoucherSheet = ({ data, accent }) => (
  <Box id="hrms-treasury-voucher" sx={{
    border: '1px solid',
    borderColor: 'divider',
    borderRadius: '12px',
    p: 1.5,
    bgcolor: '#fff',
  }}>
    <Stack direction="row" alignItems="flex-start" spacing={1} sx={{ mb: 1 }}>
      <Box sx={{ flex: 1 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 900, color: accent }}>
          {data.title || 'رسید خزانه'}
        </Typography>
        <Typography sx={{ fontSize: 11.5, fontWeight: 700 }}>
          {data.company?.name || '—'}
        </Typography>
        <Typography sx={{ fontSize: 10, opacity: 0.7 }}>
          {[data.company?.code, data.company?.phone, data.company?.address].filter(Boolean).join(' · ')}
        </Typography>
      </Box>
      <Stack alignItems="flex-end" spacing={0.3}>
        <Chip size="small" label={data.number || '—'} sx={chipSx(accent)} />
        <Typography sx={{ fontSize: 10.5 }}>{data.date || '—'} {data.time || ''}</Typography>
      </Stack>
    </Stack>
    <Divider sx={{ mb: 1 }} />
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, columnGap: 2 }}>
      <Box>
        {data.received_from ? <Row label="دریافت از" value={data.received_from} /> : null}
        {data.beneficiary ? <Row label="پرداخت به" value={data.beneficiary} /> : null}
        {data.request_number ? <Row label="شماره درخواست" value={data.request_number} /> : null}
        <Row label="روش" value={data.method} />
        <Row label="بابت" value={data.purpose} />
        <Row label="شرح" value={data.description} />
        <Row label="پروژه" value={data.project} />
        <Row label="قرارداد" value={data.contract} />
      </Box>
      <Box>
        <Row label="حساب" value={[data.account?.name, data.account?.account_number].filter(Boolean).join(' — ')} />
        <Row label="شبا" value={data.account?.sheba_number} />
        <Row label="شماره پیگیری" value={data.instrument?.reference_no} />
        <Row label="شماره مرجع بانکی" value={data.instrument?.tracking_no} />
        <Row label="چک" value={data.instrument?.cheque} />
        <Row label="پایانه" value={data.instrument?.terminal} />
        <Row label="سند حسابداری" value={data.accounting_document} />
        <Row label="وضعیت" value={data.status} />
      </Box>
    </Box>
    <Box sx={{
      mt: 1,
      p: 1,
      borderRadius: '10px',
      border: '1px dashed',
      borderColor: 'divider',
      display: 'flex',
      gap: 1.5,
      alignItems: 'center',
      flexWrap: 'wrap',
    }}>
      <Box sx={{ flex: 1, minWidth: 160 }}>
        <Typography sx={{ fontSize: 10, opacity: 0.7 }}>مبلغ</Typography>
        <Typography sx={{ fontSize: 15, fontWeight: 900, color: accent }}>
          {moneyLabel(data.amount)} {data.currency === 'IRR' ? 'ریال' : data.currency}
        </Typography>
        <Typography sx={{ fontSize: 11 }}>{data.amount_words}</Typography>
      </Box>
      <Box sx={{ textAlign: 'center' }}>
        <VerifiedOutlinedIcon sx={{ fontSize: 34, color: accent }} />
        <Typography sx={{ fontSize: 9 }}>{data.verification?.code}</Typography>
      </Box>
    </Box>
    <Box sx={{
      display: 'grid',
      gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
      gap: 1,
      mt: 1.25,
    }}>
      {(data.signatures || []).map((item) => (
        <Box key={item.label} sx={{ borderTop: '1px dashed', borderColor: 'divider', pt: 0.5 }}>
          <Typography sx={{ fontSize: 9.5, opacity: 0.7 }}>{item.label}</Typography>
          <Typography sx={{ fontSize: 10 }}>{item.name || ' '}</Typography>
        </Box>
      ))}
    </Box>
    <Typography sx={{ fontSize: 9.5, mt: 1, opacity: 0.75 }}>{data.footer}</Typography>
  </Box>
);

const TreasuryVoucherDialog = ({ open, endpoint, onClose }) => {
  const voucherQuery = useQuery({
    queryKey: ['treasury-voucher', endpoint],
    queryFn: () => axiosInstance.get(endpoint).then((response) => response.data),
    enabled: Boolean(open && endpoint),
    staleTime: 60_000,
  });
  const data = voucherQuery.data;
  const frameRef = React.useRef(null);
  const contentRef = React.useRef(null);

  /* چاپ از موتور چاپ یکپارچه: HTML سرور (قالب) یا ناحیهٔ دیدهٔ سند */
  const printFrame = () => {
    if (data?.html) {
      printHtml(data.html, { title: 'سند خزانه‌داری' });
      return;
    }
    printElement(contentRef.current, { title: 'سند خزانه‌داری' });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <style>{PRINT_CSS}</style>
      <DialogContent dividers ref={contentRef}>
        {voucherQuery.isLoading || !data ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <CircularProgress size={22} />
          </Box>
        ) : data.html ? (
          <Box>
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.6 }}>
              <Chip size="small" label={`قالب: ${data.template_name || 'استاندارد'}`}
                sx={chipSx('#0f766e')} />
              <Chip size="small" label={data.paper || 'A5'} sx={chipSx('#64748b')} />
            </Stack>
            <iframe
              ref={frameRef}
              title="قالب چاپ سند"
              srcDoc={data.html}
              style={{ width: '100%', height: 420, border: '1px solid #e2e8f0', background: '#fff' }}
            />
          </Box>
        ) : (
          <VoucherSheet data={data} accent="#14b8a6" />
        )}
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.25 }}>
        <Button size="small" onClick={onClose}>بستن</Button>
        <Button
          size="small"
          variant="contained"
          startIcon={<PrintIcon sx={{ fontSize: 16 }} />}
          disabled={!data}
          onClick={printFrame}
        >
          چاپ
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TreasuryVoucherDialog;
