import React, { useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Chip, Stack, Avatar, IconButton, Tooltip, Button,
  Alert, TextField, MenuItem,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import PaletteIcon from '@mui/icons-material/Palette';
import ColorLensOutlinedIcon from '@mui/icons-material/ColorLensOutlined';
import FontDownloadOutlinedIcon from '@mui/icons-material/FontDownloadOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import CloseIcon from '@mui/icons-material/Close';
import { useThemeMode, THEME_MODES, NEON_COLOR_OPTIONS } from '../core/context/ThemeContext';
import { useApplication } from '../core/context/ApplicationContext';
import { useModulePalette, MODULE_DEFAULT_ACCENTS } from '../core/context/ModulePaletteContext';
import {
  DEFAULT_TYPOGRAPHY, FONT_OPTIONS, SIZE_RANGES, WEIGHT_OPTIONS, fontStack,
} from '../core/theme/appearanceDefaults';
import { PageHeader, SURFACE, SOFT } from '../core/components/settings/settingsUi';
import { formatPersianNumber } from '../core/utils/numberUtils';

/* =========================================================================
 * ظاهر و پوسته (2026)
 *  - انتخاب state visual (تم) با پیش‌نمایش زنده + توضیح
 *  - انتخاب رنگ نئون برای F مود
 *  - ذخیرهٔ خودکار (localStorage از ThemeContext)
 * ========================================================================= */

const MODE_DESC = {
  light: {
    title: 'روشن',
    desc: 'تم روشن و شفاف برای محیط کار روزانه؛ کمترین خستگی چشم و حداکثر خوانایی.',
    tagline: 'بهترین انتخاب برای استفاده در روز',
    swatch: ['#f8fafc', '#ffffff', '#6366f1', '#ec4899'],
  },
  dark: {
    title: 'تاریک',
    desc: 'تم تیره و آرام برای کار در شب و کاهش نور آبی؛ مناسب تمرکز در محیط کم‌نور.',
    tagline: 'مناسب کار در شب',
    swatch: ['#0f172a', '#1e293b', '#818cf8', '#f472b6'],
  },
  fmode: {
    title: 'F مود',
    desc: 'ظاهر سیاه‌وسفید با تایپوگرافی نئونی — ترکیب سبک ترمینال و مدرن برای علاقه‌مندان به رابط‌های سایبری.',
    tagline: 'سبک نئونی سایبری',
    swatch: ['#050505', '#0d0d0d', '#39ff14', '#00ffff'],
  },
  fmode_light: {
    title: 'F مود روشن',
    desc: 'نسخهٔ روشن F مود؛ پس‌زمینهٔ روشن با همان رنگ‌های نئونی — حس تازگی با وضوح بالا.',
    tagline: 'نئونی روی زمینه روشن',
    swatch: ['#f1fdf7', '#ffffff', '#00c853', '#00bfa5'],
  },
  kurosawa: {
    title: 'کوراساوا',
    desc: 'تم مونوکروم تک‌رنگ (سیاه/سفید/خاکستری) با الهام از سینمای آکیرا کوروساوا؛ برای زیبایی مینیمال و بی‌نقطهٔ حواس‌پرتی.',
    tagline: 'مینیمال و سینمایی',
    swatch: ['#f3f4f6', '#ffffff', '#111827', '#4b5563'],
  },
};

/* Live mini-preview mock of the final app for a theme */
const LivePreview = ({ mode, neonColor }) => {
  const isDark = ['dark', 'fmode'].includes(mode);
  const isF = mode === 'fmode';
  const kuro = mode === 'kurosawa';
  const fLight = mode === 'fmode_light';

  const bg = kuro ? '#e5e7eb' : fLight ? '#f1fdf7' : isF ? '#0a0a0a' : isDark ? '#0f172a' : '#f0f4ff';
  const panel = kuro ? '#ffffff' : fLight ? '#ffffff' : isF ? 'rgba(0,0,0,0.75)' : isDark ? 'rgba(30,41,59,0.8)' : 'rgba(255,255,255,0.85)';
  const accent = isF ? (neonColor || '#39ff14') : fLight ? '#00c853' : kuro ? '#111827' : isDark ? '#818cf8' : '#6366f1';
  const text = kuro ? '#111111' : isDark ? '#e2e8f0' : '#1e293b';

  return (
    <Box sx={{
      background: bg,
      p: 1.5,
      borderRadius: '10px',
      border: `1px solid ${accent}40`,
      transition: 'all 0.3s ease',
    }}>
      {/* fake sidebar + content */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Box sx={{
          width: 52, borderRadius: '10px', p: 1,
          background: panel,
          display: 'flex', flexDirection: 'column', gap: 0.8,
        }}>
          {[0, 1, 2].map(i => (
            <Box key={i} sx={{
              height: 8, borderRadius: '10px',
              background: i === 0 ? accent : 'rgba(128,128,128,0.25)',
            }} />
          ))}
        </Box>
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.8 }}>
          <Box sx={{
            height: 18, borderRadius: '10px', p: 0.5,
            background: panel,
            display: 'flex', justifyContent: 'space-between',
          }}>
            <Box sx={{ width: '55%', height: 10, borderRadius: '10px', background: accent }} />
            <Box sx={{ width: 22, height: 10, borderRadius: '10px', background: 'rgba(128,128,128,0.3)' }} />
          </Box>
          <Box sx={{ display: 'flex', gap: 0.8 }}>
            {[0, 1, 2].map(i => (
              <Box key={i} sx={{
                height: 40, flex: 1, borderRadius: '10px',
                background: panel,
                borderTop: `2px solid ${i === 0 ? accent : 'transparent'}`,
              }} />
            ))}
          </Box>
        </Box>
      </Box>
      <Typography variant="caption" sx={{ color: text, mt: 0.5, display: 'block', opacity: 0.7 }}>
        پیش‌نمایش تم {MODE_DESC[mode]?.title || '—'}
      </Typography>
    </Box>
  );
};

