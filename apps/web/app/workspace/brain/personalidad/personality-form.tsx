'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  agentId: string;
  agentName: string;
  initialPrompt: string;
  initialDescription: string | null;
};

type SaveState =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved' }
  | { kind: 'error'; reason: string };

const MIN = 4;
const MAX = 8000;

export default function PersonalityForm({
  agentId,
  agentName,
  initialPrompt,
  initialDescription,
}: Props) {
  const router = useRouter();
  const [prompt, setPrompt] = useState(initialPrompt);
  const [description, setDescription] = useState(initialDescription ?? '');
  const [save, setSave] = useState<SaveState>({ kind: 'idle' });
  const [pending, startTransition] = useTransition();

  const dirty = prompt !== initialPrompt || description !== (initialDescription ?? '');
  const tooShort = prompt.trim().length < MIN;
  const tooLong = prompt.length > MAX;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (tooShort || tooLong || !dirty) return;
    setSave({ kind: 'saving' });
    try {
      const r = await fetch(`/api/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: prompt,
          description: description.trim() ? description.trim() : null,
        }),
      });
      const j = (await r.json()) as { success: boolean; error: string | null };
      if (!r.ok || !j.success) {
        setSave({ kind: 'error', reason: j.error ?? 'Save failed' });
        return;
      }
      setSave({ kind: 'saved' });
      startTransition(() => router.refresh());
      window.setTimeout(() => setSave({ kind: 'idle' }), 2000);
    } catch {
      setSave({ kind: 'error', reason: 'Error de red' });
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
      }}
    >
      <div>
        <label htmlFor="agent-desc" className="kz-label">
          Descripción corta
        </label>
        <input
          id="agent-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={400}
          placeholder="Para qué sirve este agente"
          className="kz-input"
        />
      </div>

      <div>
        <label htmlFor="agent-prompt" className="kz-label">
          Personalidad / system prompt · {agentName}
        </label>
        <textarea
          id="agent-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={14}
          minLength={MIN}
          maxLength={MAX}
          placeholder="Eres KitZ, hablas español, eres directo y útil…"
          className="kz-input"
          style={{
            fontFamily: 'var(--kitz-font-mono)',
            resize: 'vertical',
            minHeight: '14rem',
            lineHeight: 1.5,
          }}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 4,
            fontSize: '0.65rem',
            color: tooLong ? 'var(--kitz-danger)' : 'var(--kitz-ink-3)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          <span>
            {tooShort
              ? `Mínimo ${MIN} caracteres`
              : tooLong
                ? `Máximo ${MAX} caracteres`
                : 'Esto se envía con cada mensaje al modelo.'}
          </span>
          <span>
            {prompt.length} / {MAX}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button
          type="submit"
          disabled={!dirty || tooShort || tooLong || save.kind === 'saving' || pending}
          className="kz-button"
          style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.75rem' }}
        >
          {save.kind === 'saving' ? 'Guardando…' : 'Guardar personalidad'}
        </button>
        {save.kind === 'saved' && (
          <span style={{ fontSize: '0.75rem', color: 'var(--kitz-moss)' }}>
            ✓ Guardado
          </span>
        )}
        {save.kind === 'error' && (
          <span style={{ fontSize: '0.75rem', color: 'var(--kitz-danger)' }}>
            {save.reason}
          </span>
        )}
        {dirty && save.kind === 'idle' && (
          <span style={{ fontSize: '0.75rem', color: 'var(--kitz-ink-3)' }}>
            Cambios sin guardar
          </span>
        )}
      </div>
    </form>
  );
}
