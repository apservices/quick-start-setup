"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/dashboard/header"
import { VTGJobCreator } from "@/components/visual-generator/vtg-job-creator"
import { VTGJobQueue } from "@/components/visual-generator/vtg-job-queue"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { dataStore } from "@/lib/data-store"
import { phase2Store } from "@/lib/phase2-store"
import { useAuth } from "@/lib/auth-context"
import type { Forge, Model, License } from "@/lib/types"
import { Wand2, AlertCircle, Shield } from "lucide-react"

export default function VisualGeneratorPage() {
  const { user } = useAuth()
  const [certifiedForges, setCertifiedForges] = useState<Forge[]>([])
  const [models, setModels] = useState<Map<string, Model>>(new Map())
  const [licenses, setLicenses] = useState<Map<string, License[]>>(new Map())
  const [selectedDigitalTwinId, setSelectedDigitalTwinId] = useState<string>("")
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (dataStore && phase2Store) {
      // Get certified forges with digitalTwinId
      const forges = dataStore.getForges().filter((f) => f.state === "CERTIFIED" && f.digitalTwinId)

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
  }, [selectedDigitalTwinId, refreshKey])

  const selectedForge = certifiedForges.find((f) => f.digitalTwinId === selectedDigitalTwinId)
  const selectedModel = selectedForge ? models.get(selectedForge.modelId) : null
  const selectedLicenses = selectedDigitalTwinId ? licenses.get(selectedDigitalTwinId) || [] : []
  const hasActiveLicense = selectedLicenses.some((l) => l.status === "ACTIVE")

  const handleJobCreated = () => {
    setRefreshKey((k) => k + 1)
  }

  return (
    <div>
      <Header title="Visual Twin Generator" description="Generate commercial-grade visual assets" />

      <div className="p-6 space-y-6">
        {/* Mode information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <Wand2 className="w-5 h-5 text-amber-400" />
            <div>
              <p className="text-sm font-medium text-foreground">Preview Mode</p>
              <p className="text-xs text-muted-foreground">Ephemeral, watermarked, no persistence</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
            <Shield className="w-5 h-5 text-green-400" />
            <div>
              <p className="text-sm font-medium text-foreground">Licensed Mode</p>
              <p className="text-xs text-muted-foreground">Commercial-grade, hashed, auditable</p>
            </div>
          </div>
        </div>

        {/* Digital Twin Selector */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Select Digital Twin</CardTitle>
            <CardDescription>Choose a certified Digital Twin for visual generation</CardDescription>
          </CardHeader>
          <CardContent>
            {certifiedForges.length === 0 ? (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                <AlertCircle className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-foreground">No certified Digital Twins available</p>
                  <p className="text-xs text-muted-foreground">Complete the certification process first.</p>
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
                {selectedDigitalTwinId && (
                  <Badge
                    className={
                      hasActiveLicense
                        ? "bg-green-500/20 text-green-400 border-green-500/30"
                        : "bg-muted text-muted-foreground"
                    }
                  >
                    {hasActiveLicense ? "License Active" : "No Active License"}
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {selectedDigitalTwinId && selectedModel ? (
          <Tabs defaultValue="create" className="space-y-4">
            <TabsList className="bg-muted">
              <TabsTrigger value="create">Create Job</TabsTrigger>
              <TabsTrigger value="queue">Job Queue</TabsTrigger>
            </TabsList>

            <TabsContent value="create">
              <VTGJobCreator
                digitalTwinId={selectedDigitalTwinId}
                modelName={selectedModel.name}
                planType={selectedModel.planType}
                hasActiveLicense={hasActiveLicense}
                onJobCreated={handleJobCreated}
              />
            </TabsContent>

            <TabsContent value="queue">
              <VTGJobQueue key={refreshKey} digitalTwinId={selectedDigitalTwinId} />
            </TabsContent>
          </Tabs>
        ) : (
          <Card className="bg-card border-border">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Wand2 className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-1">No Digital Twin Selected</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                Select a certified Digital Twin to create generation jobs.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
