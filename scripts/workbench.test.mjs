import assert from "node:assert/strict";
import test from "node:test";
import {
  bindingFor,
  bindingProblem,
  commandsForScope,
  DEFAULT_PREFERENCES,
  eventBinding,
  normalizeBinding,
  parsePreferences,
  platformBinding,
} from "../packages/src-nextjs/lib/workbench.ts";

test("pane-scoped commands never leak between PDFs and drawing canvases", () => {
  const pdf = commandsForScope("pdf").map((c) => c.id);
  const drawing = commandsForScope("drawing").map((c) => c.id);
  assert.ok(pdf.includes("pdf.page"));
  assert.ok(!drawing.includes("pdf.page"));
  assert.ok(drawing.includes("drawing.controls"));
  assert.ok(!pdf.includes("drawing.controls"));
  assert.ok(commandsForScope(null).every((c) => c.scope === "global"));
  assert.ok(pdf.includes("layout.vertical") && drawing.includes("layout.vertical"));
});

test("shortcuts normalize modifiers and shifted punctuation consistently", () => {
  assert.equal(normalizeBinding("shift+ctrl+p"), "Ctrl+Shift+P");
  assert.equal(platformBinding("Mod+Shift+P", false), "Ctrl+Shift+P");
  assert.equal(platformBinding("Mod+Shift+P", true), "Meta+Shift+P");
  assert.equal(
    eventBinding({
      key: "|",
      code: "Backslash",
      ctrlKey: true,
      metaKey: false,
      altKey: false,
      shiftKey: true,
    }),
    "Ctrl+Shift+\\",
  );
  for (const invalid of ["Ctrl+", "Ctrl+Ctrl+A", "Mod+Ctrl+A", "Shift", "nonsense", "Mod+Hyper+A"])
    assert.equal(normalizeBinding(invalid), null);
  assert.equal(normalizeBinding(""), "");
});

test("global conflicts are rejected while independent pane scopes can share a key", () => {
  assert.match(
    bindingProblem("whiteboard.new", "Ctrl+B", DEFAULT_PREFERENCES, false),
    /Primary Navigation/,
  );
  assert.equal(bindingProblem("whiteboard.new", "Ctrl+B", DEFAULT_PREFERENCES, true), null);
  assert.match(bindingProblem("whiteboard.new", "P", DEFAULT_PREFERENCES, false), /modifier/);
  const prefs = { ...DEFAULT_PREFERENCES, keybindings: { "drawing.controls": "Alt+W" } };
  assert.equal(bindingProblem("drawing.controls", "Alt+W", prefs, false), null);
  assert.match(bindingProblem("pdf.fitHeight", "Alt+W", prefs, false), /Fit to Width/);
  assert.equal(bindingProblem("palette", "", DEFAULT_PREFERENCES, false), null);
});

test("preferences survive serialization, preserve disabled bindings, and reject unsupported data", () => {
  const preferences = {
    version: 2,
    whiteboardControlsVisible: true,
    keybindings: { "layout.horizontal": "Alt+S", "pdf.page": "" },
  };
  const loaded = parsePreferences(JSON.stringify(preferences));
  assert.deepEqual(loaded, preferences);
  assert.equal(bindingFor("pdf.page", loaded), "");
  assert.equal(bindingFor("palette", loaded), "Mod+Shift+P");
  assert.throws(() => parsePreferences('{"version":3}'), /Unsupported/);
  assert.throws(() => parsePreferences("invalid"));
  assert.throws(
    () =>
      parsePreferences(
        JSON.stringify({ ...preferences, keybindings: { "whiteboard.new": "Mod+B" } }),
      ),
    /Already assigned/,
  );
});

test("legacy drawing preferences migrate without hiding the full canvas UI or losing custom shortcuts", () => {
  const legacy = {
    version: 1,
    whiteboardProperties: false,
    keybindings: { "drawing.properties": "Alt+U", "pane.close": "Alt+Shift+W" },
  };
  const migrated = parsePreferences(JSON.stringify(legacy));
  assert.equal(migrated.version, 2);
  assert.equal(migrated.whiteboardControlsVisible, true);
  assert.equal(bindingFor("drawing.controls", migrated), "Alt+U");
  assert.equal(bindingFor("pane.close", migrated), "Alt+Shift+W");
  assert.equal(bindingFor("pane.close", DEFAULT_PREFERENCES), "Mod+W");
});

test("upgrading preserves an existing custom Ctrl+W assignment", () => {
  const migrated = parsePreferences(
    JSON.stringify({
      version: 1,
      whiteboardProperties: true,
      keybindings: { "whiteboard.new": "Mod+W" },
    }),
  );
  assert.equal(bindingFor("whiteboard.new", migrated), "Mod+W");
  assert.equal(bindingFor("pane.close", migrated), "Alt+Shift+W");
});
