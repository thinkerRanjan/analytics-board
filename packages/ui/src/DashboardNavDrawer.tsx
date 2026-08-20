"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import type { DashboardNavItem } from "@analytics/shared";

type DashboardNavDrawerProps = {
  pages: DashboardNavItem[];
};

function buildHref(pageId: string, searchParams: URLSearchParams): string {
  const query = searchParams.toString();
  return query ? `/dashboard/${pageId}?${query}` : `/dashboard/${pageId}`;
}

function DrawerLinks({
  pages,
  onClose,
}: {
  pages: DashboardNavItem[];
  onClose: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activePageId = pathname.split("/").filter(Boolean).pop() ?? "";

  if (pages.length === 0) {
    return (
      <p className="px-3 py-6 text-sm text-muted">
        No analytics pages are configured for this client.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-1">
      {pages.map((page) => {
        const active = page.id === activePageId;
        return (
          <li key={page.id}>
            <Link
              href={buildHref(page.id, searchParams)}
              onClick={onClose}
              data-active={active}
              className="drawer-link"
              aria-current={active ? "page" : undefined}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{page.title}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                  {page.kind === "narrative" ? "Notes" : "Charts"}
                </span>
              </span>
              {page.description ? (
                <span className="mt-1 block text-xs text-muted">
                  {page.description}
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function DashboardNavDrawer({ pages }: DashboardNavDrawerProps) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const pegRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setVisible(false);
    window.setTimeout(() => {
      setOpen(false);
      pegRef.current?.focus();
    }, 200);
  }, []);

  const openDrawer = useCallback(() => {
    setOpen(true);
    requestAnimationFrame(() => setVisible(true));
  }, []);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, close]);

  return (
    <>
      {!open ? (
        <button
          ref={pegRef}
          type="button"
          onClick={openDrawer}
          className="drawer-peg"
          aria-expanded={open}
          aria-controls="dashboard-nav-drawer"
          aria-label="Open analytics pages"
        >
          <span className="drawer-peg-label">Pages</span>
        </button>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            className={`absolute inset-0 shell-drawer-overlay transition-opacity duration-200 ${
              visible ? "opacity-100" : "opacity-0"
            }`}
            aria-label="Close navigation"
            onClick={close}
          />
          <div
            ref={panelRef}
            id="dashboard-nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Dashboard pages"
            tabIndex={-1}
            className={`shell-drawer-panel relative flex h-full w-full max-w-xs flex-col transition-transform duration-200 ease-out ${
              visible ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="flex items-center justify-between gap-3 border-b border-[color:var(--border)] px-4 py-4">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Analytics pages
                </p>
                <p className="text-xs text-muted">Jump between report contexts</p>
              </div>
              <button
                type="button"
                onClick={close}
                className="rounded-md p-1.5 text-muted transition-colors hover:bg-[color:var(--surface-muted)] hover:text-foreground"
                aria-label="Close"
              >
                <svg
                  aria-hidden
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <nav
              className="min-h-0 flex-1 overflow-y-auto p-3"
              aria-label="Dashboard pages"
            >
              <Suspense
                fallback={
                  <div className="space-y-2 px-1 py-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="skeleton h-14 animate-pulse" />
                    ))}
                  </div>
                }
              >
                <DrawerLinks pages={pages} onClose={close} />
              </Suspense>
            </nav>

            <div className="border-t border-[color:var(--border)] px-4 py-3">
              <Link
                href="/dashboard/settings"
                onClick={close}
                className="text-xs font-medium text-muted transition-colors hover:text-accent"
              >
                Profile settings
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
