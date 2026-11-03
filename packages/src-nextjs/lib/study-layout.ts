export type MaterialOpenTarget = "active" | "right" | "bottom";
export function materialOpenTarget(event: {
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}): MaterialOpenTarget {
  return event.ctrlKey || event.metaKey ? (event.shiftKey ? "bottom" : "right") : "active";
}
export type ReadingPosition = { pageIndex: number; y: number; positionVersion: number };
export type PaneContent = { kind: "pdf" | "drawing"; id: string };
export type DropZone = "center" | "left" | "right" | "top" | "bottom";
export type StudyPane = {
  id: string;
  content: PaneContent | null;
  position?: ReadingPosition;
};
export type StudyColumn = { id: string; panes: StudyPane[] };
export type StudyLayout = { columns: StudyColumn[]; activeId: string };
export type StudyLayoutAction =
  | { type: "reset" }
  | { type: "replace"; layout: StudyLayout }
  | { type: "activate"; paneId: string }
  | { type: "open"; content: PaneContent }
  | {
      type: "openSplit";
      content: PaneContent;
      target: "right" | "bottom";
      id: string;
      primaryColumn?: "left" | "right";
      primaryRow?: "top" | "bottom";
    }
  | {
      type: "drop";
      targetId: string;
      sourceId?: string;
      content: PaneContent;
      zone: DropZone;
      id: string;
      position?: ReadingPosition;
    }
  | { type: "split"; axis: "columns" | "rows"; id: string }
  | { type: "close"; paneId: string };

export function createStudyLayout(): StudyLayout {
  return {
    columns: [{ id: "initial-column", panes: [{ id: "initial-pane", content: null }] }],
    activeId: "initial-pane",
  };
}

export function activeStudyPane(layout: StudyLayout) {
  const pane = layout.columns
    .flatMap((column) => column.panes)
    .find((pane) => pane.id === layout.activeId);
  if (!pane) throw new Error("Study layout has no active pane.");
  return pane;
}

