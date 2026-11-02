"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function AboutDialog() {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>About Locus</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>A space for understanding</DialogTitle>
          <DialogDescription>
            Locus is being built for reading, writing, and connecting ideas across your study
            materials.
          </DialogDescription>
        </DialogHeader>
        <p className="text-muted-foreground">
          This is the beginning of that workspace. PDF reading, drawings, and linked notes are
          coming next.
        </p>
      </DialogContent>
    </Dialog>
  );
}
