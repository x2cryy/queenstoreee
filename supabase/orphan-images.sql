-- قراءة فقط: ملفات في التخزين غير مرتبطة بأي سجل. لا تحذف شيئًا آليًا.
-- راجع النتيجة يدويًا، ولا تحذف ملفًا عمره أقل من يوم (قد يكون رفعًا جاريًا).
select o.bucket_id, o.name, o.created_at
from storage.objects o
where o.bucket_id = 'product-images'
  and not exists (select 1 from public.product_images i where i.storage_path = o.name)
  and not exists (select 1 from public.product_variants v where v.image_path = o.name)
  and not exists (select 1 from public.product_option_values ov where ov.image_path = o.name)
union all
select o.bucket_id, o.name, o.created_at
from storage.objects o
where o.bucket_id = 'product-360'
  and not exists (select 1 from public.product_360_images i where i.storage_path = o.name)
order by created_at;
