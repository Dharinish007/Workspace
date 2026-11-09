import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pin, Code, BookOpen, Target, FileText } from 'lucide-react';
import { Note } from '../../types';

interface PinnedNotesSectionProps {
  pinnedNotes: Note[];
  onSelectNote: (noteId: string) => void;
  onTogglePin: (note: Note) => void;
  onReorder: (orderedIds: string[]) => void;
}

export const PinnedNotesSection: React.FC<PinnedNotesSectionProps> = ({
  pinnedNotes,
  onSelectNote,
  onTogglePin,
  onReorder,
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  if (pinnedNotes.length === 0) return null;

  const handleDragStart = (index: number, e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
    setDraggedIndex(index);
  };

  const handleDragOver = (index: number, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (index: number) => {
    if (dragOverIndex === index) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = (targetIndex: number, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverIndex(null);
    const sourceIndexStr = e.dataTransfer.getData('text/plain');
    const sourceIndex = sourceIndexStr ? parseInt(sourceIndexStr, 10) : draggedIndex;

    setDraggedIndex(null);

    if (sourceIndex === null || isNaN(sourceIndex) || sourceIndex === targetIndex) {
      return;
    }

    const reordered = [...pinnedNotes];
    const [movedNote] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, movedNote);
    onReorder(reordered.map((n) => n.id));
  };

  // Icon badge renderer
  const renderCardIcon = (note: Note) => {
    const titleLower = note.title.toLowerCase();
    const tagsLower = note.tags.map((t: string) => t.toLowerCase());

    if (note.icon === 'Code' || titleLower.includes('spring') || titleLower.includes('code') || tagsLower.includes('java')) {
      return (
        <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-primary border border-primary/20 flex items-center justify-center font-mono text-xs font-bold">
          &lt;/&gt;
        </div>
      );
    }
    if (note.icon === 'BookOpen' || titleLower.includes('rag') || titleLower.includes('concept') || tagsLower.includes('ai')) {
      return (
        <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center">
          <BookOpen className="w-4 h-4" />
        </div>
      );
    }
    if (note.icon === 'Target' || titleLower.includes('goal') || titleLower.includes('plan') || tagsLower.includes('goals')) {
      return (
        <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center">
          <Target className="w-4 h-4" />
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-lg bg-bg-subtle text-txt-secondary border border-border/60 flex items-center justify-center">
        <FileText className="w-4 h-4" />
      </div>
    );
  };

  return (
    <div className="space-y-2.5">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">📌</span>
          <h2 className="text-sm font-bold text-txt-primary tracking-tight">Pinned Notes</h2>
          <span className="text-xs text-txt-muted font-normal">({pinnedNotes.length})</span>
        </div>
        <span className="text-[11px] text-txt-muted hidden sm:inline">Drag to reorder</span>
      </div>

      {/* Horizontal Carousel */}
      <div className="flex items-stretch gap-3.5 overflow-x-auto pb-2 pt-1 px-0.5 scrollbar-thin snap-x scroll-smooth">
        <AnimatePresence mode="popLayout">
          {pinnedNotes.map((note, idx) => {
            const isDragging = draggedIndex === idx;
            const isOver = dragOverIndex === idx;

            return (
              <div
                key={note.id}
                draggable
                onDragStart={(e) => handleDragStart(idx, e)}
                onDragOver={(e) => handleDragOver(idx, e)}
                onDragLeave={() => handleDragLeave(idx)}
                onDrop={(e) => handleDrop(idx, e)}
                onDragEnd={() => {
                  setDraggedIndex(null);
                  setDragOverIndex(null);
                }}
                className="snap-start shrink-0"
              >
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: isDragging ? 0.4 : 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                  onClick={() => onSelectNote(note.id)}
                  className={`w-52 sm:w-56 h-full bg-bg-card border rounded-2xl p-4 shadow-card hover:shadow-card-hover transition-all duration-200 cursor-grab active:cursor-grabbing flex flex-col justify-between select-none group relative ${
                    isOver ? 'border-primary ring-2 ring-primary/30 scale-[1.02]' : 'border-border hover:border-border-interactive'
                  }`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectNote(note.id);
                    }
                  }}
                  aria-label={`Pinned note: ${note.title}`}
                >
                  {/* Top Row: Icon Badge & Pin Icon */}
                  <div className="flex items-start justify-between gap-2">
                    {renderCardIcon(note)}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePin(note);
                      }}
                      title="Unpin note"
                      aria-label="Unpin note"
                      className="w-7 h-7 rounded-lg hover:bg-primary/10 text-primary flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Pin className="w-3.5 h-3.5 fill-primary text-primary" />
                    </button>
                  </div>

                  {/* Title */}
                  <div className="mt-3 mb-2.5">
                    <h3 className="font-bold text-[14px] sm:text-[15px] text-txt-primary group-hover:text-primary transition-colors line-clamp-1 leading-snug">
                      {note.title || 'Untitled Note'}
                    </h3>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-auto pt-1">
                    {note.tags && note.tags.length > 0 ? (
                      note.tags.slice(0, 3).map((tag, tIdx) => (
                        <span
                          key={tIdx}
                          className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-bg-subtle text-txt-secondary border border-border/50 group-hover:border-primary/20 transition-colors"
                        >
                          #{tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-txt-muted italic">No tags</span>
                    )}
                  </div>
                </motion.div>
              </div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};
