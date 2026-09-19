-- Бакеты хранилища: аватары и фото портфолио

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('portfolio', 'portfolio', true)
on conflict (id) do nothing;

-- avatars: каждый может читать (публичный бакет), писать только в свою папку {uid}/...
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatars_owner_write" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_owner_update" on storage.objects
  for update using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- portfolio: публичное чтение, загрузка только в свою папку {uid}/...
create policy "portfolio_public_read" on storage.objects
  for select using (bucket_id = 'portfolio');

create policy "portfolio_owner_write" on storage.objects
  for insert with check (
    bucket_id = 'portfolio' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "portfolio_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'portfolio' and (storage.foldername(name))[1] = auth.uid()::text
  );
