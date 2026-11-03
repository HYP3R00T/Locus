"use client";

import dynamic from "next/dynamic";
import { markStartup } from "@/lib/startup-timing";
import "@excalidraw/excalidraw/index.css";

export const Whiteboard = dynamic(
  async () => {
    markStartup("whiteboard_module_started");
    Object.assign(window, { EXCALIDRAW_ASSET_PATH: "/excalidraw/" });
    const module = await import("./whiteboard-editor");
    markStartup("whiteboard_module_ready");
    return module.WhiteboardEditor;
  },
  {
    ssr: false,
    loading: () => <p className="p-4 text-xs text-muted-foreground">Opening whiteboard…</p>,
  },
);
