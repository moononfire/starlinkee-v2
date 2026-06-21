import VerifyClient from "./VerifyClient";

interface Props {
  searchParams: Promise<{ code?: string }>;
}

export default async function VerifyPage({ searchParams }: Props) {
  const { code } = await searchParams;

  return (
    <main className="min-h-screen bg-gray-50 flex items-start justify-center pt-16 px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-sm">
        <h1 className="text-xl font-semibold text-gray-800 text-center mb-1">Weryfikacja kuponu</h1>
        <p className="text-sm text-gray-500 text-center mb-8">Wprowadź kod kuponu, aby sprawdzić jego status.</p>

        <VerifyClient initialCode={code ?? ""} />
      </div>
    </main>
  );
}
