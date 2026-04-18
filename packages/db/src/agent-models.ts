/**
 * Pure constants + types for agent model selection.
 *
 * Kept separate from agents.ts so client components can `import` without
 * transitively pulling node:crypto (used by the in-memory store).
 */

export const AGENT_MODELS = ['haiku', 'sonnet', 'opus'] as const;
export type AgentModel = (typeof AGENT_MODELS)[number];

export const AGENT_MODEL_LABELS: Record<AgentModel, string> = {
  haiku: 'Haiku · rápido',
  sonnet: 'Sonnet · balance',
  opus: 'Opus · máximo',
};
