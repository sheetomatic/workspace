import { ClassroomRoom } from "@/components/learn/classroom-room";
import { loadTeacherClassroom } from "@/lib/learn/classroom-access";
import "@/components/learn/classroom-room.css";

export default async function MySpaceClassroomPage({
  params,
}: {
  params: Promise<{ slotId: string }>;
}) {
  const { slotId } = await params;
  const view = await loadTeacherClassroom(slotId);

  if (!view.ok) {
    return (
      <main className="classroom-shell">
        <p className="classroom-note">{view.message}</p>
      </main>
    );
  }

  const { ok: _ok, ...room } = view;
  return <ClassroomRoom {...room} backHref="/app/my-space/training" />;
}
