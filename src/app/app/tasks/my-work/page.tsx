import { redirect } from "next/navigation";

export default function TasksMyWorkRedirectPage() {
  redirect("/app/tasks/today");
}
