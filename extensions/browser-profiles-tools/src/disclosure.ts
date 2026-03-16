/**
 * Browser Profiles Disclosure Policy
 *
 * Controls what browser profile capabilities are exposed to the agent
 * based on the disclosure level configured in the capability binding.
 *
 * Levels:
 *   off      — no tools registered, no prompt addendum
 *   minimal  — prompt addendum only (awareness), no tools
 *   standard — prompt addendum + read-only tools (list, get, find)
 *   full     — prompt addendum + all tools including write operations
 */

import type { BrowserProfilesDisclosureLevel } from "./types.js";

export type { BrowserProfilesDisclosureLevel };

export interface DisclosurePolicy {
  injectPrompt: boolean;
  readTools: boolean;
  writeTools: boolean;
}

const POLICY_MAP: Record<BrowserProfilesDisclosureLevel, DisclosurePolicy> = {
  off: { injectPrompt: false, readTools: false, writeTools: false },
  minimal: { injectPrompt: true, readTools: false, writeTools: false },
  standard: { injectPrompt: true, readTools: true, writeTools: false },
  full: { injectPrompt: true, readTools: true, writeTools: true },
};

export function getDisclosurePolicy(level: BrowserProfilesDisclosureLevel): DisclosurePolicy {
  return POLICY_MAP[level];
}

/**
 * Resolves the effective disclosure level from an AgentRunCapabilityContext.
 * Returns "off" when browser profiles capability is absent or disabled.
 */
export function getDisclosureLevel(context: {
  browserProfiles?: { enabled: boolean; disclosureLevel: BrowserProfilesDisclosureLevel };
}): BrowserProfilesDisclosureLevel {
  if (!context.browserProfiles?.enabled) {
    return "off";
  }
  return context.browserProfiles.disclosureLevel;
}
