-- Owner panel, Phase 1 (idempotent: safe to run twice)
alter table public.leads add column if not exists follow_up_at timestamptz;

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

create table if not exists public.lead_notes (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid not null references public.leads(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 1000),
  author     text not null default 'owner',
  created_at timestamptz not null default now()
);

create index if not exists payments_lead_idx    on public.payments(lead_id);
create index if not exists payments_due_idx     on public.payments(status, due_date);
create index if not exists payments_created_idx on public.payments(created_at desc);
create index if not exists lead_notes_lead_idx  on public.lead_notes(lead_id, created_at desc);
create index if not exists leads_created_idx    on public.leads(created_at desc);
create index if not exists leads_status_temp_idx on public.leads(status, temperature);

-- RLS on, no policies: only the server (service role) can read/write.
alter table public.payments   enable row level security;
alter table public.lead_notes enable row level security;
revoke all on public.payments, public.lead_notes from anon, authenticated;
