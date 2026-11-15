/**
 * اجزای ظاهری مشترک صفحهٔ «یادداشت‌ها و وظایف» — همه روی توکن‌های استودیو تم.
 */
import React from 'react';
import {
  Avatar, Box, ButtonBase, Chip, CircularProgress, IconButton, Paper, Stack, Tooltip,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import PlaylistAddCheckOutlinedIcon from '@mui/icons-material/PlaylistAddCheckOutlined';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import ShareOutlinedIcon from '@mui/icons-material/ShareOutlined';
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined';
import { toPersianDigits } from '../../core/utils/numberUtils';
import {
  TASK_PRIORITY_META, TASK_STATUS_META, checklistStats, dueInfo, formatJalali, initialsOf,
  timeLabel, toneColor,
} from './planningTheme';

export const ChipTone = ({ theme, tone = 'neutral', label, icon, height = 22 }) => {
  const color = toneColor(theme, tone);
  return (
    <Chip
      size="small"
      label={label}
      icon={icon || undefined}
      sx={{
        height, fontSize: 10.5, fontWeight: 800,
        bgcolor: alpha(color, 0.1), color,
        border: `1px solid ${alpha(color, 0.18)}`,
        '& .MuiChip-icon': { color, fontSize: 13, marginInlineStart: '6px' },
        '& .MuiChip-label': { px: 0.85 },
      }}
    />
  );
};

export const StatusChip = ({ theme, status, height }) => {
  const meta = TASK_STATUS_META[status] || TASK_STATUS_META.todo;
  return <ChipTone theme={theme} tone={meta.tone} label={meta.label} height={height} />;
};

export const PriorityChip = ({ theme, priority, height }) => {
  const meta = TASK_PRIORITY_META[priority] || TASK_PRIORITY_META.normal;
  return <ChipTone theme={theme} tone={meta.tone} label={meta.label} height={height} />;
};

export const DueChip = ({ theme, dueDate, dueTime, height }) => {
  const info = dueInfo(dueDate);
  const label = dueTime ? `${info.label} · ${timeLabel(dueTime)}` : info.label;
  return (
    <ChipTone
      theme={theme}
      tone={info.tone}
      height={height}
      label={label}
      icon={<EventOutlinedIcon sx={{ fontSize: 12 }} />}
    />
  );
};

export const KpiTile = ({ theme, icon: Icon, label, value, hint, tone = 'accent', active, onClick }) => {
  const color = toneColor(theme, tone);
  const content = (
    <Paper
      elevation={0}
      sx={{
        p: 1.2, height: '100%', minHeight: 76,
        borderRadius: theme.radii.large,
        border: '1px solid',
        borderColor: active ? alpha(color, 0.55) : theme.cardBorderColor,
        bgcolor: active ? alpha(color, 0.06) : 'background.paper',
        boxShadow: active ? theme.shadows.card : 'none',
        display: 'flex', flexDirection: 'column', gap: 0.4,
        transition: 'border-color .16s ease, transform .16s ease, box-shadow .16s ease',
        '&:hover': onClick ? {
          borderColor: alpha(color, 0.45), transform: 'translateY(-1px)',
          boxShadow: theme.shadows.card,
        } : undefined,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={0.7}>
        <Box sx={{
          width: 26, height: 26, borderRadius: theme.radii.small, flexShrink: 0,
          bgcolor: alpha(color, 0.09), color,
          border: `1px solid ${alpha(color, 0.16)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon sx={{ fontSize: 15 }} />
        </Box>
        <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 700, color: theme.tones.muted }}>
          {label}
        </Typography>
      </Stack>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.4, minWidth: 0 }}>
        <Typography noWrap sx={{
          fontSize: 18, fontWeight: 900, color: theme.tones.text,
          fontFamily: 'var(--hrms-table-number-font, inherit)',
        }}>
          {toPersianDigits(value || 0)}
        </Typography>
        {hint ? (
          <Typography noWrap sx={{ fontSize: 10, color: theme.tones.muted }}>{hint}</Typography>
        ) : null}
      </Box>
    </Paper>
  );
  return onClick
    ? (
      <ButtonBase
        onClick={onClick}
        aria-pressed={Boolean(active)}
        sx={{
          width: '100%', height: '100%', borderRadius: theme.radii.large,
          display: 'block', textAlign: 'inherit',
        }}
      >
        {content}
      </ButtonBase>
    )
    : content;
};

export const ChecklistBar = ({ theme, checklist, compact = false }) => {
  const stats = checklistStats(checklist);
  if (!stats.total) return null;
  const color = stats.percent === 100 ? theme.tones.success : theme.tones.info;
  return (
    <Box sx={{ mt: compact ? 0.5 : 0.75 }}>
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.35 }}>
        <PlaylistAddCheckOutlinedIcon sx={{ fontSize: 12, color: theme.tones.muted }} />
        <Typography sx={{ fontSize: 9.5, color: theme.tones.muted }}>
          {toPersianDigits(stats.done)} از {toPersianDigits(stats.total)}
        </Typography>
      </Stack>
      <Box sx={{ height: 4, borderRadius: 2, bgcolor: alpha(theme.tones.neutral, 0.16), overflow: 'hidden' }}>
        <Box sx={{
          width: `${stats.percent}%`, height: '100%', borderRadius: 2,
          background: `linear-gradient(90deg, ${alpha(color, 0.55)}, ${color})`,
          transition: 'width .3s ease',
        }} />
      </Box>
    </Box>
  );
};

export const PersonAvatar = ({ theme, person, size = 20 }) => (
  <Tooltip title={person?.name || ''}>
    <Avatar
      src={person?.photo_url || undefined}
      alt={person?.name || ''}
      sx={{
        width: size, height: size, fontSize: Math.max(8, Math.round(size * 0.4)), fontWeight: 900,
        bgcolor: alpha(theme.accent, 0.14), color: theme.accent,
        border: '1px solid', borderColor: 'background.paper',
      }}
    >
      {initialsOf(person?.name)}
    </Avatar>
  </Tooltip>
);

export const AssigneeStack = ({ theme, people = [], size = 18, max = 3 }) => {
  if (!people.length) return null;
  const shown = people.slice(0, max);
  return (
    <Stack direction="row" spacing={-0.6} alignItems="center">
      {shown.map((person) => (
        <PersonAvatar key={`assignee-${person.id}`} theme={theme} person={person} size={size} />
      ))}
      {people.length > max ? (
        <Typography sx={{ fontSize: 9.5, color: theme.tones.muted, marginInlineStart: 1 }}>
          +{toPersianDigits(people.length - max)}
        </Typography>
      ) : null}
    </Stack>
  );
};

export const TagChipList = ({ theme, tags = [], max = 3, height = 20 }) => {
  if (!tags.length) return null;
  const shown = tags.slice(0, max);
  return (
    <Stack direction="row" spacing={0.4} useFlexGap flexWrap="wrap">
      {shown.map((tag) => (
        <Chip
          key={tag}
          size="small"
          label={tag}
          sx={{
            height, fontSize: 9.5, fontWeight: 700,
            bgcolor: alpha(theme.tones.neutral, 0.1), color: theme.tones.muted,
            border: `1px solid ${alpha(theme.tones.neutral, 0.18)}`,
            '& .MuiChip-label': { px: 0.7 },
          }}
        />
      ))}
      {tags.length > max ? (
        <Chip
          size="small"
          label={`+${toPersianDigits(tags.length - max)}`}
          sx={{ height, fontSize: 9.5, fontWeight: 700 }}
        />
      ) : null}
    </Stack>
  );
};

export const EmptyState = ({ theme, icon: Icon = TaskAltOutlinedIcon, title, hint, action }) => (
  <Paper elevation={0} sx={{
    p: 4, textAlign: 'center', borderRadius: theme.radii.large,
    border: '1px dashed', borderColor: alpha(theme.tones.neutral, 0.32),
    bgcolor: alpha(theme.tones.neutral, 0.03),
  }}>
    <Box sx={{
      width: 46, height: 46, mx: 'auto', mb: 1.25, borderRadius: theme.radii.medium,
      bgcolor: alpha(theme.accent, 0.08), color: theme.accent,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon sx={{ fontSize: 24 }} />
    </Box>
    <Typography sx={{ fontSize: 13, fontWeight: 900, color: theme.tones.text }}>{title}</Typography>
    {hint ? (
      <Typography sx={{ fontSize: 11.5, color: theme.tones.muted, mt: 0.4, maxWidth: 460, mx: 'auto' }}>
        {hint}
      </Typography>
    ) : null}
    {action ? <Box sx={{ mt: 1.5 }}>{action}</Box> : null}
  </Paper>
);

export const LoadingBlock = ({ height = 180 }) => (
  <Box sx={{ py: 4, textAlign: 'center', minHeight: height }}>
    <CircularProgress size={24} />
  </Box>
);

const accentColor = (color, theme) => (color && color !== theme.tones.neutral ? color : theme.accent);

/* ---------------------------------------------------------------- کارت یادداشت */
export const NoteCard = ({
  theme, note, onEdit, onShare, onDelete, onTogglePin, onCreateTask,
}) => {
  const color = accentColor(note.color, theme);
  const tags = Array.isArray(note.tags) ? note.tags : [];
  return (
    <Paper
      elevation={0}
      component="article"
      data-testid="planning-note-card"
      sx={{
        position: 'relative', display: 'flex', flexDirection: 'column', gap: 0.7,
        p: 1.25, pt: 1.1, minHeight: 168,
        borderRadius: theme.radii.large,
        border: '1px solid', borderColor: alpha(color, 0.26),
        bgcolor: alpha(color, 0.05), boxShadow: 'none', overflow: 'hidden',
        transition: 'box-shadow .18s ease, border-color .18s ease, transform .18s ease',
        '&:hover': {
          borderColor: alpha(color, 0.48), boxShadow: theme.shadows.card,
          transform: 'translateY(-1px)',
        },
      }}
    >
      <Box sx={{
        position: 'absolute', insetInlineStart: 0, top: 0, bottom: 0, width: 3,
        bgcolor: color, opacity: 0.7,
      }} />
      <Stack direction="row" alignItems="flex-start" spacing={0.4}>
        <Typography
          sx={{
            flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 900, color: theme.tones.text,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {note.title || 'بدون عنوان'}
        </Typography>
        <Tooltip title={note.is_pinned ? 'برداشتن سنجاق' : 'سنجاق'}>
          <IconButton
            size="small"
            aria-label={note.is_pinned ? 'برداشتن سنجاق یادداشت' : 'سنجاق یادداشت'}
            aria-pressed={Boolean(note.is_pinned)}
            onClick={() => onTogglePin(note)}
            sx={{ p: 0.3, color: note.is_pinned ? color : theme.tones.muted }}
          >
            <PushPinOutlinedIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>
      </Stack>

      {note.body ? (
        <Typography
          sx={{
            fontSize: 11, lineHeight: 1.85, color: theme.tones.muted, whiteSpace: 'pre-wrap',
            display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical',
            overflow: 'hidden', flex: 1,
          }}
        >
          {note.body}
        </Typography>
      ) : (
        <Typography sx={{ fontSize: 11, color: theme.tones.muted, flex: 1 }}>—</Typography>
      )}

      <ChecklistBar theme={theme} checklist={note.checklist} compact />

      <Stack direction="row" spacing={0.4} useFlexGap flexWrap="wrap" alignItems="center">
        <TagChipList theme={theme} tags={tags} max={3} />
        {note.is_shared ? (
          <ChipTone theme={theme} tone="info" label="اشتراکی" height={19} />
        ) : null}
        {!note.is_mine && note.owner_name ? (
          <ChipTone theme={theme} tone="neutral" label={note.owner_name} height={19} />
        ) : null}
      </Stack>

      <Stack direction="row" alignItems="center" spacing={0.3} sx={{ mt: 'auto' }}>
        <Typography sx={{ fontSize: 9.5, color: theme.tones.muted, flex: 1 }} noWrap>
          {formatJalali(note.updated_at || note.created_at)}
        </Typography>
        <Tooltip title="ویرایش یادداشت">
          <IconButton size="small" aria-label="ویرایش یادداشت" onClick={() => onEdit(note)} sx={{ p: 0.35 }}>
            <EditOutlinedIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="تبدیل به وظیفه">
          <IconButton size="small" aria-label="تبدیل یادداشت به وظیفه" onClick={() => onCreateTask(note)}
            sx={{ p: 0.35 }}>
            <TaskAltOutlinedIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="اشتراک‌گذاری">
          <IconButton size="small" aria-label="اشتراک‌گذاری یادداشت" onClick={() => onShare(note)} sx={{ p: 0.35 }}>
            <ShareOutlinedIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>
        {note.is_mine ? (
          <Tooltip title="حذف">
            <IconButton size="small" aria-label="حذف یادداشت" onClick={() => onDelete(note)}
              sx={{ p: 0.35, color: theme.tones.danger }}>
              <DeleteOutlineIcon sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
        ) : null}
      </Stack>
    </Paper>
  );
};

/* ---------------------------------------------------------------- کارت وظیفه (تخته) */
export const TaskCard = ({
  theme, task, onEdit, onShare, onDelete, onToggle, onDragStart, dragging,
}) => {
  const done = task.status === 'done';
  return (
    <Paper
      elevation={0}
      data-testid="planning-task-card"
      draggable
      onDragStart={(event) => onDragStart(task, event)}
      sx={{
        p: 1, borderRadius: theme.radii.medium,
        border: '1px solid', borderColor: alpha(theme.tones.neutral, 0.22),
        bgcolor: 'background.paper', boxShadow: 'none', cursor: 'grab',
        opacity: dragging ? 0.55 : 1,
        transition: 'border-color .16s ease, box-shadow .16s ease',
        '&:hover': { borderColor: alpha(theme.accent, 0.4), boxShadow: theme.shadows.card },
      }}
    >
      <Stack direction="row" alignItems="flex-start" spacing={0.5}>
        <IconButton
          size="small"
          aria-label={done ? 'بازگرداندن وظیفه' : 'انجام شد'}
          onClick={() => onToggle(task)}
          sx={{ mt: -0.2, color: done ? theme.tones.success : theme.tones.muted, p: 0.3 }}
        >
          <TaskAltOutlinedIcon sx={{ fontSize: 17, opacity: done ? 1 : 0.45 }} />
        </IconButton>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: 11.5, fontWeight: 800, color: theme.tones.text, lineHeight: 1.6,
              textDecoration: done ? 'line-through' : 'none',
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {task.title}
          </Typography>
          <Stack direction="row" spacing={0.4} useFlexGap flexWrap="wrap" sx={{ mt: 0.5 }}>
            <PriorityChip theme={theme} priority={task.priority} height={19} />
            {task.due_date ? <DueChip theme={theme} dueDate={task.due_date} height={19} /> : null}
          </Stack>
          <ChecklistBar theme={theme} checklist={task.checklist} compact />
          <Stack direction="row" alignItems="center" spacing={0.5} useFlexGap flexWrap="wrap"
            sx={{ mt: 0.6 }}>
            <AssigneeStack theme={theme} people={task.assignees || []} size={16} max={2} />
            {(task.assignee_groups || []).slice(0, 1).map((group) => (
              <ChipTone key={`group-${group.id}`} theme={theme} tone="accent" label={group.name}
                icon={<GroupOutlinedIcon sx={{ fontSize: 11 }} />} height={18} />
            ))}
            {task.is_private ? <ChipTone theme={theme} tone="neutral" label="فقط من" height={18} /> : null}
            {task.tags?.length ? <TagChipList theme={theme} tags={task.tags} max={2} height={18} /> : null}
          </Stack>
        </Box>
        <Stack direction="row" spacing={0} sx={{ mt: -0.3 }}>
          <IconButton size="small" aria-label="ویرایش وظیفه" onClick={() => onEdit(task)} sx={{ p: 0.3 }}>
            <EditOutlinedIcon sx={{ fontSize: 14 }} />
          </IconButton>
          <IconButton size="small" aria-label="اشتراک‌گذاری وظیفه" onClick={() => onShare(task)} sx={{ p: 0.3 }}>
            <ShareOutlinedIcon sx={{ fontSize: 14 }} />
          </IconButton>
          {task.is_mine ? (
            <IconButton size="small" aria-label="حذف وظیفه" onClick={() => onDelete(task)}
              sx={{ p: 0.3, color: theme.tones.danger }}>
              <DeleteOutlineIcon sx={{ fontSize: 14 }} />
            </IconButton>
          ) : null}
        </Stack>
      </Stack>
    </Paper>
  );
};
