"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useParams } from "next/navigation"

import { NavUser } from "@/components/nav-user"
import { StatusBadge } from "@/components/applications/status-badge"
import { NewApplicationDialog } from "@/components/applications/new-application-dialog"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  LayoutDashboardIcon,
  UserIcon,
  FileTextIcon,
  SettingsIcon,
  SparklesIcon,
  PlusIcon,
} from "lucide-react"
import { api } from "@/trpc/react"
import { Button } from "@/components/ui/button"

const navItems = [
  {
    title: "Applications",
    href: "/dashboard",
    icon: LayoutDashboardIcon,
    matchPrefixes: ["/dashboard", "/applications"],
  },
  {
    title: "Profile",
    href: "/profile",
    icon: UserIcon,
    matchPrefixes: ["/profile"],
  },
  {
    title: "Templates",
    href: "/templates",
    icon: FileTextIcon,
    matchPrefixes: ["/templates"],
  },
  {
    title: "Settings",
    href: "/settings",
    icon: SettingsIcon,
    matchPrefixes: ["/settings"],
  },
]

function formatRelativeDate(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - new Date(date).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(date))
}

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  user: {
    name: string
    email: string
    image: string | null
  }
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const pathname = usePathname()
  const params = useParams()
  const { setOpen } = useSidebar()
  const [search, setSearch] = React.useState("")
  const [dialogOpen, setDialogOpen] = React.useState(false)

  const activeNav = navItems.find((item) =>
    item.matchPrefixes.some((prefix) => pathname.startsWith(prefix))
  ) ?? navItems[0]!

  const showApplicationsPanel = activeNav.title === "Applications"

  // Auto-collapse sidebar on non-application pages (no second panel to show)
  React.useEffect(() => {
    if (!showApplicationsPanel) {
      setOpen(false)
    }
  }, [showApplicationsPanel, setOpen])

  const activeApplicationId = params.id as string | undefined

  return (
    <Sidebar
      collapsible="icon"
      className="overflow-hidden *:data-[sidebar=sidebar]:flex-row"
      {...props}
    >
      {/* First sidebar — icon rail */}
      <Sidebar
        collapsible="none"
        className="!w-[calc(var(--sidebar-width-icon)+1px)] border-r"
      >
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                className="md:h-8 md:p-0"
                render={<Link href="/dashboard" />}
              >
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <SparklesIcon className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Applai</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent className="px-1.5 md:px-0">
              <SidebarMenu>
                {navItems.map((item) => {
                  const isActive = item.title === activeNav.title
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        tooltip={item.title}
                        render={<Link href={item.href} />}
                        onClick={() => setOpen(true)}
                        isActive={isActive}
                        className="px-2.5 md:px-2"
                      >
                        <item.icon />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <NavUser user={user} />
        </SidebarFooter>
      </Sidebar>

      {/* Second sidebar — applications list panel (desktop only, only on applications route) */}
      {showApplicationsPanel && (
        <Sidebar collapsible="none" className="hidden flex-1 md:flex overflow-hidden !w-auto">
          <SidebarHeader className="gap-3.5 border-b p-4">
            <div className="flex w-full items-center justify-between">
              <div className="text-base font-medium text-foreground">
                Applications
              </div>
              <Button size="sm" variant="ghost" onClick={() => setDialogOpen(true)}>
                <PlusIcon className="size-4" />
                <span className="sr-only">New Application</span>
              </Button>
            </div>
            <SidebarInput
              placeholder="Search applications..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup className="px-0">
              <SidebarGroupContent>
                <ApplicationListPanel
                  search={search}
                  activeApplicationId={activeApplicationId}
                />
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <NewApplicationDialog open={dialogOpen} onOpenChange={setDialogOpen} />
        </Sidebar>
      )}
    </Sidebar>
  )
}

function ApplicationListPanel({
  search,
  activeApplicationId,
}: {
  search: string
  activeApplicationId?: string
}) {
  const applications = api.application.list.useQuery()

  if (applications.isLoading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="animate-pulse space-y-1.5">
            <div className="h-4 w-3/4 rounded bg-muted" />
            <div className="h-3 w-1/2 rounded bg-muted" />
          </div>
        ))}
      </div>
    )
  }

  const data = applications.data ?? []
  const filtered = search
    ? data.filter(
        (app) =>
          app.company.toLowerCase().includes(search.toLowerCase()) ||
          app.role.toLowerCase().includes(search.toLowerCase())
      )
    : data

  if (filtered.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-sm text-muted-foreground">
        {search ? "No results found." : "No applications yet."}
      </div>
    )
  }

  return (
    <>
      {filtered.map((app) => {
        const isActive = app.id === activeApplicationId
        const initials = app.company
          .split(" ")
          .slice(0, 2)
          .map((w) => w[0])
          .join("")
          .toUpperCase()

        return (
          <Link
            href={`/applications/${app.id}`}
            key={app.id}
            className={`flex items-start gap-3 border-b p-4 text-sm leading-tight overflow-hidden last:border-b-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : ""
            }`}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold text-muted-foreground">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium">{app.company}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatRelativeDate(app.updatedAt)}
                </span>
              </div>
              <span className="truncate text-xs text-muted-foreground block">
                {app.role}
              </span>
              <div className="mt-1.5">
                <StatusBadge status={app.status} />
              </div>
            </div>
          </Link>
        )
      })}
    </>
  )
}
