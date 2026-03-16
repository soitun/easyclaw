import { test, expect } from "./electron-fixture.js";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { get as httpGet } from "node:http";
import { WebSocket } from "ws";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TEST_PROFILE_ID = "e2e-session-state-test";

/** Common Chrome paths by platform. */
function findChromePath(): string | null {
  if (process.platform === "darwin") {
    const candidates = [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
    ];
    return candidates.find((p) => existsSync(p)) ?? null;
  }
  if (process.platform === "win32") {
    const localAppData = process.env.LOCALAPPDATA ?? "";
    const programFiles = process.env["ProgramFiles"] ?? "C:\\Program Files";
    const candidates = [
      join(localAppData, "Google", "Chrome", "Application", "chrome.exe"),
      join(programFiles, "Google", "Chrome", "Application", "chrome.exe"),
    ];
    return candidates.find((p) => existsSync(p)) ?? null;
  }
  // Linux
  const candidates = [
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ];
  return candidates.find((p) => existsSync(p)) ?? null;
}

/**
 * Derive the OPENCLAW_STATE_DIR from the running Electron app's environment.
 * The fixture sets OPENCLAW_STATE_DIR = <tempDir>/openclaw.
 */
async function getOpenClawStateDir(
  electronApp: import("@playwright/test").ElectronApplication,
): Promise<string> {
  return electronApp.evaluate(() => process.env.OPENCLAW_STATE_DIR ?? "");
}

/**
 * Construct the session state directory path for a managed_profile target.
 *
 * In production, main.ts creates the SessionSnapshotStore with:
 *   basePath = join(stateDir, "session-state")
 * Then sessionStateDirPath (paths.ts) joins:
 *   join(profileBasePath, "session-state", target, profileId)
 *
 * Full path: <stateDir>/session-state/session-state/managed_profile/<profileId>
 */
function sessionStateDir(stateDir: string, profileId: string): string {
  return join(stateDir, "session-state", "session-state", "managed_profile", profileId);
}

/** Fetch a JSON response from an HTTP GET endpoint. */
function httpGetJson<T>(url: string): Promise<T | null> {
  return new Promise((resolve) => {
    const req = httpGet(url, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        resolve(null);
        return;
      }
      let body = "";
      res.setEncoding("utf-8");
      res.on("data", (chunk: string) => {
        body += chunk;
      });
      res.on("end", () => {
        try {
          resolve(JSON.parse(body) as T);
        } catch {
          resolve(null);
        }
      });
    });
    req.on("error", () => resolve(null));
    req.setTimeout(3000, () => {
      req.destroy();
      resolve(null);
    });
  });
}

/** Fetch the browser-level WebSocket debugger URL from /json/version. */
async function fetchBrowserDebuggerUrl(port: number): Promise<string | null> {
  const info = await httpGetJson<{ webSocketDebuggerUrl?: string }>(
    `http://127.0.0.1:${port}/json/version`,
  );
  return info?.webSocketDebuggerUrl ?? null;
}

/**
 * Fetch a page-level WebSocket debugger URL from /json/list.
 *
 * Network domain commands (setCookies, getAllCookies) require a page-level
 * target — the browser-level target does not expose the Network domain.
 *
 * Chrome 146+ no longer creates a default tab when launched with
 * --no-first-run, so /json/list may return []. In that case we create a
 * blank page via Target.createTarget on the browser-level WebSocket, then
 * re-fetch /json/list.
 */
async function fetchPageDebuggerUrl(port: number): Promise<string | null> {
  let targets = await httpGetJson<
    Array<{ type: string; webSocketDebuggerUrl?: string }>
  >(`http://127.0.0.1:${port}/json/list`);

  // No page targets — create one via the browser-level CDP connection.
  if (!targets || !targets.some((t) => t.type === "page")) {
    const browserWs = await fetchBrowserDebuggerUrl(port);
    if (browserWs) {
      await sendCdpCommand(browserWs, "Target.createTarget", { url: "about:blank" });
      // Re-fetch after creation
      await new Promise((r) => setTimeout(r, 500));
      targets = await httpGetJson<
        Array<{ type: string; webSocketDebuggerUrl?: string }>
      >(`http://127.0.0.1:${port}/json/list`);
    }
  }

  if (targets && targets.length > 0) {
    const page = targets.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
    if (page) return page.webSocketDebuggerUrl!;
    const any = targets.find((t) => t.webSocketDebuggerUrl);
    if (any) return any.webSocketDebuggerUrl!;
  }

  return null;
}

