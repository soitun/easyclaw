import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { join } from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import type { BrowserCookie, BrowserSessionAdapter } from "./session-state/index.js";
import { createPlaintextCrypto, SessionSnapshotStore } from "./session-state/index.js";
import { BrowserProfileRuntimeService, computeCookieHash } from "./runtime-service.js";
import { SessionLifecycleManager } from "./session-lifecycle-manager.js";

// ── Test helpers ────────────────────────────────────────────────────────────

function makeCookies(count: number): BrowserCookie[] {
  return Array.from({ length: count }, (_, i) => ({
    name: `cookie-${i}`,
    value: `value-${i}`,
    domain: `.example.com`,
    path: "/",
    expires: Date.now() / 1000 + 3600,
    httpOnly: false,
    secure: true,
  }));
}

function createMockAdapter(cookies: BrowserCookie[] = []): BrowserSessionAdapter & {
  setCookiesCalls: BrowserCookie[][];
  replaceCookiesCalls: BrowserCookie[][];
  getCookiesCalls: number;
} {
  const setCookiesCalls: BrowserCookie[][] = [];
  const replaceCookiesCalls: BrowserCookie[][] = [];
  let currentCookies = [...cookies];
  return {
    setCookiesCalls,
    replaceCookiesCalls,
    getCookiesCalls: 0,
    async getCookies() {
      (this as any).getCookiesCalls++;
      return currentCookies;
    },
    async setCookies(c: BrowserCookie[]) {
      setCookiesCalls.push(c);
      currentCookies = [...currentCookies, ...c];
    },
    async replaceCookies(c: BrowserCookie[]) {
      replaceCookiesCalls.push(c);
      currentCookies = [...c];
    },
  };
}

// ── SessionLifecycleManager ─────────────────────────────────────────────────

