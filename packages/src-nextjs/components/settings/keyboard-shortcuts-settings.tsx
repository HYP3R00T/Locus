"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useWorkbench } from "@/components/workbench/workbench-context";
import {
  bindingFor,
  bindingProblem,
  COMMANDS,
  type CommandId,
  eventBinding,
  normalizeBinding,
} from "@/lib/workbench";

export function KeyboardShortcutsSettings() {
  const {
    preferences,
    updatePreferences,
    preferencesReady,
    preferencesWritable,
    setRecording,
    mac,
  } = useWorkbench();
  const [drafts, setDrafts] = useState<Partial<Record<CommandId, string>>>({});
  const [recordingId, setRecordingId] = useState<CommandId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const disabled = !preferencesReady || !preferencesWritable;
  function save(id: CommandId, value: string) {
    const problem = bindingProblem(id, value, preferences, mac);
    if (problem) {
      setError(problem);
      return;
    }
    const binding = normalizeBinding(value) ?? "";
    updatePreferences({
      ...preferences,
      keybindings: { ...preferences.keybindings, [id]: binding },
    });
    setDrafts((old) => ({ ...old, [id]: binding }));
    setError(null);
  }
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    if (!recordingId) return;
    setRecording(true);
    function keydown(event: KeyboardEvent) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.key === "Escape") {
        setRecordingId(null);
        return;
      }
      const binding = eventBinding(event);
      if (!binding || event.isComposing) return;
      if (recordingId) saveRef.current(recordingId, binding);
      setRecordingId(null);
    }
    window.addEventListener("keydown", keydown, true);
    return () => {
      setRecording(false);
      window.removeEventListener("keydown", keydown, true);
    };
  }, [recordingId, setRecording]);
  return (
    <section
      aria-labelledby="keyboard-shortcuts-heading"
      className="w-full max-w-3xl space-y-6 p-6 sm:p-10"
    >
      <div>
        <h1 id="keyboard-shortcuts-heading" className="text-lg font-medium tracking-tight">
          Key Bindings
        </h1>
        <p className="mt-2 text-xs text-muted-foreground">
          Global means anywhere in Locus. PDF and whiteboard shortcuts follow the active pane.
          Typing fields keep their normal keys; the command palette and Close Active Pane shortcuts
          remain available.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Mod means {mac ? "Command" : "Control"}. Record a shortcut or type one, such as
          Mod+Shift+P. Save an empty value to disable it.
        </p>
      </div>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      <div className="divide-y border-y">
        {COMMANDS.map((command) => (
          <form
            key={command.id}
            className="flex flex-wrap items-center gap-2 py-3"
            onSubmit={(event) => {
              event.preventDefault();
              save(command.id, drafts[command.id] ?? bindingFor(command.id, preferences));
            }}
          >
            <div className="min-w-48 flex-1 text-xs">
              <label htmlFor={`binding-${command.id}`} className="text-xs font-medium">
                {command.title}
              </label>
              <p className="text-[10px] leading-4 text-muted-foreground">
                {command.scope === "drawing"
                  ? "Whiteboard"
                  : command.scope === "pdf"
                    ? "PDF"
                    : "Global"}
              </p>
            </div>
            <input
              id={`binding-${command.id}`}
              aria-label={`Shortcut for ${command.title}`}
              className="h-7 w-40 border bg-background px-2 text-xs"
              value={drafts[command.id] ?? bindingFor(command.id, preferences)}
              disabled={disabled}
              onChange={(event) =>
                setDrafts((old) => ({ ...old, [command.id]: event.target.value }))
              }
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              className="w-24"
              title="Press a shortcut; Escape cancels recording"
              aria-pressed={recordingId === command.id}
              aria-label={`Record shortcut for ${command.title}`}
              onClick={() => setRecordingId(recordingId === command.id ? null : command.id)}
            >
              {recordingId === command.id ? "Recording…" : "Record"}
            </Button>
            <Button type="submit" variant="outline" size="sm" className="w-14" disabled={disabled}>
              Save
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              className="w-14"
              aria-label={`Reset shortcut for ${command.title}`}
              onClick={() => {
                const next = { ...preferences.keybindings };
                delete next[command.id];
                const problem = bindingProblem(
                  command.id,
                  COMMANDS.find((item) => item.id === command.id)?.binding ?? "",
                  { ...preferences, keybindings: next },
                  mac,
                );
                if (problem) {
                  setError(problem);
                  return;
                }
                updatePreferences({ ...preferences, keybindings: next });
                setDrafts((old) => {
                  const copy = { ...old };
                  delete copy[command.id];
                  return copy;
                });
                setError(null);
              }}
            >
              Reset
            </Button>
          </form>
        ))}
      </div>
      <Button
        variant="outline"
        size="sm"
        disabled={!preferencesReady}
        onClick={() => {
          updatePreferences({ ...preferences, keybindings: {} });
          setDrafts({});
          setError(null);
        }}
      >
        Reset all key bindings
      </Button>
    </section>
  );
}
