import { getCustomerByActivationToken } from "@/lib/db/portal";
import ActivateForm from "./ActivateForm";

export default async function ActivatePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const params = await searchParams;
  const token = params.token;

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="max-w-sm text-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
            Nieprawidłowy link
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Link aktywacyjny jest nieprawidłowy lub wygasł.
          </p>
        </div>
      </div>
    );
  }

  const customer = await getCustomerByActivationToken(token);

  if (!customer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="max-w-sm text-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
            Link nieaktywny
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Ten link aktywacyjny został już wykorzystany lub jest nieprawidłowy.
          </p>
          <a
            href="/portal/login"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Przejdź do logowania
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-2 text-gray-900 dark:text-gray-100">
          Starlinkee
        </h1>
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-8">
          Aktywacja konta
        </p>
        <ActivateForm
          token={token}
          email={customer.email}
          error={params.error}
        />
      </div>
    </div>
  );
}
