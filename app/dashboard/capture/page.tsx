"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Header } from "@/components/dashboard/header"
import { dataStore } from "@/lib/data-store"
import type { Model } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { CaptureInterface } from "@/components/capture/capture-interface"
import { Camera, AlertCircle, Shield, Loader2 } from "lucide-react"

export default function CapturePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedForgeId, setSelectedForgeId] = useState<string>("")
  const [isInitialized, setIsInitialized] = useState(false)

  const forges = useMemo(() => {
    if (!dataStore) return []
    return dataStore.getForges().filter((f) => f.state === "CREATED" || f.state === "CAPTURED")
  }, [isInitialized])

  const models = useMemo(() => {
    if (!dataStore) return new Map<string, Model>()
    const modelMap = new Map<string, Model>()
    dataStore.getModels().forEach((m) => modelMap.set(m.id, m))
    return modelMap
  }, [isInitialized])

  useEffect(() => {
    if (!dataStore || isInitialized) return

    const forgeIdFromUrl = searchParams.get("forge")
    const availableForges = dataStore.getForges().filter((f) => f.state === "CREATED" || f.state === "CAPTURED")

    if (forgeIdFromUrl && availableForges.some((f) => f.id === forgeIdFromUrl)) {
      setSelectedForgeId(forgeIdFromUrl)
    }

    setIsInitialized(true)
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
