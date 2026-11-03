"use client";

import {
  AtomIcon,
  BinaryIcon,
  BookOpenIcon,
  BracesIcon,
  BrainIcon,
  CalculatorIcon,
  CircuitBoardIcon,
  CodeIcon,
  CompassIcon,
  CpuIcon,
  DatabaseIcon,
  DnaIcon,
  FeatherIcon,
  FlaskConicalIcon,
  GlobeIcon,
  GraduationCapIcon,
  InfinityIcon,
  KeyboardIcon,
  LandmarkIcon,
  LanguagesIcon,
  LaptopIcon,
  LeafIcon,
  LibraryIcon,
  LightbulbIcon,
  MagnetIcon,
  MicroscopeIcon,
  MonitorIcon,
  NetworkIcon,
  NotebookPenIcon,
  OrbitIcon,
  PenLineIcon,
  PiIcon,
  PuzzleIcon,
  RulerIcon,
  SchoolIcon,
  ScrollTextIcon,
  SigmaIcon,
  TelescopeIcon,
  TerminalIcon,
  TriangleIcon,
} from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Workspace } from "@/lib/library";

const ICONS = [
  { id: "atom", name: "Atom", component: AtomIcon },
  { id: "orbit", name: "Orbit", component: OrbitIcon },
  { id: "sigma", name: "Mathematics", component: SigmaIcon },
  { id: "flask", name: "Chemistry", component: FlaskConicalIcon },
  { id: "telescope", name: "Astronomy", component: TelescopeIcon },
  { id: "microscope", name: "Microscopy", component: MicroscopeIcon },
  { id: "dna", name: "Biology", component: DnaIcon },
  { id: "calculator", name: "Calculator", component: CalculatorIcon },
  { id: "magnet", name: "Magnetism", component: MagnetIcon },
  { id: "globe", name: "Earth science", component: GlobeIcon },
  { id: "book", name: "BookOpen", component: BookOpenIcon },
  { id: "notebook", name: "NotebookPen", component: NotebookPenIcon },
  { id: "pen", name: "PenLine", component: PenLineIcon },
  { id: "feather", name: "Feather", component: FeatherIcon },
  { id: "graduation", name: "GraduationCap", component: GraduationCapIcon },
  { id: "library", name: "Library", component: LibraryIcon },
  { id: "school", name: "School", component: SchoolIcon },
  { id: "scroll", name: "ScrollText", component: ScrollTextIcon },
  { id: "ruler", name: "Ruler", component: RulerIcon },
  { id: "compass", name: "Compass", component: CompassIcon },
  { id: "triangle", name: "Triangle", component: TriangleIcon },
  { id: "pi", name: "Pi", component: PiIcon },
  { id: "infinity", name: "Infinity", component: InfinityIcon },
  { id: "binary", name: "Binary", component: BinaryIcon },
  { id: "code", name: "Code", component: CodeIcon },
  { id: "brain", name: "Brain", component: BrainIcon },
  { id: "lightbulb", name: "Lightbulb", component: LightbulbIcon },
  { id: "puzzle", name: "Puzzle", component: PuzzleIcon },
  { id: "languages", name: "Languages", component: LanguagesIcon },
  { id: "history", name: "Landmark", component: LandmarkIcon },
  { id: "network", name: "Network", component: NetworkIcon },
  { id: "leaf", name: "Leaf", component: LeafIcon },
  { id: "laptop", name: "Laptop", component: LaptopIcon },
  { id: "desktop", name: "Desktop computer", component: MonitorIcon },
  { id: "terminal", name: "Terminal", component: TerminalIcon },
  { id: "cpu", name: "Processor", component: CpuIcon },
  { id: "database", name: "Database", component: DatabaseIcon },
  { id: "circuit", name: "Circuit board", component: CircuitBoardIcon },
  { id: "keyboard", name: "Keyboard", component: KeyboardIcon },
  { id: "braces", name: "Programming", component: BracesIcon },
];
const COLORS = ["red", "orange", "yellow", "green", "cyan", "blue", "purple", "pink"];
function iconColor(value: string | null) {
  return value?.startsWith("theme:icon-") ? `var(--${value.slice(6)})` : value || undefined;
}

