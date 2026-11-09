-- 002_catalog: categories, products, options, variants. Policies live next to tables.
-- Permission key used for writes: 'products' (owner has all). Costs: 'costs'.

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories(id) on delete set null,
  name text not null check (length(btrim(name)) > 0),
  slug text not null unique check (slug ~ '^[^\s/]+$'),
  description text,
  image_path text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (parent_id is null or parent_id <> id)
);
create index categories_parent_idx on public.categories(parent_id);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null check (length(btrim(name)) > 0),
  slug text not null unique check (slug ~ '^[^\s/]+$'),
  description text,
  brand text,
  price bigint not null check (price >= 0),                 -- IQD, whole dinars
  compare_at_price bigint check (compare_at_price is null or compare_at_price >= price),
  quantity integer not null default 0 check (quantity >= 0), -- no negative stock
  low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0),
  status text not null default 'hidden' check (status in ('active','hidden','sold_out')),
  is_featured boolean not null default false,
  is_new boolean not null default false,
  has_360_view boolean not null default false,
  barcode text check (barcode is null or length(btrim(barcode)) > 0),
  qr_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_category_idx on public.products(category_id);
create index products_status_idx on public.products(status);
create index products_featured_idx on public.products(is_featured) where is_featured;
create unique index products_barcode_uq on public.products(barcode) where barcode is not null;
create index products_name_trgm on public.products using gin (name extensions.gin_trgm_ops);

-- Cost lives in its own table so it can never leak through a customer query.
create table public.product_costs (
  product_id uuid primary key references public.products(id) on delete cascade,
  cost_price bigint not null check (cost_price >= 0),
  updated_at timestamptz not null default now()
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null,
  alt_text text,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create index product_images_product_idx on public.product_images(product_id);
create unique index product_images_one_primary on public.product_images(product_id) where is_primary;

-- Generic options (color, size, any custom option): not tied to clothing.
create table public.product_options (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  kind text not null default 'custom' check (kind in ('color','size','dimension','custom')),
  sort_order integer not null default 0,
  unique (product_id, name)
);

create table public.product_option_values (
  id uuid primary key default gen_random_uuid(),
  option_id uuid not null references public.product_options(id) on delete cascade,
  value text not null check (length(btrim(value)) > 0),
  color_hex text check (color_hex is null or color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  image_path text,
  sort_order integer not null default 0,
  unique (option_id, value)
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text,
  barcode text,
  price_adjustment bigint not null default 0 check (price_adjustment >= 0),
  quantity integer not null default 0 check (quantity >= 0),
  track_quantity boolean not null default true,              -- false = use the product quantity
  image_path text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index product_variants_product_idx on public.product_variants(product_id);
create unique index product_variants_sku_uq on public.product_variants(sku) where sku is not null;
create unique index product_variants_barcode_uq on public.product_variants(barcode) where barcode is not null;

create table public.variant_option_values (
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  option_value_id uuid not null references public.product_option_values(id) on delete cascade,
  primary key (variant_id, option_value_id)
);
create index variant_option_values_value_idx on public.variant_option_values(option_value_id);

-- updated_at triggers
create trigger trg_categories_upd before update on public.categories for each row execute function public.set_updated_at();
create trigger trg_products_upd before update on public.products for each row execute function public.set_updated_at();
create trigger trg_product_costs_upd before update on public.product_costs for each row execute function public.set_updated_at();
create trigger trg_product_variants_upd before update on public.product_variants for each row execute function public.set_updated_at();

-- Privileges: least privilege first, then RLS decides rows.
revoke all on public.categories, public.products, public.product_costs, public.product_images,
  public.product_options, public.product_option_values, public.product_variants,
  public.variant_option_values from anon, authenticated;
grant select on public.categories, public.products, public.product_images, public.product_options,
  public.product_option_values, public.product_variants, public.variant_option_values to anon, authenticated;
grant insert, update, delete on public.categories, public.products, public.product_images,
  public.product_options, public.product_option_values, public.product_variants,
  public.variant_option_values to authenticated;
grant select, insert, update, delete on public.product_costs to authenticated;

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_costs enable row level security;
alter table public.product_images enable row level security;
alter table public.product_options enable row level security;
alter table public.product_option_values enable row level security;
alter table public.product_variants enable row level security;
alter table public.variant_option_values enable row level security;

-- Public reads (visitors + customers); admins see everything.
create policy categories_read on public.categories for select to anon, authenticated
  using (is_active or (select public.is_admin()));
create policy products_read on public.products for select to anon, authenticated
  using (status in ('active','sold_out') or (select public.is_admin()));
-- Child rows are visible only if the parent product is visible (products RLS applies inside).
create policy product_images_read on public.product_images for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_images.product_id));
create policy product_options_read on public.product_options for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_options.product_id));
create policy product_option_values_read on public.product_option_values for select to anon, authenticated
  using (exists (select 1 from public.product_options o where o.id = product_option_values.option_id));
create policy product_variants_read on public.product_variants for select to anon, authenticated
  using ((is_active and exists (select 1 from public.products p where p.id = product_variants.product_id))
         or (select public.is_admin()));
create policy variant_option_values_read on public.variant_option_values for select to anon, authenticated
  using (exists (select 1 from public.product_variants v where v.id = variant_option_values.variant_id));

-- Admin writes: only users holding the 'products' permission in admin_users.
create policy categories_admin on public.categories for all to authenticated
  using ((select public.has_permission('products'))) with check ((select public.has_permission('products')));
create policy products_admin on public.products for all to authenticated
  using ((select public.has_permission('products'))) with check ((select public.has_permission('products')));
create policy product_images_admin on public.product_images for all to authenticated
  using ((select public.has_permission('products'))) with check ((select public.has_permission('products')));
create policy product_options_admin on public.product_options for all to authenticated
  using ((select public.has_permission('products'))) with check ((select public.has_permission('products')));
create policy product_option_values_admin on public.product_option_values for all to authenticated
  using ((select public.has_permission('products'))) with check ((select public.has_permission('products')));
create policy product_variants_admin on public.product_variants for all to authenticated
  using ((select public.has_permission('products'))) with check ((select public.has_permission('products')));
create policy variant_option_values_admin on public.variant_option_values for all to authenticated
  using ((select public.has_permission('products'))) with check ((select public.has_permission('products')));
-- Costs: no public read policy at all, admins with 'costs' only.
create policy product_costs_admin on public.product_costs for all to authenticated
  using ((select public.has_permission('costs'))) with check ((select public.has_permission('costs')));
