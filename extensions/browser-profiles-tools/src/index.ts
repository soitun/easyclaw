/**
 * Browser Profiles Tools Plugin
 *
 * Registers browser profile management tools and prompt hooks based on
 * the disclosure level configured in the AgentRunCapabilityContext.
 *
 * Tool gating is run-scoped: the before_tool_call hook checks entitlements
 * and per-scope selections from an in-memory Map populated by the desktop
 * runtime via a registered gateway method. Prompt addendum injection is
 * also conditional on whether browser-profile tools are selected for the
 * current run.
 *
 * Discovery: OpenClaw auto-discovers this plugin via the openclaw.plugin.json
 * manifest when the extensions/ directory is in plugins.load.paths.
 */

import { getDisclosurePolicy, getDisclosureLevel } from "./disclosure.js";
import { createBrowserProfilesPromptHook } from "./prompt-addendum.js";
import { setRunToolContext, getRunToolContext, removeRunToolContext, checkToolAccessFromContext, hasSelectedBrowserProfileTools, clearRunToolContexts, resolveRunToolContext } from "./tool-selection.js";
import { getReadTools, getWriteTools } from "./tools.js";
import { pushCookiesForRestore, pushCdpPort, restoreCookies, captureCookies, pullCapturedCookies, clearAll as clearCookieState } from "./cookie-handler.js";
import type { CdpCookie } from "./cdp-transport.js";
import type { AgentRunCapabilityContext, AgentRunToolContext } from "./types.js";

// In-memory store for prompt addendum pushed by desktop via RPC.
// This avoids writing the prompt to the gateway config file on disk.
let inMemoryPromptAddendum: string | undefined;

// Inline plugin API types — avoids depending on vendor internals.
type PluginApi = {
  logger: { info: (msg: string) => void };
  pluginConfig?: Record<string, unknown>;
  on(event: string, handler: (...args: any[]) => any): void;
  registerTool(factory: (ctx: { config?: Record<string, unknown> }) => unknown): void;
  registerGatewayMethod?(name: string, handler: (args: {
    params: Record<string, unknown>;
    respond: (ok: boolean, payload?: unknown, error?: { code: string; message: string }) => void;
  }) => void): void;
};

type PluginDefinition = {
  id: string;
  name: string;
  activate(api: PluginApi): void;
};

/**
 * Resolves the capability context from the plugin config.
 * Defaults to DISABLED when no explicit config is present — fail-closed.
 */
function resolveCapabilityContext(
  config?: Record<string, unknown>,
): AgentRunCapabilityContext {
  if (config?.capabilityContext) {
    return config.capabilityContext as AgentRunCapabilityContext;
  }
  return {
    browserProfiles: {
      enabled: false,
      disclosureLevel: "off",
      allowDynamicDiscovery: false,
    },
  };
}

/**
 * Build the prompt addendum for browser profile tools.
 * Uses server-provided prompt from plugin config, falling back to empty default.
 */
function buildPromptAddendum(promptAddendum?: string) {
  return createBrowserProfilesPromptHook(promptAddendum)({ prompt: "" });
}

