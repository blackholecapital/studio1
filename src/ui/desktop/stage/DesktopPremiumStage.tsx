import { useEffect, useRef, useCallback } from "react";
import { STAGE_W, STAGE_H } from "../../../domain/editor/constants";

export function DesktopPremiumStage({
  children,
  onScaleChange,
}: {
  children: React.ReactNode;
  onScaleChange?: (scale: number) => void;
}) {
  const shellRef = useRef<HTMLDivElement>(null);

  const update = useCallback(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Fit both dimensions so no content is clipped
    const scale = Math.min(vw / STAGE_W, vh / STAGE_H);
    const left = 0;
    const top = Math.max(0, (vh - STAGE_H * scale) / 2);
    // Extra stage-unit distance needed to push right rail / top bar to viewport edge
    const rightGapStage = Math.max(0, (vw - STAGE_W * scale) / scale);
    const el = shellRef.current;
    if (!el) return;
    el.style.transform = `scale(${scale})`;
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    el.style.setProperty("--right-gap-stage", `${rightGapStage}px`);
    onScaleChange?.(scale);
  }, [onScaleChange]);

  useEffect(() => {
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [update]);

  return (
    <div className="stageViewport">
      <div className="stageShell" ref={shellRef}>
        {children}
      </div>
    </div>
  );
}
