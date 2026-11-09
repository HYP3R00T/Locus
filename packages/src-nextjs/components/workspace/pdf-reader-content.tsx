"use client";

import { ScrollArea } from "@base-ui/react/scroll-area";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { ZoomInIcon, ZoomOutIcon } from "lucide-react";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Document, type DocumentProps, Page, pdfjs } from "react-pdf";
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
import { desktop } from "@/lib/library";
import { useNotice } from "@/lib/notifications";
import { wheelZoomScale } from "@/lib/pdf-interactions";
import {
  PAGE_GAP,
  PAGE_INSET,
  type PageSize,
  pageAt,
  pageOffsets,
  positionTop,
  readingPosition,
} from "@/lib/pdf-layout";
import { markStartup } from "@/lib/startup-timing";
import type { PdfReaderProps } from "./pdf-reader";

const assetBase = `/pdfjs/${pdfjs.version}/`;
pdfjs.GlobalWorkerOptions.workerSrc = `${assetBase}pdf.worker.min.mjs`;
const options = {
  cMapUrl: `${assetBase}cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `${assetBase}standard_fonts/`,
  wasmUrl: `${assetBase}wasm/`,
  useSystemFonts: false,
  isEvalSupported: false,
  rangeChunkSize: 262144,
  disableAutoFetch: true,
  disableStream: true,
};
type FitMode = "page-width" | "page-height";
const ZOOM_PRESETS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 5];
// A ref attaches before React-PDF's drawing effect. Create the context here so
// its later getContext call reuses an unaccelerated PDF buffer in WebKit.
// This is local to document pages; Excalidraw keeps its normal graphics path.
function preparePageCanvas(canvas: HTMLCanvasElement | null) {
  canvas?.getContext("2d", { alpha: false, willReadFrequently: true });
}

const sizeOf = (page: PDFPageProxy): PageSize => {
  const { width, height } = page.getViewport({ scale: 1 });
  return { width, height };
};

export function PdfReaderContent({
  document,
  onPosition,
  onViewPosition,
  onLocate,
  paneId,
  onReady,
  startupSlot,
}: PdfReaderProps) {
  const callbacks = useRef({ onPosition, onViewPosition, onReady });
  callbacks.current = { onPosition, onViewPosition, onReady };
  const initial = useRef(document);
  const timingSlot = useRef(startupSlot);
  timingSlot.current = startupSlot;
  const pendingLeft = useRef<number | null>(null);
  const mounted = useRef(false);
  const scroll = useRef<HTMLDivElement>(null);
  const pageInput = useRef<HTMLInputElement>(null);
  const pageField = useId();
  const [source, setSource] = useState<{
    range: InstanceType<typeof pdfjs.PDFDataRangeTransport>;
  }>();
  const [pdf, setPdf] = useState<PDFDocumentProxy>();
  const [sizes, setSizes] = useState<PageSize[]>([]);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [scrollOffset, setScrollOffset] = useState({ x: 0, y: 0 });
  const [pageIndex, setPageIndex] = useState(document.pageIndex);
  const [visible, setVisible] = useState({ first: document.pageIndex, last: document.pageIndex });
  const [zoomPreset, setZoomPreset] = useState<FitMode | null>("page-width");
  const [fixedZoom, setFixedZoom] = useState(1);
  const reference = sizes[0];
  const zoom =
    reference && viewport.width && viewport.height
      ? zoomPreset === "page-width"
        ? Math.max(0.01, (viewport.width - PAGE_INSET * 2) / reference.width)
        : zoomPreset === "page-height"
          ? Math.max(0.01, (viewport.height - PAGE_GAP * 2) / reference.height)
          : fixedZoom
      : fixedZoom;
  const [renderZoom, setRenderZoom] = useState(zoom);
  const offsets = useMemo(() => pageOffsets(sizes, zoom), [sizes, zoom]);
  const count = sizes.length;
  const contentWidth = Math.max(
    viewport.width,
    Math.max(0, ...sizes.map((size) => size.width * zoom)) + PAGE_INSET * 2,
  );
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [positionError, setPositionError] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [passwordNeeded, setPasswordNeeded] = useState(false);
  const [password, setPassword] = useState("");
  const passwordCallback = useRef<((password: string) => void) | null>(null);
  const restoring = useRef(true);
  const position = useRef({ pageIndex: document.pageIndex, y: document.y });
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSave = useRef(false);
  const paintedPages = useRef(new Map<number, number>());
  const state = useRef({ sizes, offsets, zoom, renderZoom, pdf, viewport });
  state.current = { sizes, offsets, zoom, renderZoom, pdf, viewport };

  const fail = useCallback((failure: unknown) => {
    if (!mounted.current) return;
    setError(String(failure));
    setSource(undefined);
    callbacks.current.onReady();
  }, []);
  const pageFailed = useCallback((failure: unknown) => {
    if (!mounted.current) return;
    setPageError(String(failure));
    callbacks.current.onReady();
  }, []);
  const askPassword = useCallback<NonNullable<DocumentProps["onPassword"]>>((callback) => {
    passwordCallback.current = callback;
    setPasswordNeeded(true);
    callbacks.current.onReady();
  }, []);

  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    let transport: InstanceType<typeof pdfjs.PDFDataRangeTransport> | undefined;
    async function prepare() {
      if (!desktop()) throw new Error("Open PDFs in the desktop app.");
      const info = await invoke<{ length: number }>("pdf_info", { documentId: initial.current.id });
      if (cancelled) return;
      markStartup("pdf_metadata_ready", timingSlot.current);
      class Ranges extends pdfjs.PDFDataRangeTransport {
        stopped = false;
        requestDataRange(begin: number, end: number) {
          void (async () => {
            const bytes = new Uint8Array(end - begin);
            for (let start = begin; start < end && !this.stopped; start += 1024 * 1024) {
              const stop = Math.min(end, start + 1024 * 1024);
              const chunk = await invoke<ArrayBuffer>("read_pdf_range", {
                documentId: initial.current.id,
                begin: start,
                end: stop,
              });
              if (!this.stopped) bytes.set(new Uint8Array(chunk), start - begin);
            }
            if (!this.stopped) this.onDataRange(begin, bytes);
          })().catch((failure) => {
            if (!this.stopped) fail(failure);
          });
        }
        abort() {
          this.stopped = true;
        }
      }
      transport = new Ranges(info.length, null);
      setSource({ range: transport });
    }
    void prepare().catch((failure) => {
      if (!cancelled) fail(failure);
    });
    return () => {
      cancelled = true;
      mounted.current = false;
      transport?.abort();
    };
  }, [fail]);

  const loadDocument = useCallback(
    (loaded: PDFDocumentProxy) => {
      markStartup("pdf_document_ready", timingSlot.current);
      void (async () => {
        const index = Math.max(0, Math.min(loaded.numPages - 1, initial.current.pageIndex));
        const [first, restored] = await Promise.all([loaded.getPage(1), loaded.getPage(index + 1)]);
        if (!mounted.current) return;
        const geometry = Array.from({ length: loaded.numPages }, () => sizeOf(first));
        geometry[index] = sizeOf(restored);
        const source = initial.current;
        let y = source.y;
        if (source.positionVersion === 1) {
          const container = scroll.current;
          const scale = container
            ? (container.clientWidth - PAGE_INSET * 2) / geometry[0].width
            : 1;
          const height = geometry[index].height * scale;
          y *= Math.max(0, height - (container?.clientHeight ?? 0)) / Math.max(1, height);
        }
        position.current = { pageIndex: index, y };
        const container = scroll.current;
        if (container?.clientWidth)
          setRenderZoom(
            Math.max(0.01, (container.clientWidth - PAGE_INSET * 2) / geometry[0].width),
          );
        setSizes(geometry);
        setPdf(loaded);
        markStartup("pdf_viewer_initialized", timingSlot.current);
        markStartup("pdf_restored_page_ready", timingSlot.current);
      })().catch(fail);
    },
    [fail],
  );

  const measurePage = useCallback((page: PDFPageProxy) => {
    const size = sizeOf(page);
    setSizes((previous) => {
      const old = previous[page.pageNumber - 1];
      if (!old || (old.width === size.width && old.height === size.height)) return previous;
      const next = [...previous];
      next[page.pageNumber - 1] = size;
      return next;
    });
  }, []);

  const updateVisible = useCallback(() => {
    const container = scroll.current;
    const current = state.current;
    if (!container || !current.sizes.length) return;
    const first = pageAt(
      current.offsets,
      Math.max(0, container.scrollTop - container.clientHeight),
    );
    const last = pageAt(current.offsets, container.scrollTop + container.clientHeight * 2);
    setVisible((old) => (old.first === first && old.last === last ? old : { first, last }));
  }, []);
  const persist = useCallback(() => {
    if (!pendingSave.current) return;
    pendingSave.current = false;
    const { pageIndex, y } = position.current;
    void callbacks.current.onPosition(initial.current, pageIndex, y).catch((failure) => {
      if (mounted.current) setPositionError(String(failure));
    });
  }, []);
  const updateScrollOffset = useCallback(() => {
    const container = scroll.current;
    if (!container) return;
    setScrollOffset((previous) =>
      previous.x === container.scrollLeft && previous.y === container.scrollTop
        ? previous
        : { x: container.scrollLeft, y: container.scrollTop },
    );
  }, []);
  function trackScroll() {
    updateScrollOffset();
    updateVisible();
    const container = scroll.current;
    const current = state.current;
    if (!container || !current.sizes.length || restoring.current) return;
    position.current = readingPosition(
      current.sizes,
      current.offsets,
      current.zoom,
      container.scrollTop,
    );
    setPageIndex(position.current.pageIndex);
    callbacks.current.onViewPosition(
      initial.current,
      position.current.pageIndex,
      position.current.y,
    );
    pendingSave.current = true;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(persist, 350);
  }
  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      persist();
    },
    [persist],
  );

  const checkReady = useCallback(() => {
    const current = state.current;
    if (!current.sizes.length || restoring.current || current.zoom !== current.renderZoom) return;
    const container = scroll.current;
    if (!container) return;
    const first = pageAt(current.offsets, container.scrollTop);
    const last = pageAt(current.offsets, container.scrollTop + container.clientHeight - 1);
    for (let index = first; index <= last; index++) {
      if (paintedPages.current.get(index) !== current.zoom) return;
    }
    markStartup("pdf_first_paint", timingSlot.current);
    callbacks.current.onReady();
  }, []);

  useLayoutEffect(() => {
    const container = scroll.current;
    if (!container || !sizes.length || !viewport.width) return;
    restoring.current = true;
    callbacks.current.onReady(false);
    container.scrollTop = positionTop(position.current, sizes, offsets, zoom);
    if (pendingLeft.current !== null) {
      container.scrollLeft = pendingLeft.current;
      pendingLeft.current = null;
    }
    updateVisible();
    updateScrollOffset();
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        restoring.current = false;
        checkReady();
      });
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [sizes, offsets, zoom, viewport.width, checkReady, updateVisible, updateScrollOffset]);

  useEffect(() => {
    const container = scroll.current;
    if (!container) return;
    const observer = new ResizeObserver(() =>
      setViewport({ width: container.clientWidth, height: container.clientHeight }),
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => setRenderZoom(zoom), 150);
    return () => clearTimeout(timer);
  }, [zoom]);

  function painted(index: number, scale: number) {
    paintedPages.current.set(index, scale);
    requestAnimationFrame(checkReady);
  }

  // React-PDF keeps its first onItemClick callback in its link service. Read the
  // current document and layout through a ref so links survive zoom and scrolling.
  const followLink = useCallback<NonNullable<DocumentProps["onItemClick"]>>(
    ({ pageIndex, dest }) => {
      void (async () => {
        const current = state.current;
        if (!current.pdf || !scroll.current) return;
        const index = Math.max(0, Math.min(current.pdf.numPages - 1, pageIndex));
        const page = await current.pdf.getPage(index + 1);
        const size = sizeOf(page);
        const targetSizes = [...state.current.sizes];
        targetSizes[index] = size;
        let y = 0;
        const destination =
          typeof dest === "string" ? await current.pdf.getDestination(dest) : await dest;
        if (Array.isArray(destination)) {
          const kind = destination[1]?.name;
          const top =
            kind === "XYZ"
              ? destination[3]
              : kind === "FitH" || kind === "FitBH"
                ? destination[2]
                : kind === "FitR"
                  ? destination[5]
                  : undefined;
          if (typeof top === "number")
            y = Math.max(
              0,
              Math.min(
                1,
                page.getViewport({ scale: 1 }).convertToViewportPoint(0, top)[1] / size.height,
              ),
            );
        }
        if (!mounted.current) return;
        position.current = { pageIndex: index, y };
        setSizes(targetSizes);
        setPageIndex(index);
        callbacks.current.onViewPosition(initial.current, index, y);
        pendingSave.current = true;
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(persist, 350);
      })().catch((failure) => {
        if (mounted.current) setLinkError(String(failure));
      });
    },
    [persist],
  );

  function openLink(event: React.MouseEvent) {
    if (event.button !== 0 || !(event.target instanceof Element)) return;
    const link = event.target.closest<HTMLAnchorElement>("a[href]");
    if (!link || link.getAttribute("href")?.startsWith("#")) return;
    event.preventDefault();
    event.stopPropagation();
    const url = link.href;
    if (!/^(https?:|mailto:|tel:)/i.test(url)) {
      setLinkError("This link type is not supported.");
      return;
    }
    void openUrl(url).catch((failure) => setLinkError(String(failure)));
  }
  function goTo() {
    const value = (draft ?? String(pageIndex + 1)).trim();
    if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > count) {
      setPageError(`Enter a page between 1 and ${count}.`);
      return;
    }
    followLink({ pageIndex: Number(value) - 1, pageNumber: Number(value) });
    setDraft(null);
    setPageError(null);
  }
  function changeZoom(direction: number) {
    setZoomPreset(null);
    setFixedZoom(Math.max(0.25, Math.min(5, zoom + direction * 0.25)));
  }
  function selectZoom(value: string) {
    if (value === "page-width" || value === "page-height") setZoomPreset(value);
    else if (ZOOM_PRESETS.includes(Number(value))) {
      setZoomPreset(null);
      setFixedZoom(Number(value));
    }
  }
  useEffect(() => {
    const container = scroll.current;
    if (!container) return;
    function wheel(event: WheelEvent) {
      if (!event.ctrlKey || !container || !state.current.sizes.length) return;
      event.preventDefault();
      const current = state.current;
      const next = wheelZoomScale(
        current.zoom,
        event.deltaY,
        event.deltaMode,
        container.clientHeight,
      );
      // Preserve the point under the pointer, expressed in page coordinates.
      const y = event.clientY - container.getBoundingClientRect().top;
      const anchor = readingPosition(
        current.sizes,
        current.offsets,
        current.zoom,
        container.scrollTop + y,
      );
      const nextOffsets = pageOffsets(current.sizes, next);
      const nextTop = positionTop(anchor, current.sizes, nextOffsets, next) - y;
      position.current = readingPosition(current.sizes, nextOffsets, next, Math.max(0, nextTop));
      const x = event.clientX - container.getBoundingClientRect().left;
      const maxWidth = Math.max(...current.sizes.map((size) => size.width));
      const pageWidth = current.sizes[anchor.pageIndex].width;
      const oldLeft =
        (Math.max(container.clientWidth, maxWidth * current.zoom + PAGE_INSET * 2) -
          pageWidth * current.zoom) /
        2;
      const newLeft =
        (Math.max(container.clientWidth, maxWidth * next + PAGE_INSET * 2) - pageWidth * next) / 2;
      pendingLeft.current = Math.max(
        0,
        newLeft + ((container.scrollLeft + x - oldLeft) * next) / current.zoom - x,
      );
      setZoomPreset(null);
      setFixedZoom(next);
    }
    container.addEventListener("wheel", wheel, { passive: false });
    return () => container.removeEventListener("wheel", wheel);
  }, []);

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
  useNotice(pageError, "Check the PDF page", "warning");
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
          <p>This PDF could not be opened. Check the file or locate it to try again.</p>
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
          <label htmlFor={`${pageField}-password`} className="text-xs">
            PDF password
          </label>
          <input
            id={`${pageField}-password`}
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
      <ScrollArea.Root
        className="relative min-h-0 flex-1 overflow-hidden bg-muted/20"
        hidden={!!error || passwordNeeded}
      >
        <ScrollArea.Viewport
          ref={scroll}
          onScroll={trackScroll}
          onClickCapture={openLink}
          role="document"
          aria-label="PDF pages"
          className="locus-pdf-scroll absolute inset-0 right-2.5"
          style={{ overflowX: zoomPreset === "page-width" ? "hidden" : "auto", overflowY: "auto" }}
          tabIndex={0}
        >
          <ScrollArea.Content
            className="locus-pdf-pages"
            style={{ height: offsets.at(-1) ?? 0, width: contentWidth, minWidth: 0 }}
          >
            <div
              className="sticky top-0 left-0 overflow-hidden"
              style={{ width: viewport.width, height: viewport.height }}
            >
              {source && (
                <Document
                  file={source}
                  options={options}
                  suspense={false}
                  loading={null}
                  error={null}
                  onLoadSuccess={loadDocument}
                  onLoadError={fail}
                  onSourceError={fail}
                  onPassword={askPassword}
                  onItemClick={followLink}
                  externalLinkTarget="_blank"
                >
                  <div
                    style={{
                      height: viewport.height,
                      width: viewport.width,
                      position: "relative",
                    }}
                  >
                    {sizes.slice(visible.first, visible.last + 1).map((size, relativeIndex) => {
                      const index = visible.first + relativeIndex;
                      return (
                        <div
                          key={index}
                          className="locus-pdf-page"
                          style={{
                            position: "absolute",
                            top: offsets[index] - scrollOffset.y,
                            width: size.width * zoom,
                            height: size.height * zoom,
                            left: (contentWidth - size.width * zoom) / 2 - scrollOffset.x,
                          }}
                        >
                          <div
                            style={{
                              transform:
                                zoom === renderZoom ? undefined : `scale(${zoom / renderZoom})`,
                              transformOrigin: "top left",
                            }}
                          >
                            <Page
                              canvasRef={preparePageCanvas}
                              pageNumber={index + 1}
                              scale={renderZoom}
                              suspense={false}
                              loading={null}
                              error={<p role="alert">Could not render page {index + 1}.</p>}
                              onLoadSuccess={measurePage}
                              onLoadError={pageFailed}
                              onRenderError={pageFailed}
                              devicePixelRatio={Math.min(
                                window.devicePixelRatio || 1,
                                Math.sqrt(
                                  (16 * 1024 * 1024) /
                                    (size.width * size.height * renderZoom * renderZoom),
                                ),
                              )}
                              onRenderSuccess={() => painted(index, renderZoom)}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Document>
              )}
            </div>
          </ScrollArea.Content>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar className="locus-pdf-scrollbar flex w-2.5 touch-none select-none p-0.5">
          <ScrollArea.Thumb className="w-full rounded-full bg-muted-foreground hover:bg-foreground" />
        </ScrollArea.Scrollbar>
        <ScrollArea.Scrollbar
          orientation="horizontal"
          className="locus-pdf-scrollbar flex h-2.5 touch-none select-none p-0.5"
        >
          <ScrollArea.Thumb className="h-full rounded-full bg-muted-foreground hover:bg-foreground" />
        </ScrollArea.Scrollbar>
        <ScrollArea.Corner />
      </ScrollArea.Root>
    </section>
  );
}
