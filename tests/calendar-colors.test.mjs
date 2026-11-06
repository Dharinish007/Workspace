import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  DAY_COLOR_CATEGORIES, 
  resolveDayColorCategory, 
  resolveDayColorHex, 
  getDayCellBackgroundStyle, 
  getCalendarColorOptions 
} from '../src/utils/calendarColors.ts';

test('Calendar Day Background Colors: Palette Integrity', async (t) => {
  await t.test('Exactly six color categories are configured', () => {
    assert.equal(DAY_COLOR_CATEGORIES.length, 6);
    const ids = DAY_COLOR_CATEGORIES.map(c => c.id);
    assert.deepEqual(ids, ['blue', 'green', 'yellow', 'purple', 'red', 'orange']);
  });

  await t.test('Teal and Indigo are permanently removed', () => {
    const names = DAY_COLOR_CATEGORIES.map(c => c.name.toLowerCase());
    assert.ok(!names.includes('teal'));
    assert.ok(!names.includes('indigo'));
    assert.ok(!names.includes('soft teal'));
    assert.ok(!names.includes('soft indigo'));
  });

  await t.test('No duplicate hex values exist across categories', () => {
    const lightHexes = new Set(DAY_COLOR_CATEGORIES.map(c => c.lightHex.toLowerCase()));
    const darkHexes = new Set(DAY_COLOR_CATEGORIES.map(c => c.darkHex.toLowerCase()));
    assert.equal(lightHexes.size, 6);
    assert.equal(darkHexes.size, 6);
  });
});

test('Calendar Day Background Colors: Theme-Aware Resolution', async (t) => {
  await t.test('Resolves category ID to proper theme hex', () => {
    // Blue
    assert.equal(resolveDayColorHex('blue', false), '#A9C9F5');
    assert.equal(resolveDayColorHex('blue', true), '#416FA9');

    // Green
    assert.equal(resolveDayColorHex('green', false), '#9BD8AF');
    assert.equal(resolveDayColorHex('green', true), '#397D56');

    // Yellow
    assert.equal(resolveDayColorHex('yellow', false), '#F2D58B');
    assert.equal(resolveDayColorHex('yellow', true), '#85671E');

    // Purple
    assert.equal(resolveDayColorHex('purple', false), '#C6ACEB');
    assert.equal(resolveDayColorHex('purple', true), '#7E5CAE');

    // Red
    assert.equal(resolveDayColorHex('red', false), '#EE8885');
    assert.equal(resolveDayColorHex('red', true), '#A64F50');

    // Orange
    assert.equal(resolveDayColorHex('orange', false), '#F4B986');
    assert.equal(resolveDayColorHex('orange', true), '#985C34');
  });

  await t.test('Resolves light hex code to category and adapts across theme switch', () => {
    // If a user saved light hex '#A9C9F5'
    assert.equal(resolveDayColorCategory('#A9C9F5'), 'blue');
    // In dark mode, it automatically adapts to dark blue
    assert.equal(resolveDayColorHex('#A9C9F5', true), '#416FA9');
    // In light mode, it returns light blue
    assert.equal(resolveDayColorHex('#A9C9F5', false), '#A9C9F5');
  });

  await t.test('Resolves dark hex code to category and adapts across theme switch', () => {
    // If a user saved dark hex '#416FA9'
    assert.equal(resolveDayColorCategory('#416FA9'), 'blue');
    // In light mode, it automatically adapts to light blue
    assert.equal(resolveDayColorHex('#416FA9', false), '#A9C9F5');
  });

  await t.test('Resolves legacy hex codes from dummy generator seamlessly', () => {
    // Legacy soft purple '#8B5CF6'
    assert.equal(resolveDayColorCategory('#8B5CF6'), 'purple');
    assert.equal(resolveDayColorHex('#8B5CF6', false), '#C6ACEB');
    assert.equal(resolveDayColorHex('#8B5CF6', true), '#7E5CAE');

    // Legacy soft green '#10B981'
    assert.equal(resolveDayColorCategory('#10B981'), 'green');
    assert.equal(resolveDayColorHex('#10B981', false), '#9BD8AF');

    // Legacy soft amber '#F59E0B'
    assert.equal(resolveDayColorCategory('#F59E0B'), 'yellow');

    // Legacy blue '#4285F4'
    assert.equal(resolveDayColorCategory('#4285F4'), 'blue');
  });
});

test('Calendar Day Background Colors: Cell Background Styling', async (t) => {
  await t.test('Returns empty style for undefined color', () => {
    assert.deepEqual(getDayCellBackgroundStyle(undefined, false), {});
    assert.deepEqual(getDayCellBackgroundStyle(undefined, true), {});
  });

  await t.test('Generates light mode styling with 20% alpha (hex 33)', () => {
    const style = getDayCellBackgroundStyle('blue', false);
    assert.equal(style.backgroundColor, '#A9C9F533');
  });

  await t.test('Generates dark mode styling with 25% alpha (hex 40)', () => {
    const style = getDayCellBackgroundStyle('blue', true);
    assert.equal(style.backgroundColor, '#416FA940');
  });
});

test('Calendar Day Background Colors: Options for Modal', async (t) => {
  await t.test('Provides 6 options with active theme hex in light mode', () => {
    const options = getCalendarColorOptions(false);
    assert.equal(options.length, 6);
    assert.equal(options[0].colorHex, '#A9C9F5');
  });

  await t.test('Provides 6 options with active theme hex in dark mode', () => {
    const options = getCalendarColorOptions(true);
    assert.equal(options.length, 6);
    assert.equal(options[0].colorHex, '#416FA9');
  });
});

test('Calendar Day Background Colors: WCAG AA Contrast Verification', async (t) => {
  function hexToRgb(hex) {
    const num = parseInt(hex.replace('#', ''), 16);
    return [ (num >> 16) & 255, (num >> 8) & 255, num & 255 ];
  }

  function luminance([r, g, b]) {
    const a = [r, g, b].map(v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  }

  function contrast(hex1, hex2) {
    const l1 = luminance(hexToRgb(hex1));
    const l2 = luminance(hexToRgb(hex2));
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }

  await t.test('All 6 light colors achieve >= 4.5:1 contrast against Primary Text (#1E3A5F)', () => {
    for (const cat of DAY_COLOR_CATEGORIES) {
      const cr = contrast(cat.lightHex, '#1E3A5F');
      assert.ok(cr >= 4.5, `${cat.name} (${cat.lightHex}) contrast ${cr.toFixed(2)} must be >= 4.5:1`);
    }
  });

  await t.test('All 6 dark colors achieve >= 4.5:1 contrast against Light Text (#F0F6FA)', () => {
    for (const cat of DAY_COLOR_CATEGORIES) {
      const cr = contrast(cat.darkHex, '#F0F6FA');
      assert.ok(cr >= 4.5, `${cat.name} (${cat.darkHex}) contrast ${cr.toFixed(2)} must be >= 4.5:1`);
    }
  });
});

