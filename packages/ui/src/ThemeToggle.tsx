"use client";

import { useTheme } from "./ThemeProvider";
import type { ThemePreference } from "./theme";

const OPTIONS: { id: ThemePreference; label: string; icon: React.ReactNode }[] = [
  {
    id: "system",
    label: "System",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 5.5h16v9H4zM9 19h6M12 14.5V19"
      />
    ),
  },
  {
    id: "light",
    label: "Light",
    icon: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path
          strokeLinecap="round"
          d="M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6l1.4 1.4m10 10l1.4 1.4m0-12.8l-1.4 1.4m-10 10l-1.4 1.4"
        />
      </>
    ),
  },
  {
    id: "dark",
    label: "Dark",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20 13.5A8 8 0 1110.5 4a6.5 6.5 0 009.5 9.5z"
      />
    ),
  },
];

export function ThemeToggle({
  showLabels = false,
}: {
  showLabels?: boolean;
}) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className="segmented"
      role="group"
      aria-label="Colour theme"
    >
      {OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => setTheme(option.id)}
          data-active={theme === option.id}
          aria-pressed={theme === option.id}
          title={option.label}
          className="segmented-item inline-flex items-center gap-1.5"
        >
          <svg
            aria-hidden
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.7}
          >
            {option.icon}
          </svg>
          {showLabels ? option.label : <span className="sr-only">{option.label}</span>}
        </button>
      ))}
    </div>
  );
}
