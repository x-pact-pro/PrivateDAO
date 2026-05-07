create extension if not exists "pgcrypto";

create table if not exists public.operation_receipts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  operation_type text not null,
  proposal_id text not null,
  dao_address text,
  approval_state text not null,
  execution_reference text not null,
  private_settlement_rail text not null,
  stablecoin_symbol text not null,
  audit_mode text not null,
  recipient_visibility text not null,
  metadata jsonb not null default '{}'::jsonb
);

alter table public.operation_receipts
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists operation_type text not null default 'operation_receipt',
  add column if not exists proposal_id text not null default 'unknown-proposal',
  add column if not exists dao_address text,
  add column if not exists approval_state text not null default 'confirmed',
  add column if not exists execution_reference text not null default 'manual-intake',
  add column if not exists private_settlement_rail text not null default 'testnet-receipt-rail',
  add column if not exists stablecoin_symbol text not null default 'SOL',
  add column if not exists audit_mode text not null default 'scoped-viewing-key',
  add column if not exists recipient_visibility text not null default 'recipient-private',
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists rail text,
  add column if not exists asset text,
  add column if not exists amount text,
  add column if not exists recipient text,
  add column if not exists memo text,
  add column if not exists status text;

create table if not exists public.governance_receipts (
  id uuid primary key default gen_random_uuid(),
  proposal_id text not null,
  operation_type text not null,
  asset text not null,
  amount text not null,
  recipient text not null,
  rail text not null,
  tx_hash text not null,
  status text not null,
  created_at timestamptz not null default now()
);

alter table public.governance_receipts
  add column if not exists proposal_id text not null default 'unknown-proposal',
  add column if not exists operation_type text not null default 'governance_operation',
  add column if not exists asset text not null default 'SOL',
  add column if not exists amount text not null default '0',
  add column if not exists recipient text not null default 'testnet-recipient',
  add column if not exists rail text not null default 'browser-direct-supabase',
  add column if not exists tx_hash text not null default 'pending-testnet-signature',
  add column if not exists status text not null default 'confirmed';

create table if not exists public.cloak_delivery_state (
  id uuid primary key default gen_random_uuid(),
  rail text not null,
  operation_type text not null,
  asset text not null,
  amount text not null,
  recipient text not null,
  memo text not null,
  audit_mode text not null,
  recipient_visibility text not null,
  response_status text not null,
  created_at timestamptz not null default now()
);

alter table public.cloak_delivery_state
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists operation_id text,
  add column if not exists cloak_status text,
  add column if not exists relayer_endpoint text,
  add column if not exists relayer_response jsonb,
  add column if not exists attempts integer not null default 0,
  add column if not exists last_attempt_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists stealth_address text,
  add column if not exists ephemeral_pubkey text,
  add column if not exists rail text not null default 'umbra-devnet-relayer',
  add column if not exists operation_type text not null default 'private_settlement',
  add column if not exists asset text not null default 'USDC',
  add column if not exists amount text not null default '0',
  add column if not exists recipient text not null default 'testnet-recipient-private',
  add column if not exists memo text not null default 'manual-intake',
  add column if not exists audit_mode text not null default 'scoped-viewing-key',
  add column if not exists recipient_visibility text not null default 'recipient-private',
  add column if not exists response_status text not null default 'prepared';

create index if not exists operation_receipts_created_at_idx
  on public.operation_receipts (created_at desc);

create index if not exists operation_receipts_proposal_id_idx
  on public.operation_receipts (proposal_id);

create index if not exists governance_receipts_created_at_idx
  on public.governance_receipts (created_at desc);

create index if not exists governance_receipts_proposal_id_idx
  on public.governance_receipts (proposal_id);

create index if not exists cloak_delivery_state_created_at_idx
  on public.cloak_delivery_state (created_at desc);

do $$
begin
  begin
    alter publication supabase_realtime add table public.operation_receipts;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.governance_receipts;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.cloak_delivery_state;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end $$;

alter table public.operation_receipts enable row level security;
alter table public.governance_receipts enable row level security;
alter table public.cloak_delivery_state enable row level security;

grant select, insert on public.operation_receipts to anon;
grant select, insert on public.governance_receipts to anon;
grant select, insert on public.cloak_delivery_state to anon;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'operation_receipts'
      and policyname = 'operation_receipts_select'
  ) then
    create policy operation_receipts_select
      on public.operation_receipts
      for select
      to anon, authenticated
      using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'governance_receipts'
      and policyname = 'governance_receipts_select'
  ) then
    create policy governance_receipts_select
      on public.governance_receipts
      for select
      to anon, authenticated
      using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'governance_receipts'
      and policyname = 'governance_receipts_insert'
  ) then
    create policy governance_receipts_insert
      on public.governance_receipts
      for insert
      to anon, authenticated
      with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'cloak_delivery_state'
      and policyname = 'cloak_delivery_state_select'
  ) then
    create policy cloak_delivery_state_select
      on public.cloak_delivery_state
      for select
      to anon, authenticated
      using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'cloak_delivery_state'
      and policyname = 'cloak_delivery_state_insert'
  ) then
    create policy cloak_delivery_state_insert
      on public.cloak_delivery_state
      for insert
      to anon, authenticated
      with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'operation_receipts'
      and policyname = 'operation_receipts_insert'
  ) then
    create policy operation_receipts_insert
      on public.operation_receipts
      for insert
      to anon, authenticated
      with check (true);
  end if;
end $$;

notify pgrst, 'reload schema';
