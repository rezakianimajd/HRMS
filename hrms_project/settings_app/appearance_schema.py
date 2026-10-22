"""Design-token schema and validation for the global appearance payload.

The frontend stores its effective design tokens under ``design`` (v2).  The
legacy flat ``typography`` and per-module ``palettes`` payloads remain
supported so existing clients and the current Appearance page keep working.

Only values that are safe to render are accepted; arbitrary CSS is never
persisted.
"""
from copy import deepcopy
import re


DESIGN_TOKEN_VERSION = 2
HEX_COLOR = re.compile(r'^#[0-9a-fA-F]{6}$')
BORDER = re.compile(r'^(none|[0-9]{1,2}px (?:solid|dashed) #[0-9a-fA-F]{6})$')
SHADOW_VALUE = re.compile(r'^[0-9a-zA-Z#.,()%\s-]{0,180}$')
FONT_FAMILIES = {'vazirmatn', 'iransans', 'tahoma', 'system'}
WEIGHT_OPTIONS = {300, 400, 500, 600, 700}
ROLE_KEYS = (
    'pageHeader', 'sectionTitle', 'cardTitle', 'cardSubtitle', 'cardValue',
    'tableHeader', 'tableCell', 'formLabel', 'input', 'body', 'button',
    'chip', 'navItem', 'caption', 'tooltip',
)
SURFACE_KEYS = ('page', 'appHeader', 'sidebar', 'pageHeader', 'card', 'table', 'dialog', 'drawer')
SHADOW_KEYS = ('none', 'soft', 'card', 'header', 'dropdown', 'dialog', 'drawer', 'focus')
COLOR_KEYS = (
    'primary', 'secondary', 'success', 'warning', 'danger', 'info',
    'background', 'surface', 'surfaceElevated', 'textPrimary',
    'textSecondary', 'border', 'divider', 'hover', 'selected',
)
SHAPE_KEYS = ('small', 'medium', 'large', 'pill')
SHAPE_RANGES = {'small': (0, 24), 'medium': (0, 32), 'large': (0, 40), 'pill': (0, 999)}
SPACING_KEYS = ('pagePadding', 'sectionGap', 'cardPadding', 'tableCellPadding')
DENSITY_KEYS = ('mode', 'tableRowHeight', 'inputHeight', 'buttonHeight')


