"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { phase2Store } from "@/lib/phase2-store"
import type { Model, Forge, License } from "@/lib/types"
import { Camera, Sparkles, Shield, DollarSign } from "lucide-react"

interface CareerOverviewProps {
  model: Model
  forges: Forge[]
  digitalTwinId: string | null
}

export function CareerOverview({ model, forges, digitalTwinId }: CareerOverviewProps) {
  const [licenses, setLicenses] = useState<License[]>([])
  const [previewCount, setPreviewCount] = useState(0)
  const [assetCount, setAssetCount] = useState(0)

  useEffect(() => {
    if (phase2Store && digitalTwinId) {
      setLicenses(phase2Store.getLicensesByDigitalTwin(digitalTwinId))
      setPreviewCount(phase2Store.getPreviewsByDigitalTwin(digitalTwinId).length)
      setAssetCount(phase2Store.getVisualAssetsByDigitalTwin(digitalTwinId, "LICENSED").length)
    }
  }, [digitalTwinId])

  const certifiedForge = forges.find((f) => f.state === "CERTIFIED")
  const activeLicenses = licenses.filter((l) => l.status === "ACTIVE")

  // Mock earnings calculation
  const totalEarnings = activeLicenses.length * 2500 // Example: $2500 per active license

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
          <Camera className="w-4 h-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Badge
              className={
                model.status === "ACTIVE"
                  ? "bg-green-500/20 text-green-400"
                  : model.status === "PENDING_CONSENT"
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-muted text-muted-foreground"
              }
            >
              {model.status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {certifiedForge ? "Digital Twin certified" : "Certification in progress"}
          </p>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Previews</CardTitle>
          <Sparkles className="w-4 h-4 text-amber-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">{previewCount}</div>
          <p className="text-xs text-muted-foreground">Generated previews</p>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Licensed Assets</CardTitle>
          <Shield className="w-4 h-4 text-green-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">{assetCount}</div>
          <p className="text-xs text-muted-foreground">{activeLicenses.length} active licenses</p>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Earnings</CardTitle>
          <DollarSign className="w-4 h-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">${totalEarnings.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">From active licenses</p>
        </CardContent>
      </Card>
    </div>
  )
}
