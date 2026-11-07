import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Grid,
  IconButton, Stack, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import axiosInstance from '../../core/api/axiosConfig';
import AttachmentPreviewDialog from '../../core/components/ui/AttachmentPreviewDialog';
import { formatPersianNumber, toPersianDigits } from '../../core/utils/numberUtils';
import { toJalali } from '../../core/utils/dateUtils';
import { DetailTile, MUTED } from './ContractProfileUI';

const dateLabel = (value) => (value ? toJalali(String(value).slice(0, 10)) : '—');

const fileSizeLabel = (bytes) => {
  const value = Number(bytes) || 0;
  if (!value) return '—';
  if (value >= 1024 * 1024) {
    return `${formatPersianNumber(Number((value / (1024 * 1024)).toFixed(1)))} مگابایت`;
  }
  if (value >= 1024) return `${formatPersianNumber(Math.round(value / 1024))} کیلوبایت`;
  return `${formatPersianNumber(value)} بایت`;
};

const cellHead = { fontSize: 10.5, fontWeight: 800, py: 0.5 };
const cellBody = { fontSize: 10.5, py: 0.4 };


const ContractLetterDetailsDialog = ({ letter: incomingLetter, onClose }) => {
  const [previewIndex, setPreviewIndex] = useState(null);
  // فهرست نامه‌ها سبک است؛ جزئیات کامل (پیوست با بارگذارنده/تاریخ) را می‌گیریم.
  const { data: detail } = useQuery({
    queryKey: ['correspondence-letter', incomingLetter?.id],
    queryFn: () => axiosInstance.get(`/letters/${incomingLetter.id}/`).then((response) => response.data),
    enabled: Boolean(incomingLetter?.id),
    staleTime: 60 * 1000,
  });
  const letter = detail && detail.id ? detail : incomingLetter;
  const previewFiles = (letter?.attachments || []).filter((file) => file?.file_url);

  return (
  <>
  <Dialog open={Boolean(incomingLetter)} onClose={onClose} maxWidth="md" fullWidth
    PaperProps={{ sx: { borderRadius: '16px' } }}>
    <DialogTitle sx={{ fontSize: 13.5, fontWeight: 900, pb: 0.75 }}>
      {letter ? `${letter.number || 'بدون شماره'} — ${letter.subject}` : ''}
    </DialogTitle>
    <DialogContent dividers>
      {letter ? (
        <Stack spacing={1.5}>
          <Grid container spacing={1}>
            <Grid item xs={6} md={3}>
              <DetailTile label="تاریخ نامه" value={dateLabel(letter.letter_date)} />
            </Grid>
            <Grid item xs={6} md={3}>
              <DetailTile label="تاریخ ورود" value={dateLabel(letter.received_date)} />
            </Grid>
            <Grid item xs={6} md={3}>
              <DetailTile label="جهت" value={letter.direction_display} />
            </Grid>
            <Grid item xs={6} md={3}>
              <DetailTile label="وضعیت" value={letter.status_display} />
            </Grid>
            <Grid item xs={6} md={3}>
              <DetailTile label="شمارهٔ طرف مقابل"
                value={toPersianDigits(letter.external_number) || '—'} />
            </Grid>
            <Grid item xs={6} md={3}>
              <DetailTile label="اندیکاتور" value={toPersianDigits(letter.indicator_no) || '—'} />
            </Grid>
            <Grid item xs={6} md={3}>
              <DetailTile label="نوع مکاتبه" value={letter.category_title || '—'} />
            </Grid>
            <Grid item xs={6} md={3}>
              <DetailTile label="اولویت" value={letter.priority_display || '—'} />
            </Grid>
            <Grid item xs={6} md={3}>
              <DetailTile label="فرستنده"
                value={letter.sender_label || letter.sender_name || '—'} />
            </Grid>
            <Grid item xs={6} md={3}>
              <DetailTile label="گیرنده"
                value={letter.receiver_label || letter.receiver_name || '—'} />
            </Grid>
            <Grid item xs={6} md={3}>
              <DetailTile label="طرف حساب"
                value={letter.party_label || letter.party_account_name || '—'} />
            </Grid>
            <Grid item xs={6} md={3}>
              <DetailTile label="ارجاع‌ها"
                value={`${toPersianDigits(letter.referral_count || 0)} ارجاع`} />
            </Grid>
          </Grid>

          {letter.summary ? (
            <Box>
              <Typography sx={{ fontSize: 11.5, fontWeight: 800, mb: 0.4 }}>خلاصه</Typography>
              <Typography sx={{ fontSize: 11.5, color: MUTED, whiteSpace: 'pre-wrap' }}>
                {letter.summary}
              </Typography>
            </Box>
          ) : null}

          <Divider />
          <Box>
            <Typography sx={{ fontSize: 11.5, fontWeight: 800, mb: 0.5 }}>
              {`پیوست‌ها (${toPersianDigits((letter.attachments || []).length)})`}
            </Typography>
            {(letter.attachments || []).length === 0 ? (
              <Typography sx={{ fontSize: 11, color: MUTED }}>پیوستی ثبت نشده است.</Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={cellHead}>عنوان</TableCell>
                    <TableCell sx={cellHead}>نوع</TableCell>
                    <TableCell sx={cellHead}>حجم</TableCell>
                    <TableCell sx={cellHead}>بارگذاری‌کننده</TableCell>
                    <TableCell sx={cellHead}>تاریخ</TableCell>
                    <TableCell sx={cellHead} align="center">دریافت</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(letter.attachments || []).map((file, fileIndex) => (
                    <TableRow key={file.id} hover>
                      <TableCell sx={cellBody}>
                        {file.file_url ? (
                          <Box component="span" role="button" tabIndex={0}
                            onClick={() => setPreviewIndex(fileIndex)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') setPreviewIndex(fileIndex);
                            }}
                            sx={{ cursor: 'pointer', color: '#0369a1', fontWeight: 700 }}>
                            {file.title || '—'}
                          </Box>
                        ) : (file.title || '—')}
                      </TableCell>
                      <TableCell sx={cellBody}>{file.kind_display || '—'}</TableCell>
                      <TableCell sx={cellBody}>{fileSizeLabel(file.size)}</TableCell>
                      <TableCell sx={cellBody}>{file.uploaded_by_name || '—'}</TableCell>
                      <TableCell sx={cellBody}>{dateLabel(file.created_at)}</TableCell>
                      <TableCell sx={cellBody} align="center">
                        {file.file_url ? (
                          <Stack direction="row" spacing={0.25} justifyContent="center">
                            <Tooltip title="مشاهدهٔ پیوست (بدون دانلود)">
                              <IconButton size="small" aria-label="مشاهدهٔ پیوست"
                                onClick={() => setPreviewIndex(fileIndex)}>
                                <VisibilityOutlinedIcon sx={{ fontSize: 15, color: '#0369a1' }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="دریافت فایل">
                              <IconButton size="small" component="a" href={file.file_url}
                                target="_blank" rel="noopener noreferrer">
                                <DownloadIcon sx={{ fontSize: 15, color: '#0f766e' }} />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        ) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Box>

          {(letter.referrals || []).length ? (
            <>
              <Divider />
              <Box>
                <Typography sx={{ fontSize: 11.5, fontWeight: 800, mb: 0.5 }}>
                  {`ارجاعات (${toPersianDigits(letter.referrals.length)})`}
                </Typography>
                <Stack spacing={0.4}>
                  {letter.referrals.map((referral) => (
                    <Stack key={referral.id} direction="row" spacing={1} alignItems="center">
                      <Chip size="small" label={referral.status_display || referral.status}
                        sx={{ height: 18, fontSize: 9.5 }} />
                      <Typography sx={{ fontSize: 11 }}>
                        {referral.target_label || referral.to_name || '—'}
                      </Typography>
                      <Typography sx={{ fontSize: 10, color: MUTED }}>
                        {dateLabel(referral.referred_on)}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            </>
          ) : null}
        </Stack>
      ) : null}
    </DialogContent>
    <DialogActions sx={{ px: 2, py: 1 }}>
      <Button size="small" onClick={onClose}>بستن</Button>
    </DialogActions>
  </Dialog>

  <AttachmentPreviewDialog
    open={previewIndex !== null}
    items={previewFiles}
    index={previewIndex || 0}
    title={letter?.subject || ''}
    onClose={() => setPreviewIndex(null)}
  />
  </>
  );
};

export default ContractLetterDetailsDialog;
