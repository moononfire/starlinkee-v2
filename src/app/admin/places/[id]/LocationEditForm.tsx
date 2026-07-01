"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CustomerLocation, CustomerLocationLink } from "@/lib/types";

interface Props {
  location: CustomerLocation;
  initialLinks: CustomerLocationLink[];
}

export default function LocationEditForm({ location, initialLinks }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [slug, setSlug] = useState(location.linktree_slug ?? "");
  const [hasLinktreeAccess, setHasLinktreeAccess] = useState(location.has_linktree_access);
  const [hasPromo, setHasPromo] = useState(location.has_promo_enabled);
  const [hasLoyalty, setHasLoyalty] = useState(location.has_loyalty_enabled);
  const [promoBanner, setPromoBanner] = useState(location.promo_banner_text ?? "");
  const [promoSms, setPromoSms] = useState(location.promo_sms_text ?? "");
  const [googleReviewLink, setGoogleReviewLink] = useState(location.google_review_link ?? "");
  const [googlePlacesId, setGooglePlacesId] = useState(location.google_places_id ?? "");
  const [supportEmail, setSupportEmail] = useState(location.support_email ?? "");
  const [logoLink, setLogoLink] = useState(location.logo_link ?? "");
  const [ownerEmail, setOwnerEmail] = useState(location.owner_email ?? "");

  const [links, setLinks] = useState<{ title_pl: string; title_en: string; title_de: string; url: string }[]>(
    initialLinks.map((l) => ({
      title_pl: l.title_pl ?? l.title,
      title_en: l.title_en ?? "",
      title_de: l.title_de ?? "",
      url: l.url,
    }))
  );

  function addLink() {
    setLinks([...links, { title_pl: "", title_en: "", title_de: "", url: "" }]);
  }

  function removeLink(idx: number) {
    setLinks(links.filter((_, i) => i !== idx));
  }

  function updateLink(idx: number, field: "title_pl" | "title_en" | "title_de" | "url", value: string) {
    setLinks(links.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const body = {
      location_id: location.location_id,
      linktree_slug: slug.trim() || null,
      has_linktree_access: hasLinktreeAccess,
      has_promo_enabled: hasPromo,
      has_loyalty_enabled: hasLoyalty,
      promo_banner_text: promoBanner.trim() || null,
      promo_sms_text: promoSms.trim() || null,
      google_review_link: googleReviewLink.trim() || null,
      google_places_id: googlePlacesId.trim() || null,
      support_email: supportEmail.trim() || null,
      logo_link: logoLink.trim() || null,
      owner_email: ownerEmail.trim() || null,
      links: links
        .filter((l) => (l.title_pl || l.title_en || l.title_de) && l.url.trim())
        .map((l, i) => ({
          title: l.title_pl.trim() || l.title_en.trim() || l.title_de.trim(),
          title_pl: l.title_pl.trim() || null,
          title_en: l.title_en.trim() || null,
          title_de: l.title_de.trim() || null,
          url: l.url.trim(),
          sort_order: i,
        })),
    };

    const res = await fetch("/api/admin/locations", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setMessage("Zapisano pomyślnie");
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      setMessage(`Błąd: ${data?.error ?? res.statusText}`);
    }

    setSaving(false);
  }

  const inputClass =
    "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent";
  const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl">
      {/* Linktree */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Linktree</h2>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={hasLinktreeAccess}
            onChange={(e) => setHasLinktreeAccess(e.target.checked)}
            className="h-4 w-4"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Linktree aktywny</span>
        </div>

        <div>
          <label className={labelClass}>Slug</label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">/l/</span>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="nazwa-firmy"
              className={inputClass}
            />
          </div>
        </div>
      </section>

      {/* Usługi */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Usługi</h2>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={hasPromo}
            onChange={(e) => setHasPromo(e.target.checked)}
            className="h-4 w-4"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Promocja (promo link)</span>
        </div>

        {hasPromo && (
          <div className="ml-7 space-y-3">
            <div>
              <label className={labelClass}>Tekst baneru promocji</label>
              <input
                type="text"
                value={promoBanner}
                onChange={(e) => setPromoBanner(e.target.value)}
                placeholder="Odbierz promocję"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Tekst SMS promocji</label>
              <input
                type="text"
                value={promoSms}
                onChange={(e) => setPromoSms(e.target.value)}
                placeholder="Twoja promocja: ..."
                className={inputClass}
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={hasLoyalty}
            onChange={(e) => setHasLoyalty(e.target.checked)}
            className="h-4 w-4"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Karta lojalnościowa</span>
        </div>
      </section>

      {/* Linki */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Linki na profilu</h2>
          <button
            type="button"
            onClick={addLink}
            className="text-sm px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + Dodaj link
          </button>
        </div>

        {links.length === 0 && (
          <p className="text-sm text-gray-400">Brak linków</p>
        )}

        {links.map((link, idx) => (
          <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">PL</label>
                <input
                  type="text"
                  value={link.title_pl}
                  onChange={(e) => updateLink(idx, "title_pl", e.target.value)}
                  placeholder="Tytuł po polsku"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">EN</label>
                <input
                  type="text"
                  value={link.title_en}
                  onChange={(e) => updateLink(idx, "title_en", e.target.value)}
                  placeholder="Title in English"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">DE</label>
                <input
                  type="text"
                  value={link.title_de}
                  onChange={(e) => updateLink(idx, "title_de", e.target.value)}
                  placeholder="Titel auf Deutsch"
                  className={inputClass}
                />
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <input
                type="url"
                value={link.url}
                onChange={(e) => updateLink(idx, "url", e.target.value)}
                placeholder="https://..."
                className={`${inputClass} flex-1`}
              />
              <button
                type="button"
                onClick={() => removeLink(idx)}
                className="text-red-500 hover:text-red-700 text-sm shrink-0"
              >
                Usuń
              </button>
            </div>
          </div>
        ))}
      </section>

      {/* Dane dodatkowe */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Dane dodatkowe</h2>

        <div>
          <label className={labelClass}>Google Review Link</label>
          <input type="url" value={googleReviewLink} onChange={(e) => setGoogleReviewLink(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Google Places ID</label>
          <input type="text" value={googlePlacesId} onChange={(e) => setGooglePlacesId(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Email wsparcia</label>
          <input type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Logo URL</label>
          <input type="url" value={logoLink} onChange={(e) => setLogoLink(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Email właściciela</label>
          <input type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} className={inputClass} />
        </div>
      </section>

      {/* Submit */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Zapisywanie..." : "Zapisz"}
        </button>
        {message && (
          <span className={`text-sm ${message.startsWith("Błąd") ? "text-red-600" : "text-green-600"}`}>
            {message}
          </span>
        )}
      </div>
    </form>
  );
}
