import type { CSSProperties, ReactNode } from "react";

export function DesktopAppShell(props: {
  shellLayoutStyle: CSSProperties;
  tooltipOpen: string | null;
  setTooltipOpen: (value: string | null) => void;
  deployStatus: string | null;
  topBar: ReactNode;
  leftRail: ReactNode;
  workspace: ReactNode;
  rightRail: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="studioApp" style={props.shellLayoutStyle} onClick={() => props.tooltipOpen && props.setTooltipOpen(null)}>
      {props.topBar}
      {props.deployStatus && (
        <div className={`deployStatusBanner ${props.deployStatus?.includes("⚠") ? "isWarning" : ""}`}>{props.deployStatus}</div>
      )}
      {props.leftRail}
      {props.workspace}
      {props.rightRail}
      {props.children}
    </div>
  );
}
