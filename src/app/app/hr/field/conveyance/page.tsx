import { redirect } from "next/navigation";

/** Field conveyance lives under /app/field now. */
export default function HrFieldConveyanceRedirectPage() {
  redirect("/app/field/conveyance");
}
