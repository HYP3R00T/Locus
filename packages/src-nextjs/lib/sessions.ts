import type { Library } from "@/lib/library";
import { createStudyLayout, type StudyLayout } from "@/lib/study-layout";

const writers = new Set<() => Promise<void>>();
export function registerSessionWriter(writer: () => Promise<void>) {
  writers.add(writer);
  return () => {
    writers.delete(writer);
  };
}
export async function flushSessions() {
  await Promise.all([...writers].map((writer) => writer()));
}

// Removed references leave empty slots; reopening never reattaches a deleted material.
export function restoreSession(
  layout: StudyLayout | undefined,
  library: Library,
  workspaceId: string,
): StudyLayout {
  if (!layout) return createStudyLayout();
  const drawings = new Set<string>();
  const columns = layout.columns.map((column) => ({
    ...column,
    panes: column.panes.map((pane) => {
      const content = pane.content;
      const valid =
        !content ||
        (content.kind === "pdf"
          ? library.documents.some(
              (item) => item.id === content.id && item.workspaceId === workspaceId,
            )
          : !drawings.has(content.id) &&
            library.drawings.some(
              (item) => item.id === content.id && item.workspaceId === workspaceId,
            ));
      if (content?.kind === "drawing" && valid) drawings.add(content.id);
      if (!valid) return { ...pane, content: null, position: undefined };
      const position = content?.kind === "pdf" ? pane.position : undefined;
      return {
        ...pane,
        position: position
          ? {
              pageIndex: position.pageIndex,
              y: position.y,
              positionVersion: position.positionVersion,
            }
          : undefined,
      };
    }),
  }));
  return { ...layout, columns };
}