const ACCENT_PRESETS = [
  SOFT.indigo, SOFT.violet, SOFT.teal, SOFT.green,
  SOFT.amber, SOFT.orange, SOFT.pink, SOFT.blue, SOFT.slate,
];

const BG_PRESETS = [
  '#f8fafc', '#f0f4ff', '#f1fdf7', '#fdf2f8', '#fffbeb', '#f0fdfa', '#ffffff',
];

const BG_FALLBACK = '#f8fafc';

const ColorSwatch = ({ value, active, onClick, title }) => (
  <Tooltip title={title || value} arrow>
    <Box
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
      sx={{
        width: 18, height: 18, borderRadius: '50%', bgcolor: value, cursor: 'pointer',
        border: '2px solid', borderColor: active ? 'text.primary' : 'background.paper',
        boxShadow: '0 0 0 1px rgba(15,23,42,0.12)',
        transition: 'transform .15s ease',
        '&:hover': { transform: 'scale(1.12)' },
        '&:focus-visible': { outline: `2px solid ${alpha(value, 0.6)}`, outlineOffset: 1 },
      }}
    />
  </Tooltip>
);

const PaletteColorInput = ({ label, value, fallback, onChange, onClear }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
    <Tooltip title={`${label} — انتخاب رنگ سفارشی`} arrow>
      <Box
        component="label"
        sx={{
          position: 'relative', width: 24, height: 24, flexShrink: 0,
          borderRadius: '7px', border: '1px solid', borderColor: 'divider',
          overflow: 'hidden', cursor: 'pointer', bgcolor: value || '#ffffff',
        }}
      >
        <input
          type="color"
          value={value || fallback}
          onChange={(event) => onChange(event.target.value)}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            opacity: 0, cursor: 'pointer',
          }}
        />
        {!value && (
          <Box sx={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(135deg, transparent 42%, #cbd5e1 42%, #cbd5e1 58%, transparent 58%)',
          }} />
        )}
      </Box>
    </Tooltip>
    <Typography sx={{
      fontSize: 9, direction: 'ltr', minWidth: 52,
      color: value ? 'text.secondary' : 'text.disabled',
    }}>
      {value || 'پیش‌فرض'}
    </Typography>
    {value ? (
      <Tooltip title="حذف رنگ سفارشی" arrow>
        <IconButton size="small" onClick={onClear} sx={{ p: 0.2 }}>
          <CloseIcon sx={{ fontSize: 12 }} />
        </IconButton>
      </Tooltip>
    ) : null}
  </Box>
);

