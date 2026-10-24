import React from 'react';
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider,
  IconButton, Paper, Stack, Tooltip, Typography,
} from '@mui/material';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import ContactPageOutlinedIcon from '@mui/icons-material/ContactPageOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import FolderZipOutlinedIcon from '@mui/icons-material/FolderZipOutlined';
import HealthAndSafetyOutlinedIcon from '@mui/icons-material/HealthAndSafetyOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import MilitaryTechOutlinedIcon from '@mui/icons-material/MilitaryTechOutlined';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import SlideshowOutlinedIcon from '@mui/icons-material/SlideshowOutlined';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import CloseIcon from '@mui/icons-material/Close';
import EmployeeAvatar from '../../core/components/ui/EmployeeAvatar';
import { toPersianDigits } from '../../core/utils/numberUtils';
import { toJalali } from '../../core/utils/dateUtils';
import { documentSourceLabel, documentTypeLabel, fileFormat } from './personnelDocuments';

const FONT = 'Vazirmatn, IRANSans, sans-serif';
const ACCENT = '#0f766e';
const MUTED = '#64748b';
const INK = '#0f172a';
const FORMAT_LABELS = {
  image: 'تصویر', pdf: 'PDF', word: 'Word', excel: 'Excel',
  powerpoint: 'PowerPoint', archive: 'ZIP', other: 'فایل',
};
const FORMAT_ICONS = {
  image: ImageOutlinedIcon,
  pdf: PictureAsPdfOutlinedIcon,
  word: DescriptionOutlinedIcon,
  excel: TableChartOutlinedIcon,
  powerpoint: SlideshowOutlinedIcon,
  archive: FolderZipOutlinedIcon,
  other: InsertDriveFileOutlinedIcon,
};
const CATEGORY_ICONS = {
  photo: PhotoCameraOutlinedIcon,
  national_id: BadgeOutlinedIcon,
  birth_certificate: ContactPageOutlinedIcon,
  education: SchoolOutlinedIcon,
  contract: DescriptionOutlinedIcon,
  insurance: HealthAndSafetyOutlinedIcon,
  service: MilitaryTechOutlinedIcon,
  certificate: VerifiedOutlinedIcon,
  payroll: ReceiptLongOutlinedIcon,
  other: FolderOutlinedIcon,
};

const employeeName = (employee) => (
  employee?.full_name || `${employee?.first_name || ''} ${employee?.last_name || ''}`.trim() || 'بدون نام'
);
const formatDate = (value) => (value ? toJalali(String(value).slice(0, 10)) : '—');

const FormatBadge = ({ row, size = 16 }) => {
  const format = fileFormat(row);
  const Icon = FORMAT_ICONS[format.key] || InsertDriveFileOutlinedIcon;
  return (
    <Box sx={{
      width: size + 14, height: size + 14, borderRadius: '8px', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      bgcolor: `${format.color}12`, color: format.color,
    }}>
      <Icon sx={{ fontSize: size }} />
    </Box>
  );
};

const CategorySummaryChip = ({ group }) => {
  const Icon = CATEGORY_ICONS[group.iconKey || group.key] || FolderOutlinedIcon;
  return (
    <Chip
      size="small"
      icon={<Icon sx={{ fontSize: '13px !important' }} />}
      label={`${group.label} · ${toPersianDigits(group.files?.length || 0)}`}
      sx={{
        height: 23, maxWidth: 190, fontSize: 11, fontFamily: FONT, fontWeight: 700,
        bgcolor: `${group.color}0d`, color: group.color,
        border: `1px solid ${group.color}22`,
        '& .MuiChip-icon': { color: group.color },
        '& .MuiChip-label': { px: 0.7 },
      }}
    />
  );
};

