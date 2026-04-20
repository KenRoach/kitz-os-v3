/**
 * Chat history store — one conversation per (tenantId, userId) for
 * now, with an append-only list of messages. This is the minimum
 * needed to make KitZ chat coherent across desktop + mobile.
 *
 * Scope: in-memory, per Node process, globalThis-pinned. Same
 * lifetime contract as prefsStore / eventBus / pushStore. Graduate
 * to `conversations` + `messages` tables when you move past dev.
 *
 * Why single-thread-per-user: KitZ chat is a workspace assistant,
 * not a messaging app. One running thread per tenant+user is how
 * Claude.ai / ChatGPT feel when you're "catching up where you left
 * off" — no thread picker, no folders, just resume.
 *
 * Message cap: we keep the last 500 turns per user. Anything older
 * rolls off. Resets the number if you want longer retention when
 * we move to DB.
 */

export type ChatRole = 'user' | 'assistant' | 'system';

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  createdAt: string;
  /** Device that authored the message — useful for "continuing from phone" banners. */
  fromDevice: 'desktop' | 'mobile' | 'system';
};

type ThreadKey = string; // `${tenantId}::${userId}`

const MAX_MESSAGES = 500;

function key(tenantId: string, userId: string): ThreadKey {
  return `${tenantId}::${userId}`;
}

class ChatHistoryStore {
  private threads = new Map<ThreadKey, ChatMessage[]>();

  list(tenantId: string, userId: string): ChatMessage[] {
    return this.threads.get(key(tenantId, userId)) ?? [];
  }

  append(
    tenantId: string,
    userId: string,
    input: Omit<ChatMessage, 'id' | 'createdAt'> & { id?: string; createdAt?: string },
  ): ChatMessage {
    const msg: ChatMessage = {
      id: input.id ?? `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      role: input.role,
      text: input.text,
      fromDevice: input.fromDevice,
      createdAt: input.createdAt ?? new Date().toISOString(),
    };
    const k = key(tenantId, userId);
    const current = this.threads.get(k) ?? [];
    current.push(msg);
    // Cap retained history.
    while (current.length > MAX_MESSAGES) current.shift();
    this.threads.set(k, current);
    return msg;
  }

  clear(tenantId: string, userId: string): void {
    this.threads.delete(key(tenantId, userId));
  }
}

const g = globalThis as unknown as { __kitzChatHistory?: ChatHistoryStore };
export const chatHistoryStore: ChatHistoryStore = g.__kitzChatHistory ?? new ChatHistoryStore();
if (!g.__kitzChatHistory) g.__kitzChatHistory = chatHistoryStore;
