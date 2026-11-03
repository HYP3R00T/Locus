"use client";

import type { ReactNode } from "react";
import { useConfiguration } from "@/components/configuration-provider";
import { Toaster } from "@/components/ui/toast";
import { useNotice } from "@/lib/notifications";

export function Notifications({ children }: { children: ReactNode }) {
  const { appearance, error, warnings } = useConfiguration();
  useNotice(error, "Configuration could not be updated");
  useNotice(warnings.join("\n"), "Theme configuration warning", "warning");
  return <Toaster timeout={appearance.notificationDuration}>{children}</Toaster>;
}
