export function DesktopDeployControls(props: {
  onDeploy: () => void;
  deploying: boolean;
}) {
  const { onDeploy, deploying } = props;
  return (
    <div className="topStripRight">
      <button className="topStripPublishBtn" onClick={onDeploy} disabled={deploying}>
        {deploying ? "Publishing..." : "Publish Pages"}
      </button>
    </div>
  );
}
