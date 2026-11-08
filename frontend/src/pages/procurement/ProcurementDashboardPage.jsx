/** داشبورد مدیریت خرید — نمای کلی چرخهٔ خرید (پوستهٔ استودیو تم). */
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, CircularProgress, Stack, Table, TableBody, TableCell, TableHead,
  TableRow, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FolderSharedIcon from '@mui/icons-material/FolderShared';
import PaymentsIcon from '@mui/icons-material/Payments';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import StorefrontIcon from '@mui/icons-material/Storefront';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import { dateLabel, digits, money, num, useList } from './procurementUi';
import { StudioCard, StudioChip, StudioHeader, StudioKpi, studioTableSx, useProcurementStudio } from './procurementStudioUi';

const INQUIRY_STATUS = {
  draft: { label: 'پیش‌نویس', color: '#64748b' },
  sent: { label: 'ارسال‌شده', color: '#3b82f6' },
  open: { label: 'باز', color: '#0f766e' },
  evaluating: { label: 'در ارزیابی', color: '#b45309' },
  awarded: { label: 'برنده انتخاب شد', color: '#8b5cf6' },
  cancelled: { label: 'لغو‌شده', color: '#be123c' },
};

const QUICK_LINKS = [
  { title: 'پرونده خرید', hint: 'اسناد هر طرف حساب', path: '/procurement/profiles', icon: FolderSharedIcon },
  { title: 'استعلام‌ها', hint: 'RFQ و مقایسهٔ پیشنهاد', path: '/procurement/inquiries', icon: RequestQuoteIcon },
  { title: 'سفارش‌های خرید', hint: 'پیگیری سفارش‌ها', path: '/procurement/orders', icon: ShoppingCartIcon },
  { title: 'پیش‌فاکتورها', hint: 'تبدیل به فاکتور', path: '/procurement/proforma', icon: ReceiptLongIcon },
  { title: 'تضامین خرید', hint: 'اعتبار و اقدامات', path: '/procurement/guarantees', icon: VerifiedUserIcon },
  { title: 'تخصیص پرداخت‌ها', hint: 'پرداخت به فاکتور', path: '/procurement/allocations', icon: PaymentsIcon },
];

