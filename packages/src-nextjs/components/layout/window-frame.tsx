"use client";

import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { MinusIcon, SquareIcon, XIcon } from "lucide-react";
import { type ReactNode, useEffect, useState, useSyncExternalStore } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { ActionTooltip } from "@/components/workbench/action-tooltip";
import { CommandCenter, TitlebarLayoutControls } from "@/components/workbench/titlebar-controls";
import { flushDrawings } from "@/lib/drawings";

const subscribe = () => () => {};
const browserSnapshot = () => false;

export function WindowFrame({ children }: { children: ReactNode }) {
  const native = useSyncExternalStore(subscribe, isTauri, browserSnapshot);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!native) return;
    let saving = false;
    const listener = getCurrentWindow()
      .onCloseRequested(async (event) => {
        if (saving) {
          event.preventDefault();
          return;
        }
        saving = true;
        try {
          await flushDrawings();
        } catch {
          event.preventDefault();
          setError(
            "Could not save your whiteboard. The window was kept open; try closing again to retry.",
          );
        } finally {
          saving = false;
        }
      })
      .catch(() => {
        setError("Could not register the whiteboard save-on-close handler.");
        return () => {};
      });
    return () => {
      void listener.then((unlisten) => unlisten());
    };
  }, [native]);

  async function control(action: "minimize" | "toggleMaximize" | "close") {
    try {
      await getCurrentWindow()[action]();
      setError(null);
    } catch {
      setError("The window action failed. Please try again.");
    }
  }

  return (
    <div className="flex h-svh min-h-0 flex-col overflow-hidden bg-background">
      <header
        data-tauri-drag-region={native || undefined}
        className="flex h-8 shrink-0 items-center select-none bg-context-surface text-xs"
      >
        <div
          data-tauri-drag-region={native || undefined}
          className="flex h-full min-w-0 flex-1 items-center px-3"
        >
          <span data-tauri-drag-region={native || undefined} className="font-medium">
            Locus
          </span>
        </div>
        <div
          data-tauri-drag-region={native || undefined}
          className="flex h-full min-w-0 flex-1 items-center justify-center"
        >
          <CommandCenter />
        </div>
        <div
          data-tauri-drag-region={native || undefined}
          className="flex h-full flex-1 justify-end"
        >
          <TitlebarLayoutControls />
          <ThemeToggle />
          {native && (
            <>
              <ActionTooltip label="Minimize window">
                <button
                  type="button"
                  aria-label="Minimize window"
                  className="flex w-11 items-center justify-center hover:bg-sidebar-accent focus-visible:outline-2 focus-visible:outline-ring"
                  onClick={() => void control("minimize")}
                >
                  <MinusIcon className="size-3.5" />
                </button>
              </ActionTooltip>
              <ActionTooltip label="Maximize or restore window">
                <button
                  type="button"
                  aria-label="Maximize or restore window"
                  className="flex w-11 items-center justify-center hover:bg-sidebar-accent focus-visible:outline-2 focus-visible:outline-ring"
                  onClick={() => void control("toggleMaximize")}
                >
                  <SquareIcon className="size-3" />
                </button>
              </ActionTooltip>
              <ActionTooltip label="Close window">
                <button
                  type="button"
                  aria-label="Close window"
                  className="flex w-11 items-center justify-center hover:bg-destructive hover:text-white focus-visible:outline-2 focus-visible:outline-ring"
                  onClick={() => void control("close")}
                >
                  <XIcon className="size-4" />
                </button>
              </ActionTooltip>
            </>
          )}
        </div>
      </header>
      {error && (
        <p role="alert" className="shrink-0 px-3 py-1 text-xs text-destructive">
          {error}
        </p>
      )}
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
