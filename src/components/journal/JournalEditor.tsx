import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { JournalEntry, JournalMood } from '../../types';
import { 
  ArrowLeft, 
  Sparkles, 
  RefreshCw, 
  Tag as TagIcon, 
  X, 
  Bold, 
  Italic, 
  Heading, 
  List, 
  Quote, 
  Code, 
  Eye, 
  Edit3, 
  Download, 
  Check, 
  AlertCircle 
} from 'lucide-react';

const WRITING_PROMPTS = [
  "What went well today, and what can be better tomorrow?",
  "What is one small win you achieved today that made you proud?",
  "What was the most meaningful interaction or conversation you had today?",
  "What is currently on your mind that you need to let go of?",
  "Describe a moment today when you felt calm, energized, or fully present.",
  "What is one challenge you faced today, and how did you approach it?",
  "What are three things you are genuinely grateful for right now?",
  "What is one lesson today taught you about your goals or priorities?",
  "If you could relive one hour of today, which one would it be and why?",
  "What is the single most important focus for your tomorrow?"
];

const MOODS: { id: JournalMood; face: string; label: string }[] = [
  { id: 'terrible', face: '😢', label: 'Terrible' },
  { id: 'bad', face: '🙁', label: 'Down' },
  { id: 'neutral', face: '😐', label: 'Okay' },
  { id: 'good', face: '🙂', label: 'Good' },
  { id: 'great', face: '😄', label: 'Great' },
];

interface JournalEditorProps {
  date: string;
  onBack: () => void;
}

