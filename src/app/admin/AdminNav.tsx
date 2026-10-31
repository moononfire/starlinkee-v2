"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "../login/actions";

const groups = [
  {
    label: "Platforma",
    links: [
      { href: "/admin/dashboard", label: "Dashboard" },
      { href: "/admin/customers", label: "Klienci" },
      { href: "/admin/places", label: "Places" },
      { href: "/admin/subscriptions", label: "Subskrypcje" },
      { href: "/admin/plates", label: "Tabliczki" },
      { href: "/admin/plates/quick-activate", label: "Szybka aktywacja" },
      { href: "/admin/reviews", label: "Recenzje" },
      { href: "/admin/analytics", label: "Analityka" },
    ],
  },
  {
    label: "Logistyka",
    links: [
      { href: "/admin/orders", label: "Zamówienia" },
      { href: "/admin/shipments", label: "Wysyłki" },
    ],
  },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  // Only the most specific matching link is active (/admin/plates/quick-activate must not light up "Tabliczki" too).
  const hrefs = groups.flatMap((g) => g.links.map((l) => l.href));
  const activeHref = hrefs.filter((h) => pathname.startsWith(h)).sort((a, b) => b.length - a.length)[0];
  return (
    <nav className="flex-1 p-2 space-y-4 overflow-y-auto">
      {groups.map(({ label, links }) => (
        <div key={label}>
          <p className="px-3 mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">{label}</p>
          <div className="space-y-1">
            {links.map(({ href, label: linkLabel }) => {
              const active = href === activeHref;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onNavigate}
                  className={`block px-3 py-2 min-h-[44px] flex items-center rounded text-sm font-medium transition-colors md:min-h-0 md:block ${
                    active ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-700 hover:text-white"
                  }`}
                >
                  {linkLabel}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function NavFooter({ userEmail }: { userEmail: string }) {
  return (
    <div className="p-4 border-t border-gray-700 space-y-2">
      <p className="text-xs text-gray-400 truncate">{userEmail}</p>
      <form action={logoutAction}>
        <button type="submit" className="text-xs text-gray-400 hover:text-white transition-colors min-h-[44px] md:min-h-0">
          Wyloguj
        </button>
      </form>
    </div>
  );
}

export default function AdminNav({ userEmail }: { userEmail: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* From md: the fixed side navigation, as before */}
      <aside className="hidden md:flex w-56 shrink-0 bg-gray-900 text-white flex-col">
        <div className="p-4 border-b border-gray-700">
          <Link href="/admin/dashboard" className="font-bold text-lg hover:text-blue-400 transition-colors">
            Starlinkee
          </Link>
        </div>
        <NavLinks />
        <NavFooter userEmail={userEmail} />
      </aside>

      {/* Below md: a top bar with a hamburger that opens the same menu as a drawer */}
      <header className="md:hidden sticky top-0 z-30 flex items-center gap-3 bg-gray-900 text-white px-2 h-14 shrink-0">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Menu"
          aria-expanded={open}
          aria-controls="admin-drawer"
          className="w-11 h-11 flex items-center justify-center rounded hover:bg-gray-700"
        >
          <span aria-hidden className="text-2xl leading-none">☰</span>
        </button>
        <Link href="/admin/dashboard" className="font-bold text-lg">
          Starlinkee
        </Link>
      </header>

      {open && (
        <div className="md:hidden fixed inset-0 z-40">
          <div data-testid="admin-drawer-backdrop" className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div
            id="admin-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="absolute inset-y-0 left-0 w-64 max-w-[85vw] bg-gray-900 text-white flex flex-col"
          >
            <div className="p-2 border-b border-gray-700 flex items-center justify-between">
              <span className="px-2 font-bold text-lg">Starlinkee</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Zamknij menu"
                className="w-11 h-11 flex items-center justify-center rounded hover:bg-gray-700"
              >
                <span aria-hidden className="text-xl leading-none">✕</span>
              </button>
            </div>
            <NavLinks onNavigate={() => setOpen(false)} />
            <NavFooter userEmail={userEmail} />
          </div>
        </div>
      )}
    </>
  );
}
