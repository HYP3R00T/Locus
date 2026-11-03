"use client";

import {
  type ReactNode,
  type RefObject,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
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

export function useMobileNavigation() {
  return useSyncExternalStore(subscribeToViewport, isMobileViewport, isServerMobileViewport);
}

// Commit one target layout; CSS animates between widths without per-frame React updates.
function useNavigationMotion(
  expanded: boolean,
  mobile: boolean,
  panel: RefObject<PanelImperativeHandle | null>,
  width: RefObject<number>,
  expandedMinimum: number,
) {
  const [settledExpanded, setSettledExpanded] = useState(expanded);
  const [animating, setAnimating] = useState(false);
  const initialized = useRef(false);
  useEffect(() => {
    if (mobile) {
      setSettledExpanded(expanded);
      setAnimating(false);
      return;
    }
    const target = expanded ? width.current : COMPACT_WIDTH;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = initialized.current && !reduced ? 200 : 0;
    initialized.current = true;
    // Relax minimum width during travel; restore normal drag bounds on completion.
    setAnimating(true);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const frame = requestAnimationFrame(() => {
      panel.current?.resize(target);
      const finish = () => {
        setSettledExpanded(expanded);
        setAnimating(false);
      };
      if (duration) timer = setTimeout(finish, duration);
      else finish();
    });
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [expanded, mobile, panel, width]);
  return { animating, minimum: animating || !settledExpanded ? COMPACT_WIDTH : expandedMinimum };
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
  const mobile = useMobileNavigation();
  const primary = useRef<PanelImperativeHandle | null>(null);
  const context = useRef<PanelImperativeHandle | null>(null);
  const primaryGroup = useRef<HTMLDivElement | null>(null);
  const contextGroup = useRef<HTMLDivElement | null>(null);
  const primaryWidth = useRef(PRIMARY_MIN);
  const contextWidth = useRef(256);

  const primaryMotion = useNavigationMotion(
    primaryExpanded,
    mobile,
    primary,
    primaryWidth,
    PRIMARY_MIN,
  );
  const contextMotion = useNavigationMotion(
    contextExpanded,
    mobile,
    context,
    contextWidth,
    CONTEXT_MIN,
  );

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
        data-navigation-motion={primaryMotion.animating || undefined}
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
          minSize={primaryMotion.minimum}
          maxSize={PRIMARY_MAX}
          collapsedSize={COMPACT_WIDTH}
          collapsible={false}
          groupResizeBehavior="preserve-pixel-size"
          className="h-full overflow-hidden"
          style={{ overflow: "hidden" }}
        >
          <div className="locus-navigation-primary h-full overflow-hidden">{primaryNavigation}</div>
        </ResizablePanel>
        <ResizableHandle
          aria-label="Resize primary navigation"
          aria-hidden={!primaryExpanded}
          disabled={!primaryExpanded || primaryMotion.animating}
          className={cn(
            "locus-resize-gutter locus-navigation-inner-gutter",
            !primaryExpanded && "pointer-events-none bg-transparent after:hidden",
          )}
        />
        <ResizablePanel
          id="workspace-region"
          minSize={CONTENT_MIN + contextMotion.minimum + SEPARATOR_WIDTH}
          className="h-full min-w-0"
        >
          {/* Nesting preserves the context width while the primary column is dragged. */}
          <ResizablePanelGroup
            orientation="horizontal"
            className="min-w-0"
            elementRef={contextGroup}
            data-navigation-motion={contextMotion.animating || undefined}
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
              minSize={contextMotion.minimum}
              maxSize={CONTEXT_MAX}
              collapsedSize={COMPACT_WIDTH}
              collapsible={false}
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
              disabled={!contextExpanded || contextMotion.animating}
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
