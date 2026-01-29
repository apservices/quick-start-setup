"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { phase2Store } from "@/lib/phase2-store"
import type { VisualAsset, License } from "@/lib/types"
import { Shield, Hash, Calendar } from "lucide-react"

interface CareerAssetsProps {
  digitalTwinId: string
}

const categoryLabels: Record<string, string> = {
  NEUTRAL_PORTRAIT: "Neutral Portrait",
  LIGHT_LIFESTYLE: "Light Lifestyle",
  SIMPLE_EDITORIAL: "Simple Editorial",
  PRODUCT_USAGE: "Product Usage",
  CAMPAIGN: "Campaign",
  CUSTOM: "Custom",
}

export function CareerAssets({ digitalTwinId }: CareerAssetsProps) {
  const [assets, setAssets] = useState<VisualAsset[]>([])
  const [licenses, setLicenses] = useState<License[]>([])

  useEffect(() => {
    if (phase2Store) {
      setAssets(phase2Store.getVisualAssetsByDigitalTwin(digitalTwinId, "LICENSED"))
      setLicenses(phase2Store.getLicensesByDigitalTwin(digitalTwinId))
    }
  }, [digitalTwinId])

  const activeLicenses = licenses.filter((l) => l.status === "ACTIVE")

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Licensed Assets
            </CardTitle>
            <CardDescription>Commercial-grade visuals generated from your Digital Twin</CardDescription>
          </div>
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            {activeLicenses.length} Active License{activeLicenses.length !== 1 ? "s" : ""}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {assets.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">No licensed assets yet</div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {assets.map((asset) => (
                <div
                  key={asset.id}
                  className="relative aspect-[3/4] rounded-lg overflow-hidden border border-green-500/20 bg-muted"
                >
                  <Image src={asset.fileUrl || "/placeholder.svg"} alt={asset.category} fill className="object-cover" />
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Licensed</Badge>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-xs font-medium text-white">{categoryLabels[asset.category] || asset.category}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Hash className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground font-mono">{asset.hash.slice(0, 12)}...</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {new Date(asset.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
