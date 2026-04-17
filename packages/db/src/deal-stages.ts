/**
 * Pure constants + types for the deals pipeline.
 *
 * Kept in a separate file so client code can `import { DEAL_STAGES }` without
 * transitively importing `node:crypto` (used by the store implementation).
 */

export const DEAL_STAGES = [
  'prospecto',
  'calificado',
  'propuesta',
  'negociacion',
  'ganado',
  'perdido',
] as const;

export type DealStage = (typeof DEAL_STAGES)[number];
