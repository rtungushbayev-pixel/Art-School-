-- Несколько фото в одной публикации Комьюнити: не больше 10 на работу
-- (так же ограничено в приложении, MAX_POST_PHOTOS).

create function public.enforce_post_photo_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.post_images where post_id = new.post_id) >= 10 then
    raise exception 'too_many_photos';
  end if;
  return new;
end;
$$;

create trigger post_images_photo_limit
  before insert on public.post_images
  for each row execute procedure public.enforce_post_photo_limit();
