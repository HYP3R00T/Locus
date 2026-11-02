"use client";

import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { MinusIcon, SquareIcon, XIcon } from "lucide-react";
import { type ReactNode, useState, useSyncExternalStore } from "react";

import { ThemeToggle } from "@/components/theme-toggle";

const subscribe = () => () => {};
const browserSnapshot = () => false;

export function WindowFrame({ children }: { children: ReactNode }) {
  const native = useSyncExternalStore(subscribe, isTauri, browserSnapshot);
  const [error, setError] = useState<string | null>(null);

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
      {native && (
        <header className="flex h-8 shrink-0 select-none border-b bg-context-surface text-xs">
          <div data-tauri-drag-region className="flex min-w-0 flex-1 items-center px-3">
            <span data-tauri-drag-region className="font-medium">
              Locus
            </span>
          </div>
          <div className="flex shrink-0">
            <ThemeToggle />
            <button
              type="button"
              aria-label="Minimize window"
              title="Minimize"
              className="flex w-11 items-center justify-center hover:bg-sidebar-accent focus-visible:outline-2 focus-visible:outline-ring"
              onClick={() => void control("minimize")}
            >
              <MinusIcon className="size-3.5" />
            </button>
            <button
              type="button"
              aria-label="Maximize or restore window"
              title="Maximize or restore"
              className="flex w-11 items-center justify-center hover:bg-sidebar-accent focus-visible:outline-2 focus-visible:outline-ring"
              onClick={() => void control("toggleMaximize")}
            >
              <SquareIcon className="size-3" />
            </button>
            <button
              type="button"
              aria-label="Close window"
              title="Close"
              className="flex w-11 items-center justify-center hover:bg-destructive hover:text-white focus-visible:outline-2 focus-visible:outline-ring"
              onClick={() => void control("close")}
            >
              <XIcon className="size-4" />
            </button>
          </div>
        </header>
      )}
      {error && (
        <p role="alert" className="shrink-0 px-3 py-1 text-xs text-destructive">
          {error}
        </p>
      )}
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
