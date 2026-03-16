/**
 * Minimal adapter interface for reading/writing browser session state.
 *
 * Decouples the runtime service from any specific browser/CDP implementation.
 * Production callers provide a real adapter backed by CDP or vendor API;
 * tests use a mock.
 *
 * Phase 28 Batch 2: cookies_only is the supported mode.
 * cookies_and_storage will be added in a later batch.
 */

/** A single browser cookie, matching the common CDP Network.Cookie shape. */
export interface BrowserCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite?: "Strict" | "Lax" | "None";
}

/**
 * Adapter for browser session state I/O.
 *
 * Implementers wrap the actual browser API (e.g. CDP Network.getAllCookies /
 * Network.setCookies) behind this interface so the runtime service stays
 * browser-agnostic.
 */
export interface BrowserSessionAdapter {
  /** Read all cookies from the browser session. */
  getCookies(): Promise<BrowserCookie[]>;

  /** Set cookies into the browser session (additive — does not clear existing). */
  setCookies(cookies: BrowserCookie[]): Promise<void>;

  /**
   * Replace all browser cookies with the given snapshot.
   *
   * Unlike setCookies (which is additive), this method faithfully reconstructs
   * the snapshot state by first deleting all existing cookies, then writing the
   * snapshot cookies. This ensures stale cookies from a previous session are
   * removed rather than accumulated.
   *
   * Implementation: use CDP Network.getAllCookies + Network.deleteCookies to
   * clear existing cookies, then Network.setCookies to write the snapshot.
   */
  replaceCookies(cookies: BrowserCookie[]): Promise<void>;

  // TODO (Phase 28 Batch 3+): localStorage / sessionStorage accessors
  // getLocalStorage?(origin: string): Promise<Record<string, string>>;
  // setLocalStorage?(origin: string, entries: Record<string, string>): Promise<void>;
}
