"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save } from "lucide-react";

export function SaveVersionDialog({
  documentId,
  open,
  onOpenChange,
}: {
  documentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [label, setLabel] = useState("");

  const utils = api.useUtils();

  const mutation = api.document.createVersion.useMutation({
    onSuccess: () => {
      setLabel("");
      onOpenChange(false);
      void utils.document.listVersions.invalidate({ documentId });
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setLabel("");
        onOpenChange(v);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save version</DialogTitle>
          <DialogDescription>
            Create a named checkpoint of the current document state.
          </DialogDescription>
        </DialogHeader>
        <Input
          placeholder="Version label (optional)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              mutation.mutate({
                documentId,
                label: label.trim() || undefined,
              });
            }
          }}
          autoFocus
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              mutation.mutate({
                documentId,
                label: label.trim() || undefined,
              })
            }
            disabled={mutation.isPending}
          >
            <Save className="mr-1 h-4 w-4" />
            {mutation.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
