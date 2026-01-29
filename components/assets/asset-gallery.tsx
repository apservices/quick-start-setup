"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { phase2Store } from "@/lib/phase2-store"
import { useAuth } from "@/lib/auth-context"
import type { VisualAsset } from "@/lib/types"
import { FolderOpen, Shield, Droplets, Download, Lock, Hash, Calendar, FileImage, AlertCircle } from "lucide-react"
import { toast } from "sonner"

interface AssetGalleryProps {
  digitalTwinId: string
  hasActiveLicense: boolean
  isClient: boolean
}

const categoryLabels: Record<string, string> = {
  NEUTRAL_PORTRAIT: "Neutral Portrait",
  LIGHT_LIFESTYLE: "Light Lifestyle",
  SIMPLE_EDITORIAL: "Simple Editorial",
  PRODUCT_USAGE: "Product Usage",
  CAMPAIGN: "Campaign",
  CUSTOM: "Custom",
}

export function AssetGallery({ digitalTwinId, hasActiveLicense, isClient }: AssetGalleryProps) {
  const { user } = useAuth()
  const [assets, setAssets] = useState<VisualAsset[]>([])
  const [selectedType, setSelectedType] = useState<"ALL" | "LICENSED" | "PREVIEW">("ALL")
  const [selectedAsset, setSelectedAsset] = useState<VisualAsset | null>(null)

  useEffect(() => {
    if (phase2Store) {
      // Clients only see licensed assets
      if (isClient) {
        setAssets(phase2Store.getLicensedAssets(digitalTwinId))
      } else {
        setAssets(phase2Store.getVisualAssetsByDigitalTwin(digitalTwinId))
      }
    }
  }, [digitalTwinId, isClient])

  const filteredAssets = selectedType === "ALL" ? assets : assets.filter((a) => a.type === selectedType)

  const licensedCount = assets.filter((a) => a.type === "LICENSED").length
  const previewCount = assets.filter((a) => a.type === "PREVIEW").length

  const handleDownload = (asset: VisualAsset) => {
    if (!user || !phase2Store) return

    if (asset.type === "PREVIEW") {
      toast.error("Download not available", {
        description: "Preview assets cannot be downloaded.",
      })
      return
    }

    if (!hasActiveLicense) {
      toast.error("License required", {
        description: "An active license is required to download assets.",
      })
      return
    }

    const success = phase2Store.recordAssetDownload(asset.id, user.id, user.name)
    if (success) {
      toast.success("Download started", {
        description: "Asset download has been logged.",
      })
      // In a real app, this would trigger actual file download
    } else {
      toast.error("Download failed", {
        description: "Unable to download asset. Check license status.",
      })
    }
  }

  const canDownload = (asset: VisualAsset) => {
    return asset.type === "LICENSED" && hasActiveLicense
  }

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-foreground flex items-center gap-2">
                <FolderOpen className="w-5 h-5" />
                Visual Assets
              </CardTitle>
              <CardDescription>
                {isClient ? "Licensed assets available for commercial use" : "All generated visual assets"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!isClient && (
            <Tabs
              value={selectedType}
              onValueChange={(v) => setSelectedType(v as "ALL" | "LICENSED" | "PREVIEW")}
              className="space-y-4"
            >
              <TabsList className="bg-muted">
                <TabsTrigger value="ALL">All ({assets.length})</TabsTrigger>
                <TabsTrigger value="LICENSED">Licensed ({licensedCount})</TabsTrigger>
                <TabsTrigger value="PREVIEW">Previews ({previewCount})</TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {filteredAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FolderOpen className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No assets found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {isClient ? "No licensed assets available" : "Generate assets to see them here"}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[500px] mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredAssets.map((asset) => (
                  <button
                    key={asset.id}
                    onClick={() => setSelectedAsset(asset)}
                    className="group relative aspect-[3/4] rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-all bg-muted focus:outline-none focus:ring-2 focus:ring-primary text-left"
                  >
                    <Image
                      src={asset.fileUrl || "/placeholder.svg"}
                      alt={`Asset ${asset.category}`}
                      fill
                      className="object-cover"
                    />

                    {/* Watermark overlay for previews */}
                    {asset.watermarked && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-white/20 text-2xl font-bold rotate-[-30deg] select-none">PREVIEW</div>
                      </div>
                    )}

                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                    {/* Type badge */}
                    <div className="absolute top-2 right-2">
                      {asset.type === "LICENSED" ? (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          <Shield className="w-3 h-3 mr-1" />
                          Licensed
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                          <Droplets className="w-3 h-3 mr-1" />
                          Preview
                        </Badge>
                      )}
                    </div>

                    {/* Info */}
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-xs font-medium text-white">
                        {categoryLabels[asset.category] || asset.category}
                      </p>
                      <p className="text-xs text-white/70 font-mono truncate">{asset.hash.slice(0, 20)}...</p>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedAsset} onOpenChange={() => setSelectedAsset(null)}>
        <DialogContent className="max-w-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              {selectedAsset && (categoryLabels[selectedAsset.category] || selectedAsset.category)}
              {selectedAsset?.type === "LICENSED" ? (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Licensed Asset</Badge>
              ) : (
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Preview</Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedAsset?.type === "LICENSED"
                ? "Licensed Asset — Commercial Use Permitted"
                : "Preview Only — Not a Deliverable"}
            </DialogDescription>
          </DialogHeader>

          {selectedAsset && (
            <div className="space-y-4">
              <div className="relative aspect-[4/5] rounded-lg overflow-hidden bg-muted">
                <Image
                  src={selectedAsset.fileUrl || "/placeholder.svg"}
                  alt={selectedAsset.category}
                  fill
                  className="object-contain"
                />
                {selectedAsset.watermarked && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-white/15 text-6xl font-bold rotate-[-30deg] select-none">PREVIEW</div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground flex items-center gap-1">
                    <FileImage className="w-3 h-3" /> Type
                  </p>
                  <p className="text-foreground font-medium">{selectedAsset.type}</p>
                </div>
                <div>
                  <p className="text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Created
                  </p>
                  <p className="text-foreground font-medium">
                    {new Date(selectedAsset.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground flex items-center gap-1">
                    <Hash className="w-3 h-3" /> Asset Hash
                  </p>
                  <p className="text-foreground font-mono text-xs break-all">{selectedAsset.hash}</p>
                </div>
                {selectedAsset.metadata && (
                  <>
                    <div>
                      <p className="text-muted-foreground">Resolution</p>
                      <p className="text-foreground font-medium">
                        {selectedAsset.metadata.resolution.width} x {selectedAsset.metadata.resolution.height}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Size</p>
                      <p className="text-foreground font-medium">
                        {(selectedAsset.metadata.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Download section */}
              {selectedAsset.type === "LICENSED" ? (
                <div className="space-y-3">
                  {hasActiveLicense ? (
                    <Button onClick={() => handleDownload(selectedAsset)} className="w-full">
                      <Download className="w-4 h-4 mr-2" />
                      Download Asset
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <Lock className="w-4 h-4 text-amber-400" />
                      <span className="text-sm text-muted-foreground">Active license required to download</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
                  <AlertCircle className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Preview assets cannot be downloaded. Generate a licensed asset to download.
                  </span>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
