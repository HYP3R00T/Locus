"use client";

import { createContext, useContext, useEffect, useRef } from "react";
import type { CommandId, Preferences } from "@/lib/workbench";

export type WorkbenchInfo = {
  activeId: string | null;
  focus?: (id: string) => void;
  scope: "pdf" | "drawing" | null;
  columns: { id: string; panes: { id: string; title: string; kind: "pdf" | "drawing" | null }[] }[];
};
export type CommandHandler = { run: () => unknown; enabled?: boolean };
export type MaterialOption = { id: string; title: string; open: () => void };
type WorkbenchContextValue = {
  info: WorkbenchInfo;
  setInfo: (info: WorkbenchInfo) => void;
  preferences: Preferences;
  updatePreferences: (preferences: Preferences) => void;
  resetPreferences: () => void;
  preferenceError: string | null;
  preferencesReady: boolean;
  preferencesWritable: boolean;
  recording: boolean;
  setRecording: (value: boolean) => void;
  mac: boolean;
  perform: (id: CommandId) => void;
  enabled: (id: CommandId) => boolean;
  register: (
    owner: string,
    handlers: React.RefObject<Partial<Record<CommandId, CommandHandler>>>,
  ) => () => void;
  setMaterials: (items: MaterialOption[]) => void;
};
export const WorkbenchContext = createContext<WorkbenchContextValue | null>(null);
export function useWorkbench() {
  const value = useContext(WorkbenchContext);
  if (!value) throw new Error("WorkbenchProvider is missing.");
  return value;
}
export function useCommandHandlers(
  owner: string,
  handlers: Partial<Record<CommandId, CommandHandler>>,
) {
  const { register } = useWorkbench();
  const latest = useRef(handlers);
  latest.current = handlers;
  const signature = Object.entries(handlers)
    .map(([id, handler]) => `${id}:${handler.enabled !== false}`)
    .join(";");
  useEffect(() => {
    if (!signature) return;
    return register(owner, latest);
  }, [owner, register, signature]);
}
export function useMaterialOptions(items: MaterialOption[]) {
  const { setMaterials } = useWorkbench();
  const latest = useRef(items);
  latest.current = items;
  const signature = items.map((item) => `${item.id}:${item.title}`).join(";");
  useEffect(() => {
    setMaterials(signature ? latest.current : []);
    return () => setMaterials([]);
  }, [signature, setMaterials]);
}
