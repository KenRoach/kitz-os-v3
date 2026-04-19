-- M15 OCR / documents
-- Storage of original file lives in the bucket; this row is the metadata
-- + the structured extraction result. Keeping extracted_data as jsonb
-- gives us a free schema while we iterate on per-kind shapes.

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  kind text not null check (kind in ('id_card','receipt','invoice','contract','other')),
  status text not null default 'uploaded'
    check (status in ('uploaded','extracting','extracted','failed')),
  filename text not null check (char_length(filename) between 1 and 240),
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  storage_key text not null,
  notes text,
  extracted_data jsonb,
  extract_error text,
  uploaded_by uuid not null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists documents_tenant_created_idx
  on public.documents (tenant_id, created_at desc);

create index if not exists documents_tenant_kind_status_idx
  on public.documents (tenant_id, kind, status);

alter table public.documents enable row level security;

create policy documents_member_read on public.documents
  for select
  using (
    exists (
      select 1 from public.workspace_members m
      where m.tenant_id = documents.tenant_id
        and m.user_id = auth.uid()
    )
  );

create policy documents_member_write on public.documents
  for all
  using (
    exists (
      select 1 from public.workspace_members m
      where m.tenant_id = documents.tenant_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin', 'member')
    )
  )
  with check (
    exists (
      select 1 from public.workspace_members m
      where m.tenant_id = documents.tenant_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin', 'member')
    )
  );

create or replace function public.touch_documents_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists documents_touch_updated_at on public.documents;
create trigger documents_touch_updated_at
  before update on public.documents
  for each row
  execute function public.touch_documents_updated_at();
