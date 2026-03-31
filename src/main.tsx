import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { App } from "./ui/App";
import { MobileApp } from "./ui/MobileApp";
import "./ui/styles.css";

function Root() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return isMobile ? <MobileApp /> : <App />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
