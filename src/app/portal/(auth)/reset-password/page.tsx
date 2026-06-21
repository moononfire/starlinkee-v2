import ResetPasswordForm from "./ResetPasswordForm";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-2 text-gray-900 dark:text-gray-100">
          Starlinkee
        </h1>
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-8">
          Nowe hasło
        </p>
        <ResetPasswordForm error={params.error} />
      </div>
    </div>
  );
}
