import { NextRequest, NextResponse } from "next/server";
import { getPlateByNumber, assignNfcToPlate } from "@/lib/db/plates";
import { checkMobileKey } from "@/lib/mobile-auth";

export async function POST(request: NextRequest) {
  const authError = checkMobileKey(request);
  if (authError) return authError;

  const { plate_number, nfc_uid } = await request.json();

  if (!plate_number || !nfc_uid) {
    return NextResponse.json({ error: "Missing plate_number or nfc_uid" }, { status: 400 });
  }

  const plate = await getPlateByNumber(plate_number);
  if (!plate) {
    return NextResponse.json({ error: "Plate not found" }, { status: 404 });
  }

  // Idempotent: if already assigned to this exact uid, return success
  if (plate.nfc_uid && plate.nfc_uid !== nfc_uid) {
    return NextResponse.json({ error: "Plate already assigned to a different NFC tag" }, { status: 409 });
  }

  if (!plate.nfc_uid) {
    await assignNfcToPlate(plate.plate_number, nfc_uid);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const nfc_url = `${appUrl}/plate/${plate.plate_number}/${plate.secret_key}`;

  return NextResponse.json({ nfc_url });
}
