// Jednorazowy skrypt: zachowuje customer_id 44 (przemianowany na "Testowy Klient"),
// usuwa wszystkich pozostałych klientów wraz z powiązanymi rekordami, oraz usuwa
// WSZYSTKIE recenzje (również te należące do klienta 44).
import { createClient } from "@supabase/supabase-js";

const KEEP_CUSTOMER_ID = 44;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  // 0. Upewnij się, że klient 44 istnieje
  const { data: keepCustomer, error: keepErr } = await supabase
    .from("customers")
    .select("customer_id, customer_name")
    .eq("customer_id", KEEP_CUSTOMER_ID)
    .maybeSingle();
  if (keepErr) throw keepErr;
  if (!keepCustomer) throw new Error(`Klient o id ${KEEP_CUSTOMER_ID} nie istnieje.`);
  console.log(`Zachowuję klienta ${KEEP_CUSTOMER_ID} (obecna nazwa: "${keepCustomer.customer_name}")`);

  // 1. Usuń WSZYSTKIE recenzje (bez wyjątków)
  const { error: reviewsErr, count: reviewsCount } = await supabase
    .from("reviews")
    .delete({ count: "exact" })
    .not("review_id", "is", null);
  if (reviewsErr) throw reviewsErr;
  console.log(`Usunięto recenzji: ${reviewsCount}`);

  // 2. Zbierz subskrypcje i lokalizacje należące do innych klientów
  const { data: otherSubs, error: subsErr } = await supabase
    .from("subscriptions")
    .select("subscription_id")
    .neq("customer_id", KEEP_CUSTOMER_ID);
  if (subsErr) throw subsErr;
  const subIds = otherSubs.map((s) => s.subscription_id);

  let locIds = [];
  if (subIds.length > 0) {
    const { data: locs, error: locsErr } = await supabase
      .from("customer_locations")
      .select("location_id")
      .in("subscription_id", subIds);
    if (locsErr) throw locsErr;
    locIds = locs.map((l) => l.location_id);
  }

  // 3. Usuń dzieci lokalizacji (loyalty_otp, loyalty_cards, location_leads,
  //    scan_tokens, page_views, customer_location_links)
  if (locIds.length > 0) {
    for (const table of [
      "loyalty_otp",
      "loyalty_cards",
      "location_leads",
      "scan_tokens",
    ]) {
      const { error } = await supabase.from(table).delete().in("location_id", locIds);
      if (error) throw error;
      console.log(`Wyczyszczono ${table}`);
    }

    // page_views ma FK on delete set null, ale i tak posprzątajmy powiązane
    const { error: pvErr } = await supabase
      .from("page_views")
      .delete()
      .in("location_id", locIds);
    if (pvErr) throw pvErr;
    console.log("Wyczyszczono page_views");

    const { error: linksErr } = await supabase
      .from("customer_location_links")
      .delete()
      .in("customer_location_id", locIds);
    if (linksErr) throw linksErr;
    console.log("Wyczyszczono customer_location_links");

    const { error: clErr } = await supabase
      .from("customer_locations")
      .delete()
      .in("location_id", locIds);
    if (clErr) throw clErr;
    console.log("Wyczyszczono customer_locations");
  }

  // 4. Usuń płytki (plates) przypisane do subskrypcji innych klientów
  if (subIds.length > 0) {
    const { error: platesErr, count: platesCount } = await supabase
      .from("plates")
      .delete({ count: "exact" })
      .in("subscription_id", subIds);
    if (platesErr) throw platesErr;
    console.log(`Usunięto płytek: ${platesCount}`);
  }

  // 5. Usuń zamówienia innych klientów (najpierw order_items i shipments)
  const { data: otherOrders, error: ordersSelErr } = await supabase
    .from("orders")
    .select("order_id")
    .neq("customer_id", KEEP_CUSTOMER_ID);
  if (ordersSelErr) throw ordersSelErr;
  const orderIds = otherOrders.map((o) => o.order_id);

  if (orderIds.length > 0) {
    const { error: itemsErr } = await supabase
      .from("order_items")
      .delete()
      .in("order_id", orderIds);
    if (itemsErr) throw itemsErr;
    console.log("Wyczyszczono order_items");

    const { error: shipErr } = await supabase
      .from("shipments")
      .delete()
      .in("order_id", orderIds);
    if (shipErr) throw shipErr;
    console.log("Wyczyszczono shipments");
  }

  const { error: ordersErr, count: ordersCount } = await supabase
    .from("orders")
    .delete({ count: "exact" })
    .neq("customer_id", KEEP_CUSTOMER_ID);
  if (ordersErr) throw ordersErr;
  console.log(`Usunięto zamówień: ${ordersCount}`);

  // 6. Usuń subskrypcje innych klientów
  const { error: subsDelErr, count: subsCount } = await supabase
    .from("subscriptions")
    .delete({ count: "exact" })
    .neq("customer_id", KEEP_CUSTOMER_ID);
  if (subsDelErr) throw subsDelErr;
  console.log(`Usunięto subskrypcji: ${subsCount}`);

  // 7. Usuń pozostałych klientów
  const { error: custErr, count: custCount } = await supabase
    .from("customers")
    .delete({ count: "exact" })
    .neq("customer_id", KEEP_CUSTOMER_ID);
  if (custErr) throw custErr;
  console.log(`Usunięto klientów: ${custCount}`);

  // 8. Zmień nazwę pozostałego klienta
  const { error: renameErr } = await supabase
    .from("customers")
    .update({ customer_name: "Testowy Klient" })
    .eq("customer_id", KEEP_CUSTOMER_ID);
  if (renameErr) throw renameErr;
  console.log(`Klient ${KEEP_CUSTOMER_ID} przemianowany na "Testowy Klient"`);

  console.log("Gotowe.");
}

main().catch((err) => {
  console.error("BŁĄD:", err);
  process.exit(1);
});
