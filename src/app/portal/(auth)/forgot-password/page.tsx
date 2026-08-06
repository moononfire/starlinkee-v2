import ForgotPasswordForm from "./ForgotPasswordForm";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-5">
          <img src="/logo-black.webp" alt="Starlinkee" className="h-14 w-auto block dark:hidden" />
          <img src="/logo-white.webp" alt="Starlinkee" className="h-14 w-auto hidden dark:block" />
        </div>
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-8">
          Resetowanie hasła
        </p>
        <ForgotPasswordForm sent={params.sent === "1"} error={params.error} />
      </div>
    </div>
  );
}