describe("SessionLifecycleManager", () => {
  let basePath: string;
  let store: SessionSnapshotStore;
  let runtimeService: BrowserProfileRuntimeService;
  let manager: SessionLifecycleManager;

  beforeEach(async () => {
    basePath = await mkdtemp(join(tmpdir(), "lifecycle-test-"));
    store = new SessionSnapshotStore(basePath, createPlaintextCrypto());
    runtimeService = new BrowserProfileRuntimeService(store);
    manager = new SessionLifecycleManager(runtimeService);
  });

  afterEach(async () => {
    await manager.endAllSessions();
    runtimeService.stopAllCheckpointTimers();
    await rm(basePath, { recursive: true, force: true });
  });

  // ── startSession ─────────────────────────────────────────────────────────

  describe("startSession", () => {
    it("registers an active session", async () => {
      const adapter = createMockAdapter(makeCookies(3));
      await manager.startSession("prof-1", adapter);

      expect(manager.hasActiveSession("prof-1")).toBe(true);
      expect(manager.activeSessionCount).toBe(1);
      expect(manager.getActiveProfileIds()).toContain("prof-1");
    });

    it("starts checkpoint timer", async () => {
      const adapter = createMockAdapter(makeCookies(2));
      await manager.startSession("prof-1", adapter);

      expect(runtimeService.hasCheckpointTimer("prof-1")).toBe(true);
    });

    it("restores cookies on launch when snapshot exists", async () => {
      // Seed a snapshot
      const cookies = makeCookies(4);
      await store.writeCookieSnapshot("managed_profile", "prof-1", Buffer.from(JSON.stringify(cookies)));
      await store.writeManifest("managed_profile", "prof-1", {
        profileId: "prof-1",
        target: "managed_profile",
        updatedAt: Date.now(),
        hash: computeCookieHash(cookies),
        cookieCount: cookies.length,
      });

      const adapter = createMockAdapter();
      await manager.startSession("prof-1", adapter);

      // Cookies should have been restored into adapter via replaceCookies
      expect(adapter.replaceCookiesCalls).toHaveLength(1);
      expect(adapter.replaceCookiesCalls[0]).toHaveLength(4);
      // setCookies should NOT be called during restore
      expect(adapter.setCookiesCalls).toHaveLength(0);
    });

    it("ends existing session before starting new one", async () => {
      const adapter1 = createMockAdapter(makeCookies(2));
      const adapter2 = createMockAdapter(makeCookies(5));

      await manager.startSession("prof-1", adapter1);
      const flushSpy = vi.spyOn(runtimeService, "flushSessionState");

      await manager.startSession("prof-1", adapter2);

      // Should have flushed old session (target defaults to "managed_profile")
      expect(flushSpy).toHaveBeenCalledWith("prof-1", adapter1, "managed_profile");
      expect(manager.activeSessionCount).toBe(1);
    });
  });

  // ── endSession (task end / explicit close) ───────────────────────────────

  describe("endSession", () => {
    it("flushes state and removes active session", async () => {
      const cookies = makeCookies(5);
      const adapter = createMockAdapter(cookies);
      await manager.startSession("prof-1", adapter);

      await manager.endSession("prof-1");

      expect(manager.hasActiveSession("prof-1")).toBe(false);
      expect(manager.activeSessionCount).toBe(0);

      // Verify flush wrote to disk
      const meta = await store.readManifest("managed_profile","prof-1");
      expect(meta).not.toBeNull();
      expect(meta!.cookieCount).toBe(5);
    });

    it("stops checkpoint timer", async () => {
      const adapter = createMockAdapter(makeCookies(2));
      await manager.startSession("prof-1", adapter);
      expect(runtimeService.hasCheckpointTimer("prof-1")).toBe(true);

      await manager.endSession("prof-1");
      expect(runtimeService.hasCheckpointTimer("prof-1")).toBe(false);
    });

    it("is a no-op for unknown profiles", async () => {
      // Should not throw
      await manager.endSession("nonexistent");
      expect(manager.activeSessionCount).toBe(0);
    });

    it("flush error does not throw from endSession", async () => {
      const adapter: BrowserSessionAdapter = {
        getCookies: async () => {
          throw new Error("browser gone");
        },
        setCookies: async () => {},
        replaceCookies: async () => {},
      };
      await manager.startSession("prof-1", adapter);

      // Should not throw — error is logged
      await manager.endSession("prof-1");
      expect(manager.hasActiveSession("prof-1")).toBe(false);
    });
  });

  // ── switchProfile ────────────────────────────────────────────────────────

  describe("switchProfile", () => {
    it("flushes old profile and starts new one", async () => {
      const adapterA = createMockAdapter(makeCookies(3));
      const adapterB = createMockAdapter(makeCookies(7));

      await manager.startSession("prof-a", adapterA);
      const flushSpy = vi.spyOn(runtimeService, "flushSessionState");

      await manager.switchProfile("prof-a", "prof-b", adapterB);

      // Old profile flushed (target defaults to "managed_profile")
      expect(flushSpy).toHaveBeenCalledWith("prof-a", adapterA, "managed_profile");

      // Old session gone, new session active
      expect(manager.hasActiveSession("prof-a")).toBe(false);
      expect(manager.hasActiveSession("prof-b")).toBe(true);
      expect(manager.activeSessionCount).toBe(1);
    });

    it("new profile gets checkpoint timer", async () => {
      const adapterA = createMockAdapter(makeCookies(2));
      const adapterB = createMockAdapter(makeCookies(4));

      await manager.startSession("prof-a", adapterA);
      await manager.switchProfile("prof-a", "prof-b", adapterB);

      expect(runtimeService.hasCheckpointTimer("prof-a")).toBe(false);
      expect(runtimeService.hasCheckpointTimer("prof-b")).toBe(true);
    });
  });

  // ── endAllSessions ───────────────────────────────────────────────────────

  describe("endAllSessions", () => {
    it("flushes and ends all active sessions", async () => {
      const adapterA = createMockAdapter(makeCookies(2));
      const adapterB = createMockAdapter(makeCookies(4));
      const adapterC = createMockAdapter(makeCookies(6));

      await manager.startSession("a", adapterA);
      await manager.startSession("b", adapterB);
      await manager.startSession("c", adapterC);

      expect(manager.activeSessionCount).toBe(3);

      await manager.endAllSessions();

      expect(manager.activeSessionCount).toBe(0);
      expect(manager.hasActiveSession("a")).toBe(false);
      expect(manager.hasActiveSession("b")).toBe(false);
      expect(manager.hasActiveSession("c")).toBe(false);

      // Verify all flushed
      for (const id of ["a", "b", "c"]) {
        const meta = await store.readManifest("managed_profile",id);
        expect(meta).not.toBeNull();
      }
    });

    it("one flush failure does not prevent others from flushing", async () => {
      const goodAdapter = createMockAdapter(makeCookies(3));
      const badAdapter: BrowserSessionAdapter = {
        getCookies: async () => {
          throw new Error("connection lost");
        },
        setCookies: async () => {},
        replaceCookies: async () => {},
      };

      await manager.startSession("good", goodAdapter);
      await manager.startSession("bad", badAdapter);
      await manager.startSession("also-good", createMockAdapter(makeCookies(5)));

      // Should not throw
      await manager.endAllSessions();

      expect(manager.activeSessionCount).toBe(0);

      // Good sessions should have flushed
      const metaGood = await store.readManifest("managed_profile","good");
      expect(metaGood).not.toBeNull();
      const metaAlsoGood = await store.readManifest("managed_profile","also-good");
      expect(metaAlsoGood).not.toBeNull();
    });

    it("is a no-op when no sessions are active", async () => {
      await manager.endAllSessions();
      expect(manager.activeSessionCount).toBe(0);
    });
  });

  // ── bestEffortFlush ──────────────────────────────────────────────────────

  describe("bestEffortFlush", () => {
    it("flushes without ending the session", async () => {
      const adapter = createMockAdapter(makeCookies(3));
      await manager.startSession("prof-1", adapter);

      const result = await manager.bestEffortFlush("prof-1");

      expect(result).toBe(true);
      // Session still active
      expect(manager.hasActiveSession("prof-1")).toBe(true);
      // Timer still running
      expect(runtimeService.hasCheckpointTimer("prof-1")).toBe(true);

      // Data was written
      const meta = await store.readManifest("managed_profile","prof-1");
      expect(meta).not.toBeNull();
    });

    it("returns false for unknown profiles", async () => {
      const result = await manager.bestEffortFlush("nonexistent");
      expect(result).toBe(false);
    });

    it("returns false and does not throw on adapter error", async () => {
      const adapter: BrowserSessionAdapter = {
        getCookies: async () => {
          throw new Error("disconnected");
        },
        setCookies: async () => {},
        replaceCookies: async () => {},
      };
      await manager.startSession("prof-1", adapter);

      const result = await manager.bestEffortFlush("prof-1");
      expect(result).toBe(false);
      // Session still active (not cleaned up by best-effort failure)
      expect(manager.hasActiveSession("prof-1")).toBe(true);
    });
  });

  // ── Process exit watcher ─────────────────────────────────────────────────

  describe("process exit watcher", () => {
    it("installs beforeExit handler when first session starts", async () => {
      const listenersBefore = process.listenerCount("beforeExit");
      const adapter = createMockAdapter(makeCookies(1));

      await manager.startSession("prof-1", adapter);
      expect(process.listenerCount("beforeExit")).toBe(listenersBefore + 1);
    });

    it("removes handler when last session ends", async () => {
      const listenersBefore = process.listenerCount("beforeExit");
      const adapter = createMockAdapter(makeCookies(1));

      await manager.startSession("prof-1", adapter);
      expect(process.listenerCount("beforeExit")).toBe(listenersBefore + 1);

      await manager.endSession("prof-1");
      expect(process.listenerCount("beforeExit")).toBe(listenersBefore);
    });

    it("does not double-install for multiple sessions", async () => {
      const listenersBefore = process.listenerCount("beforeExit");

      await manager.startSession("a", createMockAdapter(makeCookies(1)));
      await manager.startSession("b", createMockAdapter(makeCookies(2)));

      expect(process.listenerCount("beforeExit")).toBe(listenersBefore + 1);
    });
  });

  // ── Introspection ────────────────────────────────────────────────────────

  describe("introspection", () => {
    it("getActiveProfileIds returns all active profiles", async () => {
      await manager.startSession("x", createMockAdapter(makeCookies(1)));
      await manager.startSession("y", createMockAdapter(makeCookies(2)));

      const ids = manager.getActiveProfileIds();
      expect(ids).toContain("x");
      expect(ids).toContain("y");
      expect(ids).toHaveLength(2);
    });

    it("activeSessionCount reflects current state", async () => {
      expect(manager.activeSessionCount).toBe(0);

      await manager.startSession("a", createMockAdapter());
      expect(manager.activeSessionCount).toBe(1);

      await manager.startSession("b", createMockAdapter());
      expect(manager.activeSessionCount).toBe(2);

      await manager.endSession("a");
      expect(manager.activeSessionCount).toBe(1);
    });
  });
});
