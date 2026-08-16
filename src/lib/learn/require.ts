import { redirect } from "next/navigation";
import { requireLearnEnrollment } from "@/lib/learn/session";

export async function requireStudent() {
  const enrollment = await requireLearnEnrollment();
  if (!enrollment) {
    redirect("/learn/login");
  }
  return enrollment;
}
