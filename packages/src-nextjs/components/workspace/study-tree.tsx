"use client";
import { BookOpenIcon, ChevronRightIcon, FolderIcon } from "lucide-react";
import { type DragEvent, type ReactNode, useState } from "react";
import { NavigationAction } from "@/components/layout/navigation-action";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { Folder, Library, StudyDocument, Workspace } from "@/lib/library";
import { cn } from "@/lib/utils";

export type Removal = { kind: "workspace" | "folder" | "document"; id: string; title: string };
const PDF_DRAG = "application/x-locus-document";
export function StudyTree({
  library,
  workspace,
  selectedId,
  disabled,
  onSelect,
  onAddPdf,
  onAddFolder,
  onRemove,
  onRename,
  onMove,
}: {
  library: Library;
  workspace: Workspace | null;
  selectedId?: string;
  disabled: boolean;
  onSelect: (item: StudyDocument) => void;
  onAddPdf: (folderId: string | null) => void;
  onAddFolder: () => void;
  onRemove: (item: Removal) => void;
  onRename: (item: Removal) => void;
  onMove: (documentId: string, folderId: string | null) => void;
}) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  if (!workspace)
    return <p className="px-5 text-xs text-muted-foreground">Create a workspace to add books.</p>;
  const documents = library.documents.filter((d) => d.workspaceId === workspace.id);
  const folders = library.folders.filter((f) => f.workspaceId === workspace.id);
  function dropProps(folderId: string | null) {
    const target = folderId ?? "root";
    return {
      onDragOver(e: DragEvent) {
        if (disabled || !e.dataTransfer.types.includes(PDF_DRAG)) return;
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "move";
        setDropTarget(target);
      },
      onDragLeave(e: DragEvent) {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDropTarget(null);
      },
      onDrop(e: DragEvent) {
        if (disabled || !e.dataTransfer.types.includes(PDF_DRAG)) return;
        e.preventDefault();
        e.stopPropagation();
        const id = e.dataTransfer.getData(PDF_DRAG);
        if (documents.some((d) => d.id === id && d.folderId !== folderId)) onMove(id, folderId);
        setDropTarget(null);
        setDragging(null);
      },
    };
  }
  function menu(children: ReactNode, content: ReactNode) {
    return (
      <ContextMenu>
        <ContextMenuTrigger className="min-w-0" onContextMenu={(e) => e.stopPropagation()}>
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent>{content}</ContextMenuContent>
      </ContextMenu>
    );
  }
  function documentRow(document: StudyDocument) {
    const item: Removal = { kind: "document", id: document.id, title: document.title };
    return menu(
      <NavigationAction
        draggable={!disabled}
        aria-haspopup="menu"
        aria-current={selectedId === document.id ? "true" : undefined}
        className={cn(
          "min-w-0 gap-2 px-2 cursor-grab active:cursor-grabbing",
          selectedId === document.id && "bg-sidebar-accent",
          dragging === document.id && "opacity-50",
        )}
        onDragStart={(e) => {
          e.dataTransfer.setData(PDF_DRAG, document.id);
          e.dataTransfer.effectAllowed = "move";
          setDragging(document.id);
        }}
        onDragEnd={() => {
          setDragging(null);
          setDropTarget(null);
        }}
        onClick={() => onSelect(document)}
      >
        <BookOpenIcon />
        <span className="truncate" title={document.path}>
          {document.title}
        </span>
      </NavigationAction>,
      <>
        <ContextMenuItem onClick={() => onSelect(document)}>Open PDF</ContextMenuItem>
        <ContextMenuItem disabled={disabled} onClick={() => onRename(item)}>
          Rename
        </ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger disabled={disabled}>Move to</ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem
              disabled={document.folderId === null}
              onClick={() => onMove(document.id, null)}
            >
              Workspace root
            </ContextMenuItem>
            {folders.map((f) => (
              <ContextMenuItem
                key={f.id}
                disabled={document.folderId === f.id}
                onClick={() => onMove(document.id, f.id)}
              >
                {f.title}
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuItem disabled={disabled} onClick={() => onAddPdf(document.folderId)}>
          Add PDF
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" disabled={disabled} onClick={() => onRemove(item)}>
          Remove from workspace
        </ContextMenuItem>
      </>,
    );
  }
  function folderRow(folder: Folder) {
    const item: Removal = { kind: "folder", id: folder.id, title: folder.title };
    return (
      <div
        key={folder.id}
        {...dropProps(folder.id)}
        className={cn(
          "min-w-0",
          dropTarget === folder.id && "bg-sidebar-accent ring-1 ring-inset ring-ring",
        )}
      >
        <Collapsible defaultOpen>
          {menu(
            <CollapsibleTrigger
              render={
                <NavigationAction
                  aria-haspopup="menu"
                  className="min-w-0 gap-2 px-2 [&_svg:first-child]:size-3 [&[aria-expanded=true]>svg:first-child]:rotate-90"
                />
              }
            >
              <ChevronRightIcon />
              <FolderIcon />
              <span className="truncate" title={folder.title}>
                {folder.title}
              </span>
            </CollapsibleTrigger>,
            <>
              <ContextMenuItem disabled={disabled} onClick={() => onAddPdf(folder.id)}>
                Add PDF
              </ContextMenuItem>
              <ContextMenuItem disabled={disabled} onClick={() => onRename(item)}>
                Rename folder
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem
                variant="destructive"
                disabled={disabled}
                onClick={() => onRemove(item)}
              >
                Remove folder
              </ContextMenuItem>
            </>,
          )}
          <CollapsibleContent>
            <ul className="tree-children">
              {documents
                .filter((d) => d.folderId === folder.id)
                .map((d) => (
                  <li key={d.id} className="tree-branch">
                    {documentRow(d)}
                  </li>
                ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  }
  return (
    <ContextMenu>
      <ContextMenuTrigger
        render={
          <nav
            aria-label="Study hierarchy"
            className={cn(
              "min-h-full min-w-0 px-2 pb-4",
              dropTarget === "root" && "bg-sidebar-accent/40 ring-1 ring-inset ring-ring",
            )}
            {...dropProps(null)}
          />
        }
      >
        {folders.map(folderRow)}
        {documents
          .filter((d) => !d.folderId)
          .map((d) => (
            <div key={d.id}>{documentRow(d)}</div>
          ))}
        {dragging ? (
          <div className="mt-3 border border-dashed p-3 text-center text-xs text-muted-foreground">
            Drop here to move to workspace root
          </div>
        ) : documents.length === 0 && folders.length === 0 ? (
          <p className="px-3 py-2 text-xs text-muted-foreground">
            Right-click to add a PDF or folder.
          </p>
        ) : null}
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem disabled={disabled} onClick={() => onAddPdf(null)}>
          Add PDF
        </ContextMenuItem>
        <ContextMenuItem disabled={disabled} onClick={onAddFolder}>
          Create folder
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
