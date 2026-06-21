"use client";

import QRCode from "react-qr-code";

interface Props {
  isUsed: boolean;
  bannerText: string;
  couponCode: string;
}

export default function ClaimClient({ isUsed, bannerText, couponCode }: Props) {
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify?code=${couponCode}`;

  if (isUsed) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
        <p className="text-gray-500 text-sm font-medium">Ten kupon został już wykorzystany.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-6 text-center">
        <p className="text-amber-900 font-semibold text-lg">{bannerText || "Twoja promocja"}</p>
      </div>

      <div className="flex flex-col items-center gap-4">
        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Kod kuponu</p>
        <p className="text-3xl font-mono font-bold tracking-widest text-gray-900">{couponCode}</p>

        <div className="bg-white p-3 rounded-xl border border-gray-100">
          <QRCode value={verifyUrl} size={180} />
        </div>
      </div>

      <p className="text-sm text-gray-600 text-center">
        Pokaż ten kod obsłudze restauracji.
      </p>
    </div>
  );
}
