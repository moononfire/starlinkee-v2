import VerifyClient from "./VerifyClient";
import { getLanguage } from "@/lib/language";
import { t } from "@/lib/translations";
import LanguageSwitcher from "@/components/LanguageSwitcher";

interface Props {
  searchParams: Promise<{ code?: string }>;
}

export default async function VerifyPage({ searchParams }: Props) {
  const { code } = await searchParams;
  const lang = await getLanguage();

  return (
    <main className="min-h-screen bg-gray-50 flex items-start justify-center pt-16 px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-sm">
        <div className="flex justify-center mb-4">
          <LanguageSwitcher currentLang={lang} />
        </div>
        <h1 className="text-xl font-semibold text-gray-800 text-center mb-1">{t("verify_coupon_title", lang)}</h1>
        <p className="text-sm text-gray-500 text-center mb-8">{t("enter_coupon_status", lang)}</p>

        <VerifyClient initialCode={code ?? ""} lang={lang} />
      </div>
    </main>
  );
}
