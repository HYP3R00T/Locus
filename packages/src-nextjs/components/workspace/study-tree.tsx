"use client";

import {
  BookOpenIcon,
  ChevronRightIcon,
  FileTextIcon,
  FolderIcon,
  PenLineIcon,
} from "lucide-react";
import { NavigationAction } from "@/components/layout/navigation-action";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export const studyItems = [
  { id: "reading", label: "Mechanics textbook", kind: "PDF reader", icon: BookOpenIcon },
  { id: "canvas", label: "Handwritten notes", kind: "Writing pad", icon: PenLineIcon },
  { id: "notes", label: "Written notes", kind: "Text notes", icon: FileTextIcon },
  { id: "paper", label: "Selected paper", kind: "PDF reader", icon: FileTextIcon },
  { id: "problems", label: "Practice problems", kind: "PDF reader", icon: BookOpenIcon },
  { id: "working", label: "Working notes", kind: "Writing pad", icon: PenLineIcon },
] as const;

export type StudyItem = (typeof studyItems)[number];

type StudyFolder = { id: string; label: string; children: readonly (StudyFolder | StudyItem)[] };

const studySpace: StudyFolder = {
  id: "classical-mechanics",
  label: "Classical mechanics",
  children: [
    { id: "books", label: "Books", children: studyItems.slice(0, 3) },
    { id: "papers", label: "Research papers", children: [studyItems[3]] },
    { id: "problem-solving", label: "Problem solving", children: studyItems.slice(4) },
  ],
};

export function StudyTree({
  selectedId,
  onSelect,
}: {
  selectedId?: StudyItem["id"];
  onSelect: (item: StudyItem) => void;
}) {
  function folder(node: StudyFolder) {
    return (
      <Collapsible defaultOpen>
        <CollapsibleTrigger
          render={
            <NavigationAction className="gap-2 px-2 [&_svg:first-child]:size-3 [&[aria-expanded=true]>svg:first-child]:rotate-90" />
          }
        >
          <ChevronRightIcon className="transition-transform" />
          <FolderIcon />
          <span className="truncate" title={node.label}>
            {node.label}
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ul className="tree-children">
            {node.children.map((child) => (
              <li className="tree-branch" key={child.id}>
                {"children" in child ? (
                  folder(child)
                ) : (
                  <NavigationAction
                    aria-current={selectedId === child.id ? "true" : undefined}
                    className={cn("gap-2 px-2", selectedId === child.id && "bg-sidebar-accent")}
                    onClick={() => onSelect(child)}
                  >
                    <child.icon />
                    <span className="truncate" title={child.label}>
                      {child.label}
                    </span>
                  </NavigationAction>
                )}
              </li>
            ))}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <nav aria-label="Study hierarchy" className="min-w-0 px-2">
      {folder(studySpace)}
    </nav>
  );
}
