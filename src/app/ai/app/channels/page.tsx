import Link from "next/link";
import { redirect } from "next/navigation";

export default function LegacyChannelsRedirectPage() {
  redirect("/ai/app/campaign");
}
