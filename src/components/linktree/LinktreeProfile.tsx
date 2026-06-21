import Link from "next/link";
import type { CustomerLocation, CustomerLocationLink } from "@/lib/types";

interface Props {
  location: CustomerLocation;
  links: CustomerLocationLink[];
  slug: string;
  scanToken?: string;
}

export default function LinktreeProfile({ location, links, slug, scanToken }: Props) {
  return (
    <main className="min-h-screen flex flex-col items-center p-6 bg-white">
      <div className="max-w-sm w-full flex flex-col items-center gap-6 pt-10">
        {location.logo_link && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={location.logo_link}
            alt={location.location_name}
            className="h-24 w-24 object-cover rounded-full"
          />
        )}

        <h1 className="text-2xl font-bold text-gray-900 text-center">
          {location.location_name}
        </h1>

        <div className="w-full flex flex-col gap-3">
          <Link
            href={`/l/${slug}/review`}
            className="w-full text-center py-3 px-6 rounded-full bg-blue-600 hover:bg-blue-700 font-semibold text-white transition-colors"
          >
            ⭐ Zostaw opinię
          </Link>
          {links.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full text-center py-3 px-6 rounded-full border border-gray-200 font-medium text-gray-800 hover:bg-gray-50 transition-colors"
            >
              {link.title}
            </a>
          ))}
        </div>

        {location.has_promo_enabled && (
          <div className="w-full mt-2">
            <Link
              href={`/l/${slug}/promo${scanToken ? `?scan=${scanToken}` : ""}`}
              className="block w-full text-center py-3 px-6 rounded-full bg-amber-400 hover:bg-amber-500 font-semibold text-gray-900 transition-colors"
            >
              {location.promo_banner_text ?? "Odbierz promocję"}
            </Link>
          </div>
        )}

        {location.has_loyalty_enabled && (
          <div className="w-full">
            <Link
              href={`/l/${slug}/loyalty`}
              className="block w-full text-center py-3 px-6 rounded-full bg-gray-900 hover:bg-gray-700 font-semibold text-white transition-colors"
            >
              Karta lojalnościowa
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
