// Hard guard: e2e and seed scripts write and DELETE data, so they may only talk to a local
// Supabase (`supabase start`). The remote project in .env.local is PRODUCTION.
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]", "::1"]);

export function isLocalSupabaseUrl(url) {
  try {
    return LOCAL_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

/** Throws unless `url` points at a local Supabase. `what` names the caller in the message. */
export function assertLocalSupabase(url, what) {
  if (isLocalSupabaseUrl(url)) return;
  let host = "(brak lub nieprawidłowy URL)";
  try {
    host = new URL(url).hostname;
  } catch {}
  throw new Error(
    `${what}: odmowa startu — NEXT_PUBLIC_SUPABASE_URL wskazuje na ${host}, a to nie jest lokalny Supabase ` +
      `(127.0.0.1/localhost). Zdalny projekt z .env.local to PRODUKCJA; e2e i seed zapisują i kasują dane. ` +
      `Użyj: supabase start && npm run test:e2e`
  );
}

// --- Scripts that mutate a remote database (cleanup-customers, db-push) ---
// Default is refusal. A remote target is allowed only with BOTH flags, and the ref given to
// --confirm-project must match the ref of the target URL: `--i-know-this-is-prod --confirm-project=<ref>`.
export const PROD_PROJECT_REF = "sntsftkutpcppszbyjeq";

/** Project ref from a `https://<ref>.supabase.co` API URL; null for anything else. */
export function projectRefFromUrl(url) {
  try {
    const m = new URL(url).hostname.match(/^([a-z0-9]{20})\.supabase\.(?:co|in)$/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

/** True only when argv carries --i-know-this-is-prod and --confirm-project=<expectedRef>. */
export function hasProdConfirmation(argv, expectedRef) {
  if (!expectedRef) return false;
  const ack = argv.includes("--i-know-this-is-prod");
  const confirm = argv.find((a) => a.startsWith("--confirm-project="))?.slice("--confirm-project=".length);
  return ack && confirm === expectedRef;
}

function refuse(what, target, hint) {
  return new Error(
    `${what}: odmowa startu — cel ${target} nie jest lokalnym Supabase. ${hint} ` +
      `Obejście (świadome): --i-know-this-is-prod --confirm-project=<ref celu>. Nic nie zostało wykonane.`
  );
}

/** Local URL passes; any other URL needs both flags with --confirm-project matching the URL's ref. */
export function assertLocalOrConfirmedProd(url, argv, what) {
  if (isLocalSupabaseUrl(url)) return;
  const ref = projectRefFromUrl(url);
  if (hasProdConfirmation(argv, ref)) return;
  throw refuse(what, ref ?? "(nieznany lub brak URL)", ref === PROD_PROJECT_REF ? "To PRODUKCJA." : "");
}

/** For a DB connection string (remote dev is fine): refuses only when it points at the prod project. */
export function assertNotProdUnlessConfirmed(dbUrl, argv, what) {
  if (!dbUrl || !dbUrl.includes(PROD_PROJECT_REF)) return;
  if (hasProdConfirmation(argv, PROD_PROJECT_REF)) return;
  throw refuse(what, PROD_PROJECT_REF, "To PRODUKCJA (zawiera ref produkcji).");
}
