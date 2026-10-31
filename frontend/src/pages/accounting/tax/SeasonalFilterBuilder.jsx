import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider,
  IconButton, MenuItem, Paper, Select, Stack, TextField,
  ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SaveIcon from '@mui/icons-material/Save';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import StarIcon from '@mui/icons-material/Star';

import JalaliDatePicker from '../../../core/components/ui/JalaliDatePicker';
import { toPersianDigits } from '../../../core/utils/numberUtils';
import {
  FIELD_MAP, FILTER_FIELDS, FILTER_PRESETS, OPERATOR_LABELS, addCondition, addGroup,
  countConditions, describeExpression, emptyExpression, evaluateExpression, fieldChoices,
  needsValue, normalizeExpression, operatorsFor, removeItem, setGroupOp, updateCondition,
} from './seasonalFilters';

const MUTED = '#64748b';
const SMALL = { fontSize: 10.5 };

const selectSx = { ...SMALL, height: 28, '& .MuiSelect-select': { py: 0.4 } };

/** ورودی مقدار شرط بر اساس نوع فیلد و عملگر. */
const ValueEditor = ({ condition, onChange }) => {
  const { field, operator, value, value2 } = condition;
  const type = FIELD_MAP[field]?.type || 'text';

  if (!needsValue(operator)) return <Box sx={{ flex: '1 1 150px' }} />;

  if (operator === 'in') {
    return (
      <TextField
        size="small"
        value={value || ''}
        onChange={(event) => onChange({ value: event.target.value })}
        placeholder={type === 'kind' ? 'مثلاً ۱، ۳' : 'با کاما جدا کنید'}
        sx={{ flex: '1 1 170px', '& input': SMALL }}
        inputProps={{ 'aria-label': `${FIELD_MAP[field]?.label || field} — مقادیر` }}
      />
    );
  }

  const choices = fieldChoices(field);
  if (choices.length) {
    return (
      <Select
        size="small"
        value={String(value ?? '')}
        onChange={(event) => onChange({ value: event.target.value })}
        sx={{ flex: '1 1 150px', ...selectSx }}
        inputProps={{ 'aria-label': `${FIELD_MAP[field]?.label || field} — مقدار` }}
      >
        {choices.map((choice) => (
          <MenuItem key={choice.value} value={choice.value} sx={SMALL}>{choice.label}</MenuItem>
        ))}
      </Select>
    );
  }

  if (type === 'date') {
    return (
      <Stack direction="row" spacing={0.5} sx={{ flex: '1 1 200px', alignItems: 'center' }}>
        <JalaliDatePicker
          noHelper
          value={value || ''}
          onChange={(next) => onChange({ value: next })}
          sx={{ width: 128, '& input': SMALL }}
        />
        {operator === 'between' ? (
          <>
            <Typography sx={{ ...SMALL, color: MUTED }}>تا</Typography>
            <JalaliDatePicker
              noHelper
              value={value2 || ''}
              onChange={(next) => onChange({ value2: next })}
              sx={{ width: 128, '& input': SMALL }}
            />
          </>
        ) : null}
      </Stack>
    );
  }

  return (
    <Stack direction="row" spacing={0.5} sx={{ flex: '1 1 180px', alignItems: 'center' }}>
      <TextField
        size="small"
        value={value ?? ''}
        onChange={(event) => onChange({ value: event.target.value })}
        placeholder={type === 'money' || type === 'ratio' ? '۰' : 'مقدار'}
        sx={{ flex: 1, '& input': SMALL }}
        inputProps={{ inputMode: type === 'money' || type === 'ratio' ? 'decimal' : 'text' }}
      />
      {operator === 'between' ? (
        <>
          <Typography sx={{ ...SMALL, color: MUTED }}>تا</Typography>
          <TextField
            size="small"
            value={value2 ?? ''}
            onChange={(event) => onChange({ value2: event.target.value })}
            placeholder="۰"
            sx={{ flex: 1, '& input': SMALL }}
            inputProps={{ inputMode: 'decimal' }}
          />
        </>
      ) : null}
    </Stack>
  );
};
/** یک شرط: فیلد، عملگر، مقدار و حذف. */
const ConditionRow = ({ condition, groupIndex, index, onAction }) => {
  const operators = operatorsFor(condition.field);
  return (
    <Stack
      direction="row"
      spacing={0.75}
      sx={{ alignItems: 'center', mb: 0.6, flexWrap: 'wrap', rowGap: 0.6 }}
      data-testid="filter-condition"
    >
      <Select
        size="small"
        value={condition.field}
        onChange={(event) => onAction({ kind: 'updateCondition', groupIndex, index, patch: { field: event.target.value } })}
        sx={{ minWidth: 165, ...selectSx }}
        inputProps={{ 'aria-label': 'فیلد شرط' }}
      >
        {FILTER_FIELDS.map((field) => (
          <MenuItem key={field.key} value={field.key} sx={SMALL}>{field.label}</MenuItem>
        ))}
      </Select>
      <Select
        size="small"
        value={condition.operator}
        onChange={(event) => onAction({ kind: 'updateCondition', groupIndex, index, patch: { operator: event.target.value } })}
        sx={{ minWidth: 145, ...selectSx }}
        inputProps={{ 'aria-label': 'عملگر شرط' }}
      >
        {operators.map((operator) => (
          <MenuItem key={operator} value={operator} sx={SMALL}>{OPERATOR_LABELS[operator]}</MenuItem>
        ))}
      </Select>
      <ValueEditor
        condition={condition}
        onChange={(patch) => onAction({ kind: 'updateCondition', groupIndex, index, patch })}
      />
      <Tooltip title="حذف شرط">
        <IconButton
          size="small"
          aria-label="حذف شرط"
          onClick={() => onAction({ kind: 'removeCondition', groupIndex, index })}
          sx={{ color: '#b91c1c' }}
        >
          <DeleteOutlineIcon sx={{ fontSize: 15 }} />
        </IconButton>
      </Tooltip>
    </Stack>
  );
};

