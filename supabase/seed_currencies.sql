
-- 1. Create currencies table (reference data)
create table if not exists public.currencies (
  id uuid default gen_random_uuid() primary key,
  code text not null unique,  -- e.g. 'USD', 'EGP', 'SAR'
  name text not null,         -- e.g. 'US Dollar'
  symbol text,                -- e.g. '$', '£'
  country_codes text[] default '{}', -- Array of ISO country codes using this currency
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 2. Add RLS (Read-only public)
alter table public.currencies enable row level security;

create policy "Allow public read access"
on public.currencies for select
using (true);

-- 3. Seed initial data
insert into public.currencies (code, name, symbol, country_codes)
values
  ('EGP', 'Egyptian Pound', 'E£', ARRAY['EG']),
  ('SAR', 'Saudi Riyal', 'SAR', ARRAY['SA']),
  ('AED', 'UAE Dirham', 'AED', ARRAY['AE']),
  ('KWD', 'Kuwaiti Dinar', 'KWD', ARRAY['KW']),
  ('QAR', 'Qatari Riyal', 'QAR', ARRAY['QA']),
  ('USD', 'US Dollar', '$', ARRAY['US', 'LB', 'IQ']), -- Example mappings
  ('EUR', 'Euro', '€', ARRAY['DE', 'FR', 'IT', 'ES'])
on conflict (code) do update
set country_codes = excluded.country_codes;
