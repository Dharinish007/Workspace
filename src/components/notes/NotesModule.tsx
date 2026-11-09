import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Note } from '../../types';
import { NotesOverview } from './NotesOverview';
import { NoteEditor } from './NoteEditor';
import { motion, AnimatePresence } from 'framer-motion';

export const NotesModule: React.FC<{ viewMode?: 'notes' | 'journal-placeholder' }> = ({
  viewMode = 'notes',
}) => {
  const { 
    notes, 
    createNote, 
    updateNote, 
    deleteNote, 
    reorderPinnedNotes, 
    showToast 
  } = useWorkspace();
  const { noteId } = useParams<{ noteId?: string }>();
  const navigate = useNavigate();

  // Find active note if noteId is in route
  const activeNote = useMemo(() => {
    if (!noteId) return null;
    return notes.find((n: Note) => n.id === noteId) || null;
  }, [noteId, notes]);

  // Create new note and navigate to its editor
  const handleCreateNewNote = async () => {
    try {
      const newNote = await createNote({
        title: 'Untitled Note',
        content: '',
        tags: [],
        pinned: false,
      });
      navigate(`/notes/${newNote.id}`);
    } catch (err: any) {
      console.error('Failed to create note:', err);
      showToast('Failed to create note', undefined, undefined, 'error');
    }
  };

  // Toggle pin/unpin
  const handleTogglePin = async (note: Note) => {
    try {
      const nextPinned = !note.pinned;
      await updateNote(note.id, { pinned: nextPinned });
      showToast(nextPinned ? `Pinned "${note.title}"` : `Unpinned "${note.title}"`, undefined, undefined, 'info');
    } catch (err: any) {
      console.error('Failed to toggle pin:', err);
      showToast('Failed to update pin status', undefined, undefined, 'error');
    }
  };

  // Import TXT or Markdown files
  const handleImportNotes = async (files: File[]) => {
    if (!files || files.length === 0) return;

    let importedCount = 0;

    for (const file of files) {
      try {
        const text = await file.text();
        // Determine title from filename without extension
        const filenameWithoutExt = file.name.replace(/\.[^/.]+$/, '').trim() || 'Imported Note';

        // Check if there are hashtags in the content: e.g. #java, #spring
        const hashTags = Array.from(new Set(
          (text.match(/#[a-zA-Z0-9_-]+/g) || [])
            .map((t) => t.slice(1).toLowerCase())
            .filter((t) => t.length > 1 && t.length < 25)
        ));

        await createNote({
          title: filenameWithoutExt,
          content: text,
          tags: hashTags.slice(0, 4),
          pinned: false,
        });
        importedCount++;
      } catch (err) {
        console.error(`Failed to import ${file.name}:`, err);
      }
    }

    if (importedCount > 0) {
      showToast(`Successfully imported ${importedCount} note${importedCount > 1 ? 's' : ''}`, undefined, undefined, 'success');
    } else {
      showToast('Could not import selected files', undefined, undefined, 'error');
    }
  };

  // Placeholder view if someone navigates to /journal
  if (viewMode === 'journal-placeholder') {
    return (
      <div className="p-8 text-center max-w-md mx-auto my-12 bg-bg-card border border-border rounded-2xl shadow-card space-y-3">
        <h2 className="text-lg font-serif font-bold text-txt-primary">Journal Module</h2>
        <p className="text-xs text-txt-secondary leading-relaxed">
          The Journal section is separate from Notes. To capture freeform ideas, documentation, and technical notes, visit My Notes.
        </p>
        <button
          onClick={() => navigate('/notes')}
          className="px-4 py-2 bg-primary text-white text-xs font-semibold rounded-xl hover:bg-primary-hover transition-colors shadow-xs"
        >
          Go to My Notes
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      <AnimatePresence mode="wait">
        {activeNote ? (
          <motion.div
            key={`editor-${activeNote.id}`}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15 }}
          >
            <NoteEditor
              note={activeNote}
              onBack={() => navigate('/notes')}
              onSave={updateNote}
              onDelete={(id) => {
                deleteNote(id);
                navigate('/notes');
              }}
            />
          </motion.div>
        ) : (
          <motion.div
            key="overview"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.15 }}
          >
            <NotesOverview
              notes={notes}
              onSelectNote={(id) => navigate(`/notes/${id}`)}
              onCreateNewNote={handleCreateNewNote}
              onTogglePin={handleTogglePin}
              onDeleteNote={deleteNote}
              onReorderPinnedNotes={reorderPinnedNotes}
              onImportNotes={handleImportNotes}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

