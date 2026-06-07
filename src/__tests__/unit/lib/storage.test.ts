import { describe, it, expect, vi, beforeEach } from "vitest";

const mockUpload = vi.fn();
const mockGetPublicUrl = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    storage: {
      from: () => ({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      }),
    },
  }),
}));

import { uploadLogo } from "@/lib/storage";

function makeFile(type: string, sizeBytes: number): File {
  const buffer = new Uint8Array(sizeBytes);
  return new File([buffer], "test.img", { type });
}

beforeEach(() => {
  mockUpload.mockReset();
  mockGetPublicUrl.mockReset();
  mockUpload.mockResolvedValue({ error: null });
  mockGetPublicUrl.mockReturnValue({ data: { publicUrl: "https://cdn.test/logos/file.png" } });
});

describe("uploadLogo()", () => {
  it("rejects non-image MIME types", async () => {
    const file = makeFile("image/gif", 100);
    await expect(uploadLogo(file)).rejects.toThrow("Only PNG and JPEG");
  });

  it("rejects PDF files", async () => {
    const file = makeFile("application/pdf", 100);
    await expect(uploadLogo(file)).rejects.toThrow("Only PNG and JPEG");
  });

  it("rejects files larger than 5MB", async () => {
    const file = makeFile("image/png", 5 * 1024 * 1024 + 1);
    await expect(uploadLogo(file)).rejects.toThrow("5MB");
  });

  it("accepts a PNG file under 5MB and returns path and publicUrl", async () => {
    const file = makeFile("image/png", 1024);
    const result = await uploadLogo(file);
    expect(result.path).toMatch(/\.png$/);
    expect(result.publicUrl).toBe("https://cdn.test/logos/file.png");
  });

  it("accepts a JPEG file", async () => {
    const file = makeFile("image/jpeg", 1024);
    const result = await uploadLogo(file);
    expect(result.path).toMatch(/\.jpg$/);
  });

  it("uses a UUID filename", async () => {
    const file = makeFile("image/png", 100);
    const result = await uploadLogo(file);
    // UUID v4 pattern: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx.ext
    expect(result.path).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(png|jpg)$/
    );
  });

  it("throws when Supabase upload fails", async () => {
    mockUpload.mockResolvedValue({ error: { message: "bucket not found" } });
    const file = makeFile("image/png", 100);
    await expect(uploadLogo(file)).rejects.toThrow("Storage upload failed");
  });
});