/** گروه شرط‌ها: «همه (و)» یا «یکی (یا)»؛ یک سطح تودرتو پشتیبانی می‌شود. */
const GroupEditor = ({ group, groupIndex, depth, onAction }) => (
  <Paper
    variant="outlined"
    sx={{
      p: 0.85,
      mb: depth ? 0.75 : 0,
      bgcolor: depth ? 'rgba(15, 118, 110, 0.05)' : 'transparent',
      borderColor: depth ? 'rgba(15, 118, 110, 0.35)' : 'var(--hrms-table-border-color, #e2e8f0)',
      borderRadius: 'var(--hrms-card-radius, 10px)',
    }}
  >
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.6 }}>
      <ToggleButtonGroup
        size="small"
        exclusive
        value={group.op}
        onChange={(_event, next) => next && onAction({ kind: 'groupOp', groupIndex, op: next })}
      >
        <ToggleButton value="and" sx={{ ...SMALL, px: 1.2, py: 0.2 }}>همه (و)</ToggleButton>
        <ToggleButton value="or" sx={{ ...SMALL, px: 1.2, py: 0.2 }}>یکی (یا)</ToggleButton>
      </ToggleButtonGroup>
      <Typography sx={{ ...SMALL, color: MUTED }}>
        {group.op === 'or' ? 'کافی است یکی از شرط‌های این گروه برقرار باشد.' : 'همهٔ شرط‌های این گروه باید برقرار باشند.'}
      </Typography>
      {depth > 0 ? (
        <Tooltip title="حذف گروه">
          <IconButton
            size="small"
            aria-label="حذف گروه"
            onClick={() => onAction({ kind: 'removeCondition', groupIndex: -1, index: groupIndex })}
            sx={{ ml: 'auto', color: '#b91c1c' }}
          >
            <CloseIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
      ) : null}
    </Stack>

    {group.items.map((item, index) => (
      item && Array.isArray(item.items) ? (
        <GroupEditor key={`group-${index}`} group={item} groupIndex={index} depth={depth + 1} onAction={onAction} />
      ) : (
        <ConditionRow key={`cond-${index}`} condition={item} groupIndex={groupIndex} index={index} onAction={onAction} />
      )
    ))}

    <Button
      size="small"
      startIcon={<AddIcon sx={{ fontSize: 14 }} />}
      onClick={() => onAction({ kind: 'addCondition', groupIndex })}
      sx={{ ...SMALL, color: 'primary.main' }}
    >
      افزودن شرط
    </Button>
  </Paper>
);
/**
 * فیلتر فوق‌پیشرفته: ساخت درخت شرط AND/OR، شرط‌های آماده، پیش‌نمایش تعداد
 * و نماهای ذخیره‌شده. همان درخت برای جدول، گزارش تحلیلی، پیوت و خروجی‌ها
 * استفاده می‌شود.
 */
