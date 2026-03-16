/**
 * EasyClaw Runtime Context — prependSystemContext injection
 *
 * Uses the `before_prompt_build` hook to prepend EasyClaw runtime context
 * to the system prompt. This tells the AI it's inside EasyClaw and must
 * use `gateway`/`easyclaw` tools instead of `openclaw` CLI commands.
 *
 * The OpenClaw system prompt still contains the CLI Quick Reference section,
 * but the prepended context takes priority — the AI sees "do NOT use openclaw
 * CLI" before it sees the CLI instructions.
 */

type PromptBuildEvent = {
  prompt: string;
  messages?: unknown[];
};

type PromptBuildResult = {
  prependSystemContext?: string;
};

const EASYCLAW_CONTEXT = [
  "CRITICAL: You are running inside EasyClaw Desktop Application.",
  "The `openclaw` CLI binary is NOT available in PATH.",
  "Do NOT attempt to run any `openclaw` commands via exec or shell — they will fail.",
  "",
  'Ignore the "OpenClaw CLI Quick Reference" section in the system prompt — those commands do not work here.',
  "",
  "Instead, use these built-in tools:",
  "- `gateway` tool: restart gateway, get/patch/apply config, run updates",
  "- `easyclaw` tool: check system status, get available actions",
  "",
  "Gateway lifecycle (start/stop) is automatically managed by EasyClaw.",
  "You do not need to start, stop, or install the gateway service.",
].join("\n");

export function createEasyClawContext(): (event: PromptBuildEvent) => PromptBuildResult {
  return function handlePromptBuild(_event: PromptBuildEvent): PromptBuildResult {
    return { prependSystemContext: EASYCLAW_CONTEXT };
  };
}
