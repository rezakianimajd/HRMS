"""Pure-Python SVG chart generator for the HR assistant (no external deps)."""

FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹'


def fa_num(n):
    return ''.join(FA_DIGITS[int(c)] if c.isdigit() else c for c in str(n))


def _escape(s):
    a = '&'
    lt = '<'
    gt = '>'
    q = '"'
    return (str(s or '')
            .replace('&', a + 'amp;')
            .replace('<', '&' + 'lt;')
            .replace('>', '&' + 'gt;')
            .replace('"', '&' + 'quot;'))


def horizontal_bar(title, labels, values, color='#6366f1', value_suffix=''):
    """Horizontal bars with RTL Persian labels and values."""
    n = len(labels)
    if n == 0:
        values = [0]
        labels = ['بدون داده']
        n = 1
    max_v = max(values) or 1

    row_h = 44
    title_h = 54
    label_w = 210
    bar_area_x = 220
    bar_area_w = 460
    value_w = 90
    width = label_w + bar_area_w + value_w + 40
    height = title_h + n * row_h + 20

    parts = []
    parts.append(f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
                 f'viewBox="0 0 {width} {height}" font-family="Vazirmatn, Tahoma, sans-serif" dir="rtl">')
    parts.append(f'<rect width="100%" height="100%" fill="#ffffff"/>')
    parts.append(f'<text x="{width//2}" y="34" text-anchor="middle" font-size="20" font-weight="bold" fill="#1e293b">{_escape(title)}</text>')

    for i, (label, val) in enumerate(zip(labels, values)):
        y = title_h + i * row_h
        bar_w = max(0, (val / max_v) * bar_area_w)
        fill = color
        # label
        parts.append(f'<text x="{label_w - 12}" y="{y + 26}" text-anchor="end" font-size="14" fill="#334155">{_escape(label)}</text>')
        # bar
        parts.append(f'<rect x="{bar_area_x + (bar_area_w - bar_w)}" y="{y + 8}" width="{bar_w:.1f}" height="24" rx="6" fill="{fill}"/>')
        # value
        parts.append(f'<text x="{bar_area_x + bar_area_w + 12}" y="{y + 26}" font-size="14" font-weight="bold" fill="#1e293b">{fa_num(val)}{value_suffix}</text>')

    parts.append('</svg>')
    return ''.join(parts)


def donut(title, labels, values, colors):
    """Simple donut chart."""
    n = len(labels)
    if n == 0:
        labels = ['بدون داده']
        values = [1]
        colors = ['#cbd5e1']
        n = 1
    total = sum(values) or 1

    cx, cy, r, inner = 180, 150, 110, 60
    width, height = 560, 340

    parts = []
    parts.append(f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
                 f'viewBox="0 0 {width} {height}" font-family="Vazirmatn, Tahoma, sans-serif" dir="rtl">')
    parts.append('<rect width="100%" height="100%" fill="#ffffff"/>')
    parts.append(f'<text x="{width//2}" y="34" text-anchor="middle" font-size="20" font-weight="bold" fill="#1e293b">{_escape(title)}</text>')

    angle = -90.0
    for label, val, color in zip(labels, values, colors):
        sweep = (val / total) * 360.0
        a1 = angle
        a2 = angle + sweep
        parts.append(_arc_path(cx, cy, r, inner, a1, a2, color))
        angle += sweep

    # legend
    lx = 360
    ly = 70
    for label, val, color in zip(labels, values, colors):
        pct = round(val / total * 100, 1)
        parts.append(f'<rect x="{lx}" y="{ly}" width="16" height="16" rx="4" fill="{color}"/>')
        parts.append(f'<text x="{lx + 24}" y="{ly + 13}" font-size="13" fill="#334155">{_escape(label)} — {fa_num(pct)}٪</text>')
        ly += 26

    parts.append('</svg>')
    return ''.join(parts)


def _arc_path(cx, cy, r, inner, a1, a2, color):
    import math
    def pt(angle, radius):
        rad = math.radians(angle)
        return (cx + radius * math.cos(rad), cy + radius * math.sin(rad))

    # outer arc
    x1, y1 = pt(a1, r)
    x2, y2 = pt(a2, r)
    x3, y3 = pt(a2, inner)
    x4, y4 = pt(a1, inner)
    large = 1 if (a2 - a1) > 180 else 0
    d = (f'M {x1:.2f} {y1:.2f} '
         f'A {r} {r} 0 {large} 1 {x2:.2f} {y2:.2f} '
         f'L {x3:.2f} {y3:.2f} '
         f'A {inner} {inner} 0 {large} 0 {x4:.2f} {y4:.2f} Z')
    return f'<path d="{d}" fill="{color}" stroke="#ffffff" stroke-width="1.5"/>'