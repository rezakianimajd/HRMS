/**
 * دیالوگ‌های برنامه‌ریزی (یادداشت، وظیفه، اشتراک‌گذاری، گروه‌ها) — بازطراحی‌شده و
 * کاملاً تم‌محور؛ فرم‌ها بخش‌بندی‌شده و پاورقی چسبان دارند.
 */
import React, { useState } from 'react';
import {
  Autocomplete, Avatar, Box, Button, Checkbox, Chip, Dialog, DialogContent, DialogTitle,
  Divider, IconButton, Stack, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import PlaylistAddCheckOutlinedIcon from '@mui/icons-material/PlaylistAddCheckOutlined';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import ShareOutlinedIcon from '@mui/icons-material/ShareOutlined';
import StickyNote2OutlinedIcon from '@mui/icons-material/StickyNote2Outlined';
import SubdirectoryArrowLeftIcon from '@mui/icons-material/SubdirectoryArrowLeft';
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined';
import { toPersianDigits } from '../../core/utils/numberUtils';
import JalaliMaskedDateInput from '../../core/components/ui/JalaliMaskedDateInput';
import RichTextEditor from './RichTextEditor';
import {
  TASK_PRIORITY_META, TASK_PRIORITY_ORDER, TASK_STATUS_META, TASK_STATUS_ORDER,
  checklistStats, htmlToText, initialsOf, notePalette, tagsFrom, toneColor,
} from './planningTheme';

/* ------------------------------------------------------------------ پوستهٔ دیالوگ */
export const DialogShell = ({
  open, onClose, icon: Icon = TaskAltOutlinedIcon, color = '#6366f1', title, subtitle,
  badge, children, footer, maxWidth = 'md', theme, testId,
}) => (
  <Dialog
    open={Boolean(open)}
    onClose={onClose}
    fullWidth
    maxWidth={maxWidth}
    PaperProps={{
      'data-testid': testId,
      sx: {
        borderRadius: theme?.radii?.large || 'var(--hrms-radius-large, 16px)',
        boxShadow: theme?.shadows?.dialog,
        bgcolor: 'background.paper',
        overflow: 'hidden',
      },
    }}
  >
    <DialogTitle sx={{
      p: 0, borderBottom: '1px solid', borderColor: 'divider',
      background: `linear-gradient(135deg, ${alpha(color, 0.12)}, ${alpha(color, 0.02)})`,
    }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 2, py: 1.4 }}>
        <Box sx={{
          width: 38, height: 38, borderRadius: theme?.radii?.medium || '12px', flexShrink: 0,
          bgcolor: alpha(color, 0.12), color, border: `1px solid ${alpha(color, 0.22)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon sx={{ fontSize: 20 }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" spacing={0.75} useFlexGap flexWrap="wrap">
            <Typography sx={{ fontSize: 14, fontWeight: 900 }}>{title}</Typography>
            {badge}
          </Stack>
          {subtitle ? (
            <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.2 }}>{subtitle}</Typography>
          ) : null}
        </Box>
        <IconButton size="small" aria-label="بستن" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>
    </DialogTitle>

    <DialogContent sx={{ p: 2, bgcolor: 'background.paper' }}>{children}</DialogContent>

    {footer ? (
      <Box sx={{
        px: 2, py: 1.25, borderTop: '1px solid', borderColor: 'divider',
        bgcolor: alpha(color, 0.02),
      }}>
        {footer}
      </Box>
    ) : null}
  </Dialog>
);

/* -------------------------------------------------------------- برچسب بخش فرم */
export const SectionLabel = ({ icon: Icon, title, hint, color, theme }) => (
  <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 1 }}>
    <Box sx={{
      width: 24, height: 24, borderRadius: theme?.radii?.small || '8px', flexShrink: 0,
      bgcolor: alpha(color, 0.1), color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon sx={{ fontSize: 14 }} />
    </Box>
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ fontSize: 11.5, fontWeight: 900 }}>{title}</Typography>
      {hint ? <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>{hint}</Typography> : null}
    </Box>
  </Stack>
);

/* ------------------------------------------------------------------- ورودی برچسب */
export const TagInput = ({ value = [], onChange, label, placeholder, theme }) => {
  const [draft, setDraft] = useState('');
  const tags = Array.isArray(value) ? value : [];
  const commit = () => {
    const parts = tagsFrom(draft);
    if (!parts.length) { setDraft(''); return; }
    onChange(Array.from(new Set([...tags, ...parts])));
    setDraft('');
  };
  return (
    <Box>
      {label ? (
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', mb: 0.5 }}>
          {label}
        </Typography>
      ) : null}
      {tags.length ? (
        <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mb: 0.6 }}>
          {tags.map((tag) => (
            <Chip
              key={tag}
              size="small"
              label={tag}
              onDelete={() => onChange(tags.filter((item) => item !== tag))}
              sx={{
                height: 22, fontSize: 10.5, fontWeight: 700,
                bgcolor: alpha(theme?.accent || '#6366f1', 0.1),
                color: theme?.accent || '#6366f1',
              }}
            />
          ))}
        </Stack>
      ) : null}
      <TextField
        size="small"
        fullWidth
        value={draft}
        placeholder={placeholder || 'مثلاً: مالی، قرارداد (Enter برای افزودن)'}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault();
            commit();
          }
          if (event.key === 'Backspace' && !draft && tags.length) {
            onChange(tags.slice(0, -1));
          }
        }}
        sx={{ '& .MuiOutlinedInput-root': { borderRadius: theme?.radii?.medium || '12px' } }}
      />
    </Box>
  );
};

/* ------------------------------------------------------------------ ورودی چک‌لیست */
const ChecklistRows = ({ rows, onChange, theme, depth = 0 }) => {
  const patchRow = (index, patch) => onChange(
    rows.map((row, position) => (position === index ? { ...row, ...patch } : row)),
  );
  const addChild = (index) => patchRow(index, {
    children: [...(rows[index].children || []), { text: '', done: false }],
  });
  return (
    <Stack spacing={0.6}>
      {rows.map((row, index) => (
        <Box key={`check-${depth}-${index}`}>
          <Stack direction="row" alignItems="center" spacing={0.4}>
            <Checkbox
              size="small"
              checked={Boolean(row.done)}
              onChange={(event) => patchRow(index, { done: event.target.checked })}
              inputProps={{ 'aria-label': `انجام مورد ${toPersianDigits(index + 1)}` }}
              sx={{ p: 0.4 }}
            />
            <TextField
              size="small"
              fullWidth
              value={row.text || ''}
              placeholder={depth ? 'شرح زیرمجموعه…' : 'شرح مورد…'}
              onChange={(event) => patchRow(index, { text: event.target.value })}
              sx={{
                '& .MuiInputBase-input': {
                  fontSize: 11.5,
                  textDecoration: row.done ? 'line-through' : 'none',
                },
              }}
            />
            {depth < 2 ? (
              <Tooltip title="افزودن زیرمجموعه">
                <IconButton
                  size="small"
                  aria-label={`افزودن زیرمجموعه به مورد ${toPersianDigits(index + 1)}`}
                  onClick={() => addChild(index)}
                >
                  <SubdirectoryArrowLeftIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            ) : null}
            <IconButton
              size="small"
              aria-label="حذف مورد"
              onClick={() => onChange(rows.filter((_item, position) => position !== index))}
            >
              <DeleteOutlineIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Stack>
          {row.children?.length ? (
            <Box sx={{
              mt: 0.5, paddingInlineStart: 2,
              borderInlineStart: '2px solid', borderColor: 'divider',
            }}>
              <ChecklistRows
                rows={row.children}
                onChange={(children) => patchRow(index, { children })}
                theme={theme}
                depth={depth + 1}
              />
            </Box>
          ) : null}
        </Box>
      ))}
    </Stack>
  );
};

export const ChecklistEditor = ({ value = [], onChange, theme }) => {
  const rows = Array.isArray(value) ? value : [];
  const stats = checklistStats(rows);
  return (
    <Box>
      <ChecklistRows rows={rows} onChange={onChange} theme={theme} />
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.75 }}>
        <Button
          size="small"
          variant="text"
          startIcon={<AddIcon fontSize="small" />}
          onClick={() => onChange([...rows, { text: '', done: false }])}
        >
          افزودن مورد
        </Button>
        {stats.total ? (
          <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>
            {toPersianDigits(stats.done)} از {toPersianDigits(stats.total)} انجام شده
            ({toPersianDigits(stats.percent)}٪)
          </Typography>
        ) : (
          <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>
            چک‌لیست اختیاری است؛ با آیکن زیرمجموعه می‌توانید برای هر مورد مرحلهٔ فرعی بسازید.
          </Typography>
        )}
      </Stack>
    </Box>
  );
};

/* ------------------------------------------------------------- انتخاب چند نفر */
export const PersonMultiPicker = ({ options = [], value = [], onChange, label, theme }) => {
  const selected = options.filter((person) => value.includes(person.id));
  return (
    <Autocomplete
      multiple
      size="small"
      options={options}
      value={selected}
      onChange={(_event, next) => onChange(next.map((person) => person.id))}
      getOptionLabel={(person) => person.name || person.username || ''}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      noOptionsText="کاربری یافت نشد"
      renderInput={(params) => <TextField {...params} size="small" label={label} />}
      renderOption={(props, person) => (
        <Box component="li" {...props} key={person.id} sx={{ gap: 1 }}>
          <Avatar sx={{
            width: 22, height: 22, fontSize: 9, fontWeight: 800,
            bgcolor: alpha(theme?.accent || '#6366f1', 0.14), color: theme?.accent || '#6366f1',
          }}>
            {initialsOf(person.name)}
          </Avatar>
          <Typography sx={{ fontSize: 11.5 }}>{person.name}</Typography>
        </Box>
      )}
      renderTags={(items, getTagProps) => items.map((person, index) => {
        const { key, ...tagProps } = getTagProps({ index });
        return (
          <Chip
            key={key}
            {...tagProps}
            size="small"
            avatar={(
              <Avatar src={person.photo_url || undefined} sx={{ fontSize: 9 }}>
                {initialsOf(person.name)}
              </Avatar>
            )}
            label={person.name}
            sx={{ height: 24, fontSize: 10.5, fontWeight: 700 }}
          />
        );
      })}
    />
  );
};

/* --------------------------------------------------------------- انتخاب رنگ */
export const ColorSwatches = ({ theme, value, onChange }) => (
  <Stack direction="row" spacing={0.5} alignItems="center" useFlexGap flexWrap="wrap">
    {notePalette(theme).map((item) => (
      <Tooltip key={item.key} title={item.key}>
        <Box
          role="button"
          tabIndex={0}
          aria-label={`رنگ ${item.key}`}
          onClick={() => onChange(item.color)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') onChange(item.color);
          }}
          sx={{
            width: 22, height: 22, borderRadius: '50%', bgcolor: item.color, cursor: 'pointer',
            border: value === item.color ? `2px solid ${theme.tones.text}` : '2px solid transparent',
          }}
        />
      </Tooltip>
    ))}
  </Stack>
);

/* ------------------------------------------------------------------ دیالوگ یادداشت */
export const NoteDialog = ({ open, form, setForm, onClose, onSave, saving, theme }) => {
  const color = form.color || theme.accent;
  const chars = htmlToText(form.body).length;
  return (
    <DialogShell
      open={open}
      onClose={onClose}
      theme={theme}
      icon={StickyNote2OutlinedIcon}
      color={color}
      title={form.id ? 'ویرایش یادداشت' : 'یادداشت جدید'}
      subtitle="متن یادداشت رمزنگاری می‌شود؛ فقط شما و افراد اشتراک‌گیرنده آن را می‌بینید."
      badge={form.is_pinned ? (
        <Chip size="small" label="سنجاق‌شده" sx={{ height: 20, fontSize: 10, fontWeight: 800 }} />
      ) : null}
      maxWidth="sm"
      testId="planning-note-dialog"
      footer={(
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography sx={{ fontSize: 10, color: 'text.secondary', flex: 1 }}>
            {toPersianDigits(chars)} نویسه
          </Typography>
          <Button size="small" onClick={onClose}>انصراف</Button>
          <Button
            size="small"
            variant="contained"
            disabled={!String(form.title || '').trim() || saving}
            onClick={onSave}
          >
            {saving ? 'در حال ذخیره…' : (form.id ? 'ذخیرهٔ تغییرات' : 'ساخت یادداشت')}
          </Button>
        </Stack>
      )}
    >
      <Stack spacing={1.75}>
        <Box>
          <SectionLabel theme={theme} icon={StickyNote2OutlinedIcon} title="عنوان و متن یادداشت" color={color} />
          <Stack spacing={1}>
            <TextField
              size="small"
              autoFocus
              label="عنوان"
              value={form.title || ''}
              onChange={(event) => setForm((previous) => ({ ...previous, title: event.target.value }))}
            />
            <RichTextEditor
              theme={theme}
              value={form.body || ''}
              onChange={(body) => setForm((previous) => ({ ...previous, body }))}
              placeholder="متن یادداشت… (بولد، ایتالیک، رنگ و لیست از نوار بالا)"
            />
          </Stack>
        </Box>

        <Divider />

        <Box>
          <SectionLabel
            theme={theme}
            icon={PaletteOutlinedIcon}
            title="رنگ و برچسب"
            hint="رنگ کارت در شبکهٔ یادداشت‌ها و برچسب‌ها برای جست‌وجو استفاده می‌شوند."
            color={color}
          />
          <Stack spacing={1}>
            <ColorSwatches
              theme={theme}
              value={form.color}
              onChange={(next) => setForm((previous) => ({ ...previous, color: next }))}
            />
            <TagInput
              theme={theme}
              label="برچسب‌ها"
              value={form.tags || []}
              onChange={(tags) => setForm((previous) => ({ ...previous, tags }))}
            />
          </Stack>
        </Box>

        <Divider />

        <Box>
          <SectionLabel
            theme={theme}
            icon={PlaylistAddCheckOutlinedIcon}
            title="چک‌لیست"
            hint="برای اقدام‌های کوچک داخل یادداشت"
            color={color}
          />
          <ChecklistEditor
            theme={theme}
            value={form.checklist || []}
            onChange={(checklist) => setForm((previous) => ({ ...previous, checklist }))}
          />
        </Box>

        <Button
          size="small"
          variant={form.is_pinned ? 'contained' : 'outlined'}
          startIcon={<PushPinOutlinedIcon />}
          onClick={() => setForm((previous) => ({ ...previous, is_pinned: !previous.is_pinned }))}
          sx={{ alignSelf: 'flex-start' }}
        >
          {form.is_pinned ? 'سنجاق‌شده (برداشتن)' : 'سنجاق در بالای فهرست'}
        </Button>
      </Stack>
    </DialogShell>
  );
};

/* -------------------------------------------------------------------- دیالوگ وظیفه */
export const TaskDialog = ({
  open, form, setForm, onClose, onSave, saving, theme, directory = [], groups = [],
  onCreateGroup,
}) => {
  const statusMeta = TASK_STATUS_META[form.status] || TASK_STATUS_META.todo;
  const mode = form.assignMode || 'me';
  const selectedGroups = groups.filter((group) => (form.groupIds || []).includes(group.id));
  const patch = (values) => setForm((previous) => ({ ...previous, ...values }));

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      theme={theme}
      icon={TaskAltOutlinedIcon}
      color={toneColor(theme, statusMeta.tone)}
      title={form.id ? 'ویرایش وظیفه' : 'وظیفه جدید'}
      subtitle="وضعیت، اولویت، سررسید و چک‌لیست را یک‌جا تنظیم کنید."
      badge={(
        <Chip
          size="small"
          label={statusMeta.label}
          sx={{
            height: 20, fontSize: 10, fontWeight: 800,
            bgcolor: alpha(toneColor(theme, statusMeta.tone), 0.12),
            color: toneColor(theme, statusMeta.tone),
          }}
        />
      )}
      maxWidth="md"
      testId="planning-task-dialog"
      footer={(
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            size="small"
            variant={form.is_pinned ? 'contained' : 'outlined'}
            startIcon={<PushPinOutlinedIcon />}
            onClick={() => patch({ is_pinned: !form.is_pinned })}
          >
            {form.is_pinned ? 'سنجاق‌شده' : 'سنجاق'}
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button size="small" onClick={onClose}>انصراف</Button>
          <Button
            size="small"
            variant="contained"
            disabled={!String(form.title || '').trim() || saving}
            onClick={onSave}
          >
            {saving ? 'در حال ذخیره…' : (form.id ? 'ذخیرهٔ تغییرات' : 'ساخت وظیفه')}
          </Button>
        </Stack>
      )}
    >
      <Stack spacing={1.75}>
        <Box>
          <SectionLabel theme={theme} icon={TaskAltOutlinedIcon} title="جزئیات وظیفه" color={theme.accent} />
          <Stack spacing={1}>
            <TextField
              size="small"
              autoFocus
              label="عنوان وظیفه"
              value={form.title || ''}
              onChange={(event) => patch({ title: event.target.value })}
            />
            <TextField
              size="small"
              label="توضیح"
              multiline
              minRows={3}
              value={form.description || ''}
              onChange={(event) => patch({ description: event.target.value })}
            />
            <TagInput
              theme={theme}
              label="برچسب‌ها"
              value={form.tags || []}
              onChange={(tags) => patch({ tags })}
              placeholder="مثلاً: پیگیری، قرارداد (Enter)"
            />
            {form.related_label ? (
              <Chip
                size="small"
                label={`مرتبط با: ${form.related_label}`}
                sx={{ alignSelf: 'flex-start', fontSize: 10.5, fontWeight: 700 }}
              />
            ) : null}
          </Stack>
        </Box>

        <Divider />

        <Box>
          <SectionLabel
            theme={theme}
            icon={AccessTimeOutlinedIcon}
            title="وضعیت، اولویت و زمان"
            hint="سررسید با تاریخ شمسی ثبت می‌شود."
            color={theme.accent}
          />
          <Stack spacing={1}>
            <Box>
              <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mb: 0.5 }}>وضعیت</Typography>
              <ToggleButtonGroup
                size="small"
                exclusive
                fullWidth
                value={form.status}
                onChange={(_event, next) => { if (next) patch({ status: next }); }}
                sx={{ '& .MuiToggleButton-root': { fontSize: 10.5, py: 0.45, fontWeight: 800 } }}
              >
                {TASK_STATUS_ORDER.map((key) => {
                  const meta = TASK_STATUS_META[key];
                  const color = toneColor(theme, meta.tone);
                  return (
                    <ToggleButton
                      key={key}
                      value={key}
                      sx={{
                        '&.Mui-selected': {
                          bgcolor: alpha(color, 0.14), color,
                          borderColor: alpha(color, 0.35),
                          '&:hover': { bgcolor: alpha(color, 0.2) },
                        },
                      }}
                    >
                      {meta.label}
                    </ToggleButton>
                  );
                })}
              </ToggleButtonGroup>
            </Box>
            <Box>
              <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mb: 0.5 }}>اولویت</Typography>
              <ToggleButtonGroup
                size="small"
                exclusive
                fullWidth
                value={form.priority}
                onChange={(_event, next) => { if (next) patch({ priority: next }); }}
                sx={{ '& .MuiToggleButton-root': { fontSize: 10.5, py: 0.45, fontWeight: 800 } }}
              >
                {TASK_PRIORITY_ORDER.map((key) => {
                  const meta = TASK_PRIORITY_META[key];
                  const color = toneColor(theme, meta.tone);
                  return (
                    <ToggleButton
                      key={key}
                      value={key}
                      sx={{
                        '&.Mui-selected': {
                          bgcolor: alpha(color, 0.14), color,
                          borderColor: alpha(color, 0.35),
                          '&:hover': { bgcolor: alpha(color, 0.2) },
                        },
                      }}
                    >
                      {meta.label}
                    </ToggleButton>
                  );
                })}
              </ToggleButtonGroup>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Box sx={{ flex: 1 }}>
                <JalaliMaskedDateInput
                  value={form.due_date || ''}
                  onChange={(iso) => patch({ due_date: iso })}
                  label="سررسید (شمسی)"
                  variant="outlined"
                  inputSx={{ fontSize: 11 }}
                />
              </Box>
              <TextField
                size="small"
                type="time"
                label="ساعت"
                value={form.due_time || ''}
                onChange={(event) => patch({ due_time: event.target.value })}
                inputProps={{ step: 60 }}
                sx={{ width: { xs: '100%', sm: 150 }, '& .MuiInputBase-input': { fontSize: 11 } }}
              />
            </Stack>
          </Stack>
        </Box>

        <Divider />

        <Box>
          <SectionLabel
            theme={theme}
            icon={PersonOutlineIcon}
            title="این وظیفه برای چه کسی است؟"
            hint="به‌صورت پیش‌فرض هیچ‌کس جز شما آن را نمی‌بیند."
            color={theme.accent}
          />
          <ToggleButtonGroup
            size="small"
            exclusive
            fullWidth
            value={mode}
            onChange={(_event, next) => {
              if (!next) return;
              patch({
                assignMode: next,
                assigneeIds: next === 'people' ? form.assigneeIds : [],
                groupIds: next === 'group' ? form.groupIds : [],
              });
            }}
            sx={{
              mb: 1,
              '& .MuiToggleButton-root': { fontSize: 10.5, py: 0.45, fontWeight: 800, gap: 0.4 },
            }}
          >
            <ToggleButton value="me">
              <LockOutlinedIcon sx={{ fontSize: 14 }} />
              فقط خودم
            </ToggleButton>
            <ToggleButton value="people">
              <PersonOutlineIcon sx={{ fontSize: 14 }} />
              یک یا چند نفر
            </ToggleButton>
            <ToggleButton value="group">
              <GroupOutlinedIcon sx={{ fontSize: 14 }} />
              گروه
            </ToggleButton>
          </ToggleButtonGroup>

          {mode === 'people' ? (
            <PersonMultiPicker
              theme={theme}
              label="مسئولان انجام"
              options={directory}
              value={form.assigneeIds || []}
              onChange={(assigneeIds) => patch({ assigneeIds })}
            />
          ) : null}

          {mode === 'group' ? (
            <Stack spacing={0.75}>
              <Autocomplete
                multiple
                size="small"
                options={groups}
                value={selectedGroups}
                onChange={(_event, next) => patch({ groupIds: next.map((group) => group.id) })}
                getOptionLabel={(group) => group.name || ''}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                noOptionsText="گروهی ساخته نشده است"
                renderInput={(params) => <TextField {...params} size="small" label="گروه‌های مسئول" />}
                renderOption={(props, group) => (
                  <Box component="li" {...props} key={group.id} sx={{ gap: 1 }}>
                    <GroupOutlinedIcon sx={{ fontSize: 16, color: theme.accent }} />
                    <Typography sx={{ fontSize: 11.5 }}>{group.name}</Typography>
                    <Typography sx={{ fontSize: 10, color: 'text.secondary', marginInlineStart: 'auto' }}>
                      {toPersianDigits(group.member_count || 0)} عضو
                    </Typography>
                  </Box>
                )}
                renderTags={(items, getTagProps) => items.map((group, index) => {
                  const { key, ...tagProps } = getTagProps({ index });
                  return (
                    <Chip
                      key={key}
                      {...tagProps}
                      size="small"
                      label={group.name}
                      sx={{
                        height: 24, fontSize: 10.5, fontWeight: 700,
                        bgcolor: alpha(group.color || theme.accent, 0.1),
                        color: group.color || theme.accent,
                      }}
                    />
                  );
                })}
              />
              <Button
                size="small"
                variant="text"
                startIcon={<AddIcon fontSize="small" />}
                onClick={onCreateGroup}
                sx={{ alignSelf: 'flex-start' }}
              >
                ساخت گروه جدید
              </Button>
            </Stack>
          ) : null}

          <Typography sx={{ fontSize: 10, color: 'text.secondary', mt: 0.75 }}>
            {mode === 'me'
              ? 'این وظیفه فقط برای شماست و هیچ‌کس دیگری آن را نمی‌بیند.'
              : 'افراد انتخاب‌شده وظیفه را در «وظایف من» می‌بینند، اعلان می‌گیرند و می‌توانند وضعیت را تغییر دهند.'}
          </Typography>
        </Box>

        <Divider />

        <Box>
          <SectionLabel
            theme={theme}
            icon={PlaylistAddCheckOutlinedIcon}
            title="چک‌لیست وظیفه"
            hint="اقدام‌های خرد را به مراحل بشکنید."
            color={theme.accent}
          />
          <ChecklistEditor
            theme={theme}
            value={form.checklist || []}
            onChange={(checklist) => patch({ checklist })}
          />
        </Box>
      </Stack>
    </DialogShell>
  );
};

/* ------------------------------------------------------------- دیالوگ اشتراک‌گذاری */
export const ShareDialog = ({
  open, target, theme, directory = [], selected = [], onSelectedChange, permission,
  onPermissionChange, onShare, onUnshare, saving, onClose,
}) => {
  const row = target?.row || {};
  const kindLabel = target?.kind === 'note' ? 'یادداشت' : 'وظیفه';
  const shares = row.shares || [];
  return (
    <DialogShell
      open={open}
      onClose={onClose}
      theme={theme}
      icon={ShareOutlinedIcon}
      color={theme.accent}
      title={`اشتراک‌گذاری ${kindLabel}`}
      subtitle={row.title || ''}
      maxWidth="sm"
      footer={(
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography sx={{ fontSize: 10, color: 'text.secondary', flex: 1 }}>
            فقط مالک آیتم می‌تواند دسترسی بدهد یا بگیرد.
          </Typography>
          <Button size="small" onClick={onClose}>بستن</Button>
          <Button
            size="small"
            variant="contained"
            disabled={!selected.length || saving}
            onClick={onShare}
          >
            {saving ? 'در حال اشتراک…' : 'اشتراک‌گذاری'}
          </Button>
        </Stack>
      )}
    >
      <Stack spacing={1.75}>
        <Box>
          <SectionLabel
            theme={theme}
            icon={GroupOutlinedIcon}
            title="افراد دارای دسترسی"
            hint={`${toPersianDigits(shares.length)} نفر`}
            color={theme.accent}
          />
          {shares.length ? (
            <Stack spacing={0.6}>
              {shares.map((share) => (
                <Stack
                  key={`share-${share.shared_with}`}
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  sx={{
                    p: 0.75, borderRadius: theme.radii.medium, border: '1px solid',
                    borderColor: 'divider', bgcolor: 'background.paper',
                  }}
                >
                  <Avatar sx={{
                    width: 26, height: 26, fontSize: 10, fontWeight: 800,
                    bgcolor: alpha(theme.accent, 0.14), color: theme.accent,
                  }}>
                    {initialsOf(share.shared_with_name)}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 800 }}>
                      {share.shared_with_name || 'همکار'}
                    </Typography>
                    <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>
                      {share.permission_display || 'فقط مشاهده'}
                    </Typography>
                  </Box>
                  <Tooltip title="حذف دسترسی">
                    <IconButton
                      size="small"
                      aria-label={`حذف دسترسی ${share.shared_with_name}`}
                      onClick={() => onUnshare(share.shared_with)}
                      sx={{ color: theme.tones.danger }}
                    >
                      <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </Stack>
              ))}
            </Stack>
          ) : (
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
              هنوز با کسی به اشتراک گذاشته نشده است.
            </Typography>
          )}
        </Box>

        <Divider />

        <Box>
          <SectionLabel theme={theme} icon={PersonOutlineIcon} title="افزودن افراد" color={theme.accent} />
          <Stack spacing={1}>
            <PersonMultiPicker
              theme={theme}
              label="کاربران"
              options={directory}
              value={selected}
              onChange={onSelectedChange}
            />
            <ToggleButtonGroup
              size="small"
              exclusive
              value={permission}
              onChange={(_event, next) => { if (next) onPermissionChange(next); }}
              sx={{ '& .MuiToggleButton-root': { fontSize: 10.5, py: 0.4, fontWeight: 800 } }}
            >
              <ToggleButton value="view">فقط مشاهده</ToggleButton>
              <ToggleButton value="edit">مشاهده و ویرایش</ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        </Box>
      </Stack>
    </DialogShell>
  );
};

/* ------------------------------------------------------------------ دیالوگ گروه‌ها */
export const GroupsDialog = ({
  open, onClose, theme, groups = [], directory = [], form, setForm, onSave, onDelete,
  onEdit, saving,
}) => {
  const emptyForm = { id: null, name: '', color: theme.accent, members: [] };
  return (
    <DialogShell
      open={open}
      onClose={onClose}
      theme={theme}
      icon={GroupOutlinedIcon}
      color={theme.accent}
      title="گروه‌های محول‌کردن وظیفه"
      subtitle="وظیفه را یک‌جا به همهٔ اعضای یک تیم محول کنید."
      badge={(
        <Chip
          size="small"
          label={`${toPersianDigits(groups.length)} گروه`}
          sx={{
            height: 20, fontSize: 10, fontWeight: 800,
            bgcolor: alpha(theme.accent, 0.1), color: theme.accent,
          }}
        />
      )}
      maxWidth="sm"
      footer={(
        <Stack direction="row" spacing={1} alignItems="center">
          <Button size="small" variant="text" onClick={() => setForm(emptyForm)}>
            گروه جدید
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button size="small" onClick={onClose}>بستن</Button>
          <Button
            size="small"
            variant="contained"
            disabled={!String(form.name || '').trim() || saving}
            onClick={onSave}
          >
            {saving ? 'در حال ذخیره…' : (form.id ? 'ذخیرهٔ تغییرات' : 'ساخت گروه')}
          </Button>
        </Stack>
      )}
    >
      <Stack spacing={1.75}>
        <Box>
          <SectionLabel
            theme={theme}
            icon={GroupOutlinedIcon}
            title="گروه‌های موجود"
            hint="اعضای هر گروه را می‌توانید ویرایش کنید."
            color={theme.accent}
          />
          {groups.length ? (
            <Stack spacing={0.6}>
              {groups.map((group) => (
                <Stack
                  key={group.id}
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  sx={{
                    p: 0.75, borderRadius: theme.radii.medium, border: '1px solid',
                    borderColor: form.id === group.id ? alpha(theme.accent, 0.45) : 'divider',
                    bgcolor: form.id === group.id ? alpha(theme.accent, 0.05) : 'background.paper',
                  }}
                >
                  <Box sx={{
                    width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                    bgcolor: group.color || theme.accent,
                  }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 800 }}>{group.name}</Typography>
                    <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>
                      {toPersianDigits(group.member_count || 0)} عضو
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={-0.6} sx={{ display: { xs: 'none', sm: 'flex' } }}>
                    {(group.members || []).slice(0, 4).map((member) => (
                      <Tooltip key={`${group.id}-${member.id}`} title={member.name || ''}>
                        <Avatar sx={{
                          width: 20, height: 20, fontSize: 8, fontWeight: 800,
                          bgcolor: alpha(theme.accent, 0.14), color: theme.accent,
                          border: '1px solid', borderColor: 'background.paper',
                        }}>
                          {initialsOf(member.name)}
                        </Avatar>
                      </Tooltip>
                    ))}
                  </Stack>
                  <Tooltip title="ویرایش گروه">
                    <IconButton size="small" aria-label={`ویرایش ${group.name}`} onClick={() => onEdit(group)}>
                      <EditOutlinedIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="حذف گروه">
                    <IconButton
                      size="small"
                      aria-label={`حذف ${group.name}`}
                      onClick={() => onDelete(group)}
                      sx={{ color: theme.tones.danger }}
                    >
                      <DeleteOutlineIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                  </Tooltip>
                </Stack>
              ))}
            </Stack>
          ) : (
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
              هنوز گروهی ساخته نشده است؛ از فرم پایین اولین تیم را بسازید.
            </Typography>
          )}
        </Box>

        <Divider />

        <Box>
          <SectionLabel
            theme={theme}
            icon={form.id ? EditOutlinedIcon : AddIcon}
            title={form.id ? 'ویرایش گروه' : 'گروه جدید'}
            color={theme.accent}
          />
          <Stack spacing={1}>
            <TextField
              size="small"
              label="نام گروه (مثلاً تیم مالی)"
              value={form.name || ''}
              onChange={(event) => setForm((previous) => ({ ...previous, name: event.target.value }))}
            />
            <ColorSwatches
              theme={theme}
              value={form.color}
              onChange={(color) => setForm((previous) => ({ ...previous, color }))}
            />
            <PersonMultiPicker
              theme={theme}
              label="اعضای گروه"
              options={directory}
              value={form.members || []}
              onChange={(members) => setForm((previous) => ({ ...previous, members }))}
            />
          </Stack>
        </Box>
      </Stack>
    </DialogShell>
  );
};
