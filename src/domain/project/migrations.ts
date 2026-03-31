/**
 * Project migration stubs.
 *
 * Currently only version 1 exists. When a version 2 schema is introduced,
 * add a migration function here and register it in MIGRATIONS.
 *
 * Each migration transforms a project from version N to version N+1.
 * migrateProject() applies all necessary migrations in sequence.
 */

import { PROJECT_VERSION, KNOWN_VERSIONS } from "./schema";

type MigrationFn = (data: Record<string, unknown>) => Record<string, unknown>;

/**
 * Registry of migration functions keyed by source version.
 * Example: { 1: migrateV1ToV2 } would upgrade version 1 → 2.
 */
const MIGRATIONS: Record<number, MigrationFn> = {
  // No migrations yet — version 1 is the only schema.
  // When version 2 is introduced, add:
  //   1: (data) => { /* transform v1 → v2 */ return { ...data, version: 2 }; },
};

/**
 * Apply all necessary migrations to bring a project payload up to the current version.
 *
 * Returns the migrated data, or null if the version is unrecognized or migration fails.
 */
export function migrateProject(data: Record<string, unknown>): Record<string, unknown> | null {
  const version = typeof data.version === "number" ? data.version : 0;

  if (version === PROJECT_VERSION) return data;
  if (!KNOWN_VERSIONS.includes(version)) return null;

  let current = { ...data };
  let v = version;

  while (v < PROJECT_VERSION) {
    const migrate = MIGRATIONS[v];
    if (!migrate) return null;
    try {
      current = migrate(current);
      v += 1;
    } catch {
      return null;
    }
  }

  return current;
}
