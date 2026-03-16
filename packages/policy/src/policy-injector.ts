import { createLogger } from "@easyclaw/logger";
import type {
  PromptBuildEvent,
  PromptBuildResult,
  GuardProvider,
  PolicyProvider,
} from "./types.js";

const log = createLogger("easyclaw:policy-injector");

/**
 * Parse a guard artifact's JSON content into a human-readable directive
 * for system prompt injection. Returns null if content is unparseable.
 */
function formatGuardDirective(content: string): string | null {
  try {
    const parsed: unknown = JSON.parse(content);
    if (typeof parsed !== "object" || parsed === null) return null;

    const obj = parsed as Record<string, unknown>;
    const condition = typeof obj.condition === "string" ? obj.condition : null;
    const reason = typeof obj.reason === "string" ? obj.reason : null;
    const action = typeof obj.action === "string" ? obj.action.toUpperCase() : "BLOCK";

    if (!condition && !reason) return null;

    if (reason && reason !== condition) {
      return `[${action}] ${condition ?? reason} — ${reason}`;
    }
    return `[${action}] ${condition ?? reason}`;
  } catch {
    return null;
  }
}

/**
 * Creates a before_prompt_build handler that injects the compiled policy view
 * and active guard directives as prependSystemContext (system prompt layer,
 * invisible to the user chat UI).
 */
export function createPolicyInjector(
  provider: PolicyProvider,
  guardProvider?: GuardProvider,
): (event: PromptBuildEvent) => PromptBuildResult {
  return function handlePromptBuild(_event: PromptBuildEvent): PromptBuildResult {
    const policyView = provider.getCompiledPolicyView();
    const guards = guardProvider?.getActiveGuards() ?? [];

    // Format guard directives
    const guardDirectives: string[] = [];
    for (const guard of guards) {
      const directive = formatGuardDirective(guard.content);
      if (directive) {
        guardDirectives.push(directive);
      } else {
        log.warn(`Skipping guard ${guard.id}: could not format content for prompt injection`);
      }
    }

    const hasPolicy = !!policyView;
    const hasGuards = guardDirectives.length > 0;

    if (!hasPolicy && !hasGuards) {
      log.debug("No policies or guards available; passing through context");
      return {};
    }

    const blocks: string[] = [];

    if (hasPolicy) {
      log.info("Injecting compiled policy view into system prompt");
      blocks.push(policyView);
    }

    if (hasGuards) {
      log.info(`Injecting ${guardDirectives.length} guard directive(s) into system prompt`);
      blocks.push(guardDirectives.join("\n"));
    }

    return {
      prependSystemContext: blocks.join("\n\n"),
    };
  };
}
