-- Add latitude and longitude to users table for IP-based geolocation
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'users' and column_name = 'latitude') then
        alter table public.users add column latitude numeric;
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'users' and column_name = 'longitude') then
        alter table public.users add column longitude numeric;
    end if;
end $$;
