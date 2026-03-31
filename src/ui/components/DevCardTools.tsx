import type { ChangeEvent } from "react";

type CardModel = {
  id: string;
  label?: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

type Props = {
  selectedCard: CardModel | null;
  workspaceWidth: number;
  workspaceHeight: number;
  onPatch: (patch: Partial<CardModel>) => void;

  lockSize: boolean;
  lockPosition: boolean;
  onLockSize: (next: boolean) => void;
  onLockPosition: (next: boolean) => void;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function toInt(value: string) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : 0;
}

export function DevCardTools(props: Props) {
  const {
    selectedCard,
    workspaceWidth,
    workspaceHeight,
    onPatch,
    lockSize,
    lockPosition,
    onLockSize,
    onLockPosition
  } = props;

  if (!selectedCard) return null;

  const maxX = Math.max(0, workspaceWidth - selectedCard.w);
  const maxY = Math.max(0, workspaceHeight - selectedCard.h);
  const maxW = Math.max(120, workspaceWidth - selectedCard.x);
  const maxH = Math.max(80, workspaceHeight - selectedCard.y);

  function onRange(key: "x" | "y" | "w" | "h") {
    return (e: ChangeEvent<HTMLInputElement>) => {
      const n = toInt(e.target.value);

      if (key === "x") return onPatch({ x: clamp(n, 0, maxX) });
      if (key === "y") return onPatch({ y: clamp(n, 0, maxY) });
      if (key === "w") return onPatch({ w: clamp(n, 120, maxW) });
      if (key === "h") return onPatch({ h: clamp(n, 80, maxH) });
    };
  }

  return (
    <section
      className="sidebarHint glassPanelSubtle"
      style={{ margin: "12px 14px 14px 14px" }}
      aria-label="Dev tools (temporary)"
    >
      <strong>DEV TOOLS (temporary)</strong>
      <span style={{ display: "block", marginTop: 8, opacity: 0.9 }}>
        Selected: {selectedCard.label} ({selectedCard.id})
      </span>

      <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, opacity: 0.9 }}>X ({selectedCard.x})</span>
          <input type="range" min={0} max={maxX} value={selectedCard.x} onChange={onRange("x")} />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, opacity: 0.9 }}>Y ({selectedCard.y})</span>
          <input type="range" min={0} max={maxY} value={selectedCard.y} onChange={onRange("y")} />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, opacity: 0.9 }}>W ({selectedCard.w})</span>
          <input type="range" min={120} max={maxW} value={selectedCard.w} onChange={onRange("w")} />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, opacity: 0.9 }}>H ({selectedCard.h})</span>
          <input type="range" min={80} max={maxH} value={selectedCard.h} onChange={onRange("h")} />
        </label>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 4 }}>
          <button className={`pillButton ${lockSize ? "isActive" : ""}`} onClick={() => onLockSize(!lockSize)}>
            Lock Size
          </button>
          <button
            className={`pillButton ${lockPosition ? "isActive" : ""}`}
            onClick={() => onLockPosition(!lockPosition)}
          >
            Lock Position
          </button>
        </div>
      </div>
    </section>
  );
}
