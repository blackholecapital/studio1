import { useEffect, useState, useCallback } from "react";
import { STAGE_W, STAGE_H } from "../../../domain/editor/constants";

export function DesktopPremiumStage({
  children,
  onScaleChange,
}: {
  children: React.ReactNode;
  onScaleChange?: (scale: number) => void;
}) {
  const [stageStyle, setStageStyle] = useState({
    transform: "scale(1)",
    left: 0 as number,
    top: 0 as number,
  });

  const update = useCallback(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scale = Math.min(vw / STAGE_W, vh / STAGE_H);
    const left = (vw - STAGE_W * scale) / 2;
    const top = (vh - STAGE_H * scale) / 2;
    setStageStyle({ transform: `scale(${scale})`, left, top });
    onScaleChange?.(scale);
  }, [onScaleChange]);

  useEffect(() => {
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [update]);

  return (
    <div className="stageViewport">
      <div className="stageShell" style={stageStyle}>
        {children}
      </div>
    </div>
  );
}
