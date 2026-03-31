import type { PageSpec } from "../../core/types";
import { setLayout } from "../../core/store";
import type { LayoutId } from "../../core/layoutPresets";

const layouts: LayoutId[] = ["L6", "L1", "L2", "L3", "L4", "L5", "L7", "L8"];

export function LayoutButtons({ page, onChange }: { page: PageSpec; onChange: (next: PageSpec) => void }) {
  return (
    <div className="layoutBtnsTop">
      {layouts.map((id, idx) => (
        <button
          key={id}
          type="button"
          className={page.layoutId === id ? "layoutBtn active" : "layoutBtn"}
          onClick={() => onChange(setLayout(page, id))}
          title={`Layout ${idx + 1}`}
        >
          {idx + 1}
        </button>
      ))}
    </div>
  );
}
