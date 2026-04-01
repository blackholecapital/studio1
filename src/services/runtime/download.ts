/**
 * Download/export helpers.
 *
 * Extracted from:
 *   - src/ui/state/editorExport.ts (downloadProjectJson)
 */

import type { ProjectData } from "../../domain/project/types";

/**
 * Trigger a browser download of the project as a JSON file.
 */
export function downloadProjectJson(project: ProjectData): void {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${project.slug}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
