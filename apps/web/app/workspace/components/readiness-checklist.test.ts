import { describe, it, expect } from 'vitest';
import { buildChecklist } from './readiness-checklist';

const baseStats = {
  contacts: 0,
  deals: 0,
  conversations: 0,
  agents: 0,
  credits: { balance: 0, lifetimeTopup: 0 },
};

describe('buildChecklist', () => {
  it('marks auth + onboarding as done always', () => {
    const items = buildChecklist(baseStats);
    expect(items.find((i) => i.key === 'auth')?.done).toBe(true);
    expect(items.find((i) => i.key === 'onboarding')?.done).toBe(true);
  });

  it('marks contacts done when contacts > 0', () => {
    const items = buildChecklist({ ...baseStats, contacts: 3 });
    expect(items.find((i) => i.key === 'contacts')?.done).toBe(true);
  });

  it('marks agents done when agents > 0', () => {
    const items = buildChecklist({ ...baseStats, agents: 1 });
    expect(items.find((i) => i.key === 'agents')?.done).toBe(true);
  });

  it('marks whatsapp done when conversations > 0', () => {
    const items = buildChecklist({ ...baseStats, conversations: 2 });
    expect(items.find((i) => i.key === 'whatsapp')?.done).toBe(true);
  });

  it('returns exactly 5 items in a stable order', () => {
    const items = buildChecklist(baseStats);
    expect(items.map((i) => i.key)).toEqual([
      'auth',
      'onboarding',
      'contacts',
      'agents',
      'whatsapp',
    ]);
  });
});
