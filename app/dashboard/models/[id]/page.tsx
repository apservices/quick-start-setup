"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/dashboard/header"
import { dataStore } from "@/lib/data-store"
import type { Model, Forge } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StateBadge } from "@/components/forge/state-badge"
import { ProgressIndicator } from "@/components/forge/progress-indicator"
import { ArrowLeft, Plus, Calendar, User, FileCheck } from "lucide-react"
import { format } from "date-fns"

export default function ModelDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [model, setModel] = useState<Model | null>(null)
  const [forges, setForges] = useState<Forge[]>([])

  useEffect(() => {
    if (dataStore && params.id) {
      const m = dataStore.getModel(params.id as string)
      if (m) {
        setModel(m)
        setForges(dataStore.getForgesByModel(m.id))
      }
    }
  }, [params.id])

  if (!model) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Model not found</p>
      </div>
    )
  }

  const statusColors = {
    PENDING_CONSENT: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    ACTIVE: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    ARCHIVED: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  }

  const planColors = {
    PHYSICAL: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    DIGITAL: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    HYBRID: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  }

  return (
    <div>
      <Header
        title={model.name}
        description={`Internal ID: ${model.internalId}`}
        actions={
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="outline" className={`${statusColors[model.status]} text-sm`}>
                {model.status.replace("_", " ")}
              </Badge>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Plan Type</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="outline" className={`${planColors[model.planType]} text-sm`}>
                {model.planType}
              </Badge>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Consent</CardTitle>
            </CardHeader>
            <CardContent>
              {model.consentGiven ? (
                <div className="flex items-center gap-2 text-emerald-400">
                  <FileCheck className="w-4 h-4" />
                  <span>Recorded {model.consentDate && format(model.consentDate, "MMM d, yyyy")}</span>
                </div>
              ) : (
                <span className="text-amber-400">Pending</span>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-foreground">Forges</CardTitle>
              <CardDescription>All forge pipelines for this model</CardDescription>
            </div>
            {model.consentGiven && model.status === "ACTIVE" && (
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                New Forge
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {forges.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No forges yet for this model.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {forges.map((forge) => (
                  <Link
                    key={forge.id}
                    href={`/dashboard/forges/${forge.id}`}
                    className="block p-4 rounded-lg border border-border hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm text-muted-foreground">{forge.id}</span>
                        <StateBadge state={forge.state} />
                      </div>
                      <span className="text-xs text-muted-foreground">{format(forge.createdAt, "MMM d, yyyy")}</span>
                    </div>
                    <ProgressIndicator currentState={forge.state} compact />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Created:</span>
              <span className="text-foreground">{format(model.createdAt, "MMMM d, yyyy 'at' h:mm a")}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Updated:</span>
              <span className="text-foreground">{format(model.updatedAt, "MMMM d, yyyy 'at' h:mm a")}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Created by:</span>
              <span className="text-foreground font-mono">{model.createdBy}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
