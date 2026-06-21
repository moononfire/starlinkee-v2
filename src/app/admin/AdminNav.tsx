"use client";

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
      { href: "/admin/plates", label: "Płytki" },
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

export default function AdminNav({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();

  return (
    <aside className="w-56 bg-gray-900 text-white flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <Link href="/admin/dashboard" className="font-bold text-lg hover:text-blue-400 transition-colors">
          Starlinkee
        </Link>
      </div>
      <nav className="flex-1 p-2 space-y-4">
        {groups.map(({ label, links }) => (
          <div key={label}>
            <p className="px-3 mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
              {label}
            </p>
            <div className="space-y-1">
              {links.map(({ href, label: linkLabel }) => {
                const active = pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`block px-3 py-2 rounded text-sm font-medium transition-colors ${
                      active
                        ? "bg-blue-600 text-white"
                        : "text-gray-300 hover:bg-gray-700 hover:text-white"
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
      <div className="p-4 border-t border-gray-700 space-y-2">
        <p className="text-xs text-gray-400 truncate">{userEmail}</p>
        <form action={logoutAction}>
          <button
            type="submit"
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            Wyloguj
          </button>
        </form>
      </div>
    </aside>
  );
}
