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
