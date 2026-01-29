"use client"

import { useState, useCallback } from "react"
import type { Forge, Model, CaptureAngle } from "@/lib/types"
import { CAPTURE_ANGLES } from "@/lib/types"
import { dataStore } from "@/lib/data-store"
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

  const progress = uploadedFiles.size
  const progressPercent = (progress / 54) * 100
  const isComplete = progress >= 54
  const currentAngle = REQUIRED_ANGLES[currentAngleIndex]

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
        if (angleIndex >= REQUIRED_ANGLES.length) break

        const angle = REQUIRED_ANGLES[angleIndex]
        const validation = await validateFile(file)

        if (!validation.valid || !validation.resolution) {
          toast.error(file.name, { description: validation.error })
          continue
        }

        dataStore.addCaptureAsset(forge.id, {
          forgeId: forge.id,
          angle,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          resolution: validation.resolution,
          type: "PHOTO",
          stage: "CAPTURE",
          status: "VALID",
          fileUrl: URL.createObjectURL(file),
        })

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
      dataStore.updateForgeCapture(forge.id, updatedFiles.size)

      toast.success("Upload complete", {
        description: `${updatedFiles.size}/54 captures uploaded`,
      })

      setIsUploading(false)
    },
    [user, forge.id, uploadedFiles, currentAngleIndex],
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
