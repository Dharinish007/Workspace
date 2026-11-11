import { DateFormatOption } from '../types/settings';

/**
 * Formats a YYYY-MM-DD date string into the user's preferred display format.
 */
export function formatDisplayDate(dateStr: string | null | undefined, format: DateFormatOption = 'YYYY-MM-DD'): string {
  if (!dateStr) return '';
  const parts = dateStr.trim().split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  switch (format) {
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`;
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'YYYY-MM-DD':
    default:
      return `${year}-${month}-${day}`;
  }
}

/**
 * Formats an ISO datetime string into human readable date in the selected format.
 */
export function formatDisplayDateTime(isoStr: string | null | undefined, format: DateFormatOption = 'YYYY-MM-DD'): string {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const formattedDate = formatDisplayDate(`${year}-${month}-${day}`, format);
    return `${formattedDate} ${timeStr}`;
  } catch {
    return isoStr;
  }
}

