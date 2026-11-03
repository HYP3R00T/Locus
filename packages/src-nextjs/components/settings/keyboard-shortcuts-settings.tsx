"use client";

import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, PencilIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSettingsView } from "@/components/settings/settings-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useWorkbench } from "@/components/workbench/workbench-context";
import {
  bindingFor,
  bindingProblem,
  COMMANDS,
  type CommandId,
  eventBinding,
  type ShortcutSort,
  shortcutWhen,
  sortedCommands,
} from "@/lib/workbench";

function Keybinding({ value, mac }: { value: string; mac: boolean }) {
  if (!value) return <span className="text-muted-foreground">Not assigned</span>;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {value.split("+").map((key) => (
        <kbd
          key={key}
          className="rounded-sm border bg-muted/40 px-1.5 py-0.5 text-[11px] font-normal"
        >
          {key === "Mod" ? (mac ? "⌘" : "Ctrl") : key}
        </kbd>
      ))}
    </span>
  );
}

export function KeyboardShortcutsSettings() {
  const { visible, section, query } = useSettingsView();
  const {
    preferences,
    updatePreferences,
    preferencesReady,
    preferencesWritable,
    setRecording,
    mac,
  } = useWorkbench();
  const [sort, setSort] = useState<{ column: ShortcutSort; direction: "asc" | "desc" }>({
    column: "command",
    direction: "asc",
  });
  const [editingId, setEditingId] = useState<CommandId | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const disabled = !preferencesReady || !preferencesWritable;
  const editing = COMMANDS.find((command) => command.id === editingId);
  useEffect(() => {
    if (!editingId) return;
    setRecording(true);
    return () => setRecording(false);
  }, [editingId, setRecording]);
  function edit(id: CommandId) {
    if (disabled) return;
    setDraft(bindingFor(id, preferences));
    setError(null);
    setEditingId(id);
  }
  function save(value: string, reset = false) {
    if (!editing || disabled) return;
    const bindings = { ...preferences.keybindings };
    if (reset) delete bindings[editing.id];
    else bindings[editing.id] = value;
    const next = { ...preferences, keybindings: bindings };
    const problem = bindingProblem(editing.id, bindingFor(editing.id, next), next, mac);
    if (problem) {
      setError(problem);
      return;
    }
    updatePreferences(next);
    setEditingId(null);
  }
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Double-click a command or use its edit button to change the shortcut. When shows its
        context; actions must also be available.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-xs">
          <caption className="sr-only">Keyboard shortcuts and their activation contexts</caption>
          <thead className="border-b bg-muted/30">
            <tr>
              {(
                [
                  ["command", "Command"],
                  ["binding", "Keybinding"],
                  ["when", "When"],
                  ["source", "Source"],
                ] as const
              ).map(([column, title]) => (
                <th
                  key={column}
                  scope="col"
                  aria-sort={
                    sort.column === column
                      ? sort.direction === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                  className="px-3 py-2 font-medium"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto gap-1 px-0 py-0"
                    aria-label={`Sort by ${title}`}
                    onClick={() =>
                      setSort((current) => ({
                        column,
                        direction:
                          current.column === column && current.direction === "asc" ? "desc" : "asc",
                      }))
                    }
                  >
                    {title}
                    {sort.column !== column ? (
                      <ArrowUpDownIcon />
                    ) : sort.direction === "asc" ? (
                      <ArrowUpIcon />
                    ) : (
                      <ArrowDownIcon />
                    )}
                  </Button>
                </th>
              ))}
              <th scope="col">
                <span className="sr-only">Edit</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedCommands(preferences, mac, sort.column, sort.direction)
              .filter((command) => visible.has(`shortcut.${command.id}`))
              .map((command) => {
                const binding = bindingFor(command.id, preferences);
                const custom = Object.hasOwn(preferences.keybindings, command.id);
                return (
                  <tr
                    key={command.id}
                    className="group border-b border-border/50 even:bg-muted/15 focus-within:bg-accent hover:bg-accent"
                    onDoubleClick={() => edit(command.id)}
                  >
                    <td className="px-3 py-2">
                      <span className="font-medium">{command.title}</span>
                    </td>
                    <td className="px-3 py-2">
                      {!binding && custom ? (
                        <span className="text-muted-foreground">Disabled</span>
                      ) : (
                        <Keybinding value={binding} mac={mac} />
                      )}
                    </td>
                    <td className="max-w-64 px-3 py-2 text-muted-foreground">
                      {shortcutWhen(command.id)}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {custom ? "Custom" : "Default"}
                    </td>
                    <td className="px-2 py-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={disabled}
                        aria-label={`Edit shortcut for ${command.title}`}
                        onClick={() => edit(command.id)}
                      >
                        <PencilIcon />
                      </Button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
      {section === "keybindings" && !query.trim() && (
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => updatePreferences({ ...preferences, keybindings: {} })}
        >
          Reset all key bindings
        </Button>
      )}
      <Dialog
        open={!!editingId}
        onOpenChange={(open) => {
          if (!open) setEditingId(null);
        }}
      >
        <DialogContent initialFocus={input}>
          <DialogHeader>
            <DialogTitle>{editing?.title ?? "Edit shortcut"}</DialogTitle>
            <DialogDescription>
              Press the desired key combination, then Enter to save. Escape cancels.
            </DialogDescription>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            When: {editing && shortcutWhen(editing.id)}
          </p>
          <Input
            ref={input}
            aria-label="Record keybinding"
            readOnly
            value={draft.replace(/^Mod\+/, mac ? "Meta+" : "Ctrl+")}
            placeholder="Press a key combination"
            className="text-center"
            onKeyDown={(event) => {
              if (
                event.nativeEvent.isComposing ||
                event.key === "Escape" ||
                (event.key === "Tab" && !event.ctrlKey && !event.altKey && !event.metaKey)
              )
                return;
              event.preventDefault();
              event.stopPropagation();
              if (
                event.key === "Enter" &&
                !event.ctrlKey &&
                !event.metaKey &&
                !event.altKey &&
                !event.shiftKey
              ) {
                save(draft);
                return;
              }
              const binding = eventBinding(event.nativeEvent);
              if (binding) {
                setDraft(binding);
                setError(null);
              }
            }}
          />
          <div aria-live="polite" className="min-h-7 text-center">
            <Keybinding value={draft} mac={mac} />
          </div>
          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" disabled={disabled} onClick={() => save("", true)}>
              Reset to default
            </Button>
            <Button variant="ghost" size="sm" disabled={disabled} onClick={() => save("")}>
              Remove binding
            </Button>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingId(null)}>
              Cancel
            </Button>
            <Button disabled={disabled} onClick={() => save(draft)}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