/** Send a CDP command via WebSocket. */
function sendCdpCommand(
  wsUrl: string,
  method: string,
  params: Record<string, unknown> = {},
  timeoutMs = 5000,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const id = 1;
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        ws.close();
        reject(new Error(`CDP command '${method}' timed out after ${timeoutMs}ms`));
      }
    }, timeoutMs);

    ws.on("open", () => {
      ws.send(JSON.stringify({ id, method, params }));
    });

    ws.on("message", (data: Buffer) => {
      if (settled) return;
      try {
        const msg = JSON.parse(data.toString()) as {
          id?: number;
          result?: unknown;
          error?: { message: string };
        };
        if (msg.id === id) {
          settled = true;
          clearTimeout(timer);
          ws.close();
          if (msg.error) {
            reject(new Error(`CDP error: ${msg.error.message}`));
          } else {
            resolve(msg.result);
          }
        }
      } catch {
        // Ignore parse errors on non-matching messages
      }
    });

    ws.on("error", (err: Error) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(err);
      }
    });
  });
}

/** Poll until CDP is reachable on the given port (up to timeoutMs). */
async function waitForCdp(port: number, timeoutMs = 15_000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const wsUrl = await fetchBrowserDebuggerUrl(port);
    if (wsUrl) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

/** Set test cookies via CDP using a page-level target. */
async function injectTestCookies(port: number): Promise<void> {
  const wsUrl = await fetchPageDebuggerUrl(port);
  if (!wsUrl) throw new Error(`CDP not reachable on port ${port}`);

  // Enable Network domain first (required on some Chrome versions)
  await sendCdpCommand(wsUrl, "Network.enable");

  await sendCdpCommand(wsUrl, "Network.setCookies", {
    cookies: [
      {
        name: "e2e_test_cookie",
        value: "session_state_test_value",
        domain: ".example.com",
        path: "/",
        expires: Math.floor(Date.now() / 1000) + 86400,
        httpOnly: false,
        secure: false,
      },
      {
        name: "e2e_auth_token",
        value: "fake_token_12345",
        domain: ".test.example.com",
        path: "/api",
        expires: Math.floor(Date.now() / 1000) + 86400,
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
      },
    ],
  });
}

/** Get all cookies via CDP using a page-level target. */
async function getAllCookies(
  port: number,
): Promise<Array<{ name: string; value: string; domain: string; path: string }>> {
  const wsUrl = await fetchPageDebuggerUrl(port);
  if (!wsUrl) throw new Error(`CDP not reachable on port ${port}`);

  const result = (await sendCdpCommand(wsUrl, "Network.getAllCookies")) as {
    cookies?: Array<{ name: string; value: string; domain: string; path: string }>;
  };
  return result?.cookies ?? [];
}

/** Launch a managed browser via the REST API and return the CDP port. */
async function launchManagedBrowser(
  apiBase: string,
  profileId: string,
  chromePath: string,
): Promise<number> {
  const res = await fetch(`${apiBase}/api/browser-profiles/${profileId}/managed/launch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chromePath }),
  });
  const body = (await res.json()) as { ok?: boolean; port?: number; error?: string };
  if (!res.ok || !body.ok) {
    throw new Error(`Launch failed (${res.status}): ${body.error ?? res.statusText}`);
  }
  return body.port!;
}

/** Stop a managed browser via the REST API. */
async function stopManagedBrowser(apiBase: string, profileId: string): Promise<void> {
  await fetch(`${apiBase}/api/browser-profiles/${profileId}/managed/stop`, {
    method: "POST",
  }).catch(() => {});
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const chromePath = findChromePath();

test.describe("Session State — Cookie Persistence", () => {
  test("managed browser launch creates session state directory", async ({
    electronApp,
    window: _window,
    apiBase,
  }) => {
    test.skip(!chromePath, "Chrome not found on this machine");

    const stateDir = await getOpenClawStateDir(electronApp);
    expect(stateDir).toBeTruthy();

    // Launch a managed browser
    const port = await launchManagedBrowser(apiBase, TEST_PROFILE_ID, chromePath!);
    expect(port).toBeGreaterThan(0);

    // Wait for CDP to be reachable (browser fully started)
    const ready = await waitForCdp(port);
    expect(ready).toBe(true);

    // The session lifecycle manager should have created the session state
    // directory via runtimeService.prepare() -> store.ensureDir()
    const ssDir = sessionStateDir(stateDir, TEST_PROFILE_ID);

    // Allow time for async session start to complete
    await new Promise((r) => setTimeout(r, 2000));

    expect(existsSync(ssDir)).toBe(true);

    // Cleanup: stop tracking only. Chrome will be cleaned up when the
    // fixture tears down the Electron process and temp directory.
    await stopManagedBrowser(apiBase, TEST_PROFILE_ID);
  });

  test("checkpoint persists cookies to encrypted snapshot", async ({
    electronApp,
    window: _window,
    apiBase,
  }) => {
    test.skip(!chromePath, "Chrome not found on this machine");

    const stateDir = await getOpenClawStateDir(electronApp);
    expect(stateDir).toBeTruthy();

    // Launch a managed browser
    const port = await launchManagedBrowser(apiBase, TEST_PROFILE_ID, chromePath!);
    const ready = await waitForCdp(port);
    expect(ready).toBe(true);

    // Wait for session to be fully started
    await new Promise((r) => setTimeout(r, 2000));

    // Inject test cookies via CDP (using page-level target for compatibility)
    await injectTestCookies(port);

    // Verify cookies were injected (via page target)
    const cookies = await getAllCookies(port);
    const testCookie = cookies.find((c) => c.name === "e2e_test_cookie");
    expect(testCookie).toBeDefined();
    expect(testCookie!.value).toBe("session_state_test_value");

    // Trigger session end to force a flush (endSession flushes cookies to disk).
    // The production adapter (ManagedProfileCookieAdapter) uses the browser-level
    // WebSocket URL from /json/version. If Network.getAllCookies is not available
    // at the browser level, getCookies() returns [] and the flush writes 0 cookies.
    const endRes = await fetch(
      `${apiBase}/api/browser-profiles/${TEST_PROFILE_ID}/session/end`,
      { method: "POST" },
    );
    expect(endRes.status).toBe(200);

    // Verify snapshot files were created
    const ssDir = sessionStateDir(stateDir, TEST_PROFILE_ID);
    const manifestFile = join(ssDir, "manifest.json");
    const cookiesFile = join(ssDir, "cookies.json.enc");

    expect(existsSync(manifestFile)).toBe(true);
    expect(existsSync(cookiesFile)).toBe(true);

    // Verify manifest structure
    const manifest = JSON.parse(await readFile(manifestFile, "utf-8"));
    expect(manifest.profileId).toBe(TEST_PROFILE_ID);
    expect(manifest.target).toBe("managed_profile");
    expect(manifest.hash).toBeTruthy();
    expect(manifest.updatedAt).toBeGreaterThan(0);

    // BUG: The production ManagedProfileCookieAdapter uses the browser-level
    // WebSocket URL (from /json/version) which does NOT support
    // Network.getAllCookies. As a result, getCookies() returns [] and the
    // flush writes cookieCount: 0. The adapter should use a page-level target
    // (from /json/list) instead.
    //
    // This assertion documents the expected behavior. When the adapter is fixed,
    // this should pass. Until then, cookieCount will be 0.
    expect(manifest.cookieCount).toBeGreaterThanOrEqual(2);

    // Verify encrypted cookies file is non-empty
    const cookiesData = await readFile(cookiesFile);
    expect(cookiesData.length).toBeGreaterThan(0);

    // Cleanup
    await stopManagedBrowser(apiBase, TEST_PROFILE_ID);
  });

  test("cookies survive browser restart", async ({
    electronApp,
    window: _window,
    apiBase,
  }) => {
    test.skip(!chromePath, "Chrome not found on this machine");

    const stateDir = await getOpenClawStateDir(electronApp);
    expect(stateDir).toBeTruthy();

    // --- Phase 1: Launch, inject cookies, flush, stop ---

    const port1 = await launchManagedBrowser(apiBase, TEST_PROFILE_ID, chromePath!);
    const ready1 = await waitForCdp(port1);
    expect(ready1).toBe(true);

    // Wait for session to be fully started
    await new Promise((r) => setTimeout(r, 2000));

    // Inject test cookies
    await injectTestCookies(port1);

    // Verify injection
    const cookiesBefore = await getAllCookies(port1);
    expect(cookiesBefore.some((c) => c.name === "e2e_test_cookie")).toBe(true);
    expect(cookiesBefore.some((c) => c.name === "e2e_auth_token")).toBe(true);

    // Stop tracking (triggers endSession -> flush)
    await stopManagedBrowser(apiBase, TEST_PROFILE_ID);

    // Wait for session end + flush to complete
    await new Promise((r) => setTimeout(r, 2000));

    // Verify snapshot was written
    const ssDir = sessionStateDir(stateDir, TEST_PROFILE_ID);
    expect(existsSync(join(ssDir, "manifest.json"))).toBe(true);
    expect(existsSync(join(ssDir, "cookies.json.enc"))).toBe(true);

    // --- Phase 2: Relaunch and verify cookies are restored ---

    const port2 = await launchManagedBrowser(apiBase, TEST_PROFILE_ID, chromePath!);
    const ready2 = await waitForCdp(port2);
    expect(ready2).toBe(true);

    // Wait for session start + cookie restore
    await new Promise((r) => setTimeout(r, 3000));

    // Read cookies from the relaunched browser (via page target)
    const cookiesAfter = await getAllCookies(port2);

    // BUG: The production adapter's getCookies() fails at the browser-level
    // target (Network.getAllCookies not found), so the flush writes 0 cookies.
    // On relaunch, restoreSessionState loads the (empty) snapshot, so no
    // cookies are restored. When the adapter is fixed to use page-level targets,
    // this test should pass.
    const restoredCookie = cookiesAfter.find((c) => c.name === "e2e_test_cookie");
    expect(restoredCookie).toBeDefined();
    expect(restoredCookie!.value).toBe("session_state_test_value");

    const restoredAuth = cookiesAfter.find((c) => c.name === "e2e_auth_token");
    expect(restoredAuth).toBeDefined();
    expect(restoredAuth!.value).toBe("fake_token_12345");

    // Cleanup
    await stopManagedBrowser(apiBase, TEST_PROFILE_ID);
  });
});
