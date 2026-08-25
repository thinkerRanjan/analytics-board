"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ThemeToggle } from "./ThemeToggle";

type ProfileMenuUser = {
  email?: string | null;
  name?: string | null;
  image?: string | null;
};

type ProfileMenuProps = {
  user: ProfileMenuUser;
  signOutAction: () => Promise<void>;
};

function getInitials(user: ProfileMenuUser): string {
  if (user.name) {
    const parts = user.name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
    }
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  if (user.email) {
    return user.email.slice(0, 2).toUpperCase();
  }
  return "U";
}

export function ProfileMenu({ user, signOutAction }: ProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    setImageFailed(false);
  }, [user.image]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open, close]);

  return (
    <div ref={menuRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-[color:var(--border-strong)] bg-[color:var(--surface-muted)] text-foreground transition hover:border-[color:var(--accent)]"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Open profile menu"
      >
        {user.image && !imageFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.image}
            alt=""
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-xs font-semibold">{getInitials(user)}</span>
        )}
      </button>

      {open ? (
        <div
          role="menu"
          className="surface-pop absolute right-0 z-50 mt-2 w-64 overflow-hidden"
        >
          <div className="border-b border-[color:var(--border)] px-4 py-3">
            {user.name ? (
              <p className="truncate text-sm font-medium text-foreground">
                {user.name}
              </p>
            ) : null}
            {user.email ? (
              <p className="truncate text-xs text-muted">{user.email}</p>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-2 border-b border-[color:var(--border)] px-4 py-3">
            <span className="text-xs font-medium text-muted">Theme</span>
            <ThemeToggle />
          </div>

          <div className="py-1">
            <Link
              href="/dashboard/settings"
              role="menuitem"
              onClick={close}
              className="block px-4 py-2 text-sm text-foreground hover:bg-[color:var(--surface-muted)]"
            >
              Profile settings
            </Link>
            <form action={signOutAction} className="border-t border-[color:var(--border)]">
              <button
                type="submit"
                role="menuitem"
                className="w-full px-4 py-2 text-left text-sm text-accent hover:bg-[color:var(--accent-soft)]"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
