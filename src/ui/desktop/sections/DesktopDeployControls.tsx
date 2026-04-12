export function DesktopDeployControls(props: {
  onDeploy: () => void;
  deploying: boolean;
  tileShapeMode: "sharp" | "rounded" | "circle";
  setTileShapeMode: (mode: "sharp" | "rounded" | "circle") => void;
}) {
  const { onDeploy, deploying, tileShapeMode, setTileShapeMode } = props;
  return (
    <div className="topStripRight">
      <div className="topStripShapes" role="group" aria-label="Workspace tile shape">
        <button
          type="button"
          className={`topStripShape topStripShapeSquareSharp ${tileShapeMode === "sharp" ? "isActive" : ""}`}
          onClick={() => setTileShapeMode("sharp")}
          aria-label="Sharp corners"
          aria-pressed={tileShapeMode === "sharp"}
          title="Sharp corners"
        />
        <button
          type="button"
          className={`topStripShape topStripShapeSquareRounded ${tileShapeMode === "rounded" ? "isActive" : ""}`}
          onClick={() => setTileShapeMode("rounded")}
          aria-label="Rounded corners"
          aria-pressed={tileShapeMode === "rounded"}
          title="Rounded corners"
        />
        <button
          type="button"
          className={`topStripShape topStripShapeCircle ${tileShapeMode === "circle" ? "isActive" : ""}`}
          onClick={() => setTileShapeMode("circle")}
          aria-label="Circle"
          aria-pressed={tileShapeMode === "circle"}
          title="Circle"
        />
      </div>
      <button className="topStripPublishBtn" onClick={onDeploy} disabled={deploying}>
        {deploying ? "PUBLISHING..." : "PUBLISH PAGES"}
      </button>
    </div>
  );
}
