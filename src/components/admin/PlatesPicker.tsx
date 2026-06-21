"use client";

import { useState } from "react";

type Plate = { plate_id: number; plate_number: string; plate_language: string };

export default function PlatesPicker({ plates }: { plates: Plate[] }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const filtered = plates.filter(
    (p) =>
      p.plate_number.toLowerCase().includes(query.toLowerCase()) ||
      p.plate_language.toLowerCase().includes(query.toLowerCase())
  );

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function remove(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  const selectedPlates = plates.filter((p) => selected.has(p.plate_id));

  return (
    <div>
      {selected.size > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedPlates.map((p) => (
            <span
              key={p.plate_id}
              className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-mono font-medium px-2 py-1 rounded-full"
            >
              {p.plate_number}
              <button
                type="button"
                onClick={() => remove(p.plate_id)}
                className="hover:text-blue-600 dark:hover:text-blue-400"
              >
                ×
              </button>
            </span>
          ))}
          <span className="text-xs text-gray-500 dark:text-gray-400 self-center ml-1">
            ({selected.size} wybrano)
          </span>
        </div>
      )}

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Szukaj płytki..."
        className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-1"
      />

      <div className="border border-gray-300 dark:border-gray-600 rounded max-h-48 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="px-3 py-2 text-sm text-gray-400">Brak wyników</p>
        ) : (
          filtered.map((p) => (
            <label
              key={p.plate_id}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                selected.has(p.plate_id)
                  ? "bg-blue-50 dark:bg-blue-900/30"
                  : ""
              }`}
            >
              <input
                type="checkbox"
                checked={selected.has(p.plate_id)}
                onChange={() => toggle(p.plate_id)}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              <span className="font-mono text-gray-900 dark:text-gray-100">
                {p.plate_number}
              </span>
              <span className="text-gray-500 dark:text-gray-400 uppercase text-xs">
                {p.plate_language}
              </span>
            </label>
          ))
        )}
      </div>

      {selectedPlates.map((p) => (
        <input
          key={p.plate_id}
          type="hidden"
          name="plate_ids"
          value={p.plate_id}
        />
      ))}
    </div>
  );
}
