-- Leads Management System: full schema (run once on a fresh project).
-- Row Level Security is ON for every table and there are NO policies:
-- only the server (service role key) can read or write. anon/authenticated get nothing.
create extension if not exists pgcrypto;

create table if not exists public.leads (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  campaign     text not null check (campaign in ('accl','summer_camp')),
  name         text not null check (char_length(name) between 2 and 80),
  phone        text not null check (char_length(phone) between 7 and 20),
  country      text,
  role         text,
  course       text,
  source       text not null default 'website',
  status       text not null default 'new'
               check (status in ('new','qualified','contacted','demo_booked','enrolled','lost')),
  score        int check (score between 0 and 100),
  temperature  text check (temperature in ('hot','warm','cold')),
  intent       text check (intent in ('high','medium','low')),
  chat_summary text,
  notes        text,
  follow_up_at timestamptz,
  consent_at   timestamptz,
  is_dummy     boolean not null default false
);

create table if not exists public.lead_notes (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid not null references public.leads(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 1000),
  author     text not null default 'owner',
  created_at timestamptz not null default now()
);

create sequence if not exists public.receipt_seq start 1001;

create table if not exists public.payments (
  id           uuid primary key default gen_random_uuid(),
  lead_id      uuid references public.leads(id) on delete set null,
  student_name text not null check (char_length(student_name) between 1 and 120),
  campaign     text not null check (campaign in ('accl','summer_camp')),
  amount       numeric(12,2) not null check (amount > 0),
  amount_paid  numeric(12,2) not null default 0,
  currency     text not null check (currency in ('PKR','USD')),
  method       text not null check (method in ('jazzcash','easypaisa','bank','paypal','cash')),
  status       text not null default 'pending' check (status in ('pending','paid','partial','refunded')),
  plan         text,
  due_date     date,
  paid_at      timestamptz,
  receipt_no   text unique default ('RCT-' || lpad(nextval('public.receipt_seq')::text, 5, '0')),
  note         text check (note is null or char_length(note) <= 500),
  is_dummy     boolean not null default false,
  created_at   timestamptz not null default now(),
  constraint amount_paid_range check (amount_paid >= 0 and amount_paid <= amount),
  constraint paid_has_date check (status not in ('paid','partial') or paid_at is not null)
);

create index if not exists leads_created_idx     on public.leads(created_at desc);
create index if not exists leads_status_temp_idx on public.leads(status, temperature);
create index if not exists leads_phone_created_idx on public.leads(phone, created_at desc);
create index if not exists payments_lead_idx     on public.payments(lead_id);
create index if not exists payments_due_idx      on public.payments(status, due_date);
create index if not exists payments_created_idx  on public.payments(created_at desc);
create index if not exists lead_notes_lead_idx   on public.lead_notes(lead_id, created_at desc);

alter table public.leads      enable row level security;
alter table public.lead_notes enable row level security;
alter table public.payments   enable row level security;
revoke all on public.leads, public.lead_notes, public.payments from anon, authenticated;

-- Guards: shared rate limits, global LLM budget, DB kill switch (idempotent).
create table if not exists public.usage_counters (
  key        text primary key,
  count      int not null default 0,
  expires_at timestamptz not null
);
create index if not exists usage_counters_expires_idx on public.usage_counters(expires_at);

create table if not exists public.app_settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);
insert into public.app_settings (key, value) values ('chat_enabled', 'true') on conflict (key) do nothing;

-- Atomic fixed-window counter. Returns true if this hit is within the limit.
create or replace function public.hit_counter(p_key text, p_limit int, p_expires timestamptz)
returns boolean
language plpgsql
set search_path = public
as $$
declare c int;
begin
  if p_limit < 1 then return false; end if;
  delete from public.usage_counters where key in (select key from public.usage_counters where expires_at < now() limit 50);
  insert into public.usage_counters as u (key, count, expires_at) values (p_key, 1, p_expires)
  on conflict (key) do update set count = u.count + 1
    where u.count < p_limit
  returning u.count into c;
  return c is not null;
end;
$$;

alter table public.usage_counters enable row level security;
alter table public.app_settings   enable row level security;
revoke all on public.usage_counters, public.app_settings from anon, authenticated;
revoke execute on function public.hit_counter(text, int, timestamptz) from public, anon, authenticated;
grant execute on function public.hit_counter(text, int, timestamptz) to service_role;

-- Demo data is NOT here. Load it with: npm run seed (is_dummy = true rows only).
