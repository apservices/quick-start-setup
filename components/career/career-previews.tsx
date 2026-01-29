"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { phase2Store } from "@/lib/phase2-store"
import type { VisualTwinPreview } from "@/lib/types"
import { Sparkles, Clock, Eye } from "lucide-react"

interface CareerPreviewsProps {
  digitalTwinId: string
}

const previewTypeLabels: Record<string, string> = {
  NEUTRAL_PORTRAIT: "Neutral Portrait",
  LIGHT_LIFESTYLE: "Light Lifestyle",
  SIMPLE_EDITORIAL: "Simple Editorial",
}

export function CareerPreviews({ digitalTwinId }: CareerPreviewsProps) {
  const [previews, setPreviews] = useState<VisualTwinPreview[]>([])

  useEffect(() => {
    if (phase2Store) {
      setPreviews(phase2Store.getPreviewsByDigitalTwin(digitalTwinId))
    }
  }, [digitalTwinId])

  const activePreviews = previews.filter((p) => p.status === "ACTIVE")

  const getTimeRemaining = (expiresAt: Date) => {
    const now = new Date()
    const diff = expiresAt.getTime() - now.getTime()
    if (diff <= 0) return "Expired"
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h`
    return "< 1h"
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Preview Gallery
            </CardTitle>
            <CardDescription>Demonstrative previews of your Digital Twin</CardDescription>
          </div>
          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
            <Eye className="w-3 h-3 mr-1" />
            Preview Only
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {previews.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">No previews generated yet</div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {activePreviews.map((preview) => (
                <div
                  key={preview.id}
                  className="relative aspect-[3/4] rounded-lg overflow-hidden border border-amber-500/20 bg-muted"
                >
                  <Image
                    src={preview.imageUrl || "/placeholder.svg"}
                    alt={preview.previewType}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-white/20 text-2xl font-bold rotate-[-30deg] select-none">PREVIEW</div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-xs font-medium text-white">
                      {previewTypeLabels[preview.previewType] || preview.previewType}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3 text-amber-400" />
                      <span className="text-xs text-amber-300">{getTimeRemaining(preview.expiresAt)}</span>
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
