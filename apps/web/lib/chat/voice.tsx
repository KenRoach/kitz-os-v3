/**
 * Voice — speech-to-text and text-to-speech via the browser's
 * Web Speech API. Zero server round-trips, zero credits, works
 * offline once the engine is loaded.
 *
 * Three modes:
 *   - 'command'    short utterance, expects an action ('agenda Jaime mañana 3pm')
 *                  Released → transcript becomes the chat input + auto-sends
 *   - 'braindump'  long unstructured recording, no auto-send.
 *                  Released → transcript appears in input for review
 *   - 'response'   Kitz speaks a reply via SpeechSynthesis
 *
 * Browser support is decent (Chrome/Edge/Safari) but not universal.
 * The component degrades gracefully: if SpeechRecognition isn't
 * available, it still renders a disabled mic with a tooltip.
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Square } from 'lucide-react';
import { bcp47, loadLang } from '@/lib/i18n/lang';

type VoiceMode = 'command' | 'braindump';

/**
 * Resolve the BCP-47 lang tag for STT. Explicit prop wins; otherwise
 * use the tenant's saved language; final fallback es-PA.
 */
function resolveSttLang(explicit: string | undefined, tenantSlug: string | undefined): string {
  if (explicit) return explicit;
  if (tenantSlug) return bcp47(loadLang(tenantSlug));
  return 'es-PA';
}

type SpeechRecognitionLite = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLite;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isVoiceSupported(): boolean {
  return getRecognitionCtor() !== null;
}

/**
 * Hook: hold-to-record voice input. Returns the wiring for a button
 * the caller renders. The transcript flows into `onTranscript` only
 * once at the end (callers typically push it to the chat input).
 *
 * Pass `tenantSlug` to auto-pick the recognition language from the
 * tenant's saved lang choice (es/en/pt -> es-PA/en-US/pt-BR). An
 * explicit `lang` opt still wins over the tenant default.
 */
export function useHoldToRecord(opts: {
  mode: VoiceMode;
  lang?: string;
  tenantSlug?: string;
  onTranscript: (text: string, mode: VoiceMode) => void;
  onInterim?: (partial: string) => void;
}): {
  recording: boolean;
  supported: boolean;
  start: () => void;
  stop: () => void;
} {
  const Ctor = getRecognitionCtor();
  const recRef = useRef<SpeechRecognitionLite | null>(null);
  const transcriptRef = useRef<string>('');
  const [recording, setRecording] = useState(false);

  const stop = useCallback(() => {
    if (!recRef.current) return;
    try {
      recRef.current.stop();
    } catch {
      /* already stopped */
    }
  }, []);

  const start = useCallback(() => {
    if (!Ctor || recording) return;
    const rec = new Ctor();
    rec.continuous = opts.mode === 'braindump';
    rec.interimResults = true;
    rec.lang = resolveSttLang(opts.lang, opts.tenantSlug);
    transcriptRef.current = '';

    rec.onresult = (ev) => {
      let final = '';
      let interim = '';
      const results = ev.results;
      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        if (!r) continue;
        const piece = r[0]?.transcript ?? '';
        // The browser flags isFinal on each result; lite type omits it.
        const isFinal = (r as unknown as { isFinal?: boolean }).isFinal ?? false;
        if (isFinal) final += piece;
        else interim += piece;
      }
      if (final) transcriptRef.current += final;
      opts.onInterim?.(transcriptRef.current + interim);
    };

    rec.onerror = () => {
      setRecording(false);
    };

    rec.onend = () => {
      setRecording(false);
      const text = transcriptRef.current.trim();
      if (text) opts.onTranscript(text, opts.mode);
      transcriptRef.current = '';
    };

    try {
      rec.start();
      recRef.current = rec;
      setRecording(true);
    } catch {
      setRecording(false);
    }
  }, [Ctor, opts, recording]);

  useEffect(() => {
    return () => {
      if (recRef.current) {
        try {
          recRef.current.abort();
        } catch {
          /* noop */
        }
      }
    };
  }, []);

  return {
    recording,
    supported: Ctor !== null,
    start,
    stop,
  };
}

import { getElevenIdForTenant } from './voices';

let currentAudio: HTMLAudioElement | null = null;

/**
 * Speak a string aloud. Tries ElevenLabs (server-proxied so the API
 * key stays out of the browser) using the tenant's chosen voice from
 * settings; falls back to the browser's SpeechSynthesis if ElevenLabs
 * returns 503 (not configured) or any network/playback error.
 *
 * Pass `tenantSlug` so we can look up the per-workspace voice choice.
 * Defaults to Rachel if no tenant scope is provided.
 */
