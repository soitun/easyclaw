/** Well-known secret keys used by EasyClaw. */
export type SecretKey =
  | "llm-api-key"
  | "dingtalk-app-secret"
  | "dingtalk-token"
  | "stt-api-key"
  | (string & {}); // allow arbitrary keys while preserving autocomplete

/**
 * Platform-agnostic interface for secure secret storage.
 *
 * Implementations must NEVER log secret values -- only key names and
 * operation outcomes (success / failure).
 */
export interface SecretStore {
  /** Get a secret value. Returns null if not found. */
  get(key: SecretKey): Promise<string | null>;

  /** Set (create or update) a secret value. */
  set(key: SecretKey, value: string): Promise<void>;

  /** Delete a secret. Returns true if it existed. */
  delete(key: SecretKey): Promise<boolean>;

  /** List all stored secret keys (NOT values). */
  listKeys(): Promise<string[]>;
}
