-- Add language column to users table
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'users' and column_name = 'language') then
        alter table public.users add column language text default 'en';
    end if;
end $$;
