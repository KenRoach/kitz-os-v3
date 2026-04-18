/**
 * Pure constants + types for skill kinds.
 *
 * Separate file so client code can import without dragging the in-memory
 * store (which uses node:crypto for randomUUID).
 */

export const SKILL_KINDS = ['mcp_file', 'prompt_chain', 'webhook'] as const;
export type SkillKind = (typeof SKILL_KINDS)[number];

export const SKILL_KIND_LABELS: Record<SkillKind, string> = {
  mcp_file: 'MCP file',
  prompt_chain: 'Cadena de prompts',
  webhook: 'Webhook HTTP',
};
