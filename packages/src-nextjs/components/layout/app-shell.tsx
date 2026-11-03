"use client";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  FolderIcon,
  PaletteIcon,
  PlusIcon,
  Settings2Icon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NavigationAction } from "@/components/layout/navigation-action";
import { NavigationLayout } from "@/components/layout/navigation-layout";
import {
  type PreferenceSection,
  PreferencesSettings,
} from "@/components/settings/preferences-settings";
import { SettingsNavigation } from "@/components/settings/settings-navigation";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  useCommandHandlers,
  useMaterialOptions,
  useWorkbench,
} from "@/components/workbench/workbench-context";
import { StudyArea } from "@/components/workspace/study-area";
import { type Removal, StudyTree } from "@/components/workspace/study-tree";
import { useLibrary } from "@/components/workspace/use-library";
import { useNotice } from "@/lib/notifications";
import { cn } from "@/lib/utils";

export function AppShell() {
  const data = useLibrary();
  const [view, setView] = useState<"workspace" | "settings">("workspace");
  const [preferenceSection, setPreferenceSection] = useState<PreferenceSection>("appearance");
  const [settingsQuery, setSettingsQuery] = useState("");
  const [navigationExpanded, setNavigationExpanded] = useState(false);
  const [contextExpanded, setContextExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [create, setCreate] = useState<"workspace" | "folder" | null>(null);
  const [title, setTitle] = useState("");
  const [rename, setRename] = useState<Removal | null>(null);
  const [removal, setRemoval] = useState<Removal | null>(null);
  const workbench = useWorkbench();
  const liveData = useRef(data);
  liveData.current = data;
  const panes = data.layout.columns.flatMap((column) => column.panes);
  function focusPane(id: string) {
    setView("workspace");
    data.activatePane(id);
    requestAnimationFrame(() => {
      const pane = document.querySelector<HTMLElement>(`[data-pane-id="${CSS.escape(id)}"]`);
      (pane?.querySelector<HTMLElement>('[role="document"], .excalidraw') ?? pane)?.focus();
    });
  }
  function focusCurrentPane() {
    requestAnimationFrame(() => {
      const pane = document.querySelector<HTMLElement>(
        `[data-pane-id="${CSS.escape(liveData.current.layout.activeId)}"]`,
      );
      (pane?.querySelector<HTMLElement>('[role="document"], .excalidraw') ?? pane)?.focus();
    });
  }
  const activeColumn = data.layout.columns.find((column) =>
    column.panes.some((pane) => pane.id === data.layout.activeId),
  );
  const currentPane = panes.find((pane) => pane.id === data.layout.activeId);
  const nextPane =
    panes[(panes.findIndex((pane) => pane.id === data.layout.activeId) + 1) % panes.length];
  useCommandHandlers("app", {
    "workspace.new": {
      enabled: data.native && data.ready && !data.busy,
      run: () => openCreate("workspace"),
    },
    "folder.new": {
      enabled: data.native && !!data.workspace && !data.busy,
      run: () => openCreate("folder"),
    },
    "pdf.add": {
      enabled: data.native && !!data.workspace && !data.busy,
      run: () => data.addPdf(data.selected?.folderId ?? null),
    },
    "whiteboard.new": {
      enabled: data.native && !!data.workspace && !data.busy,
      run: () => {
        setView("workspace");
        return data.createDrawing();
      },
    },
    "layout.vertical": {
      enabled: view === "workspace" && data.layout.columns.length < 2,
      run: () => {
        data.splitPane("columns", data.layout.activeId);
        focusCurrentPane();
      },
    },
    "layout.horizontal": {
      enabled: view === "workspace" && (activeColumn?.panes.length ?? 2) < 2,
      run: () => {
        data.splitPane("rows", data.layout.activeId);
        focusCurrentPane();
      },
    },
    "pane.close": {
      run: () => {
        if (view === "settings") setView("workspace");
        else data.closePane(data.layout.activeId);
        focusCurrentPane();
      },
    },
    "pane.next": { enabled: panes.length > 1, run: () => focusPane(nextPane.id) },
    "pane.previous": {
      enabled: panes.length > 1,
      run: () =>
        focusPane(
          panes[
            (panes.findIndex((pane) => pane.id === data.layout.activeId) + panes.length - 1) %
              panes.length
          ].id,
        ),
    },
    "pane.swap": {
      enabled:
        view === "workspace" && panes.length > 1 && !!(currentPane?.content || nextPane?.content),
      run: () => {
        if (currentPane?.content)
          data.dropContent(nextPane.id, currentPane.content, "center", currentPane.id);
        else if (nextPane?.content)
          data.dropContent(data.layout.activeId, nextPane.content, "center", nextPane.id);
        focusCurrentPane();
      },
    },
    "navigation.primary": { run: () => setNavigationExpanded((value) => !value) },
    "navigation.materials": {
      run: () =>
        window.matchMedia("(max-width: 767px)").matches
          ? setMobileOpen((value) => !value)
          : setContextExpanded((value) => !value),
    },
    preferences: {
      run: () => {
        setView("settings");
        setMobileOpen(false);
      },
    },
  });
  useMaterialOptions([
    ...data.library.documents
      .filter((item) => item.workspaceId === data.workspace?.id)
      .map((item) => ({
        id: `pdf:${item.id}`,
        title: `PDF: ${item.title}`,
        open: () => {
          liveData.current.select(item.id);
          setView("workspace");
        },
      })),
    ...data.library.drawings
      .filter((item) => item.workspaceId === data.workspace?.id)
      .map((item) => ({
        id: `drawing:${item.id}`,
        title: `Whiteboard: ${item.title}`,
        open: () => {
          liveData.current.openDrawing(item.id);
          setView("workspace");
        },
      })),
  ]);
  useEffect(() => {
    workbench.setInfo({
      activeId: view === "workspace" ? data.layout.activeId : null,
      scope:
        view === "workspace"
          ? (data.layout.columns
              .flatMap((column) => column.panes)
              .find((pane) => pane.id === data.layout.activeId)?.content?.kind ?? null)
          : null,
      focus: (id) => {
        setView("workspace");
        liveData.current.activatePane(id);
        requestAnimationFrame(() => {
          const pane = document.querySelector<HTMLElement>(`[data-pane-id="${CSS.escape(id)}"]`);
          (pane?.querySelector<HTMLElement>('[role="document"], .excalidraw') ?? pane)?.focus();
        });
      },
      columns: data.layout.columns.map((column) => ({
        id: column.id,
        panes: column.panes.map((pane) => ({
          id: pane.id,
          kind: pane.content?.kind ?? null,
          title:
            pane.content?.kind === "pdf"
              ? (data.library.documents.find((item) => item.id === pane.content?.id)?.title ??
                "PDF")
              : pane.content?.kind === "drawing"
                ? (data.library.drawings.find((item) => item.id === pane.content?.id)?.title ??
                  "Whiteboard")
                : "Empty pane",
        })),
      })),
    });
  }, [data.layout, data.library.documents, data.library.drawings, view, workbench.setInfo]);
  function openCreate(kind: "workspace" | "folder") {
    setTitle("");
    setCreate(kind);
  }
  function chooseWorkspace(id: string) {
    data.chooseWorkspace(id);
    setView("workspace");
  }
  const settingsNavigation = (
    <SettingsNavigation
      section={preferenceSection}
      query={settingsQuery}
      onSelect={(section) => {
        setPreferenceSection(section);
        setMobileOpen(false);
      }}
    />
  );
  useNotice(data.error, "Could not complete the library operation");
  const tree = (
    <StudyTree
      library={data.library}
      workspace={data.workspace}
      selectedId={data.selected?.id ?? data.selectedDrawing?.id}
      disabled={data.busy || !data.ready || !data.native}
      onSelect={(item, target) => {
        data.select(item.id, target);
        setView("workspace");
        setMobileOpen(false);
      }}
      onAddPdf={(folder) => {
        void data.addPdf(folder);
      }}
      onAddFolder={() => openCreate("folder")}
      onAddDrawing={() => {
        void data.createDrawing();
      }}
      onSelectDrawing={(id, target) => {
        data.openDrawing(id, target);
        setView("workspace");
        setMobileOpen(false);
      }}
      onRename={(item) => {
        setTitle(item.title);
        setRename(item);
      }}
      onMove={(documentId, folderId) => {
        if (data.workspace)
          void data.mutate({
            type: "moveDocument",
            workspaceId: data.workspace.id,
            documentId,
            folderId,
          });
      }}
      onRemove={setRemoval}
    />
  );
  const navigationLabel = navigationExpanded ? "Collapse navigation" : "Expand navigation";
  const contextLabel = contextExpanded
    ? "Collapse workspace navigation"
    : "Expand workspace navigation";
  function workspaceList(compact: boolean) {
    return data.library.workspaces.map((workspace) => (
      <ContextMenu key={workspace.id}>
        <ContextMenuTrigger className="min-w-0">
          <NavigationAction
            compact={compact}
            aria-label={workspace.title}
            title={workspace.title}
            aria-pressed={view === "workspace" && workspace.id === data.workspace?.id}
            className={cn(
              !compact && "min-w-0 flex-1",
              view === "workspace" && workspace.id === data.workspace?.id && "bg-sidebar-accent",
            )}
            onClick={() => chooseWorkspace(workspace.id)}
          >
            <span aria-hidden="true" className="w-4 shrink-0 text-center text-xs font-medium">
              {workspace.title.slice(0, 1).toUpperCase()}
            </span>
            {!compact && <span className="truncate">{workspace.title}</span>}
          </NavigationAction>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem
            disabled={data.busy}
            onClick={() => {
              setTitle(workspace.title);
              setRename({ kind: "workspace", id: workspace.id, title: workspace.title });
            }}
          >
            Rename workspace
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            variant="destructive"
            disabled={data.busy}
            onClick={() =>
              setRemoval({ kind: "workspace", id: workspace.id, title: workspace.title })
            }
          >
            Remove workspace
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    ));
  }
  return (
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
      <NavigationLayout
        primaryExpanded={navigationExpanded}
        contextExpanded={contextExpanded}
        primaryNavigation={
          <aside
            aria-label="Primary navigation"
            className="flex h-full w-full min-w-0 flex-col gap-3 overflow-hidden bg-client-surface py-2"
          >
            <div className="flex h-9 shrink-0 items-center">
              <div className="flex w-[55px] shrink-0 justify-center">
                <NavigationAction
                  compact
                  aria-label={navigationLabel}
                  title={navigationLabel}
                  command="navigation.primary"
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
              <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
                {workspaceList(!navigationExpanded)}
              </div>
              <NavigationAction
                compact={!navigationExpanded}
                aria-label="Create workspace"
                title="Create workspace"
                command="workspace.new"
                disabled={!data.ready || data.busy || !data.native}
                onClick={() => openCreate("workspace")}
              >
                <PlusIcon />
                {navigationExpanded && <span>Create workspace</span>}
              </NavigationAction>
              <NavigationAction
                compact={!navigationExpanded}
                aria-label="Settings"
                title="Settings"
                command="preferences"
                aria-pressed={view === "settings"}
                className={cn("mt-2", view === "settings" && "bg-sidebar-accent")}
                onClick={() => {
                  setView("settings");
                  setMobileOpen(false);
                }}
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
            className="flex h-full w-full min-w-0 flex-col gap-3 overflow-hidden bg-context-surface py-2"
          >
            <div className="flex h-9 shrink-0 items-center">
              <div className="flex w-[55px] shrink-0 justify-center">
                <NavigationAction
                  compact
                  aria-label={contextLabel}
                  title={contextLabel}
                  command="navigation.materials"
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
              {view === "workspace" ? tree : settingsNavigation}
            </div>
            {!contextExpanded && (
              <nav aria-label="Compact workspace navigation" className="px-2">
                <NavigationAction
                  compact
                  aria-label={view === "settings" ? "Show preferences" : "Show materials"}
                  title={view === "settings" ? "Preferences" : "Materials"}
                  command="navigation.materials"
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
          {data.ready && !data.native && (
            <p className="border-b px-4 py-2 text-xs text-muted-foreground">
              Open the Locus desktop app to access your workspaces, PDFs, and local files.
            </p>
          )}
          <main
            className={cn(
              "min-h-0 min-w-0 flex-1",
              view === "settings"
                ? "locus-navigation-frame overflow-hidden bg-background"
                : "overflow-hidden",
            )}
          >
            {view === "settings" ? (
              <div className="h-full min-h-0 overflow-hidden bg-background">
                <PreferencesSettings
                  section={preferenceSection}
                  query={settingsQuery}
                  onQueryChange={setSettingsQuery}
                />
              </div>
            ) : (
              <StudyArea data={data} onCreateWorkspace={() => openCreate("workspace")} />
            )}
          </main>
        </div>
      </NavigationLayout>
      <SheetContent side="left" className="gap-0 bg-sidebar data-[side=left]:w-[min(20rem,90vw)]">
        <SheetHeader>
          <SheetTitle>Locus</SheetTitle>
          <SheetDescription>Subjects, materials, and settings</SheetDescription>
        </SheetHeader>
        <div className="max-h-40 overflow-auto px-2 pb-2">
          {workspaceList(false)}
          <NavigationAction
            disabled={data.busy || !data.ready || !data.native}
            onClick={() => openCreate("workspace")}
          >
            <PlusIcon />
            <span>Create workspace</span>
          </NavigationAction>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {view === "settings" ? settingsNavigation : tree}
        </div>
        <div className="p-2">
          <NavigationAction
            onClick={() => {
              setView("settings");
              setMobileOpen(false);
            }}
          >
            <Settings2Icon />
            <span>Settings</span>
          </NavigationAction>
        </div>
      </SheetContent>
      <Dialog
        open={!!create}
        onOpenChange={(open) => {
          if (!open && !data.busy) setCreate(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{create === "folder" ? "Create folder" : "Create workspace"}</DialogTitle>
            <DialogDescription>
              {create === "folder"
                ? "Group books within this workspace. Folders have no subfolders."
                : "Organize books around a subject or project."}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await data.mutate(
                create === "folder" && data.workspace
                  ? { type: "createFolder", workspaceId: data.workspace.id, title: title.trim() }
                  : { type: "createWorkspace", title: title.trim() },
              );
              if (ok) setCreate(null);
            }}
          >
            <label htmlFor="entity-title" className="mb-2 block">
              Name
            </label>
            <input
              id="entity-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={120}
              className="mb-4 h-9 w-full border bg-background px-3"
            />
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                disabled={data.busy}
                onClick={() => setCreate(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={data.busy || !title.trim()}>
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!rename}
        onOpenChange={(open) => {
          if (!open && !data.busy) setRename(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename {rename?.kind === "document" ? "PDF" : rename?.kind}</DialogTitle>
            <DialogDescription>
              This changes the display name in Locus. Original files remain unchanged.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!rename || !data.workspace) return;
              const ok = await data.mutate(
                rename.kind === "drawing"
                  ? { type: "renameDrawing", drawingId: rename.id, title: title.trim() }
                  : rename.kind === "document"
                    ? {
                        type: "renameDocument",
                        workspaceId: data.workspace.id,
                        documentId: rename.id,
                        title: title.trim(),
                      }
                    : rename.kind === "folder"
                      ? { type: "renameFolder", folderId: rename.id, title: title.trim() }
                      : { type: "renameWorkspace", workspaceId: rename.id, title: title.trim() },
              );
              if (ok) setRename(null);
            }}
          >
            <label htmlFor="rename-title" className="mb-2 block">
              Name
            </label>
            <input
              id="rename-title"
              required
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mb-4 h-9 w-full border bg-background px-3"
            />
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                disabled={data.busy}
                onClick={() => setRename(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={data.busy || !title.trim()}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!removal}
        onOpenChange={(open) => {
          if (!open && !data.busy) setRemoval(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove {removal?.title}?</DialogTitle>
            <DialogDescription>
              {removal?.kind === "folder"
                ? "Books in this folder will remain at the workspace root."
                : removal?.kind === "workspace"
                  ? "This removes the workspace and its material references and reading positions. Whiteboard files are kept on disk."
                  : removal?.kind === "drawing"
                    ? "This removes the whiteboard reference. Its .excalidraw file is kept on disk."
                    : "This removes the PDF reference and its reading position from this workspace."}{" "}
              Original PDF files stay on your device.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" disabled={data.busy} onClick={() => setRemoval(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={data.busy}
              onClick={async () => {
                if (!removal || !data.workspace) return;
                const ok = await data.mutate(
                  removal.kind === "drawing"
                    ? { type: "removeDrawing", drawingId: removal.id }
                    : removal.kind === "workspace"
                      ? { type: "removeWorkspace", workspaceId: removal.id }
                      : removal.kind === "folder"
                        ? { type: "removeFolder", folderId: removal.id }
                        : {
                            type: "removeDocument",
                            workspaceId: data.workspace.id,
                            documentId: removal.id,
                          },
                );
                if (ok) setRemoval(null);
              }}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
