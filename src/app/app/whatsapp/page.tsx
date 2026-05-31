import { redirect } from "next/navigation";

export default function LegacyWhatsAppRedirect() {
  redirect("/ai/app/channels");
}
