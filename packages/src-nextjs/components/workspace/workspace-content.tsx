import { PanelsTopLeftIcon } from "lucide-react";
import type { StudyItem } from "@/components/workspace/study-tree";

export function WorkspaceContent({ item }: { item: StudyItem | null }) {
  const Icon = item?.icon ?? PanelsTopLeftIcon;

  return (
    <section
      aria-label="Study workspace"
      className="flex min-h-full w-full items-center justify-center p-6 sm:p-10"
    >
      <div className="max-w-sm text-center">
        <Icon className="mx-auto mb-5 size-6 text-muted-foreground/60" aria-hidden="true" />
        <h1 className="text-sm font-medium">{item?.label ?? "Your study workspace"}</h1>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {item
            ? `${item.kind} will open in this space. Reading and note tools are coming next.`
            : "Select an item from the sidebar. This space is for your reading, writing, and the connections in between."}
        </p>
      </div>
    </section>
  );
}
