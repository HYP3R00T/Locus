import assert from "node:assert/strict";
import test from "node:test";
import {
  activeStudyPane,
  createStudyLayout,
  studyLayoutReducer as reduce,
} from "../packages/src-nextjs/lib/study-layout.ts";

test("study layouts allow two columns and two rows per column, never a fifth pane", () => {
  let layout = createStudyLayout();
  layout = reduce(layout, { type: "split", axis: "rows", id: "bottom-left" });
  layout = reduce(layout, { type: "split", axis: "columns", id: "top-right" });
  layout = reduce(layout, { type: "split", axis: "rows", id: "bottom-right" });
  assert.deepEqual(
    layout.columns.map((c) => c.panes.length),
    [2, 2],
  );
  for (const column of layout.columns) {
    for (const pane of column.panes) {
      layout = reduce(layout, { type: "activate", paneId: pane.id });
      assert.equal(reduce(layout, { type: "split", axis: "columns", id: "extra" }), layout);
      assert.equal(reduce(layout, { type: "split", axis: "rows", id: "extra" }), layout);
    }
  }
});

test("splitting preserves the original PDF and opens a fresh empty pane", () => {
  let layout = reduce(createStudyLayout(), { type: "open", content: { kind: "pdf", id: "book" } });
  const original = activeStudyPane(layout);
  layout = reduce(layout, { type: "split", axis: "columns", id: "reference" });
  assert.equal(layout.columns[0].panes[0], original);
  assert.deepEqual(activeStudyPane(layout), {
    id: "reference",
    content: null,
  });
  layout = reduce(layout, { type: "open", content: { kind: "pdf", id: "another-book" } });
  assert.equal(activeStudyPane(layout).position, undefined);
  assert.equal(layout.columns[0].panes[0].content.id, "book");
});

test("closing panes collapses empty columns, retains surviving IDs, and protects the last pane", () => {
  let layout = createStudyLayout();
  layout = reduce(layout, { type: "split", axis: "columns", id: "right" });
  layout = reduce(layout, { type: "split", axis: "rows", id: "bottom" });
  layout = reduce(layout, { type: "close", paneId: "initial-pane" });
  assert.equal(layout.columns.length, 1);
  assert.equal(layout.columns[0].id, "right");
  assert.equal(layout.activeId, "bottom");
  layout = reduce(layout, { type: "close", paneId: "bottom" });
  assert.equal(layout.activeId, "right");
  assert.equal(reduce(layout, { type: "close", paneId: "right" }), layout);
  assert.equal(reduce(layout, { type: "activate", paneId: "missing" }), layout);
  assert.deepEqual(reduce(layout, { type: "reset" }), createStudyLayout());
});

test("PDF and drawing panes swap without losing their IDs or saved positions", () => {
  let layout = reduce(createStudyLayout(), { type: "open", content: { kind: "pdf", id: "book" } });
  const position = { pageIndex: 50, y: 0.2, positionVersion: 2 };
  layout = reduce(layout, {
    type: "drop",
    targetId: "initial-pane",
    content: { kind: "pdf", id: "book" },
    zone: "center",
    id: "ignored",
    position,
  });
  layout = reduce(layout, { type: "split", axis: "columns", id: "right" });
  layout = reduce(layout, { type: "open", content: { kind: "drawing", id: "board" } });
  layout = reduce(layout, {
    type: "drop",
    targetId: "initial-pane",
    sourceId: "right",
    content: { kind: "drawing", id: "board" },
    zone: "center",
    id: "unused",
  });
  assert.equal(layout.columns[0].panes[0].id, "right");
  assert.equal(layout.columns[0].panes[0].content.kind, "drawing");
  assert.equal(layout.columns[1].panes[0].id, "initial-pane");
  assert.equal(layout.columns[1].panes[0].content.id, "book");
  assert.deepEqual(layout.columns[1].panes[0].position, position);
  assert.equal(layout.activeId, "right");
  layout = reduce(layout, { type: "activate", paneId: "initial-pane" });
  layout = reduce(layout, { type: "open", content: { kind: "drawing", id: "board" } });
  assert.equal(layout.activeId, "right");
  assert.equal(layout.columns[1].panes[0].content.kind, "pdf");
});

test("edge drops enforce the cap and never open two independent editors for one drawing", () => {
  let layout = reduce(createStudyLayout(), {
    type: "open",
    content: { kind: "drawing", id: "board" },
  });
  layout = reduce(layout, {
    type: "drop",
    targetId: "initial-pane",
    sourceId: "initial-pane",
    content: { kind: "drawing", id: "board" },
    zone: "left",
    id: "left",
  });
  assert.equal(layout.columns[0].panes[0].content.id, "board");
  assert.equal(layout.columns[1].panes[0].content, null);
  const before = layout;
  assert.equal(
    reduce(layout, {
      type: "drop",
      targetId: "left",
      content: { kind: "pdf", id: "book" },
      zone: "right",
      id: "blocked",
    }),
    before,
  );
  layout = reduce(layout, {
    type: "drop",
    targetId: "left",
    content: { kind: "pdf", id: "book" },
    zone: "bottom",
    id: "bottom",
  });
  assert.equal(layout.columns[0].panes.length, 2);
  assert.equal(layout.columns[0].panes[1].content.kind, "pdf");
});

test("closing the final document leaves an empty pane without closing the workspace", () => {
  const initial = createStudyLayout();
  let layout = reduce(initial, { type: "open", content: { kind: "pdf", id: "book" } });
  layout = reduce(layout, { type: "close", paneId: "initial-pane" });
  assert.deepEqual(layout, initial);
  assert.equal(reduce(layout, { type: "close", paneId: "initial-pane" }), layout);
});
