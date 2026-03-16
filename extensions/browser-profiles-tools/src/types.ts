/**
 * Shared types for the browser-profiles-tools extension.
 *
 * Re-exports core types so the extension stays compatible with
 * @easyclaw/core's canonical definitions.
 */

export type {
  BrowserProfilesDisclosureLevel,
  BrowserProfilesCapabilityBinding,
  AgentRunCapabilityContext,
} from "@easyclaw/core";

export type {
  ToolScopeType,
  AgentRunToolContext,
} from "@easyclaw/core";
