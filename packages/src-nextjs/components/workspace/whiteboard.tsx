"use client";

import dynamic from "next/dynamic";
import "@excalidraw/excalidraw/index.css";

export const Whiteboard = dynamic(
  async () => {
    Object.assign(window, { EXCALIDRAW_ASSET_PATH: "/excalidraw/" });
    return (await import("./whiteboard-editor")).WhiteboardEditor;
  },
  {
    ssr: false,
    loading: () => <p className="p-4 text-xs text-muted-foreground">Opening whiteboard…</p>,
  },
);
