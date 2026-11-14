import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { User, LogOut, Cloud, Palette, Sliders, ChevronRight, LogIn } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProfileDropdownProps {
  isCollapsed?: boolean;
  onNavigate?: () => void;
}

export const ProfileDropdown: React.FC<ProfileDropdownProps> = ({
  isCollapsed = false,
  onNavigate,
}) => {
  const { user, signOut } = useAuth();
  const { settings } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Determine user display information
  const displayName =
    settings.general?.displayName ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'Workspace User';

  const userEmail = user?.email || 'Local Workspace';
  const initial = displayName.charAt(0).toUpperCase() || 'W';

  // Dismiss on outside click or Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleItemClick = (path: string) => {
    setIsOpen(false);
    navigate(path);
    onNavigate?.();
  };

  const handleSignOut = async () => {
    setIsOpen(false);
    await signOut();
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger Button */}
      {isCollapsed ? (
        <button
          type="button"
          onClick={() => setIsOpen(prev => !prev)}
          title={`User Profile: ${displayName}`}
          aria-label={`User profile for ${displayName}`}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          className={`w-full h-11 rounded-xl flex items-center justify-center transition-colors cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            isOpen
              ? 'bg-primary/10'
              : 'hover:bg-bg-hover'
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-primary/15 text-primary border border-primary/30 flex items-center justify-center font-bold text-xs shadow-2xs group-hover:border-primary transition-colors">
            {initial}
          </div>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(prev => !prev)}
          aria-label={`User profile for ${displayName}`}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          className={`w-full flex items-center gap-3 p-2 rounded-xl text-left transition-colors cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            isOpen
              ? 'bg-primary/10'
              : 'hover:bg-bg-hover'
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-primary/15 text-primary border border-primary/30 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-txt-primary truncate leading-tight group-hover:text-primary transition-colors">
              {displayName}
            </div>
            <div className="text-[10px] text-txt-muted truncate leading-tight">
              {userEmail}
            </div>
          </div>
          <ChevronRight className={`w-3.5 h-3.5 text-txt-muted group-hover:text-txt-primary transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-90' : ''
          }`} />
        </button>
      )}

      {/* Account Dropdown Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: isCollapsed ? 0 : 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: isCollapsed ? 0 : 6 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            role="dialog"
            aria-label="User account menu"
            className={`absolute z-50 w-64 p-2 bg-bg-card border border-border rounded-2xl shadow-modal backdrop-blur-md select-none ${
              isCollapsed
                ? 'left-full ml-3 bottom-0'
                : 'bottom-full mb-2 left-0'
            }`}
          >
            {/* User Details Header */}
            <div className="p-2 mb-1 border-b border-border/60 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center justify-center font-bold text-sm shrink-0">
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-txt-primary truncate">
                  {displayName}
                </div>
                <div className="text-[10px] text-txt-muted truncate">
                  {userEmail}
                </div>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-wider uppercase border ${
                    user
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      : 'bg-txt-muted/10 text-txt-muted border-border'
                  }`}>
                    {user ? 'Cloud Synced' : 'Local Workspace'}
                  </span>
                </div>
              </div>
            </div>

            {/* Account Quick Links */}
            <div className="space-y-0.5">
              <button
                type="button"
                onClick={() => handleItemClick('/settings?tab=general')}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-txt-secondary hover:text-txt-primary hover:bg-bg-hover transition-colors text-left cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5 text-txt-muted shrink-0" />
                <span>Account & Preferences</span>
              </button>

              <button
                type="button"
                onClick={() => handleItemClick('/settings?tab=cloud')}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-txt-secondary hover:text-txt-primary hover:bg-bg-hover transition-colors text-left cursor-pointer"
              >
                <Cloud className="w-3.5 h-3.5 text-txt-muted shrink-0" />
                <span>Cloud Sync & Storage</span>
              </button>

              <button
                type="button"
                onClick={() => handleItemClick('/settings?tab=appearance')}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-txt-secondary hover:text-txt-primary hover:bg-bg-hover transition-colors text-left cursor-pointer"
              >
                <Palette className="w-3.5 h-3.5 text-txt-muted shrink-0" />
                <span>Theme & Appearance</span>
              </button>
            </div>

            {/* Separator & Sign Out / In */}
            <div className="mt-1 pt-1 border-t border-border/60">
              {user ? (
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors text-left cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 shrink-0" />
                  <span>Sign Out</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleItemClick('/settings?tab=cloud')}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-primary hover:bg-primary/10 transition-colors text-left cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5 shrink-0" />
                  <span>Connect Cloud Sync</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

