import { useMemo, useState } from "react";
import type { CardKind, PageSpec, TabKey } from "../../core/types";
import { setCardLine, setCardKind, allContentCardIds, setPageStyle } from "../../core/store";

function labelsFor(kind: CardKind) {
  if (kind === "video") return { l1: "Video URL", l2: "Description" };
  if (kind === "social") return { l1: "Post Link", l2: "Description" };
  if (kind === "image") return { l1: "Image Code", l2: "Notes" };
  return { l1: "Line 1", l2: "Line 2" };
}

const TEXT_LAYOUTS: { id: string; label: string; lines: string[]; blurb: string }[] = [
  { id: "L1", label: "Layout 1", blurb: "Centered title + short subtitle + 3 bullets.", lines: ["CENTER TITLE", "Short subtitle", "• Bullet one", "• Bullet two", "• Bullet three", "", "", "", "", ""] },
  { id: "L2", label: "Layout 2", blurb: "Left title + tagline + CTA line.", lines: ["Left Title", "Tagline goes here", "Key point A", "Key point B", "Key point C", "CTA: Book a demo", "", "", "", ""] },
  { id: "L3", label: "Layout 3", blurb: "Problem / Solution / Proof.", lines: ["Problem", "What hurts today", "Solution", "What we do", "Proof", "Metric / testimonial", "", "", "", ""] },
  { id: "L4", label: "Layout 4", blurb: "3-step checklist.", lines: ["3-Step Setup", "Do this in minutes", "1) Connect", "2) Customize", "3) Launch", "", "", "", "", ""] },
  { id: "L5", label: "Layout 5", blurb: "Feature list + quick spec.", lines: ["FEATURES", "What you get", "• Fast setup", "• Clean UI", "• Shareable links", "Spec: 1-click deploy", "", "", "", ""] },
  { id: "L6", label: "Layout 6", blurb: "Pricing teaser.", lines: ["PLANS", "Choose your tier", "Starter — $", "Pro — $$", "VIP — $$$", "Add-ons available", "", "", "", ""] },
  { id: "L7", label: "Layout 7", blurb: "Use cases.", lines: ["USE CASES", "Where this shines", "• Sales demos", "• Onboarding", "• Campaign landing", "", "", "", "", ""] },
  { id: "L8", label: "Layout 8", blurb: "Quote + attribution.", lines: ["“This is the fastest demo we’ve shipped.”", "— Customer Name", "Result: +32% conversions", "", "", "", "", "", "", ""] },
  { id: "L9", label: "Layout 9", blurb: "Mini FAQ.", lines: ["FAQ", "Q: How long?", "A: Minutes", "Q: Need code?", "A: No", "Q: Shareable?", "A: Yes", "", "", ""] },
  { id: "L10", label: "Layout 10", blurb: "Comparison table (text).", lines: ["WHY US", "Us vs. old way", "Old: slow / messy", "Us: fast / clean", "Old: manual edits", "Us: templates", "", "", "", ""] },
  { id: "L11", label: "Layout 11", blurb: "Agenda.", lines: ["AGENDA", "What you’ll see", "1) Overview", "2) Features", "3) Next steps", "", "", "", "", ""] },
  { id: "L12", label: "Layout 12", blurb: "Checklist + status.", lines: ["READY TO LAUNCH", "Checklist", "✅ Content", "✅ Branding", "⬜ Publish", "Tip: hit Deploy", "", "", "", ""] },
  { id: "L13", label: "Layout 13", blurb: "Stat-driven header.", lines: ["+10x", "Faster demo creation", "• Less friction", "• More consistency", "• Better share rate", "", "", "", "", ""] },
  { id: "L14", label: "Layout 14", blurb: "Story arc.", lines: ["THE STORY", "Before", "Chaos + manual work", "After", "Clean + instant demos", "", "", "", "", ""] },
  { id: "L15", label: "Layout 15", blurb: "CTA panel.", lines: ["NEXT STEP", "Pick one:", "• Schedule call", "• Start trial", "• Request VIP", "Email: hello@", "", "", "", ""] },
  { id: "L16", label: "Layout 16", blurb: "Benefits bullets.", lines: ["BENEFITS", "Why teams use this", "• Looks premium", "• Ships fast", "• Easy to iterate", "", "", "", "", ""] },
  { id: "L17", label: "Layout 17", blurb: "Timeline.", lines: ["TIMELINE", "Day 1: setup", "Day 2: brand", "Day 3: deploy", "Then: iterate", "", "", "", "", ""] },
  { id: "L18", label: "Layout 18", blurb: "Social proof list.", lines: ["TRUSTED BY", "• Team A", "• Team B", "• Team C", "Ask for references", "", "", "", "", ""] },
  { id: "L19", label: "Layout 19", blurb: "Key metrics.", lines: ["METRICS", "• Conversion: +%", "• Time saved: hrs", "• Shares: +%", "Customize per demo", "", "", "", "", ""] },
  { id: "L20", label: "Layout 20", blurb: "Minimal header only.", lines: ["SIMPLE HEADER", "One clean message.", "", "", "", "", "", "", "", ""] }
];

