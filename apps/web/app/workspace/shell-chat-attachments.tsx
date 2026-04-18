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

  const ICON_SIZE = 14;
  const iconProps = {
    width: ICON_SIZE,
    height: ICON_SIZE,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  const PaperclipIcon = (
    <svg {...iconProps}>
      <path d="M21 12.5l-8.5 8.5a5 5 0 01-7-7l8.5-8.5a3.5 3.5 0 014.95 4.95L10 19.4a2 2 0 01-2.83-2.83l7.78-7.78" />
    </svg>
  );

  const CameraIcon = (
    <svg {...iconProps}>
      <path d="M3 8h3l2-3h8l2 3h3a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V9a1 1 0 011-1z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );

  const MicIcon = (
    <svg {...iconProps}>
      <rect x="9" y="3" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0014 0" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="9" y1="22" x2="15" y2="22" />
    </svg>
  );

  const StopIcon = (
    <svg {...iconProps}>
      <rect x="6" y="6" width="12" height="12" rx="1" fill="currentColor" />
    </svg>
  );

  const ImageChipIcon = (
    <svg {...iconProps} width={11} height={11}>
      <rect x="3" y="3" width="18" height="18" rx="1" />
      <circle cx="9" cy="9" r="1.5" />
      <path d="M21 16l-5-5-9 9" />
    </svg>
  );

  const FileChipIcon = (
    <svg {...iconProps} width={11} height={11}>
      <path d="M14 3H6a1 1 0 00-1 1v16a1 1 0 001 1h12a1 1 0 001-1V8z" />
      <path d="M14 3v5h5" />
    </svg>
  );

  const AudioChipIcon = (
    <svg {...iconProps} width={11} height={11}>
      <path d="M3 12c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
    </svg>
  );

  function chipIconFor(kind: 'image' | 'audio' | 'file') {
    if (kind === 'image') return ImageChipIcon;
    if (kind === 'audio') return AudioChipIcon;
    return FileChipIcon;
  }

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
              <span aria-hidden style={{ display: 'inline-flex' }}>
                {chipIconFor(a.kind)}
              </span>
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
          {PaperclipIcon}
        </button>
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          disabled={disabled}
          aria-label="Tomar foto"
          title="Tomar foto"
          style={iconBtnStyle}
        >
          {CameraIcon}
        </button>
        <button
          type="button"
          onClick={recording ? stopRecording : startRecording}
          disabled={disabled && !recording}
          aria-label={recording ? 'Detener grabación' : 'Grabar audio'}
          title={recording ? 'Detener · click para enviar' : 'Grabar audio'}
          style={recording ? recordingBtnStyle : iconBtnStyle}
        >
          {recording ? StopIcon : MicIcon}
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
