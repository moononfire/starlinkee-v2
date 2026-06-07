import TestRunner from "@/components/TestRunner";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
      <main className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
            Starlinkee v2
          </h1>
          <p className="mt-2 text-zinc-500 text-sm">Panel deweloperski</p>
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
          <TestRunner />
        </div>
      </main>
    </div>
  );
}
