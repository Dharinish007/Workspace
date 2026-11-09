import { Note } from '../../types';

// Strip Markdown formatting for clean 1-line previews
export function stripMarkdown(md: string): string {
  if (!md) return '';
  return md
    .replace(/^#+\s+/gm, '') // headings
    .replace(/\*\*(.*?)\*\*/g, '$1') // bold
    .replace(/\*(.*?)\*/g, '$1') // italic
    .replace(/<u>(.*?)<\/u>/gi, '$1') // underline
    .replace(/~~(.*?)~~/g, '$1') // strike
    .replace(/`([^`]+)`/g, '$1') // inline code
    .replace(/```[\s\S]*?```/g, '') // code blocks
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
    .replace(/^>\s+/gm, '') // blockquotes
    .replace(/^[-*+]\s+/gm, '') // list items
    .replace(/^\d+\.\s+/gm, '') // ordered list
    .replace(/\n+/g, ' ') // collapse line breaks
    .trim();
}

// Format time for notes list row: "9:15 AM", "8:42 PM", or "Nov 4"
export function formatNoteRowTimestamp(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();

    const isToday =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();

    const yesterday = new Date(now.getTime() - 86400000);
    const isYesterday =
      date.getFullYear() === yesterday.getFullYear() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getDate() === yesterday.getDate();

    if (isToday || isYesterday) {
      return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(date);
    }

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch {
    return '';
  }
}

// Format for Editor footer: "Today, 9:20 AM", "Yesterday, 8:42 PM", "Nov 5, 2:30 PM"
export function formatEditorTimestamp(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();

    const isToday =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();

    const yesterday = new Date(now.getTime() - 86400000);
    const isYesterday =
      date.getFullYear() === yesterday.getFullYear() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getDate() === yesterday.getDate();

    const timeStr = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);

    if (isToday) return `Today, ${timeStr}`;
    if (isYesterday) return `Yesterday, ${timeStr}`;

    const dateStr = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(date);

    return `${dateStr}, ${timeStr}`;
  } catch {
    return '';
  }
}

// Short date: "Nov 5"
export function formatShortDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch {
    return '';
  }
}

export interface GroupedNotes {
  today: Note[];
  yesterday: Note[];
  older: Note[];
  todayLabel: string;
  yesterdayLabel: string;
  olderLabel: string;
}

// Group notes by last-modified date: Today, Yesterday, and Older
export function groupNotesByLastModified(notes: Note[]): GroupedNotes {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86400000;

  const todayLabel = `Today · ${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(now)}`;
  const yesterdayLabel = `Yesterday · ${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(now.getTime() - 86400000))}`;

  const today: Note[] = [];
  const yesterday: Note[] = [];
  const older: Note[] = [];

  notes.forEach((note) => {
    const noteTime = new Date(note.updatedAt).getTime();
    if (noteTime >= todayStart) {
      today.push(note);
    } else if (noteTime >= yesterdayStart) {
      yesterday.push(note);
    } else {
      older.push(note);
    }
  });

  // Sort each group by updatedAt descending
  const sortByRecent = (a: Note, b: Note) => b.updatedAt.localeCompare(a.updatedAt);
  today.sort(sortByRecent);
  yesterday.sort(sortByRecent);
  older.sort(sortByRecent);

  return {
    today,
    yesterday,
    older,
    todayLabel,
    yesterdayLabel,
    olderLabel: 'Older',
  };
}

// Download helpers
export function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportNoteAsMarkdown(note: Note) {
  const cleanTitle = (note.title || 'untitled').replace(/[/\\?%*:|"<>]/g, '_').trim();
  downloadFile(`${cleanTitle}.md`, note.content, 'text/markdown;charset=utf-8');
}

export function exportNoteAsText(note: Note) {
  const cleanTitle = (note.title || 'untitled').replace(/[/\\?%*:|"<>]/g, '_').trim();
  const plainText = stripMarkdown(note.content);
  downloadFile(`${cleanTitle}.txt`, plainText, 'text/plain;charset=utf-8');
}

