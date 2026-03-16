import { describe, it, expect, beforeEach } from "vitest";
import {
  setRunToolContext,
  getRunToolContext,
  resolveRunToolContext,
  removeRunToolContext,
  checkToolAccessFromContext,
  hasSelectedBrowserProfileTools,
  clearRunToolContexts,
} from "./tool-selection.js";
import type { AgentRunToolContext } from "./types.js";

beforeEach(() => {
  clearRunToolContexts();
});

describe("run tool context Map", () => {
  it("stores and retrieves context by scopeKey", () => {
    const ctx: AgentRunToolContext = {
      scopeType: "chat_session",
      scopeKey: "session-1",
      entitledTools: ["browser_profiles-list"],
      selectedTools: ["browser_profiles-list"],
    };
    setRunToolContext("session-1", ctx);
    expect(getRunToolContext("session-1")).toEqual(ctx);
  });

  it("returns undefined for unknown scopeKey", () => {
    expect(getRunToolContext("unknown")).toBeUndefined();
  });

  it("overwrites existing context for same scopeKey", () => {
    const ctx1: AgentRunToolContext = {
      scopeType: "chat_session",
      scopeKey: "s1",
      entitledTools: ["browser_profiles-list"],
      selectedTools: ["browser_profiles-list"],
    };
    const ctx2: AgentRunToolContext = {
      scopeType: "chat_session",
      scopeKey: "s1",
      entitledTools: ["browser_profiles-list", "browser_profiles-get"],
      selectedTools: ["browser_profiles-get"],
    };
    setRunToolContext("s1", ctx1);
    setRunToolContext("s1", ctx2);
    expect(getRunToolContext("s1")).toEqual(ctx2);
  });

  it("isolates different scopeKeys", () => {
    const ctx1: AgentRunToolContext = {
      scopeType: "chat_session",
      scopeKey: "s1",
      entitledTools: ["browser_profiles-list"],
      selectedTools: ["browser_profiles-list"],
    };
    const ctx2: AgentRunToolContext = {
      scopeType: "cron_job",
      scopeKey: "c1",
      entitledTools: [],
      selectedTools: [],
    };
    setRunToolContext("s1", ctx1);
    setRunToolContext("c1", ctx2);
    expect(getRunToolContext("s1")?.scopeType).toBe("chat_session");
    expect(getRunToolContext("c1")?.scopeType).toBe("cron_job");
  });

  it("removeRunToolContext deletes the entry and returns true", () => {
    setRunToolContext("s1", {
      scopeType: "chat_session",
      scopeKey: "s1",
      entitledTools: ["browser_profiles-list"],
      selectedTools: ["browser_profiles-list"],
    });
    expect(removeRunToolContext("s1")).toBe(true);
  });

  it("removeRunToolContext returns false for non-existent key", () => {
    expect(removeRunToolContext("does-not-exist")).toBe(false);
  });

  it("after removeRunToolContext, getRunToolContext returns undefined", () => {
    setRunToolContext("s1", {
      scopeType: "chat_session",
      scopeKey: "s1",
      entitledTools: ["browser_profiles-list"],
      selectedTools: ["browser_profiles-list"],
    });
    removeRunToolContext("s1");
    expect(getRunToolContext("s1")).toBeUndefined();
  });

  it("clearRunToolContexts removes all entries", () => {
    setRunToolContext("s1", {
      scopeType: "chat_session",
      scopeKey: "s1",
      entitledTools: [],
      selectedTools: [],
    });
    clearRunToolContexts();
    expect(getRunToolContext("s1")).toBeUndefined();
  });
});

describe("resolveRunToolContext", () => {
  const mockCtx: AgentRunToolContext = {
    scopeType: "cron_job",
    scopeKey: "my-job-id",
    entitledTools: ["browser_profiles-list"],
    selectedTools: ["browser_profiles-list"],
  };

  beforeEach(() => clearRunToolContexts());

  it("returns exact match when key exists", () => {
    setRunToolContext("agent:main:panel-abc", mockCtx);
    expect(resolveRunToolContext("agent:main:panel-abc")).toBe(mockCtx);
  });

  it("resolves cron session key to bare jobId", () => {
    setRunToolContext("my-job-id", mockCtx);
    expect(resolveRunToolContext("agent:main:cron:my-job-id")).toBe(mockCtx);
  });

  it("resolves cron session key with :run: suffix", () => {
    setRunToolContext("my-job-id", mockCtx);
    expect(resolveRunToolContext("agent:main:cron:my-job-id:run:some-session-id")).toBe(mockCtx);
  });

  it("resolves simple cron:jobId format", () => {
    setRunToolContext("my-job-id", mockCtx);
    expect(resolveRunToolContext("cron:my-job-id")).toBe(mockCtx);
  });

  it("returns undefined when no match found", () => {
    expect(resolveRunToolContext("agent:main:cron:nonexistent")).toBeUndefined();
  });
});

describe("checkToolAccessFromContext", () => {
  it("allows when tool is entitled AND selected", () => {
    const ctx: AgentRunToolContext = {
      scopeType: "chat_session",
      scopeKey: "s1",
      entitledTools: ["browser_profiles-list"],
      selectedTools: ["browser_profiles-list"],
    };
    expect(checkToolAccessFromContext("browser_profiles-list", ctx)).toBeNull();
  });

  it("blocks when tool is not entitled", () => {
    const ctx: AgentRunToolContext = {
      scopeType: "chat_session",
      scopeKey: "s1",
      entitledTools: [],
      selectedTools: ["browser_profiles-list"],
    };
    expect(checkToolAccessFromContext("browser_profiles-list", ctx)).toBe(
      "Tool not available for this account",
    );
  });

  it("blocks when tool is entitled but not selected", () => {
    const ctx: AgentRunToolContext = {
      scopeType: "chat_session",
      scopeKey: "s1",
      entitledTools: ["browser_profiles-list", "browser_profiles-get"],
      selectedTools: ["browser_profiles-get"],
    };
    expect(checkToolAccessFromContext("browser_profiles-list", ctx)).toBe(
      "Browser profile tools not enabled for this run",
    );
  });

  it("blocks when both lists are empty", () => {
    const ctx: AgentRunToolContext = {
      scopeType: "chat_session",
      scopeKey: "s1",
      entitledTools: [],
      selectedTools: [],
    };
    expect(checkToolAccessFromContext("browser_profiles-list", ctx)).toBe(
      "Tool not available for this account",
    );
  });
});

describe("hasSelectedBrowserProfileTools", () => {
  it("returns true when browser profile tools are selected", () => {
    const ctx: AgentRunToolContext = {
      scopeType: "chat_session",
      scopeKey: "s1",
      entitledTools: ["browser_profiles-list"],
      selectedTools: ["browser_profiles-list", "browser_profiles-get"],
    };
    expect(hasSelectedBrowserProfileTools(ctx)).toBe(true);
  });

  it("returns false when no tools are selected", () => {
    const ctx: AgentRunToolContext = {
      scopeType: "chat_session",
      scopeKey: "s1",
      entitledTools: ["browser_profiles-list"],
      selectedTools: [],
    };
    expect(hasSelectedBrowserProfileTools(ctx)).toBe(false);
  });

  it("returns false when only non-browser-profile tools are selected", () => {
    const ctx: AgentRunToolContext = {
      scopeType: "chat_session",
      scopeKey: "s1",
      entitledTools: ["some_other_tool"],
      selectedTools: ["some_other_tool"],
    };
    expect(hasSelectedBrowserProfileTools(ctx)).toBe(false);
  });
});
