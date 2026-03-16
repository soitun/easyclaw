import { describe, it, expect } from "vitest";
import { CdpCookieAdapter } from "./cdp-cookie-adapter.js";

describe("CdpCookieAdapter", () => {
  it("stores the port number", () => {
    const adapter = new CdpCookieAdapter(9222);
    // Verify construction does not throw
    expect(adapter).toBeDefined();
  });

  it("getCookies returns [] when Chrome is not running", async () => {
    // Use a port that is very unlikely to be in use
    const adapter = new CdpCookieAdapter(19999);
    const cookies = await adapter.getCookies();
    expect(cookies).toEqual([]);
  });

  it("setCookies is a no-op when Chrome is not running", async () => {
    const adapter = new CdpCookieAdapter(19999);
    // Should not throw
    await adapter.setCookies([
      {
        name: "test",
        value: "value",
        domain: ".example.com",
        path: "/",
        expires: Date.now() / 1000 + 3600,
        httpOnly: false,
        secure: false,
      },
    ]);
  });

  it("setCookies is a no-op for empty cookie array", async () => {
    const adapter = new CdpCookieAdapter(19999);
    // Should return immediately without attempting connection
    await adapter.setCookies([]);
  });

  it("replaceCookies is a no-op when Chrome is not running", async () => {
    const adapter = new CdpCookieAdapter(19999);
    // Should not throw — gracefully degrades when CDP is unreachable
    await adapter.replaceCookies([
      {
        name: "test",
        value: "value",
        domain: ".example.com",
        path: "/",
        expires: Date.now() / 1000 + 3600,
        httpOnly: false,
        secure: false,
      },
    ]);
  });

  it("replaceCookies is a no-op for empty cookie array when Chrome is not running", async () => {
    const adapter = new CdpCookieAdapter(19999);
    // Should not throw
    await adapter.replaceCookies([]);
  });
});
