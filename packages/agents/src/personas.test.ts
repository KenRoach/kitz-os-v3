import { describe, it, expect } from 'vitest';
import { BUILTIN_AGENTS } from './personas';
import { TOOL_IDS } from './tools';

describe('built-in agent presets', () => {
  it('every persona has unique slug', () => {
    const slugs = BUILTIN_AGENTS.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('every persona references only known tool ids', () => {
    for (const agent of BUILTIN_AGENTS) {
      for (const tid of agent.defaultTools) {
        expect(TOOL_IDS).toContain(tid);
      }
    }
  });

  it('every persona has a non-empty system prompt', () => {
    for (const a of BUILTIN_AGENTS) {
      expect(a.systemPrompt.length).toBeGreaterThan(20);
    }
  });

  it('default model is one of the supported tiers', () => {
    for (const a of BUILTIN_AGENTS) {
      expect(['haiku', 'sonnet', 'opus']).toContain(a.defaultModel);
    }
  });

  it('contains the default Kitz persona at slug "kitz"', () => {
    expect(BUILTIN_AGENTS.some((a) => a.slug === 'kitz')).toBe(true);
  });
});
