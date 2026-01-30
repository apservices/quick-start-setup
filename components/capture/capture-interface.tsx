"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import type { Forge, Model, CaptureAngle } from "@/lib/types"
import { CAPTURE_ANGLES } from "@/lib/types"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Check, Upload, X, Camera, AlertTriangle, ArrowRight, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { CaptureModeSelector, type CaptureMode } from "./capture-mode-selector"
import { GuidedCaptureInterface } from "./guided-capture-interface"
import { supabase } from "@/src/integrations/supabase/client"

interface CaptureInterfaceProps {
  forge: Forge
  model: Model
  onComplete: () => void
}

interface UploadedFile {
  angle: CaptureAngle
  name: string
  size: number
  valid: boolean
  error?: string
}

const REQUIRED_ANGLES = CAPTURE_ANGLES.slice(0, 54)
const MIN_RESOLUTION = { width: 1920, height: 1080 }
const ALLOWED_TYPES = ["image/jpeg", "image/png"]

/**
 * ✅ NAMED EXPORT — ISSO CORRIGE O ERRO DO BUILD
 */
export function CaptureInterface({ forge, model, onComplete }: CaptureInterfaceProps) {
  const { user } = useAuth()
  const [captureMode, setCaptureMode] = useState<CaptureMode | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<Map<CaptureAngle, UploadedFile>>(new Map())
  const [isUploading, setIsUploading] = useState(false)
  const [currentAngleIndex, setCurrentAngleIndex] = useState(forge.captureProgress)

  const requiredAngles = useMemo(() => REQUIRED_ANGLES, [])

  // Sync progress from DB (captures table is source-of-truth)
  useEffect(() => {
    const loadProgress = async () => {
      const { count, error } = await supabase
        .from("captures")
        .select("id", { count: "exact", head: true })
        .eq("model_id", forge.modelId)

      if (error) return
      const c = Math.min(count ?? 0, 54)
      setCurrentAngleIndex(c)
    }

    void loadProgress()
  }, [forge.modelId])

  const progress = Math.max(currentAngleIndex, uploadedFiles.size)
  const progressPercent = (progress / 54) * 100
  const isComplete = progress >= 54
  const currentAngle = requiredAngles[currentAngleIndex]

  const uploadToSupabase = async (file: File, angle: string) => {
    // Upload to public bucket 'captures'
    const ext = file.type === "image/png" ? "png" : "jpg"
    const objectPath = `${forge.modelId}/${forge.id}/${crypto.randomUUID()}_${angle}.${ext}`

    const { error: uploadError } = await supabase.storage.from("captures").upload(objectPath, file, {
      contentType: file.type,
      upsert: false,
    })
    if (uploadError) throw uploadError

    const { data: publicUrl } = supabase.storage.from("captures").getPublicUrl(objectPath)
    const assetUrl = publicUrl.publicUrl

    const { error: insertError } = await supabase.from("captures").insert({
      model_id: forge.modelId,
      asset_url: assetUrl,
      status: "pending",
    })
    if (insertError) throw insertError

    return assetUrl
  }

  const validateFile = async (
    file: File,
  ): Promise<{ valid: boolean; error?: string; resolution?: { width: number; height: number } }> => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return { valid: false, error: "Invalid format. Use JPG or PNG." }
    }

    if (file.size > 10 * 1024 * 1024) {
      return { valid: false, error: "File too large. Max 10MB." }
    }

    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        URL.revokeObjectURL(img.src)
        if (img.width < MIN_RESOLUTION.width || img.height < MIN_RESOLUTION.height) {
          resolve({
            valid: false,
            error: `Resolution too low. Min ${MIN_RESOLUTION.width}x${MIN_RESOLUTION.height}px.`,
            resolution: { width: img.width, height: img.height },
          })
        } else {
          resolve({ valid: true, resolution: { width: img.width, height: img.height } })
        }
      }
      img.onerror = () => resolve({ valid: false, error: "Failed to read image." })
      img.src = URL.createObjectURL(file)
    })
  }

  /**
   * ✅ MULTI UPLOAD RESTAURADO
   */
  const handleFileUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || !user) return

      setIsUploading(true)

      let angleIndex = currentAngleIndex
      const updatedFiles = new Map(uploadedFiles)

      for (const file of Array.from(files)) {
        if (angleIndex >= requiredAngles.length) break

        const angle = requiredAngles[angleIndex]
        const validation = await validateFile(file)

        if (!validation.valid || !validation.resolution) {
          toast.error(file.name, { description: validation.error })
          continue
        }

        try {
          await uploadToSupabase(file, String(angle))
        } catch (e) {
          const err = e instanceof Error ? e : new Error(String(e))
          toast.error("Upload falhou", { description: err.message })
          continue
        }

        updatedFiles.set(angle, {
          angle,
          name: file.name,
          size: file.size,
          valid: true,
        })

        angleIndex++
      }

      setUploadedFiles(updatedFiles)
      setCurrentAngleIndex(angleIndex)

      // Persist capture_progress in forges
      await supabase.from("forges").update({ capture_progress: updatedFiles.size, updated_at: new Date().toISOString() }).eq("id", forge.id)

      toast.success("Upload complete", {
        description: `${updatedFiles.size}/54 captures uploaded`,
      })

      setIsUploading(false)
    },
    [user, forge.id, forge.modelId, uploadedFiles, currentAngleIndex, requiredAngles],
  )

  if (!captureMode) {
    return <CaptureModeSelector onModeSelected={setCaptureMode} disabled={false} />
  }

  if (captureMode === "GUIDED") {
    return (
      <GuidedCaptureInterface
        forge={forge}
        model={model}
        onComplete={onComplete}
        onBack={() => setCaptureMode(null)}
      />
    )
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => setCaptureMode(null)}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Change Mode
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Manual Capture</CardTitle>
          <CardDescription>
            {model.name} — {progress}/54
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={progressPercent} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <Camera className="inline mr-2" />
            Upload Photos (multiple allowed)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png"
            className="hidden"
            id="capture-upload"
            onChange={(e) => handleFileUpload(e.target.files)}
          />
          <label htmlFor="capture-upload" className="block cursor-pointer text-center p-8 border-dashed border-2">
            <Upload className="mx-auto mb-2" />
            Click or select multiple photos
          </label>
        </CardContent>
      </Card>

      <Button onClick={onComplete} disabled={!isComplete}>
        Continue to Normalization
        <ArrowRight className="ml-2 w-4 h-4" />
      </Button>
    </div>
  )
}
