export function DesktopDeployControls(props: {
  slug: string;
  onSlugChange: (slug: string) => void;
  isSaved: boolean;
  onSave: () => void;
  tooltipOpen: string | null;
  setTooltipOpen: (value: string | null) => void;
  onDeploy: () => void;
  deploying: boolean;
}) {
  const { slug, onSlugChange, isSaved, onSave, tooltipOpen, setTooltipOpen, onDeploy, deploying } = props;
  return (
    <div className="topStripRight">
      <span className="topStripIdLabel">ID</span>
      <input className="topStripIdInput" value={slug} onChange={(e) => onSlugChange(e.target.value || "user")} />
      <button className={`topStripSaveBtn ${isSaved ? "isSavedState" : ""}`} onClick={onSave}>SAVE</button>
      <div className="topStripHelpWrap">
        <button
          className="topStripHelpBtn"
          onClick={(e) => { e.stopPropagation(); setTooltipOpen(tooltipOpen === "all" ? null : "all"); }}
          title="Help"
        >?</button>
        {tooltipOpen === "all" && (
          <div className="tooltipCard tooltipCardDeploy">
            <div className="tooltipLine">Position your tiles</div>
            <div className="tooltipLine">Add your content</div>
            <div className="tooltipLine">Save</div>
            <div className="tooltipLine">Publish Pages</div>
            <div className="tooltipLine">Links pop up for your live 24-hour demo</div>
          </div>
        )}
      </div>
      <button className="topStripPublishBtn" onClick={onDeploy} disabled={deploying}>
        {deploying ? "Publishing..." : "Publish Pages"}
      </button>
    </div>
  );
}
