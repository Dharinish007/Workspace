import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  ALL_THEME_STYLES,
  THEME_DEFINITIONS,
  decomposeThemeId,
  composeThemeId,
  getOppositeModeThemeId,
} from '../src/types/theme.ts';

test('Three Core Dashboard Themes Architecture & Specifications', async (t) => {
  const cssPath = resolve('src/index.css');
  const tailwindPath = resolve('tailwind.config.js');
  const themeArtPath = resolve('src/components/common/ThemeArt.tsx');
  const settingsPath = resolve('src/components/settings/SettingsContent.tsx');
  const contextPath = resolve('src/context/WorkspaceContext.tsx');
  const indexPath = resolve('index.html');

  assert.ok(existsSync(cssPath), 'src/index.css must exist');
  assert.ok(existsSync(tailwindPath), 'tailwind.config.js must exist');
  assert.ok(existsSync(themeArtPath), 'ThemeArt.tsx must exist');
  assert.ok(existsSync(settingsPath), 'SettingsContent.tsx must exist');
  assert.ok(existsSync(contextPath), 'WorkspaceContext.tsx must exist');
  assert.ok(existsSync(indexPath), 'index.html must exist');

  const cssContent = readFileSync(cssPath, 'utf-8');
  const tailwindContent = readFileSync(tailwindPath, 'utf-8');
  const themeArtContent = readFileSync(themeArtPath, 'utf-8');
  const settingsContent = readFileSync(settingsPath, 'utf-8');
  const contextContent = readFileSync(contextPath, 'utf-8');
  const indexContent = readFileSync(indexPath, 'utf-8');

  await t.test('1. Exact 3 core aesthetic themes are defined with complete metadata and swatches', () => {
    const expectedStyles = ['minimal', 'paper', 'notion'];

    assert.deepEqual(
      [...ALL_THEME_STYLES].sort(),
      [...expectedStyles].sort(),
      'ALL_THEME_STYLES must contain exactly minimal, paper, notion'
    );

    for (const style of expectedStyles) {
      const def = THEME_DEFINITIONS[style];
      assert.ok(def, `Theme definition for ${style} must exist`);
      assert.equal(def.id, style);
      assert.ok(def.name, `Theme ${style} must have a name`);
      assert.ok(def.label, `Theme ${style} must have a label`);
      assert.ok(def.badge, `Theme ${style} must have a badge`);
      assert.ok(def.description, `Theme ${style} must have a description`);

      // Swatches for both light and dark modes
      assert.ok(def.swatches, `Theme ${style} must have swatches`);
      assert.ok(def.swatches.light, `Theme ${style} must have light swatches`);
      assert.ok(def.swatches.dark, `Theme ${style} must have dark swatches`);

      for (const mode of ['light', 'dark']) {
        const sw = def.swatches[mode];
        assert.ok(sw.bg, `Theme ${style} [${mode}] swatch must have bg`);
        assert.ok(sw.card, `Theme ${style} [${mode}] swatch must have card`);
        assert.ok(sw.primary, `Theme ${style} [${mode}] swatch must have primary`);
        assert.ok(sw.accent, `Theme ${style} [${mode}] swatch must have accent`);
        assert.ok(sw.border, `Theme ${style} [${mode}] swatch must have border`);
        assert.ok(sw.text, `Theme ${style} [${mode}] swatch must have text`);
        assert.ok(sw.muted, `Theme ${style} [${mode}] swatch must have muted`);
      }
    }
  });

  await t.test('2. Theme composition, decomposition, and fallback helpers work correctly', () => {
    // Decomposition
    assert.deepEqual(decomposeThemeId('minimal-light'), { style: 'minimal', mode: 'light' });
    assert.deepEqual(decomposeThemeId('minimal-dark'), { style: 'minimal', mode: 'dark' });
    assert.deepEqual(decomposeThemeId('paper-light'), { style: 'paper', mode: 'light' });
    assert.deepEqual(decomposeThemeId('paper-dark'), { style: 'paper', mode: 'dark' });
    assert.deepEqual(decomposeThemeId('notion-light'), { style: 'notion', mode: 'light' });
    assert.deepEqual(decomposeThemeId('notion-dark'), { style: 'notion', mode: 'dark' });

    // Composition
    assert.equal(composeThemeId('minimal', 'light'), 'minimal-light');
    assert.equal(composeThemeId('minimal', 'dark'), 'minimal-dark');
    assert.equal(composeThemeId('paper', 'light'), 'paper-light');
    assert.equal(composeThemeId('paper', 'dark'), 'paper-dark');
    assert.equal(composeThemeId('notion', 'light'), 'notion-light');
    assert.equal(composeThemeId('notion', 'dark'), 'notion-dark');
    assert.equal(composeThemeId('current', 'light'), 'minimal-light');

    // Opposite mode toggle
    assert.equal(getOppositeModeThemeId('minimal-light'), 'minimal-dark');
    assert.equal(getOppositeModeThemeId('minimal-dark'), 'minimal-light');
    assert.equal(getOppositeModeThemeId('paper-light'), 'paper-dark');
    assert.equal(getOppositeModeThemeId('paper-dark'), 'paper-light');
    assert.equal(getOppositeModeThemeId('notion-light'), 'notion-dark');
    assert.equal(getOppositeModeThemeId('notion-dark'), 'notion-light');

    // Proxy fallback for composite theme IDs
    assert.equal(THEME_DEFINITIONS['minimal-light']?.id, 'minimal');
    assert.equal(THEME_DEFINITIONS['paper-dark']?.id, 'paper');
    assert.equal(THEME_DEFINITIONS['notion-light']?.id, 'notion');
  });

  await t.test('3. CSS design tokens and aesthetic specifications in index.css', () => {
    // Selectors for 3 themes in light & dark modes
    const requiredSelectors = [
      'minimal-light',
      'minimal-dark',
      'paper-light',
      'paper-dark',
      'notion-light',
      'notion-dark',
      'data-theme-style="minimal"',
      'data-theme-style="paper"',
      'data-theme-style="notion"',
    ];

    for (const sel of requiredSelectors) {
      assert.ok(
        cssContent.includes(sel),
        `index.css must include selector for [${sel}]`
      );
    }

    // Required design tokens
    const requiredTokens = [
      '--color-bg-main',
      '--color-bg-sidebar',
      '--color-bg-header',
      '--color-bg-card',
      '--color-bg-subtle',
      '--color-bg-hover',
      '--color-primary',
      '--color-nav-active-bg',
      '--color-nav-active-text',
      '--color-btn-primary-bg',
      '--color-text-primary',
      '--color-text-secondary',
      '--color-text-muted',
      '--color-border',
      '--color-card-shadow',
      '--color-stat-icon-bg',
      '--color-stat-icon-text',
    ];

    for (const token of requiredTokens) {
      assert.ok(
        cssContent.includes(token),
        `index.css must define token ${token}`
      );
    }

    // Notion aesthetic criteria: flat canvas, zero drop shadows, 1px dividers, system font stack
    assert.ok(
      cssContent.includes('box-shadow: none !important') || cssContent.includes('box-shadow: none'),
      'index.css must enforce zero drop shadow for Notion cards'
    );
    assert.ok(
      cssContent.includes('#E9E9E7') && cssContent.includes('#2F2F2F'),
      'index.css must define subtle 1px dividers for Notion light and dark'
    );
    assert.ok(
      cssContent.includes('ui-sans-serif') || tailwindContent.includes('ui-sans-serif'),
      'Notion system font stack must be configured'
    );
    assert.ok(
      cssContent.includes('-0.015em') || tailwindContent.includes('-0.015em'),
      'Notion typography must configure letter-spacing -0.015em'
    );

    // Paper Journal aesthetic criteria: warm parchment ivory, sepia ink, editorial serif font stack
    assert.ok(
      cssContent.includes('#FAF6EE') || cssContent.includes('#FAF4EA') || cssContent.includes('#F8F4EA'),
      'Paper Journal light canvas must be warm ivory/parchment'
    );
    assert.ok(
      cssContent.includes('#1E1510'),
      'Paper Journal dark canvas must be deep espresso'
    );
    assert.ok(
      cssContent.includes('#2D2319'),
      'Paper Journal light text must be deep sepia ink'
    );
    assert.ok(
      cssContent.includes('#8C4A2F') || cssContent.includes('#8D4F1E'),
      'Paper Journal must feature warm terracotta accent'
    );
    assert.ok(
      cssContent.includes('ui-serif') || tailwindContent.includes('ui-serif'),
      'Paper Journal editorial serif font stack must be configured'
    );
  });

  await t.test('4. Decorative assets exist in ThemeArt.tsx for all 3 themes', () => {
    assert.match(
      themeArtContent,
      /export const DashboardHeaderArt/,
      'ThemeArt.tsx must export DashboardHeaderArt'
    );
    assert.match(
      themeArtContent,
      /export const PagesCardArt/,
      'ThemeArt.tsx must export PagesCardArt'
    );
    assert.match(
      themeArtContent,
      /export const DashboardCornerArt/,
      'ThemeArt.tsx must export DashboardCornerArt'
    );
    assert.match(
      themeArtContent,
      /export function resolveThemeArtStyle/,
      'ThemeArt.tsx must export resolveThemeArtStyle'
    );

    // Minimal wave graphics
    assert.match(
      themeArtContent,
      /min-lt-wave|min-dk-wave|fluid blue wave/,
      'ThemeArt.tsx must render Minimal fluid wave graphics'
    );

    // Paper botanical foliage
    assert.match(
      themeArtContent,
      /leaf-grad-sage|leaf-grad-olive|leaf-grad-bronze|botanical/i,
      'ThemeArt.tsx must render Paper Journal botanical foliage'
    );

    // Notion 3D geometric cubes
    assert.match(
      themeArtContent,
      /polygon points=|isometric|cube/i,
      'ThemeArt.tsx must render Notion 3D geometric isometric artwork'
    );
  });

  await t.test('5. Theme selection UI in SettingsContent.tsx supports 3 aesthetic themes', () => {
    assert.match(
      settingsContent,
      /ALL_THEME_STYLES\.map/,
      'SettingsContent.tsx must iterate and render all 3 aesthetic themes via ALL_THEME_STYLES'
    );
    assert.match(
      settingsContent,
      /THEME_DEFINITIONS/,
      'SettingsContent.tsx must access metadata via THEME_DEFINITIONS'
    );
    assert.match(
      settingsContent,
      /updateAppearanceSettings\(\s*{\s*themeStyle:/,
      'SettingsContent.tsx must update appearance with themeStyle'
    );
  });

  await t.test('6. Synchronous initialization and localStorage persistence', () => {
    // index.html prevents theme flash
    assert.ok(
      indexContent.includes('my_workspace_theme_id') || indexContent.includes('my_workspace_theme_style'),
      'index.html must read theme from localStorage'
    );
    assert.match(
      indexContent,
      /setAttribute\('data-theme-id'|setAttribute\('data-theme-style'/,
      'index.html must set theme attribute on root'
    );

    // WorkspaceContext.tsx sets and persists attributes
    assert.match(
      contextContent,
      /setAttribute\('data-theme-style'/,
      'WorkspaceContext.tsx must set data-theme-style'
    );
    assert.match(
      contextContent,
      /localStorage\.setItem\('my_workspace_theme_style'/,
      'WorkspaceContext.tsx must persist my_workspace_theme_style to localStorage'
    );
    assert.match(
      contextContent,
      /toggleTheme/,
      'WorkspaceContext.tsx must export toggleTheme'
    );
  });
});