const plugin: PluginDefinition = {
  id: "browser-profiles-tools",
  name: "Browser Profiles Tools",

  activate(api: PluginApi): void {
    const readToolDefs = getReadTools();
    const writeToolDefs = getWriteTools();

    // Gate tool calls based on entitlements and per-scope selections.
    api.on(
      "before_tool_call",
      async (
        event: { toolName: string; params: Record<string, unknown> },
        ctx: { sessionKey?: string },
      ) => {
        if (!event.toolName.startsWith("browser_profiles-")) return {};

        const scopeKey = ctx.sessionKey;
        if (!scopeKey) {
          return { block: true, blockReason: "No session context available for tool access check" };
        }

        const runCtx = resolveRunToolContext(scopeKey);
        if (!runCtx) {
          return { block: true, blockReason: "No run tool context available — tools not configured for this session" };
        }

        const blockReason = checkToolAccessFromContext(event.toolName, runCtx);
        if (blockReason) return { block: true, blockReason };
        return {};
      },
    );

    // Inject prompt addendum only when browser-profile tools are selected
    // for the current run scope.
    api.on(
      "before_prompt_build",
      async (
        _event: unknown,
        ctx: { sessionKey?: string },
      ) => {
        const disclosure = getDisclosurePolicy(effectiveLevel);
        if (!disclosure.injectPrompt) return {};

        const scopeKey = ctx.sessionKey;
        if (!scopeKey) return {};

        const runCtx = resolveRunToolContext(scopeKey);
        if (!runCtx) return {}; // No context pushed = no addendum (default-closed)

        if (!hasSelectedBrowserProfileTools(runCtx)) return {};

        return buildPromptAddendum(inMemoryPromptAddendum);
      },
    );

    // Clean up run-scoped context when a session ends.
    api.on(
      "session_end",
      async (
        event: { sessionId: string; sessionKey?: string },
        _ctx: unknown,
      ) => {
        if (event.sessionKey) {
          removeRunToolContext(event.sessionKey);
        }
      },
    );

    // ── Browser session lifecycle: cookie restore/capture ────────────
    // Cookies are restored directly via CDP in the hook handler (runs in
    // the vendor pipeline, sequenced with the agent's browser actions).
    api.on(
      "browser_session_start",
      async (
        event: { profile?: string; action: string },
        _ctx: { sessionKey?: string; profile?: string },
      ) => {
        const profile = event.profile ?? "openclaw";
        const result = await restoreCookies(profile);
        if (result.restored > 0) {
          api.logger.info(`Restored ${result.restored} cookies for profile "${profile}"`);
        }
      },
    );

    // Cookies are captured directly via CDP before the browser stops.
    // The vendor patch ensures this hook fires BEFORE browserStop().
    api.on(
      "browser_session_end",
      async (
        event: { profile?: string; action: string },
        _ctx: { sessionKey?: string; profile?: string },
      ) => {
        const profile = event.profile ?? "openclaw";
        const result = await captureCookies(profile);
        if (result.captured > 0) {
          api.logger.info(`Captured ${result.captured} cookies for profile "${profile}"`);
        }
      },
    );

    // ── Gateway methods for desktop ↔ plugin data exchange ────────────
    if (typeof api.registerGatewayMethod === "function") {
      // Desktop pushes run-scoped tool context on gateway connect or tool selection change.
      api.registerGatewayMethod("browser_profiles_set_run_context", ({ params, respond }: {
        params: Record<string, unknown>;
        respond: (ok: boolean, payload?: unknown, error?: { code: string; message: string }) => void;
      }) => {
        const ctx = params as unknown as AgentRunToolContext;
        if (!ctx.scopeKey) {
          respond(false, undefined, { code: "INVALID_PARAMS", message: "Missing scopeKey in run tool context" });
          return;
        }
        setRunToolContext(ctx.scopeKey, ctx);
        respond(true, { ok: true });
      });

      // Desktop pushes prompt addendum via RPC (in-memory, never written to config file).
      api.registerGatewayMethod("browser_profiles_tools_set_prompt_addendum", ({ params, respond }: {
        params: Record<string, unknown>;
        respond: (ok: boolean, payload?: unknown, error?: { code: string; message: string }) => void;
      }) => {
        inMemoryPromptAddendum = typeof params.prompt === "string" ? params.prompt : undefined;
        respond(true);
      });

      // Desktop pushes decrypted cookies for a profile before browser start.
      api.registerGatewayMethod("browser_profiles_push_cookies", ({ params, respond }: {
        params: Record<string, unknown>;
        respond: (ok: boolean, payload?: unknown, error?: { code: string; message: string }) => void;
      }) => {
        const profileName = params.profileName as string | undefined;
        const cookies = params.cookies as CdpCookie[] | undefined;
        const cdpPort = params.cdpPort as number | undefined;
        if (!profileName) {
          respond(false, undefined, { code: "INVALID_PARAMS", message: "Missing profileName" });
          return;
        }
        if (cookies) {
          pushCookiesForRestore(profileName, cookies, cdpPort);
        } else if (cdpPort !== undefined) {
          pushCdpPort(profileName, cdpPort);
        }
        respond(true, { ok: true });
      });

      // Desktop retrieves captured cookies after browser session ends.
      api.registerGatewayMethod("browser_profiles_pull_cookies", ({ params, respond }: {
        params: Record<string, unknown>;
        respond: (ok: boolean, payload?: unknown, error?: { code: string; message: string }) => void;
      }) => {
        const profileName = params.profileName as string | undefined;
        if (!profileName) {
          respond(false, undefined, { code: "INVALID_PARAMS", message: "Missing profileName" });
          return;
        }
        const cookies = pullCapturedCookies(profileName);
        respond(true, { cookies });
      });
    }

    // ── Clean up all state on gateway stop ────────────────
    api.on("gateway_stop", () => {
      clearRunToolContexts();
      clearCookieState();
    });

    // Resolve capability context once from plugin config (set by gateway entries).
    // api.pluginConfig is the plugin-specific config from plugins.entries[id].config,
    // NOT the full gateway config that registerTool factories receive via ctx.config.
    const capabilityContext = resolveCapabilityContext(api.pluginConfig);
    const effectiveLevel = getDisclosureLevel(capabilityContext);
    const policy = getDisclosurePolicy(effectiveLevel);
    // Register read-only tools
    if (policy.readTools) {
      for (const toolDef of readToolDefs) {
        api.registerTool(() => toolDef);
      }
    }

    // Register write tools
    if (policy.writeTools) {
      for (const toolDef of writeToolDefs) {
        api.registerTool(() => toolDef);
      }
    }

    api.logger.info("Browser profiles tools plugin activated");
  },
};

export default plugin;

// Public API for reuse by other packages
export { getDisclosureLevel, getDisclosurePolicy } from "./disclosure.js";
export type { DisclosurePolicy, BrowserProfilesDisclosureLevel } from "./disclosure.js";
export { createBrowserProfilesPromptHook } from "./prompt-addendum.js";
export { setRunToolContext, getRunToolContext, resolveRunToolContext, removeRunToolContext, checkToolAccessFromContext, hasSelectedBrowserProfileTools, clearRunToolContexts } from "./tool-selection.js";
export type { AgentRunCapabilityContext, BrowserProfilesCapabilityBinding, AgentRunToolContext, ToolScopeType } from "./types.js";
