/**
 * Mobile-specific helper functions.
 *
 * Extracted from MobileApp.tsx: getMobDims, makeMobDefaultCard, mobCardCounter.
 */

import type { CardModel } from "../../../domain/project/types";
import { MOB_NAV_H } from "../../../domain/editor/constants";
import { INSTRUCTIONS_IMAGE } from "./mobileConstants";

// ── Workspace dimensions ────────────────────────────────────────────────────

export function getMobDims() {
  return {
    width: window.innerWidth,
    height: Math.max(window.innerHeight - MOB_NAV_H, 300),
  };
}

// ── Card counter (module-level mutable) ─────────────────────────────────────

let mobCardCounter = 0;

export function getMobCardCounter(): number {
  return mobCardCounter;
}

export function setMobCardCounter(n: number): void {
  mobCardCounter = n;
}

export function incrementMobCardCounter(): number {
  mobCardCounter += 1;
  return mobCardCounter;
}

// ── Default card factory ────────────────────────────────────────────────────

export function makeMobDefaultCard(dims: { width: number; height: number }): CardModel {
  const counter = incrementMobCardCounter();
  const w = Math.round(Math.min(dims.width * 0.86, 360));
  const h = Math.round(Math.min(dims.height * 0.52, 260));
  return {
    id: `card-${counter}`,
    label: `Card ${counter}`,
    x: Math.round((dims.width - w) / 2),
    y: Math.round((dims.height - h) / 2),
    w,
    h,
    zIndex: 1,
    lockSize: false,
    lockPosition: false,
    contentImage: INSTRUCTIONS_IMAGE,
    contentCode: "c4444",
    contentDisplay: "image",
  };
}
