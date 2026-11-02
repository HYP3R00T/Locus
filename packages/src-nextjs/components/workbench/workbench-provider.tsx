"use client";

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  type CommandHandler,
  type MaterialOption,
  WorkbenchContext,
  type WorkbenchInfo,
} from "@/components/workbench/workbench-context";
import {
  bindingFor,
  COMMANDS,
  type CommandId,
  commandsForScope,
  DEFAULT_PREFERENCES,
  eventBinding,
  LEGACY_PREFERENCES_KEY,
  PREFERENCES_KEY,
  type Preferences,
  parsePreferences,
  platformBinding,
} from "@/lib/workbench";

export function WorkbenchProvider({ children }: { children: ReactNode }) {
  const [info, setInfo] = useState<WorkbenchInfo>({ activeId: null, scope: null, columns: [] });
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [preferencesWritable, setPreferencesWritable] = useState(true);
  const [preferenceError, setPreferenceError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [mac, setMac] = useState(false);
  const [open, setOpen] = useState(false);
  const [paletteSession, setPaletteSession] = useState(0);
  const [mode, setMode] = useState<"commands" | "materials">("commands");
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [commandError, setCommandError] = useState<string | null>(null);
  const registry = useRef(
    new Map<string, React.RefObject<Partial<Record<CommandId, CommandHandler>>>>(),
  );
  const [, setRevision] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const focusBeforePalette = useRef<HTMLElement | null>(null);
  const ranCommand = useRef(false);
  const pendingCommand = useRef<(() => void) | null>(null);
  const register = useCallback(
    (owner: string, handlers: React.RefObject<Partial<Record<CommandId, CommandHandler>>>) => {
      registry.current.set(owner, handlers);
      setRevision((value) => value + 1);
      return () => {
        if (registry.current.get(owner) === handlers) registry.current.delete(owner);
        setRevision((value) => value + 1);
      };
    },
    [],
  );
  useEffect(() => {
    const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
    setMac(isMac);
    try {
      const current = localStorage.getItem(PREFERENCES_KEY);
      const raw = current ?? localStorage.getItem(LEGACY_PREFERENCES_KEY);
      if (raw) {
        const loaded = parsePreferences(raw, isMac);
        setPreferences(loaded);
        if (!current || JSON.parse(raw).version === 1)
          localStorage.setItem(PREFERENCES_KEY, JSON.stringify(loaded));
      }
    } catch (error) {
      setPreferencesWritable(false);
      setPreferenceError(String(error));
    }
    setPreferencesReady(true);
  }, []);
  function updatePreferences(value: Preferences) {
    if (!preferencesReady || !preferencesWritable) return;
    try {
      const validated = parsePreferences(JSON.stringify(value), mac);
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(validated));
      setPreferences(validated);
      setPreferenceError(null);
    } catch (error) {
      setPreferenceError(`Preferences were not saved: ${String(error)}`);
    }
  }
  function resetPreferences() {
    try {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(DEFAULT_PREFERENCES));
      setPreferences(DEFAULT_PREFERENCES);
      setPreferencesWritable(true);
      setPreferenceError(null);
    } catch (error) {
      setPreferenceError(String(error));
    }
  }
  function handler(id: CommandId) {
    const command = COMMANDS.find((item) => item.id === id);
    if (!command || (command.scope !== "global" && command.scope !== info.scope)) return undefined;
    return registry.current.get(command.scope === "global" ? "app" : (info.activeId ?? ""))
      ?.current[id];
  }
  function enabled(id: CommandId) {
    if (id === "palette") return true;
    if (id === "material.open") return materials.length > 0;
    if (id === "drawing.controls")
      return info.scope === "drawing" && preferencesReady && preferencesWritable;
    const command = handler(id);
    return !!command && command.enabled !== false;
  }
  function showPalette(nextMode: "commands" | "materials") {
    if (!open)
      focusBeforePalette.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
    pendingCommand.current = null;
    ranCommand.current = false;
    setPaletteSession((value) => value + 1);
    setMode(nextMode);
    setOpen(true);
  }
  function execute(action: () => unknown) {
    const run = () => {
      void Promise.resolve()
        .then(action)
        .catch((error) => setCommandError(String(error)));
    };
    setCommandError(null);
    if (open) {
      ranCommand.current = true;
      pendingCommand.current = run;
      setOpen(false);
    } else run();
  }
  const paletteInputRef = useCallback((node: HTMLInputElement | null) => {
    input.current = node;
    node?.focus();
  }, []);
  function perform(id: CommandId) {
    if (!enabled(id)) return;
    if (id === "palette") {
      if (open) setOpen(false);
      else showPalette("commands");
      return;
    }
    if (id === "material.open") {
      showPalette("materials");
      return;
    }
    if (id === "pane.close" && open) {
      pendingCommand.current = null;
      setOpen(false);
      return;
    }
    if (id === "drawing.controls") {
      execute(() =>
        updatePreferences({
          ...preferences,
          whiteboardControlsVisible: !preferences.whiteboardControlsVisible,
        }),
      );
      return;
    }
    const command = handler(id);
    if (command) execute(command.run);
  }

  const live = useRef({ preferences, mac, recording, open, enabled, perform, scope: info.scope });
  live.current = { preferences, mac, recording, open, enabled, perform, scope: info.scope };
  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      const current = live.current;
      if (current.recording || event.isComposing || event.defaultPrevented) return;
      const pressed = eventBinding(event);
      if (!pressed) return;
      const editable =
        (event.target instanceof HTMLElement && event.target.isContentEditable) ||
        (event.target instanceof Element &&
          !!event.target.closest('input, textarea, select, [role="textbox"]'));
      const command = commandsForScope(current.scope).find(
        (item) =>
          (!current.open || item.id === "palette" || item.id === "pane.close") &&
          (!editable ||
            item.id === "palette" ||
            item.id === "pane.close" ||
            item.id === "drawing.controls") &&
          current.enabled(item.id) &&
          pressed === platformBinding(bindingFor(item.id, current.preferences), current.mac),
      );
      if (!command) return;
      event.preventDefault();
      event.stopPropagation();
      current.perform(command.id);
    }
    window.addEventListener("keydown", keydown, true);
    return () => window.removeEventListener("keydown", keydown, true);
  }, []);
  return (
    <WorkbenchContext.Provider
      value={{
        info,
        setInfo,
        preferences,
        updatePreferences,
        resetPreferences,
        preferenceError,
        preferencesReady,
        preferencesWritable,
        recording,
        setRecording,
        mac,
        perform,
        enabled,
        register,
        setMaterials,
      }}
    >
      {children}
      {commandError && (
        <div
          role="alert"
          className="fixed right-4 bottom-4 z-50 max-w-sm border bg-background p-3 text-xs text-destructive"
        >
          {commandError}
        </div>
      )}
      <Dialog
        onOpenChangeComplete={(visible) => {
          if (!visible) {
            const run = pendingCommand.current;
            pendingCommand.current = null;
            run?.();
          }
        }}
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          if (!value) setRecording(false);
        }}
      >
        <DialogContent
          placement="upper"
          className="gap-0 overflow-hidden p-0 sm:max-w-xl"
          initialFocus={input}
          finalFocus={() => (ranCommand.current ? false : focusBeforePalette.current)}
          showCloseButton={false}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>{mode === "materials" ? "Open Material" : "Command Palette"}</DialogTitle>
            <DialogDescription>
              Search commands for the active pane or open a study material.
            </DialogDescription>
          </DialogHeader>
          <Command key={`${mode}:${paletteSession}`}>
            <CommandInput
              ref={paletteInputRef}
              placeholder={mode === "materials" ? "Search materials…" : "Type a command…"}
              aria-label="Search commands"
            />
            <CommandList>
              <CommandEmpty>No matching {mode}.</CommandEmpty>
              {mode === "commands" ? (
                <CommandGroup
                  heading={
                    info.scope
                      ? `Commands · active ${info.scope === "drawing" ? "whiteboard" : "PDF"} pane`
                      : "Commands"
                  }
                >
                  {commandsForScope(info.scope).map((command) => (
                    <CommandItem
                      key={command.id}
                      value={command.title}
                      disabled={!enabled(command.id)}
                      onSelect={() => perform(command.id)}
                    >
                      {command.title}
                      <CommandShortcut>
                        {bindingFor(command.id, preferences).replace("Mod", mac ? "⌘" : "Ctrl")}
                      </CommandShortcut>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : (
                <CommandGroup heading="Workspace materials">
                  {materials.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={`${item.title} ${item.id}`}
                      onSelect={() => {
                        execute(item.open);
                      }}
                    >
                      {item.title}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </WorkbenchContext.Provider>
  );
}
