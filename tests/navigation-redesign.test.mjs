import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

test('Global Navigation Redesign: Structure & Control Relocation', async (t) => {
  const headerPath = resolve('src/components/layout/Header.tsx');
  const sidebarPath = resolve('src/components/layout/Sidebar.tsx');
  const datePopoverPath = resolve('src/components/layout/DateSelectorPopover.tsx');
  const appearancePopoverPath = resolve('src/components/layout/AppearancePopover.tsx');
  const profileDropdownPath = resolve('src/components/layout/ProfileDropdown.tsx');

  assert.ok(existsSync(headerPath), 'Header.tsx must exist');
  assert.ok(existsSync(sidebarPath), 'Sidebar.tsx must exist');
  assert.ok(existsSync(datePopoverPath), 'DateSelectorPopover.tsx must exist');
  assert.ok(existsSync(appearancePopoverPath), 'AppearancePopover.tsx must exist');
  assert.ok(existsSync(profileDropdownPath), 'ProfileDropdown.tsx must exist');

  const headerContent = readFileSync(headerPath, 'utf-8');
  const sidebarContent = readFileSync(sidebarPath, 'utf-8');
  const datePopoverContent = readFileSync(datePopoverPath, 'utf-8');
  const appearancePopoverContent = readFileSync(appearancePopoverPath, 'utf-8');
  const profileDropdownContent = readFileSync(profileDropdownPath, 'utf-8');

  await t.test('Header.tsx has controls removed and breadcrumbs preserved', () => {
    // Header must NOT contain search trigger, date button, theme switcher, or settings button
    assert.doesNotMatch(
      headerContent,
      /setIsSearchOpen\(true\)/,
      'Header must not contain search trigger'
    );
    assert.doesNotMatch(
      headerContent,
      /toggleTheme/,
      'Header must not contain theme switcher button'
    );
    assert.doesNotMatch(
      headerContent,
      /navigate\('\/settings'\)/,
      'Header must not contain settings button'
    );
    assert.doesNotMatch(
      headerContent,
      /formattedDate/,
      'Header must not contain date display'
    );

    // Header must preserve breadcrumbs and title
    assert.match(
      headerContent,
      /breadcrumb\s*\?/,
      'Header must support breadcrumbs'
    );
    assert.match(
      headerContent,
      /pageTitle/,
      'Header must render dynamic page title'
    );
  });

  await t.test('Sidebar.tsx implements the exact 5-section hierarchy', () => {
    // 1. TOP: Workspace logo and name + collapse/expand button
    assert.match(
      sidebarContent,
      /My Workspace/,
      'Sidebar must display My Workspace branding'
    );
    assert.match(
      sidebarContent,
      /PanelLeftClose/,
      'Sidebar must have collapse button'
    );
    assert.match(
      sidebarContent,
      /PanelLeftOpen/,
      'Sidebar must have expand button'
    );

    // 2. SEARCH: Input with Ctrl + K shortcut
    assert.match(
      sidebarContent,
      /setIsSearchOpen\(true\)/,
      'Sidebar must have global search trigger'
    );
    assert.match(
      sidebarContent,
      /Ctrl K/i,
      'Sidebar search must display Ctrl+K keyboard shortcut'
    );

    // 3. MAIN NAVIGATION: All 7 modules
    const requiredModules = ['dashboard', 'todo', 'calendar', 'habits', 'journal', 'notes', 'timer'];
    for (const mod of requiredModules) {
      assert.match(
        sidebarContent,
        new RegExp(`id:\\s*'${mod}'`),
        `Sidebar NAV_ITEMS must include ${mod}`
      );
    }

    // Route matching for /timer and /activity
    assert.match(
      sidebarContent,
      /path === '\/timer'/,
      'Sidebar must match /timer route'
    );
    assert.match(
      sidebarContent,
      /location\.pathname\.startsWith\('\/timer'\)\s*\|\|\s*location\.pathname\.startsWith\('\/activity'\)/,
      'Sidebar must match both /timer and /activity for active state'
    );

    // 4. WORKSPACE CONTROLS: Date & Appearance
    assert.match(
      sidebarContent,
      /<DateSelectorPopover/,
      'Sidebar must render DateSelectorPopover'
    );
    assert.match(
      sidebarContent,
      /<AppearancePopover/,
      'Sidebar must render AppearancePopover'
    );

    // 5. BOTTOM SECTION: Settings item and Profile dropdown (separate)
    assert.match(
      sidebarContent,
      /handleNavClick\('\/settings'\)/,
      'Sidebar bottom section must contain Settings navigation button'
    );
    assert.match(
      sidebarContent,
      /<ProfileDropdown/,
      'Sidebar bottom section must render ProfileDropdown'
    );
  });

  await t.test('Sidebar supports compact rail (w-20 = 80px) and expanded (w-64 = 256px)', () => {
    assert.match(
      sidebarContent,
      /isSidebarCollapsed\s*\?\s*'w-20'\s*:\s*'w-64'/,
      'Sidebar must toggle between w-20 (80px rail) and w-64 (256px)'
    );
  });

  await t.test('DateSelectorPopover supports date selection in expanded and read-only date view in collapsed', () => {
    assert.match(
      datePopoverContent,
      /setSelectedDate/,
      'DateSelectorPopover must call setSelectedDate'
    );
    assert.match(
      datePopoverContent,
      /isCollapsed/,
      'DateSelectorPopover must handle isCollapsed prop'
    );
    assert.match(
      datePopoverContent,
      /left-full ml-3/,
      'DateSelectorPopover must anchor to right in collapsed mode'
    );
    // In collapsed mode, shows the date alone without the date switching grid
    assert.match(
      datePopoverContent,
      /todayFullDate/,
      'DateSelectorPopover must display full current date in collapsed mode'
    );
  });

  await t.test('AppearancePopover directly toggles Light and Dark modes without popover', () => {
    assert.match(
      appearancePopoverContent,
      /updateAppearanceSettings/,
      'AppearancePopover must update appearance settings'
    );
    assert.match(
      appearancePopoverContent,
      /'light'/,
      'AppearancePopover must include Light mode'
    );
    assert.match(
      appearancePopoverContent,
      /'dark'/,
      'AppearancePopover must include Dark mode'
    );
    assert.doesNotMatch(
      appearancePopoverContent,
      /'system'/,
      'AppearancePopover should not include system mode'
    );
    assert.match(
      appearancePopoverContent,
      /handleToggle/,
      'Appearance control must directly toggle mode on click'
    );
  });

  await t.test('App.tsx does not render top Header bar', () => {
    const appPath = resolve('src/App.tsx');
    const appContent = readFileSync(appPath, 'utf-8');
    assert.doesNotMatch(
      appContent,
      /<Header\s*\/>/,
      'App.tsx must not mount the top Header navigation bar'
    );
  });

  await t.test('ProfileDropdown keeps Settings separate and provides account actions', () => {
    assert.match(
      profileDropdownContent,
      /useAuth/,
      'ProfileDropdown must consume AuthContext'
    );
    assert.match(
      profileDropdownContent,
      /signOut/,
      'ProfileDropdown must support signing out'
    );
    assert.match(
      profileDropdownContent,
      /\/settings\?tab=general/,
      'ProfileDropdown must link to account preferences'
    );
    assert.match(
      profileDropdownContent,
      /\/settings\?tab=cloud/,
      'ProfileDropdown must link to cloud sync'
    );
  });

  await t.test('Mobile Navigation Drawer contains all sections and closes on navigation', () => {
    assert.match(
      sidebarContent,
      /isMobileSidebarOpen/,
      'Sidebar must support mobile drawer state'
    );
    assert.match(
      sidebarContent,
      /setIsMobileSidebarOpen\(false\)/,
      'Selecting a navigation item must close the mobile drawer'
    );
  });
});
