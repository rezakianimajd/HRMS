import React from 'react';
import {
  Alert, Autocomplete, Box, Button, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, FormControlLabel, IconButton, ListSubheader, MenuItem, Stack,
  Switch, TextField, Typography,
} from '@mui/material';
import AddLinkIcon from '@mui/icons-material/AddLink';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { formatPersianNumber, toPersianDigits } from '../../core/utils/numberUtils';
import { ACCENT, DANGER } from './correspondenceUi';
import { PartyPicker, PersonnelPicker } from './correspondenceLookups';

/** یک مقصد خالی با کلید پایدار برای رندر فهرست مقصدهای فرم. */
export const emptyMappingTarget = (kind = 'employee') => ({
  key: `${kind}-${Math.random().toString(36).slice(2, 8)}`,
  kind,
  value: null,
});

/** فرم خالی نگاشت نام (تخصصی: کاربرد + مقصد + دو مسیره). */
export const EMPTY_MAPPING_FORM = {
  open: false,
  mode: 'create',
  id: null,
  raw_name: '',
  scope: 'referral',
  bidirectional: false,
  note: '',
  apply_now: true,
  targets: [emptyMappingTarget('employee')],
};

/** مقدار انتخاب‌گر برای یک مقصد موجود (برای حالت ویرایش). */
export const mappingTargetValue = (target) => (
  target?.target_id
    ? {
      id: target.target_id,
      name: target.label,
      label: target.label,
      full_name: target.label,
    }
    : null
);

/** فرم ویرایش یک ردیف نگاشت بر اساس گروه نمایش‌داده‌شده در جدول. */
export const mappingFormFromTarget = (row, target) => ({
  open: true,
  mode: 'edit',
  id: target.id,
  raw_name: row.raw_name,
  scope: row.scope,
  bidirectional: Boolean(row.bidirectional),
  note: '',
  apply_now: true,
  targets: [{
    ...emptyMappingTarget(target.target_kind),
    value: mappingTargetValue(target),
  }],
});

/** بدنهٔ API برای یک مقصد (کلید FK بر اساس نوع مقصد). */
export const mappingTargetPayload = (target) => {
  const value = target.value;
  const payload = { target_kind: target.kind };
  if (target.kind === 'employee') payload.employee = value?.id || null;
  if (target.kind === 'party') payload.party = value?.id || null;
  if (target.kind === 'correspondent') payload.correspondent = value?.id || null;
  if (target.kind === 'organization') payload.organization = value?.id || null;
  if (target.kind === 'category') payload.category = value?.id || null;
  return payload;
};

const TargetPicker = ({ target, onChange, contacts, organizations, categories }) => {
  if (target.kind === 'employee') {
    return (
      <PersonnelPicker
        value={target.value}
        onChange={(option) => onChange(option)}
        label="پرسنل مقصد"
        helperText="از پرسنل فعال منابع انسانی انتخاب کنید."
      />
    );
  }
  if (target.kind === 'party') {
    return (
      <PartyPicker
        value={target.value}
        allowCreate
        createInContracts
        onChange={(option) => onChange(option)}
        label="طرف حساب مقصد (مدیریت قراردادها)"
        helperText="از طرف‌های حساب مدیریت قراردادها انتخاب کنید؛ اگر شرکت هنوز ثبت نشده، نامش را بنویسید و Enter بزنید تا در همان‌جا ساخته شود."
      />
    );
  }
  const options = target.kind === 'correspondent' ? contacts
    : target.kind === 'organization' ? organizations : categories;
  const label = target.kind === 'correspondent' ? 'مخاطب مقصد'
    : target.kind === 'organization' ? 'سازمان مقصد' : 'نوع مکاتبهٔ مقصد';
  return (
    <Autocomplete
      size="small"
      options={options}
      value={target.value || null}
      onChange={(_event, option) => onChange(option || null)}
      getOptionLabel={(option) => option?.name || option?.label || ''}
      isOptionEqualToValue={(a, b) => a?.id === b?.id}
      noOptionsText="موردی یافت نشد"
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          helperText={target.kind === 'category'
            ? 'نامه‌های هم‌موضوع به این نوع مکاتبه متصل می‌شوند.'
            : 'از تعاریف مکاتبات انتخاب کنید.'}
        />
      )}
    />
  );
};

