# RLS Matrix

Every tenant-scoped table MUST appear here with its policy.

## Tables

| Table               | Policy                               | Operation   | Expression                                    |
| ------------------- | ------------------------------------ | ----------- | --------------------------------------------- |
| `tenants`           | `tenants_member_read`                | SELECT      | User is a member of the tenant                |
| `tenants`           | `tenants_owner_update`               | UPDATE      | User has role `owner` in the tenant           |
| `user_profiles`     | `user_profiles_self_read`            | SELECT      | `id = auth.uid()`                             |
| `user_profiles`     | `user_profiles_self_update`          | UPDATE      | `id = auth.uid()`                             |
| `workspace_members` | `workspace_members_self_read`        | SELECT      | `user_id = auth.uid()`                        |
| `workspace_members` | `workspace_members_same_tenant_read` | SELECT      | User is a member of the same tenant           |
| `auth_otps`         | `auth_otps_no_client_access`         | ALL         | `false` — service role only                   |
| `contacts`          | `contacts_tenant_read`               | SELECT      | Member of the tenant                          |
| `contacts`          | `contacts_tenant_write`              | INS/UPD/DEL | Role in (owner, admin, member) for the tenant |
| `activity_feed`     | `activity_tenant_read`               | SELECT      | Member of the tenant                          |
| `activity_feed`     | `activity_no_client_insert`          | INSERT      | `false` — service role only                   |
| `ai_battery`        | `ai_battery_tenant_read`             | SELECT      | Member of the tenant                          |
| `ai_battery`        | `ai_battery_no_client_write`         | INS/UPD/DEL | `false` — service role only                   |

## Conventions

- Service role bypasses RLS by design (used only in server-to-server code paths).
- `anon` / `authenticated` roles rely exclusively on the policies above.
- Inserts/deletes on user data go through service-role API routes that enforce
  tenant ownership server-side (not via RLS insert policies, which are
  error-prone with multi-column invariants).

## Pending tables

- Phase 2: `deals`, `deal_stages`, `conversations`, `messages`, `drafts`,
  `orders`, `products`
- Phase 3: `agents`, `agent_sessions`, `skills`, `knowledge_base`,
  `brain_config`, `brain_logs`, `whatsapp_sessions`
- Phase 4: `calendar_events`, `invoices`
- Phase 5: `api_keys`
