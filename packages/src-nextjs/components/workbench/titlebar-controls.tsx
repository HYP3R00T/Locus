"use client";

import { Columns2Icon, MenuIcon, Rows2Icon, SearchIcon, SlidersHorizontalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionTooltip } from "@/components/workbench/action-tooltip";
import { useWorkbench } from "@/components/workbench/workbench-context";
import { cn } from "@/lib/utils";
import { bindingFor } from "@/lib/workbench";

export function CommandCenter() {
  const { perform, preferences, mac } = useWorkbench();
  return (
    <ActionTooltip label="Show all commands" command="palette">
      <button
        type="button"
        onClick={() => perform("palette")}
        aria-label="Open command palette"
        className="flex h-6 w-full max-w-xs min-w-24 items-center gap-2 rounded-sm border bg-background/50 px-2 text-xs text-muted-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
      >
        <SearchIcon className="size-3 shrink-0" />
        <span className="truncate">Commands</span>
        <kbd className="ml-auto hidden text-[10px] sm:inline">
          {bindingFor("palette", preferences).replace("Mod", mac ? "⌘" : "Ctrl")}
        </kbd>
      </button>
    </ActionTooltip>
  );
}
export function TitlebarLayoutControls() {
  const { info, perform, enabled, pressed } = useWorkbench();
  return (
    <div data-tauri-drag-region className="flex shrink-0 items-center gap-1 px-1">
      <ActionTooltip label="Open navigation" command="navigation.materials">
        <Button
          variant="ghost"
          size="icon-sm"
          className="md:hidden"
          aria-label="Open navigation"
          onClick={() => perform("navigation.materials")}
        >
          <MenuIcon />
        </Button>
      </ActionTooltip>
      <div data-tauri-drag-region className="flex w-7 shrink-0 items-center justify-center">
        {info.scope === "drawing" && (
          <ActionTooltip label="Toggle canvas controls" command="drawing.controls">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Toggle canvas controls"
              aria-pressed={pressed("drawing.controls")}
              disabled={!enabled("drawing.controls")}
              onClick={() => perform("drawing.controls")}
            >
              <SlidersHorizontalIcon />
            </Button>
          </ActionTooltip>
        )}
      </div>
      <fieldset
        data-tauri-drag-region
        aria-label="Pane layout"
        className="mr-1 flex h-7 w-14 gap-0.5 rounded-sm border border-border p-0.5"
      >
        {info.columns.map((column) => (
          <div key={column.id} className="flex min-w-0 flex-1 flex-col gap-0.5">
            {column.panes.map((pane) => (
              <ActionTooltip
                key={pane.id}
                label={pane.kind ? `${pane.title} — drag to rearrange` : pane.title}
              >
                <button
                  type="button"
                  aria-label={`Focus pane: ${pane.title}`}
                  aria-pressed={info.activeId === pane.id}
                  draggable={!!pane.kind}
                  onDragStart={(event) => {
                    event.dataTransfer.setData("application/x-locus-pane", pane.id);
                    event.dataTransfer.effectAllowed = "copyMove";
                  }}
                  onClick={() => info.focus?.(pane.id)}
                  className={cn(
                    "min-h-0 min-w-0 flex-1 rounded-[1px] bg-muted-foreground/30 hover:bg-muted-foreground/60 focus-visible:outline-2 focus-visible:outline-ring",
                    info.activeId === pane.id && "bg-primary hover:bg-primary/80",
                  )}
                />
              </ActionTooltip>
            ))}
          </div>
        ))}
      </fieldset>
      <ActionTooltip label="Split Vertically" command="layout.vertical">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Split Vertically"
          disabled={!enabled("layout.vertical")}
          onClick={() => perform("layout.vertical")}
        >
          <Columns2Icon />
        </Button>
      </ActionTooltip>
      <ActionTooltip label="Split Horizontally" command="layout.horizontal">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Split Horizontally"
          disabled={!enabled("layout.horizontal")}
          onClick={() => perform("layout.horizontal")}
        >
          <Rows2Icon />
        </Button>
      </ActionTooltip>
    </div>
  );
}
