import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Sun, Moon } from 'lucide-react';
import { ThemeId, ThemeStyle, decomposeThemeId } from '../../types/theme';

interface AppearancePopoverProps {
  isCollapsed?: boolean;
}

export const AppearancePopover: React.FC<AppearancePopoverProps> = ({
  isCollapsed = false,
}) => {
  const { settings, updateAppearanceSettings } = useWorkspace();

  const isDark =
    settings.appearance?.themeMode === 'dark' || settings.theme === 'dark';

  const currentStyle: ThemeStyle = settings.appearance?.themeStyle ||
    (settings.appearance?.themeId ? decomposeThemeId(settings.appearance.themeId).style :
     (settings.appearance?.backgroundStyle === 'paper' ? 'paper' : settings.appearance?.backgroundStyle === 'notion' ? 'notion' : 'minimal'));

  // 1-Click instant toggle: activates the other mode directly while maintaining active theme style ('minimal' | 'paper' | 'notion')
  const handleToggle = async () => {
    const nextMode: 'light' | 'dark' = isDark ? 'light' : 'dark';
    const nextThemeId: ThemeId = `${currentStyle}-${nextMode}` as ThemeId;
    await updateAppearanceSettings({
      themeMode: nextMode,
      themeStyle: currentStyle,
      themeId: nextThemeId,
      backgroundStyle: currentStyle,
    });
  };

  return (
    <div className="w-full">
      {isCollapsed ? (
        <button
          type="button"
          onClick={handleToggle}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="w-full h-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary text-txt-secondary hover:text-txt-primary hover:bg-bg-hover"
        >
          {isDark ? (
            <Sun className="w-4 h-4 text-amber-400 group-hover:text-amber-300 transition-colors shrink-0" />
          ) : (
            <Moon className="w-4 h-4 text-txt-secondary group-hover:text-primary transition-colors shrink-0" />
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={handleToggle}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="w-full flex items-center justify-between px-3 h-10 rounded-xl text-xs font-medium transition-colors cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary text-txt-secondary hover:text-txt-primary hover:bg-bg-hover"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400 group-hover:text-amber-300 transition-colors shrink-0" />
            ) : (
              <Moon className="w-4 h-4 text-txt-secondary group-hover:text-primary transition-colors shrink-0" />
            )}
            <span className="truncate">Appearance</span>
          </div>
          <span className="text-[10px] font-semibold text-txt-muted px-2 py-0.5 rounded-full bg-bg-main border border-border/80 shrink-0 capitalize group-hover:text-txt-primary transition-colors">
            {isDark ? 'Dark' : 'Light'}
          </span>
        </button>
      )}
    </div>
  );
};
