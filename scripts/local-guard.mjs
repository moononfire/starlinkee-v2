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
