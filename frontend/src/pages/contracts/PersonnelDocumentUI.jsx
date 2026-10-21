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
import { documentSourceLabel, fileFormat } from './personnelDocuments';

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

export const PersonnelDocumentCard = ({ person, onOpen, onEdit, onOpenProfile }) => {
  const employee = person.employee;
  const formats = Object.entries(person.formats || {});
  return (
    <Paper
      elevation={0}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onOpen?.(); }}
      sx={{
        height: '100%', minHeight: 292, display: 'flex', flexDirection: 'column',
        overflow: 'hidden', borderRadius: '18px', border: '1px solid #e2e8f0',
        bgcolor: '#fff', cursor: 'pointer', transition: 'transform .18s ease, box-shadow .18s ease',
        boxShadow: '0 7px 22px rgba(15,23,42,0.045)',
        '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 14px 30px rgba(15,23,42,0.10)', borderColor: `${ACCENT}55` },
        '&:focus-visible': { outline: `2px solid ${ACCENT}`, outlineOffset: 2 },
      }}
    >
      <Box sx={{ height: 4, background: 'linear-gradient(90deg,#0ea5e9,#0f766e,#14b8a6)' }} />
      <Box sx={{ px: 1.5, pt: 1.7, textAlign: 'center' }}>
        <Box sx={{
          width: 104, height: 104, mx: 'auto', borderRadius: '50%', p: 0.45,
          background: 'linear-gradient(135deg,#0ea5e9,#0f766e)',
          boxShadow: '0 8px 20px rgba(14,116,144,0.20)',
        }}>
          <EmployeeAvatar employee={employee} size={94}
            sx={{ border: '3px solid #fff', bgcolor: '#f1f5f9', boxShadow: 'inset 0 0 0 1px #e2e8f0' }} />
        </Box>
        <Typography noWrap title={employeeName(employee)} sx={{
          mt: 1.15, fontSize: 14, fontWeight: 900, color: INK, fontFamily: FONT,
        }}>
          {employeeName(employee)}
        </Typography>
        <Typography sx={{ mt: 0.2, fontSize: 12, color: MUTED, fontFamily: FONT }}>
          شماره پرسنلی: {toPersianDigits(employee.employee_id || '—')}
        </Typography>
        {(employee.department_name || employee.job_title_name) ? (
          <Stack direction="row" spacing={0.35} useFlexGap flexWrap="wrap" justifyContent="center" sx={{ mt: 0.7 }}>
            {employee.department_name ? <Chip size="small" label={employee.department_name}
              sx={{ height: 19, fontSize: 12, bgcolor: '#f0fdfa', color: ACCENT, fontFamily: FONT }} /> : null}
            {employee.job_title_name ? <Chip size="small" label={employee.job_title_name}
              sx={{ height: 19, fontSize: 12, bgcolor: '#f8fafc', color: MUTED, fontFamily: FONT }} /> : null}
          </Stack>
        ) : null}
      </Box>

      <Box sx={{ mt: 'auto', px: 1.25, pb: 1.2 }}>
        <Paper variant="outlined" sx={{
          p: 0.5, borderRadius: '12px', borderColor: '#e2e8f0', bgcolor: '#f8fafc',
          display: 'flex', alignItems: 'center', gap: 0.35,
        }}>
          <Button size="small" fullWidth startIcon={<VisibilityOutlinedIcon sx={{ fontSize: 16 }} />}
            onClick={(event) => { event.stopPropagation(); onOpen?.(); }}
            sx={{ fontSize: 12, fontWeight: 800, color: ACCENT, fontFamily: FONT, whiteSpace: 'nowrap' }}>
            مشاهده
          </Button>
          {onEdit ? (
            <>
              <Divider orientation="vertical" flexItem />
              <Button size="small" fullWidth startIcon={<EditOutlinedIcon sx={{ fontSize: 16 }} />}
                onClick={(event) => { event.stopPropagation(); onEdit(employee); }}
                sx={{ fontSize: 12, fontWeight: 800, color: '#475569', fontFamily: FONT, whiteSpace: 'nowrap' }}>
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
        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.7, minWidth: 0 }}>
          <Chip size="small" label={`${toPersianDigits(person.count)} فایل`}
            sx={{ height: 20, fontSize: 12, flexShrink: 0, bgcolor: `${ACCENT}0f`, color: ACCENT, fontFamily: FONT }} />
          <Typography noWrap sx={{ flex: 1, fontSize: 12, color: MUTED, fontFamily: FONT, direction: 'ltr', textAlign: 'right' }}>
            {formats.map(([key, count]) => `${FORMAT_LABELS[key] || key} ${toPersianDigits(count)}`).join(' · ')}
          </Typography>
        </Stack>
      </Box>
    </Paper>
  );
};


const PersonnelDocumentRow = ({ file, onPreview, onDownload, onEdit }) => {
  const format = fileFormat(file);
  const source = documentSourceLabel(file);
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
          <Chip size="small" label={source} sx={{ height: 18, fontSize: 12, bgcolor: '#f1f5f9', color: MUTED, maxWidth: 190 }} />
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
          position: 'relative', px: 2, py: 1.6, textAlign: 'center',
          background: 'linear-gradient(135deg, rgba(14,165,233,0.12), rgba(15,118,110,0.10))',
          borderBottom: '1px solid #e2e8f0',
        }}>
          <IconButton size="small" onClick={onClose} aria-label="بستن"
            sx={{ position: 'absolute', top: 8, left: 8, color: MUTED }}>
            <CloseIcon fontSize="small" />
          </IconButton>
          <Box sx={{
            width: 76, height: 76, mx: 'auto', p: 0.35, borderRadius: '50%',
            background: 'linear-gradient(135deg,#0ea5e9,#0f766e)',
          }}>
            <EmployeeAvatar employee={employee} size={68} sx={{ border: '2px solid #fff' }} />
          </Box>
          <Typography sx={{ mt: 0.7, fontFamily: FONT, fontSize: 16, fontWeight: 900, color: INK }}>
            {employeeName(employee)}
          </Typography>
          <Typography sx={{ fontFamily: FONT, fontSize: 12, color: MUTED, mt: 0.1 }}>
            شماره پرسنلی: {toPersianDigits(employee.employee_id || '—')}
            {employee.department_name ? ` · ${employee.department_name}` : ''}
            {employee.job_title_name ? ` · ${employee.job_title_name}` : ''}
          </Typography>
          <Stack direction="row" spacing={0.45} useFlexGap flexWrap="wrap" justifyContent="center" sx={{ mt: 0.8 }}>
            <Chip size="small" label={`${toPersianDigits(person.count)} فایل`}
              sx={{ height: 20, fontSize: 12, bgcolor: '#fff', color: ACCENT, fontWeight: 800 }} />
            {formats.map(([key, count]) => (
              <Chip key={key} size="small" label={`${FORMAT_LABELS[key] || key} ${toPersianDigits(count)}`}
                sx={{ height: 20, fontSize: 12, bgcolor: '#fff', color: MUTED }} />
            ))}
          </Stack>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 1.25 }}>
        <Stack spacing={1}>
          {person.groups.map((group) => {
            const CategoryIcon = CATEGORY_ICONS[group.key] || FolderOutlinedIcon;
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

