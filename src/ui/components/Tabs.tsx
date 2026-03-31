import type { TabKey } from "../../core/types";
export type TabItem = { key: TabKey; label: string };

export function Tabs({
  items,
  active,
  onChange
}: {
  items: TabItem[];
  active: TabKey;
  onChange: (k: TabKey) => void;
}) {
  return (
    <div className="tabsRow" role="tablist">
      {items.map((t) => (
        <button
          key={t.key}
          type="button"
          role="tab"
          aria-selected={active === t.key}
          className={active === t.key ? "tabBtn active" : "tabBtn"}
          onClick={() => onChange(t.key)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
