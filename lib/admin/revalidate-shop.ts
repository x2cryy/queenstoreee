import { revalidatePath } from "next/cache";

// يحدّث صفحات المتجر العامة فور تغيير منتج أو كميته، بدل انتظار مدة التخزين المؤقت.
export function revalidateShop() {
  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/categories");
  revalidatePath("/category/[slug]", "page");
  revalidatePath("/product/[slug]", "page");
  revalidatePath("/admin/inventory");
}
