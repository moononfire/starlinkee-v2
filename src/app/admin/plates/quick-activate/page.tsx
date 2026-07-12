import { listUnassignedPlates } from "@/lib/db/plates";
import QuickActivateForm from "./QuickActivateForm";

export default async function QuickActivatePlatePage() {
  const plates = await listUnassignedPlates();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Szybka aktywacja płytki</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-lg">
        Wybierz wolną płytkę i firmę z Google Maps, żeby od razu aktywować 33-dniowy trial i skierować płytkę
        prosto na opinię Google. Konto w portalu klienta zostanie utworzone automatycznie, a dane logowania
        wyślemy na e-mail administratora.
      </p>
      <QuickActivateForm plates={plates} />
    </div>
  );
}
