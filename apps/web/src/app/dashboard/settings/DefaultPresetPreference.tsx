"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import {
  getStoredDefaultPreset,
  setStoredDefaultPreset,
  type StoredPreset,
} from "@analytics/ui";

const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** The server has no localStorage, so it always falls back to the tenant default. */
const getServerSnapshot = () => null;

const PRESETS: { id: StoredPreset; label: string }[] = [
  { id: "7d", label: "7 days" },
  { id: "28d", label: "28 days" },
  { id: "90d", label: "90 days" },
];

type DefaultPresetPreferenceProps = {
  tenantDefault: StoredPreset;
};

export function DefaultPresetPreference({
  tenantDefault,
}: DefaultPresetPreferenceProps) {
  const [saved, setSaved] = useState(false);

  const stored = useSyncExternalStore(
    subscribe,
    getStoredDefaultPreset,
    getServerSnapshot,
  );
  const value = stored ?? tenantDefault;

  const onChange = useCallback((preset: StoredPreset) => {
    setStoredDefaultPreset(preset);
    for (const listener of listeners) listener();
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  }, []);

  return (
    <div className="space-y-3">
      <div className="segmented" role="group" aria-label="Default date range">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className="segmented-item"
            data-active={value === preset.id}
            aria-pressed={value === preset.id}
            onClick={() => onChange(preset.id)}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted">
        Used when no date range is present in the URL. Stored on this device.
      </p>
      {saved ? (
        <p className="text-xs font-medium text-accent">Preference saved.</p>
      ) : null}
    </div>
  );
}
