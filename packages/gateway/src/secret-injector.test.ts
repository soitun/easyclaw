import { describe, it, expect } from "vitest";
import { resolveSecretEnv, buildGatewayEnv } from "./secret-injector.js";
import type { SecretStore } from "@easyclaw/secrets";

class MockSecretStore implements SecretStore {
  private store = new Map<string, string>();

  constructor(initial?: Record<string, string>) {
    if (initial) {
      for (const [k, v] of Object.entries(initial)) {
        this.store.set(k, v);
      }
    }
  }

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }
  async set(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }
  async delete(key: string): Promise<boolean> {
    return this.store.delete(key);
  }
  async listKeys(): Promise<string[]> {
    return [...this.store.keys()];
  }
}

describe("resolveSecretEnv", () => {
  it("should return empty object when no secrets set", async () => {
    const store = new MockSecretStore();
    const env = await resolveSecretEnv(store);
    expect(Object.keys(env)).toHaveLength(0);
  });

  it("should map per-provider secret keys to env vars", async () => {
    const store = new MockSecretStore({
      "openai-api-key": "sk-openai-123",
      "anthropic-api-key": "sk-ant-456",
      "stt-api-key": "stt-key-789",
    });

    const env = await resolveSecretEnv(store);
    expect(env["OPENAI_API_KEY"]).toBe("sk-openai-123");
    expect(env["ANTHROPIC_API_KEY"]).toBe("sk-ant-456");
    expect(env["STT_API_KEY"]).toBe("stt-key-789");
  });

  it("should inject multiple LLM provider keys simultaneously", async () => {
    const store = new MockSecretStore({
      "openai-api-key": "sk-openai",
      "deepseek-api-key": "sk-deepseek",
      "moonshot-api-key": "sk-moonshot",
    });

    const env = await resolveSecretEnv(store);
    expect(env["OPENAI_API_KEY"]).toBe("sk-openai");
    expect(env["DEEPSEEK_API_KEY"]).toBe("sk-deepseek");
    expect(env["MOONSHOT_API_KEY"]).toBe("sk-moonshot");
  });

  it("should fall back to legacy llm-api-key for OPENAI_API_KEY", async () => {
    const store = new MockSecretStore({
      "llm-api-key": "sk-legacy",
    });

    const env = await resolveSecretEnv(store);
    expect(env["OPENAI_API_KEY"]).toBe("sk-legacy");
  });

  it("should prefer openai-api-key over legacy llm-api-key", async () => {
    const store = new MockSecretStore({
      "openai-api-key": "sk-new",
      "llm-api-key": "sk-legacy",
    });

    const env = await resolveSecretEnv(store);
    expect(env["OPENAI_API_KEY"]).toBe("sk-new");
  });

  it("should skip secrets that are not set", async () => {
    const store = new MockSecretStore({
      "openai-api-key": "sk-test",
    });

    const env = await resolveSecretEnv(store);
    expect(env["OPENAI_API_KEY"]).toBe("sk-test");
    expect(env).not.toHaveProperty("ANTHROPIC_API_KEY");
  });

  it("should inject non-LLM static secrets", async () => {
    const store = new MockSecretStore({
      "stt-api-key": "stt-key",
    });

    const env = await resolveSecretEnv(store);
    expect(env["STT_API_KEY"]).toBe("stt-key");
  });
});

describe("buildGatewayEnv", () => {
  it("should merge process env with secrets", async () => {
    const store = new MockSecretStore({
      "openai-api-key": "sk-secret",
    });

    const env = await buildGatewayEnv(store);
    expect(env["OPENAI_API_KEY"]).toBe("sk-secret");
    // Should include process.env values
    expect(env["PATH"]).toBeDefined();
  });

  it("should merge extra env vars", async () => {
    const store = new MockSecretStore();
    const env = await buildGatewayEnv(store, { CUSTOM_VAR: "custom-value" });
    expect(env["CUSTOM_VAR"]).toBe("custom-value");
  });

  it("should let secrets override extra env", async () => {
    const store = new MockSecretStore({
      "openai-api-key": "from-secrets",
    });

    const env = await buildGatewayEnv(store, { OPENAI_API_KEY: "from-extra" });
    expect(env["OPENAI_API_KEY"]).toBe("from-secrets");
  });
});
