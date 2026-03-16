import { describe, it, expect } from "vitest";
import { createAdapter } from "./adapter-factory.js";
import { CdpCookieAdapter } from "./cdp-cookie-adapter.js";
import { ManagedProfileCookieAdapter } from "./managed-profile-cookie-adapter.js";

describe("createAdapter", () => {
  it("creates CdpCookieAdapter for cdp target", () => {
    const adapter = createAdapter("cdp", { profileId: "__cdp__", cdpPort: 9222 });
    expect(adapter).toBeInstanceOf(CdpCookieAdapter);
  });

  it("throws when cdp target has no port", () => {
    expect(() => createAdapter("cdp", { profileId: "__cdp__" })).toThrow("CDP adapter requires cdpPort");
  });

  it("creates ManagedProfileCookieAdapter for managed_profile target", () => {
    const adapter = createAdapter("managed_profile", { profileId: "real-profile-id", cdpPort: 9333 });
    expect(adapter).toBeInstanceOf(ManagedProfileCookieAdapter);
  });

  it("creates ManagedProfileCookieAdapter with port resolver", () => {
    const adapter = createAdapter("managed_profile", {
      profileId: "real-profile-id",
      cdpPortResolver: () => 9444,
    });
    expect(adapter).toBeInstanceOf(ManagedProfileCookieAdapter);
  });

  it("does NOT confuse __cdp__ key with managed profile semantics", () => {
    // __cdp__ is only valid for CDP target, not managed_profile
    const cdpAdapter = createAdapter("cdp", { profileId: "__cdp__", cdpPort: 9222 });
    const managedAdapter = createAdapter("managed_profile", { profileId: "actual-uuid", cdpPort: 9333 });
    expect(cdpAdapter).toBeInstanceOf(CdpCookieAdapter);
    expect(managedAdapter).toBeInstanceOf(ManagedProfileCookieAdapter);
  });
});
