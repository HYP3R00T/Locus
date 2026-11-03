"use client";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useConfiguration } from "@/components/configuration-provider";
import { flushDrawings } from "@/lib/drawings";
import {
  attachPdf,
  desktop,
  emptyLibrary,
  type Library,
  type LibraryAction,
  libraryAction,
  type StudyDocument,
} from "@/lib/library";
import {
  activeStudyPane,
  createStudyLayout,
  type DropZone,
  type MaterialOpenTarget,
  type PaneContent,
  type ReadingPosition,
  type StudyPane,
  studyLayoutReducer,
} from "@/lib/study-layout";

export function useLibrary() {
  const { appearance } = useConfiguration();
  const [library, setLibrary] = useState<Library>(emptyLibrary);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [folderSelections, setFolderSelections] = useState<Record<string, string | null>>({});
  const [layout, dispatchLayout] = useReducer(studyLayoutReducer, undefined, createStudyLayout);
  const activeId = useRef(layout.activeId);
  useEffect(() => {
    activeId.current = layout.activeId;
  }, [layout.activeId]);
  const positions = useRef(new Map<string, ReadingPosition & { documentId: string }>());
  function resetLayout() {
    activeId.current = "initial-pane";
    positions.current.clear();
    dispatchLayout({ type: "reset" });
  }
  function select(documentId: string, target: MaterialOpenTarget = "active") {
    chooseFolder(
      library.documents.find(
        (document) => document.id === documentId && document.workspaceId === workspaceId,
      )?.folderId ?? null,
    );
    openMaterial({ kind: "pdf", id: documentId }, target);
  }
  const [ready, setReady] = useState(false);
  const [native, setNative] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let alive = true;
    libraryAction({ type: "list" })
      .then((data) => {
        if (!alive) return;
        setLibrary(data);
        setNative(desktop());
        const saved = localStorage.getItem("locus-workspace");
        setWorkspaceId(
          data.workspaces.find((w) => w.id === saved)?.id ?? data.workspaces[0]?.id ?? null,
        );
        setReady(true);
      })
      .catch((e) => {
        if (alive) {
          setNative(desktop());
          setError(String(e));
          setReady(true);
        }
      });
    return () => {
      alive = false;
    };
  }, []);
  const chooseWorkspace = (id: string) => {
    setWorkspaceId(id);
    if (id !== workspaceId) resetLayout();
    localStorage.setItem("locus-workspace", id);
  };
  async function mutate(action: LibraryAction) {
    setBusy(true);
    setError(null);
    try {
      if (action.type === "removeDrawing" || action.type === "removeWorkspace")
        await flushDrawings();
      const data = await libraryAction(action);
      setLibrary(data);
      if (action.type === "createWorkspace") {
        const added = data.workspaces.find(
          (w) => !library.workspaces.some((old) => old.id === w.id),
        );
        if (added) chooseWorkspace(added.id);
      } else if (action.type === "createFolder") {
        const added = data.folders.find(
          (folder) => !library.folders.some((old) => old.id === folder.id),
        );
        if (added) chooseFolder(added.id);
      } else if (!data.workspaces.some((w) => w.id === workspaceId)) {
        setWorkspaceId(data.workspaces[0]?.id ?? null);
        resetLayout();
      }
      return true;
    } catch (e) {
      setError(String(e));
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function addPdf(folderId: string | null = null, relinkId: string | null = null) {
    if (!workspaceId) return;
    setBusy(true);
    setError(null);
    try {
      const before = library.documents
        .filter((d) => d.workspaceId === workspaceId)
        .map((d) => d.id);
      const data = await attachPdf(workspaceId, folderId, relinkId);
      if (data) {
        setLibrary(data);
        const added = data.documents.find(
          (d) => d.workspaceId === workspaceId && !before.includes(d.id),
        );
        if (added) {
          chooseFolder(added.folderId);
          openMaterial({ kind: "pdf", id: added.id }, "active");
        }
        if (relinkId) setRevision((r) => r + 1);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  const savePosition = useCallback((document: StudyDocument, pageIndex: number, y: number) => {
    setLibrary((old) => ({
      ...old,
      documents: old.documents.map((d) =>
        d.id === document.id && d.workspaceId === document.workspaceId
          ? { ...d, pageIndex, y, positionVersion: 2 }
          : d,
      ),
    }));
    return libraryAction({
      type: "savePosition",
      workspaceId: document.workspaceId,
      documentId: document.id,
      pageIndex,
      y,
    }).then(() => {});
  }, []);
  const workspace = library.workspaces.find((w) => w.id === workspaceId) ?? null;
  const selectedFolderId =
    workspaceId && Object.hasOwn(folderSelections, workspaceId)
      ? folderSelections[workspaceId]
      : library.navigation.find((item) => item.workspaceId === workspaceId)?.folderId;
  const activeFolder =
    library.folders.find(
      (folder) => folder.id === selectedFolderId && folder.workspaceId === workspaceId,
    ) ?? null;
  function chooseFolder(folderId: string | null) {
    if (!workspaceId || folderId === (activeFolder?.id ?? null)) return;
    const previous = activeFolder?.id ?? null;
    setFolderSelections((old) => ({ ...old, [workspaceId]: folderId }));
    void libraryAction({ type: "selectFolder", workspaceId, folderId }).catch((reason) => {
      setError(String(reason));
      setFolderSelections((old) =>
        old[workspaceId] === folderId ? { ...old, [workspaceId]: previous } : old,
      );
    });
  }
  const activePane = activeStudyPane(layout);
  const selected =
    library.documents.find(
      (d) =>
        d.id === (activePane.content?.kind === "pdf" ? activePane.content.id : null) &&
        d.workspaceId === workspaceId,
    ) ?? null;
  function paneDocument(pane: StudyPane) {
    const document = library.documents.find(
      (d) =>
        d.id === (pane.content?.kind === "pdf" ? pane.content.id : null) &&
        d.workspaceId === workspaceId,
    );
    if (!document) return null;
    const cached = positions.current.get(pane.id);
    const position = cached?.documentId === document.id ? cached : pane.position;
    return position ? { ...document, ...position, id: document.id } : document;
  }
  function persistPanePosition(paneId: string) {
    const position = positions.current.get(paneId);
    const document = library.documents.find(
      (d) => d.id === position?.documentId && d.workspaceId === workspaceId,
    );
    if (document && position)
      void savePosition(document, position.pageIndex, position.y).catch((e) => setError(String(e)));
  }
  function activatePane(paneId: string) {
    const pane = layout.columns
      .flatMap((column) => column.panes)
      .find((item) => item.id === paneId);
    if (pane?.content?.kind === "pdf")
      chooseFolder(
        library.documents.find(
          (document) => document.id === pane.content?.id && document.workspaceId === workspaceId,
        )?.folderId ?? null,
      );
    else if (pane?.content?.kind === "drawing") chooseFolder(null);
    if (activeId.current === paneId) return;
    persistPanePosition(activeId.current);
    activeId.current = paneId;
    dispatchLayout({ type: "activate", paneId });
    persistPanePosition(paneId);
  }
  function splitPane(axis: "columns" | "rows", paneId: string) {
    const column = layout.columns.find((c) => c.panes.some((p) => p.id === paneId));
    if (!column) return;
    if (axis === "columns" ? layout.columns.length >= 2 : column.panes.length >= 2) return;
    const id = crypto.randomUUID();
    persistPanePosition(activeId.current);
    activeId.current = id;
    dispatchLayout({ type: "activate", paneId });
    dispatchLayout({ type: "split", axis, id });
  }
  function closePane(paneId: string) {
    const action = { type: "close" as const, paneId };
    activatePane(studyLayoutReducer(layout, action).activeId);
    positions.current.delete(paneId);
    dispatchLayout(action);
  }
  function openMaterial(content: PaneContent, target: MaterialOpenTarget) {
    const action =
      target === "active"
        ? { type: "open" as const, content }
        : {
            type: "openSplit" as const,
            content,
            target,
            primaryColumn: appearance.primaryColumn,
            primaryRow: appearance.primaryRow,
            id: crypto.randomUUID(),
          };
    const next = studyLayoutReducer(layout, action);
    setError(null);
    persistPanePosition(activeId.current);
    activeId.current = next.activeId;
    dispatchLayout(action);
  }
  function openDrawing(id: string, target: MaterialOpenTarget = "active") {
    chooseFolder(null);
    openMaterial({ kind: "drawing", id }, target);
  }
  async function createDrawing() {
    if (!workspaceId) return;
    const before = new Set(library.drawings.map((d) => d.id));
    setBusy(true);
    setError(null);
    try {
      const next = await libraryAction({
        type: "createDrawing",
        workspaceId,
        title: "Untitled whiteboard",
      });
      setLibrary(next);
      const drawing = next.drawings.find((d) => !before.has(d.id));
      if (drawing) openDrawing(drawing.id);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  function dropContent(targetId: string, content: PaneContent, zone: DropZone, sourceId?: string) {
    const withPositions = {
      ...layout,
      columns: layout.columns.map((c) => ({
        ...c,
        panes: c.panes.map((p) => ({
          ...p,
          position: (() => {
            const doc = paneDocument(p);
            return doc
              ? { pageIndex: doc.pageIndex, y: doc.y, positionVersion: doc.positionVersion }
              : p.position;
          })(),
        })),
      })),
    };
    const action = {
      type: "drop" as const,
      targetId,
      content,
      zone,
      sourceId,
      id: crypto.randomUUID(),
      position: sourceId ? positions.current.get(sourceId) : undefined,
    };
    const next = studyLayoutReducer(withPositions, action);
    activeId.current = next.activeId;
    // Slot contents changed; use the reducer's captured position until each reader reports its new view.
    if (!sourceId && zone === "center") positions.current.delete(targetId);
    // Opening/moving must use the captured positions, not stale initial offsets.
    dispatchLayout({ type: "replace", layout: next });
  }
  const savePanePosition = useCallback(
    (paneId: string, document: StudyDocument, pageIndex: number, y: number) => {
      positions.current.set(paneId, { documentId: document.id, pageIndex, y, positionVersion: 2 });
      // Background viewers retain their own position without overwriting the resume location.
      return activeId.current === paneId ? savePosition(document, pageIndex, y) : Promise.resolve();
    },
    [savePosition],
  );
  const rememberPanePosition = useCallback(
    (paneId: string, document: StudyDocument, pageIndex: number, y: number) => {
      positions.current.set(paneId, { documentId: document.id, pageIndex, y, positionVersion: 2 });
    },
    [],
  );
  return {
    library,
    workspace,
    activeFolder,
    chooseFolder,
    selected,
    selectedDrawing:
      library.drawings.find(
        (d) =>
          activePane.content?.kind === "drawing" &&
          d.id === activePane.content.id &&
          d.workspaceId === workspaceId,
      ) ?? null,
    reportError: setError,
    ready,
    native,
    busy,
    error,
    revision,
    chooseWorkspace,
    select,
    mutate,
    addPdf,
    layout,
    activatePane,
    splitPane,
    closePane,
    savePanePosition,
    rememberPanePosition,
    paneDocument,
    openDrawing,
    createDrawing,
    dropContent,
  };
}
