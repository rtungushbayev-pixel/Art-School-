-- Объявления с сайта kasteyevshop.kz во вкладке «Все объявления на сайте».
--
-- У сайта нет API, поэтому функция sync-shop раз в неделю читает его
-- страницы, копирует фото в хранилище (сайт пока без https, а телефоны
-- не показывают картинки по http) и обновляет эту таблицу. Приложение только
-- читает таблицу и, если данные старше недели, просит функцию обновить их.
--
-- Выполнять после 0027.

create table public.shop_listings (
  id text primary key,               -- номер товара на сайте
  title text not null,
  author text,
  price text,                        -- как на сайте: «80 000 ₸»
  size text,                         -- «80х80»
  url text not null,
  image_url text,                    -- копия фото в хранилище shop-images
  source_image text,                 -- адрес фото на сайте (чтобы не копировать заново)
  sort_order int not null default 0,
  synced_at timestamptz not null default now()
);

alter table public.shop_listings enable row level security;

create policy "shop_listings_select" on public.shop_listings
  for select to authenticated using (true);
-- Пишет только функция sync-shop (service role).

-- Когда объявления обновлялись в последний раз.
create table public.shop_sync (
  id int primary key default 1 check (id = 1),
  synced_at timestamptz,
  error text
);

insert into public.shop_sync (id) values (1) on conflict do nothing;

alter table public.shop_sync enable row level security;

create policy "shop_sync_select" on public.shop_sync
  for select to authenticated using (true);

-- Публичный бакет для копий фото с сайта; пишет только service role.
insert into storage.buckets (id, name, public)
values ('shop-images', 'shop-images', true)
on conflict (id) do nothing;
