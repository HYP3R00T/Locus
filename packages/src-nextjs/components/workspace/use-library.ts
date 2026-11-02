"use client";
import { useCallback, useEffect, useState } from "react";
import {
  attachPdf,
  desktop,
  emptyLibrary,
  type Library,
  type LibraryAction,
  libraryAction,
  type StudyDocument,
} from "@/lib/library";

export function useLibrary() {
  const [library, setLibrary] = useState<Library>(emptyLibrary);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
    if (id !== workspaceId) setSelectedId(null);
    localStorage.setItem("locus-workspace", id);
  };
  async function mutate(action: LibraryAction) {
    setBusy(true);
    setError(null);
    try {
      const data = await libraryAction(action);
      setLibrary(data);
      if (action.type === "createWorkspace") {
        const added = data.workspaces.find(
          (w) => !library.workspaces.some((old) => old.id === w.id),
        );
        if (added) chooseWorkspace(added.id);
      } else if (!data.workspaces.some((w) => w.id === workspaceId)) {
        setWorkspaceId(data.workspaces[0]?.id ?? null);
        setSelectedId(null);
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
        if (added) setSelectedId(added.id);
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
  const selected =
    library.documents.find((d) => d.id === selectedId && d.workspaceId === workspaceId) ?? null;
  return {
    library,
    workspace,
    selected,
    ready,
    native,
    busy,
    error,
    revision,
    chooseWorkspace,
    select: setSelectedId,
    mutate,
    addPdf,
    savePosition,
  };
}
