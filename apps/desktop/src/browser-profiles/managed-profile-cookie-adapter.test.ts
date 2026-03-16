import { describe, it, expect } from "vitest";
import { ManagedProfileCookieAdapter } from "./managed-profile-cookie-adapter.js";

describe("ManagedProfileCookieAdapter", () => {
  it("getCookies returns [] when port resolver returns null", async () => {
    const adapter = new ManagedProfileCookieAdapter("profile-1", () => null);
    const cookies = await adapter.getCookies();
    expect(cookies).toEqual([]);
  });

  it("getCookies returns [] when managed browser is not running", async () => {
    const adapter = new ManagedProfileCookieAdapter("profile-1", 19998);
    const cookies = await adapter.getCookies();
    expect(cookies).toEqual([]);
  });

  it("setCookies is no-op when port resolver returns null", async () => {
    const adapter = new ManagedProfileCookieAdapter("profile-1", () => null);
    // Should not throw
    await adapter.setCookies([
      { name: "a", value: "1", domain: ".example.com", path: "/", expires: 0, httpOnly: false, secure: false },
    ]);
  });

  it("setCookies skips empty array without port check", async () => {
    const adapter = new ManagedProfileCookieAdapter("profile-1", () => null);
    await adapter.setCookies([]);
  });

  it("replaceCookies is no-op when port resolver returns null", async () => {
    const adapter = new ManagedProfileCookieAdapter("profile-1", () => null);
    // Should not throw
    await adapter.replaceCookies([
      { name: "a", value: "1", domain: ".example.com", path: "/", expires: 0, httpOnly: false, secure: false },
    ]);
  });

  it("replaceCookies is no-op when managed browser is not running", async () => {
    const adapter = new ManagedProfileCookieAdapter("profile-1", 19998);
    // Should not throw — gracefully degrades
    await adapter.replaceCookies([
      { name: "a", value: "1", domain: ".example.com", path: "/", expires: 0, httpOnly: false, secure: false },
    ]);
  });
});
