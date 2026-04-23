"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/trpc/react";
import { RichTextEditor } from "@/components/profile/rich-text-editor";
import { usePageContext } from "@/components/agent/agent-provider";

export default function ProfilePage() {
  const profile = api.profile.get.useQuery();
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const updateMutation = api.profile.update.useMutation({
    onSuccess: () => setSavedAt(new Date()),
  });

  useEffect(() => {
    if (profile.data?.updatedAt && savedAt === null) {
      setSavedAt(new Date(profile.data.updatedAt));
    }
  }, [profile.data?.updatedAt, savedAt]);

  usePageContext({ page: "profile" });

  const handleEditorSave = useCallback(
    (content: string) => {
      updateMutation.mutate({ content });
    },
    [updateMutation],
  );

  if (profile.isLoading) {
    return (
      <div className="flex-1 animate-pulse p-6">
        <div className="bg-muted mb-4 h-8 w-48 rounded" />
        <div className="bg-muted h-64 rounded" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="min-w-0 flex-1 overflow-y-auto">
        <RichTextEditor
          key={`editor-${String(profile.data?.updatedAt)}`}
          initialContent={profile.data?.content ?? ""}
          onSave={handleEditorSave}
          isSaving={updateMutation.isPending}
          savedAt={savedAt}
        />
      </div>
    </div>
  );
}