export async function speak(
  text: string,
  opts: { tenantSlug?: string; lang?: string } = {},
): Promise<void> {
  if (typeof window === 'undefined') return;
  // Lang resolution mirrors the STT path: explicit > tenant choice > es-PA.
  const lang = opts.lang ?? (opts.tenantSlug ? bcp47(loadLang(opts.tenantSlug)) : 'es-PA');
  stopSpeaking();
  try {
    const voiceId = opts.tenantSlug ? getElevenIdForTenant(opts.tenantSlug) : undefined;
    const res = await fetch('/api/voice/speak', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(voiceId ? { text, voiceId } : { text }),
    });
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      currentAudio = audio;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        if (currentAudio === audio) currentAudio = null;
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        if (currentAudio === audio) currentAudio = null;
        speakWithBrowser(text, lang);
      };
      await audio.play();
      return;
    }
  } catch {
    /* network — fall back */
  }
  speakWithBrowser(text, lang);
}

function speakWithBrowser(text: string, lang: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = 1.05;
  u.pitch = 1;
  window.speechSynthesis.speak(u);
}

export function stopSpeaking(): void {
  if (typeof window === 'undefined') return;
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch {
      /* noop */
    }
    currentAudio = null;
  }
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

/**
 * Pre-built mic button — hold-to-record with an obvious recording
 * indicator. The caller picks the mode and provides the transcript
 * handler.
 */
export function VoiceButton({
  mode,
  onTranscript,
  size = 36,
  title,
  tenantSlug,
}: {
  mode: VoiceMode;
  onTranscript: (text: string, mode: VoiceMode) => void;
  size?: number;
  title?: string;
  /** Drives the STT recognition language from the tenant's saved choice. */
  tenantSlug?: string;
}) {
  const { recording, supported, start, stop } = useHoldToRecord({
    mode,
    onTranscript,
    ...(tenantSlug ? { tenantSlug } : {}),
  });

  if (!supported) {
    return (
      <button
        type="button"
        disabled
        title="Tu navegador no soporta reconocimiento de voz"
        aria-label="Voz no disponible"
        style={{
          width: size,
          height: size,
          border: '1px solid var(--kitz-line)',
          background: 'var(--kitz-sunk)',
          color: 'var(--kitz-ink-3)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'not-allowed',
          opacity: 0.55,
        }}
      >
        <MicOff size={Math.round(size * 0.45)} strokeWidth={1.5} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        start();
      }}
      onMouseUp={stop}
      onMouseLeave={() => recording && stop()}
      onTouchStart={(e) => {
        e.preventDefault();
        start();
      }}
      onTouchEnd={stop}
      title={
        title ??
        (mode === 'braindump'
          ? 'Mantén presionado para brain dump (transcripción larga)'
          : 'Mantén presionado para comando de voz')
      }
      aria-label={mode === 'braindump' ? 'Brain dump' : 'Comando de voz'}
      aria-pressed={recording}
      style={{
        width: size,
        height: size,
        border: '1px solid var(--kitz-ink)',
        background: recording ? 'var(--kitz-danger)' : 'var(--kitz-bg)',
        color: recording ? 'var(--kitz-bg)' : 'var(--kitz-ink)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'background 80ms ease',
      }}
    >
      {recording ? (
        <Square size={Math.round(size * 0.4)} strokeWidth={2} fill="currentColor" />
      ) : (
        <Mic size={Math.round(size * 0.45)} strokeWidth={1.5} />
      )}
    </button>
  );
}

/**
 * Floating transcript-preview banner shown while a brain dump is in
 * progress. Sits above the input and shows the live partial text so
 * the user knows it's hearing them.
 */
export function VoiceTranscriptPreview({
  text,
  mode,
}: {
  text: string;
  mode: VoiceMode;
}) {
  if (!text) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        padding: '0.5rem 0.75rem',
        background: 'var(--kitz-sunk)',
        border: '1px dashed var(--kitz-ink)',
        fontSize: '0.8rem',
        color: 'var(--kitz-ink-2)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.5rem',
      }}
    >
      <span
        aria-hidden
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: 'var(--kitz-danger)',
          marginTop: 6,
          flexShrink: 0,
          animation: 'kitzPulse 1s infinite',
        }}
      />
      <span style={{ flex: 1 }}>
        <span
          style={{
            display: 'block',
            fontSize: '0.6rem',
            color: 'var(--kitz-ink-3)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            fontWeight: 600,
            marginBottom: 2,
          }}
        >
          {mode === 'braindump' ? 'Brain dump' : 'Comando'} · escuchando
        </span>
        {text || <em style={{ color: 'var(--kitz-ink-3)' }}>silencio…</em>}
      </span>
    </div>
  );
}
