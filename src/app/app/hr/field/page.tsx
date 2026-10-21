import { redirect } from "next/navigation";

/** Field tracking is a peer module — keep the old HRMS path working. */
export default function HrFieldRedirectPage() {
  redirect("/app/field");
}
