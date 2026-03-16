/**
 * EasyClaw Tools Plugin
 *
 * Registers EasyClaw-specific tools and a `before_prompt_build` hook that
 * replaces the OpenClaw CLI Quick Reference section in the system prompt
 * with EasyClaw-specific guidance (runtime string replacement).
 *
 * Discovery: OpenClaw auto-discovers this plugin via the openclaw.plugin.json
 * manifest when the extensions/ directory is in plugins.load.paths.
 */

import { createBrowserModeContext } from "./browser-mode-context.js";
import { createEasyClawContext } from "./easyclaw-context.js";
import { createEasyClawTool } from "./tools/easyclaw-tool.js";
import { createProvidersTool } from "./tools/providers-tool.js";

// Inline plugin API types — avoids depending on vendor internals.
// Matches the shape provided by OpenClaw's plugin loader.
type PluginApi = {
  logger: { info: (msg: string) => void };
  pluginConfig?: Record<string, unknown>;
  on(event: string, handler: (...args: any[]) => any): void;
  registerTool(factory: (ctx: { config?: Record<string, unknown> }) => unknown): void;
};

type PluginDefinition = {
  id: string;
  name: string;
  activate(api: PluginApi): void;
};

const plugin: PluginDefinition = {
  id: "easyclaw-tools",
  name: "EasyClaw Tools",

  activate(api: PluginApi): void {
    // Replace OpenClaw CLI section in system prompt with EasyClaw guidance
    api.on("before_prompt_build", createEasyClawContext());

    // Override browser tool description based on configured browser mode
    const browserMode = (api.pluginConfig?.browserMode as "standalone" | "cdp") || "standalone";
    api.on("before_prompt_build", createBrowserModeContext(browserMode));

    // Register the easyclaw system status tool
    api.registerTool((ctx) => createEasyClawTool({ config: ctx.config }));

    // Register the providers tool (manages API keys via panel-server HTTP API)
    api.registerTool(() => createProvidersTool());

    api.logger.info("EasyClaw tools plugin activated");
  },
};

export default plugin;
