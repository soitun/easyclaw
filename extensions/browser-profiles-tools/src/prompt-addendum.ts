type PromptBuildEvent = {
  prompt: string;
  messages?: unknown[];
};

type PromptBuildResult = {
  prependSystemContext?: string;
};

const DEFAULT_PROMPT_ADDENDUM = "";

/**
 * Creates a before_prompt_build handler that injects browser profile awareness.
 * Uses prependSystemContext so the prompt is injected into the system prompt,
 * not the user message (which would leak into the chat transcript / UI).
 */
export function createBrowserProfilesPromptHook(prompt?: string): (event: PromptBuildEvent) => PromptBuildResult {
  return function handlePromptBuild(_event: PromptBuildEvent): PromptBuildResult {
    return { prependSystemContext: prompt ?? DEFAULT_PROMPT_ADDENDUM };
  };
}