export function AccordionCardEditor({
  page,
  onChange,
  onActiveCardChange,
  onPageSelect
}: {
  page: PageSpec;
  onChange: (next: PageSpec) => void;
  onActiveCardChange?: (cardId: string | null) => void;
  onPageSelect?: (tab: TabKey) => void;
}) {
  const cards = useMemo(() => allContentCardIds(), []);
  const [isOpen, setIsOpen] = useState(false);
  const [activeId, setActiveId] = useState<string>(cards[0]);
  const [layoutId, setLayoutId] = useState<string>("");

  const kind: CardKind = (page.cardKinds?.[activeId] as CardKind) ?? "text";
  const lines = page.content[activeId] ?? Array.from({ length: 10 }, () => "");
  const { l1, l2 } = labelsFor(kind);

  function setOpen(next: boolean) {
    setIsOpen(next);
    onActiveCardChange?.(next ? activeId : null);
  }

  function onPickCard(nextId: string) {
    setActiveId(nextId);
    onActiveCardChange?.(isOpen ? nextId : null);
  }

  function applyTextLayout(nextLayoutId: string) {
    setLayoutId(nextLayoutId);
    const found = TEXT_LAYOUTS.find((l) => l.id === nextLayoutId);
    if (!found) return;
    let next = page;
    for (let i = 0; i < 10; i++) {
      next = setCardLine(next, activeId, i, found.lines[i] ?? "");
    }
    onChange(next);
  }

  function getLineAlign(cardId: string, lineIndex: number): "left" | "center" | "right" {
    const anyStyle: any = page.style ?? {};
    const map = anyStyle.lineAlign ?? {};
    const cardMap = map[cardId] ?? {};
    return (cardMap[lineIndex] as any) ?? "left";
  }

  function setLineAlign(cardId: string, lineIndex: number, align: "left" | "center" | "right") {
    const anyStyle: any = page.style ?? {};
    const map = { ...(anyStyle.lineAlign ?? {}) };
    map[cardId] = { ...(map[cardId] ?? {}), [lineIndex]: align };
    onChange(setPageStyle(page, { lineAlign: map } as any));
  }



  const miniTabs: { key: Exclude<TabKey, "prototype">; label: string }[] = [
    { key: "gate", label: "Gate" },
    { key: "vip", label: "VIP" },
    { key: "perks", label: "Perks" },
    { key: "account", label: "Account" },
    { key: "socials", label: "Socials" },
    { key: "scraper", label: "Scraper" }
  ];

  return (
    <div className="accordionStack">
      <div className={isOpen ? "accordionItem open" : "accordionItem"}>
        {/* Closed: show ONLY Card 1 (gate card). Open: tabs + selector */}
        {!isOpen ? (
          <button type="button" className="accordionHeader" onClick={() => setOpen(true)}>
            <span className="accordionTitle">Card 1</span>
            <span className="accordionSub">Expand</span>
          </button>
        ) : (
          <div className="accordionTop">
            <div className="accordionMiniTabsRow">
              <div className="accordionMiniTabs">
                {miniTabs.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    className={t.key === page.page ? "miniTab active" : "miniTab"}
                    onClick={() => onPageSelect?.(t.key)}
                  >
                    {t.label}
                  </button>
                ))}
                <button type="button" className="accordionCollapseBtn" onClick={() => setOpen(false)}>
                  Collapse
                </button>
              </div>
            </div>
          </div>
        )}

        {isOpen ? (
          <div className="accordionBody">
            <div className="kindRow">
              <div className="selectStack">
                <select
                  className="cardSelect cardSelectInline"
                  value={activeId}
                  onChange={(e) => onPickCard(e.target.value)}
                  aria-label="Select card"
                >
                  {cards.map((id, idx) => (
                    <option key={id} value={id}>
                      {`Card ${idx + 1}`}
                    </option>
                  ))}
                </select>

                <select
                  className="layoutSelect"
                  value={layoutId}
                  onChange={(e) => applyTextLayout(e.target.value)}
                  aria-label="Select text layout"
                >
                  <option value="">Layout…</option>
                  {TEXT_LAYOUTS.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="kindBtns">
                {(["text", "video", "social", "image"] as CardKind[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    className={k === kind ? "kindBtn active" : "kindBtn"}
                    onClick={() => onChange(setCardKind(page, activeId, k))}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>

            <div className="fieldGrid">
              {Array.from({ length: 10 }).map((_, lineIndex) => {
                const label = lineIndex === 0 ? l1 : lineIndex === 1 ? l2 : `Line ${lineIndex + 1}`;
                return (
                  <div key={lineIndex} className="fieldRow">
                    <div className="fieldLabel">
                      <span>{label}</span>
                      <span className="alignBtns">
                        {(["left", "center", "right"] as const).map((a) => (
                          <button
                            key={a}
                            type="button"
                            className={getLineAlign(activeId, lineIndex) === a ? "alignBtn active" : "alignBtn"}
                            onClick={() => setLineAlign(activeId, lineIndex, a)}
                            aria-label={`Align ${label} ${a}`}
                            title={`Align ${a}`}
                          >
                            {a === "left" ? "⟸" : a === "center" ? "≡" : "⟹"}
                          </button>
                        ))}
                      </span>
                    </div>
                    <input
                      className="fieldInput"
                      value={lines[lineIndex] ?? ""}
                      onChange={(e) => onChange(setCardLine(page, activeId, lineIndex, e.target.value))}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}