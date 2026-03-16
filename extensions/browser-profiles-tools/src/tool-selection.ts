import type { AgentRunToolContext } from "./types.js";

// ── In-memory run context store ───────────────────────────────
// Keyed by scopeKey (which corresponds to sessionKey in hook context).
// Populated by the desktop runtime via the registered gateway method.
const runToolContextMap = new Map<string, AgentRunToolContext>();

/** Store a run tool context (called by the gateway method handler). */
export function setRunToolContext(scopeKey: string, ctx: AgentRunToolContext): void {
  runToolContextMap.set(scopeKey, ctx);
}

/** Retrieve the run tool context for a given scope key. */
export function getRunToolContext(scopeKey: string): AgentRunToolContext | undefined {
  return runToolContextMap.get(scopeKey);
}

/** Remove a single run tool context entry. Returns true if the entry existed. */
export function removeRunToolContext(scopeKey: string): boolean {
  return runToolContextMap.delete(scopeKey);
}

/** Clear all stored contexts. Exposed for testing. */
export function clearRunToolContexts(): void {
  runToolContextMap.clear();
}

/**
 * Resolve run tool context with fallback for cron session keys.
 *
 * Cron sessions have session keys like "agent:main:cron:{jobId}".
 * Context is stored under bare jobId. This function tries the exact key first,
 * then extracts the jobId from cron-style session keys as a fallback.
 */
export function resolveRunToolContext(sessionKey: string): AgentRunToolContext | undefined {
  // Exact match first
  const direct = runToolContextMap.get(sessionKey);
  if (direct) return direct;

  // Cron fallback: extract jobId from "agent:{agentId}:cron:{jobId}" or "cron:{jobId}"
  const cronMatch = sessionKey.match(/(?:^|:)cron:(.+?)(?::run:|$)/);
  if (cronMatch) {
    return runToolContextMap.get(cronMatch[1]);
  }

  return undefined;
}

// ── Pure enforcement functions ────────────────────────────────

/**
 * Check whether a tool is accessible given a pre-built run context.
 * Returns null if allowed, or a human-readable denial reason.
 */
export function checkToolAccessFromContext(
  toolName: string,
  ctx: AgentRunToolContext,
): string | null {
  if (!ctx.entitledTools.includes(toolName)) {
    return "Tool not available for this account";
  }
  if (!ctx.selectedTools.includes(toolName)) {
    return "Browser profile tools not enabled for this run";
  }
  return null;
}

/**
 * Check whether any browser-profile tools are selected in the given context.
 */
export function hasSelectedBrowserProfileTools(ctx: AgentRunToolContext): boolean {
  return ctx.selectedTools.some(id => id.startsWith("browser_profiles-"));
}
