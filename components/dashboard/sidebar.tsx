"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { SystemStatus } from "@/components/system-status"
import {
  LayoutDashboard,
  Users,
  Workflow,
  Camera,
  ClipboardCheck,
  Award,
  ScrollText,
  LogOut,
  ChevronRight,
  FileCheck,
  Activity,
  Eye,
  Sparkles,
  Wand2,
  FolderOpen,
  Key,
  Briefcase,
  Shield,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const pipelineNavigation = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Models", href: "/dashboard/models", icon: Users },
  { name: "Forges", href: "/dashboard/forges", icon: Workflow },
  { name: "ATLAS Capture", href: "/dashboard/capture", icon: Camera, badge: "New" },
  { name: "Validation", href: "/dashboard/validation", icon: ClipboardCheck },
  { name: "Certification", href: "/dashboard/certification", icon: Award },
  { name: "Registry", href: "/dashboard/registry", icon: FileCheck },
]

const visualTwinNavigation = [
  { name: "Capture Viewer", href: "/dashboard/capture-viewer", icon: Eye },
  { name: "ATLAS Preview", href: "/dashboard/visual-preview", icon: Sparkles },
  { name: "Visual Generator", href: "/dashboard/visual-generator", icon: Wand2 },
  { name: "Asset Vault", href: "/dashboard/assets", icon: FolderOpen },
  { name: "License Engine", href: "/dashboard/licenses", icon: Key },
]

const modelNavigation = [{ name: "My Career", href: "/dashboard/career", icon: Briefcase }]

const clientNavigation = [
  { name: "Licensed Assets", href: "/dashboard/assets", icon: FolderOpen },
  { name: "My Licenses", href: "/dashboard/licenses", icon: Key },
]

const adminNavigation = [
  { name: "Audit Logs", href: "/dashboard/audit", icon: ScrollText },
  { name: "System Logs", href: "/dashboard/system", icon: Activity },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout, hasPermission } = useAuth()

  const isModel = user?.role === "MODEL"
  const isClient = user?.role === "CLIENT"
  const isAdmin = user?.role === "ADMIN"
  const isOperator = user?.role === "OPERATOR"

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <Image src="/atlas-logo.png" alt="ATLAS" width={40} height={40} className="rounded-lg" />
          <div>
            <h1 className="font-semibold text-sidebar-foreground flex items-center gap-2">
              ATLAS™
              <Badge className="bg-primary/20 text-primary text-[10px] px-1.5 py-0">Certified</Badge>
            </h1>
            <p className="text-xs text-muted-foreground">Digital Identity Platform</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {/* MODEL role - Career first */}
        {isModel && (
          <>
            <p className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">My Career</p>
            {modelNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                </Link>
              )
            })}
            <div className="pt-2" />
          </>
        )}

        {/* CLIENT role - Licensed content only */}
        {isClient && (
          <>
            <p className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Licensed Content
            </p>
            {clientNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                </Link>
              )
            })}
          </>
        )}

        {/* Pipeline - ADMIN and OPERATOR only */}
        {(isAdmin || isOperator) && (
          <>
            <p className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Pipeline</p>
            {pipelineNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                  {item.badge && (
                    <Badge className="ml-auto bg-primary/20 text-primary text-[10px] px-1.5 py-0">{item.badge}</Badge>
                  )}
                  {isActive && !item.badge && <ChevronRight className="w-4 h-4 ml-auto" />}
                </Link>
              )
            })}
          </>
        )}

        {/* Visual Twin - ADMIN, OPERATOR, and MODEL (read-only for MODEL) */}
        {(isAdmin || isOperator || isModel) && (
          <>
            <div className="pt-4">
              <p className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Visual Twin
              </p>
            </div>
            {visualTwinNavigation.map((item) => {
              const isActive = pathname === item.href
              // MODEL can only access Capture Viewer and their own previews/assets
              if (isModel && !["Capture Viewer", "ATLAS Preview", "Asset Vault"].includes(item.name)) {
                return null
              }
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                </Link>
              )
            })}
          </>
        )}

        {/* Administration - ADMIN only */}
        {isAdmin && (
          <>
            <div className="pt-4">
              <p className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Administration
              </p>
            </div>
            {adminNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                </Link>
              )
            })}
          </>
        )}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <div className="px-3 py-2 mb-2">
          <SystemStatus />
        </div>
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-xs font-medium text-primary">
              {user?.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.name}</p>
            <div className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{user?.role}</p>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="w-full justify-start text-muted-foreground hover:text-foreground"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </aside>
  )
}
