"use client";

import dynamic from "next/dynamic";
import type { StudyDocument } from "@/lib/library";
import { markStartup } from "@/lib/startup-timing";

export type PdfReaderProps = {
  document: StudyDocument;
  onPosition: (document: StudyDocument, pageIndex: number, y: number) => Promise<void>;
  onViewPosition: (document: StudyDocument, pageIndex: number, y: number) => void;
  onLocate: () => void;
  paneId: string;
  onReady: (ready?: boolean) => boolean;
  startupSlot: number;
};

export const PdfReader = dynamic<PdfReaderProps>(
  async () => {
    markStartup("pdf_modules_started");
    await import("pdfjs-dist");
    markStartup("pdf_engine_ready");
    const module = await import("./pdf-reader-content");
    markStartup("pdf_viewer_ready");
    return module.PdfReaderContent;
  },
  {
    ssr: false,
    loading: () => (
      <p role="status" className="p-4 text-xs text-muted-foreground">
        Opening PDF…
      </p>
    ),
  },
);