/**
 * فرم تخصصی نگاشت نام: نام خام، کاربرد (دامنه)، نگاشت دو مسیره و چند مقصد.
 * تمام ظاهر از توکن‌های تم/ماژول می‌آید؛ هیچ رنگ هاردکدی ندارد.
 */
export const NameMappingFormDialog = ({
  form, setForm, onClose, onSave, saving, error, onClearError,
  purposeOptions, selectedPurpose, allowedKinds, supportsDual, targetKinds,
  contacts, organizations, categories,
}) => {
  const setTargetField = (index, patch) => {
    setForm((previous) => ({
      ...previous,
      targets: previous.targets.map((item, position) => (
        position === index ? { ...item, ...patch } : item
      )),
    }));
  };

  const changeScope = (nextScope) => {
    const kinds = purposeOptions
      .flatMap((group) => group.items)
      .find((item) => item.key === nextScope)?.target_kinds || ['employee'];
    setForm((previous) => ({
      ...previous,
      scope: nextScope,
      targets: previous.targets.map((item) => (
        kinds.includes(item.kind) ? item : { ...item, kind: kinds[0], value: null }
      )),
    }));
  };

  const kindLabel = (key) => (
    (targetKinds || []).find((item) => item.key === key)?.label || key
  );

  return (
    <Dialog open={form.open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontSize: 14, fontWeight: 800 }}>
        {form.mode === 'edit' ? 'ویرایش نگاشت نام'
          : form.mode === 'add-target' ? 'افزودن مقصد به نگاشت'
            : 'نگاشت نام جدید'}
      </DialogTitle>
      <DialogContent dividers>
        {error ? (
          <Alert severity="error" sx={{ mb: 1, fontSize: 11.5 }} onClose={onClearError}>
            {error}
          </Alert>
        ) : null}
        <Stack spacing={1.1}>
          <TextField
            size="small"
            label="نام واردشده (خام)"
            value={form.raw_name}
            disabled={form.mode === 'add-target'}
            onChange={(event) => setForm((previous) => ({
              ...previous, raw_name: event.target.value,
            }))}
            helperText="مثلاً: خ.حسینی — القاب و نویسه‌های متفاوت ي/ك خودکار نرمال می‌شوند."
          />
          <TextField
            select
            size="small"
            label="کاربرد نگاشت"
            value={form.scope}
            disabled={form.mode === 'add-target'}
            onChange={(event) => changeScope(event.target.value)}
            helperText={selectedPurpose?.description
              || 'کاربرد مشخص می‌کند این نگاشت روی کدام بخش نامه اثر بگذارد.'}
          >
            {purposeOptions.map((group) => [
              <ListSubheader key={group.group} sx={{ fontSize: 10.5, fontWeight: 800 }}>
                {group.group}
              </ListSubheader>,
              ...group.items.map((item) => (
                <MenuItem key={item.key} value={item.key} sx={{ fontSize: 12 }}>
                  {item.label}
                </MenuItem>
              )),
            ])}
          </TextField>

          <Chip
            size="small"
            label={`نوع مقصدهای مجاز: ${allowedKinds.map(kindLabel).join(' · ')}`}
            sx={{
              alignSelf: 'flex-start',
              height: 'auto',
              py: 0.35,
              fontSize: 10.5,
              fontWeight: 700,
              bgcolor: 'transparent',
              border: '1px dashed',
              borderColor: 'divider',
              color: 'text.secondary',
            }}
          />

          <FormControlLabel
            control={(
              <Switch
                size="small"
                checked={form.bidirectional}
                disabled={!supportsDual}
                onChange={(event) => setForm((previous) => ({
                  ...previous, bidirectional: event.target.checked,
                }))}
              />
            )}
            label={(
              <Typography sx={{ fontSize: 11.5 }}>
                نگاشت دو مسیره (هم روی نامه‌های ارسالی و هم دریافتی اعمال شود)
              </Typography>
            )}
          />


          <Divider />
          <Typography sx={{ fontSize: 11.5, fontWeight: 800 }}>
            مقصدهای نگاشت
          </Typography>
          {form.targets.map((target, index) => (
            <Box key={target.key} sx={{
              p: 0.75,
              borderRadius: '12px',
              border: '1px solid',
              borderColor: 'divider',
              minWidth: 0,
            }}>
              <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.5 }}>
                <Typography sx={{ fontSize: 11, fontWeight: 800 }}>
                  {`مقصد ${toPersianDigits(index + 1)}`}
                </Typography>
                <Box sx={{ flex: 1 }} />
                {form.targets.length > 1 ? (
                  <IconButton
                    size="small"
                    aria-label="حذف مقصد"
                    onClick={() => setForm((previous) => ({
                      ...previous,
                      targets: previous.targets.filter(
                        (_item, position) => position !== index,
                      ),
                    }))}
                  >
                    <DeleteOutlineIcon sx={{ fontSize: 15, color: DANGER }} />
                  </IconButton>
                ) : null}
              </Stack>
              <Stack spacing={0.8}>
                <TextField
                  select
                  size="small"
                  label="نوع مقصد"
                  value={target.kind}
                  disabled={allowedKinds.length < 2}
                  onChange={(event) => setTargetField(index, {
                    kind: event.target.value, value: null,
                  })}
                >
                  {allowedKinds.map((kind) => (
                    <MenuItem key={kind} value={kind} sx={{ fontSize: 12 }}>
                      {kindLabel(kind)}
                    </MenuItem>
                  ))}
                </TextField>
                <TargetPicker
                  target={target}
                  contacts={contacts}
                  organizations={organizations}
                  categories={categories}
                  onChange={(option) => setTargetField(index, { value: option })}
                />
              </Stack>
            </Box>
          ))}
          {form.mode === 'create' ? (
            <Button
              size="small"
              startIcon={<AddLinkIcon sx={{ fontSize: 15 }} />}
              onClick={() => setForm((previous) => ({
                ...previous,
                targets: [...previous.targets, emptyMappingTarget(allowedKinds[0])],
              }))}
              sx={{ alignSelf: 'flex-start', fontSize: 11.5 }}
            >
              افزودن مقصد دیگر (نگاشت چند مقصده)
            </Button>
          ) : null}

          <TextField
            size="small"
            label="یادداشت"
            value={form.note || ''}
            multiline
            minRows={2}
            onChange={(event) => setForm((previous) => ({
              ...previous, note: event.target.value,
            }))}
          />
          <FormControlLabel
            control={(
              <Switch
                size="small"
                checked={form.apply_now}
                onChange={(event) => setForm((previous) => ({
                  ...previous, apply_now: event.target.checked,
                }))}
              />
            )}
            label={(
              <Typography sx={{ fontSize: 11.5 }}>
                بعد از ذخیره روی داده‌های موجود اعمال شود
              </Typography>
            )}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.25 }}>
        <Button size="small" onClick={onClose}>انصراف</Button>
        <Button size="small" variant="contained" disabled={saving} onClick={onSave}>
          {saving ? 'در حال ذخیره…' : 'ذخیره'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/** پیش‌نمایش «اعمال همهٔ نگاشت‌ها روی داده‌های موجود» (dry-run). */
export const MappingApplyPreviewDialog = ({ preview, onClose, onConfirm, pending }) => (
  <Dialog open={Boolean(preview)} onClose={onClose} maxWidth="xs" fullWidth>
    <DialogTitle sx={{ fontSize: 14, fontWeight: 800 }}>پیش‌نمایش اعمال نگاشت‌ها</DialogTitle>
    <DialogContent dividers>
      <Typography sx={{ fontSize: 12 }}>
        {`${formatPersianNumber(preview?.aliases || 0)} نگاشت بررسی می‌شود؛ `
          + `${formatPersianNumber(preview?.total || 0)} ردیف اصلاح و متصل می‌شود `
          + `(${formatPersianNumber(preview?.referrals || 0)} ارجاع و `
          + `${formatPersianNumber(preview?.letters || 0)} نامه).`}
      </Typography>
      <Alert severity="info" sx={{ mt: 1, fontSize: 11 }}>
        این عملیات فقط ردیف‌های هم‌نامِ بدون اتصال را اصلاح می‌کند و مقادیر دستی را تغییر نمی‌دهد.
      </Alert>
    </DialogContent>
    <DialogActions sx={{ px: 2, py: 1.25 }}>
      <Button size="small" onClick={onClose}>انصراف</Button>
      <Button size="small" variant="contained" disabled={pending} onClick={onConfirm}
        sx={{ bgcolor: ACCENT }}>
        {pending ? 'در حال اعمال…' : 'اعمال کن'}
      </Button>
    </DialogActions>
  </Dialog>
);

