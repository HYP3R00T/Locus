"use client";

import { PenLineIcon } from "lucide-react";
import { type DragEvent, Fragment, useState } from "react";
import { Button } from "@/components/ui/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { PdfReader } from "@/components/workspace/pdf-reader";
import type { useLibrary } from "@/components/workspace/use-library";
import { Whiteboard } from "@/components/workspace/whiteboard";
import type { DropZone, PaneContent } from "@/lib/study-layout";

const PANE_DRAG = "application/x-locus-pane";
const PDF_DRAG = "application/x-locus-document";
const DRAWING_DRAG = "application/x-locus-drawing";
const dividerClass = "locus-resize-gutter z-20";
const previewClasses: Record<DropZone, string> = {
  center: "inset-1",
  left: "inset-y-1 left-1 w-1/2",
  right: "inset-y-1 right-1 w-1/2",
  top: "inset-x-1 top-1 h-1/2",
  bottom: "inset-x-1 bottom-1 h-1/2",
};
function zoneFor(event: DragEvent): DropZone {
  const rect = event.currentTarget.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;
  if (x < 0.22) return "left";
  if (x > 0.78) return "right";
  if (y < 0.22) return "top";
  if (y > 0.78) return "bottom";
  return "center";
}

export function StudyArea({
  data,
  onCreateWorkspace,
}: {
  data: ReturnType<typeof useLibrary>;
  onCreateWorkspace: () => void;
}) {
  const [drop, setDrop] = useState<{ paneId: string; zone: DropZone; allowed: boolean } | null>(
    null,
  );
  const documents = data.library.documents.filter((d) => d.workspaceId === data.workspace?.id);
  const drawings = data.library.drawings.filter((d) => d.workspaceId === data.workspace?.id);
  const panes = data.layout.columns.flatMap((c) => c.panes);
  return (
    <ResizablePanelGroup orientation="horizontal" id="study-columns" className="min-h-0 min-w-0">
      {data.layout.columns.map((column, columnIndex) => (
        <Fragment key={column.id}>
          {columnIndex > 0 && (
            <ResizableHandle aria-label="Resize study columns" className={dividerClass} />
          )}
          <ResizablePanel
            id={column.id}
            minSize="20%"
            defaultSize="50%"
            className="min-w-0 overflow-hidden"
          >
            <ResizablePanelGroup orientation="vertical" id={`study-rows-${column.id}`}>
              {column.panes.map((pane, rowIndex) => {
                const document = data.paneDocument(pane);
                const drawing =
                  pane.content?.kind === "drawing"
                    ? drawings.find((d) => d.id === pane.content?.id)
                    : null;
                return (
                  <Fragment key={pane.id}>
                    {rowIndex > 0 && (
                      <ResizableHandle aria-label="Resize study rows" className={dividerClass} />
                    )}
                    <ResizablePanel
                      id={pane.id}
                      minSize="20%"
                      defaultSize="50%"
                      className="min-h-0 overflow-hidden"
                    >
                      <section
                        aria-label={`Study pane ${columnIndex + 1}.${rowIndex + 1}`}
                        data-active={pane.id === data.layout.activeId}
                        data-pane-id={pane.id}
                        tabIndex={-1}
                        onPointerDownCapture={() => data.activatePane(pane.id)}
                        onWheelCapture={() => data.activatePane(pane.id)}
                        onFocusCapture={() => data.activatePane(pane.id)}
                        onDragOverCapture={(e) => {
                          if (
                            ![PANE_DRAG, PDF_DRAG, DRAWING_DRAG].some((type) =>
                              e.dataTransfer.types.includes(type),
                            )
                          )
                            return;
                          e.preventDefault();
                          e.stopPropagation();
                          const zone = zoneFor(e);
                          const allowed =
                            zone === "center" ||
                            (zone === "left" || zone === "right"
                              ? data.layout.columns.length < 2
                              : column.panes.length < 2);
                          e.dataTransfer.dropEffect = allowed ? "copy" : "none";
                          setDrop((old) =>
                            old?.paneId === pane.id && old.zone === zone && old.allowed === allowed
                              ? old
                              : { paneId: pane.id, zone, allowed },
                          );
                        }}
                        onDragLeave={(e) => {
                          if (!e.currentTarget.contains(e.relatedTarget as Node | null))
                            setDrop(null);
                        }}
                        onDropCapture={(e) => {
                          if (
                            ![PANE_DRAG, PDF_DRAG, DRAWING_DRAG].some((type) =>
                              e.dataTransfer.types.includes(type),
                            )
                          )
                            return;
                          e.preventDefault();
                          e.stopPropagation();
                          const sourceId = e.dataTransfer.getData(PANE_DRAG);
                          const source = panes.find((p) => p.id === sourceId);
                          const pdf = e.dataTransfer.getData(PDF_DRAG);
                          const board = e.dataTransfer.getData(DRAWING_DRAG);
                          const content: PaneContent | null =
                            source?.content ??
                            (documents.some((d) => d.id === pdf)
                              ? { kind: "pdf", id: pdf }
                              : drawings.some((d) => d.id === board)
                                ? { kind: "drawing", id: board }
                                : null);
                          if (content) data.dropContent(pane.id, content, zoneFor(e), source?.id);
                          setDrop(null);
                        }}
                        className="relative h-full min-h-0 min-w-0 overflow-hidden locus-study-pane"
                      >
                        {document ? (
                          <PdfReader
                            key={`${document.workspaceId}:${document.id}:${data.revision}`}
                            document={document}
                            paneId={pane.id}
                            onViewPosition={(source, page, y) =>
                              data.rememberPanePosition(pane.id, source, page, y)
                            }
                            onPosition={(source, page, y) =>
                              data.savePanePosition(pane.id, source, page, y)
                            }
                            onLocate={() => {
                              void data.addPdf(document.folderId, document.id);
                            }}
                          />
                        ) : drawing ? (
                          <Whiteboard
                            key={drawing.id}
                            drawing={drawing}
                            paneId={pane.id}
                            onError={data.reportError}
                          />
                        ) : (
                          <div className="flex h-full flex-col items-center justify-center gap-3 overflow-auto p-6 text-center">
                            <h1 className="text-sm font-medium">
                              {data.ready
                                ? (data.workspace?.title ?? "Your study workspace")
                                : "Opening library…"}
                            </h1>
                            <p className="max-w-sm text-xs text-muted-foreground">
                              {data.workspace
                                ? "Open a material from the sidebar, or drag it to a pane edge to split."
                                : "Create a workspace for a subject, then add your materials."}
                            </p>
                            {data.ready && (
                              <div className="flex flex-wrap justify-center gap-2">
                                <Button
                                  variant="outline"
                                  disabled={data.busy || !data.native}
                                  onClick={() =>
                                    data.workspace ? void data.addPdf(null) : onCreateWorkspace()
                                  }
                                >
                                  {data.workspace ? "Add PDF" : "Create workspace"}
                                </Button>
                                {data.workspace && (
                                  <Button
                                    variant="outline"
                                    disabled={data.busy || !data.native}
                                    onClick={() => {
                                      void data.createDrawing();
                                    }}
                                  >
                                    <PenLineIcon />
                                    New whiteboard
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                        {drop?.paneId === pane.id && (
                          <div
                            aria-hidden="true"
                            className={`pointer-events-none absolute z-40 border-2 ${drop.allowed ? "border-ring bg-accent/40" : "border-destructive bg-destructive/10"} ${previewClasses[drop.zone]}`}
                          />
                        )}
                      </section>
                    </ResizablePanel>
                  </Fragment>
                );
              })}
            </ResizablePanelGroup>
          </ResizablePanel>
        </Fragment>
      ))}
    </ResizablePanelGroup>
  );
}
