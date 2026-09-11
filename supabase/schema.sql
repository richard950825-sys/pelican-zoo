create extension if not exists pgcrypto;

create table public.works (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  model text not null check (model in ('GPT', 'Claude', 'Gemini', 'DeepSeek', 'Qwen', 'Kimi', 'GLM', 'Doubao', 'Other')),
  model_detail text check (model_detail is null or char_length(model_detail) <= 80),
  html_path text not null unique check (html_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\\.html$'),
  status text not null default 'published' check (status in ('published', 'hidden')),
  created_at timestamptz not null default now()
);

alter table public.works enable row level security;

create policy "Published works are readable" on public.works
  for select using (status = 'published');

create policy "Anonymous authors create their own works" on public.works
  for insert to authenticated
  with check (owner_id = (select auth.uid()) and status = 'published' and html_path like ((select auth.uid())::text || '/%'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('works', 'works', true, 5242880, array['text/html'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = array['text/html'];

create policy "Public can view works" on storage.objects
  for select using (bucket_id = 'works');

create policy "Anonymous authors upload their own HTML" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'works'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and lower(storage.extension(name)) = 'html'
  );

create policy "Authors can remove their own files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'works' and (storage.foldername(name))[1] = (select auth.uid()::text));
