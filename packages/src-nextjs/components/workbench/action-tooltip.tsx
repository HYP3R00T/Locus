"use client";

import type { ReactElement } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useWorkbench } from "@/components/workbench/workbench-context";
import { bindingFor, type CommandId } from "@/lib/workbench";

export function ActionTooltip({
  label,
  command,
  children,
}: {
  label: string;
  command?: CommandId;
  children: ReactElement;
}) {
  const { preferences, mac } = useWorkbench();
  const shortcut = command
    ? bindingFor(command, preferences).replace("Mod", mac ? "⌘" : "Ctrl")
    : "";
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent>
        <span>{label}</span>
        {shortcut && (
          <kbd className="ml-2 whitespace-nowrap font-mono text-[10px] opacity-75">{shortcut}</kbd>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
