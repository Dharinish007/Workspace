export type ThemeStyle = 'minimal' | 'paper' | 'notion';
export type ThemeModeOption = 'light' | 'dark';

export type ThemeId =
  | 'minimal-light'
  | 'minimal-dark'
  | 'paper-light'
  | 'paper-dark'
  | 'notion-light'
  | 'notion-dark';

export const ALL_THEME_STYLES: ThemeStyle[] = ['minimal', 'paper', 'notion'];

export const ALL_THEME_IDS: ThemeId[] = [
  'minimal-light',
  'minimal-dark',
  'paper-light',
  'paper-dark',
  'notion-light',
  'notion-dark',
];

export interface ThemeColorPalette {
  bg: string;
  card: string;
  primary: string;
  accent: string;
  border: string;
  text: string;
  muted: string;
}

export interface ThemeDefinition {
  id: ThemeStyle;
  name: string;
  label: string;
  badge: string;
  description: string;
  swatches: {
    light: ThemeColorPalette;
    dark: ThemeColorPalette;
  };
  palette: ThemeColorPalette & {
    light: ThemeColorPalette;
    dark: ThemeColorPalette;
  };
}

const BASE_THEME_DEFINITIONS: Record<ThemeStyle, ThemeDefinition> = {
  minimal: {
    id: 'minimal',
    name: 'Minimal',
    label: 'Minimal',
    badge: 'Swiss Precision',
    description: 'Swiss precision minimalism with clean whitespace, crisp typography, and razor-thin hairline borders.',
    swatches: {
      light: {
        bg: '#FFFFFF',
        card: '#FFFFFF',
        primary: '#2563EB',
        accent: '#3B82F6',
        border: '#E2E8F0',
        text: '#0F172A',
        muted: '#64748B',
      },
      dark: {
        bg: '#0B132B',
        card: '#131E3A',
        primary: '#2563EB',
        accent: '#60A5FA',
        border: '#1E2D50',
        text: '#F8FAFC',
        muted: '#94A3B8',
      },
    },
    palette: {
      bg: '#FFFFFF',
      card: '#FFFFFF',
      primary: '#2563EB',
      accent: '#3B82F6',
      border: '#E2E8F0',
      text: '#0F172A',
      muted: '#64748B',
      light: {
        bg: '#FFFFFF',
        card: '#FFFFFF',
        primary: '#2563EB',
        accent: '#3B82F6',
        border: '#E2E8F0',
        text: '#0F172A',
        muted: '#64748B',
      },
      dark: {
        bg: '#0B132B',
        card: '#131E3A',
        primary: '#2563EB',
        accent: '#60A5FA',
        border: '#1E2D50',
        text: '#F8FAFC',
        muted: '#94A3B8',
      },
    },
  },
  paper: {
    id: 'paper',
    name: 'Paper Journal',
    label: 'Paper Journal',
    badge: 'Editorial Parchment',
    description: 'Warm parchment ivory canvas with editorial serif typography, rich sepia ink, and terracotta accents.',
    swatches: {
      light: {
        bg: '#FAF6EE',
        card: '#FCFAF5',
        primary: '#8C4A2F',
        accent: '#A06334',
        border: '#E6DEC9',
        text: '#2D2319',
        muted: '#8F7B6A',
      },
      dark: {
        bg: '#1E1510',
        card: '#2B1E17',
        primary: '#C26522',
        accent: '#F59E0B',
        border: '#453328',
        text: '#F7EFE6',
        muted: '#C4B4A3',
      },
    },
    palette: {
      bg: '#FAF6EE',
      card: '#FCFAF5',
      primary: '#8C4A2F',
      accent: '#A06334',
      border: '#E6DEC9',
      text: '#2D2319',
      muted: '#8F7B6A',
      light: {
        bg: '#FAF6EE',
        card: '#FCFAF5',
        primary: '#8C4A2F',
        accent: '#A06334',
        border: '#E6DEC9',
        text: '#2D2319',
        muted: '#8F7B6A',
      },
      dark: {
        bg: '#1E1510',
        card: '#2B1E17',
        primary: '#C26522',
        accent: '#F59E0B',
        border: '#453328',
        text: '#F7EFE6',
        muted: '#C4B4A3',
      },
    },
  },
  notion: {
    id: 'notion',
    name: 'Notion',
    label: 'Notion',
    badge: 'Structured Clean',
    description: 'Crisp structured workspace aesthetic with flat canvas, subtle dividers, and clean geometry.',
    swatches: {
      light: {
        bg: '#FFFFFF',
        card: '#FFFFFF',
        primary: '#191919',
        accent: '#37352F',
        border: '#E9E9E7',
        text: '#2F2E2B',
        muted: '#787774',
      },
      dark: {
        bg: '#191919',
        card: '#242424',
        primary: '#EAEAEA',
        accent: '#71717A',
        border: '#2F2F2F',
        text: '#EAEAEA',
        muted: '#9E9E9E',
      },
    },
    palette: {
      bg: '#FFFFFF',
      card: '#FFFFFF',
      primary: '#191919',
      accent: '#37352F',
      border: '#E9E9E7',
      text: '#2F2E2B',
      muted: '#787774',
      light: {
        bg: '#FFFFFF',
        card: '#FFFFFF',
        primary: '#191919',
        accent: '#37352F',
        border: '#E9E9E7',
        text: '#2F2E2B',
        muted: '#787774',
      },
      dark: {
        bg: '#191919',
        card: '#242424',
        primary: '#EAEAEA',
        accent: '#71717A',
        border: '#2F2F2F',
        text: '#EAEAEA',
        muted: '#9E9E9E',
      },
    },
  },
};

// Export THEME_DEFINITIONS with support for both style-based access ('minimal', 'paper', 'notion')
// and legacy composite themeId-based access ('minimal-light', etc.)
export const THEME_DEFINITIONS: Record<string, ThemeDefinition> = new Proxy(BASE_THEME_DEFINITIONS, {
  get(target, prop: string) {
    if (prop in target) {
      return (target as any)[prop];
    }
    // Fallback for composite theme IDs like 'paper-light'
    if (typeof prop === 'string' && prop.includes('-')) {
      const style = prop.split('-')[0] as ThemeStyle;
      if (style in target) {
        return (target as any)[style];
      }
    }
    return undefined;
  },
});

export function decomposeThemeId(themeId: string): { style: ThemeStyle; mode: ThemeModeOption } {
  if (!themeId) return { style: 'minimal', mode: 'light' };
  const parts = themeId.split('-');
  const rawStyle = parts[0];
  const rawMode = parts[1];
  const style: ThemeStyle = rawStyle === 'paper' ? 'paper' : rawStyle === 'notion' ? 'notion' : 'minimal';
  const mode: ThemeModeOption = rawMode === 'dark' ? 'dark' : 'light';
  return { style, mode };
}

export function composeThemeId(style: string | undefined, mode: string | undefined): ThemeId {
  const normStyle: ThemeStyle = style === 'paper' ? 'paper' : style === 'notion' ? 'notion' : 'minimal';
  const normMode: ThemeModeOption = mode === 'dark' ? 'dark' : 'light';
  return `${normStyle}-${normMode}` as ThemeId;
}

export function getOppositeModeThemeId(currentThemeId: ThemeId): ThemeId {
  const { style, mode } = decomposeThemeId(currentThemeId);
  const nextMode: ThemeModeOption = mode === 'light' ? 'dark' : 'light';
  return `${style}-${nextMode}` as ThemeId;
}
