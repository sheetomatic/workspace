import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { applySheetsTeachingContent } from "../src/lib/learn/apply-sheets-teaching";

function loadEnvFiles() {
  for (const file of [".env.local", ".env"]) {
    const filePath = join(process.cwd(), file);
    if (!existsSync(filePath)) continue;
    const text = readFileSync(filePath, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      if (process.env[key]) continue;
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  }
}

async function main() {
  loadEnvFiles();
  const result = await applySheetsTeachingContent({ force: true });
  console.log(result);
  if (!result.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
