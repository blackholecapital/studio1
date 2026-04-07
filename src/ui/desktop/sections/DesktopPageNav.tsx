export function DesktopPageNav(props: {
  canGoPrevPage: boolean;
  canGoNextPage: boolean;
  goPrevPage: () => void;
  goNextPage: () => void;
  pageTitle: string;
  addCard: () => void;
  deleteSelectedCard: () => void;
  isPageLocked: boolean;
  hasSelectedCard: boolean;
  applyCubeLayout: (count: 1 | 2 | 3 | 4 | 5 | 6) => void;
  tooltipOpen: string | null;
  setTooltipOpen: (value: string | null) => void;
}) {
  const { canGoPrevPage, canGoNextPage, goPrevPage, goNextPage, pageTitle, addCard, deleteSelectedCard, isPageLocked, hasSelectedCard, applyCubeLayout, tooltipOpen, setTooltipOpen } = props;
  return (
    <div className="topStripCenter">
      <button className="pageNavArrowBtn" onClick={goPrevPage} disabled={!canGoPrevPage} title="Previous page">
        <svg viewBox="0 0 10 16" width="11" height="17" fill="none">
          <path d="M8 2L2 8l6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <button className="pageNavArrowBtn" onClick={goNextPage} disabled={!canGoNextPage} title="Next page">
        <svg viewBox="0 0 10 16" width="11" height="17" fill="none">
          <path d="M2 2l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <span
        className="topStripTitle"
        onClick={() => setTooltipOpen(tooltipOpen === "all" ? null : "all")}
      >{pageTitle}</span>
      <button className="pageNavCardBtn pageNavCardBtnAdd" onClick={addCard} disabled={isPageLocked} title="Add card">
        <svg viewBox="0 0 14 14" width="14" height="14" fill="none">
          <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>
      <button className="pageNavCardBtn pageNavCardBtnDelete" onClick={deleteSelectedCard} disabled={!hasSelectedCard || isPageLocked} title="Delete selected card">
        <svg viewBox="0 0 14 14" width="14" height="14" fill="none">
          <path d="M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>
      <div className="cubeButtonsHeader cubeButtonsRight">
        <button className="cubeButton cubeButtonHeader cubeButtonFour" onClick={() => applyCubeLayout(4)} aria-label="4 tiles"><span className="cubeDot" /><span className="cubeDot" /><span className="cubeDot" /><span className="cubeDot" /></button>
        <button className="cubeButton cubeButtonHeader cubeButtonFive" onClick={() => applyCubeLayout(5)} aria-label="5 tiles"><span className="cubeDot" /><span className="cubeDot" /><span className="cubeDot" /><span className="cubeDot" /><span className="cubeDot" /></button>
        <button className="cubeButton cubeButtonHeader cubeButtonSix" onClick={() => applyCubeLayout(6)} aria-label="6 tiles"><span className="cubeDot" /><span className="cubeDot" /><span className="cubeDot" /><span className="cubeDot" /><span className="cubeDot" /><span className="cubeDot" /></button>
      </div>
    </div>
  );
}
