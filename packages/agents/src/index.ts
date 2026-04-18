/**
 * @kitz/agents — tool registry + built-in agent presets.
 *
 * Tools declare scopes (read_only / draft / execute / webhook) so the agent
 * runner knows which require approval before mutating tenant data.
 *
 * Built-in personas are seed data; tenants own their copies and can edit them.
 */

export {
  TOOLS,
  TOOL_IDS,
  TOOL_SCOPES,
  TOOL_CATEGORIES,
  getToolById,
  getToolsByIds,
  filterAllowedTools,
} from './tools';
export type { ToolDef, ToolId, ToolScope, ToolCategory } from './tools';

export { BUILTIN_AGENTS } from './personas';
export type { BuiltInAgent } from './personas';

export { WORK_PACKS, WORK_PACK_SLUGS, getWorkPack } from './work-packs';
export type { WorkPack, WorkPackSlug, AgentSeed } from './work-packs';
