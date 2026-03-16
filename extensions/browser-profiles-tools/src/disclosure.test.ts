import { describe, it, expect } from "vitest";
import { getDisclosurePolicy, getDisclosureLevel } from "./disclosure.js";

describe("getDisclosurePolicy", () => {
  it("off: no prompt, no tools", () => {
    const policy = getDisclosurePolicy("off");
    expect(policy).toEqual({ injectPrompt: false, readTools: false, writeTools: false });
  });

  it("minimal: prompt only, no tools", () => {
    const policy = getDisclosurePolicy("minimal");
    expect(policy).toEqual({ injectPrompt: true, readTools: false, writeTools: false });
  });

  it("standard: prompt + read tools, no write tools", () => {
    const policy = getDisclosurePolicy("standard");
    expect(policy).toEqual({ injectPrompt: true, readTools: true, writeTools: false });
  });

  it("full: prompt + all tools", () => {
    const policy = getDisclosurePolicy("full");
    expect(policy).toEqual({ injectPrompt: true, readTools: true, writeTools: true });
  });
});

describe("getDisclosureLevel", () => {
  it("returns 'off' when browserProfiles is undefined", () => {
    expect(getDisclosureLevel({})).toBe("off");
  });

  it("returns 'off' when browserProfiles.enabled is false", () => {
    expect(
      getDisclosureLevel({
        browserProfiles: {
          enabled: false,
          disclosureLevel: "full",
        },
      }),
    ).toBe("off");
  });

  it("returns the configured level when enabled", () => {
    expect(
      getDisclosureLevel({
        browserProfiles: {
          enabled: true,
          disclosureLevel: "minimal",
        },
      }),
    ).toBe("minimal");
  });

  it("returns 'standard' when enabled with standard level", () => {
    expect(
      getDisclosureLevel({
        browserProfiles: {
          enabled: true,
          disclosureLevel: "standard",
        },
      }),
    ).toBe("standard");
  });
});
