"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/dashboard/header"
import { PreviewGenerator } from "@/components/visual-preview/preview-generator"
import { PreviewGallery } from "@/components/visual-preview/preview-gallery"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth-context"
import { Sparkles, AlertCircle, Eye } from "lucide-react"
import { supabase } from "@/src/integrations/supabase/client"

type ForgeRow = {
  id: string
  model_id: string
  state: string
  digital_twin_id: string | null
}

type ModelRow = {
  id: string
  full_name: string
}

export default function VisualPreviewPage() {
  const { user } = useAuth()
  const [certifiedForges, setCertifiedForges] = useState<ForgeRow[]>([])
  const [models, setModels] = useState<Map<string, ModelRow>>(new Map())
  const [selectedDigitalTwinId, setSelectedDigitalTwinId] = useState<string>("")
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const load = async () => {
      const { data: forges, error: forgesError } = await supabase
        .from("forges")
        .select("id,model_id,state,digital_twin_id")
        .eq("state", "CERTIFIED")
        .not("digital_twin_id", "is", null)
        .order("created_at", { ascending: false })

      if (forgesError) {
        setCertifiedForges([])
        setModels(new Map())
        return
      }

      const rows = (forges ?? []) as ForgeRow[]
      setCertifiedForges(rows)

      const modelIds = Array.from(new Set(rows.map((f) => f.model_id).filter(Boolean)))
      if (modelIds.length > 0) {
        const { data: modelRows } = await supabase.from("models").select("id,full_name").in("id", modelIds)
        const modelMap = new Map<string, ModelRow>()
        ;(modelRows ?? []).forEach((m) => modelMap.set(m.id, m as ModelRow))
        setModels(modelMap)
      } else {
        setModels(new Map())
      }

      if (rows.length > 0 && !selectedDigitalTwinId) {
        setSelectedDigitalTwinId(rows[0].digital_twin_id!)
      }
    }

    void load()
  }, [user, selectedDigitalTwinId])

  const selectedForge = certifiedForges.find((f) => f.digital_twin_id === selectedDigitalTwinId)
  const selectedModel = selectedForge ? models.get(selectedForge.model_id) : null

  const handlePreviewGenerated = () => {
    setRefreshKey((k) => k + 1)
  }

  // Generation currently relies on Supabase policies that only allow admin to manage previews/captures globally.
  const canGenerate = user?.role === "ADMIN"

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
                    const model = models.get(forge.model_id)
                    return (
                      <SelectItem key={forge.digital_twin_id} value={forge.digital_twin_id!}>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-primary">{forge.digital_twin_id}</span>
                          <span className="text-muted-foreground">-</span>
                          <span>{model?.full_name || "Unknown"}</span>
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
                modelName={selectedModel.full_name}
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
