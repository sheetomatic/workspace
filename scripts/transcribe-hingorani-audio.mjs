import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { execSync } from "child_process";
import path from "path";

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const sep = trimmed.indexOf("=");
    if (sep <= 0) continue;
    const key = trimmed.slice(0, sep).trim();
    let value = trimmed.slice(sep + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

const root = process.cwd();
loadEnvFile(path.join(root, ".env"));
loadEnvFile(path.join(root, ".env.local"));
loadEnvFile(path.join(root, ".env.transcribe.tmp"));

const apiKey = process.env.OPENAI_API_KEY?.trim();
if (!apiKey) {
  console.error("OPENAI_API_KEY missing");
  process.exit(1);
}

const dir = path.join(root, "Hingorani Law Firm");
const outDir = path.join(dir, "transcripts");
mkdirSync(outDir, { recursive: true });

const opusFiles = readFileSync("/dev/stdin", "utf8")
  .trim()
  .split("\n")
  .filter(Boolean);

for (const file of opusFiles) {
  const base = path.basename(file, path.extname(file));
  const mp3 = path.join("/tmp", `${base.replace(/[^a-zA-Z0-9._-]/g, "_")}.mp3`);
  console.log(`Transcribing: ${base}`);
  execSync(
    `ffmpeg -y -i ${JSON.stringify(file)} -ar 16000 -ac 1 ${JSON.stringify(mp3)}`,
    { stdio: "ignore" },
  );
  const form = new FormData();
  form.append("file", new Blob([readFileSync(mp3)]), "audio.mp3");
  form.append("model", "whisper-1");
  form.append("language", "hi");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  const data = await response.json();
  const text = data.text ?? JSON.stringify(data);
  writeFileSync(path.join(outDir, `${base}.txt`), text, "utf8");
  console.log(text.slice(0, 200) + (text.length > 200 ? "..." : ""));
}
