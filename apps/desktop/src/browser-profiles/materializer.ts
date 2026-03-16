/**
 * Materialized directory lifecycle for browser profiles.
 *
 * Each profile gets a stable local directory at:
 *   <basePath>/browser-profiles/<profile-id>/
 */

import { join } from "node:path";
import { rm } from "node:fs/promises";

/**
 * Return the expected materialized path for a profile (pure function).
 */
export function getMaterializedPath(profileId: string, basePath: string): string {
  return join(basePath, "browser-profiles", profileId);
}

/**
 * Safely remove a profile's materialized directory from disk.
 * Does not throw if the directory does not exist.
 */
export async function deleteMaterialized(profileId: string, basePath: string): Promise<void> {
  const dirPath = getMaterializedPath(profileId, basePath);
  await rm(dirPath, { recursive: true, force: true });
}
