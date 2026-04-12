import { DesktopPageNav } from "./DesktopPageNav";
import { DesktopDeployControls } from "./DesktopDeployControls";

export function DesktopTopBar(props: {
  applyCubeLayout: (count: 1 | 2 | 3 | 4 | 5 | 6) => void;
  canGoPrevPage: boolean;
  canGoNextPage: boolean;
  goPrevPage: () => void;
  goNextPage: () => void;
  pageTitle: string;
  addCard: () => void;
  deleteSelectedCard: () => void;
  isPageLocked: boolean;
  hasSelectedCard: boolean;
  onDeploy: () => void;
  deploying: boolean;
  tooltipOpen: string | null;
  setTooltipOpen: (value: string | null) => void;
}) {
  return (
    <header className="topStrip glassPanel">
      <div className="topStripLeft">
        <span
          className="brandMark"
          onClick={() => props.setTooltipOpen(props.tooltipOpen === "all" ? null : "all")}
        >BIZ STUDIO</span>
        <div className="cubeButtonsHeader">
          <button className="cubeButton cubeButtonHeader cubeButtonOne" onClick={() => props.applyCubeLayout(1)} aria-label="1 tile"><span className="cubeDot" /></button>
          <button className="cubeButton cubeButtonHeader cubeButtonTwo" onClick={() => props.applyCubeLayout(2)} aria-label="2 tiles"><span className="cubeDot" /><span className="cubeDot" /></button>
          <button className="cubeButton cubeButtonHeader cubeButtonThree" onClick={() => props.applyCubeLayout(3)} aria-label="3 tiles"><span className="cubeDot" /><span className="cubeDot" /><span className="cubeDot" /></button>
          <button className="cubeButton cubeButtonHeader cubeButtonFour" onClick={() => props.applyCubeLayout(4)} aria-label="4 tiles"><span className="cubeDot" /><span className="cubeDot" /><span className="cubeDot" /><span className="cubeDot" /></button>
        </div>
      </div>
      <DesktopPageNav
        canGoPrevPage={props.canGoPrevPage}
        canGoNextPage={props.canGoNextPage}
        goPrevPage={props.goPrevPage}
        goNextPage={props.goNextPage}
        pageTitle={props.pageTitle}
        addCard={props.addCard}
        deleteSelectedCard={props.deleteSelectedCard}
        isPageLocked={props.isPageLocked}
        hasSelectedCard={props.hasSelectedCard}
        tooltipOpen={props.tooltipOpen}
        setTooltipOpen={props.setTooltipOpen}
      />
      <DesktopDeployControls
        onDeploy={props.onDeploy}
        deploying={props.deploying}
      />
    </header>
  );
}
