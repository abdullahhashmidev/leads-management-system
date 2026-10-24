-- Consent record for lead contact (WhatsApp/phone opt-in). Null = volunteered in chat, not opted in.
alter table public.leads add column if not exists consent_at timestamptz;
