"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Header } from "@/components/dashboard/header"
import type { Forge, ForgeState, Model } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { CaptureInterface } from "@/components/capture/capture-interface"
import { Camera, AlertCircle, Shield, Loader2 } from "lucide-react"
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

type ModelRow = {
  id: string
  full_name: string
  status: string | null
  created_at: string | null
  user_id: string | null
}

function mapForgeRow(row: ForgeRow): Forge {
  return {
    id: row.id,
    modelId: row.model_id,
    state: (String(row.state || "CREATED").toUpperCase() as ForgeState) || "CREATED",
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

function mapModelRow(row: ModelRow): Model {
  const statusRaw = String(row.status || "pending").toLowerCase()
  const status: Model["status"] = statusRaw === "active" ? "ACTIVE" : statusRaw === "archived" ? "ARCHIVED" : "PENDING_CONSENT"
  return {
    id: row.id,
    name: row.full_name,
    internalId: row.id,
    status,
    planType: "DIGITAL",
    consentGiven: status === "ACTIVE",
    consentDate: status === "ACTIVE" ? new Date(row.created_at || Date.now()) : undefined,
    createdAt: new Date(row.created_at || Date.now()),
    updatedAt: new Date(row.created_at || Date.now()),
    createdBy: row.user_id || "",
  }
}

export default function CapturePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedForgeId, setSelectedForgeId] = useState<string>("")
  const [isInitialized, setIsInitialized] = useState(false)

  const [forges, setForges] = useState<Forge[]>([])
  const [models, setModels] = useState<Map<string, Model>>(new Map())

  useEffect(() => {
    if (isInitialized) return

    const load = async () => {
      const { data: forgeRows, error: forgeError } = await supabase
        .from("forges")
        .select(
          "id, model_id, state, version, digital_twin_id, seed_hash, capture_progress, created_at, updated_at, certified_at, created_by",
        )
        .in("state", ["CREATED", "CAPTURED"]) // eligible for capture UI
        .order("created_at", { ascending: false })

      if (forgeError) {
        setForges([])
        setModels(new Map())
        setIsInitialized(true)
        return
      }

      const mappedForges = ((forgeRows ?? []) as ForgeRow[]).map(mapForgeRow)
      setForges(mappedForges)

      const modelIds = Array.from(new Set(mappedForges.map((f) => f.modelId).filter(Boolean)))
      if (modelIds.length > 0) {
        const { data: modelRows, error: modelError } = await supabase
          .from("models")
          .select("id, full_name, status, created_at, user_id")
          .in("id", modelIds)

        if (!modelError) {
          const modelMap = new Map<string, Model>()
          ;((modelRows ?? []) as ModelRow[]).forEach((r) => modelMap.set(r.id, mapModelRow(r)))
          setModels(modelMap)
        } else {
          setModels(new Map())
        }
      } else {
        setModels(new Map())
      }

      const forgeIdFromUrl = searchParams.get("forge")
      if (forgeIdFromUrl && mappedForges.some((f) => f.id === forgeIdFromUrl)) {
        setSelectedForgeId(forgeIdFromUrl)
      }

      setIsInitialized(true)
    }

    void load()
  }, [searchParams, isInitialized])

  const selectedForge = forges.find((f) => f.id === selectedForgeId)
  const selectedModel = selectedForge ? models.get(selectedForge.modelId) : undefined

  if (!isInitialized) {
    return (
      <div>
        <Header title="ATLAS Capture™" description="Biometric data capture interface with guided and manual modes" />
        <div className="p-6">
          <Card className="bg-card border-border">
            <CardContent className="flex items-center justify-center py-16">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">Loading capture interface...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header title="ATLAS Capture™" description="Biometric data capture interface with guided and manual modes" />

      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/10 border border-primary/20">
          <Shield className="w-5 h-5 text-primary" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">ATLAS Capture™ — Secure Biometric Collection</p>
            <p className="text-xs text-muted-foreground">
              Two capture modes available: Guided Mobile Capture for compatible devices, or Manual Upload for all
              platforms.
            </p>
          </div>
          <Badge className="bg-primary/20 text-primary border-primary/30">Phase 2</Badge>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Select Forge</CardTitle>
            <CardDescription>Choose a forge to begin or continue capture process</CardDescription>
          </CardHeader>
          <CardContent>
            {forges.length === 0 ? (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                <AlertCircle className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-foreground">No forges available for capture</p>
                  <p className="text-xs text-muted-foreground">
                    Create a new forge from a model with consent to begin capturing.
                  </p>
                </div>
              </div>
            ) : (
              <Select value={selectedForgeId || undefined} onValueChange={setSelectedForgeId}>
                <SelectTrigger className="w-full max-w-md bg-input border-border">
                  <SelectValue placeholder="Select a forge..." />
                </SelectTrigger>
                <SelectContent>
                  {forges.map((forge) => {
                    const model = models.get(forge.modelId)
                    return (
                      <SelectItem key={forge.id} value={forge.id}>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs">{forge.id}</span>
                          <span className="text-muted-foreground">-</span>
                          <span>{model?.name || "Unknown"}</span>
                          <span className="text-xs text-muted-foreground">({forge.captureProgress}/54)</span>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        {selectedForge && selectedModel ? (
          <CaptureInterface
            forge={selectedForge}
            model={selectedModel}
            onComplete={() => router.push("/dashboard/forges")}
          />
        ) : (
          <Card className="bg-card border-border">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Camera className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-1">No Forge Selected</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                Select a forge from the dropdown above to begin the biometric capture process.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
