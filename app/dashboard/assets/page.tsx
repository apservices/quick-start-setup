"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/dashboard/header"
import { AssetGallery } from "@/components/assets/asset-gallery"
import { AssetStats } from "@/components/assets/asset-stats"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { dataStore } from "@/lib/data-store"
import { phase2Store } from "@/lib/phase2-store"
import { useAuth } from "@/lib/auth-context"
import type { Forge, Model, License } from "@/lib/types"
import { FolderOpen, AlertCircle, Shield } from "lucide-react"

export default function AssetsPage() {
  const { user } = useAuth()
  const [certifiedForges, setCertifiedForges] = useState<Forge[]>([])
  const [models, setModels] = useState<Map<string, Model>>(new Map())
  const [licenses, setLicenses] = useState<Map<string, License[]>>(new Map())
  const [selectedDigitalTwinId, setSelectedDigitalTwinId] = useState<string>("")

  useEffect(() => {
    if (dataStore && phase2Store) {
      // Get certified forges with digitalTwinId
      let forges = dataStore.getForges().filter((f) => f.state === "CERTIFIED" && f.digitalTwinId)

      // CLIENT can only see forges they have licenses for
      if (user?.role === "CLIENT" && user.linkedClientId) {
        const clientLicenses = phase2Store.getLicensesByClient(user.linkedClientId)
        const licensedTwinIds = new Set(clientLicenses.map((l) => l.digitalTwinId))
        forges = forges.filter((f) => f.digitalTwinId && licensedTwinIds.has(f.digitalTwinId))
      }

      // MODEL can only see their own forges
      if (user?.role === "MODEL" && user.linkedModelId) {
        forges = forges.filter((f) => f.modelId === user.linkedModelId)
      }

      setCertifiedForges(forges)

      const modelMap = new Map<string, Model>()
      dataStore.getModels().forEach((m) => modelMap.set(m.id, m))
      setModels(modelMap)

      // Get licenses for each digital twin
      const licenseMap = new Map<string, License[]>()
      forges.forEach((f) => {
        if (f.digitalTwinId) {
          licenseMap.set(f.digitalTwinId, phase2Store.getLicensesByDigitalTwin(f.digitalTwinId))
        }
      })
      setLicenses(licenseMap)

      // Auto-select first available
      if (forges.length > 0 && !selectedDigitalTwinId) {
        setSelectedDigitalTwinId(forges[0].digitalTwinId!)
      }
    }
  }, [user, selectedDigitalTwinId])

  const selectedForge = certifiedForges.find((f) => f.digitalTwinId === selectedDigitalTwinId)
  const selectedModel = selectedForge ? models.get(selectedForge.modelId) : null
  const selectedLicenses = selectedDigitalTwinId ? licenses.get(selectedDigitalTwinId) || [] : []
  const hasActiveLicense = selectedLicenses.some((l) => l.status === "ACTIVE")

  const isClient = user?.role === "CLIENT"

  return (
    <div>
      <Header title="Asset Library" description="Manage visual assets and licensed content" />

      <div className="p-6 space-y-6">
        {/* Access level notice */}
        {isClient ? (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
            <Shield className="w-5 h-5 text-green-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Licensed Asset — Commercial Use</p>
              <p className="text-xs text-muted-foreground">
                You have access to licensed assets only. Downloads are available when your license is active.
              </p>
            </div>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Licensed Access</Badge>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30 border border-border">
            <FolderOpen className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">Asset Library</p>
              <p className="text-xs text-muted-foreground">
                View all visual assets. Licensed assets can be downloaded when license is valid.
              </p>
            </div>
          </div>
        )}

        {/* Digital Twin Selector */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Select Digital Twin</CardTitle>
            <CardDescription>Choose a Digital Twin to view its assets</CardDescription>
          </CardHeader>
          <CardContent>
            {certifiedForges.length === 0 ? (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                <AlertCircle className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-foreground">No assets available</p>
                  <p className="text-xs text-muted-foreground">
                    {isClient
                      ? "You don't have any licensed assets yet."
                      : "Complete the certification process to access assets."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Select value={selectedDigitalTwinId} onValueChange={setSelectedDigitalTwinId}>
                  <SelectTrigger className="w-full max-w-md bg-input border-border">
                    <SelectValue placeholder="Select a Digital Twin..." />
                  </SelectTrigger>
                  <SelectContent>
                    {certifiedForges.map((forge) => {
                      const model = models.get(forge.modelId)
                      const forgeLicenses = licenses.get(forge.digitalTwinId!) || []
                      const isLicensed = forgeLicenses.some((l) => l.status === "ACTIVE")
                      return (
                        <SelectItem key={forge.digitalTwinId} value={forge.digitalTwinId!}>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-primary">{forge.digitalTwinId}</span>
                            <span className="text-muted-foreground">-</span>
                            <span>{model?.name || "Unknown"}</span>
                            {isLicensed && (
                              <Badge className="bg-green-500/20 text-green-400 text-xs ml-2">Licensed</Badge>
                            )}
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        {selectedDigitalTwinId && selectedModel ? (
          <>
            {/* Stats */}
            <AssetStats digitalTwinId={selectedDigitalTwinId} hasActiveLicense={hasActiveLicense} />

            {/* Gallery */}
            <AssetGallery
              digitalTwinId={selectedDigitalTwinId}
              hasActiveLicense={hasActiveLicense}
              isClient={isClient}
            />
          </>
        ) : (
          <Card className="bg-card border-border">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <FolderOpen className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-1">No Digital Twin Selected</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                Select a Digital Twin to view its visual assets.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
