-- Run once in Supabase Dashboard > SQL Editor.
create table if not exists public.orders (
  id text primary key, created_at timestamptz not null, order_data jsonb not null
);
create table if not exists public.products (
  id text primary key, created_at timestamptz not null default now(), product_data jsonb not null
);
alter table public.orders enable row level security;
alter table public.products enable row level security;
-- No public table policies: server uses the secret service_role key only.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('zavren-products','zavren-products',true,4194304,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true,file_size_limit=4194304,allowed_mime_types=array['image/jpeg','image/png','image/webp'];
