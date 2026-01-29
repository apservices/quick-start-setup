"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { phase2Store } from "@/lib/phase2-store"
import type { VisualTwinPreview } from "@/lib/types"
import { Images, Clock, AlertCircle, Eye, Droplets } from "lucide-react"

interface PreviewGalleryProps {
  digitalTwinId: string
}

const previewTypeLabels: Record<string, string> = {
  NEUTRAL_PORTRAIT: "Neutral Portrait",
  LIGHT_LIFESTYLE: "Light Lifestyle",
  SIMPLE_EDITORIAL: "Simple Editorial",
}

export function PreviewGallery({ digitalTwinId }: PreviewGalleryProps) {
  const [previews, setPreviews] = useState<VisualTwinPreview[]>([])
  const [selectedPreview, setSelectedPreview] = useState<VisualTwinPreview | null>(null)

  useEffect(() => {
    if (phase2Store) {
      setPreviews(phase2Store.getPreviewsByDigitalTwin(digitalTwinId))
    }
  }, [digitalTwinId])

  const getTimeRemaining = (expiresAt: Date) => {
    const now = new Date()
    const diff = expiresAt.getTime() - now.getTime()

    if (diff <= 0) return "Expired"

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    if (days > 0) return `${days}d ${hours}h remaining`
    if (hours > 0) return `${hours}h remaining`
    return "< 1h remaining"
  }

  const activePreviews = previews.filter((p) => p.status === "ACTIVE")
  const expiredPreviews = previews.filter((p) => p.status === "EXPIRED" || p.status === "DELETED")

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Images className="w-5 h-5" />
                Preview Gallery
              </CardTitle>
              <CardDescription>Watermarked previews for demonstration purposes</CardDescription>
            </div>
            <Badge variant="outline" className="text-amber-400 border-amber-500/30">
              <Eye className="w-3 h-3 mr-1" />
              Preview Only
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {previews.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No previews generated yet</p>
              <p className="text-xs text-muted-foreground mt-1">Generate a preview to see it here</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Active Previews */}
              {activePreviews.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-foreground">Active Previews</h4>
                  <ScrollArea className="h-auto max-h-[400px]">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {activePreviews.map((preview) => (
                        <button
                          key={preview.id}
                          onClick={() => setSelectedPreview(preview)}
                          className="group relative aspect-[3/4] rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-all bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <Image
                            src={preview.imageUrl || "/placeholder.svg"}
                            alt={`Preview ${preview.previewType}`}
                            fill
                            className="object-cover"
                          />

                          {/* Watermark overlay */}
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-white/20 text-2xl font-bold rotate-[-30deg] select-none">PREVIEW</div>
                          </div>

                          {/* Gradient overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                          {/* Watermark badge */}
                          <div className="absolute top-2 right-2 p-1.5 rounded-full bg-amber-500/20">
                            <Droplets className="w-3 h-3 text-amber-400" />
                          </div>

                          {/* Info */}
                          <div className="absolute bottom-0 left-0 right-0 p-3">
                            <p className="text-xs font-medium text-white">
                              {previewTypeLabels[preview.previewType] || preview.previewType}
                            </p>
                            <div className="flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3 text-amber-400" />
                              <span className="text-xs text-amber-300">{getTimeRemaining(preview.expiresAt)}</span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Expired Previews */}
              {expiredPreviews.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">Expired Previews</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 opacity-50">
                    {expiredPreviews.map((preview) => (
                      <div
                        key={preview.id}
                        className="relative aspect-[3/4] rounded-lg overflow-hidden border border-border bg-muted"
                      >
                        <Image
                          src={preview.imageUrl || "/placeholder.svg"}
                          alt={`Expired preview ${preview.previewType}`}
                          fill
                          className="object-cover grayscale"
                        />
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Badge variant="destructive">Expired</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedPreview} onOpenChange={() => setSelectedPreview(null)}>
        <DialogContent className="max-w-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              {selectedPreview && (previewTypeLabels[selectedPreview.previewType] || selectedPreview.previewType)}
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Preview</Badge>
            </DialogTitle>
            <DialogDescription>Preview Only — Not a Deliverable</DialogDescription>
          </DialogHeader>

          {selectedPreview && (
            <div className="space-y-4">
              <div className="relative aspect-[4/5] rounded-lg overflow-hidden bg-muted">
                <Image
                  src={selectedPreview.imageUrl || "/placeholder.svg"}
                  alt={selectedPreview.previewType}
                  fill
                  className="object-contain"
                />
                {/* Watermark overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-white/15 text-6xl font-bold rotate-[-30deg] select-none">PREVIEW</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <p className="text-foreground font-medium">
                    {previewTypeLabels[selectedPreview.previewType] || selectedPreview.previewType}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge
                    variant={selectedPreview.status === "ACTIVE" ? "default" : "destructive"}
                    className={selectedPreview.status === "ACTIVE" ? "bg-green-500/20 text-green-400" : ""}
                  >
                    {selectedPreview.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p className="text-foreground font-medium">
                    {new Date(selectedPreview.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Expires</p>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span className="text-foreground font-medium">{getTimeRemaining(selectedPreview.expiresAt)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-muted-foreground">
                  This preview is watermarked and cannot be downloaded. It will automatically expire and be removed if
                  no plan is activated.
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
