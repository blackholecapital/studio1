export function DesktopDeployControls(props: {
  onDeploy: () => void;
  deploying: boolean;
}) {
  const { onDeploy, deploying } = props;
  return (
    <div className="topStripRight">
      <button className="topStripPublishBtn" onClick={onDeploy} disabled={deploying}>
        {deploying ? "PUBLISHING..." : "PUBLISH PAGES"}
      </button>
    </div>
  );
}
