"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { canAccessRoute } from "@/lib/rbac"
import { Sidebar } from "@/components/dashboard/sidebar"
import { ErrorBoundary } from "@/components/error-boundary"
import { LoadingOverlay } from "@/components/loading-state"
import { Lock } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

function AccessDenied() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="bg-card border-border max-w-md w-full">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-6">You do not have permission to access this page.</p>
          <Link href="/dashboard">
            <Button>Return to Dashboard</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isLoading, validateSession } = useAuth()
  const [hasAccess, setHasAccess] = useState(true)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
      return
    }

    // Validate session periodically
    if (user && !validateSession()) {
      router.push("/login")
      return
    }

    // Check route access
    if (user) {
      const access = canAccessRoute(user.role, pathname)
      setHasAccess(access)
    }
  }, [user, isLoading, router, pathname, validateSession])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <LoadingOverlay fullScreen message="Initializing system..." />
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="pl-64">
          <AccessDenied />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="pl-64">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
    </div>
  )
}
