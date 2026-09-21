-- Хранилище фото-вложений к домашним заданиям и их сдаче.
-- Колонки homework.attachment_url и homework_submissions.attachment_url
-- уже существуют в 0001_init.sql — не хватало только бакета для файлов.

insert into storage.buckets (id, name, public)
values ('homework', 'homework', true)
on conflict (id) do nothing;

create policy "homework_bucket_public_read" on storage.objects
  for select using (bucket_id = 'homework');

create policy "homework_bucket_owner_write" on storage.objects
  for insert with check (
    bucket_id = 'homework' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "homework_bucket_owner_update" on storage.objects
  for update using (
    bucket_id = 'homework' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "homework_bucket_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'homework' and (storage.foldername(name))[1] = auth.uid()::text
  );
