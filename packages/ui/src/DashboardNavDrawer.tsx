"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import type { DashboardNavItem } from "@analytics/shared";

type DashboardNavDrawerProps = {
  pages: DashboardNavItem[];
};

function itemHref(page: DashboardNavItem, searchParams: { toString(): string }): string {
  const base = page.href ?? `/dashboard/${page.id}`;
  const query = searchParams.toString();
  return query ? `${base}?${query}` : base;
}

function normalizePath(path: string): string {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

function isActivePath(pathname: string, page: DashboardNavItem): boolean {
  const href = normalizePath(page.href ?? `/dashboard/${page.id}`);
  const path = normalizePath(pathname);
  if (path === href) return true;
  if (page.children && page.children.length > 0) {
    return path.startsWith(`${href}/`);
  }
  return false;
}

function kindLabel(kind: DashboardNavItem["kind"]): string | null {
  if (kind === "narrative") return "Notes";
  if (kind === "aiCommentary") return "AI";
  if (kind === "aiInsights") return "AI";
  if (kind === "productIndex") return "Models";
  if (kind === "model" || kind === "department") return null;
  return "Charts";
}

function DrawerLink({
  page,
  searchParams,
  pathname,
  onClose,
  nested = false,
}: {
  page: DashboardNavItem;
  searchParams: { toString(): string };
  pathname: string;
  onClose: () => void;
  nested?: boolean;
}) {
  const active = isActivePath(pathname, page);
  const label = kindLabel(page.kind);

  return (
    <Link
      href={itemHref(page, searchParams)}
      onClick={onClose}
      data-active={active}
      className={nested ? "drawer-sublink" : "drawer-link"}
      aria-current={active ? "page" : undefined}
    >
      <span className="flex items-center justify-between gap-2">
        <span className={nested ? "text-[0.8125rem] font-medium" : "text-sm font-medium"}>
          {page.title}
        </span>
        {label ? (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">
            {label}
          </span>
        ) : null}
      </span>
      {!nested && page.description ? (
        <span className="mt-1 block text-xs text-muted">{page.description}</span>
      ) : null}
    </Link>
  );
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
        return (
          <li key={page.id}>
            <DrawerLink
              page={page}
              searchParams={searchParams}
              pathname={pathname}
              onClose={onClose}
            />
            {page.children && page.children.length > 0 ? (
              <ul className="drawer-sublist">
                {page.children.map((child) => (
                  <li key={child.id}>
                    <DrawerLink
                      page={child}
                      searchParams={searchParams}
                      pathname={pathname}
                      onClose={onClose}
                      nested
                    />
                  </li>
                ))}
              </ul>
            ) : null}
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
