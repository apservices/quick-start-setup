"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import type { Forge, Model } from "@/lib/types"
import {
  GUIDED_CAPTURE_STEPS,
  captureSessionManager,
  validateCapturedImage,
  type CaptureSession,
  type GuidedCaptureStepId,
} from "@/lib/capture-session"
import { dataStore } from "@/lib/data-store"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
  Camera,
  Check,
  X,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  EyeOff,
  User,
  AlertTriangle,
  Loader2,
  CheckCircle2,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface GuidedCaptureInterfaceProps {
  forge: Forge
  model: Model
  onComplete: () => void
  onBack: () => void
}

const STEP_ICONS: Record<string, React.ReactNode> = {
  face: <User className="w-6 h-6" />,
  "eye-closed": <EyeOff className="w-6 h-6" />,
  "arrow-right": <ArrowRight className="w-6 h-6" />,
  "arrow-left": <ArrowLeft className="w-6 h-6" />,
  "arrow-up": <ArrowUp className="w-6 h-6" />,
  "arrow-down": <ArrowDown className="w-6 h-6" />,
}

export function GuidedCaptureInterface({ forge, model, onComplete, onBack }: GuidedCaptureInterfaceProps) {
  const { user } = useAuth()

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [session, setSession] = useState<CaptureSession | null>(null)
  const [isCameraReady, setIsCameraReady] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [lastCapture, setLastCapture] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)

  const currentStepIndex = session?.currentStepIndex ?? 0
  const currentStep = GUIDED_CAPTURE_STEPS[currentStepIndex] ?? null
  const completedSteps = session?.completedSteps ?? []

  const progress =
    GUIDED_CAPTURE_STEPS.length > 0
      ? (completedSteps.length / GUIDED_CAPTURE_STEPS.length) * 100
      : 0

  const isLastStep = currentStepIndex === GUIDED_CAPTURE_STEPS.length - 1
  const isStepComplete = currentStep
    ? completedSteps.includes(currentStep.id as GuidedCaptureStepId)
    : false

  /* -------------------- INIT SESSION -------------------- */
  useEffect(() => {
    if (!captureSessionManager) return

    const existing = captureSessionManager.getActiveSessionForForge(forge.id)
    if (existing && existing.mode === "GUIDED") {
      setSession(existing)
    } else {
      const created = captureSessionManager.createSession(forge.id, "GUIDED")
      setSession(created)
    }

    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [forge.id])

  /* -------------------- CAMERA -------------------- */
  useEffect(() => {
    if (!session) return

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        })

        streamRef.current = stream

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play()
            setIsCameraReady(true)
          }
        }
      } catch (err) {
        if (err instanceof Error) {
          setCameraError(
            err.name === "NotAllowedError"
              ? "Camera permission denied. Please allow access."
              : `Failed to start camera: ${err.message}`,
          )
        }
      }
    }

    startCamera()
  }, [session])

  /* -------------------- CAPTURE -------------------- */
  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !session || !user || !currentStep) return

    setIsCapturing(true)
    setValidationError(null)

    try {
      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("Canvas unavailable")

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
      ctx.drawImage(video, 0, 0)

      const imageData = canvas.toDataURL("image/jpeg", 0.95)
      setLastCapture(imageData)

      setIsValidating(true)
      await new Promise((r) => setTimeout(r, 500))

      const validation = validateCapturedImage(imageData, currentStep.id)

      if (!validation.valid) {
        setValidationError(validation.error || "Validation failed")
        captureSessionManager.addCapturedImage(session.id, currentStep.id, imageData, false)
        return
      }

      captureSessionManager.addCapturedImage(session.id, currentStep.id, imageData, true)

      dataStore.addCaptureAsset(forge.id, {
        forgeId: forge.id,
        angle: currentStep.id,
        fileName: `capture_${currentStep.id}.jpg`,
        fileSize: Math.round((imageData.length * 3) / 4),
        mimeType: "image/jpeg",
        resolution: { width: canvas.width, height: canvas.height },
        type: "PHOTO",
        stage: "CAPTURE",
        status: "VALID",
        fileUrl: imageData,
      })

      dataStore.addAuditLog({
        userId: user.id,
        userName: user.name,
        action: "CAPTURE_UPLOADED",
        forgeId: forge.id,
        modelId: model.id,
        metadata: { angle: currentStep.id, mode: "GUIDED" },
      })

      dataStore.updateForgeCapture(forge.id, completedSteps.length + 1)

      const updated = captureSessionManager.getSession(session.id)
      if (updated) setSession({ ...updated })

      toast.success("Capture validated")

      if (!isLastStep) {
        setTimeout(handleNextStep, 1200)
      }
    } catch (e) {
      setValidationError(e instanceof Error ? e.message : "Capture failed")
    } finally {
      setIsCapturing(false)
      setIsValidating(false)
    }
  }, [session, user, currentStep, forge.id, model.id, completedSteps.length, isLastStep])

  const handleNextStep = () => {
    if (!session) return
    captureSessionManager.advanceToNextStep(session.id)
    const updated = captureSessionManager.getSession(session.id)
    if (updated) setSession({ ...updated })
    setLastCapture(null)
    setValidationError(null)
  }

  const handleCompleteSession = () => {
    if (!session || !user) return

    captureSessionManager.completeSession(session.id)

    const result = dataStore.transitionForge(forge.id, "CAPTURED")
    if (result.success) {
      dataStore.addAuditLog({
        userId: user.id,
        userName: user.name,
        action: "FORGE_STATE_CHANGED",
        forgeId: forge.id,
        modelId: model.id,
        metadata: { from: "CREATED", to: "CAPTURED", captureMode: "GUIDED" },
      })
    }

    onComplete()
  }

  /* -------------------- CAMERA ERROR -------------------- */
  if (cameraError) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <AlertTriangle className="w-10 h-10 text-destructive mx-auto mb-4" />
          <p className="mb-4">{cameraError}</p>
          <Button onClick={onBack}>Back</Button>
        </CardContent>
      </Card>
    )
  }

  /* -------------------- UI -------------------- */
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Guided Capture</CardTitle>
          <CardDescription>
            {model.name} — Step {currentStepIndex + 1} of {GUIDED_CAPTURE_STEPS.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={progress} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="relative aspect-[3/4] bg-black p-0">
          {!isCameraReady && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="animate-spin text-primary" />
            </div>
          )}

          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={cn("w-full h-full object-cover scale-x-[-1]", lastCapture && "hidden")}
          />

          {lastCapture && <img src={lastCapture} className="w-full h-full object-cover" />}

          <canvas ref={canvasRef} className="hidden" />
        </CardContent>

        <CardContent className="flex justify-center gap-4">
          {!lastCapture && (
            <Button onClick={capturePhoto} disabled={!isCameraReady || isCapturing || isStepComplete}>
              {isCapturing ? <Loader2 className="animate-spin" /> : <Camera />}
            </Button>
          )}

          {isLastStep && isStepComplete && (
            <Button onClick={handleCompleteSession}>
              Complete <Check className="ml-2" />
            </Button>
          )}
        </CardContent>
      </Card>

      <Button variant="ghost" onClick={onBack}>
        <ArrowLeft className="mr-2" /> Back to Mode Selection
      </Button>
    </div>
  )
}
