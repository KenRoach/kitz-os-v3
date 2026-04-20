/**
 * Minimal Markdown renderer — zero dependencies, on purpose.
 *
 * Supports the subset Kitz actually emits:
 *   - Fenced code blocks (```lang\ncode\n```) with copy button
 *   - Inline code `like this`
 *   - Headings (#, ##, ###)
 *   - Unordered and ordered lists
 *   - Bold (**), italic (*), strikethrough (~~)
 *   - Links ([label](url)) — only http/https/mailto/tel + relative
 *   - Hard line breaks (blank line = paragraph)
 *
 * Intentionally NOT a full CommonMark renderer. If the user writes raw
 * HTML, it'll be escaped and rendered as text — no XSS surface.
 */

'use client';

import { useState, type ReactNode } from 'react';

const SAFE_URL = /^(https?:\/\/|mailto:|tel:|\/)/i;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Inline pass: bold, italic, strikethrough, code, links. Returns ReactNodes. */
function renderInline(line: string, keyBase: string): ReactNode[] {
  // Tokenize manually so we don't double-process. Order matters: code
  // first to lock the escaped-content boundaries, then links, then
  // bold/italic/strike.
  const out: ReactNode[] = [];
  let i = 0;
  let key = 0;
  const push = (n: ReactNode) => out.push(<span key={`${keyBase}-${key++}`}>{n}</span>);

  while (i < line.length) {
    // Inline code
    if (line[i] === '`') {
      const end = line.indexOf('`', i + 1);
      if (end > i) {
        push(
          <code
            style={{
              background: 'var(--kitz-sunk)',
              border: '1px solid var(--kitz-line)',
              padding: '0 4px',
              fontSize: '0.85em',
              fontFamily: 'var(--kitz-font-mono)',
            }}
          >
            {line.slice(i + 1, end)}
          </code>,
        );
        i = end + 1;
        continue;
      }
    }
    // Link [label](url)
    if (line[i] === '[') {
      const close = line.indexOf(']', i + 1);
      if (close > i && line[close + 1] === '(') {
        const urlEnd = line.indexOf(')', close + 2);
        if (urlEnd > close) {
          const label = line.slice(i + 1, close);
          const url = line.slice(close + 2, urlEnd);
          if (SAFE_URL.test(url)) {
            push(
              <a
                href={url}
                target={url.startsWith('/') ? undefined : '_blank'}
                rel="noopener noreferrer"
                style={{ color: 'var(--kitz-accent-gold)' }}
              >
                {label}
              </a>,
            );
            i = urlEnd + 1;
            continue;
          }
        }
      }
    }
    // Bold **text**
    if (line[i] === '*' && line[i + 1] === '*') {
      const end = line.indexOf('**', i + 2);
      if (end > i + 2) {
        push(<strong>{renderInline(line.slice(i + 2, end), `${keyBase}-b${i}`)}</strong>);
        i = end + 2;
        continue;
      }
    }
    // Italic *text*
    if (line[i] === '*') {
      const end = line.indexOf('*', i + 1);
      if (end > i + 1) {
        push(<em>{renderInline(line.slice(i + 1, end), `${keyBase}-i${i}`)}</em>);
        i = end + 1;
        continue;
      }
    }
    // Strikethrough ~~text~~
    if (line[i] === '~' && line[i + 1] === '~') {
      const end = line.indexOf('~~', i + 2);
      if (end > i + 2) {
        push(<s>{renderInline(line.slice(i + 2, end), `${keyBase}-s${i}`)}</s>);
        i = end + 2;
        continue;
      }
    }
    // Plain text up to next special char
    let next = line.length;
    for (const ch of ['`', '[', '*', '~']) {
      const p = line.indexOf(ch, i);
      if (p !== -1 && p < next) next = p;
    }
    if (next === i) next = i + 1;
    push(line.slice(i, next));
    i = next;
  }
  return out;
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div
      style={{
        margin: '0.5rem 0',
        border: '1px solid var(--kitz-line-strong)',
        background: 'var(--kitz-sunk)',
        position: 'relative',
        fontFamily: 'var(--kitz-font-mono)',
        fontSize: '0.8em',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.25rem 0.6rem',
          borderBottom: '1px solid var(--kitz-line)',
        }}
      >
        <span
          style={{
            fontSize: '0.65rem',
            color: 'var(--kitz-ink-3)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}
        >
          {language || 'code'}
        </span>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(code);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          }}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--kitz-ink-2)',
            fontSize: '0.65rem',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            fontFamily: 'var(--kitz-font-mono)',
            fontWeight: 600,
          }}
        >
          {copied ? '✓ Copiado' : 'Copiar'}
        </button>
      </div>
      <pre
        style={{
          margin: 0,
          padding: '0.6rem 0.75rem',
          overflowX: 'auto',
          whiteSpace: 'pre',
          color: 'var(--kitz-ink)',
        }}
      >
        {code}
      </pre>
    </div>
  );
}

