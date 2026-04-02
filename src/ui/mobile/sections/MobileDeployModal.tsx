import { useState } from "react";

type DeployModalData = {
  primaryUrl: string;
  holidayUrl: string;
  ok: boolean;
  error?: string;
};

export function MobileDeployModal(props: {
  modal: DeployModalData;
  onClose: () => void;
}) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const { primaryUrl: gatewayUrl, holidayUrl } = props.modal;

  function copyUrl(key: string, url: string) {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    });
  }

  return (
    <div className="deployModalOverlay" onClick={props.onClose}>
      <div className="deployModalCard" onClick={(e) => e.stopPropagation()}>
        <button className="deployModalClose" onClick={props.onClose}>×</button>
        <div className="deployModalTitle">Welcome to Gateway</div>
        {props.modal.ok ? (
          <div className="deployModalSubtitle">Your page has been deployed. Share these links:</div>
        ) : (
          <div className="deployModalSubtitle" style={{ color: "#ff6b6b" }}>
            Deploy failed — links are not live yet.<br />
            <span style={{ fontSize: "0.82em", opacity: 0.85 }}>{props.modal.error ?? "Unknown error"}</span>
          </div>
        )}
        <div className="deployModalUrls">
          <div className="deployModalUrlRow">
            <span className="deployModalUrlLabel">Gateway URL</span>
            <div className="deployModalUrlBox">
              <a className="deployModalUrlLink" href={gatewayUrl} target="_blank" rel="noopener noreferrer">{gatewayUrl}</a>
              <button className="deployModalCopyBtn" onClick={() => copyUrl("gateway", gatewayUrl)} title="Copy link">
                {copiedKey === "gateway" ? "✓" : (
                  <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
                    <rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
                    <path d="M3 11H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v1" stroke="currentColor" strokeWidth="1.4"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
          <div className="deployModalUrlRow">
            <span className="deployModalUrlLabel">Holiday Page</span>
            <div className="deployModalUrlBox">
              <a className="deployModalUrlLink" href={holidayUrl} target="_blank" rel="noopener noreferrer">{holidayUrl}</a>
              <button className="deployModalCopyBtn" onClick={() => copyUrl("holiday", holidayUrl)} title="Copy link">
                {copiedKey === "holiday" ? "✓" : (
                  <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
                    <rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
                    <path d="M3 11H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v1" stroke="currentColor" strokeWidth="1.4"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
        <div className="deployModalExpire">Demo links expire in 24 hours</div>
      </div>
    </div>
  );
}
