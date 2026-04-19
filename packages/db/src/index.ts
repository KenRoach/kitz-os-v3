/**
 * @kitz/db — database provider interface + stub + real factory.
 *
 * Both apps (web, ai-runtime) depend only on the DbClient interface.
 * A concrete provider (stub for dev/tests, real for production) is selected
 * at process start via `createDbClient(env)`.
 */

export * from './types';
export * from './interface';
export type { Contact, ContactInput, ContactPatch, ContactsStore } from './contacts';
export type { Deal, DealInput, DealPatch, DealStage, DealsStore } from './deals';
export { DEAL_STAGES } from './deals';
export type { Agent, AgentInput, AgentPatch, AgentsStore } from './agents';
export { AGENT_MODELS } from './agents';
export type { AgentModel } from './agents';
export type { Skill, SkillInput, SkillPatch, SkillsStore } from './skills';
export { SKILL_KINDS } from './skills';
export type { SkillKind } from './skills';
export type { WhatsAppSession, WhatsAppSessionPatch, WhatsAppStore } from './whatsapp';
export { WHATSAPP_STATUSES } from './whatsapp';
export type { WhatsAppStatus } from './whatsapp';
export type {
  CalendarEvent,
  CalendarEventInput,
  CalendarEventPatch,
  CalendarStore,
} from './calendar';
export type {
  Invoice,
  InvoiceInput,
  InvoicePatch,
  InvoiceKind,
  InvoiceStatus,
  InvoicesStore,
  LineItem,
} from './invoices';
export { INVOICE_KINDS, INVOICE_STATUSES } from './invoices';
export {
  INVOICE_KIND_LABELS,
  INVOICE_STATUS_LABELS,
} from './invoice-constants';
export type {
  BillingSubscription,
  BatteryState,
  BatteryLedgerEntry,
  BillingStore,
} from './billing';
export type { BillingPlan, PlanSpec, TopupPack } from './billing-plans';
export {
  BILLING_PLANS,
  BILLING_PLAN_SPECS,
  BILLING_TOPUP_PACKS,
  findTopupPack,
} from './billing-plans';
export type {
  DocumentRecord,
  DocumentInput,
  DocumentPatch,
  DocumentsStore,
} from './documents';
export type { DocumentKind, DocumentStatus } from './document-kinds';
export {
  DOCUMENT_KINDS,
  DOCUMENT_STATUSES,
  DOCUMENT_KIND_LABELS,
  DOCUMENT_STATUS_LABELS,
} from './document-kinds';
export { createStubDb } from './stub';
export { createDbClient } from './factory';
