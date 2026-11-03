"use client";

import { LoaderCircleIcon } from "lucide-react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { markStartup, markStartupNavigation } from "@/lib/startup-timing";
import { cn } from "@/lib/utils";

const ReadyContext = createContext<(paneId: string, ready?: boolean) => boolean>(() => false);
export function useStartupReady() {
  return useContext(ReadyContext);
}

export function StartupLoading({
  ready,
  panes,
  children,
}: {
  ready: boolean;
  panes: string[];
  children: ReactNode;
}) {
  const [settled, setSettled] = useState<Set<string>>(() => new Set());
  const [finished, setFinished] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [slow, setSlow] = useState(false);
  const done = useRef(false);
  const expected = useRef(panes);
  const metadataReady = useRef(ready);
  const readyPanes = useRef(new Set<string>());
  const readyTimes = useRef(new Map<string, number>());
  useEffect(() => {
    markStartup("frontend_mounted");
    markStartupNavigation();
  }, []);
  done.current = finished;
  expected.current = panes;
  metadataReady.current = ready;
  const reportReady = useCallback((paneId: string, ready = true) => {
    if (done.current || !expected.current.includes(paneId)) return false;
    if (readyPanes.current.has(paneId) === ready) return true;
    if (ready) {
      readyPanes.current.add(paneId);
      readyTimes.current.set(paneId, performance.now());
    } else {
      readyPanes.current.delete(paneId);
      readyTimes.current.delete(paneId);
    }
    setSettled(new Set(readyPanes.current));
    return true;
  }, []);
  const painted = ready && panes.every((paneId) => settled.has(paneId));
  useEffect(() => {
    if (!painted || finished || settled.size < expected.current.length) return;
    let cancelled = false;
    // Fonts can change layout after a viewer's first scene callback.
    let frame = requestAnimationFrame(() => {
      void document.fonts.ready.then(() => {
        if (cancelled) return;
        frame = requestAnimationFrame(() => {
          frame = requestAnimationFrame(() => {
            if (
              !cancelled &&
              metadataReady.current &&
              expected.current.every((paneId) => readyPanes.current.has(paneId))
            ) {
              expected.current.forEach((paneId, slot) => {
                markStartup("pane_ready", slot, readyTimes.current.get(paneId));
              });
              markStartup("content_ready");
              setFinished(true);
            }
          });
        });
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [painted, finished, settled]);
  useEffect(() => {
    if (finished) return;
    // A slow or stalled renderer must not trap the user behind the loading layer.
    const timer = setTimeout(() => {
      markStartup("loading_slow");
      setSlow(true);
    }, 10000);
    return () => clearTimeout(timer);
  }, [finished]);
  useEffect(() => {
    if (!finished) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      markStartup("reveal_complete");
      setRevealed(true);
      return;
    }
    // Overlay scrollbars must stay suppressed through the loading layer's fade too.
    const timer = setTimeout(() => {
      markStartup("reveal_complete");
      setRevealed(true);
    }, 200);
    return () => clearTimeout(timer);
  }, [finished]);
  return (
    <ReadyContext.Provider value={reportReady}>
      <div className="relative isolate h-full min-h-0" aria-busy={!finished}>
        <div
          className="relative z-0 h-full"
          data-startup-pending={!revealed || undefined}
          inert={!finished}
          aria-hidden={!finished}
        >
          {children}
        </div>
        <div
          aria-hidden={finished}
          style={{ backgroundColor: "#111318", color: "#e5e7eb" }}
          className={cn(
            "absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 transition-opacity duration-200 motion-reduce:transition-none",
            finished && "pointer-events-none opacity-0",
          )}
        >
          <LoaderCircleIcon
            aria-hidden="true"
            className={cn(
              "size-6 opacity-70",
              !finished && "animate-spin motion-reduce:animate-none",
            )}
          />
          <p role="status" className="text-sm">
            Opening your workspace…
          </p>
          {slow && !finished && (
            <>
              <p className="text-xs opacity-70">Some content is taking longer to open.</p>
              <Button
                variant="outline"
                onClick={() => {
                  markStartup("bypassed");
                  setFinished(true);
                }}
              >
                Show workspace
              </Button>
            </>
          )}
        </div>
      </div>
    </ReadyContext.Provider>
  );
}
