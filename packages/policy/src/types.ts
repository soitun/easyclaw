/** Event passed to before_prompt_build hook. */
export interface PromptBuildEvent {
  /** The user's prompt text. */
  prompt: string;
  /** Session messages prepared for this run. */
  messages?: unknown[];
}

/** Result from before_prompt_build hook. */
export interface PromptBuildResult {
  /** Prepended to system prompt (invisible to user). */
  prependSystemContext?: string;
}

/** Context passed to before_tool_call hook. */
export interface ToolCallContext {
  /** Name of the tool being called. */
  toolName: string;
  /** Parameters for the tool call. */
  params: Record<string, unknown>;
}

/** Result from before_tool_call hook. */
export interface ToolCallResult {
  /** If true, the tool call is blocked. */
  block?: boolean;
  /** Reason for blocking (shown to user/agent). */
  blockReason?: string;
  /** Modified parameters (if allowed but adjusted). */
  params?: Record<string, unknown>;
}

/** A policy provider supplies the compiled policy view. */
export interface PolicyProvider {
  getCompiledPolicyView(): string;
}

/** A guard provider supplies active guard artifacts for evaluation. */
export interface GuardProvider {
  getActiveGuards(): Array<{
    id: string;
    ruleId: string;
    content: string;
  }>;
}

/** OpenClaw plugin registration API. */
export interface OpenClawPluginAPI {
  registerHook(
    hookName: "before_prompt_build",
    handler: (event: PromptBuildEvent) => PromptBuildResult,
  ): void;
  registerHook(
    hookName: "before_tool_call",
    handler: (ctx: ToolCallContext) => ToolCallResult,
  ): void;
}
