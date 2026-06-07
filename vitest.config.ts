import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true } as never,
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./src/__tests__/setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**", "src/app/api/**"],
      exclude: ["src/lib/supabase/**"],
    },
  },
});
