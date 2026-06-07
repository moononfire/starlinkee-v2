import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const env = Object.fromEntries(
  readFileSync(join(__dirname, "../.env.local"), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => l.split("=").map((s) => s.trim()))
    .map(([k, ...v]) => [k, v.join("=")])
);

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

async function insert(table, data) {
  const { data: row, error } = await supabase
    .from(table)
    .insert(data)
    .select()
    .single();
  if (error) throw new Error(`${table}: ${error.message}`);
  console.log(`✓ ${table}`);
  return row;
}

async function exists(table, col, val) {
  const { data } = await supabase.from(table).select("*").eq(col, val).maybeSingle();
  return data;
}

async function seed() {
  // --- Customer ---
  let customer = await exists("customers", "email", "test@example.com");
  if (!customer) {
    customer = await insert("customers", {
      customer_type: "business",
      customer_name: "Test Restaurant GmbH",
      email: "test@example.com",
      phone: "+48123456789",
      preferred_language: "pl",
      country: "PL",
    });
  } else {
    console.log("~ customers już istnieje");
  }

  // --- Subskrypcja aktywna ---
  let subActive = await exists("subscriptions", "subscription_name", "TEST_ACTIVE");
  if (!subActive) {
    subActive = await insert("subscriptions", {
      customer_id: customer.customer_id,
      subscription_name: "TEST_ACTIVE",
      duration_in_days: 365,
      status: "active",
      activation_datetime: new Date().toISOString(),
      expiration_datetime: new Date(Date.now() + 365 * 86400000).toISOString(),
    });
  } else {
    console.log("~ subscriptions (active) już istnieje");
  }

  // --- Subskrypcja pending ---
  let subPending = await exists("subscriptions", "subscription_name", "TEST_PENDING");
  if (!subPending) {
    subPending = await insert("subscriptions", {
      customer_id: customer.customer_id,
      subscription_name: "TEST_PENDING",
      duration_in_days: 365,
      status: "pending",
      activation_datetime: null,
      expiration_datetime: null,
    });
  } else {
    console.log("~ subscriptions (pending) już istnieje");
  }

  // --- Płytki ---
  const plateDefs = [
    { plate_number: "ACTIVE", plate_language: "pl", secret_key: "testsecretactive", subscription_id: subActive.subscription_id },
    { plate_number: "PENDNG", plate_language: "pl", secret_key: "testsecretpending", subscription_id: subPending.subscription_id },
    { plate_number: "NOSSUB", plate_language: "pl", secret_key: "testsecretnosub",  subscription_id: null },
    { plate_number: "ENACTL", plate_language: "en", secret_key: "testsecreteng",    subscription_id: subActive.subscription_id },
  ];

  for (const p of plateDefs) {
    const ex = await exists("plates", "plate_number", p.plate_number);
    if (!ex) await insert("plates", p);
    else console.log(`~ plates (${p.plate_number}) już istnieje`);
  }

  // --- Customer Location (dla aktywnej subskrypcji) ---
  let location = await exists("customer_locations", "linktree_slug", "testrestaurant");
  if (!location) {
    location = await insert("customer_locations", {
      subscription_id: subActive.subscription_id,
      location_name: "Restauracja Testowa",
      google_business_name: "Restauracja Testowa",
      google_business_address: "ul. Testowa 1, Warszawa",
      city: "Warszawa",
      google_review_link: "https://g.page/r/test-review-link",
      support_email: "support@restauracjatestowa.pl",
      linktree_slug: "testrestaurant",
      has_linktree_access: true,
      has_promo_enabled: true,
      has_loyalty_enabled: true,
      promo_banner_text: "Odbierz 10% zniżki na pierwsze zamówienie!",
      promo_sms_text: "Twoja zniżka: {link}",
      owner_email: "owner@restauracjatestowa.pl",
    });
  } else {
    console.log("~ customer_locations już istnieje");
  }

  // --- Linki linktree ---
  const { data: existingLinks } = await supabase
    .from("customer_location_links")
    .select("id")
    .eq("customer_location_id", location.location_id);

  if (!existingLinks?.length) {
    const { error } = await supabase.from("customer_location_links").insert([
      { customer_location_id: location.location_id, title: "Menu",       url: "https://example.com/menu",       sort_order: 1 },
      { customer_location_id: location.location_id, title: "Rezerwacje", url: "https://example.com/rezerwacje", sort_order: 2 },
      { customer_location_id: location.location_id, title: "Facebook",   url: "https://facebook.com/test",      sort_order: 3 },
      { customer_location_id: location.location_id, title: "Instagram",  url: "https://instagram.com/test",     sort_order: 4 },
    ]);
    if (error) throw new Error(`customer_location_links: ${error.message}`);
    console.log("✓ customer_location_links");
  } else {
    console.log("~ customer_location_links już istnieją");
  }

  console.log("\nURLe do testowania:");
  console.log("  Aktywna płytka  : http://localhost:3000/plate/ACTIVE/testsecretactive");
  console.log("  Setup (pending) : http://localhost:3000/plate/PENDNG/testsecretpending");
  console.log("  Brak subskrypcji: http://localhost:3000/plate/NOSSUB/testsecretnosub");
  console.log("  Linktree        : http://localhost:3000/l/testrestaurant");
}

// Czyści dane testowe (opcjonalnie: node run-seed.mjs --clean)
async function clean() {
  console.log("Czyszczenie danych testowych...");
  await supabase.from("customer_location_links").delete().in("title", ["Menu","Rezerwacje","Facebook","Instagram"]);
  await supabase.from("customer_locations").delete().eq("linktree_slug", "testrestaurant");
  await supabase.from("plates").delete().in("plate_number", ["ACTIVE","PENDNG","NOSSUB","ENACTL"]);
  await supabase.from("subscriptions").delete().in("subscription_name", ["TEST_ACTIVE","TEST_PENDING"]);
  await supabase.from("customers").delete().eq("email", "test@example.com");
  console.log("✓ Gotowe");
}

if (process.argv[2] === "--clean") clean().catch(console.error);
else seed().catch(console.error);
