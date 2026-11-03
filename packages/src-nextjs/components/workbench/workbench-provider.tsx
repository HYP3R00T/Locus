"use client";

import { ArrowLeftIcon, MonitorIcon } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { useConfiguration } from "@/components/configuration-provider";
import { Button } from "@/components/ui/button";
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
import { ActionTooltip } from "@/components/workbench/action-tooltip";
import {
  type CommandHandler,
  type MaterialOption,
  WorkbenchContext,
  type WorkbenchInfo,
} from "@/components/workbench/workbench-context";
import { useNotice } from "@/lib/notifications";
import {
  bindingFor,
  COMMAND_GROUPS,
  COMMANDS,
  type CommandId,
  commandGroup,
  commandsForScope,
  eventBinding,
  platformBinding,
} from "@/lib/workbench";

export function WorkbenchProvider({ children }: { children: ReactNode }) {
  const [info, setInfo] = useState<WorkbenchInfo>({ activeId: null, scope: null, columns: [] });
  const {
    preferences,
    updatePreferences,
    ready: preferencesReady,
    writable: preferencesWritable,
    error: preferenceError,
    appearance,
    themes,
    selectTheme,
    previewTheme,
  } = useConfiguration();
  const [recording, setRecording] = useState(false);
  const [mac, setMac] = useState(false);
  const [open, setOpen] = useState(false);
  const [themeCursor, setThemeCursor] = useState("");
  const [paletteSession, setPaletteSession] = useState(0);
  const [mode, setMode] = useState<"commands" | "materials" | "themes">("commands");
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
    setMac(/Mac|iPhone|iPad/.test(navigator.platform));
  }, []);
  function handler(id: CommandId) {
    const command = COMMANDS.find((item) => item.id === id);
    if (!command || (command.scope !== "global" && command.scope !== info.scope)) return undefined;
    return registry.current.get(command.scope === "global" ? "app" : (info.activeId ?? ""))
      ?.current[id];
  }
  function enabled(id: CommandId) {
    if (id === "palette") return true;
    if (id === "material.open") return materials.length > 0;
    if (id === "theme.select") return preferencesReady && preferencesWritable;
    const command = handler(id);
    return !!command && command.enabled !== false;
  }
  function showPalette(nextMode: "commands" | "materials" | "themes") {
    if (!open)
      focusBeforePalette.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
    pendingCommand.current = null;
    ranCommand.current = false;
    setPaletteSession((value) => value + 1);
    if (nextMode === "themes") setThemeCursor(appearance.theme);
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
  useEffect(() => {
    // A committed choice keeps its preview until the asynchronous save finishes.
    if (mode !== "themes" || (!open && !pendingCommand.current)) previewTheme(null);
  }, [open, mode, previewTheme]);
  function chooseTheme(id: string) {
    execute(async () => {
      try {
        if (!(await selectTheme(id)))
          throw new Error("Theme was not saved. Check Configuration in Settings.");
      } finally {
        previewTheme(null);
        focusBeforePalette.current?.focus({ preventScroll: true });
      }
    });
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
    if (id === "theme.select") {
      showPalette("themes");
      return;
    }
    if (id === "pane.close" && open) {
      pendingCommand.current = null;
      setOpen(false);
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
  useNotice(commandError, "Command failed");
  return (
    <WorkbenchContext.Provider
      value={{
        info,
        setInfo,
        preferences,
        updatePreferences,
        preferenceError,
        preferencesReady,
        preferencesWritable,
        recording,
        setRecording,
        mac,
        perform,
        enabled,
        pressed: (id) => handler(id)?.pressed ?? false,
        register,
        setMaterials,
      }}
    >
      {children}
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
            <DialogTitle>
              {mode === "materials"
                ? "Open Material"
                : mode === "themes"
                  ? "Color Theme"
                  : "Command Palette"}
            </DialogTitle>
            <DialogDescription>
              {mode === "themes"
                ? "Browse to preview. Enter saves the theme; Escape restores your saved theme."
                : mode === "materials"
                  ? "Search your workspace materials."
                  : "Search commands for the active pane."}
            </DialogDescription>
          </DialogHeader>
          <Command
            key={`${mode}:${paletteSession}`}
            value={mode === "themes" ? themeCursor : undefined}
            onValueChange={
              mode === "themes"
                ? (id) => {
                    setThemeCursor(id);
                    previewTheme(
                      id === "system" || themes.some((theme) => theme.id === id) ? id : null,
                    );
                  }
                : undefined
            }
          >
            <div className="flex items-center border-b">
              {mode === "themes" && (
                <ActionTooltip label="Back to commands">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="ml-1 shrink-0"
                    aria-label="Back to commands"
                    onClick={() => showPalette("commands")}
                  >
                    <ArrowLeftIcon />
                  </Button>
                </ActionTooltip>
              )}
              <div className="min-w-0 flex-1 [&_[data-slot=command-input-wrapper]]:border-0">
                <CommandInput
                  ref={paletteInputRef}
                  placeholder={
                    mode === "materials"
                      ? "Search materials…"
                      : mode === "themes"
                        ? "Search themes…"
                        : "Type a command…"
                  }
                  aria-label={
                    mode === "themes"
                      ? "Search themes"
                      : mode === "materials"
                        ? "Search materials"
                        : "Search commands"
                  }
                />
              </div>
            </div>
            <CommandList
              className={
                mode === "themes"
                  ? "max-h-[min(24rem,60vh)] [&_[cmdk-item]]:py-1 [&_[cmdk-group-heading]]:text-right [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group]+[cmdk-group]]:border-t"
                  : undefined
              }
            >
              <CommandEmpty>No matching {mode}.</CommandEmpty>
              {mode === "commands" ? (
                COMMAND_GROUPS.map((group) => {
                  const commands = commandsForScope(info.scope).filter(
                    (command) => commandGroup(command.id) === group,
                  );
                  return (
                    commands.length > 0 && (
                      <CommandGroup key={group} heading={group}>
                        {commands.map((command) => (
                          <CommandItem
                            key={command.id}
                            value={command.title}
                            disabled={!enabled(command.id)}
                            onSelect={() => perform(command.id)}
                          >
                            {command.title}
                            <CommandShortcut>
                              {bindingFor(command.id, preferences).replace(
                                "Mod",
                                mac ? "⌘" : "Ctrl",
                              )}
                            </CommandShortcut>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )
                  );
                })
              ) : mode === "themes" ? (
                <>
                  <CommandGroup heading="System">
                    <CommandItem
                      value="system"
                      keywords={["Follow system"]}
                      data-checked={appearance.theme === "system"}
                      disabled={!preferencesWritable}
                      onSelect={() => chooseTheme("system")}
                    >
                      <MonitorIcon />
                      <span>Follow system</span>
                      {appearance.theme === "system" && (
                        <span className="sr-only">Current theme</span>
                      )}
                    </CommandItem>
                  </CommandGroup>
                  {(["light", "dark"] as const).map((themeMode) => (
                    <CommandGroup
                      key={themeMode}
                      heading={themeMode === "light" ? "Light themes" : "Dark themes"}
                    >
                      {themes
                        .filter((theme) => theme.mode === themeMode)
                        .map((theme) => (
                          <CommandItem
                            key={theme.id}
                            value={theme.id}
                            keywords={[theme.name, theme.mode]}
                            data-checked={appearance.theme === theme.id}
                            disabled={!preferencesWritable}
                            onSelect={() => chooseTheme(theme.id)}
                          >
                            <span>{theme.name}</span>
                            {appearance.theme === theme.id && (
                              <span className="sr-only">Current theme</span>
                            )}
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  ))}
                </>
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
