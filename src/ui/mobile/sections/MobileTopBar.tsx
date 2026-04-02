import type { PageKey } from "../../../domain/project/types";
import { PAGE_TITLES } from "../lib/mobileConstants";

export function MobileTopBar(props: {
  page: PageKey;
  createPanelActive: boolean;
  contentPanelActive: boolean;
  canGoPrevPage: boolean;
  canGoNextPage: boolean;
  isExclusivePage: boolean;
  lockPage: boolean;
  hasSelectedCard: boolean;
  exclusiveTilesCount: number;
  onCreateClick: () => void;
  onContentClick: () => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onAddTile: () => void;
  onRemoveTile: () => void;
}) {
  return (
    <nav className="mobileNav">
      <button
        className={`mobBtn mobNavCreate ${props.createPanelActive ? "isActive" : ""}`}
        onClick={props.onCreateClick}
      >
        Create
      </button>

      <div className="mobCenterPill">
        <div className="mobCenterPillArrows">
          <button className="mobArrowBtn" onClick={props.onPrevPage} disabled={!props.canGoPrevPage} aria-label="Previous page">
            <svg viewBox="0 0 10 16" width="9" height="15" fill="none">
              <path d="M8 2L2 8l6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button className="mobArrowBtn" onClick={props.onNextPage} disabled={!props.canGoNextPage} aria-label="Next page">
            <svg viewBox="0 0 10 16" width="9" height="15" fill="none">
              <path d="M2 2l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        <span className="mobCenterPillPage">{PAGE_TITLES[props.page]}</span>
        <button
          className="mobPlusBtn"
          onClick={props.onAddTile}
          disabled={!props.isExclusivePage && props.lockPage}
          aria-label="Add tile"
        >+</button>
        <button
          className="mobMinusBtn"
          onClick={props.onRemoveTile}
          disabled={props.isExclusivePage ? props.exclusiveTilesCount === 0 : (!props.hasSelectedCard || props.lockPage)}
          aria-label="Remove tile"
        >−</button>
      </div>

      <button className={`mobBtn mobContentBtn ${props.contentPanelActive ? "isActive" : ""}`} onClick={props.onContentClick}>
        Content
      </button>
    </nav>
  );
}
