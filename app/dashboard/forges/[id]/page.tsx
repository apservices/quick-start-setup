"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Header } from "@/components/dashboard/header"
import type { Forge } from "@/lib/types"
import { ForgeStateMachine } from "@/lib/forge-state-machine"
import { useAuth } from "@/lib/auth-context"
import { getForgeActions } from "@/lib/rbac"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StateBadge } from "@/components/forge/state-badge"
import { ProgressIndicator } from "@/components/forge/progress-indicator"
import { LoadingCard } from "@/components/loading-state"
import { ErrorFallback } from "@/components/error-boundary"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Lock,
  Calendar,
  User,
  Hash,
  Shield,
  CheckCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import Link from "next/link"
import { supabase } from "@/src/integrations/supabase/client"

type ForgeRow = {
  id: string
  model_id: string
  state: string
  version: number
  digital_twin_id: string | null
  seed_hash: string | null
  capture_progress: number
  created_at: string
  updated_at: string
  certified_at: string | null
  created_by: string
}

type ModelRow = { id: string; full_name: string }

type ModelMini = { id: string; name: string; internalId: string }

function mapForgeRow(row: ForgeRow): Forge {
  return {
    id: row.id,
    modelId: row.model_id,
    state: (String(row.state || "CREATED").toUpperCase() as any) || "CREATED",
    version: row.version ?? 1,
    digitalTwinId: row.digital_twin_id ?? undefined,
    seedHash: row.seed_hash ?? undefined,
    captureProgress: row.capture_progress ?? 0,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    certifiedAt: row.certified_at ? new Date(row.certified_at) : undefined,
    createdBy: row.created_by,
  }
}

