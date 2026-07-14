import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { spawnSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const target = process.argv[2];

if (target !== "dev") {
  console.error(
    "Lokalnie można pushować migracje tylko na 'dev'. Preview i prod aktualizuje wyłącznie CI (patrz .github/workflows/db-migrate.yml)."
  );
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

const dbUrl = env.DEV_DB_URL;
if (!dbUrl || dbUrl.includes("REPLACE_ME")) {
  console.error("Brak połączenia dla 'dev' w .env.supabase-cli (DEV_DB_URL).");
  process.exit(1);
}

const result = spawnSync(
  "npx",
  ["supabase", "db", "push", "--db-url", dbUrl, "--include-all", "--yes"],
  { stdio: "inherit", shell: true }
);
process.exit(result.status ?? 1);
