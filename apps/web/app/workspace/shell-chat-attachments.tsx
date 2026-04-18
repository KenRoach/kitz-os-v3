'use client';

import { useEffect, useRef, useState } from 'react';

export type Attachment = {
  id: string;
  kind: 'file' | 'image' | 'audio';
  name: string;
  mimeType: string;
  sizeBytes: number;
  /** Local data URI; replaced by signed URL once Module 13 ships uploads. */
  dataUrl: string;
};

type Props = {
  attachments: Attachment[];
  onAdd: (att: Attachment) => void;
  onRemove: (id: string) => void;
  disabled?: boolean;
};

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB cap for client-only

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('read_failed'));
    reader.readAsDataURL(blob);
  });
}

export default function ShellChatAttachments({ attachments, onAdd, onRemove, disabled }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function ingestFile(file: File, kind: Attachment['kind']) {
    if (file.size > MAX_BYTES) {
      setError(`Archivo muy grande (max ${MAX_BYTES / (1024 * 1024)} MB).`);
      return;
    }
    try {
      const dataUrl = await readAsDataUrl(file);
      onAdd({
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        kind,
        name: file.name || `${kind}-${Date.now()}`,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        dataUrl,
      });
      setError(null);
    } catch {
      setError('No pude leer el archivo.');
    }
  }

  function onFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    files.forEach((f) => {
      const kind: Attachment['kind'] = f.type.startsWith('image/') ? 'image' : 'file';
      void ingestFile(f, kind);
    });
    e.target.value = '';
  }

  function onCameraChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    files.forEach((f) => {
      void ingestFile(f, 'image');
    });
    e.target.value = '';
  }

  async function startRecording() {
    if (recording) return;
    setError(null);
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
      setError('Tu navegador no soporta grabación de audio.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      recorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, {
          type: mr.mimeType || 'audio/webm',
        });
        const file = new File([blob], `audio-${Date.now()}.webm`, { type: blob.type });
        await ingestFile(file, 'audio');
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        recorderRef.current = null;
        setRecording(false);
      };
      mr.start();
      setRecording(true);
    } catch {
      setError('Permiso de micrófono denegado.');
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
  }

  const iconBtnStyle: React.CSSProperties = {
    background: 'transparent',
    border: '1px solid var(--kitz-border)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    color: 'var(--kitz-text)',
    padding: '0.3rem 0.45rem',
    fontFamily: 'var(--kitz-font-mono)',
    fontSize: '0.7rem',
    lineHeight: 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '1.75rem',
    height: '1.75rem',
    opacity: disabled ? 0.4 : 1,
  };

  const recordingBtnStyle: React.CSSProperties = {
    ...iconBtnStyle,
    background: 'var(--kitz-error)',
    color: 'var(--kitz-bg)',
    border: '1px solid var(--kitz-error)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      {attachments.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
          {attachments.map((a) => (
            <span
              key={a.id}
              title={`${a.name} · ${formatSize(a.sizeBytes)}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                border: '1px solid var(--kitz-border)',
                background: 'var(--kitz-muted)',
                padding: '0.2rem 0.4rem 0.2rem 0.5rem',
                fontFamily: 'var(--kitz-font-mono)',
                fontSize: '0.65rem',
                color: 'var(--kitz-text-strong)',
                maxWidth: '12rem',
              }}
            >
              <span aria-hidden>{a.kind === 'image' ? '◧' : a.kind === 'audio' ? '◉' : '▤'}</span>
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {a.name}
              </span>
              <button
                type="button"
                onClick={() => onRemove(a.id)}
                aria-label={`Quitar ${a.name}`}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--kitz-text-dim)',
                  fontSize: '0.85rem',
                  lineHeight: 1,
                  padding: 0,
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={onFileChosen}
          style={{ display: 'none' }}
          aria-hidden
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onCameraChosen}
          style={{ display: 'none' }}
          aria-hidden
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          aria-label="Adjuntar archivo"
          title="Adjuntar archivo"
          style={iconBtnStyle}
        >
          ▤
        </button>
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          disabled={disabled}
          aria-label="Tomar foto"
          title="Tomar foto"
          style={iconBtnStyle}
        >
          ◧
        </button>
        <button
          type="button"
          onClick={recording ? stopRecording : startRecording}
          disabled={disabled && !recording}
          aria-label={recording ? 'Detener grabación' : 'Grabar audio'}
          title={recording ? 'Detener · click para enviar' : 'Grabar audio'}
          style={recording ? recordingBtnStyle : iconBtnStyle}
        >
          {recording ? '■' : '◉'}
        </button>
        {error && (
          <span
            className="kz-error"
            style={{ fontSize: '0.62rem', borderLeft: 'none', paddingLeft: 0 }}
          >
            {error}
          </span>
        )}
      </div>
    </div>
  );
}
