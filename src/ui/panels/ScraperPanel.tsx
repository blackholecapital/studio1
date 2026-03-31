import { useMemo, useState } from "react";
import { scrapeHtml, tryFetchHtml } from "../../core/scrape";

export function ScraperPanel() {
  const [url, setUrl] = useState("https://example.com");
  const [html, setHtml] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const canParse = useMemo(() => html.trim().length > 0, [html]);

  async function onScrape() {
    setStatus("Scraping…");
    setResult(null);
    try {
      const fetched = await tryFetchHtml(url);
      setHtml(fetched);
      setResult(scrapeHtml(fetched, url));
      setStatus("Done.");
    } catch {
      setStatus("Scrape failed (likely CORS). Paste HTML below or wire a Worker later.");
    }
  }

  function onParse() {
    setStatus("Parsing…");
    setResult(scrapeHtml(html, url));
    setStatus("Parsed.");
  }

  return (
    <div className="panel">
      <div className="panelHeader">
        <div className="panelTitle">Scraper</div>
        <div className="panelSub">Basic starter. Most sites block browser scraping (CORS).</div>
      </div>

      <div className="formRow">
        <label className="field">
          <span className="fieldLabel">Scrape URL</span>
          <input className="fieldInput" value={url} onChange={(e) => setUrl(e.target.value)} />
        </label>

        <div className="btnRow">
          <button type="button" className="btn" onClick={onScrape}>
            Scrape
          </button>
          <button type="button" className="btnSecondary" onClick={onParse} disabled={!canParse}>
            Parse HTML
          </button>
        </div>
      </div>

      {status ? (
        <div className="muted" style={{ marginTop: 8, padding: "0 14px" }}>
          {status}
        </div>
      ) : null}

      <div className="split2" style={{ marginTop: 14, padding: "0 14px 14px 14px" }}>
        <div>
          <div className="muted">HTML (paste if needed)</div>
          <textarea className="textarea" value={html} onChange={(e) => setHtml(e.target.value)} placeholder="Paste HTML here..." />
        </div>

        <div>
          <div className="muted">Results</div>
          <pre className="codebox">{result ? JSON.stringify(result, null, 2) : "{ }"}</pre>
        </div>
      </div>
    </div>
  );
}
