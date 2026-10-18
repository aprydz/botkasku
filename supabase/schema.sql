-- KASKU - Supabase schema. Jalankan di SQL Editor
create extension if not exists "pgcrypto";
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('IN','OUT')),
  amount integer not null check (amount > 0),
  category text not null default 'lainnya',
  description text not null default '',
  source text not null default 'web' check (source in ('wa','web')),
  from_phone text,
  raw_message text,
  created_at timestamptz not null default now()
);
create index if not exists idx_tx_created on transactions(created_at desc);
create index if not exists idx_tx_type on transactions(type);
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'transactions') then
    alter publication supabase_realtime add table transactions;
  end if;
end $$;
create table if not exists wa_logs (
  id uuid primary key default gen_random_uuid(),
  from_phone text,
  raw_message text not null,
  parsed_status text not null,
  created_at timestamptz not null default now()
);
alter table transactions enable row level security;
do $$ begin if not exists (select 1 from pg_policies where policyname='allow_all_tx') then create policy allow_all_tx on transactions for all to anon, authenticated using (true) with check (true); end if; end $$;
alter table wa_logs enable row level security;
do $$ begin if not exists (select 1 from pg_policies where policyname='allow_all_logs') then create policy allow_all_logs on wa_logs for all to anon, authenticated using (true) with check (true); end if; end $$;
