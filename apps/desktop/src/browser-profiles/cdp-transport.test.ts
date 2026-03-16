import { describe, it, expect } from "vitest";
// Just verify the module exports are accessible
import { fetchDebuggerUrl, sendCdpCommand } from "./cdp-transport.js";

describe("cdp-transport", () => {
  it("fetchDebuggerUrl returns null when port is unreachable", async () => {
    // Use a port that's almost certainly not in use
    const result = await fetchDebuggerUrl(19999);
    expect(result).toBeNull();
  });

  it("sendCdpCommand rejects on connection error", async () => {
    await expect(
      sendCdpCommand("ws://127.0.0.1:19999/invalid", "Network.getAllCookies", {}, 1000),
    ).rejects.toThrow();
  });
});
