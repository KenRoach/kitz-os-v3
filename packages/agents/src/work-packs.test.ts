import { describe, it, expect } from 'vitest';
import { WORK_PACKS, WORK_PACK_SLUGS, getWorkPack } from './work-packs';
import { TOOL_IDS } from './tools';

describe('work-packs registry', () => {
  it('every pack has unique slug', () => {
    const slugs = WORK_PACKS.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('WORK_PACK_SLUGS matches WORK_PACKS in order', () => {
    expect(WORK_PACK_SLUGS).toEqual(WORK_PACKS.map((p) => p.slug));
  });

  it('every pack has at least one agent and a Kitz default first', () => {
    for (const p of WORK_PACKS) {
      expect(p.agents.length).toBeGreaterThan(0);
      expect(p.agents[0]?.slug).toBe('kitz');
    }
  });

  it('every agent within a pack has a unique slug per pack', () => {
    for (const p of WORK_PACKS) {
      const slugs = p.agents.map((a) => a.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
    }
  });

  it('every agent references only known tool ids', () => {
    for (const p of WORK_PACKS) {
      for (const a of p.agents) {
        for (const t of a.defaultTools) {
          expect(TOOL_IDS).toContain(t);
        }
      }
    }
  });

  it('every agent has a non-empty system prompt and supported model', () => {
    for (const p of WORK_PACKS) {
      for (const a of p.agents) {
        expect(a.systemPrompt.length).toBeGreaterThan(20);
        expect(['haiku', 'sonnet', 'opus']).toContain(a.defaultModel);
      }
    }
  });

  it('getWorkPack returns the right pack', () => {
    expect(getWorkPack('sales-pipeline')?.name).toBe('Pipeline de ventas');
  });

  it('getWorkPack returns undefined for unknown slug', () => {
    expect(getWorkPack('not-a-pack')).toBeUndefined();
  });

  it('exposes a general pack as the safe default', () => {
    expect(WORK_PACKS[0]?.slug).toBe('general');
  });
});
