import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

describe("portal auth checks", () => {
  it("every place that trusts user.email to identify a portal customer also requires a confirmed email", () => {
    const roots = ["src/app/portal", "src/app/api/portal", "src/lib"].map((r) => join(process.cwd(), r));
    const offenders: string[] = [];
    for (const file of roots.flatMap(walk).filter((f) => /\.tsx?$/.test(f))) {
      const src = readFileSync(file, "utf8");
      if (!src.includes("getCustomerByEmail(")) continue;
      if (file.endsWith("lib/db/portal.ts") || file.endsWith("lib/services/stripe.ts")) continue;
      if (!src.includes("email_confirmed_at")) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });
});
