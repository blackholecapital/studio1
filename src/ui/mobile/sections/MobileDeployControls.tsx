export function MobileDeployControls(props: {
  justSaved: boolean;
  deploying: boolean;
  onSave: () => void;
  onDeploy: () => void;
}) {
  return (
    <div className="mobFloatingActions">
      <button className={`mobFloatBtn mobFloatSave ${props.justSaved ? "isSaved" : ""}`} onClick={props.onSave}>
        Save
      </button>
      <button className="mobFloatBtn mobFloatDeploy deployGlow" onClick={props.onDeploy} disabled={props.deploying}>
        {props.deploying ? "..." : "Publish Pages"}
      </button>
    </div>
  );
}
