"use client"

import { usePathname } from "next/navigation"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { AgentToggle } from "@/components/agent/agent-toggle"
import { ThemeToggle } from "@/components/theme-toggle"

const routeLabels: Record<string, string> = {
  dashboard: "Applications",
  applications: "Applications",
  profile: "Profile",
  templates: "Templates",
  settings: "Settings",
  documents: "Documents",
}

function useBreadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)

  const crumbs: { label: string; href?: string }[] = []

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]!
    const label = routeLabels[segment]

    if (label) {
      const href = "/" + segments.slice(0, i + 1).join("/")
      crumbs.push({ label, href })
    }
    // Skip dynamic segments (UUIDs, etc.) — they don't get their own breadcrumb
  }

  // Mark last crumb as current page (no href)
  if (crumbs.length > 0) {
    const last = crumbs[crumbs.length - 1]!
    // If "Applications" appears twice (dashboard + applications/[id]), deduplicate
    if (crumbs.length >= 2 && crumbs[0]!.label === crumbs[1]!.label) {
      crumbs.splice(0, 1)
    }
    delete last.href
  }

  return crumbs
}

export function AuthenticatedHeader() {
  const crumbs = useBreadcrumbs()

  return (
    <header className="flex shrink-0 items-center gap-2 border-b px-4 py-2">
      <SidebarTrigger />
      {crumbs.length > 0 && (
        <>
          <Separator
            orientation="vertical"
            className="mr-2 data-vertical:h-4 data-vertical:self-auto"
          />
          <Breadcrumb>
            <BreadcrumbList>
              {crumbs.map((crumb, i) => (
                <BreadcrumbItem key={i}>
                  {i > 0 && <BreadcrumbSeparator />}
                  {crumb.href ? (
                    <BreadcrumbLink href={crumb.href}>
                      {crumb.label}
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </>
      )}
      <div className="ml-auto flex items-center gap-1">
        <AgentToggle />
        <ThemeToggle />
      </div>
    </header>
  )
}
