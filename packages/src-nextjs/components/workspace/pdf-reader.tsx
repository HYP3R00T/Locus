"use client";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { ZoomInIcon, ZoomOutIcon } from "lucide-react";
import type { PDFDocumentLoadingTask } from "pdfjs-dist";
import type { PDFViewer } from "pdfjs-dist/web/pdf_viewer.mjs";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ActionTooltip } from "@/components/workbench/action-tooltip";
import { useCommandHandlers } from "@/components/workbench/workbench-context";
import { desktop, type StudyDocument } from "@/lib/library";
import { useNotice } from "@/lib/notifications";
import { wheelZoomScale } from "@/lib/pdf-interactions";

type FitMode = "page-width" | "page-height";
const ZOOM_PRESETS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 5];

export function PdfReader({
  document,
  onPosition,
  onViewPosition,
  onLocate,
  paneId,
}: {
  document: StudyDocument;
  onPosition: (document: StudyDocument, pageIndex: number, y: number) => Promise<void>;
  onViewPosition: (document: StudyDocument, pageIndex: number, y: number) => void;
  onLocate: () => void;
  paneId: string;
}) {
  const [pageIndex, setPageIndex] = useState(document.pageIndex);
  const [count, setCount] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [zoomPreset, setZoomPreset] = useState<FitMode | null>("page-width");
  const [draft, setDraft] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [positionError, setPositionError] = useState<string | null>(null);
  const [passwordNeeded, setPasswordNeeded] = useState(false);
  const [password, setPassword] = useState("");
  const pageInput = useRef<HTMLInputElement>(null);
  const pageField = useId();
  const scroll = useRef<HTMLDivElement>(null);
  const pages = useRef<HTMLDivElement>(null);
  const viewer = useRef<PDFViewer | null>(null);
  const initial = useRef(document);
  const fit = useRef<FitMode | null>("page-width");
  const interacted = useRef(false);
  const passwordCallback = useRef<((password: string) => void) | null>(null);
  const save = useRef(onPosition);
  const remember = useRef(onViewPosition);
  const currentPosition = useRef({ pageIndex: document.pageIndex, y: document.y });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    save.current = onPosition;
    remember.current = onViewPosition;
  }, [onPosition, onViewPosition]);
  useEffect(() => {
    const container = scroll.current;
    if (!container) return;
    let disposed = false;
    function wheel(event: WheelEvent) {
      interacted.current = true;
      if (!event.ctrlKey) return;
      // React's delegated wheel listener is passive; use a native listener to
      // prevent WebView page zoom and leave other panes unchanged.
      event.preventDefault();
      const instance = viewer.current;
      if (!instance?.pagesCount || !container) return;
      const scale = wheelZoomScale(
        instance.currentScale,
        event.deltaY,
        event.deltaMode,
        container.clientHeight,
      );
      if (scale === instance.currentScale) return;
      fit.current = null;
      setZoomPreset(null);
      instance.updateScale({
        scaleFactor: scale / instance.currentScale,
        drawingDelay: 150,
        origin: [event.clientX, event.clientY],
      });
    }
    function openLink(event: MouseEvent) {
      if (event.button !== 0 || !(event.target instanceof Element)) return;
      const link = event.target.closest<HTMLAnchorElement>("a[href]");
      if (!link || link.closest("[data-internal-link]")) return;
      event.preventDefault();
      void openUrl(link.href)
        .then(() => {
          if (!disposed) setLinkError(null);
        })
        .catch(() => {
          if (!disposed) setLinkError("Could not open this link in its default application.");
        });
    }
    container.addEventListener("wheel", wheel, { passive: false });
    container.addEventListener("click", openLink);
    return () => {
      disposed = true;
      container.removeEventListener("wheel", wheel);
      container.removeEventListener("click", openLink);
    };
  }, []);
  useEffect(() => {
    const source = initial.current;
    let cancelled = false;
    let restoring = true;
    let task: PDFDocumentLoadingTask | undefined;
    let resize: ResizeObserver | undefined;
    let frame = 0;
    let fitTimer: ReturnType<typeof setTimeout> | undefined;
    let instance: PDFViewer | undefined;
    function persist() {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = null;
        void save
          .current(source, currentPosition.current.pageIndex, currentPosition.current.y)
          .then(() => setPositionError(null))
          .catch(() => {
            if (!cancelled) setPositionError("Could not save your reading position.");
          });
      }, 350);
    }
    async function load() {
      const engine = await import("pdfjs-dist");
      const base = `/pdfjs/${engine.version}/`;
      engine.GlobalWorkerOptions.workerSrc = `${base}pdf.worker.min.mjs`;
      const options = {
        cMapUrl: `${base}cmaps/`,
        cMapPacked: true,
        standardFontDataUrl: `${base}standard_fonts/`,
        // Use bundled substitutes for missing PDF fonts instead of OS-installed fonts.
        useSystemFonts: false,
        wasmUrl: `${base}wasm/`,
        isEvalSupported: false,
      };
      const info = await invoke<{ length: number }>("pdf_info", { documentId: source.id });
      if (cancelled) return;
      class Ranges extends engine.PDFDataRangeTransport {
        stopped = false;
        requestDataRange(begin: number, end: number) {
          void (async () => {
            const result = new Uint8Array(end - begin);
            for (let start = begin; start < end && !this.stopped; start += 1024 * 1024) {
              const stop = Math.min(end, start + 1024 * 1024);
              const bytes = await invoke<ArrayBuffer>("read_pdf_range", {
                documentId: source.id,
                begin: start,
                end: stop,
              });
              if (!this.stopped) result.set(new Uint8Array(bytes), start - begin);
            }
            if (!this.stopped) this.onDataRange(begin, result);
          })().catch((e) => {
            if (!cancelled) {
              setError(String(e));
              void task?.destroy();
            }
          });
        }
        abort() {
          this.stopped = true;
        }
      }
      task = engine.getDocument({
        ...options,
        range: new Ranges(info.length, null),
        rangeChunkSize: 262144,
        disableAutoFetch: true,
        disableStream: true,
      });
      task.onPassword = (update: (password: string) => void) => {
        if (!cancelled) {
          passwordCallback.current = update;
          setPasswordNeeded(true);
        }
      };

      const loaded = await task.promise;
      if (cancelled || !scroll.current || !pages.current) return;
      const { PDFViewer, EventBus, PDFLinkService, LinkTarget } = await import(
        "pdfjs-dist/web/pdf_viewer.mjs"
      );
      if (cancelled) return;
      const container = scroll.current;
      const eventBus = new EventBus();
      const links = new PDFLinkService({
        eventBus,
        externalLinkTarget: LinkTarget.BLANK,
        ignoreDestinationZoom: true,
      });
      instance = new PDFViewer({
        container,
        viewer: pages.current,
        eventBus,
        linkService: links,
        annotationMode: engine.AnnotationMode.ENABLE,
        maxCanvasPixels: 16 * 1024 * 1024,
      });
      links.setViewer(instance);
      links.setDocument(loaded);
      viewer.current = instance;
      const activeViewer = instance;
      function restore() {
        if (cancelled) return;
        restoring = true;
        const index = Math.min(source.pageIndex, loaded.numPages - 1);
        activeViewer.scrollPageIntoView({ pageNumber: index + 1 });
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          if (cancelled) return;
          const page = activeViewer.getPageView(index)?.div as HTMLDivElement | undefined;
          if (page) {
            const fraction =
              source.positionVersion === 1
                ? (source.y * Math.max(0, page.clientHeight - container.clientHeight)) /
                  Math.max(1, page.clientHeight)
                : source.y;
            container.scrollTop = page.offsetTop + fraction * page.clientHeight;
            currentPosition.current = { pageIndex: index, y: fraction };
          }
          setPageIndex(index);
          frame = requestAnimationFrame(() => {
            restoring = false;
          });
        });
      }
      eventBus.on("pagesinit", () => {
        activeViewer.currentScaleValue = "page-width";
        setCount(loaded.numPages);
        restore();
      });
      eventBus.on("pagesloaded", () => {
        if (!interacted.current) restore();
      });
      eventBus.on("scalechanging", ({ scale }: { scale: number }) => {
        if (!cancelled) setZoom(scale);
      });
      eventBus.on("pagerendered", ({ error: renderError }: { error?: Error }) => {
        if (renderError && !cancelled) setError(String(renderError));
      });
      eventBus.on("updateviewarea", ({ location }: { location: { pageNumber: number } }) => {
        if (cancelled || restoring) return;
        const index = location.pageNumber - 1;
        const page = activeViewer.getPageView(index)?.div as HTMLDivElement | undefined;
        if (!page) return;
        const y = Math.max(
          0,
          Math.min(1, (container.scrollTop - page.offsetTop) / Math.max(1, page.clientHeight)),
        );
        setPageIndex(index);
        currentPosition.current = { pageIndex: index, y };
        remember.current(source, index, y);
        persist();
      });
      instance.setDocument(loaded);
      let previousWidth = container.clientWidth;
      let previousHeight = container.clientHeight;
      resize = new ResizeObserver(([entry]) => {
        const { width, height } = entry.contentRect;
        const widthChanged = Math.abs(width - previousWidth) >= 1;
        const heightChanged = Math.abs(height - previousHeight) >= 1;
        previousWidth = width;
        previousHeight = height;
        if (!widthChanged && !(fit.current === "page-height" && heightChanged)) return;
        clearTimeout(fitTimer);
        const mode = fit.current;
        const page = activeViewer.getPageView(activeViewer.currentPageNumber - 1);
        if (mode && page) {
          // Match PDF.js's continuous, single-page fit calculation. Its delayed
          // zoom reuses rendered canvases during motion instead of redrawing them.
          const scale =
            mode === "page-width"
              ? ((container.clientWidth - 40) / page.width) * page.scale
              : ((container.clientHeight - 5) / page.height) * page.scale;
          if (scale > 0) {
            activeViewer.updateScale({
              scaleFactor: scale / activeViewer.currentScale,
              drawingDelay: 200,
            });
          }
        }
        fitTimer = setTimeout(() => {
          if (!cancelled && fit.current && activeViewer.pagesCount) {
            // Restore the exact preset after the gesture API's rounded preview.
            activeViewer.currentScaleValue = fit.current;
          }
        }, 150);
      });
      resize.observe(container);
    }
    void load().catch((e) => {
      if (!cancelled) setError(String(e));
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      resize?.disconnect();
      clearTimeout(fitTimer);
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
        void save
          .current(source, currentPosition.current.pageIndex, currentPosition.current.y)
          .catch(() => {});
      }
      viewer.current = null;
      instance?.setDocument(null);
      void task?.destroy();
    };
  }, []);
  function goTo() {
    const value = (draft ?? String(pageIndex + 1)).trim();
    if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > count) {
      setPageError(`Enter a page between 1 and ${count}.`);
      return;
    }
    interacted.current = true;
    viewer.current?.scrollPageIntoView({ pageNumber: Number(value) });
    setDraft(null);
    setPageError(null);
  }
  function changeZoom(direction: number) {
    const instance = viewer.current;
    if (!instance) return;
    interacted.current = true;
    fit.current = null;
    setZoomPreset(null);
    instance.currentScale = Math.max(0.25, Math.min(5, instance.currentScale + direction * 0.25));
  }
  function selectZoom(value: string) {
    const instance = viewer.current;
    if (!instance) return;
    interacted.current = true;
    if (value === "page-width" || value === "page-height") {
      fit.current = value;
      setZoomPreset(value);
      instance.currentScaleValue = value;
    } else {
      const scale = Number(value);
      if (!ZOOM_PRESETS.includes(scale)) return;
      fit.current = null;
      setZoomPreset(null);
      instance.currentScale = scale;
    }
  }
  useCommandHandlers(paneId, {
    "pdf.page": {
      enabled: !!count,
      run: () => {
        pageInput.current?.focus();
        pageInput.current?.select();
      },
    },
    "pdf.zoomIn": { enabled: !!count && zoom < 5, run: () => changeZoom(1) },
    "pdf.zoomOut": { enabled: !!count && zoom > 0.25, run: () => changeZoom(-1) },
    "pdf.fitWidth": { enabled: !!count, run: () => selectZoom("page-width") },
    "pdf.fitHeight": { enabled: !!count, run: () => selectZoom("page-height") },
  });
  useNotice(error, "Could not open the PDF");
  useNotice(pageError, "Check the page number", "warning");
  useNotice(positionError, "Reading position could not be saved");
  useNotice(linkError, "Could not open the link");
  const matchingPreset = ZOOM_PRESETS.find((scale) => Math.abs(scale - zoom) < 0.0001);
  const selectedZoom =
    zoomPreset ?? (matchingPreset === undefined ? "custom" : String(matchingPreset));
  return (
    <section aria-label={`PDF reader: ${document.title}`} className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-9 shrink-0 flex-wrap items-center gap-2 border-b bg-toolbar-background px-1 text-xs text-toolbar-foreground">
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            goTo();
          }}
        >
          <label htmlFor={pageField} className="sr-only">
            Page number
          </label>
          <ActionTooltip label="Go to page — enter a number and press Enter" command="pdf.page">
            <input
              id={pageField}
              ref={pageInput}
              name="page"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              value={draft ?? String(pageIndex + 1)}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => {
                setDraft(null);
                setPageError(null);
              }}
              disabled={!count}
              className="h-7 w-14 border bg-background px-2 text-center"
            />
          </ActionTooltip>
          <span className="text-muted-foreground">/ {count || "…"}</span>
        </form>
        <div className="ml-auto flex items-center gap-1">
          <ActionTooltip label="Zoom out" command="pdf.zoomOut">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Zoom out"
              disabled={!count || zoom <= 0.25}
              onClick={() => changeZoom(-1)}
            >
              <ZoomOutIcon />
            </Button>
          </ActionTooltip>
          <Select
            value={selectedZoom}
            disabled={!count}
            onValueChange={(value) => {
              if (value !== null) selectZoom(value);
            }}
          >
            <ActionTooltip label="Choose zoom or fit mode — Ctrl+scroll also zooms">
              <SelectTrigger size="sm" aria-label="PDF zoom" className="max-w-48">
                <SelectValue>
                  {zoomPreset === "page-width"
                    ? `Fit to width (${Math.round(zoom * 100)}%)`
                    : zoomPreset === "page-height"
                      ? `Fit to height (${Math.round(zoom * 100)}%)`
                      : `${Math.round(zoom * 100)}%`}
                </SelectValue>
              </SelectTrigger>
            </ActionTooltip>
            <SelectContent align="end" alignItemWithTrigger={false}>
              <SelectItem value="page-width">Fit to width</SelectItem>
              <SelectItem value="page-height">Fit to height</SelectItem>
              {ZOOM_PRESETS.map((scale) => (
                <SelectItem key={scale} value={String(scale)}>
                  {Math.round(scale * 100)}%
                </SelectItem>
              ))}
              {zoomPreset === null && matchingPreset === undefined && (
                <SelectItem value="custom" disabled>
                  {Math.round(zoom * 100)}%
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          <ActionTooltip label="Zoom in" command="pdf.zoomIn">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Zoom in"
              disabled={!count || zoom >= 5}
              onClick={() => changeZoom(1)}
            >
              <ZoomInIcon />
            </Button>
          </ActionTooltip>
        </div>
      </div>
      {error && (
        <div role="alert" className="p-6 text-sm">
          <p>This PDF is unavailable. Locate the file to try again.</p>
          {desktop() && (
            <Button variant="outline" className="mt-3" onClick={onLocate}>
              Locate PDF
            </Button>
          )}
        </div>
      )}
      {passwordNeeded && !error && (
        <form
          className="flex flex-wrap items-center gap-2 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            passwordCallback.current?.(password);
            setPassword("");
            setPasswordNeeded(false);
          }}
        >
          <label htmlFor="pdf-password" className="text-xs">
            PDF password
          </label>
          <input
            id="pdf-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border bg-background p-2"
          />
          <Button type="submit">Unlock</Button>
        </form>
      )}
      {!count && !error && !passwordNeeded && (
        <p role="status" className="px-4 py-2 text-xs text-muted-foreground">
          Opening PDF…
        </p>
      )}
      <div className="relative min-h-0 flex-1" hidden={!!error || passwordNeeded}>
        <div
          ref={scroll}
          role="document"
          aria-label="PDF pages"
          data-fit-width={zoomPreset === "page-width"}
          className="locus-pdf-scroll absolute inset-0 overflow-auto bg-muted/20"
          onPointerDown={() => {
            interacted.current = true;
          }}
          onKeyDown={() => {
            interacted.current = true;
          }}
          // biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard users must be able to focus and scroll the PDF.
          tabIndex={0}
        >
          <div ref={pages} className="pdfViewer locus-pdf-viewer" />
        </div>
      </div>
    </section>
  );
}