export default function ForgeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [forge, setForge] = useState<Forge | null>(null)
  const [model, setModel] = useState<ModelMini | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [confirmAction, setConfirmAction] = useState<"advance" | "rollback" | null>(null)

  const loadData = useCallback(() => {
    setIsLoading(true)

    const run = async () => {
      try {
        if (!params.id) return

        const { data: forgeRow, error: forgeError } = await supabase
          .from("forges")
          .select(
            "id, model_id, state, version, digital_twin_id, seed_hash, capture_progress, created_at, updated_at, certified_at, created_by",
          )
          .eq("id", params.id as string)
          .maybeSingle()

        if (forgeError || !forgeRow) {
          setForge(null)
          setModel(null)
          return
        }

        const f = mapForgeRow(forgeRow as ForgeRow)
        setForge(f)

        const { data: modelRow } = await supabase
          .from("models")
          .select("id, full_name")
          .eq("id", f.modelId)
          .maybeSingle()

        if (modelRow) {
          const mr = modelRow as ModelRow
          setModel({ id: mr.id, name: mr.full_name, internalId: mr.id })
        } else {
          setModel({ id: f.modelId, name: "Unknown Model", internalId: f.modelId })
        }
      } finally {
        setIsLoading(false)
      }
    }

    void run()
  }, [params.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  const refreshForge = () => {
    // no-op for now; data is loaded from Supabase.
  }

  const handleAdvance = async () => {
    if (!forge || !user) return

    setIsProcessing(true)

    try {
      toast.info("Em breve", {
        description: "A transição do pipeline ainda não está conectada ao Supabase nesta tela.",
      })
    } finally {
      setIsProcessing(false)
      setConfirmAction(null)
    }
  }

  const handleRollback = async () => {
    if (!forge || !user) return

    setIsProcessing(true)

    try {
      toast.info("Em breve", {
        description: "A transição do pipeline ainda não está conectada ao Supabase nesta tela.",
      })
    } finally {
      setIsProcessing(false)
      setConfirmAction(null)
    }
  }

  if (isLoading) {
    return (
      <div>
        <Header title="Forge Details" description="Loading..." />
        <div className="p-6">
          <LoadingCard title="Loading Forge" description="Fetching forge details..." />
        </div>
      </div>
    )
  }

  if (!forge || !model) {
    return (
      <div>
        <Header title="Forge Details" description="Not found" />
        <div className="p-6">
          <ErrorFallback
            title="Forge not found"
            description="The requested forge could not be found."
            onRetry={() => router.push("/dashboard/forges")}
          />
        </div>
      </div>
    )
  }

  const stateMachine = new ForgeStateMachine(forge.state)
  const isCertified = forge.state === "CERTIFIED"
  const nextState = stateMachine.getNextState()
  const prevState = stateMachine.getPreviousState()

  // Get actions based on RBAC
  const actions = getForgeActions(user?.role, forge.state)

  return (
    <div>
      <Header
        title={`Identity Record ${forge.id}`}
        description={`Model: ${model.name}`}
        actions={
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {isCertified && (
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-primary">ATLAS VERIFIED</h3>
                <p className="text-sm text-muted-foreground">
                  Digital Twin ID: <span className="font-mono text-foreground">{forge.digitalTwinId}</span>
                </p>
              </div>
            </div>
          </div>
        )}

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Pipeline Progress</CardTitle>
            <CardDescription>Current state: {ForgeStateMachine.getStateDescription(forge.state)}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <ProgressIndicator currentState={forge.state} />

            {!isCertified && (
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <Button
                  variant="outline"
                  disabled={!actions.canRollback || isProcessing}
                  onClick={() => setConfirmAction("rollback")}
                >
                  {isProcessing && confirmAction === "rollback" ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RotateCcw className="w-4 h-4 mr-2" />
                  )}
                  Rollback to {prevState || "N/A"}
                </Button>

                <Button disabled={!actions.canAdvance || isProcessing} onClick={() => setConfirmAction("advance")}>
                  {isProcessing && confirmAction === "advance" ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Advance to {nextState || "N/A"}
                  {!isProcessing && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
              </div>
            )}

            {isCertified && (
              <div className="flex items-center gap-2 pt-4 border-t border-border text-muted-foreground">
                <Lock className="w-4 h-4" />
                <span className="text-sm">
                  This forge is certified and permanently read-only. No modifications are allowed.
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Forge Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  Forge ID
                </span>
                <span className="font-mono text-foreground">{forge.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Current State</span>
                <StateBadge state={forge.state} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Capture Progress</span>
                <span className="text-foreground">{forge.captureProgress}/54</span>
              </div>
              {forge.seedHash && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Seed Hash</span>
                  <span className="font-mono text-xs text-foreground truncate max-w-[200px]">{forge.seedHash}</span>
                </div>
              )}
              {forge.digitalTwinId && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Digital Twin ID</span>
                  <span className="font-mono text-primary">{forge.digitalTwinId}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Model Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Name
                </span>
                <Link href={`/dashboard/models/${model.id}`} className="text-foreground hover:text-primary">
                  {model.name}
                </Link>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Internal ID</span>
                <span className="font-mono text-foreground">{model.internalId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Plan Type</span>
                <Badge variant="outline">—</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Created:</span>
              <span className="text-foreground">{format(forge.createdAt, "MMMM d, yyyy 'at' h:mm a")}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Last Updated:</span>
              <span className="text-foreground">{format(forge.updatedAt, "MMMM d, yyyy 'at' h:mm a")}</span>
            </div>
            {forge.certifiedAt && (
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">Certified:</span>
                <span className="text-primary">{format(forge.certifiedAt, "MMMM d, yyyy 'at' h:mm a")}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Created by:</span>
              <span className="font-mono text-foreground">{forge.createdBy}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advance Confirmation */}
      <AlertDialog open={confirmAction === "advance"} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary" />
              Advance Pipeline
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to advance from <strong>{forge.state}</strong> to <strong>{nextState}</strong>?
              {nextState === "CERTIFIED" && (
                <span className="block mt-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <strong>Warning:</strong> Certification is permanent and irreversible. The forge will become read-only
                  and cannot be modified or rolled back.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAdvance} disabled={isProcessing}>
              {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Advance
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rollback Confirmation */}
      <AlertDialog open={confirmAction === "rollback"} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Rollback Pipeline
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to rollback from <strong>{forge.state}</strong> to <strong>{prevState}</strong>?
              This action may require re-processing of previous steps.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRollback}
              disabled={isProcessing}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Rollback
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
