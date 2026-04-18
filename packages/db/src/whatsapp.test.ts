import { describe, it, expect } from 'vitest';
import { createMemoryWhatsAppStore } from './whatsapp';

const T = 't-1';

describe('whatsapp store', () => {
  it('get returns null before ensure', async () => {
    const store = createMemoryWhatsAppStore();
    expect(await store.get(T)).toBeNull();
  });

  it('ensure creates an idle session', async () => {
    const store = createMemoryWhatsAppStore();
    const s = await store.ensure(T);
    expect(s.status).toBe('idle');
    expect(s.phone).toBeNull();
    expect(s.connected_at).toBeNull();
  });

  it('ensure is idempotent', async () => {
    const store = createMemoryWhatsAppStore();
    const a = await store.ensure(T);
    const b = await store.ensure(T);
    expect(a.id).toBe(b.id);
  });

  it('transitions through the QR lifecycle', async () => {
    const store = createMemoryWhatsAppStore();
    await store.ensure(T);
    const req = await store.update(T, { status: 'requesting_qr' });
    expect(req?.status).toBe('requesting_qr');
    const wait = await store.update(T, {
      status: 'awaiting_scan',
      qr_data_url: 'data:image/png;base64,AAA',
      qr_expires_at: new Date(Date.now() + 60_000).toISOString(),
    });
    expect(wait?.qr_data_url).toContain('data:image/png');
    const ok = await store.update(T, {
      status: 'connected',
      qr_data_url: null,
      qr_expires_at: null,
      connected_at: new Date().toISOString(),
      phone: '+50761234567',
    });
    expect(ok?.status).toBe('connected');
    expect(ok?.phone).toBe('+50761234567');
    expect(ok?.qr_data_url).toBeNull();
  });

  it('update returns null for a tenant without a session', async () => {
    const store = createMemoryWhatsAppStore();
    expect(await store.update(T, { status: 'connected' })).toBeNull();
  });

  it('remove deletes the session', async () => {
    const store = createMemoryWhatsAppStore();
    await store.ensure(T);
    expect(await store.remove(T)).toBe(true);
    expect(await store.get(T)).toBeNull();
    expect(await store.remove(T)).toBe(false);
  });

  it('countConnected counts 1 when connected', async () => {
    const store = createMemoryWhatsAppStore();
    await store.ensure(T);
    expect(await store.countConnected(T)).toBe(0);
    await store.update(T, { status: 'connected' });
    expect(await store.countConnected(T)).toBe(1);
    await store.update(T, { status: 'disconnected' });
    expect(await store.countConnected(T)).toBe(0);
  });
});
