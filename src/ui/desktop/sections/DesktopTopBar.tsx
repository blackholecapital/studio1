import { DesktopPageNav } from "./DesktopPageNav";
import { DesktopDeployControls } from "./DesktopDeployControls";

export function DesktopTopBar(props: {
  applyCubeLayout: (count: 1 | 2 | 3 | 4) => void;
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
}) {
  return (
    <header className="topStrip glassPanel">
      <div className="topStripLeft">
        <span className="brandMark">PAGE STUDIO</span>
        <div className="cubeButtonsHeader">
          <button className="cubeButton cubeButtonHeader cubeButtonOne" onClick={() => props.applyCubeLayout(1)} aria-label="Add 1 cube"><span className="cubeDot" /></button>
          <button className="cubeButton cubeButtonHeader cubeButtonTwo" onClick={() => props.applyCubeLayout(2)} aria-label="Add 2 cubes"><span className="cubeDot" /><span className="cubeDot" /></button>
          <button className="cubeButton cubeButtonHeader cubeButtonThree" onClick={() => props.applyCubeLayout(3)} aria-label="Add 3 cubes"><span className="cubeDot" /><span className="cubeDot" /><span className="cubeDot" /></button>
          <button className="cubeButton cubeButtonHeader cubeButtonFour" onClick={() => props.applyCubeLayout(4)} aria-label="Add 4 cubes"><span className="cubeDot" /><span className="cubeDot" /><span className="cubeDot" /><span className="cubeDot" /></button>
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
      />
      <DesktopDeployControls
        onDeploy={props.onDeploy}
        deploying={props.deploying}
      />
    </header>
  );
}
