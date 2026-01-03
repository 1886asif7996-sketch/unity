-- RUN THIS TO SETUP STORAGE FOR PROFILE REVIEWS

-- 1. Create a new bucket called 'avatars' (if it doesn't exist)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 2. Allow Public Access to view images
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'avatars' );

-- 3. Allow Authenticated Users to Upload
create policy "Authenticated Upload"
  on storage.objects for insert
  with check ( bucket_id = 'avatars' and auth.role() = 'authenticated' );

-- 4. Allow Users to Update their own images
create policy "User Update Own"
  on storage.objects for update
  using ( bucket_id = 'avatars' and auth.uid() = owner );

-- Reload config
NOTIFY pgrst, 'reload config';
