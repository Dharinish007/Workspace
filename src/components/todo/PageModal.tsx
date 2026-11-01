import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Page } from '../../types';
import { X, Check } from 'lucide-react';
import { BUILT_IN_ICON_NAMES, IconRenderer } from '../common/IconRegistry';

interface PageModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageToEdit?: Page | null;
}

const COLOR_PALETTE = [
  '#4285F4', // Blue (Career)
  '#34A853', // Green (Projects)
  '#A142F4', // Purple (Learning)
  '#EC4899', // Pink (Personal)
  '#0D9488', // Teal
  '#F97316', // Orange
  '#EA4335', // Red
  '#FBBF24', // Amber
  '#6366F1', // Indigo
  '#06B6D4', // Cyan
];

export const PageModal: React.FC<PageModalProps> = ({
  isOpen,
  onClose,
  pageToEdit,
}) => {
  const { createPage, updatePage } = useWorkspace();

  const [name, setName] = useState('');
  const [icon, setIcon] = useState('Folder');
  const [color, setColor] = useState('#4285F4');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (pageToEdit) {
      setName(pageToEdit.name);
      setIcon(pageToEdit.icon);
      setColor(pageToEdit.color);
    } else {
      setName('');
      setIcon('Folder');
      setColor('#4285F4');
    }
    setError(null);
  }, [pageToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Page name is required');
      return;
    }

    try {
      if (pageToEdit) {
        await updatePage(pageToEdit.id, {
          name: name.trim(),
          icon,
          color,
        });
      } else {
        await createPage({
          name: name.trim(),
          icon,
          color,
        });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Operation failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div 
        className="bg-bg-card border border-border shadow-modal rounded-2xl w-full max-w-md overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-bold text-txt-primary">
            {pageToEdit ? 'Edit Page' : 'New Page'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-bg-subtle text-txt-muted hover:text-txt-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-2.5 text-xs bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 rounded-lg">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-txt-secondary mb-1">
              Page Name * (max 40 chars)
            </label>
            <input
              type="text"
              autoFocus
              maxLength={40}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Research, Side Projects, Fitness..."
              className="w-full px-3.5 py-2 text-sm bg-bg-subtle border border-border rounded-xl text-txt-primary outline-hidden focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Color Selection */}
          <div>
            <label className="block text-xs font-semibold text-txt-secondary mb-2">
              Page Accent Color
            </label>
            <div className="flex flex-wrap gap-2.5">
              {COLOR_PALETTE.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white transition-transform transform hover:scale-110 shadow-xs"
                  style={{ backgroundColor: c }}
                >
                  {color === c && <Check className="w-4 h-4 stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Icon Selection */}
          <div>
            <label className="block text-xs font-semibold text-txt-secondary mb-2">
              Select Icon
            </label>
            <div className="grid grid-cols-6 gap-2 max-h-40 overflow-y-auto p-1 border border-border rounded-xl bg-bg-subtle">
              {BUILT_IN_ICON_NAMES.map(iconName => (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => setIcon(iconName)}
                  className={`p-2 rounded-lg flex items-center justify-center transition-colors ${
                    icon === iconName
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-txt-secondary hover:bg-bg-hover hover:text-txt-primary'
                  }`}
                  title={iconName}
                >
                  <IconRenderer name={iconName} className="w-5 h-5" />
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="p-3 rounded-xl bg-bg-subtle border border-border flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-xs"
              style={{ backgroundColor: color }}
            >
              <IconRenderer name={icon} className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-txt-primary">
                {name || 'Page Preview'}
              </div>
              <div className="text-xs text-txt-muted">Preview card accent</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-txt-secondary hover:text-txt-primary hover:bg-bg-subtle rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-primary hover:bg-primary-hover rounded-xl shadow-xs transition-colors"
            >
              {pageToEdit ? 'Save Changes' : 'Create Page'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

