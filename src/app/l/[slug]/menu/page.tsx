import { notFound, redirect } from "next/navigation";
import { getLocationBySlug } from "@/lib/db/locations";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function PublicMenuPage({ params }: Props) {
  const { slug } = await params;
  const location = await getLocationBySlug(slug);

  if (!location || !location.has_menu_enabled) {
    notFound();
  }

  if (location.menu_type === "link" && location.menu_link) {
    redirect(location.menu_link);
  }

  if (location.menu_type === "image" && location.menu_image_url) {
    return (
      <main className="min-h-screen bg-gray-900 flex flex-col items-center p-4 pt-12">
        <h1 className="text-white text-xl font-bold mb-6">{location.location_name} - Menu</h1>
        <div className="w-full max-w-2xl bg-white rounded-xl overflow-hidden shadow-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={location.menu_image_url}
            alt={`${location.location_name} Menu`}
            className="w-full h-auto block"
          />
        </div>
        <a
          href={`/l/${slug}`}
          className="mt-8 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full font-medium transition-colors"
        >
          Powrót
        </a>
      </main>
    );
  }

  // Fallback
  redirect(`/l/${slug}`);
}
