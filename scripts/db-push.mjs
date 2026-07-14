import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { spawnSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const target = process.argv[2];
const envKey = { dev: "DEV_DB_URL", preview: "PREVIEW_DB_URL", prod: "PROD_DB_URL" }[target];

if (!envKey) {
  console.error("Użycie: node scripts/db-push.mjs <dev|preview|prod>");
  process.exit(1);
}

const envPath = join(__dirname, "../.env.supabase-cli");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => l.split("=").map((s) => s.trim()))
    .map(([k, ...v]) => [k, v.join("=").replace(/^["']|["']$/g, "")])
);

const dbUrl = env[envKey];
if (!dbUrl || dbUrl.includes("REPLACE_ME")) {
  console.error(`Brak połączenia dla '${target}' w .env.supabase-cli (${envKey}).`);
  process.exit(1);
}

if (target === "prod") {
  console.log("Pushuję migracje na PRODUKCJĘ. Upewnij się, że były już przetestowane na dev/preview.");
}

const result = spawnSync(
  "npx",
  ["supabase", "db", "push", "--db-url", dbUrl, "--include-all", "--yes"],
  { stdio: "inherit", shell: true }
);
process.exit(result.status ?? 1);
