import { describe, it, expect } from 'vitest';
import { isEnabled } from './index.js';

describe('feature flags', () => {
  it('returns false when env var is absent', () => {
    expect(isEnabled('whatsapp', {})).toBe(false);
  });

  it('returns true for "on"', () => {
    expect(isEnabled('whatsapp', { KITZ_FLAG_WHATSAPP: 'on' })).toBe(true);
  });

  it('returns true for "1" and "true"', () => {
    expect(isEnabled('voice', { KITZ_FLAG_VOICE: '1' })).toBe(true);
    expect(isEnabled('voice', { KITZ_FLAG_VOICE: 'true' })).toBe(true);
  });

  it('returns false for anything else', () => {
    expect(isEnabled('ocr', { KITZ_FLAG_OCR: 'off' })).toBe(false);
    expect(isEnabled('ocr', { KITZ_FLAG_OCR: '' })).toBe(false);
    expect(isEnabled('ocr', { KITZ_FLAG_OCR: 'maybe' })).toBe(false);
  });
});
