import {
  DEFAULT_DESIGN_TOKENS,
  colorWithAlpha,
  designCssVariables,
  legacyTypographyFromDesign,
  normalizeDesignTokens,
  resolveDesignTokens,
} from '../core/theme/designTokens';

describe('design tokens', () => {
  it('merges saved tokens with defaults without mutating the defaults', () => {
    const merged = normalizeDesignTokens({ colors: { primary: '#123456' }, shape: { large: 20 } });
    expect(merged.colors.primary).toBe('#123456');
    expect(merged.shape.large).toBe(20);
    expect(merged.shape.medium).toBe(DEFAULT_DESIGN_TOKENS.shape.medium);
    expect(DEFAULT_DESIGN_TOKENS.colors.primary).toBe('#6366f1');
  });

  it('maps legacy typography controls onto v2 roles', () => {
    const design = resolveDesignTokens({
      typography: { headerSize: 26, cardSize: 18, bodySize: 14, buttonSize: 15, statSize: 20 },
    });
    expect(design.typography.roles.pageHeader.size).toBe(26);
    expect(design.typography.roles.cardTitle.size).toBe(18);
    expect(design.typography.roles.body.size).toBe(14);
    expect(design.typography.roles.button.size).toBe(15);
    expect(design.typography.roles.cardValue.size).toBe(20);
  });

  it('keeps v2 role values when no legacy typography payload is supplied', () => {
    const design = resolveDesignTokens({
      design: { typography: { roles: { pageHeader: { size: 30, weight: 600 } } } },
    });
    expect(design.typography.roles.pageHeader.size).toBe(30);
    expect(design.typography.roles.pageHeader.weight).toBe(600);
  });

  it('uses the selected neon color in F-mode and ignores module accents in fixed mono themes', () => {
    const fmode = resolveDesignTokens({
      mode: 'fmode', neonColor: '#ff00ff', modulePalette: { accent: '#123456' },
    });
    expect(fmode.colors.primary).toBe('#ff00ff');

    const kurosawa = resolveDesignTokens({
      mode: 'kurosawa', modulePalette: { accent: '#123456' },
    });
    expect(kurosawa.colors.primary).toBe('#111827');
  });

  it('keeps per-module accent and background overrides for light modes', () => {
    const design = resolveDesignTokens({
      modulePalette: { accent: '#ff5500', background: '#fafafa' },
      mode: 'light',
    });
    expect(design.colors.primary).toBe('#ff5500');
    expect(design.colors.background).toBe('#fafafa');
    expect(design.surfaces.page.background).toBe('#fafafa');

    const dark = resolveDesignTokens({ modulePalette: { accent: '#ff5500', background: '#000000' }, mode: 'dark' });
    expect(dark.colors.primary).toBe('#ff5500');
    expect(dark.colors.background).not.toBe('#000000');
  });

  it('uses dark-mode surface tokens while preserving saved shape tokens', () => {
    const design = resolveDesignTokens({
      design: { shape: { large: 22 } },
      mode: 'dark',
    });
    expect(design.colors.background).toBe('#0f172a');
    expect(design.shape.large).toBe(22);
  });

  it('exposes CSS variables and legacy typography values', () => {
    const design = resolveDesignTokens({});
    const variables = designCssVariables(design);
    expect(variables['--hrms-font-table-cell-size']).toBe('13px');
    expect(variables['--hrms-region-card-bg']).toBe('#ffffff');
    expect(variables['--hrms-radius-large']).toBe('16px');
    expect(variables['--hrms-info-card-bg']).toBe('#ffffff');
    expect(variables['--hrms-header-surface-bg']).toBe('#ffffff');
    expect(variables['--hrms-table-surface-bg']).toBe('#ffffff');
    expect(legacyTypographyFromDesign(design).bodySize).toBe(13);
  });

  it('supports card/header/table/list settings and glass colors', () => {
    const design = resolveDesignTokens({
      design: {
        infoCards: { variant: 'detailed', surface: 'glass', glassOpacity: 0.4, glassBlur: 20 },
        headers: { variant: 'centered', showSubtitle: false, subtitlePosition: 'inline' },
        tables: { striped: true, headerStyle: 'plain', rowHeight: 44 },
        lists: { variant: 'compact', showDivider: false },
      },
    });
    const variables = designCssVariables(design);
    expect(design.infoCards.variant).toBe('detailed');
    expect(design.headers.variant).toBe('centered');
    expect(design.tables.striped).toBe(true);
    expect(design.lists.showDivider).toBe(false);
    expect(variables['--hrms-info-card-backdrop']).toContain('blur(20px)');
    expect(variables['--hrms-table-header-bg']).toBe('transparent');
    expect(variables['--hrms-table-row-height']).toBe('44px');
    expect(colorWithAlpha('#6366f1', 0.5)).toBe('rgba(99,102,241,0.5)');
  });
});
