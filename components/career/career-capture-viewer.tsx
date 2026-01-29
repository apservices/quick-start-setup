"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { phase2Store } from "@/lib/phase2-store"
import type { CaptureAsset } from "@/lib/types"
import { Camera, Lock, CheckCircle } from "lucide-react"

interface CareerCaptureViewerProps {
  digitalTwinId: string
}

export function CareerCaptureViewer({ digitalTwinId }: CareerCaptureViewerProps) {
  const [assets, setAssets] = useState<CaptureAsset[]>([])

  useEffect(() => {
    if (phase2Store) {
      setAssets(phase2Store.getCaptureAssets(digitalTwinId))
    }
  }, [digitalTwinId])

  const stats = phase2Store?.getCaptureStats(digitalTwinId) || {
    total: 0,
    valid: 0,
    captureStage: 0,
    normalizedStage: 0,
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Your Captures
            </CardTitle>
            <CardDescription>Photos captured during your biometric session</CardDescription>
          </div>
          <Badge variant="outline" className="text-muted-foreground">
            <Lock className="w-3 h-3 mr-1" />
            Read-Only
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-4 p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="text-sm text-foreground">
              {stats.total}/72 captured ({stats.valid} valid)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Normalized: {stats.normalizedStage}</span>
          </div>
        </div>

        <ScrollArea className="h-[400px]">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {assets.slice(0, 24).map((asset) => (
              <div
                key={asset.id}
                className="relative aspect-[3/4] rounded-lg overflow-hidden border border-border bg-muted"
              >
                <Image src={asset.fileUrl || "/placeholder.svg"} alt={asset.angle} fill className="object-cover" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-white/10 text-xs font-bold select-none">INTERNAL</div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-1 bg-black/60">
                  <p className="text-xs text-white truncate">{asset.angle}</p>
                </div>
              </div>
            ))}
          </div>
          {assets.length > 24 && (
            <p className="text-xs text-muted-foreground text-center mt-4">
              + {assets.length - 24} more captures (preview limited)
            </p>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
