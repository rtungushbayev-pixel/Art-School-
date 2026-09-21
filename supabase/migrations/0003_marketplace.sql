-- Продажа работ учеников и сотрудников (без прямой интеграции с kasteyevshop.kz —
-- объявления проходят модерацию в приложении, дальше администрация школы
-- вручную переносит одобренные работы на сайт магазина)

create type listing_status as enum ('pending', 'approved', 'rejected');

create table public.marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text,
  price numeric(12, 2) not null check (price >= 0),
  currency text not null default 'KZT',
  contact_info text,
  status listing_status not null default 'pending',
  sold boolean not null default false,
  moderated_by uuid references public.profiles (id) on delete set null,
  moderated_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.marketplace_listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.marketplace_listings (id) on delete cascade,
  image_url text not null,
  position smallint not null default 0
);

alter table public.marketplace_listings enable row level security;
alter table public.marketplace_listing_images enable row level security;

-- одобренные объявления видят все, автор видит своё в любом статусе, staff видит всё
create policy "listings_select" on public.marketplace_listings
  for select using (
    status = 'approved' or seller_id = auth.uid() or public.is_staff()
  );

create policy "listings_insert_own" on public.marketplace_listings
  for insert with check (seller_id = auth.uid());

create policy "listings_update_own_or_staff" on public.marketplace_listings
  for update using (seller_id = auth.uid() or public.is_staff());

create policy "listings_delete_own_or_staff" on public.marketplace_listings
  for delete using (seller_id = auth.uid() or public.is_staff());

-- фото объявления наследуют видимость самого объявления
create policy "listing_images_select" on public.marketplace_listing_images
  for select using (
    exists (
      select 1 from public.marketplace_listings l
      where l.id = listing_id
        and (l.status = 'approved' or l.seller_id = auth.uid() or public.is_staff())
    )
  );

create policy "listing_images_write_own" on public.marketplace_listing_images
  for all using (
    exists (select 1 from public.marketplace_listings l where l.id = listing_id and l.seller_id = auth.uid())
  ) with check (
    exists (select 1 from public.marketplace_listings l where l.id = listing_id and l.seller_id = auth.uid())
  );

-- хранилище фото для объявлений
insert into storage.buckets (id, name, public)
values ('marketplace', 'marketplace', true)
on conflict (id) do nothing;

create policy "marketplace_public_read" on storage.objects
  for select using (bucket_id = 'marketplace');

create policy "marketplace_owner_write" on storage.objects
  for insert with check (
    bucket_id = 'marketplace' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "marketplace_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'marketplace' and (storage.foldername(name))[1] = auth.uid()::text
  );