export const JournalEditor: React.FC<JournalEditorProps> = ({ date, onBack }) => {
  const { journalEntries, saveJournalEntry, createOrGetJournalEntry } = useWorkspace();

  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [mood, setMood] = useState<JournalMood | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);

  // Active view: write vs preview
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');

  // Autosave status: 'saved' | 'saving' | 'error'
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');

  // Prompts
  const [promptIndex, setPromptIndex] = useState(0);

  // Download menu
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autosaveTimerRef = useRef<number | null>(null);
  const isInitialLoadRef = useRef(true);

  // Load or create entry for this date
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const found = await createOrGetJournalEntry(date);
        if (isMounted && found) {
          setEntry(found);
          setTitle(found.title || '');
          setBody(found.body || '');
          setMood(found.mood || null);
          setTags(found.tags || []);
          isInitialLoadRef.current = false;
        }
      } catch (err) {
        console.error('Failed to load journal entry:', err);
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, [date, createOrGetJournalEntry]);

  // All previously used tags across all journal entries for quick reuse
  const allExistingTags = useMemo(() => {
    const set = new Set<string>();
    journalEntries.forEach(item => {
      if (item.tags) {
        item.tags.forEach(t => set.add(t));
      }
    });
    return Array.from(set);
  }, [journalEntries]);

  // Word count
  const wordCount = useMemo(() => {
    const text = body.trim();
    if (!text) return 0;
    return text.split(/\s+/).length;
  }, [body]);

  // Formatted date string, e.g. "Nov 7, 2026 (Today)"
  const formattedDateString = useMemo(() => {
    const [y, m, d] = date.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const isToday = new Date().toDateString() === dateObj.toDateString();
    const str = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(dateObj);
    return `${str}${isToday ? ' (Today)' : ''}`;
  }, [date]);

  // Perform save to IndexedDB
  const performSave = useCallback(async (
    currentTitle: string, 
    currentBody: string, 
    currentMood: JournalMood | null, 
    currentTags: string[]
  ) => {
    if (!entry) return;
    setSaveStatus('saving');
    try {
      const updated: JournalEntry = {
        ...entry,
        title: currentTitle.trim() ? currentTitle.trim() : null,
        body: currentBody,
        mood: currentMood,
        tags: currentTags,
        updatedAt: new Date().toISOString()
      };
      await saveJournalEntry(updated);
      setEntry(updated);
      setSaveStatus('saved');
    } catch (err) {
      console.error('Failed to autosave journal entry:', err);
      setSaveStatus('error');
    }
  }, [entry, saveJournalEntry]);

  // Autosave with 500ms debounce
  const scheduleAutosave = useCallback((
    newTitle: string, 
    newBody: string, 
    newMood: JournalMood | null, 
    newTags: string[]
  ) => {
    if (isInitialLoadRef.current) return;
    setSaveStatus('saving');
    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
    }
    autosaveTimerRef.current = window.setTimeout(() => {
      performSave(newTitle, newBody, newMood, newTags);
    }, 500);
  }, [performSave]);

  // Cleanup pending autosave on unmount
  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
      }
    };
  }, []);

  // Keyboard shortcut: Escape returns to list (single-key shortcuts never fire while typing)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack]);

  // Form field handlers
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    scheduleAutosave(val, body, mood, tags);
  };

  const handleBodyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setBody(val);
    scheduleAutosave(title, val, mood, tags);
  };

  const handleMoodSelect = (selectedMood: JournalMood) => {
    const newMood = mood === selectedMood ? null : selectedMood;
    setMood(newMood);
    scheduleAutosave(title, body, newMood, tags);
  };

  const handleAddTag = (rawTag: string) => {
    const clean = rawTag.trim().toLowerCase().replace(/^#/, '');
    if (clean && !tags.includes(clean)) {
      const newTags = [...tags, clean];
      setTags(newTags);
      setTagInput('');
      setIsTagDropdownOpen(false);
      scheduleAutosave(title, body, mood, newTags);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = tags.filter(t => t !== tagToRemove);
    setTags(newTags);
    scheduleAutosave(title, body, mood, newTags);
  };

  // Formatting helpers for Toolbar
  const insertFormatting = (prefix: string, suffix: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = body.substring(start, end);
    const replacement = `${prefix}${selectedText || 'text'}${suffix}`;

    const newBody = body.substring(0, start) + replacement + body.substring(end);
    setBody(newBody);
    scheduleAutosave(title, newBody, mood, tags);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selectedText.length || 4));
    }, 10);
  };

  const handleInsertHeading = () => {
    insertFormatting('### ');
  };

  const handleInsertList = () => {
    insertFormatting('- ');
  };

  const handleInsertQuote = () => {
    insertFormatting('> ');
  };

  const handleInsertCode = () => {
    if (body.includes('\n')) {
      insertFormatting('```\n', '\n```');
    } else {
      insertFormatting('`', '`');
    }
  };

  // Download export helper
  const handleDownload = (format: 'md' | 'txt') => {
    setIsDownloadOpen(false);
    const dateStr = date;
    const displayTitle = title.trim() || dateStr;
    let content = '';

    if (format === 'md') {
      content = `# ${displayTitle}\n\n`;
      content += `**Date:** ${dateStr}\n`;
      if (mood) content += `**Mood:** ${mood}\n`;
      if (tags.length > 0) content += `**Tags:** ${tags.map(t => `#${t}`).join(' ')}\n`;
      content += `\n---\n\n${body}\n`;
    } else {
      content = `${displayTitle}\nDate: ${dateStr}\n`;
      if (mood) content += `Mood: ${mood}\n`;
      if (tags.length > 0) content += `Tags: ${tags.join(', ')}\n`;
      content += `\n${body}\n`;
    }

    const blob = new Blob([content], { type: format === 'md' ? 'text/markdown' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `journal-${dateStr}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Markdown renderer for Preview tab
  const renderMarkdownPreview = (text: string) => {
    if (!text.trim()) {
      return (
        <p className="text-txt-muted italic">No content yet. Start writing your thoughts...</p>
      );
    }

    const lines = text.split('\n');
    return (
      <div className="space-y-3 leading-relaxed text-txt-primary">
        {lines.map((line, idx) => {
          if (line.startsWith('### ')) {
            return <h3 key={idx} className="text-lg font-bold font-serif text-txt-primary mt-4 mb-2">{line.replace('### ', '')}</h3>;
          }
          if (line.startsWith('## ')) {
            return <h2 key={idx} className="text-xl font-bold font-serif text-txt-primary mt-5 mb-2">{line.replace('## ', '')}</h2>;
          }
          if (line.startsWith('# ')) {
            return <h1 key={idx} className="text-2xl font-bold font-serif text-txt-primary mt-6 mb-3">{line.replace('# ', '')}</h1>;
          }
          if (line.startsWith('> ')) {
            return (
              <blockquote key={idx} className="border-l-4 border-primary pl-4 py-1 italic text-txt-secondary bg-primary/5 rounded-r">
                {line.replace('> ', '')}
              </blockquote>
            );
          }
          if (line.startsWith('- ') || line.startsWith('* ')) {
            return (
              <li key={idx} className="ml-5 list-disc text-txt-primary">
                {line.substring(2)}
              </li>
            );
          }
          if (line.startsWith('```')) {
            return null;
          }
          if (!line.trim()) {
            return <div key={idx} className="h-2" />;
          }
          return <p key={idx}>{line}</p>;
        })}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      {/* Top Header Row */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        {/* Back Button */}
        <button
          onClick={onBack}
          aria-label="Back to Journal list"
          className="flex items-center gap-2 text-sm font-semibold text-txt-secondary hover:text-primary transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Journal</span>
        </button>

        {/* Right Controls: Word count, Auto-saved status, Download */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Word count */}
          <span className="text-xs text-txt-muted font-medium">
            {wordCount} {wordCount === 1 ? 'word' : 'words'}
          </span>

          {/* Autosave Status */}
          <div className="flex items-center text-xs">
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1.5 text-txt-muted">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span>Saving…</span>
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Auto-saved</span>
              </span>
            )}
            {saveStatus === 'error' && (
              <button
                onClick={() => performSave(title, body, mood, tags)}
                className="flex items-center gap-1 text-red-500 hover:underline font-medium cursor-pointer"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Save failed (Retry)</span>
              </button>
            )}
          </div>

          {/* Download Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsDownloadOpen(prev => !prev)}
              title="Download entry"
              aria-label="Download entry"
              className="px-3 py-1.5 rounded-xl border border-border bg-bg-card hover:bg-bg-hover text-txt-secondary hover:text-txt-primary text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>

            {isDownloadOpen && (
              <div className="absolute right-0 mt-1.5 w-36 bg-bg-card border border-border rounded-xl shadow-modal py-1 z-30 text-xs">
                <button
                  onClick={() => handleDownload('md')}
                  className="w-full text-left px-3 py-2 hover:bg-bg-hover text-txt-primary flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span>Download .md</span>
                  <span className="text-[10px] text-txt-muted">Markdown</span>
                </button>
                <button
                  onClick={() => handleDownload('txt')}
                  className="w-full text-left px-3 py-2 hover:bg-bg-hover text-txt-primary flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span>Download .txt</span>
                  <span className="text-[10px] text-txt-muted">Text</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Date Header */}
      <div className="flex items-center gap-2 text-xs font-semibold text-txt-secondary">
        <span>📅</span>
        <span>{formattedDateString}</span>
      </div>

      {/* Prompt Card: Placed ABOVE Title */}
      <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>Need a prompt?</span>
          </div>
          <p className="text-sm font-medium text-txt-primary italic">
            "{WRITING_PROMPTS[promptIndex]}"
          </p>
        </div>

        <button
          onClick={() => setPromptIndex(prev => (prev + 1) % WRITING_PROMPTS.length)}
          className="self-start sm:self-center shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-primary/30 bg-bg-card hover:bg-primary/10 text-primary text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Change prompt</span>
        </button>
      </div>

      {/* Title Input: Optional (store null, display date) */}
      <div>
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder="Title (optional)"
          className="w-full text-2xl sm:text-3xl font-serif font-bold text-txt-primary bg-transparent placeholder:text-txt-muted/50 border-none outline-none focus:ring-0 px-0"
        />
      </div>

      {/* Meta Row: Mood Faces (5 inline, one tap) & Tags */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-1 pb-2">
        {/* Mood Selector: 5 faces inline, one tap */}
        <div className="flex items-center gap-1.5 bg-bg-card border border-border rounded-xl px-2.5 py-1.5 shadow-2xs">
          <span className="text-xs text-txt-muted hidden sm:inline mr-1">Mood:</span>
          {MOODS.map(m => {
            const isSelected = mood === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => handleMoodSelect(m.id)}
                title={m.label}
                aria-label={`Select mood: ${m.label}`}
                className={`w-7 h-7 rounded-lg text-base flex items-center justify-center transition-all cursor-pointer ${
                  isSelected 
                    ? 'bg-primary/20 scale-110 ring-2 ring-primary' 
                    : 'hover:bg-bg-hover opacity-70 hover:opacity-100'
                }`}
              >
                {m.face}
              </button>
            );
          })}
        </div>

        {/* Tags Section */}
        <div className="flex flex-wrap items-center gap-1.5 relative">
          {tags.map(tag => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-primary/10 text-primary border border-primary/20"
            >
              <span>#{tag}</span>
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                aria-label={`Remove tag ${tag}`}
                className="hover:text-red-500 transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          {/* Add Tag Input */}
          <div className="relative">
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-dashed border-border bg-bg-card focus-within:border-primary text-xs">
              <TagIcon className="w-3 h-3 text-txt-muted" />
              <input
                type="text"
                value={tagInput}
                onChange={e => {
                  setTagInput(e.target.value);
                  setIsTagDropdownOpen(true);
                }}
                onFocus={() => setIsTagDropdownOpen(true)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    handleAddTag(tagInput);
                  }
                }}
                placeholder="Add tag..."
                className="w-20 bg-transparent border-none outline-none text-txt-primary placeholder:text-txt-muted"
              />
            </div>

            {/* Existing Tag Suggestions Dropdown */}
            {isTagDropdownOpen && allExistingTags.filter(t => !tags.includes(t) && t.includes(tagInput.toLowerCase())).length > 0 && (
              <div className="absolute left-0 mt-1 w-36 bg-bg-card border border-border rounded-xl shadow-modal py-1 z-30 text-xs max-h-36 overflow-y-auto">
                <div className="px-2 py-1 text-[10px] uppercase font-bold text-txt-muted tracking-wider">
                  Reuse tags
                </div>
                {allExistingTags
                  .filter(t => !tags.includes(t) && t.includes(tagInput.toLowerCase()))
                  .slice(0, 6)
                  .map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleAddTag(t)}
                      className="w-full text-left px-2.5 py-1 hover:bg-bg-hover text-txt-primary transition-colors cursor-pointer"
                    >
                      #{t}
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Editor Container */}
      <div className="bg-bg-card border border-border rounded-2xl shadow-card overflow-hidden">
        {/* Toolbar: Bold, Italic, Heading, List, Quote, Code, Write/Preview toggle */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-bg-subtle/50">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => insertFormatting('**', '**')}
              title="Bold"
              aria-label="Bold"
              className="w-8 h-8 rounded-lg hover:bg-bg-hover text-txt-secondary hover:text-txt-primary flex items-center justify-center transition-colors cursor-pointer"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('*', '*')}
              title="Italic"
              aria-label="Italic"
              className="w-8 h-8 rounded-lg hover:bg-bg-hover text-txt-secondary hover:text-txt-primary flex items-center justify-center transition-colors cursor-pointer"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleInsertHeading}
              title="Heading"
              aria-label="Heading"
              className="w-8 h-8 rounded-lg hover:bg-bg-hover text-txt-secondary hover:text-txt-primary flex items-center justify-center transition-colors cursor-pointer"
            >
              <Heading className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleInsertList}
              title="Bulleted List"
              aria-label="Bulleted List"
              className="w-8 h-8 rounded-lg hover:bg-bg-hover text-txt-secondary hover:text-txt-primary flex items-center justify-center transition-colors cursor-pointer"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleInsertQuote}
              title="Quote"
              aria-label="Quote"
              className="w-8 h-8 rounded-lg hover:bg-bg-hover text-txt-secondary hover:text-txt-primary flex items-center justify-center transition-colors cursor-pointer"
            >
              <Quote className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleInsertCode}
              title="Code Block"
              aria-label="Code Block"
              className="w-8 h-8 rounded-lg hover:bg-bg-hover text-txt-secondary hover:text-txt-primary flex items-center justify-center transition-colors cursor-pointer"
            >
              <Code className="w-4 h-4" />
            </button>
          </div>

          {/* Write / Preview Toggle */}
          <div className="flex items-center gap-1 bg-bg-card border border-border p-0.5 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('write')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'write'
                  ? 'bg-primary text-white shadow-2xs'
                  : 'text-txt-secondary hover:text-txt-primary'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Write</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-primary text-white shadow-2xs'
                  : 'text-txt-secondary hover:text-txt-primary'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>
          </div>
        </div>

        {/* Editor Body */}
        <div className="p-4 sm:p-6 min-h-[360px]">
          {activeTab === 'write' ? (
            <textarea
              ref={textareaRef}
              value={body}
              onChange={handleBodyChange}
              placeholder="Start writing your thoughts..."
              rows={14}
              className="w-full bg-transparent border-none outline-none focus:ring-0 text-txt-primary placeholder:text-txt-muted leading-relaxed font-sans text-sm sm:text-base resize-none"
            />
          ) : (
            <div className="min-h-[300px]">
              {renderMarkdownPreview(body)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

