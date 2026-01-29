"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { phase2Store } from "@/lib/phase2-store"
import type { CaptureAsset, CaptureStage } from "@/lib/types"
import { Camera, CheckCircle, XCircle, AlertCircle, Play, ImageIcon, Lock } from "lucide-react"

interface CaptureViewerGalleryProps {
  digitalTwinId: string
}

const statusConfig = {
  VALID: { icon: CheckCircle, color: "text-green-400", bg: "bg-green-400/10", label: "Valid" },
  INVALID: { icon: XCircle, color: "text-red-400", bg: "bg-red-400/10", label: "Invalid" },
  MISSING: { icon: AlertCircle, color: "text-amber-400", bg: "bg-amber-400/10", label: "Missing" },
} as const

export function CaptureViewerGallery({ digitalTwinId }: CaptureViewerGalleryProps) {
  const [assets, setAssets] = useState<CaptureAsset[]>([])
  const [selectedStage, setSelectedStage] = useState<CaptureStage | "ALL">("ALL")
  const [selectedAsset, setSelectedAsset] = useState<CaptureAsset | null>(null)

  useEffect(() => {
    if (!phase2Store) return
    setAssets(phase2Store.getCaptureAssets(digitalTwinId))
  }, [digitalTwinId])

  const filteredAssets = selectedStage === "ALL" ? assets : assets.filter((a) => a.stage === selectedStage)

  const captureCount = assets.filter((a) => a.stage === "CAPTURE").length
  const normalizedCount = assets.filter((a) => a.stage === "NORMALIZED").length

  const resolveImageSrc = (url?: string) => {
    if (!url) return "/placeholder.svg"
    if (url.includes("placeholder.svg")) return "/placeholder.svg"
    return url
  }

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Capture Gallery
              </CardTitle>
              <CardDescription>View captured photos and videos by stage</CardDescription>
            </div>
            <Badge variant="outline" className="text-muted-foreground">
              <Lock className="w-3 h-3 mr-1" />
              Read-Only
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs
            value={selectedStage}
            onValueChange={(v) => setSelectedStage(v as CaptureStage | "ALL")}
            className="space-y-4"
          >
            <TabsList className="bg-muted">
              <TabsTrigger value="ALL">All ({assets.length})</TabsTrigger>
              <TabsTrigger value="CAPTURE">Capture ({captureCount})</TabsTrigger>
              <TabsTrigger value="NORMALIZED">Normalized ({normalizedCount})</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedStage} className="mt-4">
              {filteredAssets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <ImageIcon className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No assets found for this stage</p>
                </div>
              ) : (
                <ScrollArea className="h-[600px]">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {filteredAssets.map((asset) => {
                      const status = statusConfig[asset.status] ?? statusConfig.MISSING
                      const StatusIcon = status.icon

                      return (
                        <button
                          key={asset.id}
                          onClick={() => setSelectedAsset(asset)}
                          className="group relative aspect-[3/4] rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-all bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <Image
                            src={resolveImageSrc(asset.fileUrl)}
                            alt={`Capture angle: ${asset.angle}`}
                            fill
                            className="object-cover"
                          />

                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                          <div className={`absolute top-2 right-2 p-1 rounded-full ${status.bg}`}>
                            <StatusIcon className={`w-3 h-3 ${status.color}`} />
                          </div>

                          {asset.type === "VIDEO" && (
                            <div className="absolute top-2 left-2 p-1 rounded-full bg-black/50">
                              <Play className="w-3 h-3 text-white" />
                            </div>
                          )}

                          <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <p className="text-xs font-medium text-white truncate">{asset.angle}</p>
                            <p className="text-xs text-white/70">{asset.stage}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={!!selectedAsset} onOpenChange={() => setSelectedAsset(null)}>
        <DialogContent className="max-w-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              {selectedAsset?.angle}
              <Badge variant="outline">{selectedAsset?.stage}</Badge>
            </DialogTitle>
            <DialogDescription>Capture asset details - Read only, no download available</DialogDescription>
          </DialogHeader>

          {selectedAsset && (
            <div className="space-y-4">
              <div className="relative aspect-[4/5] rounded-lg overflow-hidden bg-muted">
                <Image
                  src={resolveImageSrc(selectedAsset.fileUrl)}
                  alt={selectedAsset.angle}
                  fill
                  className="object-contain"
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-white/10 text-6xl font-bold rotate-[-30deg] select-none">
                    INTERNAL USE
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <p className="text-foreground font-medium">{selectedAsset.type}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <div className="flex items-center gap-1.5">
                    {(() => {
                      const status = statusConfig[selectedAsset.status] ?? statusConfig.MISSING
                      const StatusIcon = status.icon
                      return (
                        <>
                          <StatusIcon className={`w-4 h-4 ${status.color}`} />
                          <span className="text-foreground font-medium">{status.label}</span>
                        </>
                      )
                    })()}
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground">Resolution</p>
                  <p className="text-foreground font-medium">
                    {selectedAsset.resolution.width} x {selectedAsset.resolution.height}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">File Size</p>
                  <p className="text-foreground font-medium">
                    {(selectedAsset.fileSize / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Uploaded</p>
                  <p className="text-foreground font-medium">
                    {new Date(selectedAsset.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">File Name</p>
                  <p className="text-foreground font-medium font-mono text-xs truncate">
                    {selectedAsset.fileName}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm">
                <Lock className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Download and export are disabled for security
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
