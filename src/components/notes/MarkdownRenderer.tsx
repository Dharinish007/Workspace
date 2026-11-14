import React, { useMemo, useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  const renderedContent = useMemo(() => {
    return parseMarkdown(content);
  }, [content]);

  return (
    <div className={`prose-workspace text-txt-primary font-sans leading-relaxed text-[15px] space-y-3.5 select-text ${className}`}>
      {renderedContent.length === 0 ? (
        <p className="text-txt-muted italic text-sm py-4">No content yet. Click Write to start writing in Markdown.</p>
      ) : (
        renderedContent
      )}
    </div>
  );
};

// Lightweight, secure Markdown Parser
function parseMarkdown(md: string): React.ReactNode[] {
  if (!md || !md.trim()) return [];

  const lines = md.split(/\r?\n/);
  const elements: React.ReactNode[] = [];
  let index = 0;

  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBlockLines: string[] = [];

  let inList = false;
  let listType: 'ul' | 'ol' = 'ul';
  let listItems: React.ReactNode[] = [];

  let inBlockquote = false;
  let blockquoteLines: string[] = [];

  const flushCodeBlock = () => {
    if (inCodeBlock) {
      const code = codeBlockLines.join('\n');
      const lang = codeBlockLang;
      elements.push(
        <CodeBlockComponent key={`code-${index++}`} code={code} language={lang} />
      );
      inCodeBlock = false;
      codeBlockLang = '';
      codeBlockLines = [];
    }
  };

  const flushList = () => {
    if (inList) {
      if (listType === 'ul') {
        elements.push(
          <ul key={`list-${index++}`} className="list-disc pl-5 space-y-1.5 my-2.5 text-txt-primary">
            {listItems}
          </ul>
        );
      } else {
        elements.push(
          <ol key={`list-${index++}`} className="list-decimal pl-5 space-y-1.5 my-2.5 text-txt-primary">
            {listItems}
          </ol>
        );
      }
      inList = false;
      listItems = [];
    }
  };

  const flushBlockquote = () => {
    if (inBlockquote) {
      elements.push(
        <blockquote
          key={`quote-${index++}`}
          className="border-l-4 border-primary/70 bg-bg-subtle/50 px-4 py-2.5 rounded-r-xl italic text-txt-secondary my-3.5"
        >
          {blockquoteLines.map((line, lIdx) => (
            <p key={lIdx} className="leading-relaxed">
              {renderInlineMarkdown(line)}
            </p>
          ))}
        </blockquote>
      );
      inBlockquote = false;
      blockquoteLines = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Check code block fences
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        flushCodeBlock();
      } else {
        flushList();
        flushBlockquote();
        inCodeBlock = true;
        codeBlockLang = trimmed.slice(3).trim();
        codeBlockLines = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(rawLine);
      continue;
    }

    // Blockquotes
    if (trimmed.startsWith('>')) {
      flushList();
      if (!inBlockquote) {
        inBlockquote = true;
        blockquoteLines = [];
      }
      blockquoteLines.push(trimmed.replace(/^>\s?/, ''));
      continue;
    } else if (inBlockquote) {
      flushBlockquote();
    }

    // Horizontal rule
    if (/^(---|___|\*\*\*)$/.test(trimmed)) {
      flushList();
      flushBlockquote();
      elements.push(<hr key={`hr-${index++}`} className="border-border my-6" />);
      continue;
    }

    // Headings
    if (trimmed.startsWith('#')) {
      flushList();
      flushBlockquote();
      const match = trimmed.match(/^(#{1,6})\s+(.*)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2];
        const headingContent = renderInlineMarkdown(text);

        switch (level) {
          case 1:
            elements.push(
              <h1 key={`h1-${index++}`} className="font-serif text-2xl sm:text-3xl font-bold text-txt-primary mt-6 mb-3 tracking-tight">
                {headingContent}
              </h1>
            );
            break;
          case 2:
            elements.push(
              <h2 key={`h2-${index++}`} className="font-serif text-xl sm:text-2xl font-bold text-txt-primary mt-5 mb-2.5 tracking-tight border-b border-border/40 pb-1.5">
                {headingContent}
              </h2>
            );
            break;
          case 3:
            elements.push(
              <h3 key={`h3-${index++}`} className="font-serif text-lg sm:text-xl font-bold text-txt-primary mt-4 mb-2 tracking-tight">
                {headingContent}
              </h3>
            );
            break;
          default:
            elements.push(
              <h4 key={`h4-${index++}`} className="font-serif text-base font-bold text-txt-primary mt-3 mb-1.5">
                {headingContent}
              </h4>
            );
            break;
        }
        continue;
      }
    }

    // Checkbox / Task lists: - [ ] or - [x]
    const taskMatch = trimmed.match(/^[-*]\s+\[([ xX])\]\s+(.*)$/);
    if (taskMatch) {
      flushBlockquote();
      const isChecked = taskMatch[1].toLowerCase() === 'x';
      const text = taskMatch[2];
      if (!inList || listType !== 'ul') {
        flushList();
        inList = true;
        listType = 'ul';
      }
      listItems.push(
        <li key={`task-${index++}`} className="list-none -ml-5 flex items-start gap-2.5 my-1">
          <input
            type="checkbox"
            checked={isChecked}
            readOnly
            className="mt-1 w-4 h-4 rounded text-primary focus:ring-0 cursor-default"
          />
          <span className={isChecked ? 'line-through text-txt-muted' : 'text-txt-primary'}>
            {renderInlineMarkdown(text)}
          </span>
        </li>
      );
      continue;
    }

    // Unordered lists
    const ulMatch = trimmed.match(/^[-*+]\s+(.*)$/);
    if (ulMatch) {
      flushBlockquote();
      if (!inList || listType !== 'ul') {
        flushList();
        inList = true;
        listType = 'ul';
      }
      listItems.push(
        <li key={`li-${index++}`}>
          {renderInlineMarkdown(ulMatch[1])}
        </li>
      );
      continue;
    }

    // Ordered lists
    const olMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (olMatch) {
      flushBlockquote();
      if (!inList || listType !== 'ol') {
        flushList();
        inList = true;
        listType = 'ol';
      }
      listItems.push(
        <li key={`li-${index++}`}>
          {renderInlineMarkdown(olMatch[2])}
        </li>
      );
      continue;
    }

    // Regular line / Paragraph
    flushList();
    flushBlockquote();

    if (trimmed === '') {
      continue; // empty blank line
    }

    elements.push(
      <p key={`p-${index++}`} className="leading-relaxed text-txt-primary my-2">
        {renderInlineMarkdown(rawLine)}
      </p>
    );
  }

  flushCodeBlock();
  flushList();
  flushBlockquote();

  return elements;
}

/**
 * Validates URLs in markdown links to prevent XSS via javascript:, vbscript:, data:, blob:, file:, etc.
 * Protects against percent-encoded variants (e.g. javascript%3A), control characters, and protocol-relative URLs.
 * Only http:, https:, mailto:, or safe relative paths are permitted.
 */
export function isSafeUrl(rawUrl: string | null | undefined): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim();
  if (!trimmed) return false;

  // Disallow ASCII control characters, zero-width characters, and non-printable bytes
  if (/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/.test(trimmed)) {
    return false;
  }

  // Iteratively decode percent-encoded characters to prevent scheme obfuscation (e.g. javascript%3A)
  let decoded = trimmed;
  for (let i = 0; i < 3; i++) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      break;
    }
  }

  // Strip whitespace, tabs, newlines, and control chars from decoded string for scheme validation
  const cleanDecoded = decoded.replace(/[\s\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, '').toLowerCase();

  // Block dangerous schemes even if case-altered, encoded, or obfuscated
  if (
    cleanDecoded.startsWith('javascript:') ||
    cleanDecoded.startsWith('vbscript:') ||
    cleanDecoded.startsWith('data:') ||
    cleanDecoded.startsWith('blob:') ||
    cleanDecoded.startsWith('file:')
  ) {
    return false;
  }

  // Allow relative internal anchors and paths (strictly disallowing protocol-relative // and /\)
  if (
    (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.startsWith('/\\')) ||
    trimmed.startsWith('./') ||
    trimmed.startsWith('#')
  ) {
    return true;
  }

  // For external links, validate via WHATWG URL parser without a base URL to prevent treating relative-like payloads as benign
  try {
    const parsed = new URL(trimmed);
    const protocol = parsed.protocol.toLowerCase();
    
    // Explicit whitelist of benign protocols
    return protocol === 'http:' || protocol === 'https:' || protocol === 'mailto:';
  } catch {
    return false;
  }
}