const ModulePaletteRow = ({ app }) => {
  const { getPalette, setPalette, resetPalette } = useModulePalette();
  const saved = getPalette(app.slug);
  const accent = saved?.accent || '';
  const background = saved?.background || '';
  const defaultAccent = MODULE_DEFAULT_ACCENTS[app.slug] || '#6366f1';
  const displayAccent = accent || defaultAccent;
  const customized = Boolean(saved?.hasCustom);

  return (
    <Box sx={{
      p: 1.25, borderRadius: '14px',
      border: '1px solid',
      borderColor: customized ? alpha(displayAccent, 0.28) : 'divider',
      bgcolor: customized ? alpha(displayAccent, 0.025) : 'transparent',
    }}>
      <Stack
        direction={{ xs: 'column', lg: 'row' }}
        spacing={1.25}
        alignItems={{ lg: 'center' }}
        useFlexGap
      >
        <Stack direction="row" spacing={0.9} alignItems="center" sx={{ minWidth: 150 }}>
          <Box sx={{
            width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
            bgcolor: displayAccent, boxShadow: `0 0 0 3px ${alpha(displayAccent, 0.15)}`,
          }} />
          <Typography variant="body2" sx={{ fontWeight: 400 }}>{app.title}</Typography>
          {customized && (
            <Chip size="small" label="سفارشی" sx={{
              height: 17, fontSize: 8.5, fontWeight: 800,
              bgcolor: alpha(displayAccent, 0.1), color: displayAccent,
            }} />
          )}
        </Stack>

        <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="caption" sx={{ fontWeight: 400, color: 'text.secondary', minWidth: 36 }}>تاکیدی</Typography>
          {ACCENT_PRESETS.map((color) => (
            <ColorSwatch
              key={color}
              value={color}
              active={accent === color}
              onClick={() => setPalette(app.slug, { accent: color })}
            />
          ))}
          <PaletteColorInput
            label="رنگ تاکیدی"
            value={accent}
            fallback={defaultAccent}
            onChange={(value) => setPalette(app.slug, { accent: value })}
            onClear={() => setPalette(app.slug, { accent: '' })}
          />
        </Stack>

        <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="caption" sx={{ fontWeight: 400, color: 'text.secondary', minWidth: 44 }}>پس‌زمینه</Typography>
          {BG_PRESETS.map((color) => (
            <ColorSwatch
              key={color}
              value={color}
              active={background === color}
              onClick={() => setPalette(app.slug, { background: color })}
            />
          ))}
          <PaletteColorInput
            label="پس‌زمینه"
            value={background}
            fallback={BG_FALLBACK}
            onChange={(value) => setPalette(app.slug, { background: value })}
            onClear={() => setPalette(app.slug, { background: '' })}
          />
        </Stack>

        <Box sx={{ flex: 1 }} />

        <Tooltip title="بازنشانی این ماژول" arrow>
          <span>
            <IconButton
              size="small"
              onClick={() => resetPalette(app.slug)}
              disabled={!saved}
              sx={{ color: 'text.secondary' }}
            >
              <RestartAltIcon sx={{ fontSize: 17 }} />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    </Box>
  );
};

const clampSize = (value, min, max) => Math.min(max, Math.max(min, Number(value) || min));

const TypeGroup = ({ label, sizeKey, weightKey, type, onChange, disabled }) => (
  <Box sx={{
    flex: 1, minWidth: 220, p: 1.25,
    border: '1px solid', borderColor: 'divider', borderRadius: '12px',
  }}>
    <Typography variant="body2" sx={{ mb: 1 }}>{label}</Typography>
    <Stack direction="row" spacing={1} useFlexGap>
      <TextField
        size="small"
        type="number"
        label="اندازه (px)"
        value={type[sizeKey]}
        disabled={disabled}
        inputProps={{ min: SIZE_RANGES[sizeKey].min, max: SIZE_RANGES[sizeKey].max }}
        onChange={(event) => onChange({
          [sizeKey]: clampSize(
            event.target.value,
            SIZE_RANGES[sizeKey].min,
            SIZE_RANGES[sizeKey].max,
          ),
        })}
        sx={{ width: 122 }}
      />
      <TextField
        select
        size="small"
        label="وزن"
        value={type[weightKey]}
        disabled={disabled}
        onChange={(event) => onChange({ [weightKey]: Number(event.target.value) })}
        sx={{ width: 106 }}
      >
        {WEIGHT_OPTIONS.map((weight) => (
          <MenuItem key={weight} value={weight}>{weight}</MenuItem>
        ))}
      </TextField>
    </Stack>
  </Box>
);

