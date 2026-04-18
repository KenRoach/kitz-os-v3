import { describe, it, expect } from 'vitest';
import {
  TOOLS,
  TOOL_IDS,
  TOOL_SCOPES,
  filterAllowedTools,
  getToolById,
  getToolsByIds,
} from './tools';

describe('tool registry', () => {
  it('has unique tool ids', () => {
    const ids = TOOLS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('TOOL_IDS matches TOOLS in order', () => {
    expect(TOOL_IDS).toEqual(TOOLS.map((t) => t.id));
  });

  it('every tool has a known scope', () => {
    for (const t of TOOLS) {
      expect(TOOL_SCOPES).toContain(t.scope);
    }
  });

  it('getToolById finds known tools', () => {
    expect(getToolById('list_contacts')?.scope).toBe('read_only');
    expect(getToolById('create_contact')?.scope).toBe('execute');
  });

  it('getToolById returns undefined for unknown ids', () => {
    expect(getToolById('not_a_tool')).toBeUndefined();
  });

  it('getToolsByIds preserves registry order, drops unknowns', () => {
    const result = getToolsByIds(['list_deals', 'unknown', 'create_contact']);
    // Registry order: list_contacts, create_contact, list_deals → so create_contact first
    expect(result.map((t) => t.id)).toEqual(['create_contact', 'list_deals']);
  });
});

describe('filterAllowedTools', () => {
  it('returns intersection of requested ∩ allowed, in registry order', () => {
    const result = filterAllowedTools(
      ['send_whatsapp', 'list_contacts', 'list_deals'],
      ['list_contacts', 'send_whatsapp'],
    );
    expect(result.map((t) => t.id)).toEqual(['list_contacts', 'send_whatsapp']);
  });

  it('drops requested tools that are not in the allowed list', () => {
    const result = filterAllowedTools(['create_contact', 'send_whatsapp'], ['list_contacts']);
    expect(result).toEqual([]);
  });

  it('returns empty when allowed is empty', () => {
    expect(filterAllowedTools(['list_contacts'], [])).toEqual([]);
  });

  it('returns empty when requested is empty', () => {
    expect(filterAllowedTools([], ['list_contacts'])).toEqual([]);
  });

  it('drops unknown tool ids silently', () => {
    const result = filterAllowedTools(
      ['list_contacts', 'unknown_tool'],
      ['list_contacts', 'unknown_tool'],
    );
    expect(result.map((t) => t.id)).toEqual(['list_contacts']);
  });
});
