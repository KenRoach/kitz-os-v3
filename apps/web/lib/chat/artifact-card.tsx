/**
 * ArtifactCard — clickable inline reference to a workspace artifact.
 *
 * Renders inside Kitz chat replies when the message references a real
 * thing (contact, deal, event, invoice, document, agent). Acts as
 * deeplink + at-a-glance summary so the user can jump to the source
 * without leaving context.
 *
 * Detection: Kitz reply text can include inline tags like
 *   [[artifact:contact:abc-123|Jaime Madrid]]
 *   [[artifact:invoice:xyz-789|COT-2026-0001 · $2140]]
 *   [[artifact:event:evt-555|Reunión ProWall · 10:00]]
 * which renderArtifactReferences() pulls out and replaces with cards.
 *
 * The deeplink href map keeps the chat shell decoupled from route
 * structure — when routes change, this is the one place to update.
 */

'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

export type ArtifactKind =
  | 'contact'
  | 'deal'
  | 'event'
  | 'invoice'
  | 'document'
  | 'agent'
  | 'skill';

export type ArtifactRef = {
  kind: ArtifactKind;
  id: string;
  label: string;
};

const KIND_GLYPH: Record<ArtifactKind, string> = {
  contact: '◉',
  deal: '◈',
  event: '◷',
  invoice: '⌘',
  document: '▤',
  agent: '◬',
  skill: '✦',
};

const KIND_LABEL: Record<ArtifactKind, string> = {
  contact: 'Cliente',
  deal: 'Trato',
  event: 'Cita',
  invoice: 'Cotización',
  document: 'Documento',
  agent: 'Agente',
  skill: 'Skill',
};

const KIND_HREF: Record<ArtifactKind, (id: string) => string> = {
  contact: () => '/workspace/contactos',
  deal: () => '/workspace/ventas',
  event: () => '/workspace/calendario',
  invoice: () => '/workspace/cotizaciones',
  document: () => '/workspace/canvas/documentos',
  agent: () => '/workspace/brain/agentes',
  skill: () => '/workspace/brain/skills',
};

export function ArtifactCard({ ref }: { ref: ArtifactRef }) {
  const href = KIND_HREF[ref.kind](ref.id);
  return (
    <Link
      href={href}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.2rem 0.5rem',
        margin: '0.1rem 0.15rem',
        border: '1px solid var(--kitz-line-strong)',
        background: 'var(--kitz-surface)',
        textDecoration: 'none',
        color: 'var(--kitz-ink)',
        fontSize: '0.8rem',
        verticalAlign: 'baseline',
        transition: 'background 120ms ease',
      }}
    >
      <span
        aria-hidden
        style={{
          display: 'inline-flex',
          width: '1rem',
          height: '1rem',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--kitz-ink)',
          color: 'var(--kitz-bg)',
          fontSize: '0.7rem',
          flexShrink: 0,
        }}
      >
        {KIND_GLYPH[ref.kind]}
      </span>
      <span
        style={{
          fontSize: '0.55rem',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--kitz-ink-3)',
          fontWeight: 600,
        }}
      >
        {KIND_LABEL[ref.kind]}
      </span>
      <span style={{ fontWeight: 500 }}>{ref.label}</span>
    </Link>
  );
}

const REF_RE = /\[\[artifact:(contact|deal|event|invoice|document|agent|skill):([^|\]]+)\|([^\]]+)\]\]/g;

/**
 * Walk a Kitz reply string and replace [[artifact:...]] tags with
 * <ArtifactCard /> nodes. Anything not matching falls through as text
 * (the chat shell wraps the result in <Markdown> or plain text).
 */
export function renderArtifactReferences(text: string): { nodes: ReactNode[]; cleaned: string } {
  const nodes: ReactNode[] = [];
  let cleaned = text;
  let lastIndex = 0;
  let key = 0;
  REF_RE.lastIndex = 0;
  for (const m of text.matchAll(REF_RE)) {
    const [whole, kind, id, label] = m;
    const start = m.index ?? 0;
    if (start > lastIndex) nodes.push(text.slice(lastIndex, start));
    nodes.push(
      <ArtifactCard
        key={`art-${key++}`}
        ref={{ kind: kind as ArtifactKind, id: id!, label: label! }}
      />,
    );
    cleaned = cleaned.replace(whole, `[${label} · ${KIND_LABEL[kind as ArtifactKind]}]`);
    lastIndex = start + whole.length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return { nodes, cleaned };
}

/**
 * Server-side helper: build a tag string the chat backend can paste
 * into Kitz reply text. Both desktop and mobile renderers parse the
 * same format.
 */
export function tagArtifact(ref: ArtifactRef): string {
  return `[[artifact:${ref.kind}:${ref.id}|${ref.label}]]`;
}
