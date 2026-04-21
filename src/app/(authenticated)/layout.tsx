import { redirect } from "next/navigation";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { getSession } from "@/server/better-auth/server";
import { AgentProvider } from "@/components/agent/agent-provider";
import { AgentPanel } from "@/components/agent/agent-panel";
import { AgentToggle } from "@/components/agent/agent-toggle";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <AgentProvider>
        <main className="flex flex-1 flex-col overflow-hidden">
          <header className="flex shrink-0 items-center gap-2 border-b px-4 py-2">
            <SidebarTrigger />
            <div className="ml-auto flex items-center gap-1">
              <AgentToggle />
              <ThemeToggle />
            </div>
          </header>
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
            <AgentPanel />
          </div>
        </main>
      </AgentProvider>
    </SidebarProvider>
  );
}
