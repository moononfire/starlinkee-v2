import GeneratePlatesForm from "./GeneratePlatesForm";

export default function GeneratePlatesPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Generator kodów płytek</h1>
      <div className="bg-white dark:bg-gray-800 shadow dark:shadow-gray-900 rounded-lg p-6 max-w-lg">
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Generuje unikalne 6-literowe kody (A–Z), sprawdza unikalność w bazie danych,
          zwraca plik TXT do pobrania.
        </p>
        <GeneratePlatesForm />
      </div>
    </div>
  );
}
