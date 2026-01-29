"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Images, Clock, AlertCircle, Eye, Droplets } from "lucide-react"
import { supabase } from "@/src/integrations/supabase/client"

type SupabasePreviewRow = {
  id: string
  capture_id: string | null
  preview_url: string
  approved: boolean | null
  created_at: string | null
}

type UIPreview = {
  id: string
  captureId: string | null
  previewUrl: string
  approved: boolean
  createdAt: Date
}

interface PreviewGalleryProps {
  digitalTwinId: string
}

const previewTypeLabels: Record<string, string> = {
  NEUTRAL_PORTRAIT: "Neutral Portrait",
  LIGHT_LIFESTYLE: "Light Lifestyle",
  SIMPLE_EDITORIAL: "Simple Editorial",
}

export function PreviewGallery({ digitalTwinId }: PreviewGalleryProps) {
  const [previews, setPreviews] = useState<UIPreview[]>([])
  const [selectedPreview, setSelectedPreview] = useState<UIPreview | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      // Find the model linked to this Digital Twin
      const { data: forge, error: forgeError } = await supabase
        .from("forges")
        .select("model_id")
        .eq("digital_twin_id", digitalTwinId)
        .maybeSingle()
      if (forgeError) throw forgeError
      if (!forge?.model_id) {
        setPreviews([])
        return
      }

      // Fetch capture ids for that model, then previews for those captures
      const { data: captures, error: capturesError } = await supabase
        .from("captures")
        .select("id")
        .eq("model_id", forge.model_id)
        .limit(1000)

      if (capturesError) throw capturesError
      const captureIds = (captures ?? []).map((c) => c.id).filter(Boolean)
      if (captureIds.length === 0) {
        setPreviews([])
        return
      }

      const { data: rows, error: previewsError } = await supabase
        .from("previews")
        .select("id,capture_id,preview_url,approved,created_at")
        .in("capture_id", captureIds)
        .order("created_at", { ascending: false })

      if (previewsError) throw previewsError

      const ui = (rows as SupabasePreviewRow[] | null)?.map((r) => ({
        id: r.id,
        captureId: r.capture_id,
        previewUrl: r.preview_url,
        approved: !!r.approved,
        createdAt: new Date(r.created_at ?? Date.now()),
      })) ?? []
      setPreviews(ui)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()

    // Realtime updates: when a preview row is inserted/updated, refetch.
    const channel = supabase
      .channel(`previews_gallery:${digitalTwinId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "previews" },
        () => void load(),
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [digitalTwinId])

  const formatCreatedAt = (d: Date) => d.toLocaleDateString()

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
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">Loading previews…</p>
            </div>
          ) : previews.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No previews generated yet</p>
              <p className="text-xs text-muted-foreground mt-1">Generate a preview to see it here</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-foreground">Previews</h4>
                <ScrollArea className="h-auto max-h-[400px]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {previews.map((preview) => (
                      <button
                        key={preview.id}
                        onClick={() => setSelectedPreview(preview)}
                        className="group relative aspect-[3/4] rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-all bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <Image src={preview.previewUrl} alt={`Preview ${preview.id}`} fill className="object-cover" />

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
                          <p className="text-xs font-medium text-white">{preview.id}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3 text-amber-400" />
                            <span className="text-xs text-amber-300">{formatCreatedAt(preview.createdAt)}</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedPreview} onOpenChange={() => setSelectedPreview(null)}>
        <DialogContent className="max-w-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              {selectedPreview?.id}
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Preview</Badge>
            </DialogTitle>
            <DialogDescription>Preview Only — Not a Deliverable</DialogDescription>
          </DialogHeader>

          {selectedPreview && (
            <div className="space-y-4">
              <div className="relative aspect-[4/5] rounded-lg overflow-hidden bg-muted">
                <Image
                  src={selectedPreview.previewUrl}
                  alt={selectedPreview.id}
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
                  <p className="text-muted-foreground">Preview</p>
                  <p className="text-foreground font-medium">{selectedPreview.id}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Approved</p>
                  <Badge variant={selectedPreview.approved ? "default" : "outline"}>
                    {selectedPreview.approved ? "Approved" : "Pending"}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p className="text-foreground font-medium">
                    {formatCreatedAt(selectedPreview.createdAt)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Capture</p>
                  <p className="text-foreground font-medium font-mono text-xs">{selectedPreview.captureId ?? "—"}</p>
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
