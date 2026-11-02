"use client";

import { type ReactNode, useEffect, useRef, useSyncExternalStore } from "react";
import type { PanelImperativeHandle } from "react-resizable-panels";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { cn } from "@/lib/utils";

const COMPACT_WIDTH = 56;
const PRIMARY_MIN = 208;
const PRIMARY_MAX = 320;
const CONTEXT_MIN = 208;
const CONTEXT_MAX = 448;
const CONTENT_MIN = 320;
const SEPARATOR_WIDTH = 6;
const MOBILE_QUERY = "(max-width: 767px)";

function snapToDevicePixel(width: number) {
  const scale = window.devicePixelRatio || 1;
  return Math.round(width * scale) / scale;
}

function subscribeToViewport(callback: () => void) {
  const query = window.matchMedia(MOBILE_QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function isMobileViewport() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

function isServerMobileViewport() {
  return false;
}

export function NavigationLayout({
  primaryExpanded,
  contextExpanded,
  primaryNavigation,
  contextNavigation,
  children,
}: {
  primaryExpanded: boolean;
  contextExpanded: boolean;
  primaryNavigation: ReactNode;
  contextNavigation: ReactNode;
  children: ReactNode;
}) {
  const mobile = useSyncExternalStore(
    subscribeToViewport,
    isMobileViewport,
    isServerMobileViewport,
  );
  const primary = useRef<PanelImperativeHandle | null>(null);
  const context = useRef<PanelImperativeHandle | null>(null);
  const primaryGroup = useRef<HTMLDivElement | null>(null);
  const contextGroup = useRef<HTMLDivElement | null>(null);
  const primaryWidth = useRef(PRIMARY_MIN);
  const contextWidth = useRef(256);

  useEffect(() => {
    if (mobile) return;
    // Let the panel library commit the new collapse constraints before resizing.
    const frame = requestAnimationFrame(() => {
      if (primaryExpanded) primary.current?.resize(primaryWidth.current);
      else primary.current?.collapse();
    });
    return () => cancelAnimationFrame(frame);
  }, [primaryExpanded, mobile]);

  useEffect(() => {
    if (mobile) return;
    const frame = requestAnimationFrame(() => {
      if (contextExpanded) context.current?.resize(contextWidth.current);
      else context.current?.collapse();
    });
    return () => cancelAnimationFrame(frame);
  }, [contextExpanded, mobile]);

  if (mobile) {
    return (
      <div className="flex h-full w-full overflow-hidden bg-context-surface p-1">{children}</div>
    );
  }

  return (
    <div className="h-full min-h-0 min-w-0 bg-context-surface p-1">
      <ResizablePanelGroup
        orientation="horizontal"
        className="h-full! min-w-0"
        elementRef={primaryGroup}
        onLayoutChanged={(layout, meta) => {
          if (primaryExpanded && meta.isUserInteraction && primaryGroup.current) {
            // DOM panel widths can still be mid-transition; remember the committed layout instead.
            const width =
              (layout["application-navigation-panel"] / 100) *
              (primaryGroup.current.clientWidth - SEPARATOR_WIDTH);
            primaryWidth.current = snapToDevicePixel(width);
            if (Math.abs(width - primaryWidth.current) > 0.01)
              requestAnimationFrame(() => primary.current?.resize(primaryWidth.current));
          }
        }}
      >
        <ResizablePanel
          id="application-navigation-panel"
          panelRef={primary}
          defaultSize={primaryExpanded ? PRIMARY_MIN : COMPACT_WIDTH}
          minSize={PRIMARY_MIN}
          maxSize={PRIMARY_MAX}
          collapsedSize={COMPACT_WIDTH}
          collapsible={!primaryExpanded}
          groupResizeBehavior="preserve-pixel-size"
          className="h-full overflow-hidden"
          style={{ overflow: "hidden" }}
        >
          <div className="locus-navigation-primary h-full overflow-hidden">{primaryNavigation}</div>
        </ResizablePanel>
        <ResizableHandle
          aria-label="Resize primary navigation"
          aria-hidden={!primaryExpanded}
          disabled={!primaryExpanded}
          className={cn(
            "locus-resize-gutter locus-navigation-inner-gutter",
            !primaryExpanded && "pointer-events-none bg-transparent after:hidden",
          )}
        />
        <ResizablePanel
          id="workspace-region"
          minSize={CONTENT_MIN + (contextExpanded ? CONTEXT_MIN : COMPACT_WIDTH) + SEPARATOR_WIDTH}
          className="h-full min-w-0"
        >
          {/* Nesting preserves the context width while the primary column is dragged. */}
          <ResizablePanelGroup
            orientation="horizontal"
            className="min-w-0"
            elementRef={contextGroup}
            onLayoutChanged={(layout, meta) => {
              if (contextExpanded && meta.isUserInteraction && contextGroup.current) {
                const width =
                  (layout["study-navigation-panel"] / 100) *
                  (contextGroup.current.clientWidth - SEPARATOR_WIDTH);
                contextWidth.current = snapToDevicePixel(width);
                if (Math.abs(width - contextWidth.current) > 0.01)
                  requestAnimationFrame(() => context.current?.resize(contextWidth.current));
              }
            }}
          >
            <ResizablePanel
              id="study-navigation-panel"
              panelRef={context}
              defaultSize={contextExpanded ? 256 : COMPACT_WIDTH}
              minSize={CONTEXT_MIN}
              maxSize={CONTEXT_MAX}
              collapsedSize={COMPACT_WIDTH}
              collapsible={!contextExpanded}
              groupResizeBehavior="preserve-pixel-size"
              className="h-full overflow-hidden"
              style={{ overflow: "hidden" }}
            >
              <div className="locus-navigation-context h-full overflow-hidden">
                {contextNavigation}
              </div>
            </ResizablePanel>
            <ResizableHandle
              aria-label="Resize workspace navigation"
              aria-hidden={!contextExpanded}
              disabled={!contextExpanded}
              className={cn(
                "locus-resize-gutter",
                !contextExpanded && "pointer-events-none bg-transparent after:hidden",
              )}
            />
            <ResizablePanel
              id="study-content-panel"
              minSize={CONTENT_MIN}
              className="h-full min-w-0"
            >
              {children}
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
