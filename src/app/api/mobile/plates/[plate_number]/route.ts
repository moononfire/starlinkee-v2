import { NextRequest, NextResponse } from "next/server";
import { getPlateByNumber } from "@/lib/db/plates";
import { checkMobileKey } from "@/lib/mobile-auth";

interface Props {
  params: Promise<{ plate_number: string }>;
}

export async function GET(request: NextRequest, { params }: Props) {
  const authError = checkMobileKey(request);
  if (authError) return authError;

  const { plate_number } = await params;

  const plate = await getPlateByNumber(plate_number);
  if (!plate) {
    return NextResponse.json({ error: "Plate not found" }, { status: 404 });
  }

  return NextResponse.json({
    plate_number: plate.plate_number,
    nfc_uid: plate.nfc_uid,
    subscription_id: plate.subscription_id,
    plate_language: plate.plate_language,
  });
}