// Inline formatting: Bold, Italic, Underline, Inline Code, Links
function renderInlineMarkdown(text: string): React.ReactNode {
  if (!text) return text;

  // Split by link, code, bold, italic, underline
  const tokens: React.ReactNode[] = [];
  let remaining = text;
  let keyIndex = 0;

  // Regex for inline code: `code`
  // Regex for links: [text](url)
  // Regex for bold: **text**
  // Regex for italic: *text*
  // Regex for underline: <u>text</u>
  // Regex for strikethrough: ~~text~~

  while (remaining.length > 0) {
    // 1. Link [label](url)
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      const label = linkMatch[1];
      const rawUrl = linkMatch[2];
      const safe = isSafeUrl(rawUrl);

      if (safe) {
        tokens.push(
          <a
            key={`link-${keyIndex++}`}
            href={rawUrl.trim()}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary font-semibold hover:underline inline-flex items-center gap-1 group/link"
          >
            <span>{label}</span>
            <ExternalLink className="w-3 h-3 opacity-60 group-hover/link:opacity-100 transition-opacity" />
          </a>
        );
      } else {
        tokens.push(
          <span
            key={`unsafe-link-${keyIndex++}`}
            className="text-txt-secondary line-through font-medium cursor-not-allowed"
            title="Link blocked: unsafe protocol detected"
          >
            {label}
          </span>
        );
      }
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }

    // 2. Inline Code `code`
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      tokens.push(
        <code
          key={`inline-code-${keyIndex++}`}
          className="font-mono text-[13px] bg-bg-subtle text-primary border border-border/70 px-1.5 py-0.5 rounded-md font-semibold"
        >
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // 3. Underline <u>text</u>
    const uMatch = remaining.match(/^<u>(.*?)<\/u>/i);
    if (uMatch) {
      tokens.push(
        <u key={`u-${keyIndex++}`}>
          {renderInlineMarkdown(uMatch[1])}
        </u>
      );
      remaining = remaining.slice(uMatch[0].length);
      continue;
    }

    // 4. Bold **text**
    const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
    if (boldMatch) {
      tokens.push(
        <strong key={`bold-${keyIndex++}`} className="font-bold text-txt-primary">
          {renderInlineMarkdown(boldMatch[1])}
        </strong>
      );
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // 5. Italic *text*
    const italicMatch = remaining.match(/^\*([^*]+)\*/);
    if (italicMatch) {
      tokens.push(
        <em key={`italic-${keyIndex++}`} className="italic">
          {renderInlineMarkdown(italicMatch[1])}
        </em>
      );
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // 6. Strikethrough ~~text~~
    const strikeMatch = remaining.match(/^~~([^~]+)~~/);
    if (strikeMatch) {
      tokens.push(
        <del key={`del-${keyIndex++}`} className="line-through text-txt-muted">
          {renderInlineMarkdown(strikeMatch[1])}
        </del>
      );
      remaining = remaining.slice(strikeMatch[0].length);
      continue;
    }

    // Plain text until next special character ` [ * < ~
    const nextSpecialIndex = remaining.search(/[`[*<~]/);
    if (nextSpecialIndex === -1) {
      tokens.push(remaining);
      break;
    } else if (nextSpecialIndex === 0) {
      // Just a literal symbol that didn't match the regexes above
      tokens.push(remaining[0]);
      remaining = remaining.slice(1);
    } else {
      tokens.push(remaining.slice(0, nextSpecialIndex));
      remaining = remaining.slice(nextSpecialIndex);
    }
  }

  return tokens.length === 1 ? tokens[0] : <>{tokens}</>;
}

// Code Block with syntax aesthetic and Copy button
const CodeBlockComponent: React.FC<{ code: string; language?: string }> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-4 rounded-xl border border-border bg-bg-card/90 overflow-hidden shadow-2xs group">
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-border/60 bg-bg-subtle/60 text-xs font-mono text-txt-muted">
        <span className="uppercase text-[11px] font-semibold tracking-wider">
          {language || 'text'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-bg-hover text-txt-secondary hover:text-txt-primary transition-colors cursor-pointer"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-emerald-500 font-medium">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-[13px] font-mono leading-relaxed text-txt-primary scrollbar-thin">
        <code>{code}</code>
      </pre>
    </div>
  );
};

