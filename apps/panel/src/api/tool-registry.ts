/** REST client for the unified tool capability registry (panel-server endpoints). */

export interface AvailableTool {
  id: string;
  displayName: string;
  description: string;
  category: string;
  allowed: boolean;
  denialReason?: string;
}

export interface ToolSelection {
  toolId: string;
  enabled: boolean;
}

const BASE = "http://127.0.0.1:3210/api/tools";

export async function fetchAvailableTools(): Promise<AvailableTool[]> {
  const res = await fetch(`${BASE}/available`);
  if (!res.ok) return [];
  const data = (await res.json()) as { tools: AvailableTool[] };
  return data.tools;
}

export async function fetchToolSelections(
  scopeType: string,
  scopeKey: string,
): Promise<ToolSelection[]> {
  const params = new URLSearchParams({ scopeType, scopeKey });
  const res = await fetch(`${BASE}/selections?${params}`);
  if (!res.ok) throw new Error(`fetchToolSelections failed: ${res.status}`);
  const data = (await res.json()) as { selections: ToolSelection[] };
  return data.selections;
}

export async function saveToolSelections(
  scopeType: string,
  scopeKey: string,
  selections: ToolSelection[],
): Promise<void> {
  const res = await fetch(`${BASE}/selections`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scopeType, scopeKey, selections }),
  });
  if (!res.ok) throw new Error(`saveToolSelections failed: ${res.status}`);
}

/** Ensure tool context (including default presets) is pushed to the gateway plugin for a scope. */
export async function ensureToolContext(
  scopeType: string,
  scopeKey: string,
): Promise<void> {
  const res = await fetch(`${BASE}/ensure-context`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scopeType, scopeKey }),
  });
  if (!res.ok) throw new Error(`ensureToolContext failed: ${res.status}`);
}
