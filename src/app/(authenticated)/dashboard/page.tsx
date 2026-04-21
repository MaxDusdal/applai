"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { ApplicationsList } from "@/components/applications/applications-list";
import { NewApplicationDialog } from "@/components/applications/new-application-dialog";
import { Button } from "@/components/ui/button";
import { Plus, Briefcase } from "lucide-react";
import { usePageContext } from "@/components/agent/agent-provider";

export default function DashboardPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const applications = api.application.list.useQuery();

  usePageContext({ page: "dashboard" });

  if (applications.isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-3">
          <div className="bg-muted h-8 w-48 rounded" />
          <div className="bg-muted h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  const hasApplications = (applications.data?.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Applications</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Application
        </Button>
      </div>

      {hasApplications ? (
        <ApplicationsList data={applications.data!} />
      ) : (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <div className="bg-muted flex h-16 w-16 items-center justify-center rounded-full">
            <Briefcase className="text-muted-foreground h-8 w-8" />
          </div>
          <div className="space-y-1">
            <p className="font-medium">No applications yet</p>
            <p className="text-muted-foreground text-sm">
              Start tracking your job search by adding your first application.
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Application
          </Button>
        </div>
      )}

      <NewApplicationDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