const TypographyCard = ({
  canEdit, type, onChange, onReset, saving, savedTick,
}) => (
  <Paper sx={{ ...SURFACE, mt: 1.75, overflow: 'hidden' }}>
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap',
      px: 1.75, py: 1.25,
      borderBottom: '1px solid', borderColor: 'divider',
    }}>
      <Avatar variant="rounded" sx={{
        width: 30, height: 30, borderRadius: '9px',
        bgcolor: `${SOFT.blue}24`, color: SOFT.blue,
      }}>
        <FontDownloadOutlinedIcon sx={{ fontSize: 17 }} />
      </Avatar>
      <Typography variant="h6">فونت و اندازه‌ها</Typography>
      <Chip
        size="small"
        label={canEdit ? (saving ? 'در حال ذخیره…' : savedTick ? 'ذخیره شد' : 'ذخیره خودکار') : 'فقط مدیر ارشد'}
        sx={{
          height: 20, fontSize: 10, fontWeight: 500,
          bgcolor: canEdit ? `${SOFT.green}1f` : 'action.hover',
          color: canEdit ? SOFT.green : 'text.secondary',
        }}
      />
    </Box>

    <Box sx={{ p: 1.75 }}>
      {!canEdit && (
        <Alert severity="info" sx={{ mb: 1.5, '& .MuiAlert-message': { fontSize: 13, fontWeight: 400 } }}>
          تغییر فونت و اندازه‌ها فقط توسط مدیر ارشد سیستم امکان‌پذیر است؛
          تنظیمات فعلی برای همهٔ کاربران اعمال می‌شود.
        </Alert>
      )}

      <Box sx={{
        pointerEvents: canEdit ? 'auto' : 'none',
        opacity: canEdit ? 1 : 0.65,
      }}>
        <Stack direction="row" spacing={1.25} flexWrap="wrap" useFlexGap>
          <TextField
            select
            size="small"
            label="خانوادهٔ فونت"
            value={type.family}
            onChange={(event) => onChange({ family: event.target.value })}
            sx={{ minWidth: 240 }}
          >
            {FONT_OPTIONS.map((option) => (
              <MenuItem key={option.key} value={option.key}>{option.label}</MenuItem>
            ))}
          </TextField>
          <TypeGroup
            label="هدر صفحه"
            sizeKey="headerSize"
            weightKey="headerWeight"
            type={type}
            onChange={onChange}
            disabled={!canEdit}
          />
          <TypeGroup
            label="عنوان کارت"
            sizeKey="cardSize"
            weightKey="cardWeight"
            type={type}
            onChange={onChange}
            disabled={!canEdit}
          />
          <TypeGroup
            label="متن و فیلدها"
            sizeKey="bodySize"
            weightKey="bodyWeight"
            type={type}
            onChange={onChange}
            disabled={!canEdit}
          />
        </Stack>

        <Box sx={{
          mt: 1.5, p: 1.25, borderRadius: '12px',
          border: '1px solid', borderColor: 'divider',
          bgcolor: 'action.hover',
          fontFamily: fontStack(type.family),
        }}>
          <Typography sx={{
            fontSize: `${type.headerSize}px`,
            fontWeight: type.headerWeight,
            lineHeight: 1.5,
          }}>
            پیش‌نمایش هدر صفحه
          </Typography>
          <Typography sx={{
            fontSize: `${type.cardSize}px`,
            fontWeight: type.cardWeight,
            lineHeight: 1.6, mt: 0.5,
          }}>
            پیش‌نمایش عنوان کارت
          </Typography>
          <Typography sx={{
            fontSize: `${type.bodySize}px`,
            fontWeight: type.bodyWeight,
            lineHeight: 1.8, mt: 0.5, color: 'text.secondary',
          }}>
            این یک متن نمونه برای بررسی اندازه و وزن فونت متن، فیلدها و کشویی‌ها است.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1.25 }}>
          <Button
            size="small"
            onClick={onReset}
            disabled={!canEdit}
            sx={{ fontSize: 13, fontWeight: 400 }}
          >
            بازنشانی فونت به پیش‌فرض
          </Button>
        </Box>
      </Box>
    </Box>
  </Paper>
);

