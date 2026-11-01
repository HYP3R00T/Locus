"use client";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  FolderIcon,
  MenuIcon,
  PaletteIcon,
  Settings2Icon,
} from "lucide-react";
import { useState } from "react";
import { NavigationAction } from "@/components/layout/navigation-action";
import { NavigationLayout } from "@/components/layout/navigation-layout";
import { AppearanceSettings } from "@/components/settings/appearance-settings";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { StudyTree, type StudyItem } from "@/components/workspace/study-tree";
import { WorkspaceContent } from "@/components/workspace/workspace-content";
import { cn } from "@/lib/utils";

type View = "workspace" | "settings";

export function AppShell() {
  const [view, setView] = useState<View>("workspace");
  const [navigationExpanded, setNavigationExpanded] = useState(false);
  const [contextExpanded, setContextExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StudyItem | null>(null);

  function selectItem(item: StudyItem) {
    setSelectedItem(item);
    setView("workspace");
    setMobileOpen(false);
  }

  function showWorkspace() {
    setView("workspace");
    setMobileOpen(false);
  }

  function showSettings() {
    setView("settings");
    setMobileOpen(false);
  }

  const navigationLabel = navigationExpanded ? "Collapse navigation" : "Expand navigation";
  const contextLabel = contextExpanded
    ? "Collapse workspace navigation"
    : "Expand workspace navigation";

  return (
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
      <NavigationLayout
        primaryExpanded={navigationExpanded}
        contextExpanded={contextExpanded}
        primaryNavigation={
          <aside
            aria-label="Primary navigation"
            className="flex h-full w-full min-w-0 flex-col overflow-hidden bg-client-surface py-2 gap-3"
          >
            <div className="flex h-9 shrink-0 items-center">
              <div className="flex w-[55px] shrink-0 justify-center">
                <NavigationAction
                  compact
                  aria-label={navigationLabel}
                  title={navigationLabel}
                  aria-expanded={navigationExpanded}
                  aria-controls="primary-navigation"
                  onClick={() => setNavigationExpanded(!navigationExpanded)}
                >
                  {navigationExpanded ? <ChevronLeftIcon /> : <ChevronRightIcon />}
                </NavigationAction>
              </div>
              {navigationExpanded && <span className="truncate text-sm font-medium">Locus</span>}
            </div>
            <nav
              id="primary-navigation"
              aria-label="Application"
              className="flex min-h-0 flex-1 flex-col px-2"
            >
              <NavigationAction
                compact={!navigationExpanded}
                aria-label="Physics"
                title="Physics"
                aria-pressed={view === "workspace"}
                className={view === "workspace" ? "bg-sidebar-accent" : undefined}
                onClick={showWorkspace}
              >
                <span aria-hidden="true" className="w-4 shrink-0 text-center text-xs font-medium">
                  P
                </span>
                {navigationExpanded && <span className="truncate">Physics</span>}
              </NavigationAction>
              <NavigationAction
                compact={!navigationExpanded}
                aria-label="Settings"
                title="Settings"
                aria-pressed={view === "settings"}
                className={cn("mt-auto", view === "settings" && "bg-sidebar-accent")}
                onClick={showSettings}
              >
                <Settings2Icon />
                {navigationExpanded && <span>Settings</span>}
              </NavigationAction>
            </nav>
          </aside>
        }
        contextNavigation={
          <aside
            id="context-navigation"
            aria-label="Workspace navigation"
            className="flex h-full w-full min-w-0 flex-col overflow-hidden bg-context-surface py-2 gap-3"
          >
            <div className="flex h-9 shrink-0 items-center">
              <div className="flex w-[55px] shrink-0 justify-center">
                <NavigationAction
                  compact
                  aria-label={contextLabel}
                  title={contextLabel}
                  aria-expanded={contextExpanded}
                  aria-controls="context-navigation"
                  onClick={() => setContextExpanded(!contextExpanded)}
                >
                  {contextExpanded ? <ChevronLeftIcon /> : <ChevronRightIcon />}
                </NavigationAction>
              </div>
              {contextExpanded && view === "settings" && (
                <h2 className="truncate text-xs font-medium">Settings</h2>
              )}
            </div>
            <div
              className={cn(
                "min-h-0 flex-1 overflow-x-hidden overflow-y-auto",
                !contextExpanded && "hidden",
              )}
            >
              <div hidden={view !== "workspace"}>
                <StudyTree selectedId={selectedItem?.id} onSelect={selectItem} />
              </div>
              <nav hidden={view !== "settings"} aria-label="Settings categories" className="px-2">
                <NavigationAction aria-current="true" className="bg-sidebar-accent">
                  <PaletteIcon />
                  <span>Appearance</span>
                </NavigationAction>
              </nav>
            </div>
            {!contextExpanded && (
              <nav aria-label="Compact workspace navigation" className="px-2">
                <NavigationAction
                  compact
                  aria-label={view === "settings" ? "Show appearance settings" : "Show materials"}
                  title={view === "settings" ? "Appearance" : "Materials"}
                  onClick={() => setContextExpanded(true)}
                >
                  {view === "settings" ? <PaletteIcon /> : <FolderIcon />}
                </NavigationAction>
              </nav>
            )}
          </aside>
        }
      >
        <div className="flex h-full min-w-0 flex-1 flex-col">
          <header className="flex h-9 shrink-0 items-center gap-3 border-b border-border/50 px-3 sm:px-4">
            <SheetTrigger
              render={<Button variant="ghost" size="icon" className="md:hidden" />}
              aria-label="Open navigation"
            >
              <MenuIcon />
            </SheetTrigger>
            <nav
              aria-label="Breadcrumb"
              className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground"
            >
              <span className="shrink-0">{view === "settings" ? "Settings" : "Physics"}</span>
              {(view === "settings" || selectedItem) && (
                <>
                  <ChevronRightIcon className="size-3 shrink-0" aria-hidden="true" />
                  <span className="truncate text-foreground">
                    {view === "settings" ? "Appearance" : selectedItem?.label}
                  </span>
                </>
              )}
            </nav>
            <div className="ml-auto shrink-0">
              <ThemeToggle />
            </div>
          </header>
          <main className="min-h-0 min-w-0 flex-1 overflow-auto">
            {view === "settings" ? (
              <AppearanceSettings />
            ) : (
              <WorkspaceContent item={selectedItem} />
            )}
          </main>
        </div>
      </NavigationLayout>

      <SheetContent side="left" className="gap-0 bg-sidebar data-[side=left]:w-[min(20rem,90vw)]">
        <SheetHeader>
          <SheetTitle>Locus</SheetTitle>
          <SheetDescription>Subjects, materials, and settings</SheetDescription>
        </SheetHeader>
        <div className="px-2 pb-2">
          <NavigationAction onClick={showWorkspace} aria-pressed={view === "workspace"}>
            <span aria-hidden="true" className="w-4 shrink-0 text-center text-xs font-medium">
              P
            </span>
            <span className="truncate">Physics</span>
          </NavigationAction>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <StudyTree selectedId={selectedItem?.id} onSelect={selectItem} />
        </div>
        <div className="p-2">
          <NavigationAction onClick={showSettings} aria-pressed={view === "settings"}>
            <Settings2Icon />
            <span>Settings</span>
          </NavigationAction>
        </div>
      </SheetContent>
    </Sheet>
  );
}
