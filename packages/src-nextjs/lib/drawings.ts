import { invoke } from "@tauri-apps/api/core";

// Keep pending edits across pane moves/remounts. Writes to each drawing stay ordered.
const saves = new Map<string, { scene: string; dirty: boolean; pending: Promise<void> }>();
const writers = new Set<() => Promise<void>>();
export function registerDrawingWriter(writer: () => Promise<void>) {
  writers.add(writer);
  return () => {
    writers.delete(writer);
  };
}
export async function flushDrawings() {
  await Promise.all([...writers].map((writer) => writer()));
  await Promise.all(
    [...saves].map(async ([id, entry]) => {
      await entry.pending.catch(() => {});
      const latest = saves.get(id);
      if (latest?.dirty) await saveDrawing(id, latest.scene);
    }),
  );
}
export async function readDrawing(id: string): Promise<string> {
  const saved = saves.get(id);
  if (saved?.dirty) return saved.scene;
  await saved?.pending;
  return invoke<string>("read_drawing", { drawingId: id });
}
export function saveDrawing(id: string, scene: string): Promise<void> {
  const previous = saves.get(id);
  const entry = { scene, dirty: true, pending: Promise.resolve() };
  const result = (previous?.pending ?? Promise.resolve())
    .catch(() => {})
    .then(() => invoke<void>("save_drawing", { drawingId: id, scene }))
    .then(() => {
      entry.dirty = false;
    });
  entry.pending = result;
  saves.set(id, entry);
  return result;
}
