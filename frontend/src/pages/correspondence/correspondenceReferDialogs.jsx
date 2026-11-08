/**
 * دیالوگ‌های ارجاع نامه و ثبت نتیجهٔ ارجاع.
 *
 * از ``CorrespondenceLettersPage.jsx`` جدا شد (نگهداشت‌پذیری فاز ۴).
 */
import React, { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem,
  Stack, TextField, Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import EditNoteIcon from '@mui/icons-material/EditNote';
import ForwardToInboxIcon from '@mui/icons-material/ForwardToInbox';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import JalaliMaskedDateInput from '../../core/components/ui/JalaliMaskedDateInput';
import { toPersianDigits } from '../../core/utils/numberUtils';
import { MUTED } from '../accounting/AccountingDashboardUI';
import {
  ACCENT, INCOMING, INTERNAL, OK, REFERRAL_STATUS_META, SLATE, WARN, chipSx, dateLabel,
} from './correspondenceUi';
import { FormSection, FormTable } from './correspondenceFormUi';
import { MultiPersonnelPicker, PersonnelPicker, personValue } from './correspondenceLookups';

const REFERRAL_PURPOSE_META = {
  action: { label: 'اقدام / انجام کار', color: WARN },
  info: { label: 'اطلاع / مشاهده', color: INCOMING },
  comment: { label: 'اظهارنظر', color: INTERNAL },
};


const ReferDialog = ({ open, letter, onClose, onSubmit, pending }) => {
  const [toEmployee, setToEmployee] = useState(null);
  const [extraEmployees, setExtraEmployees] = useState([]);
  const [toName, setToName] = useState('');
  const [purpose, setPurpose] = useState('action');
  const [dueDate, setDueDate] = useState('');
  const [instruction, setInstruction] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open) return;
    setToEmployee(null);
    setExtraEmployees([]);
    setToName('');
    setPurpose('action');
    setDueDate('');
    setInstruction('');
    setNote('');
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: '16px' } }}>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={0.75} useFlexGap flexWrap="wrap">
          <Box sx={{
            width: 28, height: 28, borderRadius: '8px', display: 'grid', placeItems: 'center',
            bgcolor: alpha(WARN, 0.12), color: WARN,
          }}>
            <ForwardToInboxIcon sx={{ fontSize: 16 }} />
          </Box>
          <Typography sx={{ fontSize: 13.5, fontWeight: 900 }}>ارجاع نامه</Typography>
          {letter?.number ? <Chip size="small" label={letter.number} sx={chipSx(SLATE)} /> : null}
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <FormSection icon={ForwardToInboxIcon} title="گیرنده و مهلت" color={WARN}>
          <FormTable columns={1}>
            <PersonnelPicker
              label="ارجاع به پرسنل (جستجو در منابع انسانی)"
              value={toEmployee}
              onChange={(option) => setToEmployee(option)}
            />
            <MultiPersonnelPicker
              label="گیرندگان دیگر (ارجاع هم‌زمان به چند نفر)"
              value={extraEmployees}
              onChange={(options) => setExtraEmployees(options || [])}
              helperText="اختیاری؛ برای ارجاع چندنفره، نفرات دیگر را اضافه کنید."
            />
            <TextField size="small" label="یا واحد / شخص خارج از سامانه" value={toName}
              onChange={(event) => setToName(event.target.value)} />
            <TextField select size="small" label="نوع ارجاع" value={purpose}
              onChange={(event) => setPurpose(event.target.value)}>
              {Object.entries(REFERRAL_PURPOSE_META).map(([value, item]) => (
                <MenuItem key={value} value={value}>{item.label}</MenuItem>
              ))}
            </TextField>
            <JalaliMaskedDateInput variant="outlined" label="مهلت اقدام" value={dueDate}
              onChange={(value) => setDueDate(value)} />
          </FormTable>
        </FormSection>
        <FormSection icon={EditNoteIcon} title="دستور و توضیح" color={INCOMING}>
          <FormTable columns={1}>
            <TextField size="small" multiline minRows={2} label="دستور / اقدام درخواستی"
              value={instruction} onChange={(event) => setInstruction(event.target.value)} />
            <TextField size="small" multiline minRows={2} label="توضیح تکمیلی" value={note}
              onChange={(event) => setNote(event.target.value)} />
          </FormTable>
        </FormSection>
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.25 }}>
        <Button size="small" onClick={onClose}>انصراف</Button>
        <Button size="small" variant="contained"
          disabled={pending || (!toEmployee && !toName.trim() && !extraEmployees.length)}
          onClick={() => onSubmit({
            to_employee: toEmployee?.id || undefined,
            to_employees: extraEmployees.map((item) => item.id),
            to_name: toName,
            purpose,
            due_date: dueDate || undefined,
            instruction,
            note,
          })}
          sx={{ bgcolor: WARN, '&:hover': { bgcolor: '#92400e' } }}>
          ثبت ارجاع
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/** ثبت پاسخ و نتیجهٔ یک ارجاع (تاریخچهٔ کامل اقدام). */
const CompleteReferralDialog = ({ open, referral, onClose, onSubmit, pending }) => {
  const [response, setResponse] = useState('');
  const [result, setResult] = useState('');
  const [resultNote, setResultNote] = useState('');
  const [answeredOn, setAnsweredOn] = useState('');

  useEffect(() => {
    if (!open) return;
    setResponse('');
    setResult('');
    setResultNote('');
    setAnsweredOn(new Date().toISOString().slice(0, 10));
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: '16px' } }}>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={0.75} useFlexGap flexWrap="wrap">
          <Box sx={{
            width: 28, height: 28, borderRadius: '8px', display: 'grid', placeItems: 'center',
            bgcolor: alpha(OK, 0.12), color: OK,
          }}>
            <TaskAltIcon sx={{ fontSize: 16 }} />
          </Box>
          <Typography sx={{ fontSize: 13.5, fontWeight: 900 }}>ثبت پاسخ و نتیجهٔ ارجاع</Typography>
          {referral?.to_user_name || referral?.to_name ? (
            <Chip size="small" label={referral.to_user_name || referral.to_name} sx={chipSx(SLATE)} />
          ) : null}
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        {referral?.instruction ? (
          <Alert severity="info" sx={{ mb: 1.25, borderRadius: '10px' }}>
            <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>دستور ارجاع:</Typography>
            <Typography sx={{ fontSize: 12.5, whiteSpace: 'pre-wrap' }}>{referral.instruction}</Typography>
          </Alert>
        ) : null}
        <FormTable columns={1}>
          <TextField size="small" multiline minRows={2} label="پاسخ / جوابیهٔ اقدام‌کننده"
            value={response} onChange={(event) => setResponse(event.target.value)} />
          <TextField size="small" multiline minRows={2} label="نتیجهٔ نهایی"
            value={result} onChange={(event) => setResult(event.target.value)} />
          <TextField size="small" multiline minRows={2} label="یادداشت نتیجه"
            value={resultNote} onChange={(event) => setResultNote(event.target.value)} />
          <JalaliMaskedDateInput variant="outlined" label="تاریخ پاسخ" value={answeredOn}
            onChange={(value) => setAnsweredOn(value)} />
        </FormTable>
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.25 }}>
        <Button size="small" onClick={onClose}>انصراف</Button>
        <Button size="small" variant="contained" disabled={pending || (!response.trim() && !result.trim())}
          onClick={() => onSubmit({ response, result, result_note: resultNote, answered_on: answeredOn })}
          sx={{ bgcolor: OK, '&:hover': { bgcolor: '#115e59' } }}>
          ثبت اقدام
        </Button>
      </DialogActions>
    </Dialog>
  );
};


export { CompleteReferralDialog, ReferDialog };
