import { redirect } from "next/navigation";
import { ClassroomRoom } from "@/components/learn/classroom-room";
import { LearnPageShell } from "@/components/learn/learn-page-shell";
import { loadStudentClassroom } from "@/lib/learn/classroom-access";
import "@/components/learn/learn-panel.css";
import "@/components/learn/classroom-room.css";

export default async function StudentClassroomPage({
  params,
}: {
  params: Promise<{ slotId: string }>;
}) {
  const { slotId } = await params;
  const view = await loadStudentClassroom(slotId);

  if (!view.ok) {
    if (view.message === "Sign in to join class.") {
      redirect("/learn/login");
    }
    return (
      <LearnPageShell>
        <main className="classroom-shell">
          <p className="classroom-note">{view.message}</p>
        </main>
      </LearnPageShell>
    );
  }

  const { ok: _ok, ...room } = view;
  return (
    <LearnPageShell>
      <ClassroomRoom {...room} backHref="/learn" />
    </LearnPageShell>
  );
}
