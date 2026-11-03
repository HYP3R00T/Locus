"use client";

import { useTheme } from "next-themes";
import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from "react";
import {
  type Appearance,
  BUILTIN_THEMES,
  type Configuration,
  configuration,
  DEFAULT_APPEARANCE,
  workbenchPreferences,
} from "@/lib/configuration";
import { resolveThemeColors } from "@/lib/themes";
import {
  COMMANDS,
  DEFAULT_PREFERENCES,
  LEGACY_PREFERENCES_KEY,
  PREFERENCES_KEY,
  type Preferences,
  parsePreferences,
} from "@/lib/workbench";

type ConfigurationContextValue = {
  preferences: Preferences;
  appearance: Appearance;
  themes: Configuration["themes"];
  warnings: string[];
  directory: string | null;
  native: boolean;
  ready: boolean;
  writable: boolean;
  error: string | null;
  updatePreferences: (value: Preferences) => Promise<void>;
  updateAppearance: (
    value: Partial<
      Pick<Appearance, "primaryColumn" | "primaryRow" | "notificationDuration" | "shortcutSort">
    >,
  ) => Promise<boolean>;
  selectTheme: (id: string) => Promise<boolean>;
  previewTheme: (id: string | null) => void;
  reload: () => Promise<void>;
  openDirectory: () => Promise<void>;
};
const Context = createContext<ConfigurationContextValue | null>(null);
export function useConfiguration() {
  const context = useContext(Context);
  if (!context) throw new Error("ConfigurationProvider is missing.");
  return context;
}
function browserConfiguration(): Configuration {
  const mac = /Mac|iPhone|iPad/.test(navigator.platform);
  const raw = localStorage.getItem(PREFERENCES_KEY) ?? localStorage.getItem(LEGACY_PREFERENCES_KEY);
  const preferences = raw ? parsePreferences(raw, mac) : DEFAULT_PREFERENCES;
  const oldTheme = localStorage.getItem("locus-theme");
  return {
    directory: null,
    preferences: {
      ...DEFAULT_APPEARANCE,
      theme:
        oldTheme === "dark" ? "default-dark" : oldTheme === "light" ? "default-light" : "system",
      whiteboardControlsVisible: preferences.whiteboardControlsVisible,
    },
    keybindings: { version: 1, bindings: preferences.keybindings },
    themes: BUILTIN_THEMES,
    warnings: [],
  };
}
export function ConfigurationProvider({ children }: { children: ReactNode }) {
  const { systemTheme, setTheme } = useTheme();
  const [snapshot, setSnapshot] = useState<Configuration | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const live = useRef<Configuration | null>(null);
  const saving = useRef(false);
  const applied = useRef<string[]>([]);
  const native = useRef(false);
  function accept(value: Configuration) {
    workbenchPreferences(value, /Mac|iPhone|iPad/.test(navigator.platform));
    live.current = value;
    setSnapshot(value);
    setError(null);
  }
  async function reload() {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    try {
      native.current = configuration.native();
      let legacy: Configuration | null = null;
      let migrationError: string | null = null;
      try {
        legacy = browserConfiguration();
      } catch (reason) {
        migrationError = String(reason);
      }
      if (native.current)
        accept(
          await configuration.load(
            legacy ? { preferences: legacy.preferences, keybindings: legacy.keybindings } : null,
            migrationError,
          ),
        );
      else if (legacy) accept(legacy);
      else throw new Error(migrationError ?? "Could not load browser preferences.");
    } catch (reason) {
      live.current = null;
      setSnapshot(null);
      setError(String(reason));
    } finally {
      setReady(true);
      saving.current = false;
      setBusy(false);
    }
  }
  const reloadRef = useRef(reload);
  reloadRef.current = reload;
  useEffect(() => {
    void reloadRef.current();
  }, []);
  useEffect(() => {
    if (!ready || !native.current) return;
    let disposed = false;
    let reading = false;
    async function refreshThemes() {
      if (disposed || reading || saving.current || document.hidden || !live.current) return;
      reading = true;
      try {
        const palette = await configuration.themes();
        const current = live.current;
        if (disposed || saving.current || !current) return;
        if (
          JSON.stringify([current.themes, current.warnings]) !==
          JSON.stringify([palette.themes, palette.warnings])
        ) {
          const updated = { ...current, ...palette };
          live.current = updated;
          setSnapshot(updated);
        }
      } catch {
        // Keep the last valid palette if the folder is temporarily unavailable.
      } finally {
        reading = false;
      }
    }
    const timer = window.setInterval(() => void refreshThemes(), 2000);
    window.addEventListener("focus", refreshThemes);
    document.addEventListener("visibilitychange", refreshThemes);
    return () => {
      disposed = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshThemes);
      document.removeEventListener("visibilitychange", refreshThemes);
    };
  }, [ready]);
  const appearance = snapshot?.preferences ?? DEFAULT_APPEARANCE;
  const themes = snapshot
    ? [
        ...snapshot.themes,
        ...BUILTIN_THEMES.filter(
          (theme) =>
            theme.id.startsWith("default-") &&
            !snapshot.themes.some((saved) => saved.id === theme.id),
        ),
      ]
    : BUILTIN_THEMES;
  const displayedTheme = preview ?? appearance.theme;
  const preferred =
    displayedTheme === "system"
      ? systemTheme === "dark"
        ? appearance.darkTheme
        : appearance.lightTheme
      : displayedTheme;
  const fallbackMode = systemTheme === "dark" ? "dark" : "light";
  const selected = themes.find(
    (theme) =>
      theme.id === preferred && (displayedTheme !== "system" || theme.mode === fallbackMode),
  );
  const resolved = selected ?? {
    id: `default-${fallbackMode}`,
    name: fallbackMode === "dark" ? "Default Dark" : "Default Light",
    mode: fallbackMode,
    colors: {},
  };
  useEffect(() => {
    if (!ready || !snapshot) return;
    setTheme(resolved.mode);
    const root = document.documentElement;
    for (const key of applied.current) root.style.removeProperty(`--${key}`);
    const variables = resolveThemeColors(resolved);
    for (const [key, value] of Object.entries(variables)) root.style.setProperty(`--${key}`, value);
    root.dataset.locusTheme = resolved.id;
    applied.current = Object.keys(variables);
  }, [ready, snapshot, resolved, setTheme]);

  async function change(
    file: "preferences" | "keybindings",
    value: Appearance | Configuration["keybindings"],
  ) {
    if (saving.current || !live.current) return false;
    saving.current = true;
    setBusy(true);
    const current = live.current;
    try {
      const updated = { ...current, [file]: value };
      workbenchPreferences(updated, /Mac|iPhone|iPad/.test(navigator.platform));
      if (native.current) await configuration.save(file, current[file], value);
      else {
        // Layout preview retains its previous browser preference storage; no native files are simulated.
        localStorage.setItem(
          PREFERENCES_KEY,
          JSON.stringify(workbenchPreferences(updated, /Mac|iPhone|iPad/.test(navigator.platform))),
        );
      }
      accept(updated);
      return true;
    } catch (reason) {
      setError(`Configuration was not saved: ${String(reason)}`);
      return false;
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  async function updatePreferences(value: Preferences) {
    const current = live.current;
    if (!current) return;
    const previous = workbenchPreferences(current, /Mac|iPhone|iPad/.test(navigator.platform));
    if (COMMANDS.some(({ id }) => value.keybindings[id] !== previous.keybindings[id])) {
      if (!(await change("keybindings", { version: 1, bindings: value.keybindings }))) return;
    }
    if (value.whiteboardControlsVisible !== previous.whiteboardControlsVisible)
      await change("preferences", {
        ...(live.current?.preferences ?? current.preferences),
        whiteboardControlsVisible: value.whiteboardControlsVisible,
      });
  }
  async function selectTheme(id: string) {
    const current = live.current;
    if (!current) return false;
    const theme = themes.find((theme) => theme.id === id);
    if (id !== "system" && !theme) return false;
    return change("preferences", {
      ...current.preferences,
      theme: id,
      ...(theme?.mode === "dark" ? { darkTheme: id } : theme ? { lightTheme: id } : {}),
    });
  }
  async function openDirectory() {
    try {
      await configuration.openDirectory();
    } catch (reason) {
      setError(String(reason));
    }
  }
  const warnings = [...(snapshot?.warnings ?? [])];
  if (snapshot && !selected)
    warnings.push(`Theme ${preferred} is unavailable; using ${resolved.name}.`);
  return (
    <Context.Provider
      value={{
        preferences: snapshot
          ? workbenchPreferences(
              snapshot,
              /Mac|iPhone|iPad/.test(typeof navigator === "undefined" ? "" : navigator.platform),
            )
          : DEFAULT_PREFERENCES,
        appearance,
        themes,
        warnings,
        directory: snapshot?.directory ?? null,
        native: native.current,
        ready,
        writable: ready && !!snapshot && !busy,
        error,
        updatePreferences,
        updateAppearance: (value) =>
          live.current
            ? change("preferences", { ...live.current.preferences, ...value })
            : Promise.resolve(false),
        selectTheme,
        previewTheme: setPreview,
        reload,
        openDirectory,
      }}
    >
      {children}
    </Context.Provider>
  );
}
