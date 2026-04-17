# RLS Matrix

> Populated as tables are added in Phase 1 module 2 (Auth) and after.
> Every tenant-scoped table MUST appear here with its policy.

## Format

| Table     | Policy             | Role(s) | Expression                               |
| --------- | ------------------ | ------- | ---------------------------------------- |
| _example_ | `tenant_isolation` | all     | `tenant_id = auth.jwt() ->> 'tenant_id'` |

## Tables

_(none yet — Phase 1 module 1 only scaffolds the repo)_
