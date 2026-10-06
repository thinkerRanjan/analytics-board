"use client";

import { useEffect } from "react";

/** Keep the export sheet on white paper so dark-theme chrome cannot print as a frame. */
export function ExportPrintCanvas() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const previousTheme = html.dataset.theme;

    const apply = () => {
      html.classList.add("export-print");
      if (html.dataset.theme !== "light") html.dataset.theme = "light";
      html.style.setProperty("background", "#ffffff", "important");
      html.style.setProperty("background-image", "none", "important");
      body.style.setProperty("background", "#ffffff", "important");
      body.style.setProperty("background-image", "none", "important");
    };

    apply();
    const observer = new MutationObserver(apply);
    observer.observe(html, { attributes: true, attributeFilter: ["data-theme"] });

    return () => {
      observer.disconnect();
      html.classList.remove("export-print");
      if (previousTheme) html.dataset.theme = previousTheme;
      html.style.removeProperty("background");
      html.style.removeProperty("background-image");
      body.style.removeProperty("background");
      body.style.removeProperty("background-image");
    };
  }, []);

  return null;
}
