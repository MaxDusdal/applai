import { redirect } from "next/navigation";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AuthenticatedHeader } from "@/components/authenticated-header";
import { getSession } from "@/server/better-auth/server";
import { AgentProvider } from "@/components/agent/agent-provider";
import { AgentPanel } from "@/components/agent/agent-panel";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  const user = {
    name: session.user.name,
    email: session.user.email,
    image: session.user.image ?? null,
  };

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "21rem",
        } as React.CSSProperties
      }
    >
      <AppSidebar user={user} />
      <AgentProvider>
        <main className="flex h-svh min-w-0 flex-1 flex-col overflow-hidden">
          <AuthenticatedHeader />
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
              {children}
            </div>
            <AgentPanel />
          </div>
        </main>
      </AgentProvider>
    </SidebarProvider>
  );
}
