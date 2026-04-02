import { describe, it, expect } from "vitest";

// These are plain JS modules, imported as ESM
// @ts-ignore — functions/api files are plain JS
import { sanitizeSlug, sanitizeFilename, sanitizePathSegments, ALLOWED_UPLOAD_TYPES } from "../../functions/api/_shared/validate.js";

describe("sanitizeSlug", () => {
  it("lowercases and strips unsafe chars", () => {
    expect(sanitizeSlug("My-Slug_123")).toBe("my-slug123");
  });

  it("collapses multiple hyphens", () => {
    expect(sanitizeSlug("a---b")).toBe("a-b");
  });

  it("strips leading/trailing hyphens", () => {
    expect(sanitizeSlug("-hello-")).toBe("hello");
  });

  it("returns empty for null/undefined", () => {
    expect(sanitizeSlug(null)).toBe("");
    expect(sanitizeSlug(undefined)).toBe("");
  });

  it("truncates to 64 chars", () => {
    const long = "a".repeat(100);
    expect(sanitizeSlug(long).length).toBeLessThanOrEqual(64);
  });
});

describe("sanitizeFilename", () => {
  it("replaces unsafe chars with underscores", () => {
    expect(sanitizeFilename("my file (1).png")).toBe("my_file__1_.png");
  });

  it("truncates to 128 chars", () => {
    const long = "a".repeat(200) + ".png";
    expect(sanitizeFilename(long).length).toBeLessThanOrEqual(128);
  });

  it("defaults to upload.bin for empty input", () => {
    expect(sanitizeFilename("")).toBe("upload.bin");
    expect(sanitizeFilename(null)).toBe("upload.bin");
  });
});

describe("sanitizePathSegments", () => {
  it("joins valid segments", () => {
    expect(sanitizePathSegments(["wallpaper", "w1.png"])).toBe("wallpaper/w1.png");
  });

  it("rejects path traversal", () => {
    expect(sanitizePathSegments(["wallpaper", "..", "secret"])).toBeNull();
  });

  it("rejects dot segments", () => {
    expect(sanitizePathSegments(["."])).toBeNull();
    expect(sanitizePathSegments([".."])).toBeNull();
  });

  it("rejects empty segments", () => {
    expect(sanitizePathSegments([""])).toBeNull();
    expect(sanitizePathSegments([])).toBeNull();
  });

  it("rejects unsafe characters", () => {
    expect(sanitizePathSegments(["file<script>"])).toBeNull();
    expect(sanitizePathSegments(['file"name'])).toBeNull();
  });

  it("rejects segments containing slashes", () => {
    expect(sanitizePathSegments(["a/b"])).toBeNull();
  });
});

describe("ALLOWED_UPLOAD_TYPES", () => {
  it("includes common image types", () => {
    expect(ALLOWED_UPLOAD_TYPES.has("image/png")).toBe(true);
    expect(ALLOWED_UPLOAD_TYPES.has("image/jpeg")).toBe(true);
    expect(ALLOWED_UPLOAD_TYPES.has("image/webp")).toBe(true);
    expect(ALLOWED_UPLOAD_TYPES.has("image/gif")).toBe(true);
  });

  it("includes video types", () => {
    expect(ALLOWED_UPLOAD_TYPES.has("video/mp4")).toBe(true);
    expect(ALLOWED_UPLOAD_TYPES.has("video/webm")).toBe(true);
  });

  it("excludes dangerous types", () => {
    expect(ALLOWED_UPLOAD_TYPES.has("text/html")).toBe(false);
    expect(ALLOWED_UPLOAD_TYPES.has("application/javascript")).toBe(false);
  });
});
