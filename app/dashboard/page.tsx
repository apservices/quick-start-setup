"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Header } from "@/components/dashboard/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { dataStore } from "@/lib/data-store"
import { phase2Store } from "@/lib/phase2-store"
import { useAuth } from "@/lib/auth-context"
import { FORGE_STATES } from "@/lib/types"
import {
  Users,
  Workflow,
  Award,
  TrendingUp,
  Eye,
  Key,
  FolderOpen,
  ArrowRight,
  Camera,
  Shield,
  Sparkles,
} from "lucide-react"
import { LoadingCard } from "@/components/loading-state"
import { ErrorFallback } from "@/components/error-boundary"

interface DashboardStats {
  totalModels: number
  activeModels: number
  pendingConsent: number
  totalForges: number
  certifiedForges: number
  inProgressForges: number
  forgesByState: Record<string, number>
  // Phase 2 stats
  activePreviews: number
  activeLicenses: number
  totalAssets: number
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = () => {
    setIsLoading(true)
    setError(null)
    try {
      if (dataStore && phase2Store) {
        const baseStats = dataStore.getStats()

        // Calculate Phase 2 stats
        const activePreviews = phase2Store.getActivePreviews().length
        const activeLicenses = phase2Store.getActiveLicenses().length

        // Count total visual assets across all certified forges
        const certifiedForges = dataStore.getForges().filter((f) => f.state === "CERTIFIED" && f.digitalTwinId)
        let totalAssets = 0
        certifiedForges.forEach((f) => {
          if (f.digitalTwinId) {
            totalAssets += phase2Store.getVisualAssetsByDigitalTwin(f.digitalTwinId).length
          }
        })

        setStats({
          ...baseStats,
          activePreviews,
          activeLicenses,
          totalAssets,
        })
      }
    } catch (e) {
      setError("Failed to load dashboard statistics")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div>
        <Header title="Overview" description="System metrics and pipeline status" />
        <div className="p-6">
          <LoadingCard title="Loading Dashboard" description="Fetching system metrics..." />
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div>
        <Header title="Overview" description="System metrics and pipeline status" />
        <div className="p-6">
          <ErrorFallback title="Failed to load dashboard" description={error || "Unknown error"} onRetry={loadStats} />
        </div>
      </div>
    )
  }

  const isAdmin = user?.role === "ADMIN"
  const isOperator = user?.role === "OPERATOR"
  const isModel = user?.role === "MODEL"
  const isClient = user?.role === "CLIENT"

  // Primary stat cards based on role
  const statCards = isClient
    ? [
        {
          title: "My Licenses",
          value: stats.activeLicenses,
          description: "Active licenses",
          icon: Key,
          color: "text-emerald-400",
          href: "/dashboard/licenses",
        },
        {
          title: "Licensed Assets",
          value: stats.totalAssets,
          description: "Available for download",
          icon: FolderOpen,
          color: "text-blue-400",
          href: "/dashboard/assets",
        },
      ]
    : isModel
      ? [
          {
            title: "Digital Twin",
            value: stats.certifiedForges > 0 ? "Certified" : "Pending",
            description: stats.certifiedForges > 0 ? "Ready for commercial use" : "In progress",
            icon: Award,
            color: "text-primary",
            href: "/dashboard/career",
          },
          {
            title: "Licensed Assets",
            value: stats.totalAssets,
            description: "Generated from your likeness",
            icon: FolderOpen,
            color: "text-blue-400",
            href: "/dashboard/assets",
          },
        ]
      : [
          {
            title: "Total Models",
            value: stats.totalModels,
            description: `${stats.activeModels} active`,
            icon: Users,
            color: "text-blue-400",
            href: "/dashboard/models",
          },
          {
            title: "Total Forges",
            value: stats.totalForges,
            description: `${stats.inProgressForges} in progress`,
            icon: Workflow,
            color: "text-amber-400",
            href: "/dashboard/forges",
          },
          {
            title: "Certified Twins",
            value: stats.certifiedForges,
            description: "Digital Twins",
            icon: Award,
            color: "text-primary",
            href: "/dashboard/certification",
          },
          {
            title: "Pending Consent",
            value: stats.pendingConsent,
            description: "Models awaiting",
            icon: TrendingUp,
            color: "text-rose-400",
            href: "/dashboard/models",
          },
        ]

