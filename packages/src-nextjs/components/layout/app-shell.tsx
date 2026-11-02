"use client";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  FolderIcon,
  MenuIcon,
  PaletteIcon,
  PlusIcon,
  Settings2Icon,
} from "lucide-react";
import { useState } from "react";
import { NavigationAction } from "@/components/layout/navigation-action";
import { NavigationLayout } from "@/components/layout/navigation-layout";
import { AppearanceSettings } from "@/components/settings/appearance-settings";
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
  SheetTrigger,
} from "@/components/ui/sheet";
import { PdfReader } from "@/components/workspace/pdf-reader";
import { type Removal, StudyTree } from "@/components/workspace/study-tree";
import { useLibrary } from "@/components/workspace/use-library";
import { cn } from "@/lib/utils";

export function AppShell() {
  const data = useLibrary();
  const [view, setView] = useState<"workspace" | "settings">("workspace");
  const [navigationExpanded, setNavigationExpanded] = useState(false);
  const [contextExpanded, setContextExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [create, setCreate] = useState<"workspace" | "folder" | null>(null);
  const [title, setTitle] = useState("");
  const [rename, setRename] = useState<Removal | null>(null);
  const [removal, setRemoval] = useState<Removal | null>(null);
  function openCreate(kind: "workspace" | "folder") {
    setTitle("");
    setCreate(kind);
  }
  function chooseWorkspace(id: string) {
    data.chooseWorkspace(id);
    setView("workspace");
  }
  const tree = (
    <StudyTree
      library={data.library}
      workspace={data.workspace}
      selectedId={data.selected?.id}
      disabled={data.busy || !data.ready || !data.native}
      onSelect={(item) => {
        data.select(item.id);
        setView("workspace");
        setMobileOpen(false);
      }}
      onAddPdf={(folder) => {
        void data.addPdf(folder);
      }}
      onAddFolder={() => openCreate("folder")}
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
              {view === "workspace" ? (
                tree
              ) : (
                <nav aria-label="Settings categories" className="px-2">
                  <NavigationAction aria-current="true" className="bg-sidebar-accent">
                    <PaletteIcon />
                    <span>Appearance</span>
                  </NavigationAction>
                </nav>
              )}
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
              <span className="truncate">
                {view === "settings" ? "Settings" : (data.workspace?.title ?? "Locus")}
              </span>
              {(view === "settings" || data.selected) && (
                <>
                  <ChevronRightIcon className="size-3 shrink-0" />
                  <span className="truncate text-foreground">
                    {view === "settings" ? "Appearance" : data.selected?.title}
                  </span>
                </>
              )}
            </nav>
          </header>
          {data.ready && !data.native && (
            <p className="border-b px-4 py-2 text-xs text-muted-foreground">
              Layout preview only. Run mise run desktop for your workspaces, PDFs, and file access.
            </p>
          )}
          {data.error && (
            <div
              role="alert"
              className="flex items-center gap-2 border-b px-4 py-2 text-xs text-destructive"
            >
              <span>{data.error}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  void data.mutate({ type: "list" });
                }}
              >
                Retry
              </Button>
            </div>
          )}
          <main className="min-h-0 min-w-0 flex-1 overflow-auto">
            {view === "settings" ? (
              <AppearanceSettings />
            ) : data.selected ? (
              <PdfReader
                key={`${data.selected.workspaceId}:${data.selected.id}:${data.revision}`}
                document={data.selected}
                onPosition={data.savePosition}
                onLocate={() => {
                  void data.addPdf(data.selected?.folderId, data.selected?.id);
                }}
              />
            ) : (
              <section className="flex min-h-full flex-col items-center justify-center gap-3 p-6 text-center">
                <h1 className="text-sm font-medium">
                  {data.ready
                    ? (data.workspace?.title ?? "Your study workspace")
                    : "Opening library…"}
                </h1>
                <p className="max-w-sm text-xs text-muted-foreground">
                  {data.workspace
                    ? "Attach a PDF or select a book from the sidebar to begin reading."
                    : "Create a workspace for a subject, then attach your books."}
                </p>
                {data.ready && (
                  <Button
                    variant="outline"
                    disabled={data.busy || !data.native}
                    onClick={() =>
                      data.workspace ? void data.addPdf(null) : openCreate("workspace")
                    }
                  >
                    {data.workspace ? "Add PDF" : "Create workspace"}
                  </Button>
                )}
              </section>
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
        <div className="min-h-0 flex-1 overflow-y-auto">{tree}</div>
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
            {data.error && (
              <p role="alert" className="mb-3 text-destructive">
                {data.error}
              </p>
            )}
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
                rename.kind === "document"
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
            {data.error && (
              <p role="alert" className="mb-3 text-destructive">
                {data.error}
              </p>
            )}
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
                  ? "This removes the workspace and its PDF references and reading positions."
                  : "This removes the PDF reference and its reading position from this workspace."}{" "}
              Original PDF files stay on your device.
            </DialogDescription>
          </DialogHeader>
          {data.error && (
            <p role="alert" className="text-destructive">
              {data.error}
            </p>
          )}
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
                  removal.kind === "workspace"
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