DEFAULT_DESIGN = {
    'version': DESIGN_TOKEN_VERSION,
    'typography': {
        'family': 'vazirmatn',
        'roles': {
            'pageHeader': {'size': 20, 'weight': 500, 'lineHeight': 1.5},
            'sectionTitle': {'size': 16, 'weight': 500, 'lineHeight': 1.6},
            'cardTitle': {'size': 16, 'weight': 400, 'lineHeight': 1.6},
            'cardSubtitle': {'size': 12, 'weight': 400, 'lineHeight': 1.6},
            'cardValue': {'size': 14, 'weight': 500, 'lineHeight': 1.5},
            'tableHeader': {'size': 13, 'weight': 500, 'lineHeight': 1.5},
            'tableCell': {'size': 13, 'weight': 400, 'lineHeight': 1.6},
            'formLabel': {'size': 13, 'weight': 400, 'lineHeight': 1.5},
            'input': {'size': 13, 'weight': 400, 'lineHeight': 1.5},
            'body': {'size': 13, 'weight': 400, 'lineHeight': 1.8},
            'button': {'size': 13, 'weight': 500, 'lineHeight': 1.5},
            'chip': {'size': 12, 'weight': 400, 'lineHeight': 1.5},
            'navItem': {'size': 12.5, 'weight': 400, 'lineHeight': 1.6},
            'caption': {'size': 12, 'weight': 400, 'lineHeight': 1.6},
            'tooltip': {'size': 12, 'weight': 400, 'lineHeight': 1.5},
        },
    },
    'colors': {
        'primary': '#6366f1', 'secondary': '#ec4899', 'success': '#10b981',
        'warning': '#f59e0b', 'danger': '#ef4444', 'info': '#0ea5e9',
        'background': '#f8fafc', 'surface': '#ffffff', 'surfaceElevated': '#ffffff',
        'textPrimary': '#1e293b', 'textSecondary': '#64748b',
        'border': '#e8edf4', 'divider': '#eef2f7',
        'hover': '#f5f7fb', 'selected': '#eef2ff',
    },
    'surfaces': {
        'page': {'background': '#f8fafc', 'shadow': 'none'},
        'appHeader': {'background': '#ffffff', 'height': 64, 'border': '1px solid #e8edf4', 'shadow': 'soft'},
        'sidebar': {'background': '#ffffff', 'width': 336, 'border': '1px solid #e8edf4', 'shadow': 'none'},
        'pageHeader': {'background': '#ffffff', 'border': '1px solid #e8edf4', 'radius': 16, 'shadow': 'header'},
        'card': {'background': '#ffffff', 'border': '1px solid #e8edf4', 'radius': 16, 'shadow': 'none'},
        'table': {'background': '#ffffff', 'border': '1px solid #e8edf4', 'radius': 16, 'shadow': 'none', 'headerBackground': '#f8fafc'},
        'dialog': {'background': '#ffffff', 'border': 'none', 'radius': 18, 'shadow': 'dialog'},
        'drawer': {'background': '#ffffff', 'radius': 0, 'shadow': 'drawer'},
    },
    'shape': {'small': 8, 'medium': 10, 'large': 16, 'pill': 999},
    'spacing': {'pagePadding': 24, 'sectionGap': 14, 'cardPadding': 16, 'tableCellPadding': 8},
    'shadows': {
        'none': 'none',
        'soft': '0 2px 10px rgba(15,23,42,0.04)',
        'card': '0 4px 18px rgba(15,23,42,0.06)',
        'header': '0 4px 18px rgba(15,23,42,0.04)',
        'dropdown': '0 18px 45px rgba(15,23,42,0.16)',
        'dialog': '0 24px 80px rgba(15,23,42,0.18)',
        'drawer': '0 18px 45px rgba(15,23,42,0.12)',
        'focus': '0 0 0 3px rgba(99,102,241,0.12)',
    },
    'density': {'mode': 'comfortable', 'tableRowHeight': 38, 'inputHeight': 40, 'buttonHeight': 36},
    'components': {},
}


def _number(value, low, high, fallback, integer=False):
    try:
        number = int(value) if integer else float(value)
    except (TypeError, ValueError):
        return fallback
    if number < low or number > high:
        return fallback
    return number


def _color(value, fallback):
    return value.strip().lower() if isinstance(value, str) and HEX_COLOR.fullmatch(value.strip()) else fallback


def _apply_legacy_typography(design, typography):
    """Keep the old flat typography payload authoritative for its five roles."""
    if not isinstance(typography, dict):
        return design
    family = typography.get('family')
    if isinstance(family, str) and family in FONT_FAMILIES:
        design['typography']['family'] = family
    mapping = {
        'pageHeader': ('headerSize', 'headerWeight'),
        'cardTitle': ('cardSize', 'cardWeight'),
        'cardValue': ('statSize', 'statWeight'),
        'body': ('bodySize', 'bodyWeight'),
        'button': ('buttonSize', 'buttonWeight'),
    }
    for role, (size_key, weight_key) in mapping.items():
        target = design['typography']['roles'].setdefault(role, {})
        size = _number(typography.get(size_key), 10, 40, target.get('size', 13), integer=True)
        weight = _number(typography.get(weight_key), 300, 700, target.get('weight', 400), integer=True)
        target['size'] = size
        if weight in WEIGHT_OPTIONS:
            target['weight'] = weight
    return design


def typography_from_design(design):
    """Mirror the five legacy typography fields from the effective design tree."""
    roles = design['typography']['roles']
    mapping = {
        'pageHeader': ('headerSize', 'headerWeight'),
        'cardTitle': ('cardSize', 'cardWeight'),
        'cardValue': ('statSize', 'statWeight'),
        'body': ('bodySize', 'bodyWeight'),
        'button': ('buttonSize', 'buttonWeight'),
    }
    typography = {'family': design['typography']['family']}
    for role, (size_key, weight_key) in mapping.items():
        typography[size_key] = roles[role]['size']
        typography[weight_key] = roles[role]['weight']
    return typography


