import { describe, it, expect } from "vitest";
import { ilikeValue, likePattern } from "@/lib/db/search";

describe("ilikeValue()", () => {
  it("wraps plain text in %...% inside double quotes", () => {
    expect(ilikeValue("jan")).toBe('"%jan%"');
  });

  it("escapes LIKE wildcards and backslashes (then doubles them for the quoted PostgREST value)", () => {
    expect(ilikeValue("%_\\")).toBe('"%\\\\%\\\\_\\\\\\\\%"');
  });

  it("escapes double quotes and keeps PostgREST separators literal", () => {
    expect(ilikeValue('a,b(c)"')).toBe('"%a,b(c)\\"%"');
  });
});

describe("likePattern()", () => {
  it("wraps text in % and escapes LIKE wildcards, without quotes", () => {
    expect(likePattern("ab")).toBe("%ab%");
    expect(likePattern('50%_\\"')).toBe('%50\\%\\_\\\\"%');
  });
});
