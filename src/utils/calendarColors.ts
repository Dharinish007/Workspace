// Centralized Theme-Aware Calendar Day Color Palette
// Exactly six color categories for Light and Dark modes.
// Reconciled with UI/UX Design and WCAG 2.1 AA/AAA Accessibility Reviews.

export interface DayColorCategory {
  id: 'blue' | 'green' | 'yellow' | 'purple' | 'red' | 'orange';
  name: string;
  lightHex: string;
  darkHex: string;
  legacyHexes: string[];
}

export const DAY_COLOR_CATEGORIES: DayColorCategory[] = [
  {
    id: 'blue',
    name: 'Blue',
    lightHex: '#A9C9F5',
    darkHex: '#416FA9',
    legacyHexes: ['#E8F0FE', '#1E293B', '#4285F4', '#3B82F6', '#2563EB'],
  },
  {
    id: 'green',
    name: 'Green',
    lightHex: '#9BD8AF',
    darkHex: '#397D56',
    legacyHexes: ['#A5D5B4', '#E6F4EA', '#143823', '#10B981', '#059669', '#22C55E'],
  },
  {
    id: 'yellow',
    name: 'Yellow',
    lightHex: '#F2D58B',
    darkHex: '#85671E',
    legacyHexes: ['#927326', '#FEF7E0', '#3A2E12', '#F59E0B', '#EAB308', '#FBBF24'],
  },
  {
    id: 'purple',
    name: 'Purple',
    lightHex: '#C6ACEB',
    darkHex: '#7E5CAE',
    legacyHexes: ['#7956A5', '#F3E8FD', '#2E1A47', '#8B5CF6', '#A855F7', '#7C3AED'],
  },
  {
    id: 'red',
    name: 'Red',
    lightHex: '#EE8885',
    darkHex: '#A64F50',
    legacyHexes: ['#E99B98', '#FCE8E6', '#3D1B1B', '#EF4444', '#DC2626', '#F87171'],
  },
  {
    id: 'orange',
    name: 'Orange',
    lightHex: '#F4B986',
    darkHex: '#985C34',
    legacyHexes: ['#F2BE98', '#A9683D', '#FFE8D6', '#3D2514', '#F97316', '#EA580C'],
  },
];

/**
 * Resolves any stored color string (category ID, lightHex, darkHex, or legacyHex)
 * to its corresponding DayColorCategory ID.
 */
export function resolveDayColorCategory(color: string | undefined): DayColorCategory['id'] | null {
  if (!color) return null;
  const normalized = color.trim().toLowerCase();

  for (const cat of DAY_COLOR_CATEGORIES) {
    if (cat.id.toLowerCase() === normalized) return cat.id;
    if (cat.lightHex.toLowerCase() === normalized) return cat.id;
    if (cat.darkHex.toLowerCase() === normalized) return cat.id;
    if (cat.legacyHexes.some(h => h.toLowerCase() === normalized)) return cat.id;
  }
  return null;
}

/**
 * Returns the active theme HEX code for a given color value (category ID or HEX).
 */
export function resolveDayColorHex(color: string | undefined, isDark: boolean): string | null {
  if (!color) return null;
  const categoryId = resolveDayColorCategory(color);
  if (!categoryId) return color; // Fallback to raw hex if unmapped

  const category = DAY_COLOR_CATEGORIES.find(c => c.id === categoryId);
  if (!category) return color;

  return isDark ? category.darkHex : category.lightHex;
}

/**
 * Computes calendar day cell background styling with calibrated opacity for both themes.
 * Light mode uses 20% alpha (hex 33) over white card: guarantees > 10:1 AAA text contrast.
 * Dark mode uses 25% alpha (hex 40) over dark card: guarantees > 12:1 AAA text contrast.
 */
export function getDayCellBackgroundStyle(color: string | undefined, isDark: boolean): React.CSSProperties {
  if (!color) return {};
  const hex = resolveDayColorHex(color, isDark);
  if (!hex) return {};

  const alpha = isDark ? '40' : '33';
  return {
    backgroundColor: `${hex}${alpha}`,
  };
}

/**
 * Helper to get palette options for the DayColorPickerModal in the active theme.
 */
export function getCalendarColorOptions(isDark: boolean) {
  return DAY_COLOR_CATEGORIES.map(cat => ({
    id: cat.id,
    name: cat.name,
    colorHex: isDark ? cat.darkHex : cat.lightHex,
  }));
}