def sanitize_design(raw, typography=None):
    """Return a complete, safe design-token tree.

    Unknown keys are dropped, numeric values are clamped to the ranges used by
    the Theme Studio, and shadow/border values are restricted to safe strings.
    """
    base = deepcopy(DEFAULT_DESIGN)
    source = raw if isinstance(raw, dict) else {}

    base['version'] = DESIGN_TOKEN_VERSION

    raw_type = source.get('typography')
    if isinstance(raw_type, dict):
        family = raw_type.get('family')
        if isinstance(family, str) and family in FONT_FAMILIES:
            base['typography']['family'] = family
        raw_roles = raw_type.get('roles')
        if isinstance(raw_roles, dict):
            for role in ROLE_KEYS:
                item = raw_roles.get(role)
                if not isinstance(item, dict):
                    continue
                target = base['typography']['roles'][role]
                target['size'] = _number(item.get('size'), 10, 40, target['size'])
                weight = _number(item.get('weight'), 300, 700, target['weight'], integer=True)
                if weight in WEIGHT_OPTIONS:
                    target['weight'] = weight
                target['lineHeight'] = _number(item.get('lineHeight'), 0.8, 3, target['lineHeight'])

    raw_colors = source.get('colors')
    if isinstance(raw_colors, dict):
        for key in COLOR_KEYS:
            if key in raw_colors:
                base['colors'][key] = _color(raw_colors.get(key), base['colors'][key])

    raw_surfaces = source.get('surfaces')
    if isinstance(raw_surfaces, dict):
        for key in SURFACE_KEYS:
            item = raw_surfaces.get(key)
            if not isinstance(item, dict):
                continue
            target = base['surfaces'][key]
            for field in ('background', 'headerBackground'):
                if field in target and field in item:
                    target[field] = _color(item.get(field), target[field])
            if 'border' in item:
                border = item.get('border')
                target['border'] = border if isinstance(border, str) and BORDER.fullmatch(border.strip()) else target.get('border', 'none')
            if 'radius' in item:
                target['radius'] = _number(item.get('radius'), 0, 40, target.get('radius', 0))
            if 'height' in item:
                target['height'] = _number(item.get('height'), 32, 120, target.get('height', 64), integer=True)
            if 'width' in item:
                target['width'] = _number(item.get('width'), 180, 600, target.get('width', 336), integer=True)
            if 'shadow' in item:
                shadow = item.get('shadow')
                target['shadow'] = shadow if shadow in SHADOW_KEYS else target.get('shadow', 'none')

    raw_shape = source.get('shape')
    if isinstance(raw_shape, dict):
        for key in SHAPE_KEYS:
            if key in raw_shape:
                low, high = SHAPE_RANGES[key]
                base['shape'][key] = _number(raw_shape.get(key), low, high, base['shape'][key], integer=True)
    raw_spacing = source.get('spacing')
    if isinstance(raw_spacing, dict):
        for key in SPACING_KEYS:
            if key in raw_spacing:
                base['spacing'][key] = _number(raw_spacing.get(key), 0, 80, base['spacing'][key], integer=True)

    raw_density = source.get('density')
    if isinstance(raw_density, dict):
        if raw_density.get('mode') in {'compact', 'comfortable', 'spacious'}:
            base['density']['mode'] = raw_density['mode']
        for key, low, high in (('tableRowHeight', 24, 64), ('inputHeight', 28, 64), ('buttonHeight', 24, 64)):
            if key in raw_density:
                base['density'][key] = _number(raw_density.get(key), low, high, base['density'][key], integer=True)

    raw_shadows = source.get('shadows')
    if isinstance(raw_shadows, dict):
        for key in SHADOW_KEYS:
            value = raw_shadows.get(key)
            if isinstance(value, str) and SHADOW_VALUE.fullmatch(value.strip()):
                base['shadows'][key] = value.strip()

    return _apply_legacy_typography(base, typography)