  // Phase 2 stat cards (for Admin/Operator)
  const phase2Cards = [
    {
      title: "Active Previews",
      value: stats.activePreviews,
      description: "Watermarked previews",
      icon: Eye,
      color: "text-amber-400",
      href: "/dashboard/visual-preview",
    },
    {
      title: "Active Licenses",
      value: stats.activeLicenses,
      description: "Commercial licenses",
      icon: Key,
      color: "text-emerald-400",
      href: "/dashboard/licenses",
    },
    {
      title: "Visual Assets",
      value: stats.totalAssets,
      description: "Generated assets",
      icon: FolderOpen,
      color: "text-blue-400",
      href: "/dashboard/assets",
    },
  ]

  // Quick actions based on role
  const quickActions = isClient
    ? [
        { label: "View Licensed Assets", href: "/dashboard/assets", icon: FolderOpen },
        { label: "My Licenses", href: "/dashboard/licenses", icon: Key },
      ]
    : isModel
      ? [
          { label: "My Career", href: "/dashboard/career", icon: Users },
          { label: "View Previews", href: "/dashboard/visual-preview", icon: Sparkles },
        ]
      : [
          { label: "ATLAS Capture", href: "/dashboard/capture", icon: Camera, badge: "New" },
          { label: "Visual Generator", href: "/dashboard/visual-generator", icon: Sparkles },
          { label: "License Engine", href: "/dashboard/licenses", icon: Key },
          { label: "Asset Vault", href: "/dashboard/assets", icon: FolderOpen },
        ]

  return (
    <div>
      <Header title="Overview" description="System metrics and pipeline status" />

      <div className="p-6 space-y-6">
        {/* Welcome Banner */}
        <div className="flex items-center gap-4 p-6 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-foreground">Welcome to ATLAS™</h2>
            <p className="text-sm text-muted-foreground">
              {isClient
                ? "Access your licensed digital twin assets and manage your licenses."
                : isModel
                  ? "Monitor your Digital Twin certification and career platform."
                  : "Manage digital twin certification, visual generation, and licensing."}
            </p>
          </div>
          <Badge className="bg-primary/20 text-primary border-primary/30">Phase 2 Active</Badge>
        </div>

        {/* Primary Stats */}
        <div className={`grid grid-cols-1 md:grid-cols-2 ${isAdmin || isOperator ? "lg:grid-cols-4" : ""} gap-4`}>
          {statCards.map((stat) => (
            <Link key={stat.title} href={stat.href}>
              <Card className="bg-card border-border hover:border-primary/30 transition-colors cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Phase 2 Stats (Admin/Operator only) */}
        {(isAdmin || isOperator) && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Visual Twin Platform
              </h3>
              <Badge variant="outline" className="text-xs">
                Phase 2
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {phase2Cards.map((stat) => (
                <Link key={stat.title} href={stat.href}>
                  <Card className="bg-card border-border hover:border-primary/30 transition-colors cursor-pointer">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                      <stat.icon className={`w-4 h-4 ${stat.color}`} />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                      <p className="text-xs text-muted-foreground">{stat.description}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Quick Actions</CardTitle>
            <CardDescription>Frequently used features</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {quickActions.map((action) => (
                <Link key={action.label} href={action.href}>
                  <Button
                    variant="outline"
                    className="w-full h-auto py-4 flex flex-col items-center gap-2 hover:bg-primary/5 hover:border-primary/30 bg-transparent"
                  >
                    <action.icon className="w-5 h-5 text-primary" />
                    <span className="text-sm">{action.label}</span>
                    {"badge" in action && action.badge && (
                      <Badge className="bg-primary/20 text-primary text-[10px] px-1.5 py-0">{action.badge}</Badge>
                    )}
                  </Button>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pipeline Distribution (Admin/Operator only) */}
        {(isAdmin || isOperator) && (
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-foreground">Pipeline Distribution</CardTitle>
                  <CardDescription>Forges by current state</CardDescription>
                </div>
                <Link href="/dashboard/forges">
                  <Button variant="ghost" size="sm" className="text-primary">
                    View All
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {FORGE_STATES.map((state) => {
                  const count = stats.forgesByState[state] || 0
                  const percentage = stats.totalForges > 0 ? (count / stats.totalForges) * 100 : 0

                  return (
                    <div key={state} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-foreground">{state}</span>
                        <span className="text-muted-foreground">{count}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Data Flow Status */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground text-sm">System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-muted-foreground">Pipeline Active</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-muted-foreground">Visual Generator Online</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-muted-foreground">License Engine Active</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
