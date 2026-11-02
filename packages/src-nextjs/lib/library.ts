import { invoke, isTauri } from "@tauri-apps/api/core";

export type Workspace = { id: string; title: string };
export type Folder = { id: string; workspaceId: string; title: string };
export type StudyDocument = {
  id: string;
  workspaceId: string;
  folderId: string | null;
  title: string;
  path: string;
  pageIndex: number;
  y: number;
  positionVersion: number;
};
export type Drawing = { id: string; workspaceId: string; title: string };
export type Library = {
  workspaces: Workspace[];
  folders: Folder[];
  documents: StudyDocument[];
  drawings: Drawing[];
};
export const emptyLibrary: Library = { workspaces: [], folders: [], documents: [], drawings: [] };
export type LibraryAction =
  | { type: "list" }
  | { type: "createDrawing"; workspaceId: string; title: string }
  | { type: "renameDrawing"; drawingId: string; title: string }
  | { type: "removeDrawing"; drawingId: string }
  | { type: "createWorkspace"; title: string }
  | { type: "removeWorkspace"; workspaceId: string }
  | { type: "createFolder"; workspaceId: string; title: string }
  | { type: "removeFolder"; folderId: string }
  | { type: "removeDocument"; workspaceId: string; documentId: string }
  | { type: "renameDocument"; workspaceId: string; documentId: string; title: string }
  | { type: "moveDocument"; workspaceId: string; documentId: string; folderId: string | null }
  | { type: "renameFolder"; folderId: string; title: string }
  | { type: "renameWorkspace"; workspaceId: string; title: string }
  | { type: "savePosition"; workspaceId: string; documentId: string; pageIndex: number; y: number };

// Serialize metadata writes so a final reading-position save cannot overtake
// a later rename, move, or removal. Rust remains the only library implementation.
let pendingAction: Promise<unknown> = Promise.resolve();
export function libraryAction(action: LibraryAction): Promise<Library> {
  if (!isTauri()) {
    return action.type === "list"
      ? Promise.resolve(emptyLibrary)
      : Promise.reject(new Error("Library operations require the Locus desktop app."));
  }
  const result = pendingAction.then(() => invoke<Library>("library_action", { action }));
  pendingAction = result.catch(() => {});
  return result;
}
export function attachPdf(
  workspaceId: string,
  folderId: string | null,
  relinkDocumentId: string | null = null,
): Promise<Library | null> {
  return invoke("attach_pdf", { workspaceId, folderId, relinkDocumentId });
}
export const desktop = isTauri;
