"use client";

import { useState } from "react";
import { Button } from "./ui/Button";

type PrintReportButtonProps = {
  title: string;
};

export function PrintReportButton({ title }: PrintReportButtonProps) {
  const [pending, setPending] = useState(false);

  return (
    <Button
      variant="primary"
      disabled={pending}
      onClick={() => {
        if (pending) return;
        setPending(true);
        const previous = document.title;
        document.title = uniquePrintName(title);
        let cleaned = false;

        const finish = () => {
          if (cleaned) return;
          cleaned = true;
          window.removeEventListener("afterprint", finish);
          media.removeEventListener("change", onMedia);
          // Let Chromium finish writing the PDF before we reuse the title.
          window.setTimeout(() => {
            document.title = previous;
            setPending(false);
          }, 1200);
        };

        const media = window.matchMedia("print");
        const onMedia = (event: MediaQueryListEvent) => {
          if (!event.matches) finish();
        };

        window.addEventListener("afterprint", finish);
        media.addEventListener("change", onMedia);
        window.setTimeout(() => {
          window.print();
        }, 500);
      }}
    >
      {pending ? "Preparing PDF…" : "Download PDF"}
    </Button>
  );
}

function uniquePrintName(title: string): string {
  const stamp = new Date()
    .toISOString()
    .slice(0, 19)
    .replace(/T/g, "-")
    .replace(/:/g, "");
  const safe = title
    .replace(/[<>:"/\\|?*]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return `${safe} ${stamp}`;
}