const ProcurementDashboardPage = () => {
  const studio = useProcurementStudio();
  const navigate = useNavigate();

  const profiles = useList('/procurement/supplier-profiles/', { page_size: 500 });
  const inquiries = useList('/procurement/inquiries/', { page_size: 200 });
  const orders = useList('/procurement/purchase-orders/', { page_size: 200 });
  const invoices = useList('/procurement/purchase-invoices/', { page_size: 200 });
  const guarantees = useList('/procurement/procurement-guarantees/overview/', {});

  const supplierRows = profiles.rows || [];
  const inquiryRows = inquiries.rows || [];
  const orderRows = orders.rows || [];
  const invoiceRows = invoices.rows || [];
  const overview = (Array.isArray(guarantees.rows) ? guarantees.rows[0] : guarantees.rows) || {};

  const totals = useMemo(() => supplierRows.reduce((acc, row) => ({
    documents: acc.documents + num(row.documents_count),
    invoices: acc.invoices + num(row.invoices_total),
    balance: acc.balance + num(row.invoices_balance),
  }), { documents: 0, invoices: 0, balance: 0 }), [supplierRows]);

  const openInquiries = inquiryRows.filter((row) => !['awarded', 'cancelled'].includes(row.status));
  const openOrders = orderRows.filter((row) => !['closed', 'cancelled'].includes(row.status));
  const unpaidInvoices = invoiceRows
    .filter((row) => row.payment_status !== 'paid')
    .sort((a, b) => num(b.total) - num(a.total))
    .slice(0, 6);
  const latestInquiries = [...inquiryRows]
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
    .slice(0, 6);
  return (
    <Box>
      <StudioHeader icon={<ShoppingCartIcon />} title="داشبورد مدیریت خرید"
        subtitle="نمای کلی استعلام‌ها، سفارش‌ها، فاکتورها، تضامین و ماندهٔ پرداخت طرف حساب‌ها"
        actions={(
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" size="small" startIcon={<FolderSharedIcon fontSize="small" />}
              onClick={() => navigate('/procurement/profiles')}>پرونده خرید</Button>
            <Button variant="contained" size="small" startIcon={<AddIcon fontSize="small" />}
              onClick={() => navigate('/procurement/inquiries')} sx={{ bgcolor: studio.accent }}>
              استعلام جدید
            </Button>
          </Stack>
        )} />

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
        gap: 1.5, mb: 1.5 }}>
        <StudioKpi label="طرف حساب‌ها" value={digits(supplierRows.length)}
          hint={`اسناد: ${digits(totals.documents)}`} icon={StorefrontIcon} color={studio.accent} />
        <StudioKpi label="استعلام‌های باز" value={digits(openInquiries.length)}
          hint={`کل: ${digits(inquiryRows.length)}`} icon={RequestQuoteIcon} color="#3b82f6" />
        <StudioKpi label="سفارش‌های جاری" value={digits(openOrders.length)}
          hint={`کل: ${digits(orderRows.length)}`} icon={ShoppingCartIcon} color="#8b5cf6" />
        <StudioKpi label="مبلغ فاکتورها" value={money(totals.invoices)} icon={ReceiptLongIcon} color="#0f766e" />
        <StudioKpi label="ماندهٔ پرداخت‌نشده" value={money(totals.balance)}
          hint={`فاکتورهای باز: ${digits(unpaidInvoices.length)}`} icon={PaymentsIcon} color="#b45309" />
        <StudioKpi label="تضامین فعال" value={digits(overview.active || 0)}
          hint={`نزدیک پایان: ${digits(overview.expiring_30 || 0)}`} icon={VerifiedUserIcon} color="#14b8a6" />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 1.5, mb: 1.5 }}>
        <StudioCard padding={0}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 1.5, py: 1.25 }}>
            <Typography sx={{ fontFamily: studio.font, fontWeight: 900, fontSize: 13 }}>
              آخرین استعلام‌ها
            </Typography>
            <Button size="small" onClick={() => navigate('/procurement/inquiries')}
              sx={{ fontSize: 11 }}>همه</Button>
          </Stack>
          {inquiries.loading ? (
            <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress size={20} /></Stack>
          ) : (
            <Table size="small" sx={studioTableSx(studio)}>
              <TableHead>
                <TableRow>
                  <TableCell>موضوع</TableCell>
                  <TableCell>مهلت</TableCell>
                  <TableCell align="center">پیشنهاد</TableCell>
                  <TableCell align="center">وضعیت</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {latestInquiries.map((row) => (
                  <TableRow key={row.id} hover sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/procurement/inquiries/${row.id}/comparison`)}>
                    <TableCell>{row.subject}</TableCell>
                    <TableCell>{dateLabel(row.deadline)}</TableCell>
                    <TableCell align="center">{digits(row.quotation_count || 0)}</TableCell>
                    <TableCell align="center">
                      <StudioChip label={(INQUIRY_STATUS[row.status] || {}).label || row.status}
                        color={(INQUIRY_STATUS[row.status] || {}).color} />
                    </TableCell>
                  </TableRow>
                ))}
                {!latestInquiries.length ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 3, color: studio.muted }}>
                      استعلامی ثبت نشده است.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          )}
        </StudioCard>

        <StudioCard padding={0}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 1.5, py: 1.25 }}>
            <Typography sx={{ fontFamily: studio.font, fontWeight: 900, fontSize: 13 }}>
              فاکتورهای دارای مانده
            </Typography>
            <Button size="small" onClick={() => navigate('/procurement/invoices')}
              sx={{ fontSize: 11 }}>همه</Button>
          </Stack>
          {invoices.loading ? (
            <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress size={20} /></Stack>
          ) : (
            <Table size="small" sx={studioTableSx(studio)}>
              <TableHead>
                <TableRow>
                  <TableCell>شماره</TableCell>
                  <TableCell>تأمین‌کننده</TableCell>
                  <TableCell>مبلغ</TableCell>
                  <TableCell>مانده</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {unpaidInvoices.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>{digits(row.number || '—')}</TableCell>
                    <TableCell>{row.supplier_name || '—'}</TableCell>
                    <TableCell>{money(row.total)}</TableCell>
                    <TableCell>{money(num(row.total) - num(row.paid_amount))}</TableCell>
                  </TableRow>
                ))}
                {!unpaidInvoices.length ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 3, color: studio.muted }}>
                      مانده‌ای وجود ندارد.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          )}
        </StudioCard>
      </Box>

      <StudioCard>
        <Typography sx={{ fontFamily: studio.font, fontWeight: 900, fontSize: 13, mb: 1.25 }}>
          دسترسی سریع
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 1.25 }}>
          {QUICK_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Stack key={link.path} direction="row" spacing={1} alignItems="center"
                onClick={() => navigate(link.path)}
                sx={{
                  p: 1.25, borderRadius: studio.radiusSmall, border: '1px solid',
                  borderColor: studio.border, cursor: 'pointer', bgcolor: studio.elevated,
                  '&:hover': { borderColor: studio.accent },
                }}>
                <Box sx={{
                  width: 32, height: 32, borderRadius: '10px', display: 'grid', placeItems: 'center',
                  bgcolor: `${studio.accent}1f`, color: studio.accent,
                }}>
                  <Icon sx={{ fontSize: 17 }} />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontFamily: studio.font, fontSize: 12, fontWeight: 800 }} noWrap>
                    {link.title}
                  </Typography>
                  <Typography sx={{ fontFamily: studio.font, fontSize: 10.5, color: studio.muted }} noWrap>
                    {link.hint}
                  </Typography>
                </Box>
              </Stack>
            );
          })}
        </Box>
      </StudioCard>
    </Box>
  );
};

export default ProcurementDashboardPage;
