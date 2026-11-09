create or replace function public.admin_publish_site_content(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $fn$
declare
  v_uid uuid := (select auth.uid());
  v_allowed constant text[] := array['home_sections', 'contact'];
  k text;
  v jsonb;
  b jsonb;
  v_id uuid;
  v_title text;
  v_sub text;
  v_link text;
  v_img text;
  v_sort integer;
  v_act boolean;
  v_start timestamptz;
  v_end timestamptz;
  v_base text;
  v_cur timestamptz;
  v_del uuid[];
  v_ns integer := 0;
  v_nb integer := 0;
  v_nd integer := 0;
begin
  if v_uid is null or not public.has_permission('content') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'invalid payload' using errcode = '22023';
  end if;

  if p_payload ? 'settings' then
    if jsonb_typeof(p_payload -> 'settings') <> 'object' then
      raise exception 'invalid settings' using errcode = '22023';
    end if;
    for k, v in select key, value from jsonb_each(p_payload -> 'settings') loop
      if not (k = any (v_allowed)) then
        raise exception 'setting not allowed: %', k using errcode = '22023';
      end if;
      if jsonb_typeof(v) not in ('object', 'array') or pg_column_size(v) > 65536 then
        raise exception 'invalid value for %', k using errcode = '22023';
      end if;
      v_base := p_payload -> 'base' -> 'settings' ->> k;
      if v_base is not null then
        select s.updated_at into v_cur from public.site_settings s where s.key = k;
        if v_cur is not null and v_cur <> v_base::timestamptz then
          raise exception 'conflict: %', k using errcode = '40001';
        end if;
      end if;
      update public.site_settings
         set value = v, is_public = true, updated_by = v_uid
       where key = k;
      if not found then
        insert into public.site_settings (key, value, is_public, updated_by)
        values (k, v, true, v_uid);
      end if;
      v_ns := v_ns + 1;
    end loop;
  end if;

  if p_payload ? 'banners' then
    if jsonb_typeof(p_payload -> 'banners') <> 'array'
       or jsonb_array_length(p_payload -> 'banners') > 20 then
      raise exception 'invalid banners' using errcode = '22023';
    end if;
    for b in select value from jsonb_array_elements(p_payload -> 'banners') loop
      v_id    := nullif(b ->> 'id', '')::uuid;
      v_title := btrim(coalesce(b ->> 'title', ''));
      v_sub   := nullif(btrim(coalesce(b ->> 'subtitle', '')), '');
      v_link  := nullif(btrim(coalesce(b ->> 'link_url', '')), '');
      v_img   := nullif(btrim(coalesce(b ->> 'image_path', '')), '');
      v_sort  := coalesce(nullif(b ->> 'sort_order', '')::integer, 0);
      v_act   := coalesce(nullif(b ->> 'is_active', '')::boolean, true);
      v_start := nullif(b ->> 'starts_at', '')::timestamptz;
      v_end   := nullif(b ->> 'ends_at', '')::timestamptz;

      if length(v_title) > 120 or length(coalesce(v_sub, '')) > 300 then
        raise exception 'banner text too long' using errcode = '22023';
      end if;
      if v_sort < 0 or v_sort > 1000 then
        raise exception 'invalid sort order' using errcode = '22023';
      end if;
      if v_link is not null and (length(v_link) > 500
         or not (v_link ~ '^/([^/\\]|$)' or v_link ~* '^https://[^[:space:]]+$')) then
        raise exception 'invalid banner link' using errcode = '22023';
      end if;
      if v_img is not null and (v_img !~ '^[A-Za-z0-9._/-]{1,200}$' or v_img like '%..%') then
        raise exception 'invalid image path' using errcode = '22023';
      end if;
      if v_start is not null and v_end is not null and v_start > v_end then
        raise exception 'invalid dates' using errcode = '22023';
      end if;

      if v_id is not null then
        select x.updated_at into v_cur from public.banners x where x.id = v_id;
        if not found then
          raise exception 'banner not found' using errcode = 'P0002';
        end if;
        v_base := p_payload -> 'base' -> 'banners' ->> (v_id::text);
        if v_base is not null and v_cur <> v_base::timestamptz then
          raise exception 'conflict: banner' using errcode = '40001';
        end if;
        update public.banners
           set title = v_title, subtitle = v_sub, link_url = v_link,
               sort_order = v_sort, is_active = v_act,
               starts_at = v_start, ends_at = v_end,
               image_path = coalesce(v_img, image_path)
         where id = v_id;
      else
        if v_img is null then
          raise exception 'banner image required' using errcode = '22023';
        end if;
        insert into public.banners
          (title, subtitle, image_path, link_url, sort_order, is_active, starts_at, ends_at)
        values (v_title, v_sub, v_img, v_link, v_sort, v_act, v_start, v_end);
      end if;
      v_nb := v_nb + 1;
    end loop;
  end if;

  if p_payload ? 'delete_banner_ids' then
    if jsonb_typeof(p_payload -> 'delete_banner_ids') <> 'array' then
      raise exception 'invalid delete list' using errcode = '22023';
    end if;
    select coalesce(array_agg(e::uuid), '{}'::uuid[]) into v_del
      from jsonb_array_elements_text(p_payload -> 'delete_banner_ids') as t(e);
    delete from public.banners where id = any (v_del);
    get diagnostics v_nd = row_count;
  end if;

  return jsonb_build_object('ok', true, 'settings', v_ns, 'banners', v_nb,
                            'deleted', v_nd, 'published_at', now());
end
$fn$;

revoke all on function public.admin_publish_site_content(jsonb) from public, anon;
grant execute on function public.admin_publish_site_content(jsonb) to authenticated;
