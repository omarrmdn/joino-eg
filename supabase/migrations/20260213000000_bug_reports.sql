-- Create bug_reports table
create table if not exists public.bug_reports (
    id uuid default gen_random_uuid() primary key,
    user_id text references public.users(id),
    description text not null,
    images text[] default '{}',
    status text default 'open',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.bug_reports enable row level security;

-- Policies
create policy "Users can insert their own bug reports"
on public.bug_reports for insert
with check (user_id = auth.uid()::text);

create policy "Users can view their own bug reports"
on public.bug_reports for select
using (user_id = auth.uid()::text);

-- Storage bucket for bug reports
insert into storage.buckets (id, name, public)
values ('bug_reports', 'bug_reports', true)
on conflict (id) do nothing;

create policy "Anyone can view bug report images"
on storage.objects for select
using (bucket_id = 'bug_reports');

create policy "Authenticated users can upload bug report images"
on storage.objects for insert
with check (
    bucket_id = 'bug_reports' 
    and auth.role() = 'authenticated'
);

