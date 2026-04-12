/**
 * PackageInfoModal — popup showing what's included in each page package.
 * Mounted at the app root (sibling of AuthModal / deployModal) so the
 * left rail's overflow: hidden cannot clip it.
 */

import { useEffect } from "react";

export type PackageKey = "biz" | "ad" | "web3";

type PackageDef = {
  key: PackageKey;
  title: string;
  bullets: string[];
  footer?: string;
};

const PACKAGES: Record<PackageKey, PackageDef> = {
  biz: {
    key: "biz",
    title: "Biz Pages",
    bullets: [
      "5 pages",
      "3 customisable customer service",
      "Exclusive content with 6 sales tiles",
      "Pay Me Pro",
      "Engage",
      "Referral link generator",
      "AI assistant ready",
    ],
    footer: "Bonus: BOGO — 2nd setup free!",
  },
  ad: {
    key: "ad",
    title: "AD Pages",
    bullets: [
      "2 customisable pages",
      "PayMe LTE",
    ],
  },
  web3: {
    key: "web3",
    title: "Gateway Web-3",
    bullets: [
      "Everything in Biz Pages, plus:",
      "Web 3 wallet connect",
      "3 secure gated access areas",
      "Support ticket system",
      "AI assistant ready",
    ],
    footer: "Bonus: BOGO — 2nd setup free!",
  },
};

export function PackageInfoModal(props: {
  open: PackageKey | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!props.open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") props.onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [props.open, props.onClose]);

  if (!props.open) return null;
  const pkg = PACKAGES[props.open];

  return (
    <div className="packageInfoOverlay" onClick={props.onClose}>
      <div className="packageInfoCard" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={pkg.title}>
        <button className="packageInfoClose" onClick={props.onClose} aria-label="Close">×</button>
        <div className="packageInfoTitle">{pkg.title}</div>
        <div className="packageInfoSubtitle">What's included</div>
        <ul className="packageInfoList">
          {pkg.bullets.map((line, idx) => (
            <li key={idx} className="packageInfoBullet">{line}</li>
          ))}
        </ul>
        {pkg.footer && <div className="packageInfoFooter">{pkg.footer}</div>}
      </div>
    </div>
  );
}
