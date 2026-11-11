import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Alert, Box, Chip, CircularProgress, Grid, IconButton, Stack, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography,
} from '@mui/material';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import axiosInstance from '../../core/api/axiosConfig';
import { toPersianDigits } from '../../core/utils/numberUtils';
import { toJalali } from '../../core/utils/dateUtils';
import { DetailTile, MUTED, SectionCard } from './ContractProfileUI';
import LetterDetailsDialog from './ContractLetterDetailsDialog';

const dateLabel = (value) => (value ? toJalali(String(value).slice(0, 10)) : '—');

const DIRECTION_META = {
  incoming: { label: 'وارده', color: '#0f766e', bg: 'rgba(15,118,110,0.10)' },
  outgoing: { label: 'صادره', color: '#0ea5e9', bg: 'rgba(14,165,233,0.10)' },
  internal: { label: 'داخلی', color: '#7c3aed', bg: 'rgba(124,58,237,0.10)' },
};

const thSx = {
  fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap', py: 0.6,
  bgcolor: 'var(--hrms-table-head-bg, #f8fafc)',
};
const tdSx = { fontSize: 11, py: 0.5 };

const ContractCorrespondenceTab = ({ ctx }) => {
  const contract = ctx?.contract || {};
  const partyId = contract.party || contract.party_id || ctx?.partyId || '';
  const [selected, setSelected] = useState(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['contract-correspondence', partyId, contract.id],
    enabled: Boolean(partyId || contract.id),
    queryFn: async () => {
      const response = await axiosInstance.get('/letters/', {
        params: {
          party: partyId || undefined,
          contract: contract.id || undefined,
          page_size: 200,
        },
      });
      return response?.data ?? {};
    },
  });

  const rows = useMemo(() => {
    const list = Array.isArray(data) ? data : data?.results || [];
    return [...list].sort((left, right) => String(right.letter_date || '')
      .localeCompare(String(left.letter_date || '')));
  }, [data]);

  const stats = useMemo(() => ({
    total: rows.length,
    incoming: rows.filter((row) => row.direction === 'incoming').length,
    outgoing: rows.filter((row) => row.direction === 'outgoing').length,
    files: rows.reduce((sum, row) => sum + Number(row.attachment_count || 0), 0),
    open: rows.filter((row) => !['closed', 'archived', 'canceled', 'answered']
      .includes(row.status)).length,
  }), [rows]);

  if (!partyId && !contract.id) {
    return (
      <Alert severity="info" sx={{ fontSize: 11.5 }}>
        برای این قرارداد طرف حسابی ثبت نشده است؛ ابتدا طرف قرارداد را در مشخصات قرارداد انتخاب کنید.
      </Alert>
    );
  }

  if (isLoading) {
    return <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress size={22} /></Box>;
  }

  if (isError) {
    return (
      <Alert severity="error" sx={{ fontSize: 11.5 }}>
        دریافت مکاتبات این طرف حساب ممکن نشد.
      </Alert>
    );
  }

  return (
    <Stack spacing={1.5}>
      <Grid container spacing={1.5}>
        <Grid item xs={6} md={2.4}>
          <DetailTile label="کل مکاتبات" value={toPersianDigits(stats.total)} />
        </Grid>
        <Grid item xs={6} md={2.4}>
          <DetailTile label="وارده" value={toPersianDigits(stats.incoming)} />
        </Grid>
        <Grid item xs={6} md={2.4}>
          <DetailTile label="صادره" value={toPersianDigits(stats.outgoing)} />
        </Grid>
        <Grid item xs={6} md={2.4}>
          <DetailTile label="در جریان" value={toPersianDigits(stats.open)} />
        </Grid>
        <Grid item xs={6} md={2.4}>
          <DetailTile label="پیوست‌ها" value={toPersianDigits(stats.files)} />
        </Grid>
      </Grid>

      <SectionCard
        title={`مکاتبات طرف حساب${contract.party_name ? ` — ${contract.party_name}` : ''}`}
        icon={MailOutlineIcon}
      >
        {rows.length === 0 ? (
          <Box sx={{
            p: 3, textAlign: 'center', border: '1px dashed', borderColor: 'divider',
            borderRadius: '12px',
          }}>
            <Typography sx={{ fontSize: 11.5, color: MUTED }}>
              برای این طرف حساب هیچ نامه‌ای ثبت نشده است.
            </Typography>
          </Box>
        ) : (
          <TableContainer sx={{
            maxHeight: 460, overflow: 'auto', border: '1px solid',
            borderColor: 'var(--hrms-table-border-color, #e8edf4)', borderRadius: '12px',
          }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ ...thSx, width: '13%' }}>شماره</TableCell>
                  <TableCell sx={{ ...thSx, width: '11%' }}>تاریخ</TableCell>
                  <TableCell sx={thSx}>موضوع</TableCell>
                  <TableCell sx={{ ...thSx, width: '9%' }} align="center">جهت</TableCell>
                  <TableCell sx={{ ...thSx, width: '11%' }} align="center">وضعیت</TableCell>
                  <TableCell sx={{ ...thSx, width: '8%' }} align="center">پیوست</TableCell>
                  <TableCell sx={{ ...thSx, width: '7%' }} align="center">جزئیات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((letter) => {
                  const meta = DIRECTION_META[letter.direction] || DIRECTION_META.incoming;
                  return (
                    <TableRow key={letter.id} hover sx={{ cursor: 'pointer' }}
                      onClick={() => setSelected(letter)}>
                      <TableCell sx={tdSx}>{toPersianDigits(letter.number) || '—'}</TableCell>
                      <TableCell sx={tdSx}>{dateLabel(letter.letter_date)}</TableCell>
                      <TableCell sx={{ ...tdSx, maxWidth: 320 }}>
                        <Typography noWrap title={letter.subject} sx={{ fontSize: 11 }}>
                          {letter.subject}
                        </Typography>
                      </TableCell>
                      <TableCell sx={tdSx} align="center">
                        <Chip size="small" label={meta.label}
                          sx={{ height: 18, fontSize: 9.5, color: meta.color, bgcolor: meta.bg }} />
                      </TableCell>
                      <TableCell sx={tdSx} align="center">
                        {letter.status_display || '—'}
                      </TableCell>
                      <TableCell sx={tdSx} align="center">
                        {toPersianDigits(letter.attachment_count || 0)}
                      </TableCell>
                      <TableCell sx={tdSx} align="center">
                        <Tooltip title="مشاهدهٔ جزئیات و پیوست‌ها">
                          <IconButton size="small" onClick={(event) => {
                            event.stopPropagation();
                            setSelected(letter);
                          }}>
                            <VisibilityIcon sx={{ fontSize: 15, color: '#0369a1' }} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </SectionCard>

      <LetterDetailsDialog letter={selected} onClose={() => setSelected(null)} />
    </Stack>
  );
};

export default ContractCorrespondenceTab;
