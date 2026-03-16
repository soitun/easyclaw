import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { mkdtemp, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { getMaterializedPath, deleteMaterialized } from "./materializer.js";

describe("browser-profile-materializer", () => {
  let basePath: string;

  beforeEach(async () => {
    basePath = await mkdtemp(join(tmpdir(), "bp-mat-test-"));
  });

  afterEach(async () => {
    await rm(basePath, { recursive: true, force: true });
  });

  describe("getMaterializedPath", () => {
    it("returns deterministic path for a profile id", () => {
      const path = getMaterializedPath("profile-1", basePath);
      expect(path).toBe(join(basePath, "browser-profiles", "profile-1"));
    });

    it("returns different paths for different profile ids", () => {
      const a = getMaterializedPath("a", basePath);
      const b = getMaterializedPath("b", basePath);
      expect(a).not.toBe(b);
    });
  });

  describe("deleteMaterialized", () => {
    it("removes an existing materialized directory", async () => {
      const dirPath = getMaterializedPath("p3", basePath);
      await mkdir(dirPath, { recursive: true });
      expect(existsSync(dirPath)).toBe(true);

      await deleteMaterialized("p3", basePath);
      expect(existsSync(dirPath)).toBe(false);
    });

    it("does not throw if directory does not exist", async () => {
      await expect(deleteMaterialized("nonexistent", basePath)).resolves.toBeUndefined();
    });
  });
});
