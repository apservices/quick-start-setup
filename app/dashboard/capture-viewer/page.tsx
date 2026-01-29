"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/dashboard/header"
import { CaptureViewerGallery } from "@/components/capture-viewer/capture-viewer-gallery"
import { CaptureViewerStats } from "@/components/capture-viewer/capture-viewer-stats"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { dataStore } from "@/lib/data-store"
import { phase2Store } from "@/lib/phase2-store"
import { useAuth } from "@/lib/auth-context"
import type { Forge, Model } from "@/lib/types"
import { Eye, AlertCircle, Lock } from "lucide-react"

export default function CaptureViewerPage() {
  const { user } = useAuth()
  const [certifiedForges, setCertifiedForges] = useState<Forge[]>([])
  const [models, setModels] = useState<Map<string, Model>>(new Map())
  const [selectedDigitalTwinId, setSelectedDigitalTwinId] = useState<string>("")

  useEffect(() => {
    if (dataStore && phase2Store) {
      // Get forges that have digitalTwinId (certified or with captures)
      let forges = dataStore.getForges().filter((f) => f.digitalTwinId)

      // If MODEL role, only show their own forges
      if (user?.role === "MODEL" && user.linkedModelId) {
        forges = forges.filter((f) => f.modelId === user.linkedModelId)
      }

      setCertifiedForges(forges)

      const modelMap = new Map<string, Model>()
      dataStore.getModels().forEach((m) => modelMap.set(m.id, m))
      setModels(modelMap)

      // Auto-select first available
      if (forges.length > 0 && !selectedDigitalTwinId) {
        setSelectedDigitalTwinId(forges[0].digitalTwinId!)
      }
    }
  }, [user, selectedDigitalTwinId])

  const selectedForge = certifiedForges.find((f) => f.digitalTwinId === selectedDigitalTwinId)
  const selectedModel = selectedForge ? models.get(selectedForge.modelId) : null

  return (
    <div>
      <Header title="Capture Viewer" description="View captured biometric data (read-only)" />

      <div className="p-6 space-y-6">
        {/* Read-only notice */}
        <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30 border border-border">
          <Lock className="w-5 h-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground">Read-Only / Internal Use</p>
            <p className="text-xs text-muted-foreground">
              This viewer is for internal review only. No download or export functionality is available.
            </p>
          </div>
          <Badge variant="outline" className="ml-auto">
            Internal
          </Badge>
        </div>

        {/* Digital Twin Selector */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Select Digital Twin</CardTitle>
            <CardDescription>Choose a certified Digital Twin to view captured assets</CardDescription>
          </CardHeader>
          <CardContent>
            {certifiedForges.length === 0 ? (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                <AlertCircle className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-foreground">No Digital Twins available</p>
                  <p className="text-xs text-muted-foreground">
                    Complete the certification process to view captured assets.
                  </p>
                </div>
              </div>
            ) : (
              <Select value={selectedDigitalTwinId} onValueChange={setSelectedDigitalTwinId}>
                <SelectTrigger className="w-full max-w-md bg-input border-border">
                  <SelectValue placeholder="Select a Digital Twin..." />
                </SelectTrigger>
                <SelectContent>
                  {certifiedForges.map((forge) => {
                    const model = models.get(forge.modelId)
                    return (
                      <SelectItem key={forge.digitalTwinId} value={forge.digitalTwinId!}>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-primary">{forge.digitalTwinId}</span>
                          <span className="text-muted-foreground">-</span>
                          <span>{model?.name || "Unknown"}</span>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        {selectedDigitalTwinId && selectedModel ? (
          <>
            {/* Stats */}
            <CaptureViewerStats digitalTwinId={selectedDigitalTwinId} modelName={selectedModel.name} />

            {/* Gallery */}
            <CaptureViewerGallery digitalTwinId={selectedDigitalTwinId} />
          </>
        ) : (
          <Card className="bg-card border-border">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Eye className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-1">No Digital Twin Selected</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                Select a Digital Twin from the dropdown above to view captured biometric assets.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
