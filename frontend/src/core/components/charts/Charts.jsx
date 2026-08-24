import React from 'react';
import { Box, Typography } from '@mui/material';
import { toPersianDigits } from '../../utils/numberUtils';

/* =============================================================================
 * Donut / Pie Chart (pure SVG - no dependencies)
 * ============================================================================= */
export const DonutChart = ({ data, size = 160, thickness = 28, centerLabel }) => {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
      <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#eef2f7" strokeWidth={thickness} />
          {data.map((d, i) => {
            const dash = (d.value / total) * circumference;
            const el = (
              <circle
                key={i}
                cx={size / 2} cy={size / 2} r={radius}
                fill="none" stroke={d.color} strokeWidth={thickness}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                strokeLinecap="round"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                style={{ transition: 'stroke-dasharray 0.6s ease' }}
              />
            );
            offset += dash;
            return el;
          })}
        </svg>
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="h5" fontWeight={800}>{toPersianDigits(total)}</Typography>
          <Typography variant="caption" color="textSecondary">{centerLabel || 'مجموع'}</Typography>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, flex: 1, minWidth: 140 }}>
        {data.map((d, i) => (
          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: d.color, flexShrink: 0 }} />
            <Typography variant="body2" sx={{ flex: 1 }}>{d.label}</Typography>
            <Typography variant="body2" fontWeight={600}>{toPersianDigits(d.value)}</Typography>
            <Typography variant="caption" color="textSecondary" sx={{ width: 40, textAlign: 'left' }}>
              {toPersianDigits(Math.round((d.value / total) * 100))}٪
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

/* =============================================================================
 * Horizontal Bar Chart (pure SVG)
 * ============================================================================= */
export const BarChart = ({ data, color = '#6366f1', height = 220, showValues = true }) => {
  const max = Math.max(...data.map(d => d.value), 1);

  return (
    <Box>
      {data.map((d, i) => (
        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography variant="body2" sx={{ width: 120, flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {d.label}
          </Typography>
          <Box sx={{ flex: 1, height: 20, bgcolor: '#eef2f7', borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{
              width: `${(d.value / max) * 100}%`,
              height: '100%',
              background: d.color || `linear-gradient(90deg, ${color}, ${color}90)`,
              borderRadius: 2,
              transition: 'width 0.6s ease',
            }} />
          </Box>
          {showValues && (
            <Typography variant="body2" fontWeight={600} sx={{ width: 32, textAlign: 'left' }}>
              {toPersianDigits(d.value)}
            </Typography>
          )}
        </Box>
      ))}
    </Box>
  );
};

/* =============================================================================
 * Vertical Bar Chart (pure SVG)
 * ============================================================================= */
export const ColumnChart = ({ data, color = '#10b981', height = 200 }) => {
  const max = Math.max(...data.map(d => d.value), 1);

  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 2, height, pt: 2 }}>
      {data.map((d, i) => (
        <Box key={i} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
          <Typography variant="caption" fontWeight={600} sx={{ mb: 0.5 }}>{toPersianDigits(d.value)}</Typography>
          <Box sx={{
            width: '70%',
            height: `${(d.value / max) * 80}%`,
            minHeight: 8,
            background: d.color || `linear-gradient(180deg, ${color}, ${color}70)`,
            borderRadius: '6px 6px 0 0',
            transition: 'height 0.6s ease',
          }} />
          <Typography variant="caption" sx={{ mt: 0.5, fontSize: 10, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
            {d.label}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

/* =============================================================================
 * Line Chart (pure SVG)
 * ============================================================================= */
export const LineChart = ({ data, color = '#3b82f6', height = 200, labels }) => {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((v - min) / range) * 90 - 5;
    return `${x},${y}`;
  }).join(' ');

  return (
    <Box>
      <Box sx={{ height, position: 'relative', bgcolor: 'rgba(0,0,0,0.01)', borderRadius: 2, px: 1 }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((y) => (
            <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#eef2f7" strokeWidth="0.5" />
          ))}
          {/* Area fill */}
          <polygon points={`0,100 ${points} 100,100`} fill={`${color}20`} />
          {/* Line */}
          <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {/* Dots */}
          {data.map((v, i) => {
            const x = (i / (data.length - 1)) * 100;
            const y = 100 - ((v - min) / range) * 90 - 5;
            return <circle key={i} cx={x} cy={y} r="2.5" fill={color} stroke="#fff" strokeWidth="0.8" />;
          })}
        </svg>
      </Box>
      {labels && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
          {labels.map((l, i) => (
            <Typography key={i} variant="caption" fontSize={10}>{l}</Typography>
          ))}
        </Box>
      )}
    </Box>
  );
};