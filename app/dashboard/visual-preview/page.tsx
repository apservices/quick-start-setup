"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/dashboard/header"
import { PreviewGenerator } from "@/components/visual-preview/preview-generator"
import { PreviewGallery } from "@/components/visual-preview/preview-gallery"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { dataStore } from "@/lib/data-store"
import { useAuth } from "@/lib/auth-context"
import type { Forge, Model } from "@/lib/types"
import { Sparkles, AlertCircle, Eye } from "lucide-react"

export default function VisualPreviewPage() {
  const { user } = useAuth()
  const [certifiedForges, setCertifiedForges] = useState<Forge[]>([])
  const [models, setModels] = useState<Map<string, Model>>(new Map())
  const [selectedDigitalTwinId, setSelectedDigitalTwinId] = useState<string>("")
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (dataStore) {
      // Get certified forges with digitalTwinId
      let forges = dataStore.getForges().filter((f) => f.state === "CERTIFIED" && f.digitalTwinId)

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

  const handlePreviewGenerated = () => {
    setRefreshKey((k) => k + 1)
  }

  const canGenerate = user?.role === "ADMIN" || user?.role === "OPERATOR"

  return (
    <div>
      <Header title="Visual Twin Preview" description="Generate demonstrative previews for commercial approach" />

      <div className="p-6 space-y-6">
        {/* Preview notice */}
        <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <Eye className="w-5 h-5 text-amber-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Preview Only — Not a Deliverable</p>
            <p className="text-xs text-muted-foreground">
              Previews are watermarked, time-limited, and cannot be downloaded. They are for demonstration purposes
              only.
            </p>
          </div>
          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Preview Mode</Badge>
        </div>

        {/* Digital Twin Selector */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Select Digital Twin</CardTitle>
            <CardDescription>Choose a certified Digital Twin to generate previews</CardDescription>
          </CardHeader>
          <CardContent>
            {certifiedForges.length === 0 ? (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                <AlertCircle className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-foreground">No certified Digital Twins available</p>
                  <p className="text-xs text-muted-foreground">
                    Complete the certification process to generate previews.
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
            {/* Generator (only for ADMIN/OPERATOR) */}
            {canGenerate && (
              <PreviewGenerator
                digitalTwinId={selectedDigitalTwinId}
                modelName={selectedModel.name}
                onGenerated={handlePreviewGenerated}
              />
            )}

            {/* Gallery */}
            <PreviewGallery key={refreshKey} digitalTwinId={selectedDigitalTwinId} />
          </>
        ) : (
          <Card className="bg-card border-border">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-1">No Digital Twin Selected</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                Select a certified Digital Twin to view or generate previews.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
