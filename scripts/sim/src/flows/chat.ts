import type { Client } from '../client';
import type { Metrics } from '../metrics';
import { CHAT_COST_CREDITS } from '../config';

type ChatResp = {
  success?: boolean;
  data?: unknown;
  error?: string | null;
};

/**
 * Issue N chat messages. Each call hits POST /api/chat which debits
 * CHAT_COST_CREDITS BEFORE the upstream AI runtime call. We don't need
 * the upstream to actually reply — the debit is what matters for the
 * unit-economics audit.
 *
 * Returns:
 *   debited:  how many calls actually deducted credits (200 from chat
 *             OR 502 from ai-runtime AFTER the debit succeeded)
 *   blocked:  how many calls 402'd because battery hit 0 mid-loop
 *   errors:   anything else (5xx not from upstream, network failures)
 */
export async function sendChatMessages(opts: {
  client: Client;
  metrics: Metrics;
  licenseId: string;
  count: number;
  isFirst: boolean;
}): Promise<{ debited: number; blocked: number; errors: number }> {
  const { client, metrics, licenseId, count, isFirst } = opts;
  let debited = 0;
  let blocked = 0;
  let errors = 0;

  for (let i = 0; i < count; i++) {
    if (i === 0 && isFirst) metrics.recordEvent(licenseId, 'first_chat_attempted');
    let res;
    try {
      res = await client.request<ChatResp>('POST', '/api/chat', {
        message: `sim msg ${i}`,
      });
    } catch {
      errors++;
      continue;
    }

    if (res.status === 200 || res.status === 502) {
      // 200 = upstream replied. 502 = ai-runtime down/refused, but the
      // billing.debit() above it already succeeded. Both count as a
      // real credit consumption from the simulation's POV.
      debited++;
      if (i === 0 && isFirst) metrics.recordEvent(licenseId, 'first_chat_debited');
    } else if (res.status === 402) {
      blocked++;
      metrics.recordEvent(licenseId, 'hit_insufficient_credits');
      // No point continuing this batch — out of credits.
      break;
    } else {
      errors++;
    }
  }

  return { debited, blocked, errors };
}

/** Analytical credit cost for a debit count. Pure function, no I/O. */
export function creditsConsumed(messageCount: number): number {
  return messageCount * CHAT_COST_CREDITS;
}