export function studyLayoutReducer(layout: StudyLayout, action: StudyLayoutAction): StudyLayout {
  if (action.type === "reset") return createStudyLayout();
  if (action.type === "replace") return action.layout;
  const column = layout.columns.find((entry) => entry.panes.some((p) => p.id === layout.activeId));
  if (!column) throw new Error("Study layout has no active column.");
  const active = activeStudyPane(layout);
  switch (action.type) {
    case "activate":
      return layout.columns.some((c) => c.panes.some((p) => p.id === action.paneId))
        ? { ...layout, activeId: action.paneId }
        : layout;
    case "openSplit": {
      // A whiteboard has one live editor. Focus it instead of duplicating or moving it.
      if (
        action.content.kind === "drawing" &&
        layout.columns.some((c) =>
          c.panes.some((p) => p.content?.kind === "drawing" && p.content.id === action.content.id),
        )
      )
        return studyLayoutReducer(layout, { type: "open", content: action.content });
      if (!active.content)
        return studyLayoutReducer(layout, { type: "open", content: action.content });
      const vertical = action.target === "right";
      const secondaryColumn = action.primaryColumn === "right" ? 0 : 1;
      const secondaryRow = action.primaryRow === "bottom" ? 0 : 1;
      const destination = vertical
        ? layout.columns[secondaryColumn]?.panes[
            Math.min(
              column.panes.indexOf(active),
              (layout.columns[secondaryColumn]?.panes.length ?? 1) - 1,
            )
          ]
        : column.panes[secondaryRow];
      const hasSplit = vertical ? layout.columns.length === 2 : column.panes.length === 2;
      if (hasSplit && destination) {
        return studyLayoutReducer(
          { ...layout, activeId: destination.id },
          { type: "open", content: action.content },
        );
      }
      return studyLayoutReducer(layout, {
        type: "drop",
        targetId: active.id,
        content: action.content,
        id: action.id,
        zone: vertical
          ? action.primaryColumn === "right"
            ? "left"
            : "right"
          : action.primaryRow === "bottom"
            ? "top"
            : "bottom",
      });
    }
    case "open": {
      const existing =
        action.content.kind === "drawing"
          ? layout.columns
              .flatMap((c) => c.panes)
              .find((p) => p.content?.kind === "drawing" && p.content.id === action.content.id)
          : undefined;
      if (existing) return { ...layout, activeId: existing.id };
      return {
        ...layout,
        columns: layout.columns.map((c) => ({
          ...c,
          panes: c.panes.map((p) =>
            p.id === active.id
              ? p.content?.kind === action.content.kind && p.content.id === action.content.id
                ? p
                : { id: p.id, content: action.content }
              : p,
          ),
        })),
      };
    }
    case "drop": {
      const targetColumn = layout.columns.find((c) =>
        c.panes.some((p) => p.id === action.targetId),
      );
      const target = targetColumn?.panes.find((p) => p.id === action.targetId);
      if (!targetColumn || !target) return layout;
      const source = layout.columns
        .flatMap((c) => c.panes)
        .find(
          (p) =>
            p.id === action.sourceId ||
            (action.content.kind === "drawing" &&
              p.content?.kind === "drawing" &&
              p.content.id === action.content.id),
        );
      if (action.zone === "center") {
        if (source?.id === target.id) return { ...layout, activeId: target.id };
        return {
          ...layout,
          activeId: source?.id ?? target.id,
          columns: layout.columns.map((c) => ({
            ...c,
            panes: c.panes.map((p) =>
              p.id === target.id
                ? (source ?? { id: p.id, content: action.content, position: action.position })
                : p.id === source?.id
                  ? target
                  : p,
            ),
          })),
        };
      }
      const columns = action.zone === "left" || action.zone === "right";
      if (columns ? layout.columns.length >= 2 : targetColumn.panes.length >= 2) return layout;
      const pane: StudyPane = {
        id: action.id,
        content: action.content,
        position: action.position ?? source?.position,
      };
      const before = action.zone === "left" || action.zone === "top";
      const nextColumns = layout.columns.map((c) => ({
        ...c,
        panes: c.panes.map((p) =>
          action.content.kind === "drawing" && p.id === source?.id
            ? { id: p.id, content: null }
            : p,
        ),
      }));
      if (columns)
        nextColumns.splice(before ? 0 : nextColumns.length, 0, { id: action.id, panes: [pane] });
      else {
        const nextColumn = nextColumns.find((c) => c.id === targetColumn.id);
        if (!nextColumn) return layout;
        nextColumn.panes.splice(before ? 0 : nextColumn.panes.length, 0, pane);
      }
      return { columns: nextColumns, activeId: pane.id };
    }
    case "split": {
      if (action.axis === "columns" ? layout.columns.length >= 2 : column.panes.length >= 2)
        return layout;
      const pane = {
        id: action.id,
        content: null,
      };
      return {
        activeId: pane.id,
        columns:
          action.axis === "columns"
            ? [...layout.columns, { id: action.id, panes: [pane] }]
            : layout.columns.map((c) =>
                c.id === column.id ? { ...c, panes: [...c.panes, pane] } : c,
              ),
      };
    }
    case "close": {
      if (layout.columns.flatMap((c) => c.panes).length === 1) {
        if (active.id !== action.paneId || !active.content) return layout;
        return { ...layout, columns: [{ ...column, panes: [{ id: active.id, content: null }] }] };
      }
      const columns = layout.columns
        .map((c) => ({ ...c, panes: c.panes.filter((p) => p.id !== action.paneId) }))
        .filter((c) => c.panes.length > 0);
      return {
        columns,
        activeId:
          active.id === action.paneId
            ? (columns.find((c) => c.id === column.id)?.panes[0].id ?? columns[0].panes[0].id)
            : active.id,
      };
    }
  }
}