const AppearancePage = () => {
  const { mode, setMode, neonColor, setNeonColor } = useThemeMode();
  const { applications, loadApplications } = useApplication();
  const {
    canEdit, typography, setTypography, resetTypography, resetPalettes,
    saving, savedTick, error,
  } = useModulePalette();

  useEffect(() => {
    if (!applications.length) loadApplications();
  }, []);

  const moduleApps = applications.filter((app) => app.accessible && !app.is_coming_soon);

  return (
    <Box>
      <PageHeader
        icon={<PaletteIcon />}
        title="ظاهر و پوسته"
        color={SOFT.violet}
        badge={(
          <Chip
            size="small" variant="outlined"
            label={MODE_DESC[mode]?.title || ''}
            sx={{ fontWeight: 800 }}
          />
        )}
      />

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 1.75, '& .MuiAlert-message': { fontSize: 13, fontWeight: 400 } }}
        >
          {error}
        </Alert>
      )}

      {/* پوسته‌ها در یک کارت */}
      <Paper sx={{ ...SURFACE, overflow: 'hidden' }}>
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap',
          px: 1.75, py: 1.25,
          borderBottom: '1px solid', borderColor: 'divider',
          background: `linear-gradient(135deg, ${SOFT.violet}14, transparent)`,
        }}>
          <Avatar variant="rounded" sx={{
            width: 30, height: 30, borderRadius: '9px',
            bgcolor: `${SOFT.violet}24`, color: SOFT.violet,
          }}>
            <PaletteIcon sx={{ fontSize: 17 }} />
          </Avatar>
          <Typography variant="h6">پوسته‌ها</Typography>
          <Chip
            size="small"
            label={`${formatPersianNumber(THEME_MODES.length)} پوسته`}
            sx={{
              height: 20, fontSize: 10, fontWeight: 800,
              bgcolor: `${SOFT.violet}1f`, color: SOFT.violet,
            }}
          />
        </Box>

        <Box sx={{ p: 1.75 }}>
          <Grid container spacing={2}>
        {THEME_MODES.map(m => {
          const active = mode === m.key;
          return (
            <Grid item xs={12} sm={6} md={4} key={m.key}>
              <Paper
                onClick={() => setMode(m.key)}
                sx={{
                  p: 1.5, cursor: 'pointer', borderRadius: '14px', height: '100%',
                  border: '1px solid',
                  borderColor: active ? `${m.color}80` : 'divider',
                  bgcolor: active ? `${m.color}0d` : 'background.paper',
                  boxShadow: '0 4px 18px rgba(15,23,42,0.04)',
                  transition: 'all .2s ease',
                }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Box sx={{ fontSize: 26 }}>{m.icon}</Box>
                  <Typography variant="h6">{m.label}</Typography>
                  {active && <CheckCircleIcon sx={{ color: m.color, ml: 'auto', fontSize: 19 }} />}
                </Box>

                <LivePreview mode={m.key} neonColor={neonColor} />

                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                  {MODE_DESC[m.key]?.desc || ''}
                </Typography>
                <Chip size="small" label={MODE_DESC[m.key]?.tagline || ''} variant="outlined" sx={{ mt: 0.8, height: 20, fontSize: 9.5 }} />
                <Stack direction="row" spacing={0.5} sx={{ mt: 1 }} useFlexGap>
                  {(MODE_DESC[m.key]?.swatch || []).map((c, idx) => (
                    <Box key={idx} sx={{ width: 16, height: 16, borderRadius: '50%', background: c, border: '1px solid rgba(0,0,0,0.12)' }} />
                  ))}
                </Stack>
              </Paper>
            </Grid>
          );
        })}
          </Grid>
        </Box>
      </Paper>

      {/* پالت‌های رنگی هر ماژول */}
      <Paper sx={{ ...SURFACE, mt: 1.75, overflow: 'hidden' }}>
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap',
          px: 1.75, py: 1.25,
          borderBottom: '1px solid', borderColor: 'divider',
        }}>
          <Avatar variant="rounded" sx={{
            width: 30, height: 30, borderRadius: '9px',
            bgcolor: `${SOFT.teal}24`, color: SOFT.teal,
          }}>
            <ColorLensOutlinedIcon sx={{ fontSize: 17 }} />
          </Avatar>
          <Typography variant="h6">پالت‌های رنگی</Typography>
          <Chip
            size="small"
            label={`${formatPersianNumber(moduleApps.length)} ماژول`}
            sx={{ height: 20, fontSize: 10, fontWeight: 800, bgcolor: `${SOFT.teal}1f`, color: SOFT.teal }}
          />
          <Chip
            size="small"
            variant="outlined"
            label={canEdit ? 'ذخیره خودکار' : 'فقط مدیر ارشد'}
            sx={{
              height: 20, fontSize: 10, fontWeight: 500, ml: 'auto',
              color: canEdit ? 'text.secondary' : 'warning.main',
            }}
          />
        </Box>

        <Box sx={{ p: 1.75 }}>
          {!canEdit && (
            <Alert severity="info" sx={{ mb: 1.5, '& .MuiAlert-message': { fontSize: 13, fontWeight: 400 } }}>
              تغییر پالت‌های رنگی فقط توسط مدیر ارشد سیستم امکان‌پذیر است؛
              ترکیب فعلی برای همهٔ کاربران اعمال می‌شود.
            </Alert>
          )}

          <Box sx={{
            pointerEvents: canEdit ? 'auto' : 'none',
            opacity: canEdit ? 1 : 0.65,
          }}>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5, lineHeight: 1.9 }}>
              برای هر ماژول رنگ تاکیدی و رنگ پس‌زمینه انتخاب کنید. رنگ تاکیدی روی دکمه‌های اصلی،
              منوی فعال و کادر سوئیچر ماژول اعمال می‌شود؛ دکمه‌های حذف، هشدار و خطا رنگ استاندارد
              خود را حفظ می‌کنند. رنگ پس‌زمینه در تم‌های روشن اعمال می‌شود.
            </Typography>

            {moduleApps.length === 0 ? (
              <Typography sx={{ fontSize: 11, color: 'text.disabled', py: 2, textAlign: 'center' }}>
                ماژولی برای تنظیم یافت نشد.
              </Typography>
            ) : (
              <Stack spacing={1} useFlexGap>
                {moduleApps.map((app) => (
                  <ModulePaletteRow key={app.id} app={app} />
                ))}
              </Stack>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1.25 }}>
              <Button
                size="small"
                onClick={resetPalettes}
                disabled={!canEdit}
                sx={{ fontSize: 13, fontWeight: 400 }}
              >
                بازنشانی همهٔ پالت‌ها
              </Button>
            </Box>
          </Box>
        </Box>
      </Paper>

      <TypographyCard
        canEdit={canEdit}
        type={{ ...DEFAULT_TYPOGRAPHY, ...(typography || {}) }}
        onChange={setTypography}
        onReset={resetTypography}
        saving={saving}
        savedTick={savedTick}
      />

      {/* رنگ نئون — فقط برای F مود تاریک، داخل کارت */}
      {mode === 'fmode' && (
        <Paper sx={{ ...SURFACE, mt: 1.75, overflow: 'hidden' }}>
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap',
            px: 1.75, py: 1.25,
            borderBottom: '1px solid', borderColor: 'divider',
            background: `linear-gradient(135deg, ${SOFT.violet}14, transparent)`,
          }}>
            <Avatar variant="rounded" sx={{
              width: 30, height: 30, borderRadius: '9px',
              bgcolor: `${SOFT.violet}24`, color: SOFT.violet,
            }}>
              <PaletteIcon sx={{ fontSize: 17 }} />
            </Avatar>
            <Typography variant="h6">رنگ نئون</Typography>
            <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box sx={{
                width: 14, height: 14, borderRadius: '50%',
                background: neonColor, boxShadow: `0 0 8px ${neonColor}`,
              }} />
              <Typography sx={{ fontSize: 10.5, color: 'text.secondary', direction: 'ltr' }}>
                {neonColor}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ p: 1.75 }}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {NEON_COLOR_OPTIONS.map(c => (
                <Chip
                  key={c.key}
                  label={c.label}
                  onClick={() => setNeonColor(c.color)}
                  sx={{
                    fontWeight: 700,
                    cursor: 'pointer',
                    bgcolor: neonColor === c.color ? c.color : 'transparent',
                    color: neonColor === c.color ? '#000' : 'inherit',
                    border: `1px solid ${c.color}`,
                    '&:hover': { background: `${c.color}22` },
                  }}
                />
              ))}
            </Stack>
          </Box>
        </Paper>
      )}

    </Box>
  );
};

export default AppearancePage;