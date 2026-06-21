import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import { insertPlatesBatch } from "@/lib/db/plates";
import { sendPlateImportLinks } from "@/lib/email";

async function importPlatesAction(formData: FormData) {
  "use server";

  const file = formData.get("file") as File;
  if (!file || file.size === 0) throw new Error("Brak pliku");

  const text = await file.text();
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const plates: { plate_number: string; plate_language: string; secret_key: string }[] = [];
  const linkLines: string[] = [];

  for (const line of lines) {
    const [number, lang] = line.split(",").map((s) => s.trim());
    if (!number || !lang) continue;

    const plateNumber = number.toUpperCase();
    const secretKey = randomBytes(16).toString("hex");
    plates.push({ plate_number: plateNumber, plate_language: lang, secret_key: secretKey });
    linkLines.push(`${appUrl}/plate/${plateNumber}/${secretKey}`);
  }

  if (plates.length === 0) throw new Error("Plik nie zawiera poprawnych linii");

  await insertPlatesBatch(plates);

  void sendPlateImportLinks({
    fileContent: linkLines.join("\n"),
    plateCount: plates.length,
  }).catch(() => {});

  redirect(`/admin/plates?imported=${plates.length}`);
}

export default function ImportPlatesPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Import płytek z TXT</h1>
      <div className="bg-white dark:bg-gray-800 shadow dark:shadow-gray-900 rounded-lg p-6 max-w-lg">
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Format pliku: jedna linia = jedna płytka, format <code className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">ABCDEF,pl</code> (numer, język).
          Po imporcie linki zostaną wysłane emailem do admina.
        </p>
        <form action={importPlatesAction} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Plik TXT *
            </label>
            <input
              name="file"
              type="file"
              accept=".txt,text/plain"
              required
              className="w-full text-sm text-gray-600 dark:text-gray-300 file:mr-3 file:py-1.5 file:px-3 file:border file:border-gray-300 dark:file:border-gray-600 file:rounded file:text-sm file:bg-gray-50 dark:file:bg-gray-700 file:text-gray-700 dark:file:text-gray-200 hover:file:bg-gray-100 dark:hover:file:bg-gray-600"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              className="bg-blue-600 text-white px-5 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Importuj
            </button>
            <a
              href="/admin/plates"
              className="px-5 py-2 rounded text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Anuluj
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
