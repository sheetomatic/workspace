import { redirect } from "next/navigation";

/** Legacy marketing SKU page — Mobile Shop Counter lives under Templates → Cloud Softwares. */
export default function AddonsRedirectPage() {
  redirect("/templates?category=cloud");
}
