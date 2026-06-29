import { appearanceToCssVars, type WorkspaceAppearance } from "@/lib/workspace-appearance";

export function WorkspaceThemeStyles({
  appearance,
}: {
  appearance: WorkspaceAppearance;
}) {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `:root { ${appearanceToCssVars(appearance)} }`,
      }}
    />
  );
}
