import { NextRequest, NextResponse } from "next/server";
import { getPlateByNumber, assignNfcToPlate } from "@/lib/db/plates";
import { checkMobileKey } from "@/lib/mobile-auth";
import { clientIp } from "@/lib/rate-limit";

const RETRY_WINDOW_MS = 15 * 60_000;

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

  // Retrying the same tag is allowed (the chip write may have failed after the
  // DB write), but only shortly after the assignment: later, the response
  // would hand the plate secret to whoever knows the UID and the shared key.
  if (plate.nfc_uid) {
    if (plate.nfc_uid !== nfc_uid) {
      return NextResponse.json({ error: "Plate already assigned to a different NFC tag" }, { status: 409 });
    }
    const assignedAt = plate.nfc_assigned_at ? new Date(plate.nfc_assigned_at).getTime() : 0;
    if (Date.now() - assignedAt > RETRY_WINDOW_MS) {
      return NextResponse.json({ error: "Plate is already tagged" }, { status: 409 });
    }
  } else {
    await assignNfcToPlate(plate.plate_number, nfc_uid);
    console.info(
      JSON.stringify({
        event: "nfc_assigned",
        plate_number: plate.plate_number,
        nfc_uid,
        ip: clientIp(request),
        at: new Date().toISOString(),
      })
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const nfc_url = `${appUrl}/plate/${plate.plate_number}/${plate.secret_key}`;

  return NextResponse.json({ nfc_url });
}
