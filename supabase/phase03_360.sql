-- المرحلة 03: صور 360 للمنتج (شغّله مرة واحدة في Supabase SQL Editor)
create table if not exists public.product_360_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists product_360_images_product_idx
  on public.product_360_images (product_id, sort_order);

alter table public.product_360_images enable row level security;
grant select on public.product_360_images to anon, authenticated;
grant insert, update, delete on public.product_360_images to authenticated;

drop policy if exists product_360_images_read on public.product_360_images;
create policy product_360_images_read on public.product_360_images
  for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_360_images.product_id));

drop policy if exists product_360_images_admin on public.product_360_images;
create policy product_360_images_admin on public.product_360_images
  for all to authenticated
  using ((select public.has_permission('products')))
  with check ((select public.has_permission('products')));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-360', 'product-360', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists st_product_360_admin on storage.objects;
create policy st_product_360_admin on storage.objects
  for all to authenticated
  using (bucket_id = 'product-360' and (select public.has_permission('products')))
  with check (bucket_id = 'product-360' and (select public.has_permission('products')));
