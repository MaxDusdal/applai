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
  beforeSave,
}: {
  documentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  beforeSave?: () => Promise<void>;
}) {
  const [label, setLabel] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const utils = api.useUtils();

  const mutation = api.document.createVersion.useMutation({
    onSuccess: () => {
      setLabel("");
      onOpenChange(false);
      void utils.document.listVersions.invalidate({ documentId });
    },
  });

  const handleSave = async () => {
    if (isSaving) return;

    setIsSaving(true);
    try {
      await beforeSave?.();
      await mutation.mutateAsync({
        documentId,
        label: label.trim() || undefined,
      });
    } finally {
      setIsSaving(false);
    }
  };

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
          disabled={isSaving || mutation.isPending}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleSave();
            }
          }}
          autoFocus
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleSave()}
            disabled={isSaving || mutation.isPending}
          >
            <Save className="mr-1 h-4 w-4" />
            {isSaving || mutation.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