const SeasonalFilterBuilder = ({
  open, onClose, expression, onApply, rows = [],
  savedViews = [], viewsEnabled = false, viewsBusy = false,
  onSaveView, onDeleteView, onToggleFavorite,
}) => {
  const [draft, setDraft] = useState(emptyExpression());
  const [viewName, setViewName] = useState('');

  useEffect(() => {
    if (open) {
      setDraft(normalizeExpression(expression || emptyExpression()));
      setViewName('');
    }
  }, [open, expression]);

  const action = (next) => {
    setDraft((current) => {
      switch (next.kind) {
        case 'addCondition': return addCondition(current, next.groupIndex ?? -1);
        case 'addGroup': return addGroup(current);
        case 'removeCondition': return removeItem(current, next.groupIndex ?? -1, next.index);
        case 'updateCondition': return updateCondition(current, next.groupIndex ?? -1, next.index, next.patch);
        case 'groupOp': return setGroupOp(current, next.groupIndex ?? -1, next.op);
        case 'replace': return normalizeExpression(next.expression);
        case 'reset': return emptyExpression();
        default: return current;
      }
    });
  };

  const matched = useMemo(() => evaluateExpression(rows, draft).length, [rows, draft]);
  const conditionCount = countConditions(draft);
  const summary = describeExpression(draft);

  const close = () => onClose?.();
  const apply = () => {
    onApply?.(normalizeExpression(draft));
    close();
  };

  const saveView = () => {
    const name = viewName.trim();
    if (!name) return;
    onSaveView?.(name, normalizeExpression(draft));
    setViewName('');
  };

  return (
    <Dialog open={open} onClose={close} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontSize: 14, fontWeight: 800, pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        فیلتر فوق‌پیشرفته
        {conditionCount ? (
          <Chip size="small" label={`${toPersianDigits(conditionCount)} شرط`} sx={{ ...SMALL, height: 20 }} />
        ) : null}
        <IconButton size="small" onClick={close} sx={{ ml: 'auto' }} aria-label="بستن">
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Typography sx={{ ...SMALL, color: MUTED, mb: 1, lineHeight: 1.8 }}>
          شرط‌ها را بسازید؛ هر گروه می‌تواند «همه (و)» یا «یکی (یا)» باشد. این فیلتر هم‌زمان روی جدول،
          گزارش تحلیلی، پیوت طرف‌ها و خروجی‌ها اعمال می‌شود.
        </Typography>

        <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.75, mb: 1 }}>
          {FILTER_PRESETS.map((preset) => (
            <Chip
              key={preset.key}
              size="small"
              label={preset.label}
              onClick={() => action({ kind: 'replace', expression: preset.build() })}
              sx={{ ...SMALL, height: 22, bgcolor: 'rgba(15, 118, 110, 0.08)' }}
              data-testid="filter-preset"
            />
          ))}
        </Stack>

        <GroupEditor group={draft} groupIndex={-1} depth={0} onAction={action} />

        <Stack direction="row" spacing={1} sx={{ mt: 1, alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Button size="small" startIcon={<AddIcon sx={{ fontSize: 14 }} />} onClick={() => action({ kind: 'addGroup' })} sx={SMALL}>
            افزودن گروه (یا)
          </Button>
          <Typography sx={{ ...SMALL, color: MUTED }}>
            {draft.items.length === 0
              ? 'هنوز شرطی اضافه نشده است.'
              : `${toPersianDigits(matched)} از ${toPersianDigits(rows.length)} ردیف با این فیلتر مطابق است.`}
          </Typography>
        </Stack>

        <Alert severity="info" sx={{ mt: 1.25, py: 0.25, ...SMALL }}>
          {summary}
        </Alert>
        <Divider sx={{ my: 1.5 }} />

        <Typography sx={{ ...SMALL, fontWeight: 700, mb: 0.5 }}>نماهای ذخیره‌شده</Typography>
        {!viewsEnabled ? (
          <Typography sx={{ ...SMALL, color: MUTED }}>
            ذخیرهٔ نما پس از اتصال به سرور فعال می‌شود.
          </Typography>
        ) : (
          <>
            {savedViews.length ? (
              <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.75, mb: 0.75 }}>
                {savedViews.map((view) => (
                  <Chip
                    key={view.id}
                    size="small"
                    label={view.name}
                    title={view.filters_label || ''}
                    onClick={() => action({ kind: 'replace', expression: view.filters })}
                    onDelete={() => onDeleteView?.(view)}
                    icon={view.is_favorite
                      ? <StarIcon sx={{ fontSize: 13 }} onClick={() => onToggleFavorite?.(view)} />
                      : <StarBorderIcon sx={{ fontSize: 13 }} onClick={() => onToggleFavorite?.(view)} />}
                    disabled={viewsBusy}
                    sx={{ ...SMALL, height: 22 }}
                    data-testid="saved-view"
                  />
                ))}
              </Stack>
            ) : (
              <Typography sx={{ ...SMALL, color: MUTED, mb: 0.75 }}>
                هنوز نمایی ذخیره نشده است.
              </Typography>
            )}
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}>
              <TextField
                size="small"
                value={viewName}
                onChange={(event) => setViewName(event.target.value)}
                placeholder="نام نما (مثلاً خریدهای بزرگ حقوقی)"
                sx={{ minWidth: 240, '& input': SMALL }}
                inputProps={{ 'aria-label': 'نام نمای ذخیره‌شده' }}
              />
              <Button
                size="small"
                startIcon={<SaveIcon sx={{ fontSize: 14 }} />}
                onClick={saveView}
                disabled={viewsBusy || !viewName.trim()}
                sx={SMALL}
              >
                ذخیرهٔ نما
              </Button>
            </Stack>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.25 }}>
        <Button
          size="small"
          startIcon={<RestartAltIcon sx={{ fontSize: 14 }} />}
          onClick={() => action({ kind: 'reset' })}
          sx={SMALL}
        >
          پاک کردن همه
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button size="small" onClick={close} sx={SMALL}>انصراف</Button>
        <Button size="small" variant="contained" onClick={apply} sx={SMALL} data-testid="apply-filter">
          اعمال فیلتر
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SeasonalFilterBuilder;



