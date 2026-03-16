import { get as httpGet } from "node:http";
import { WebSocket } from "ws";

/**
 * Fetch the WebSocket debugger URL from Chrome's /json/list endpoint.
 * Uses a page-level target (supports Network domain commands like
 * getAllCookies/setCookies). Falls back to /json/version (browser-level)
 * if no page targets are found.
 * Returns null if Chrome is not reachable.
 */
export function fetchDebuggerUrl(port: number): Promise<string | null> {
  return new Promise((resolve) => {
    const req = httpGet(`http://127.0.0.1:${port}/json/list`, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        resolve(null);
        return;
      }
      let body = "";
      res.setEncoding("utf-8");
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => {
        try {
          const targets = JSON.parse(body) as Array<{ type?: string; webSocketDebuggerUrl?: string }>;
          const page = targets.find(t => t.type === "page");
          resolve(page?.webSocketDebuggerUrl ?? targets[0]?.webSocketDebuggerUrl ?? null);
        } catch {
          resolve(null);
        }
      });
    });
    req.on("error", () => resolve(null));
    req.setTimeout(3000, () => { req.destroy(); resolve(null); });
  });
}

/** Send a single CDP command over WebSocket and return the result. */
export function sendCdpCommand(
  wsUrl: string,
  method: string,
  params: Record<string, unknown> = {},
  timeoutMs = 5000,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const id = 1;
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        ws.close();
        reject(new Error(`CDP command '${method}' timed out after ${timeoutMs}ms`));
      }
    }, timeoutMs);

    ws.on("open", () => {
      ws.send(JSON.stringify({ id, method, params }));
    });

    ws.on("message", (data) => {
      if (settled) return;
      try {
        const msg = JSON.parse(data.toString()) as { id?: number; result?: unknown; error?: { message: string } };
        if (msg.id === id) {
          settled = true;
          clearTimeout(timer);
          ws.close();
          if (msg.error) {
            reject(new Error(`CDP error: ${msg.error.message}`));
          } else {
            resolve(msg.result);
          }
        }
      } catch {
        // Ignore parse errors on non-matching messages
      }
    });

    ws.on("error", (err) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(err);
      }
    });
  });
}
