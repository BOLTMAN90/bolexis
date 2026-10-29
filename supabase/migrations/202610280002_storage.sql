-- Property images live in a private bucket. Members of the workspace can read
-- objects whose first path segment is the workspace id. Agents and above can
-- write those objects. The application validates type and size before upload.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'property-images',
  'property-images',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy property_images_storage_select
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'property-images'
    and public.is_workspace_member(((storage.foldername(name))[1])::uuid)
  );

create policy property_images_storage_insert
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'property-images'
    and public.has_workspace_role(
      ((storage.foldername(name))[1])::uuid,
      array['owner', 'admin', 'agent']::public.workspace_role[]
    )
  );

create policy property_images_storage_update
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'property-images'
    and public.has_workspace_role(
      ((storage.foldername(name))[1])::uuid,
      array['owner', 'admin', 'agent']::public.workspace_role[]
    )
  )
  with check (
    bucket_id = 'property-images'
    and public.has_workspace_role(
      ((storage.foldername(name))[1])::uuid,
      array['owner', 'admin', 'agent']::public.workspace_role[]
    )
  );

create policy property_images_storage_delete
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'property-images'
    and public.has_workspace_role(
      ((storage.foldername(name))[1])::uuid,
      array['owner', 'admin', 'agent']::public.workspace_role[]
    )
  );
