import React from 'react';
import { Box, Chip, IconButton, Paper, Stack, Tooltip, Typography, alpha } from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';
import { toPersianDigits } from '../../core/utils/numberUtils';
import { toJalali } from '../../core/utils/dateUtils';
import { RELATION_LABELS, dependentHasAttachment, dependentName } from '../supplementaryInsuranceHelpers';

const INK = '#1e293b';
const MUTED = '#64748b';
const BLUE = '#2563eb';
const RED = '#be123c';

const dateText = (value) => (value ? toJalali(String(value).slice(0, 10)) : '');

/** فهرست استاندارد افراد تحت تکفل — مشترک بین پرونده و دیالوگ ویرایش بیمه. */
const DependentRows = ({ dependents = [], onEdit, onDelete, emptyText = 'فرد تحت تکفلی ثبت نشده است.' }) => {
  if (!dependents.length) {
    return (
      <Box sx={{
        py: 2.2, textAlign: 'center', borderRadius: '12px',
        bgcolor: alpha(BLUE, 0.02), border: `1px dashed ${alpha(BLUE, 0.2)}`,
      }}>
        <FamilyRestroomIcon sx={{ fontSize: 26, color: '#cbd5e1', mb: 0.4 }} />
        <Typography sx={{ fontSize: 11, color: MUTED }}>{emptyText}</Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={0.6}>
      {dependents.map((dependent, index) => {
        const attached = dependentHasAttachment(dependent);
        const birth = dateText(dependent.birth_date);
        return (
          <Paper
            key={dependent.id || `dep-${index}`}
            variant="outlined"
            sx={{
              p: 0.85, borderRadius: '12px', display: 'flex', alignItems: 'center', gap: 0.8,
              borderColor: '#e8edf4', bgcolor: '#fff',
            }}
          >
            <Box sx={{
              width: 32, height: 32, borderRadius: '10px', flexShrink: 0,
              bgcolor: alpha(BLUE, 0.08), color: BLUE,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <FamilyRestroomIcon sx={{ fontSize: 17 }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" alignItems="center" spacing={0.4} useFlexGap flexWrap="wrap">
                <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 800, color: INK }}>
                  {dependentName(dependent)}
                </Typography>
                <Chip
                  size="small"
                  label={dependent.relation_display || RELATION_LABELS[dependent.relation] || dependent.relation || '—'}
                  sx={{ height: 18, fontSize: 10, fontWeight: 800, bgcolor: alpha(BLUE, 0.07), color: BLUE }}
                />
                {dependent.national_id ? (
                  <Chip
                    size="small"
                    label={`کد ملی ${toPersianDigits(dependent.national_id)}`}
                    sx={{ height: 18, fontSize: 10, fontWeight: 700, bgcolor: alpha(INK, 0.05), color: MUTED }}
                  />
                ) : null}
                {birth ? (
                  <Chip
                    size="small"
                    label={`تولد ${birth}`}
                    sx={{ height: 18, fontSize: 10, fontWeight: 700, bgcolor: alpha(INK, 0.05), color: MUTED }}
                  />
                ) : null}
                {attached ? (
                  <Chip
                    size="small"
                    icon={<AttachFileIcon sx={{ fontSize: 11 }} />}
                    label="پیوست"
                    sx={{ height: 18, fontSize: 10, fontWeight: 800, bgcolor: alpha(RED, 0.07), color: RED }}
                  />
                ) : null}
              </Stack>
            </Box>
            {onEdit ? (
              <Tooltip title="ویرایش فرد تحت تکفل">
                <IconButton size="small" onClick={() => onEdit(index)} sx={{ p: 0.4 }}>
                  <EditIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            ) : null}
            {onDelete ? (
              <Tooltip title="حذف از لیست">
                <IconButton size="small" color="error" onClick={() => onDelete(index)} sx={{ p: 0.4 }}>
                  <DeleteIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            ) : null}
          </Paper>
        );
      })}
    </Stack>
  );
};

export default DependentRows;