export const PersonnelDocumentCard = ({ person, onOpen, onEdit, onOpenProfile }) => {
  const employee = person.employee;
  const formats = Object.entries(person.formats || {});
  const groups = person.groups || [];
  const visibleGroups = groups.slice(0, 3);
  const hiddenGroups = Math.max(0, groups.length - visibleGroups.length);
  const unassigned = employee.id === 'unassigned';
  return (
    <Paper
      elevation={0}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onOpen?.(); }}
      sx={{
        height: '100%', minHeight: 286, display: 'flex', flexDirection: 'column',
        overflow: 'hidden', borderRadius: '18px', border: '1px solid #e2e8f0',
        bgcolor: '#fff', cursor: 'pointer',
        transition: 'transform .18s ease, box-shadow .18s ease, border-color .18s ease',
        boxShadow: '0 8px 24px rgba(15,23,42,0.05)',
        '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 16px 34px rgba(15,23,42,0.11)', borderColor: `${ACCENT}55` },
        '&:focus-visible': { outline: `2px solid ${ACCENT}`, outlineOffset: 2 },
      }}
    >
      <Box sx={{ height: 3, background: 'linear-gradient(90deg,#0ea5e9,#0f766e,#14b8a6)' }} />
      <Box sx={{ p: 1.45, pb: 0 }}>
        <Stack direction="row" spacing={1.1} alignItems="flex-start">
          <Box sx={{
            p: 0.35, flexShrink: 0, borderRadius: '20px',
            bgcolor: '#f8fafc', border: '1px solid #e2e8f0',
          }}>
            <EmployeeAvatar employee={employee} size={72}
              sx={{ borderRadius: '16px', bgcolor: '#e2e8f0' }} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" alignItems="flex-start" spacing={0.7}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography noWrap title={employeeName(employee)} sx={{
                  fontSize: 15, fontWeight: 900, color: INK, fontFamily: FONT,
                }}>
                  {employeeName(employee)}
                </Typography>
                <Typography noWrap sx={{ mt: 0.25, fontSize: 11.5, color: MUTED, fontFamily: FONT }}>
                  شماره پرسنلی: {toPersianDigits(employee.employee_id || '—')}
                </Typography>
              </Box>
              <Chip size="small"
                label={unassigned ? 'تخصیص نیافته' : `${toPersianDigits(person.count)} فایل`}
                sx={{
                  height: 22, flexShrink: 0, fontSize: 11, fontWeight: 900, fontFamily: FONT,
                  bgcolor: unassigned ? '#fff7ed' : `${ACCENT}0f`,
                  color: unassigned ? '#b45309' : ACCENT,
                  border: `1px solid ${unassigned ? '#fed7aa' : `${ACCENT}22`}`,
                }} />
            </Stack>
            <Stack direction="row" spacing={0.4} useFlexGap flexWrap="wrap" sx={{ mt: 0.85 }}>
              {employee.department_name ? <Chip size="small" label={employee.department_name}
                sx={{ height: 19, fontSize: 11, fontFamily: FONT, bgcolor: '#f0fdfa', color: ACCENT, border: '1px solid #ccfbf1' }} /> : null}
              {employee.job_title_name ? <Chip size="small" label={employee.job_title_name}
                sx={{ height: 19, fontSize: 11, fontFamily: FONT, bgcolor: '#f8fafc', color: MUTED, border: '1px solid #e2e8f0' }} /> : null}
            </Stack>
          </Box>
        </Stack>

        <Divider sx={{ my: 1.15 }} />

        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
          <Typography sx={{ fontSize: 11, fontWeight: 800, color: MUTED, fontFamily: FONT }}>
            انواع مدارک
          </Typography>
          <Typography sx={{ fontSize: 11, color: MUTED, fontFamily: FONT }}>
            {groups.length ? `${toPersianDigits(groups.length)} نوع` : 'بدون نوع مشخص'}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mt: 0.6, minHeight: 24 }}>
          {visibleGroups.map((group) => <CategorySummaryChip key={group.key} group={group} />)}
          {hiddenGroups ? <Chip size="small" label={`+${toPersianDigits(hiddenGroups)} نوع`}
            sx={{ height: 23, fontSize: 11, fontFamily: FONT, bgcolor: '#f1f5f9', color: MUTED }} /> : null}
          {!groups.length ? (
            <Typography sx={{ fontSize: 11.5, color: '#94a3b8', fontFamily: FONT, py: 0.4 }}>
              نوع مدرک هنوز به این پرونده متصل نشده است.
            </Typography>
          ) : null}
        </Stack>
      </Box>

      <Box sx={{ mt: 'auto', px: 1.35, pb: 1.2, pt: 1.2 }}>
        <Paper variant="outlined" sx={{
          p: 0.45, borderRadius: '12px', borderColor: '#e2e8f0', bgcolor: '#f8fafc',
          display: 'flex', alignItems: 'center', gap: 0.3,
        }}>
          <Button size="small" fullWidth startIcon={<VisibilityOutlinedIcon sx={{ fontSize: 16 }} />}
            onClick={(event) => { event.stopPropagation(); onOpen?.(); }}
            sx={{ fontSize: 11.5, fontWeight: 900, color: ACCENT, fontFamily: FONT, whiteSpace: 'nowrap' }}>
            مشاهده
          </Button>
          {onEdit ? (
            <>
              <Divider orientation="vertical" flexItem />
              <Button size="small" fullWidth startIcon={<EditOutlinedIcon sx={{ fontSize: 16 }} />}
                onClick={(event) => { event.stopPropagation(); onEdit(employee); }}
                sx={{ fontSize: 11.5, fontWeight: 800, color: '#475569', fontFamily: FONT, whiteSpace: 'nowrap' }}>
                ویرایش
              </Button>
            </>
          ) : null}
          {onOpenProfile ? (
            <Tooltip title="پروندهٔ پرسنلی">
              <IconButton size="small" onClick={(event) => { event.stopPropagation(); onOpenProfile(employee); }}
                sx={{ color: MUTED, flexShrink: 0 }}>
                <PersonOutlineIcon sx={{ fontSize: 17 }} />
              </IconButton>
            </Tooltip>
          ) : null}
        </Paper>
        <Stack direction="row" alignItems="center" spacing={0.6} sx={{ mt: 0.7, minWidth: 0 }}>
          <Typography noWrap sx={{ flex: 1, fontSize: 10.5, color: MUTED, fontFamily: FONT, direction: 'ltr', textAlign: 'right' }}>
            {formats.map(([key, count]) => `${FORMAT_LABELS[key] || key} ${toPersianDigits(count)}`).join(' · ')}
          </Typography>
          {person.lastUpdated ? (
            <Typography noWrap sx={{ fontSize: 10.5, color: '#94a3b8', fontFamily: FONT }}>
              {formatDate(person.lastUpdated)}
            </Typography>
          ) : null}
        </Stack>
      </Box>
    </Paper>
  );
};


