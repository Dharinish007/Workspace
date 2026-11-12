import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Upload, 
  Pin, 
  Tag as TagIcon, 
  LayoutGrid, 
  List as ListIcon, 
  ChevronDown, 
  Search, 
  FileText,
  X,
  Settings
} from 'lucide-react';
import { Note } from '../../types';
import { PinnedNotesSection } from './PinnedNotesSection';
import { NoteRow } from './NoteRow';
import { DeleteNoteModal } from './DeleteNoteModal';
import { groupNotesByLastModified } from './noteUtils';

interface NotesOverviewProps {
  notes: Note[];
  onSelectNote: (noteId: string) => void;
  onCreateNewNote: () => void;
  onTogglePin: (note: Note) => void;
  onDeleteNote: (noteId: string) => void;
  onReorderPinnedNotes: (orderedIds: string[]) => void;
  onImportNotes: (files: File[]) => void;
}

type SortOption = 'recent' | 'oldest' | 'title-asc' | 'title-desc';

export const NotesOverview: React.FC<NotesOverviewProps> = ({
  notes,
  onSelectNote,
  onCreateNewNote,
  onTogglePin,
  onDeleteNote,
  onReorderPinnedNotes,
  onImportNotes,
}) => {
  const { settings } = useWorkspace();
  const navigate = useNavigate();

  // Filters & View State
  const [isPinnedOnly, setIsPinnedOnly] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>(() => {
    return (settings?.modules?.notes?.defaultSort as SortOption) || 'recent';
  });
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    return settings?.modules?.notes?.defaultViewMode === 'grid' ? 'grid' : 'list';
  });

  // Dropdown states
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);

  // Deletion modal state
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);

  // Hidden File input for import
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  // Extract all unique tags with count
  const allTagsWithCount = useMemo(() => {
    const map = new Map<string, number>();
    notes.forEach((note) => {
      (note.tags || []).forEach((tag: string) => {
        const clean = tag.trim().toLowerCase();
        if (clean) {
          map.set(clean, (map.get(clean) || 0) + 1);
        }
      });
    });
    return Array.from(map.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  }, [notes]);

  // Filtered notes based on Pinned toggle and selected tag
  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      if (isPinnedOnly && !note.pinned) return false;
      if (selectedTag && !note.tags.map((t: string) => t.toLowerCase()).includes(selectedTag.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [notes, isPinnedOnly, selectedTag]);

  // Separate pinned and remaining notes
  const pinnedNotes = useMemo(() => {
    return filteredNotes
      .filter((n) => n.pinned)
      .sort((a, b) => (a.pinnedOrder ?? 0) - (b.pinnedOrder ?? 0));
  }, [filteredNotes]);

  // Group remaining non-pinned notes by last modified date (or all if pinned toggle is on)
  const groupedRemainingNotes = useMemo(() => {
    // If pinned only is active, non-pinned won't show
    const remaining = isPinnedOnly ? [] : filteredNotes.filter((n) => !n.pinned);
    return groupNotesByLastModified(remaining);
  }, [filteredNotes, isPinnedOnly]);

  // Handle file import selection
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onImportNotes(Array.from(files));
      e.target.value = '';
    }
  };

  // Drag and drop file onto container
  const handleDragOverFile = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDraggingFile(true);
    }
  };

  const handleDragLeaveFile = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
  };

  const handleDropFile = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onImportNotes(Array.from(e.dataTransfer.files));
    }
  };

  const sortLabel = useMemo(() => {
    switch (sortOption) {
      case 'recent':
        return 'All Notes';
      case 'oldest':
        return 'Oldest First';
      case 'title-asc':
        return 'Title (A-Z)';
      case 'title-desc':
        return 'Title (Z-A)';
      default:
        return 'All Notes';
    }
  }, [sortOption]);

  return (
    <div
      onDragOver={handleDragOverFile}
      onDragLeave={handleDragLeaveFile}
      onDrop={handleDropFile}
      className="p-4 sm:p-6 lg:p-8 max-w-5xl w-full mx-auto space-y-6 relative min-h-full"
    >
      {/* Drag & Drop File Overlay */}
      <AnimatePresence>
        {isDraggingFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 bg-primary/10 border-2 border-dashed border-primary rounded-3xl backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center select-none"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg mb-3">
              <Upload className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-txt-primary font-serif">Drop Markdown or Text files to import</h3>
            <p className="text-xs text-txt-secondary mt-1">Supports .md and .txt files</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.txt,text/markdown,text/plain"
        multiple
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Header Row: Title & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-txt-primary tracking-tight">
            My Notes
          </h1>
          <p className="text-xs sm:text-sm text-txt-secondary mt-1">
            Capture ideas, learnings and important information.
          </p>
        </div>

        {/* Action Buttons: Import + New Note */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="h-10 px-3.5 rounded-xl border border-border bg-bg-card hover:bg-bg-hover hover:border-primary/50 text-txt-secondary hover:text-txt-primary text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
            title="Import Markdown or Text files (.md, .txt)"
          >
            <Upload className="w-4 h-4 text-txt-muted" />
            <span>Import</span>
          </button>

          <button
            type="button"
            onClick={onCreateNewNote}
            className="h-10 px-4 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center gap-2 shadow-card hover:shadow-card-hover transition-all cursor-pointer group"
          >
            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
            <span>New Note</span>
          </button>

          {/* Module Settings Shortcut */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={() => navigate('/settings?tab=journal_notes')}
            className="h-10 w-10 bg-bg-card border border-border hover:bg-bg-hover text-txt-secondary hover:text-txt-primary rounded-xl flex items-center justify-center shadow-2xs transition-colors cursor-pointer"
            title="Journal & Notes Settings"
            aria-label="Journal & Notes Settings"
          >
            <Settings className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      {/* Filter & Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
        {/* Left: Filter Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* All Notes / Sort Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsSortDropdownOpen((prev) => !prev);
                setIsTagDropdownOpen(false);
              }}
              className="h-9 px-3 rounded-xl border border-border bg-bg-card hover:bg-bg-hover text-txt-secondary hover:text-txt-primary text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer shadow-2xs"
            >
              <span>{sortLabel}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>

            {isSortDropdownOpen && (
              <div className="absolute left-0 top-10 z-30 bg-bg-card border border-border rounded-xl shadow-modal py-1.5 w-40 text-txt-primary text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setSortOption('recent');
                    setIsSortDropdownOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left font-medium hover:bg-bg-hover transition-colors ${
                    sortOption === 'recent' ? 'text-primary font-bold' : ''
                  }`}
                >
                  All Notes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSortOption('oldest');
                    setIsSortDropdownOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left font-medium hover:bg-bg-hover transition-colors ${
                    sortOption === 'oldest' ? 'text-primary font-bold' : ''
                  }`}
                >
                  Oldest First
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSortOption('title-asc');
                    setIsSortDropdownOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left font-medium hover:bg-bg-hover transition-colors ${
                    sortOption === 'title-asc' ? 'text-primary font-bold' : ''
                  }`}
                >
                  Title (A-Z)
                </button>
              </div>
            )}
          </div>

          {/* Pinned Toggle Button (OFF by default) */}
          <button
            type="button"
            onClick={() => setIsPinnedOnly((prev) => !prev)}
            className={`h-9 px-3 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
              isPinnedOnly
                ? 'bg-primary text-white font-semibold shadow-xs'
                : 'border border-border bg-bg-card text-txt-secondary hover:text-txt-primary hover:bg-bg-hover font-medium'
            }`}
          >
            <Pin className={`w-3.5 h-3.5 ${isPinnedOnly ? 'fill-white text-white' : ''}`} />
            <span>Pinned</span>
          </button>

          {/* Tags Filter Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsTagDropdownOpen((prev) => !prev);
                setIsSortDropdownOpen(false);
              }}
              className={`h-9 px-3 rounded-xl border text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs ${
                selectedTag
                  ? 'border-primary/50 bg-primary/10 text-primary font-semibold'
                  : 'border border-border bg-bg-card text-txt-secondary hover:text-txt-primary hover:bg-bg-hover font-medium'
              }`}
            >
              <TagIcon className="w-3.5 h-3.5" />
              <span>{selectedTag ? `#${selectedTag}` : 'Tags'}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>

            {isTagDropdownOpen && (
              <div className="absolute left-0 top-10 z-30 bg-bg-card border border-border rounded-xl shadow-modal py-1.5 w-48 max-h-60 overflow-y-auto scrollbar-thin text-txt-primary text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTag(null);
                    setIsTagDropdownOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left font-medium hover:bg-bg-hover flex items-center justify-between transition-colors ${
                    selectedTag === null ? 'text-primary font-bold bg-primary/10' : ''
                  }`}
                >
                  <span>All Tags</span>
                  <span className="text-xs text-txt-muted">{notes.length}</span>
                </button>
                {allTagsWithCount.map(({ tag, count }) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      setSelectedTag(tag);
                      setIsTagDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left font-medium hover:bg-bg-hover flex items-center justify-between transition-colors ${
                      selectedTag === tag ? 'text-primary font-bold bg-primary/10' : ''
                    }`}
                  >
                    <span>#{tag}</span>
                    <span className="text-xs text-txt-muted">{count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reset active tag badge */}
          {selectedTag && (
            <button
              type="button"
              onClick={() => setSelectedTag(null)}
              className="inline-flex items-center gap-1 text-xs text-txt-muted hover:text-txt-primary py-1 px-2 rounded-lg hover:bg-bg-hover transition-colors"
              title="Clear tag filter"
            >
              <X className="w-3 h-3" />
              <span>Clear tag</span>
            </button>
          )}
        </div>

        {/* Right: Grid / List View Toggle */}
        <div className="flex items-center gap-1 bg-bg-card border border-border/80 p-0.5 rounded-xl shadow-2xs">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            title="Grid view"
            aria-label="Grid view"
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-bg-subtle text-primary shadow-xs'
                : 'text-txt-muted hover:text-txt-primary'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            title="List view"
            aria-label="List view"
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
              viewMode === 'list'
                ? 'bg-bg-subtle text-primary shadow-xs'
                : 'text-txt-muted hover:text-txt-primary'
            }`}
          >
            <ListIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Pinned Notes Section (Horizontal Carousel with Drag & Drop) */}
      {pinnedNotes.length > 0 && (
        <PinnedNotesSection
          pinnedNotes={pinnedNotes}
          onSelectNote={onSelectNote}
          onTogglePin={onTogglePin}
          onReorder={onReorderPinnedNotes}
        />
      )}

      {/* Date-Grouped Notes (Today, Yesterday, Older) */}
      {!isPinnedOnly && (
        <div className="space-y-6 pt-2">
          {/* Today Group */}
          {groupedRemainingNotes.today.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-sm font-bold text-txt-primary tracking-tight">
                {groupedRemainingNotes.todayLabel}
              </h3>
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'space-y-2.5'}>
                {groupedRemainingNotes.today.map((note) => (
                  <NoteRow
                    key={note.id}
                    note={note}
                    onSelect={onSelectNote}
                    onTogglePin={onTogglePin}
                    onDeleteRequest={(n) => setNoteToDelete(n)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Yesterday Group */}
          {groupedRemainingNotes.yesterday.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-sm font-bold text-txt-primary tracking-tight">
                {groupedRemainingNotes.yesterdayLabel}
              </h3>
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'space-y-2.5'}>
                {groupedRemainingNotes.yesterday.map((note) => (
                  <NoteRow
                    key={note.id}
                    note={note}
                    onSelect={onSelectNote}
                    onTogglePin={onTogglePin}
                    onDeleteRequest={(n) => setNoteToDelete(n)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Older Group */}
          {groupedRemainingNotes.older.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-sm font-bold text-txt-primary tracking-tight">
                {groupedRemainingNotes.olderLabel}
              </h3>
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'space-y-2.5'}>
                {groupedRemainingNotes.older.map((note) => (
                  <NoteRow
                    key={note.id}
                    note={note}
                    onSelect={onSelectNote}
                    onTogglePin={onTogglePin}
                    onDeleteRequest={(n) => setNoteToDelete(n)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State when no notes match filters */}
      {filteredNotes.length === 0 && (
        <div className="p-10 text-center bg-bg-card border border-border rounded-2xl max-w-md mx-auto my-8 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-bg-subtle text-primary mx-auto flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
          <h4 className="font-serif text-base font-bold text-txt-primary">No notes found</h4>
          <p className="text-xs text-txt-secondary leading-relaxed">
            {selectedTag || isPinnedOnly
              ? 'No notes match the current filters. Try resetting the filters or creating a new note.'
              : 'You have not created any notes yet. Click "+ New Note" above or drop Markdown files here to get started.'}
          </p>
          {(selectedTag || isPinnedOnly) && (
            <button
              type="button"
              onClick={() => {
                setSelectedTag(null);
                setIsPinnedOnly(false);
              }}
              className="mt-2 px-4 py-2 bg-primary text-white text-xs font-semibold rounded-xl hover:bg-primary-hover transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteNoteModal
        isOpen={noteToDelete !== null}
        note={noteToDelete}
        onClose={() => setNoteToDelete(null)}
        onConfirm={() => {
          if (noteToDelete) {
            onDeleteNote(noteToDelete.id);
            setNoteToDelete(null);
          }
        }}
      />
    </div>
  );
};

