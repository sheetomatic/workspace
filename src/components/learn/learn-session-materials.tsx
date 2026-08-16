import { toTrainingMaterialView } from "@/lib/courses/session-materials";

type MaterialRow = {
  id: string;
  kind: "RECORDING" | "DOCUMENT";
  title: string;
  url: string | null;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
};

export function LearnSessionMaterials({
  materials,
}: {
  materials: MaterialRow[];
}) {
  if (materials.length === 0) return null;
  return (
    <ul className="learn-material-list">
      {materials.map((item) => {
        const view = toTrainingMaterialView(item);
        return (
          <li key={item.id}>
            <a href={view.href} target="_blank" rel="noreferrer">
              {item.kind === "RECORDING" ? "Watch recording" : "Open document"}
              {" — "}
              {item.title}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
