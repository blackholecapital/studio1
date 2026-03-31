/**
 * Editor export — backwards-compatibility re-export hub.
 *
 * All actual logic is now in the service layer:
 *   - services/storage/projectStore.ts (load, save, list)
 *   - services/deploy/api.ts (deployGateway)
 *   - services/runtime/download.ts (downloadProjectJson)
 *
 * This file re-exports everything so existing imports continue to work.
 */

// Types from domain layer
export type { PageData, ProjectData, DeployResult } from "../../domain/project/types";

// Factory functions from domain layer
export { makeEmptyPage, makeEmptyProject } from "../../domain/project/defaults";

// Storage operations from service layer
export { loadProject, saveProject, listSavedSlugs } from "../../services/storage/projectStore";

// Deploy operation from service layer
export { deployGateway } from "../../services/deploy/api";

// Download operation from service layer
export { downloadProjectJson } from "../../services/runtime/download";
