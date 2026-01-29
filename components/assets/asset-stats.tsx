"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { phase2Store } from "@/lib/phase2-store"
import type { VisualAsset } from "@/lib/types"
import { Images, Shield, Droplets, Download } from "lucide-react"

interface AssetStatsProps {
  digitalTwinId: string
  hasActiveLicense: boolean
}

export function AssetStats({ digitalTwinId, hasActiveLicense }: AssetStatsProps) {
  const [assets, setAssets] = useState<VisualAsset[]>([])

  useEffect(() => {
    if (phase2Store) {
      setAssets(phase2Store.getVisualAssetsByDigitalTwin(digitalTwinId))
    }
  }, [digitalTwinId])

  const licensedAssets = assets.filter((a) => a.type === "LICENSED")
  const previewAssets = assets.filter((a) => a.type === "PREVIEW")

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Assets</CardTitle>
          <Images className="w-4 h-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">{assets.length}</div>
          <p className="text-xs text-muted-foreground">All visual assets</p>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Licensed</CardTitle>
          <Shield className="w-4 h-4 text-green-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">{licensedAssets.length}</div>
          <p className="text-xs text-muted-foreground">Commercial assets</p>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Previews</CardTitle>
          <Droplets className="w-4 h-4 text-amber-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">{previewAssets.length}</div>
          <p className="text-xs text-muted-foreground">Watermarked previews</p>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Downloads</CardTitle>
          <Download className="w-4 h-4 text-blue-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            {hasActiveLicense ? (
              <span className="text-green-400">Enabled</span>
            ) : (
              <span className="text-muted-foreground">Disabled</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{hasActiveLicense ? "License active" : "License required"}</p>
        </CardContent>
      </Card>
    </div>
  )
}
