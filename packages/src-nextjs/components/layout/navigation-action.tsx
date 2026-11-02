"use client";

import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { ActionTooltip } from "@/components/workbench/action-tooltip";
import { cn } from "@/lib/utils";
import type { CommandId } from "@/lib/workbench";

export function NavigationAction({
  compact = false,
  className,
  title,
  command,
  ...props
}: ComponentProps<typeof Button> & { compact?: boolean; command?: CommandId }) {
  const button = (
    <Button
      variant="ghost"
      size={compact ? "icon" : "default"}
      className={cn(
        "h-9 shrink-0 gap-3 aria-expanded:bg-transparent hover:aria-expanded:bg-sidebar-accent [&_svg]:size-4",
        compact ? "mx-auto w-9 justify-center px-0" : "w-full justify-start px-3",
        className,
      )}
      {...props}
    />
  );
  return title ? (
    <ActionTooltip label={title} command={command}>
      {button}
    </ActionTooltip>
  ) : (
    button
  );
}
