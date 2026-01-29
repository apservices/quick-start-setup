"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { phase2Store } from "@/lib/phase2-store"
import { useAuth } from "@/lib/auth-context"
import type { Forge, Model, LicenseUsageType } from "@/lib/types"
import { FileKey, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface LicenseCreatorProps {
  certifiedForges: Forge[]
  models: Map<string, Model>
  onCreated: () => void
}

const territories = [
  { value: "US", label: "United States" },
  { value: "EU", label: "European Union" },
  { value: "UK", label: "United Kingdom" },
  { value: "CA", label: "Canada" },
  { value: "AU", label: "Australia" },
  { value: "JP", label: "Japan" },
  { value: "GLOBAL", label: "Worldwide" },
]

export function LicenseCreator({ certifiedForges, models, onCreated }: LicenseCreatorProps) {
  const { user } = useAuth()
  const [selectedDigitalTwinId, setSelectedDigitalTwinId] = useState("")
  const [clientId, setClientId] = useState("")
  const [usageType, setUsageType] = useState<LicenseUsageType>("COMMERCIAL")
  const [selectedTerritories, setSelectedTerritories] = useState<string[]>([])
  const [validityDays, setValidityDays] = useState("365")
  const [maxDownloads, setMaxDownloads] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  const handleTerritoryToggle = (territory: string) => {
    setSelectedTerritories((prev) =>
      prev.includes(territory) ? prev.filter((t) => t !== territory) : [...prev, territory],
    )
  }

  const handleCreate = async () => {
    if (!user || !phase2Store) return

    if (!selectedDigitalTwinId || !clientId || selectedTerritories.length === 0) {
      toast.error("Missing required fields")
      return
    }

    setIsCreating(true)
    try {
      const validFrom = new Date()
      const validUntil = new Date()
      validUntil.setDate(validUntil.getDate() + Number.parseInt(validityDays))

      phase2Store.createLicense(
        selectedDigitalTwinId,
        clientId,
        usageType,
        selectedTerritories,
        validFrom,
        validUntil,
        user.id,
        maxDownloads ? Number.parseInt(maxDownloads) : undefined,
      )

      toast.success("License created", {
        description: `License activated for ${validityDays} days.`,
      })

      // Reset form
      setSelectedDigitalTwinId("")
      setClientId("")
      setSelectedTerritories([])
      setValidityDays("365")
      setMaxDownloads("")

      onCreated()
    } catch (error) {
      toast.error("Failed to create license", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <FileKey className="w-5 h-5" />
          Create License
        </CardTitle>
        <CardDescription>Activate a new commercial license</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Digital Twin Selection */}
        <div className="space-y-2">
          <Label>Digital Twin</Label>
          <Select value={selectedDigitalTwinId} onValueChange={setSelectedDigitalTwinId}>
            <SelectTrigger className="bg-input border-border">
              <SelectValue placeholder="Select Digital Twin..." />
            </SelectTrigger>
            <SelectContent>
              {certifiedForges.map((forge) => {
                const model = models.get(forge.modelId)
                return (
                  <SelectItem key={forge.digitalTwinId} value={forge.digitalTwinId!}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">{forge.digitalTwinId}</span>
                      <span className="text-muted-foreground">-</span>
                      <span>{model?.name || "Unknown"}</span>
                    </div>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Client ID */}
        <div className="space-y-2">
          <Label htmlFor="clientId">Client ID</Label>
          <Input
            id="clientId"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="e.g., client_001"
            className="bg-input border-border"
          />
        </div>

        {/* Usage Type */}
        <div className="space-y-2">
          <Label>Usage Type</Label>
          <Select value={usageType} onValueChange={(v) => setUsageType(v as LicenseUsageType)}>
            <SelectTrigger className="bg-input border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="COMMERCIAL">Commercial</SelectItem>
              <SelectItem value="EDITORIAL">Editorial</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Territory */}
        <div className="space-y-2">
          <Label>Territory</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {territories.map((territory) => (
              <div key={territory.value} className="flex items-center space-x-2">
                <Checkbox
                  id={territory.value}
                  checked={selectedTerritories.includes(territory.value)}
                  onCheckedChange={() => handleTerritoryToggle(territory.value)}
                />
                <label
                  htmlFor={territory.value}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground"
                >
                  {territory.label}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Validity Period */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="validity">Validity (days)</Label>
            <Select value={validityDays} onValueChange={setValidityDays}>
              <SelectTrigger className="bg-input border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
                <SelectItem value="180">180 days</SelectItem>
                <SelectItem value="365">1 year</SelectItem>
                <SelectItem value="730">2 years</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxDownloads">Max Downloads (optional)</Label>
            <Input
              id="maxDownloads"
              type="number"
              value={maxDownloads}
              onChange={(e) => setMaxDownloads(e.target.value)}
              placeholder="Unlimited"
              className="bg-input border-border"
            />
          </div>
        </div>

        <Button
          onClick={handleCreate}
          disabled={isCreating || !selectedDigitalTwinId || !clientId || selectedTerritories.length === 0}
          className="w-full"
        >
          {isCreating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating License...
            </>
          ) : (
            <>
              <FileKey className="w-4 h-4 mr-2" />
              Activate License
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