const PersonnelDocumentRow = ({ file, onPreview, onDownload, onEdit }) => {
  const format = fileFormat(file);
  const source = documentSourceLabel(file);
  const typeLabel = documentTypeLabel(file);
  const version = Number(file.version_count || file.version || 1);
  return (
    <Paper variant="outlined" sx={{
      p: 0.85, borderRadius: '11px', borderColor: '#e8eef2', bgcolor: '#fff',
      display: 'flex', alignItems: 'center', gap: 1,
      transition: 'border-color .15s ease, background .15s ease',
      '&:hover': { borderColor: `${format.color}55`, bgcolor: '#fbfdfe' },
    }}>
      {format.key === 'image' && file.file_url ? (
        <Box component="img" src={file.file_url} alt="" sx={{
          width: 48, height: 42, borderRadius: '8px', objectFit: 'cover',
          border: '1px solid #e2e8f0', flexShrink: 0, bgcolor: '#f8fafc',
        }} />
      ) : <FormatBadge row={file} size={19} />}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 0 }}>
          <Typography noWrap sx={{ fontFamily: FONT, fontSize: 12, fontWeight: 900, color: INK }}>
            {file.title || file.file_name || 'مدرک بدون عنوان'}
          </Typography>
          <Chip size="small" label={FORMAT_LABELS[format.key] || format.label}
            sx={{ height: 18, fontSize: 12, flexShrink: 0, bgcolor: `${format.color}10`, color: format.color }} />
        </Stack>
        <Typography title={file.description || ''} sx={{
          fontFamily: FONT, fontSize: 12, color: MUTED, mt: 0.15,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {file.description?.trim() ? `توضیحات: ${file.description.trim()}` : 'بدون توضیح'}
        </Typography>
        <Stack direction="row" spacing={0.45} useFlexGap flexWrap="wrap" sx={{ mt: 0.3 }}>
          {typeLabel ? (
            <Chip size="small" label={typeLabel}
              sx={{ height: 18, fontSize: 11, fontWeight: 800, bgcolor: '#eef2ff', color: '#4338ca', maxWidth: 190 }} />
          ) : null}
          <Chip size="small" label={source} title={source}
            sx={{ height: 18, fontSize: 11, bgcolor: '#f1f5f9', color: MUTED, maxWidth: 190 }} />
          {file.issue_date ? <Chip size="small" label={`صدور ${formatDate(file.issue_date)}`}
            sx={{ height: 18, fontSize: 12, bgcolor: '#f8fafc', color: MUTED }} /> : null}
          {file.file_size_display ? <Chip size="small" label={file.file_size_display}
            sx={{ height: 18, fontSize: 12, bgcolor: '#f8fafc', color: MUTED, direction: 'ltr' }} /> : null}
          {version > 1 ? <Chip size="small" label={`نسخه ${toPersianDigits(version)}`}
            sx={{ height: 18, fontSize: 12, bgcolor: '#f8fafc', color: MUTED }} /> : null}
          {file.is_expired ? <Chip size="small" label="منقضی"
            sx={{ height: 18, fontSize: 12, bgcolor: '#fff1f2', color: '#be123c' }} /> : null}
        </Stack>
      </Box>
      <Stack direction="row" spacing={0.1} sx={{ flexShrink: 0 }}>
        <Tooltip title="پیش‌نمایش">
          <IconButton size="small" onClick={() => onPreview?.(file)} sx={{ color: '#0369a1' }}>
            <OpenInNewOutlinedIcon sx={{ fontSize: 17 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="دانلود">
          <IconButton size="small" onClick={() => onDownload?.(file)} sx={{ color: ACCENT }}>
            <DownloadOutlinedIcon sx={{ fontSize: 17 }} />
          </IconButton>
        </Tooltip>
        {!file.isEmployeePhoto && onEdit ? (
          <Tooltip title="ویرایش مشخصات سند">
            <IconButton size="small" onClick={() => onEdit(file)} sx={{ color: MUTED }}>
              <EditOutlinedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        ) : null}
      </Stack>
    </Paper>
  );
};


export const PersonnelDocumentsDialog = ({
  person, onClose, onPreview, onDownload, onEditDocument, onEditEmployee, onOpenProfile,
}) => {
  if (!person) return null;
  const employee = person.employee;
  const formats = Object.entries(person.formats || {});
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md" scroll="paper"
      PaperProps={{ sx: { borderRadius: '18px', overflow: 'hidden', bgcolor: '#f8fafc' } }}>
      <DialogTitle component="div" sx={{ p: 0 }}>
        <Box sx={{
          position: 'relative', px: 1.8, py: 1.45,
          background: 'linear-gradient(135deg, rgba(14,165,233,0.12), rgba(15,118,110,0.10))',
          borderBottom: '1px solid #e2e8f0',
        }}>
          <IconButton size="small" onClick={onClose} aria-label="بستن"
            sx={{ position: 'absolute', top: 8, left: 8, color: MUTED }}>
            <CloseIcon fontSize="small" />
          </IconButton>
          <Stack direction="row" spacing={1.2} alignItems="center" sx={{ pl: 3.6 }}>
            <Box sx={{
              p: 0.3, borderRadius: '18px', flexShrink: 0,
              bgcolor: 'rgba(255,255,255,0.8)', border: '1px solid rgba(15,118,110,0.16)',
            }}>
              <EmployeeAvatar employee={employee} size={58}
                sx={{ borderRadius: '14px', bgcolor: '#e2e8f0' }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography noWrap title={employeeName(employee)} sx={{ fontFamily: FONT, fontSize: 16, fontWeight: 900, color: INK }}>
                {employeeName(employee)}
              </Typography>
              <Typography noWrap sx={{ fontFamily: FONT, fontSize: 11.5, color: MUTED, mt: 0.15 }}>
                شماره پرسنلی: {toPersianDigits(employee.employee_id || '—')}
                {employee.department_name ? ` · ${employee.department_name}` : ''}
                {employee.job_title_name ? ` · ${employee.job_title_name}` : ''}
              </Typography>
            </Box>
            <Stack alignItems="flex-end" spacing={0.35} sx={{ flexShrink: 0 }}>
              <Chip size="small" label={`${toPersianDigits(person.count)} فایل`}
                sx={{ height: 22, fontSize: 11, bgcolor: '#fff', color: ACCENT, fontWeight: 800 }} />
              <Chip size="small" label={`${toPersianDigits(person.groups.length)} نوع مدرک`}
                sx={{ height: 22, fontSize: 11, bgcolor: 'rgba(255,255,255,0.72)', color: MUTED }} />
            </Stack>
          </Stack>
          <Stack direction="row" spacing={0.45} useFlexGap flexWrap="wrap" sx={{ mt: 0.9, pl: 3.6 }}>
            {formats.map(([key, count]) => (
              <Chip key={key} size="small" label={`${FORMAT_LABELS[key] || key} ${toPersianDigits(count)}`}
                sx={{ height: 20, fontSize: 11, bgcolor: 'rgba(255,255,255,0.72)', color: MUTED }} />
            ))}
          </Stack>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 1.25 }}>
        <Stack spacing={1}>
          {person.groups.map((group) => {
            const CategoryIcon = CATEGORY_ICONS[group.iconKey || group.key] || FolderOutlinedIcon;
            return (
              <Paper key={group.key} variant="outlined" sx={{
                borderRadius: '13px', borderColor: '#e2e8f0', overflow: 'hidden', bgcolor: '#fff',
              }}>
                <Stack direction="row" alignItems="center" spacing={0.7} sx={{
                  px: 1.1, py: 0.7, bgcolor: `${group.color}08`,
                  borderBottom: `1px solid ${group.color}22`,
                }}>
                  <Box sx={{
                    width: 27, height: 27, borderRadius: '8px', bgcolor: `${group.color}14`,
                    color: group.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <CategoryIcon sx={{ fontSize: 16 }} />
                  </Box>
                  <Typography sx={{ flex: 1, fontFamily: FONT, fontSize: 12, fontWeight: 900, color: INK }}>
                    {group.label}
                  </Typography>
                  <Chip size="small" label={`${toPersianDigits(group.files.length)} فایل`}
                    sx={{ height: 19, fontSize: 12, bgcolor: '#fff', color: group.color }} />
                </Stack>
                <Stack spacing={0.6} sx={{ p: 0.7 }}>
                  {group.files.map((file) => (
                    <PersonnelDocumentRow key={file.id} file={file}
                      onPreview={onPreview} onDownload={onDownload}
                      onEdit={onEditDocument ? (row) => onEditDocument(row) : null} />
                  ))}
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 1.5, py: 1, borderTop: '1px solid #e2e8f0', bgcolor: '#fff' }}>
        {employee.id !== 'unassigned' ? (
          <>
            <Button size="small" startIcon={<EditOutlinedIcon />} onClick={() => onEditEmployee?.(employee)}
              sx={{ fontFamily: FONT, fontSize: 12, color: MUTED }}>ویرایش پرسنل</Button>
            <Button size="small" startIcon={<PersonOutlineIcon />} onClick={() => onOpenProfile?.(employee)}
              sx={{ fontFamily: FONT, fontSize: 12, color: ACCENT }}>پروندهٔ پرسنلی</Button>
          </>
        ) : null}
        <Box sx={{ flex: 1 }} />
        <Button size="small" variant="contained" onClick={onClose}
          sx={{ fontFamily: FONT, fontSize: 12 }}>بستن</Button>
      </DialogActions>
    </Dialog>
  );
};

