import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  MoreHorizontal, 
  Pin, 
  PinOff, 
  Download, 
  Trash2, 
  FileDown 
} from 'lucide-react';
import { Note } from '../../types';
import { stripMarkdown, formatNoteRowTimestamp, exportNoteAsMarkdown, exportNoteAsText } from './noteUtils';

interface NoteRowProps {
  note: Note;
  onSelect: (noteId: string) => void;
  onTogglePin: (note: Note) => void;
  onDeleteRequest: (note: Note) => void;
}

export const NoteRow: React.FC<NoteRowProps> = ({
  note,
  onSelect,
  onTogglePin,
  onDeleteRequest,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const previewText = stripMarkdown(note.content) || 'Empty note...';
  const timestamp = formatNoteRowTimestamp(note.updatedAt);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMenuOpen]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.15 }}
      onClick={() => onSelect(note.id)}
      className="bg-bg-card border border-border hover:border-border-interactive/80 rounded-2xl p-3.5 sm:p-4 shadow-card hover:shadow-card-hover transition-all duration-150 cursor-pointer flex items-center justify-between gap-3 group relative select-none"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(note.id);
        }
      }}
      aria-label={`Open note: ${note.title}`}
    >
      {/* Left Column: Icon & Titles */}
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {/* Document Icon Box */}
        <div className="w-9 h-9 rounded-xl bg-bg-subtle/80 border border-border/50 text-txt-secondary group-hover:text-primary flex items-center justify-center shrink-0 transition-colors">
          <FileText className="w-4 h-4" />
        </div>

        {/* Text Area */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-txt-primary truncate group-hover:text-primary transition-colors tracking-tight">
              {note.title || 'Untitled Note'}
            </h4>
            {note.pinned && (
              <Pin className="w-3 h-3 text-primary fill-primary shrink-0" />
            )}
          </div>
          <p className="text-xs text-txt-muted truncate mt-0.5 max-w-sm sm:max-w-md md:max-w-xl">
            {previewText}
          </p>
        </div>
      </div>

      {/* Right Column: Tags, Timestamp & Overflow Menu */}
      <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
        {/* Tags */}
        <div className="hidden sm:flex items-center gap-1.5 flex-wrap max-w-xs">
          {note.tags && note.tags.slice(0, 2).map((tag: string, tIdx: number) => (
            <span
              key={tIdx}
              className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-bg-subtle text-txt-secondary border border-border/50 group-hover:border-primary/20 transition-colors"
            >
              #{tag}
            </span>
          ))}
          {note.tags && note.tags.length > 2 && (
            <span className="text-[10px] text-txt-muted">+{note.tags.length - 2}</span>
          )}
        </div>

        {/* Timestamp */}
        <span className="text-xs text-txt-muted font-medium min-w-[55px] text-right">
          {timestamp}
        </span>

        {/* Overflow Menu */}
        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen((prev) => !prev);
            }}
            title="More note actions"
            aria-label="More actions"
            className="w-8 h-8 rounded-lg hover:bg-bg-hover text-txt-muted hover:text-txt-primary flex items-center justify-center transition-colors cursor-pointer"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {/* Action Dropdown Menu */}
          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.12 }}
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-9 z-30 bg-bg-card border border-border rounded-xl shadow-modal py-1.5 w-48 text-txt-primary"
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onTogglePin(note);
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-medium hover:bg-bg-hover flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  {note.pinned ? (
                    <>
                      <PinOff className="w-4 h-4 text-txt-muted" />
                      <span>Unpin Note</span>
                    </>
                  ) : (
                    <>
                      <Pin className="w-4 h-4 text-primary" />
                      <span>Pin to Top</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    exportNoteAsMarkdown(note);
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-medium hover:bg-bg-hover flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4 text-txt-muted" />
                  <span>Export as Markdown</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    exportNoteAsText(note);
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-medium hover:bg-bg-hover flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <FileDown className="w-4 h-4 text-txt-muted" />
                  <span>Export as Text</span>
                </button>

                <div className="border-t border-border/60 my-1" />

                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onDeleteRequest(note);
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                  <span>Delete Note</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

