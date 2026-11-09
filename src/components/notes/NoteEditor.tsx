import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  ArrowLeft, 
  Save, 
  Check, 
  Pin, 
  Tag as TagIcon, 
  Plus, 
  X, 
  PenLine, 
  Eye, 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  List, 
  ListOrdered, 
  Link as LinkIcon, 
  Quote, 
  Code, 
  Heading1, 
  Heading2, 
  Heading3, 
  Maximize2, 
  Minimize2, 
  Download, 
  FileDown, 
  Trash2,
  AlertCircle
} from 'lucide-react';
import { Note } from '../../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { formatEditorTimestamp, formatShortDate, exportNoteAsMarkdown, exportNoteAsText } from './noteUtils';

interface NoteEditorProps {
  note: Note;
  onBack: () => void;
  onSave: (id: string, updates: Partial<Note>) => Promise<Note>;
  onDelete: (id: string) => void;
}

type SaveState = 'saved' | 'saving' | 'error';

export const NoteEditor: React.FC<NoteEditorProps> = ({
  note,
  onBack,
  onSave,
  onDelete,
}) => {
  // Local state for instant responsiveness
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [tags, setTags] = useState<string[]>(note.tags || []);
  const [isPinned, setIsPinned] = useState(note.pinned);
  const [viewTab, setViewTab] = useState<'write' | 'preview'>('write');
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Inline Tag Input state
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const tagInputRef = useRef<HTMLInputElement>(null);

  // Textarea reference for markdown formatting injections
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Autosave timer
  const debounceTimerRef = useRef<number | null>(null);
  const latestDataRef = useRef({ title, content, tags, isPinned });

  useEffect(() => {
    latestDataRef.current = { title, content, tags, isPinned };
  }, [title, content, tags, isPinned]);

  // Sync state if incoming note id changes
  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
    setTags(note.tags || []);
    setIsPinned(note.pinned);
    setSaveState('saved');
  }, [note.id]);

  // Focus tag input when clicked
  useEffect(() => {
    if (isAddingTag) {
      tagInputRef.current?.focus();
    }
  }, [isAddingTag]);

  // Word count calculation
  const wordCount = useMemo(() => {
    const text = content.trim();
    if (!text) return 0;
    return text.split(/\s+/).filter(Boolean).length;
  }, [content]);

  // Perform persistent save
  const persistChanges = useCallback(async (forcedUpdates?: Partial<Note>) => {
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    setSaveState('saving');
    try {
      const payload: Partial<Note> = {
        title: forcedUpdates?.title ?? latestDataRef.current.title,
        content: forcedUpdates?.content ?? latestDataRef.current.content,
        tags: forcedUpdates?.tags ?? latestDataRef.current.tags,
        pinned: forcedUpdates?.pinned ?? latestDataRef.current.isPinned,
        updatedAt: new Date().toISOString(),
      };

      await onSave(note.id, payload);
      setSaveState('saved');
    } catch (err) {
      console.error('Error saving note:', err);
      setSaveState('error');
    }
  }, [note.id, onSave]);

  // Debounced trigger whenever user types
  const triggerDebouncedSave = useCallback(() => {
    setSaveState('saving');
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = window.setTimeout(() => {
      persistChanges();
    }, 800);
  }, [persistChanges]);

  // Flush pending changes on unmount or back
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
        persistChanges();
      }
    };
  }, [persistChanges]);

  const handleBackToNotes = () => {
    if (debounceTimerRef.current) {
      persistChanges();
    }
    onBack();
  };

  // Title change
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    triggerDebouncedSave();
  };

  // Content change
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    triggerDebouncedSave();
  };

  // Pin toggle
  const handleTogglePin = () => {
    const nextPinned = !isPinned;
    setIsPinned(nextPinned);
    persistChanges({ pinned: nextPinned });
  };

  // Tags management
  const handleAddTagSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanTag = newTagInput.trim().replace(/^#+/, '').toLowerCase();
    if (cleanTag && !tags.includes(cleanTag)) {
      const nextTags = [...tags, cleanTag];
      setTags(nextTags);
      persistChanges({ tags: nextTags });
    }
    setNewTagInput('');
    setIsAddingTag(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const nextTags = tags.filter((t) => t !== tagToRemove);
    setTags(nextTags);
    persistChanges({ tags: nextTags });
  };

  // Markdown Toolbar helper to wrap or prepend text
  const applyFormatting = (before: string, after: string = '', defaultPlaceholder: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end) || defaultPlaceholder;

    const replacement = `${before}${selectedText}${after}`;
    const newContent = content.substring(0, start) + replacement + content.substring(end);

    setContent(newContent);
    triggerDebouncedSave();

    // Reset selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + selectedText.length
      );
    }, 10);
  };

  // Prepend line formatting (Headings, lists, quote)
  const applyLinePrefix = (prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    // Find start of current line
    const lastNewline = content.lastIndexOf('\n', start - 1);
    const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;

    const newContent = content.substring(0, lineStart) + prefix + content.substring(lineStart);
    setContent(newContent);
    triggerDebouncedSave();

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 10);
  };

  // Keyboard shortcut listener (Ctrl+S, Ctrl+B, Ctrl+I, Tab)
  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+S / Cmd+S -> Immediate Save
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      persistChanges();
      return;
    }

    // Ctrl+B -> Bold
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      applyFormatting('**', '**', 'bold text');
      return;
    }

    // Ctrl+I -> Italic
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      applyFormatting('*', '*', 'italic text');
      return;
    }

    // Tab -> Indent with 2 spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      const newContent = content.substring(0, start) + '  ' + content.substring(end);
      setContent(newContent);
      triggerDebouncedSave();

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  const createdDateFormatted = formatShortDate(note.createdAt);
  const lastEditedFormatted = formatEditorTimestamp(note.updatedAt);

  return (
    <div
      className={`min-h-full flex flex-col bg-bg-main transition-colors ${
        isFullscreen ? 'fixed inset-0 z-50 p-4 sm:p-8 bg-bg-main overflow-y-auto' : 'p-4 sm:p-6 lg:p-8'
      }`}
    >
      <div className="max-w-4xl w-full mx-auto flex-1 flex flex-col space-y-4">
        {/* Top Bar: Back to Notes, Save State, Save & Export */}
        <div className="flex items-center justify-between gap-3 shrink-0 pb-2 border-b border-border/50">
          {/* Back button */}
          <button
            type="button"
            onClick={handleBackToNotes}
            className="flex items-center gap-2 text-xs font-semibold text-txt-secondary hover:text-txt-primary px-3 py-2 rounded-xl hover:bg-bg-hover transition-colors cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Notes</span>
          </button>

          {/* Right: Autosave status & Actions */}
          <div className="flex items-center gap-3">
            {/* Auto-saved status indicator */}
            <div className="flex items-center gap-1.5 text-xs select-none">
              {saveState === 'saving' && (
                <>
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-amber-600 dark:text-amber-400 font-medium">Saving...</span>
                </>
              )}
              {saveState === 'saved' && (
                <>
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Auto-saved</span>
                </>
              )}
              {saveState === 'error' && (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                  <span className="text-red-500 font-medium">Error saving</span>
                </>
              )}
            </div>

            {/* Manual Save Button */}
            <button
              type="button"
              onClick={() => persistChanges()}
              className="h-9 px-4 rounded-xl bg-[#2F6FDB] hover:bg-[#225BC0] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              title="Save note (Ctrl+S)"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>
          </div>
        </div>

        {/* Note Custom Title */}
        <div className="mt-2">
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder="Note title..."
            className="w-full bg-transparent font-serif text-2xl sm:text-3xl font-bold text-txt-primary border-none outline-none placeholder:text-txt-muted/50 tracking-tight"
          />
        </div>

        {/* Tags Bar & Pin Toggle */}
        <div className="flex items-center justify-between gap-3 flex-wrap py-2 border-b border-border/40">
          {/* Tags list */}
          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
            <TagIcon className="w-4 h-4 text-txt-muted shrink-0" />

            {/* Existing tag pills */}
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-primary/10 text-primary border border-primary/20 group select-none"
              >
                <span>#{tag}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-red-500 rounded-xs transition-colors cursor-pointer"
                  title={`Remove #${tag}`}
                  aria-label={`Remove tag ${tag}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {/* Inline tag adder */}
            {isAddingTag ? (
              <form onSubmit={handleAddTagSubmit} className="inline-flex items-center gap-1">
                <input
                  ref={tagInputRef}
                  type="text"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onBlur={() => {
                    if (newTagInput.trim()) {
                      handleAddTagSubmit();
                    } else {
                      setIsAddingTag(false);
                    }
                  }}
                  placeholder="tag name..."
                  className="h-7 w-24 px-2 text-xs rounded-lg bg-bg-card border border-primary/50 text-txt-primary outline-none focus:ring-1 focus:ring-primary"
                />
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setIsAddingTag(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-txt-secondary hover:text-primary border border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add Tag</span>
              </button>
            )}
          </div>

          {/* Pin toggle */}
          <button
            type="button"
            onClick={handleTogglePin}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-colors cursor-pointer ${
              isPinned
                ? 'bg-primary/15 text-primary border border-primary/30 font-semibold'
                : 'text-txt-secondary hover:text-txt-primary border border-border hover:bg-bg-hover font-medium'
            }`}
          >
            <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-primary text-primary' : ''}`} />
            <span>{isPinned ? 'Pinned' : 'Pin'}</span>
          </button>
        </div>

        {/* Write / Preview Tab Bar & Word Count */}
        <div className="flex items-center justify-between border-b border-border/60 pb-2">
          {/* Tab buttons */}
          <div className="flex items-center gap-1.5 bg-bg-card/70 border border-border/70 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewTab('write')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewTab === 'write'
                  ? 'bg-bg-card text-primary shadow-xs border border-border'
                  : 'text-txt-secondary hover:text-txt-primary'
              }`}
            >
              <PenLine className="w-3.5 h-3.5" />
              <span>Write</span>
            </button>
            <button
              type="button"
              onClick={() => setViewTab('preview')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewTab === 'preview'
                  ? 'bg-bg-card text-primary shadow-xs border border-border'
                  : 'text-txt-secondary hover:text-txt-primary'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>
          </div>

          {/* Word Count */}
          <div className="text-xs text-txt-muted font-medium select-none">
            Words: {wordCount}
          </div>
        </div>

        {/* Markdown Toolbar (only in Write mode) */}
        {viewTab === 'write' && (
          <div className="flex items-center gap-1 flex-wrap p-1.5 bg-bg-card border border-border rounded-xl shadow-2xs text-txt-secondary">
            <button
              type="button"
              onClick={() => applyFormatting('**', '**', 'bold text')}
              title="Bold (Ctrl+B)"
              className="w-8 h-8 rounded-lg hover:bg-bg-hover hover:text-txt-primary flex items-center justify-center transition-colors cursor-pointer"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => applyFormatting('*', '*', 'italic text')}
              title="Italic (Ctrl+I)"
              className="w-8 h-8 rounded-lg hover:bg-bg-hover hover:text-txt-primary flex items-center justify-center transition-colors cursor-pointer"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => applyFormatting('<u>', '</u>', 'underlined text')}
              title="Underline"
              className="w-8 h-8 rounded-lg hover:bg-bg-hover hover:text-txt-primary flex items-center justify-center transition-colors cursor-pointer"
            >
              <UnderlineIcon className="w-4 h-4" />
            </button>

            <div className="w-[1px] h-4 bg-border/80 mx-1" />

            <button
              type="button"
              onClick={() => applyLinePrefix('- ')}
              title="Bulleted List"
              className="w-8 h-8 rounded-lg hover:bg-bg-hover hover:text-txt-primary flex items-center justify-center transition-colors cursor-pointer"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => applyLinePrefix('1. ')}
              title="Numbered List"
              className="w-8 h-8 rounded-lg hover:bg-bg-hover hover:text-txt-primary flex items-center justify-center transition-colors cursor-pointer"
            >
              <ListOrdered className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => applyFormatting('[', '](https://example.com)', 'link text')}
              title="Add Link"
              className="w-8 h-8 rounded-lg hover:bg-bg-hover hover:text-txt-primary flex items-center justify-center transition-colors cursor-pointer"
            >
              <LinkIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => applyLinePrefix('> ')}
              title="Quote"
              className="w-8 h-8 rounded-lg hover:bg-bg-hover hover:text-txt-primary flex items-center justify-center transition-colors cursor-pointer"
            >
              <Quote className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => applyFormatting('`', '`', 'code')}
              title="Inline Code"
              className="w-8 h-8 rounded-lg hover:bg-bg-hover hover:text-txt-primary flex items-center justify-center font-mono text-xs font-bold transition-colors cursor-pointer"
            >
              &lt;/&gt;
            </button>

            <div className="w-[1px] h-4 bg-border/80 mx-1" />

            <button
              type="button"
              onClick={() => applyLinePrefix('# ')}
              title="Heading 1"
              className="px-2 h-8 rounded-lg hover:bg-bg-hover hover:text-txt-primary flex items-center justify-center font-serif text-xs font-bold transition-colors cursor-pointer"
            >
              H1
            </button>
            <button
              type="button"
              onClick={() => applyLinePrefix('## ')}
              title="Heading 2"
              className="px-2 h-8 rounded-lg hover:bg-bg-hover hover:text-txt-primary flex items-center justify-center font-serif text-xs font-bold transition-colors cursor-pointer"
            >
              H2
            </button>
            <button
              type="button"
              onClick={() => applyLinePrefix('### ')}
              title="Heading 3"
              className="px-2 h-8 rounded-lg hover:bg-bg-hover hover:text-txt-primary flex items-center justify-center font-serif text-xs font-bold transition-colors cursor-pointer"
            >
              H3
            </button>

            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={() => exportNoteAsMarkdown(note)}
                title="Export as Markdown (.md)"
                className="w-8 h-8 rounded-lg hover:bg-bg-hover hover:text-txt-primary flex items-center justify-center transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => exportNoteAsText(note)}
                title="Export as Text (.txt)"
                className="w-8 h-8 rounded-lg hover:bg-bg-hover hover:text-txt-primary flex items-center justify-center transition-colors cursor-pointer"
              >
                <FileDown className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsFullscreen((prev) => !prev)}
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                className="w-8 h-8 rounded-lg hover:bg-bg-hover hover:text-txt-primary flex items-center justify-center transition-colors cursor-pointer"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        {/* Content Body: Write Textarea or Markdown Preview */}
        <div className="flex-1 bg-bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-card min-h-[420px] flex flex-col">
          {viewTab === 'write' ? (
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleContentChange}
              onKeyDown={handleTextareaKeyDown}
              placeholder="Start typing your note in Markdown... Use toolbar or Markdown shortcuts like # for headings, - for lists, **bold**."
              className="flex-1 w-full bg-transparent border-none outline-none resize-none font-sans text-[15px] sm:text-base leading-relaxed text-txt-primary placeholder:text-txt-muted/50 scrollbar-thin"
            />
          ) : (
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              <MarkdownRenderer content={content} />
            </div>
          )}
        </div>

        {/* Bottom Footer: Timestamps & Auto-saving pill */}
        <div className="flex items-center justify-between pt-2 pb-4 text-xs text-txt-muted select-none">
          <div>
            Created {createdDateFormatted} · Last edited {lastEditedFormatted}
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium text-[11px]">
            <Check className="w-3 h-3 text-emerald-500" />
            <span>Auto-saving</span>
          </div>
        </div>
      </div>
    </div>
  );
};