export function WorkspaceSymbol({ workspace }: { workspace: Workspace }) {
  const Icon = ICONS.find((item) => item.id === workspace.icon)?.component;
  return (
    <span
      aria-hidden="true"
      style={{ color: iconColor(workspace.iconColor) }}
      className="flex w-4 shrink-0 items-center justify-center text-xs font-medium"
    >
      {Icon ? <Icon className="size-4" /> : workspace.title.slice(0, 1).toUpperCase()}
    </span>
  );
}

export function WorkspaceEditor({
  workspace,
  busy,
  onClose,
  onSave,
}: {
  workspace: Workspace;
  busy: boolean;
  onClose: () => void;
  onSave: (title: string, icon: string | null, color: string | null) => Promise<boolean>;
}) {
  const [title, setTitle] = useState(workspace.title);
  const dialog = useRef<HTMLDivElement>(null);
  const [icon, setIcon] = useState(workspace.icon);
  const [color, setColor] = useState(workspace.iconColor ?? "");
  const preset = color.startsWith("theme:icon-") && COLORS.includes(color.slice(11));
  const valid = color === "" || preset || /^#[0-9a-f]{6}$/i.test(color);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent ref={dialog} className="sm:max-w-md" initialFocus={dialog}>
        <DialogHeader>
          <DialogTitle>Edit Workspace</DialogTitle>
          <DialogDescription>
            Change the name, icon, and color for this workspace.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-5"
          onSubmit={async (event) => {
            event.preventDefault();
            if (valid && title.trim() && !busy && (await onSave(title.trim(), icon, color || null)))
              onClose();
          }}
        >
          <div className="flex items-center gap-3 rounded border p-3">
            <WorkspaceSymbol
              workspace={{ ...workspace, title, icon, iconColor: valid ? color || null : null }}
            />
            <label className="sr-only" htmlFor="workspace-name">
              Workspace name
            </label>
            <input
              id="workspace-name"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              maxLength={120}
              disabled={busy}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <fieldset disabled={busy} className="space-y-2">
            <legend className="mb-2 text-sm">Icon</legend>
            <div className="grid grid-cols-[repeat(auto-fill,2rem)] justify-center gap-2">
              <Button
                type="button"
                variant={icon === null ? "secondary" : "outline"}
                size="icon"
                aria-label="Initial letter"
                aria-pressed={icon === null}
                onClick={() => setIcon(null)}
              >
                {title.slice(0, 1).toUpperCase()}
              </Button>
              {ICONS.map(({ id, name, component: Icon }) => (
                <Button
                  key={id}
                  type="button"
                  variant={icon === id ? "secondary" : "outline"}
                  size="icon"
                  aria-label={name}
                  aria-pressed={icon === id}
                  onClick={() => setIcon(id)}
                >
                  <Icon />
                </Button>
              ))}
            </div>
          </fieldset>
          <fieldset disabled={busy} className="space-y-3">
            <legend className="mb-2 text-sm">Icon color</legend>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="icon"
                variant={color === "" ? "secondary" : "outline"}
                aria-label="Theme default color"
                aria-pressed={color === ""}
                onClick={() => setColor("")}
              >
                <span className="size-4 rounded-full bg-foreground" />
              </Button>
              {COLORS.map((name) => {
                const value = `theme:icon-${name}`;
                return (
                  <Button
                    key={name}
                    type="button"
                    size="icon"
                    variant={color === value ? "secondary" : "outline"}
                    aria-label={`${name} theme color`}
                    aria-pressed={color === value}
                    onClick={() => setColor(value)}
                  >
                    <span
                      className="size-4 rounded-full"
                      style={{ backgroundColor: iconColor(value) }}
                    />
                  </Button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              First swatch: theme default. Palette colors follow your theme.
            </p>
            <label className="flex items-center gap-3 text-sm">
              Custom hex color
              <input
                value={preset ? "" : color}
                onChange={(event) => setColor(event.target.value)}
                placeholder="#60a5fa"
                aria-invalid={!valid}
                maxLength={7}
                className="w-28 border bg-background px-2 py-1"
              />
            </label>
            {!valid && (
              <p role="alert" className="text-sm text-destructive">
                Enter # followed by six hexadecimal digits.
              </p>
            )}
          </fieldset>
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={busy} onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !valid || !title.trim()}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