/**
 * Block-level pass. Splits on blank lines, dispatches each block to
 * paragraph / list / heading / fenced-code renderers.
 */
export function Markdown({ source }: { source: string }) {
  const blocks: ReactNode[] = [];
  const lines = source.split('\n');
  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i] ?? '';
    // Fenced code block
    if (line.startsWith('```')) {
      const language = line.slice(3).trim();
      const start = i + 1;
      let end = start;
      while (end < lines.length && !lines[end]!.startsWith('```')) end++;
      const code = lines.slice(start, end).join('\n');
      blocks.push(<CodeBlock key={`md-${key++}`} language={language} code={code} />);
      i = end + 1;
      continue;
    }
    // Heading
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      const level = heading[1]!.length;
      const text = heading[2]!;
      const Tag = (`h${level + 2}`) as 'h3' | 'h4' | 'h5';
      blocks.push(
        <Tag
          key={`md-${key++}`}
          style={{ margin: '0.5rem 0 0.25rem', fontSize: level === 1 ? '1rem' : '0.9rem' }}
        >
          {renderInline(text, `md-h${i}`)}
        </Tag>,
      );
      i++;
      continue;
    }
    // Unordered list (consumes consecutive lines)
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i] ?? '')) {
        items.push((lines[i] ?? '').replace(/^[-*]\s+/, ''));
        i++;
      }
      blocks.push(
        <ul
          key={`md-${key++}`}
          style={{ margin: '0.4rem 0', paddingLeft: '1.25rem' }}
        >
          {items.map((it, idx) => (
            <li key={idx}>{renderInline(it, `md-li${i}-${idx}`)}</li>
          ))}
        </ul>,
      );
      continue;
    }
    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i] ?? '')) {
        items.push((lines[i] ?? '').replace(/^\d+\.\s+/, ''));
        i++;
      }
      blocks.push(
        <ol
          key={`md-${key++}`}
          style={{ margin: '0.4rem 0', paddingLeft: '1.25rem' }}
        >
          {items.map((it, idx) => (
            <li key={idx}>{renderInline(it, `md-oli${i}-${idx}`)}</li>
          ))}
        </ol>,
      );
      continue;
    }
    // Blank line — paragraph break
    if (line.trim() === '') {
      i++;
      continue;
    }
    // Paragraph (joins consecutive non-blank, non-list, non-heading lines)
    const para: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i]!.trim() !== '' &&
      !/^(#{1,3})\s+/.test(lines[i] ?? '') &&
      !/^[-*]\s+/.test(lines[i] ?? '') &&
      !/^\d+\.\s+/.test(lines[i] ?? '') &&
      !lines[i]!.startsWith('```')
    ) {
      para.push(lines[i] ?? '');
      i++;
    }
    blocks.push(
      <p
        key={`md-${key++}`}
        style={{ margin: '0.4rem 0', lineHeight: 1.55 }}
      >
        {renderInline(para.join(' '), `md-p${i}`)}
      </p>,
    );
  }
  return <>{blocks}</>;
}

/**
 * Sniff whether a string contains markdown signals worth rendering.
 * If false, the chat shell can render it as plain text and skip the
 * parser overhead.
 */
export function looksLikeMarkdown(s: string): boolean {
  return (
    /```/.test(s) ||
    /^#{1,3}\s+/m.test(s) ||
    /^[-*]\s+/m.test(s) ||
    /^\d+\.\s+/m.test(s) ||
    /\*\*[^*]+\*\*/.test(s) ||
    /\[[^\]]+\]\([^)]+\)/.test(s) ||
    /`[^`]+`/.test(s)
  );
}
