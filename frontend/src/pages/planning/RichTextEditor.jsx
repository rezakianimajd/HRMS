/**
 * ادیتور متن غنی یادداشت — بدون وابستگی بیرونی (contentEditable + execCommand).
 *
 * خروجی HTML امن است: سرور در `planning.richtext.sanitize_html` فقط تگ‌های مجاز
 * (b/strong/i/em/u/s/br/p/div/span/ul/ol/li/blockquote) و رنگ معتبر را نگه می‌دارد.
 */
import React, { useEffect, useRef } from 'react';
import { Box, IconButton, Stack, Tooltip } from '@mui/material';
import { alpha } from '@mui/material/styles';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatClearIcon from '@mui/icons-material/FormatClear';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import { notePalette } from './planningTheme';

const COMMANDS = [
  { command: 'bold', icon: FormatBoldIcon, label: 'بولد (Ctrl+B)' },
  { command: 'italic', icon: FormatItalicIcon, label: 'ایتالیک (Ctrl+I)' },
  { command: 'underline', icon: FormatUnderlinedIcon, label: 'زیرخط (Ctrl+U)' },
  { command: 'insertUnorderedList', icon: FormatListBulletedIcon, label: 'لیست نقطه‌ای' },
  { command: 'insertOrderedList', icon: FormatListNumberedIcon, label: 'لیست شماره‌دار' },
];

const RichTextEditor = ({
  value = '', onChange, placeholder = 'متن یادداشت…', theme, minHeight = 170,
  ariaLabel = 'متن یادداشت',
}) => {
  const editorRef = useRef(null);

  useEffect(() => {
    const node = editorRef.current;
    if (!node) return;
    if (node.innerHTML !== (value || '')) node.innerHTML = value || '';
  }, [value]);

  const emit = () => onChange(editorRef.current ? editorRef.current.innerHTML : '');

  const exec = (command, argument) => {
    const node = editorRef.current;
    if (!node) return;
    node.focus();
    document.execCommand(command, false, argument);
    emit();
  };

  const handlePaste = (event) => {
    event.preventDefault();
    const text = event.clipboardData?.getData('text/plain') || '';
    document.execCommand('insertText', false, text);
    emit();
  };

  return (
    <Box sx={{
      border: '1px solid', borderColor: theme?.tones?.border || 'divider',
      borderRadius: theme?.radii?.medium || '12px', overflow: 'hidden',
      bgcolor: 'background.paper',
    }}>
      <Stack
        direction="row"
        spacing={0.25}
        alignItems="center"
        useFlexGap
        flexWrap="wrap"
        sx={{
          px: 0.75, py: 0.5,
          borderBottom: '1px solid', borderColor: 'divider',
          bgcolor: alpha(theme?.tones?.neutral || '#64748b', 0.04),
        }}
      >
        {COMMANDS.map((item) => (
          <Tooltip key={item.command} title={item.label}>
            <IconButton
              size="small"
              aria-label={item.label}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => exec(item.command)}
              sx={{ p: 0.45 }}
            >
              <item.icon sx={{ fontSize: 17 }} />
            </IconButton>
          </Tooltip>
        ))}
        <Box sx={{ width: 1, height: 18, bgcolor: 'divider', mx: 0.5 }} />
        {notePalette(theme).map((color) => (
          <Tooltip key={color.key} title={`رنگ ${color.key}`}>
            <Box
              role="button"
              tabIndex={0}
              aria-label={`رنگ ${color.key}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => exec('foreColor', color.color)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') exec('foreColor', color.color);
              }}
              sx={{
                width: 17, height: 17, borderRadius: '50%', bgcolor: color.color,
                cursor: 'pointer', mx: 0.2,
                border: `1px solid ${alpha(color.color, 0.5)}`,
              }}
            />
          </Tooltip>
        ))}
        <Box sx={{ flex: 1 }} />
        <Tooltip title="حذف قالب‌بندی">
          <IconButton
            size="small"
            aria-label="حذف قالب‌بندی"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => exec('removeFormat')}
            sx={{ p: 0.45 }}
          >
            <FormatClearIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </Stack>

      <Box
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel}
        data-placeholder={placeholder}
        data-testid="planning-rich-text"
        onInput={emit}
        onBlur={emit}
        onPaste={handlePaste}
        sx={{
          minHeight, px: 1.25, py: 1, outline: 'none',
          fontSize: 11.5, lineHeight: 2, color: theme?.tones?.text || 'text.primary',
          '&:empty:before': {
            content: 'attr(data-placeholder)',
            color: theme?.tones?.muted || 'text.secondary',
          },
          '& p': { margin: 0 },
          '& ul, & ol': { margin: 0, paddingInlineStart: '22px' },
          '& blockquote': {
            margin: '4px 0', paddingInlineStart: 10,
            borderInlineStart: '3px solid', borderColor: 'divider',
            color: theme?.tones?.muted || 'text.secondary',
          },
          '& b, & strong': { fontWeight: 900 },
          '& a': { color: theme?.accent || 'primary.main' },
        }}
      />
    </Box>
  );
};

export default RichTextEditor;
