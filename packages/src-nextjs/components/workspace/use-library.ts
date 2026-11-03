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
import { flushSessions, registerSessionWriter, restoreSession } from "@/lib/sessions";
import { markStartup } from "@/lib/startup-timing";
import {
  activeStudyPane,
  createStudyLayout,
  type DropZone,
  type MaterialOpenTarget,
  type PaneContent,
  type ReadingPosition,
  type StudyLayout,
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
  const sessions = useRef(new Map<string, StudyLayout>());
  function restoreWorkspace(id: string | null, data = library) {
    const next = id ? restoreSession(sessions.current.get(id), data, id) : createStudyLayout();
    activeId.current = next.activeId;
    positions.current.clear();
    dispatchLayout({ type: "replace", layout: next });
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
  const sessionTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const savedSessions = useRef(new Map<string, string>());
  const sessionState = useRef({ library, workspaceId, layout, ready, native });
  sessionState.current = { library, workspaceId, layout, ready, native };
  const persistSession = useCallback(async () => {
    clearTimeout(sessionTimer.current);
    const current = sessionState.current;
    if (
      !current.ready ||
      !current.native ||
      !current.workspaceId ||
      !current.library.workspaces.some((item) => item.id === current.workspaceId)
    )
      return;
    const snapshot = restoreSession(
      {
        ...current.layout,
        columns: current.layout.columns.map((column) => ({
          ...column,
          panes: column.panes.map((pane) => {
            const position = positions.current.get(pane.id);
            return position &&
              pane.content?.kind === "pdf" &&
              position.documentId === pane.content.id
              ? {
                  ...pane,
                  position: {
                    pageIndex: position.pageIndex,
                    y: position.y,
                    positionVersion: position.positionVersion,
                  },
                }
              : pane;
          }),
        })),
      },
      current.library,
      current.workspaceId,
    );
    sessions.current.set(current.workspaceId, snapshot);
    const serialized = JSON.stringify(snapshot);
    if (savedSessions.current.get(current.workspaceId) === serialized) return;
    await libraryAction({
      type: "saveSession",
      session: { version: 1, workspaceId: current.workspaceId, layout: snapshot },
    });
    savedSessions.current.set(current.workspaceId, serialized);
  }, []);
  const scheduleSession = useCallback(() => {
    clearTimeout(sessionTimer.current);
    sessionTimer.current = setTimeout(() => {
      void persistSession().catch((reason) =>
        setError(`Could not save your study session: ${String(reason)}`),
      );
    }, 350);
  }, [persistSession]);
  useEffect(() => {
    if (ready && native && workspaceId && layout.columns.length) scheduleSession();
    return () => clearTimeout(sessionTimer.current);
  }, [layout, workspaceId, ready, native, scheduleSession]);
  useEffect(() => registerSessionWriter(persistSession), [persistSession]);

  useEffect(() => {
    let alive = true;
    libraryAction({ type: "list" })
      .then((data) => {
        if (!alive) return;
        setLibrary(data);
        markStartup("library_ready");
        setNative(desktop());
        const saved = localStorage.getItem("locus-workspace");
        for (const session of data.sessions)
          sessions.current.set(session.workspaceId, session.layout);
        const id =
          data.workspaces.find((w) => w.id === saved)?.id ?? data.workspaces[0]?.id ?? null;
        setWorkspaceId(id);
        const restored = id
          ? restoreSession(sessions.current.get(id), data, id)
          : createStudyLayout();
        activeId.current = restored.activeId;
        dispatchLayout({ type: "replace", layout: restored });
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
    if (id !== workspaceId) {
      void persistSession().catch((reason) => setError(String(reason)));
      setWorkspaceId(id);
      restoreWorkspace(id);
    }
    localStorage.setItem("locus-workspace", id);
  };
  async function mutate(action: LibraryAction) {
    setBusy(true);
    setError(null);
    try {
      if (action.type === "removeDrawing" || action.type === "removeWorkspace")
        await Promise.all([flushDrawings(), flushSessions()]);
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
        const id = data.workspaces[0]?.id ?? null;
        setWorkspaceId(id);
        restoreWorkspace(id, data);
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
      if (document.workspaceId !== sessionState.current.workspaceId)
        return savePosition(document, pageIndex, y);
      positions.current.set(paneId, { documentId: document.id, pageIndex, y, positionVersion: 2 });
      scheduleSession();
      // Background viewers retain their own position without overwriting the resume location.
      return activeId.current === paneId ? savePosition(document, pageIndex, y) : Promise.resolve();
    },
    [savePosition, scheduleSession],
  );
  const rememberPanePosition = useCallback(
    (paneId: string, document: StudyDocument, pageIndex: number, y: number) => {
      if (document.workspaceId !== sessionState.current.workspaceId) return;
      positions.current.set(paneId, { documentId: document.id, pageIndex, y, positionVersion: 2 });
      scheduleSession();
    },
    [scheduleSession],
  );
  const expandFolder = useCallback((group: string, folderId: string | null) => {
    dispatchLayout({ type: "folders", group, folderId });
  }, []);
  return {
    expandFolder,
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
    saveLayoutSizes: (sizes: Record<string, number>, columnId?: string) => {
      dispatchLayout({
        type: "replace",
        layout: {
          ...layout,
          columns: layout.columns.map((column) => ({
            ...column,
            size: !columnId ? (sizes[column.id] ?? column.size) : column.size,
            panes: column.panes.map((pane) => ({
              ...pane,
              size: columnId === column.id ? (sizes[pane.id] ?? pane.size) : pane.size,
            })),
          })),
        },
      });
    },
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
