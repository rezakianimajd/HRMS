/**
 * کشوی جزئیات نامه — پروندهٔ نامه با تب‌های مشخصات، ارجاعات، پیوست‌ها و تاریخچه.
 * از `CorrespondenceLettersPage` جدا شد (فاز ۴ نگهداشت‌پذیری) تا همین پرونده در
 * تب مکاتبات پروندهٔ قرارداد هم قابل استفاده باشد.
 */
import React from 'react';
import {
  Box, Button, Chip, Dialog, IconButton, Stack, Tab, Tabs, TextField, Tooltip, Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import ArchiveIcon from '@mui/icons-material/Archive';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DownloadIcon from '@mui/icons-material/Download';
import EditNoteIcon from '@mui/icons-material/EditNote';
import ForwardToInboxIcon from '@mui/icons-material/ForwardToInbox';
import InboxIcon from '@mui/icons-material/MoveToInbox';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import ReplyIcon from '@mui/icons-material/Reply';
import SendIcon from '@mui/icons-material/Send';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';

import { toPersianDigits } from '../../core/utils/numberUtils';
import { MUTED } from '../accounting/AccountingDashboardUI';
import {
  ACCENT, CONFIDENTIALITY_META, DIRECTION_META, EVENT_META, INCOMING, INTERNAL, OUTGOING,
  PRIORITY_META, SLATE, STATUS_META, WARN, MetaChip, chipSx, dateLabel,
  dateTimeLabel, daysBetween, daysLabel, money, timeLabel,
} from './correspondenceUi';
import { InfoGroup, InfoTable } from './correspondenceFormUi';
import LetterTimeline from './letterTimeline';

/**
 * پروندهٔ نامه در یک دیالوگ تمام‌صفحه.
 * `onAction(name, payload)` همان اندپوینت `/letters/{id}/{action}/` را صدا می‌زند.
 */
const LetterDetailsDialog = ({
  open,
  letter,
  tab,
  onTabChange,
  onClose,
  comment,
  onCommentChange,
  onCommentSubmit,
  commentPending,
  canEditOf,
  canCreateOf,
  canDeleteOf,
  onAction,
  onEdit,
  onPrint,
  onRefer,
  onCompleteReferral,
  onEditReferral,
  onDeleteReferral,
  canManageReferral,
  onPreview,
  onUpload,
  uploadRef,
  uploading,
  onDelete,
  onDeleteAttachment,
  deleteAttachmentPending,
}) => (
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { borderRadius: '18px', height: { xs: '96%', md: '90%' } } }}
      >
        {letter ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0 }}>
            <Box sx={{ p: 1.75, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Stack direction="row" alignItems="flex-start" spacing={1} sx={{ minWidth: 0 }}>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography noWrap title={letter.subject} sx={{ fontSize: 15, fontWeight: 900 }}>
                    {letter.subject || 'بدون موضوع'}
                  </Typography>
                  <Typography noWrap sx={{ fontSize: 12.5, color: MUTED, fontWeight: 600 }}>
                    {letter.number || letter.archive_ref
                      ? `شماره: ${toPersianDigits(letter.number || letter.archive_ref)}`
                      : 'بدون شماره'}
                    {letter.contract_title ? ` · قرارداد: ${letter.contract_title}` : ''}
                    {letter.entry_method_display ? ` · ورود: ${letter.entry_method_display}` : ''}
                  </Typography>
                </Box>
                <IconButton size="small" onClick={onClose} aria-label="بستن">
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Stack>
              <Stack direction="row" spacing={0.6} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                <MetaChip meta={DIRECTION_META[letter.direction]} />
                <MetaChip meta={STATUS_META[letter.status]} />
                <MetaChip meta={PRIORITY_META[letter.priority]} />
                {letter.confidentiality !== 'normal' ? (
                  <MetaChip meta={CONFIDENTIALITY_META[letter.confidentiality]} />
                ) : null}
                <Chip size="small" label={`پیوست: ${toPersianDigits(letter.attachment_count || 0)}`}
                  sx={chipSx(INTERNAL)} />
                <Chip size="small" label={`ارجاع: ${toPersianDigits(letter.referral_count || 0)}`}
                  sx={chipSx(WARN)} />
              </Stack>
              <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mt: 1.25 }}>
                {!letter.number && canEditOf(letter) ? (
                  <Button size="small" variant="outlined" startIcon={<TaskAltIcon />}
                    onClick={() => onAction('register')}>
                    ثبت شماره
                  </Button>
                ) : null}
                {!['archived', 'closed', 'canceled'].includes(letter.status) ? (
                  <>
                    {canEditOf(letter) ? (
                      <Button size="small" variant="outlined" startIcon={<ForwardToInboxIcon />}
                        onClick={onRefer}>
                        ارجاع
                      </Button>
                    ) : null}
                    {canCreateOf(letter) ? (
                      <Button size="small" variant="outlined" startIcon={<ReplyIcon />}
                        onClick={() => onAction('reply', {})}>
                        پاسخ
                      </Button>
                    ) : null}
                    {canEditOf(letter) ? (
                      <Button size="small" variant="outlined" startIcon={<TaskAltIcon />}
                        onClick={() => onAction('close')}>
                        بستن پرونده
                      </Button>
                    ) : null}
                  </>
                ) : null}
                {letter.status !== 'archived' && canEditOf(letter) ? (
                  <Button size="small" variant="outlined" startIcon={<ArchiveIcon />}
                    onClick={() => onAction('archive')}>
                    بایگانی
                  </Button>
                ) : null}
                {canEditOf(letter) ? (
                  <Button size="small" variant="outlined" startIcon={<EditNoteIcon />}
                    onClick={onEdit}>
                    ویرایش
                  </Button>
                ) : null}
                <Button size="small" variant="outlined" startIcon={<PrintOutlinedIcon />}
                  onClick={onPrint}>
                  چاپ
                </Button>
                {canDeleteOf(letter) ? (
                  <Button size="small" variant="outlined" color="error" startIcon={<DeleteOutlineIcon />}
                    onClick={onDelete}>
                    حذف نامه
                  </Button>
                ) : null}
              </Stack>
            </Box>

            <Tabs value={tab} onChange={(_event, value) => onTabChange(value)}
              sx={{
                minHeight: 38, px: 1.5,
                borderBottom: '1px solid', borderColor: 'divider',
                '& .MuiTab-root': { minHeight: 38, py: 0.4, fontSize: 12.5, fontWeight: 800 },
                '& .MuiTabs-indicator': { bgcolor: ACCENT, height: 2.5, borderRadius: 2 },
              }}>
              <Tab value="info" label="مشخصات" />
              <Tab value="referrals" label={`ارجاعات (${toPersianDigits(letter.referral_count || 0)})`} />
              <Tab value="attachments" label={`پیوست‌ها (${toPersianDigits(letter.attachment_count || 0)})`} />
              <Tab value="history" label="تاریخچه" />
            </Tabs>

            <Box sx={{ p: 1.75, overflowY: 'auto', flex: 1, minWidth: 0 }}>
              {tab === 'info' ? (
                <Box sx={{ minWidth: 0 }}>
                  <InfoGroup
                    icon={letter.direction === 'outgoing' ? SendIcon : InboxIcon}
                    title={letter.direction === 'outgoing' ? 'ثبت و ارسال' : 'ثبت و ورود'}
                    color={letter.direction === 'outgoing' ? OUTGOING : WARN}>
                    <InfoTable rows={[
                      [letter.direction === 'outgoing' ? 'نحوهٔ ثبت / ارسال' : 'نحوهٔ ورود',
                        letter.entry_method_display],
                      [letter.direction === 'outgoing' ? 'ساعت ارسال' : 'ساعت ورود',
                        letter.entry_time ? timeLabel(letter.entry_time) : ''],
                      [letter.direction === 'outgoing' ? 'نوع ارسال' : 'نوع تحویل',
                        letter.delivery_type_display],
                      [letter.direction === 'outgoing'
                        ? 'تحویل‌دهنده / پیک' : 'تحویل‌دهنده / ثبت‌کنندهٔ ورود',
                      letter.delivered_by_label
                        || letter.delivered_by_name
                        || letter.entered_by_label],
                      ['تاریخ ارسال', letter.direction === 'outgoing'
                        ? dateLabel(letter.sent_date) : ''],
                      ['تاریخ ورود', letter.direction === 'outgoing'
                        ? '' : dateLabel(letter.received_date)],
                      ['واحد ثبت‌کننده', letter.unit_name],
                      ['تاریخ نامه', dateLabel(letter.letter_date)],
                    ]} />
                  </InfoGroup>

                  <InfoGroup icon={EditNoteIcon} title="شماره‌های ثبت" color={INCOMING}>
                    <InfoTable rows={[
                      ['شماره نامه', letter.number ? toPersianDigits(letter.number) : ''],
                      ['شماره اندیکاتور', letter.indicator_no
                        ? toPersianDigits(letter.indicator_no) : ''],
                      ['شماره ترنسمیتال', letter.transmittal_no
                        ? toPersianDigits(letter.transmittal_no) : ''],
                      ['شماره نامهٔ طرف مقابل', letter.external_number
                        ? toPersianDigits(letter.external_number) : ''],
                      ['شماره بایگانی / ارسالی', letter.archive_ref
                        ? toPersianDigits(letter.archive_ref) : ''],
                      ['شماره ثبت ورود به شرکت',
                        letter.company_reg_no ? toPersianDigits(letter.company_reg_no) : ''],
                      ['تاریخ ثبت ورود به شرکت', dateLabel(letter.company_reg_date)],
                      ['شماره ثبت ورود به واحد',
                        letter.unit_reg_no ? toPersianDigits(letter.unit_reg_no) : ''],
                      ['تاریخ ثبت ورود به واحد', dateLabel(letter.unit_reg_date)],
                      ['پاسخ به نامه', letter.reply_number],
                    ]} />
                  </InfoGroup>

                  <InfoGroup icon={SendIcon} title="طرفین مکاتبه" color={OUTGOING}>
                    <InfoTable rows={[
                      ['فرستنده', letter.sender_label
                        || letter.sender_name
                        || letter.sender_party_name
                        || letter.sender_organization_name],
                      ['گیرنده', letter.receiver_employee_label || letter.receiver_name],
                      ['مخاطب', letter.correspondent_name],
                      ['طرف حساب', letter.party_account_name
                        || letter.party_name
                        || letter.organization_name],
                      ['قرارداد مرتبط', letter.contract_title
                        || (letter.contract_number
                          ? `شماره ${toPersianDigits(letter.contract_number)}` : '')],
                    ]} />
                  </InfoGroup>

                  <InfoGroup icon={MailOutlineIcon} title="مشخصات" color={INTERNAL}>
                    <InfoTable rows={[
                      ['نوع مکاتبه', letter.category_title],
                      ['اولویت', letter.priority_display],
                      ['محرمانگی', letter.confidentiality_display],
                      ['مهلت پاسخ', letter.due_date
                        ? `${dateLabel(letter.due_date)} (${daysLabel(daysBetween(letter.due_date))})`
                        : ''],
                      ['ثبت‌کننده در سامانه', letter.created_by_name],
                      ['مبلغ', letter.amount
                        ? `${money(letter.amount)} ${letter.currency || 'ریال'}` : ''],
                    ]} />
                  </InfoGroup>

                  <InfoGroup icon={EditNoteIcon} title="موضوع و متن" color={SLATE}>
                    <InfoTable columns={1} rows={[
                      ['موضوع', letter.subject],
                      ['خلاصه', letter.summary],
                      ['متن نامه', letter.body],
                    ]} />
                  </InfoGroup>
                </Box>
              ) : null}

              {tab === 'referrals' ? (
                <LetterTimeline
                  letter={letter}
                  onCompleteReferral={onCompleteReferral}
                  onEditReferral={onEditReferral}
                  onDeleteReferral={onDeleteReferral}
                  canManageReferral={canManageReferral}
                />
              ) : null}

              {tab === 'attachments' ? (
                <Stack spacing={1}>
                  <Button size="small" variant="outlined" startIcon={<AttachFileIcon />}
                    disabled={uploading || !canEditOf(letter)}
                    onClick={() => uploadRef.current?.click()}>
                    {uploading ? 'در حال بارگذاری…' : 'افزودن پیوست'}
                  </Button>
                  <input ref={uploadRef} type="file" hidden onChange={onUpload} />
                  {(letter.attachments || []).length ? (letter.attachments || []).map((file, fileIndex) => (
                    <Stack key={file.id} direction="row" alignItems="center" spacing={0.75}
                      sx={{ p: 0.75, borderRadius: '10px', border: '1px solid', borderColor: 'divider', minWidth: 0 }}>
                      <AttachFileIcon sx={{ fontSize: 16, color: INTERNAL }} />
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography noWrap title={file.title} sx={{ fontSize: 12.5, fontWeight: 800 }}>
                          {file.title || 'پیوست'}
                        </Typography>
                        <Typography noWrap sx={{ fontSize: 11.5, color: MUTED }}>
                          {file.kind_display} · {toPersianDigits(Math.max(1, Math.round((file.size || 0) / 1024)))} کیلوبایت
                        </Typography>
                      </Box>
                      <Tooltip title="مشاهدهٔ پیوست">
                        <IconButton size="small" aria-label="مشاهدهٔ پیوست"
                          onClick={() => onPreview(letter.attachments, fileIndex, letter.subject)}>
                          <VisibilityOutlinedIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="دانلود">
                        <IconButton size="small" aria-label="دانلود پیوست"
                          component="a" href={file.download_url || file.file_url}
                          target="_blank" rel="noreferrer">
                          <DownloadIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                      {canDeleteOf(letter) ? (
                        <Tooltip title="حذف پیوست">
                          <span>
                            <IconButton size="small" color="error" aria-label="حذف پیوست"
                              disabled={deleteAttachmentPending}
                              onClick={() => {
                                if (window.confirm(`پیوست «${file.title || 'بدون عنوان'}» حذف شود؟`)) {
                                  onDeleteAttachment(file);
                                }
                              }}>
                              <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </span>
                        </Tooltip>
                      ) : null}
                    </Stack>
                  )) : (
                    <Typography sx={{ fontSize: 12.5, color: MUTED }}>پیوستی ثبت نشده است.</Typography>
                  )}
                </Stack>
              ) : null}

              {tab === 'history' ? (
                <Stack spacing={1}>
                  <Stack direction="row" spacing={0.75} alignItems="flex-start">
                    <TextField size="small" fullWidth multiline minRows={2} label="یادداشت جدید"
                      value={comment} onChange={(event) => onCommentChange(event.target.value)}
                      disabled={!canEditOf(letter)} />
                    <Button size="small" variant="contained"
                      disabled={!comment.trim() || commentPending || !canEditOf(letter)}
                      onClick={() => onCommentSubmit()}
                      sx={{ bgcolor: ACCENT, minWidth: 80, height: 40 }}>
                      ثبت
                    </Button>
                  </Stack>
                  {(letter.events || []).length ? (letter.events || []).map((event) => (
                    <Stack key={event.id} direction="row" spacing={0.75}
                      sx={{
                        p: 0.75, border: '1px solid', borderColor: 'divider',
                        borderRadius: '10px', minWidth: 0,
                      }}>
                      <Box sx={{
                        width: 8, height: 8, borderRadius: '50%', mt: 0.7, flex: '0 0 auto',
                        bgcolor: EVENT_META[event.action]?.color || SLATE,
                      }} />
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 800 }}>
                          {EVENT_META[event.action]?.label || event.action}
                        </Typography>
                        {event.note ? (
                          <Typography sx={{ fontSize: 11.5, whiteSpace: 'pre-wrap' }}>{event.note}</Typography>
                        ) : null}
                        <Typography sx={{ fontSize: 11.5, color: MUTED }}>
                          {event.actor_name || '—'} · {dateTimeLabel(event.created_at)}
                        </Typography>
                      </Box>
                    </Stack>
                  )) : (
                    <Typography sx={{ fontSize: 12.5, color: MUTED }}>رویدادی ثبت نشده است.</Typography>
                  )}
                </Stack>
              ) : null}
            </Box>
          </Box>
        ) : null}
      </Dialog>
);

export default LetterDetailsDialog;
