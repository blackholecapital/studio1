/**
 * Deploy network service — sends project payload to R2 via the deploy endpoint.
 *
 * Extracted from:
 *   - src/ui/state/editorExport.ts (deployGateway)
 *
 * Single canonical deploy call used by both desktop and mobile.
 */

import type { ProjectData, DeployResult } from "../../domain/project/types";
import { R2_DEPLOY_ENDPOINT } from "../../domain/editor/constants";
import { saveProject } from "../storage/projectStore";

/**
 * Deploy a project to R2. On network failure, saves locally as fallback.
 *
 * @param project The full project data (saved locally on network error).
 * @param deployPayload Optional pre-built payload (main + holiday).
 *   If omitted, the raw project data is sent.
 */
export async function deployGateway(
  project: ProjectData,
  deployPayload?: Record<string, unknown>,
): Promise<DeployResult> {
  const body = JSON.stringify({
    slug: project.slug,
    data: deployPayload ?? project,
  });

  try {
    const res = await fetch(R2_DEPLOY_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    if (!res.ok) {
      const errBody = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      const serverMsg = (errBody.error as string) ?? `${res.status} ${res.statusText}`;
      return { ok: false, error: `Deploy failed: ${serverMsg}` };
    }

    const resBody = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return {
      ok: true,
      primaryUrl: resBody.primaryUrl as string | undefined,
      holidayUrl: resBody.holidayUrl as string | undefined,
    };
  } catch (err) {
    console.error("[deploy] network error:", err);
    saveProject(project);
    return { ok: false, error: `Network error: ${(err as Error).message}` };
  }
}
