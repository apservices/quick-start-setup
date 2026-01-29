"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Smartphone, Upload, Camera, AlertCircle, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

export type CaptureMode = "GUIDED" | "MANUAL"

interface SimpleDeviceInfo {
  deviceType: "mobile" | "tablet" | "desktop" | "unknown"
  isCompatible: boolean
  reason: string
}

function getSimpleDeviceInfo(): SimpleDeviceInfo {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return { deviceType: "unknown", isCompatible: false, reason: "Browser not available" }
  }

  const userAgent = navigator.userAgent.toLowerCase()
  let deviceType: SimpleDeviceInfo["deviceType"] = "desktop"

  if (/iphone|ipod/.test(userAgent)) {
    deviceType = "mobile"
  } else if (/ipad/.test(userAgent)) {
    deviceType = "tablet"
  } else if (/android/.test(userAgent)) {
    deviceType = /mobile/.test(userAgent) ? "mobile" : "tablet"
  }

  const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
  const isMobileOrTablet = deviceType === "mobile" || deviceType === "tablet"

  if (!hasMediaDevices) {
    return { deviceType, isCompatible: false, reason: "Camera API not supported" }
  }

  if (!isMobileOrTablet) {
    return { deviceType, isCompatible: false, reason: "Guided capture optimized for mobile devices" }
  }

  return { deviceType, isCompatible: true, reason: "Device compatible" }
}

interface CaptureModeSelectoryProps {
  onModeSelected: (mode: CaptureMode) => void
  disabled?: boolean
}

export function CaptureModeSelector({ onModeSelected, disabled }: CaptureModeSelectoryProps) {
  const [deviceInfo] = useState<SimpleDeviceInfo>(() => getSimpleDeviceInfo())
  const [selectedMode, setSelectedMode] = useState<CaptureMode | null>(null)

  const handleModeSelect = useCallback((mode: CaptureMode) => {
    setSelectedMode(mode)
  }, [])

  const handleContinue = useCallback(() => {
    if (selectedMode) {
      onModeSelected(selectedMode)
    }
  }, [selectedMode, onModeSelected])

  const guidedAvailable = deviceInfo.isCompatible

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <Camera className="w-5 h-5 text-primary" />
          ATLAS Capture™
        </CardTitle>
        <CardDescription>
          Select your preferred capture method to begin the biometric data collection process
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Device Detection Status */}
        <div className="p-4 rounded-lg bg-muted/30 border border-border">
          <div className="flex items-center gap-3">
            {guidedAvailable ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <div>
                  <p className="text-sm font-medium text-foreground">Device Compatible</p>
                  <p className="text-xs text-muted-foreground">
                    {deviceInfo.deviceType === "mobile" ? "Mobile device" : "Tablet"} detected
                  </p>
                </div>
                <Badge className="ml-auto bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Ready</Badge>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-amber-400" />
                <div>
                  <p className="text-sm font-medium text-foreground">Limited Compatibility</p>
                  <p className="text-xs text-muted-foreground">{deviceInfo.reason}</p>
                </div>
                <Badge className="ml-auto bg-amber-500/20 text-amber-400 border-amber-500/30">Manual Only</Badge>
              </>
            )}
          </div>
        </div>

        {/* Mode Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Guided Capture Option */}
          <button
            type="button"
            onClick={() => handleModeSelect("GUIDED")}
            disabled={disabled || !guidedAvailable}
            className={cn(
              "relative p-6 rounded-xl border-2 text-left transition-all",
              "hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20",
              selectedMode === "GUIDED" ? "border-primary bg-primary/5" : "border-border bg-card",
              (!guidedAvailable || disabled) && "opacity-50 cursor-not-allowed",
            )}
          >
            {selectedMode === "GUIDED" && (
              <div className="absolute top-3 right-3">
                <CheckCircle2 className="w-5 h-5 text-primary" />
              </div>
            )}
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Smartphone className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Guided Capture</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Step-by-step camera guidance for optimal quality. Real-time validation ensures standardized captures.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-xs">
                Real-time validation
              </Badge>
              <Badge variant="outline" className="text-xs">
                Step-by-step
              </Badge>
              <Badge variant="outline" className="text-xs">
                Mobile optimized
              </Badge>
            </div>
            {!guidedAvailable && <p className="mt-3 text-xs text-amber-400">Not available on this device</p>}
          </button>

          {/* Manual Upload Option */}
          <button
            type="button"
            onClick={() => handleModeSelect("MANUAL")}
            disabled={disabled}
            className={cn(
              "relative p-6 rounded-xl border-2 text-left transition-all",
              "hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20",
              selectedMode === "MANUAL" ? "border-primary bg-primary/5" : "border-border bg-card",
              disabled && "opacity-50 cursor-not-allowed",
            )}
          >
            {selectedMode === "MANUAL" && (
              <div className="absolute top-3 right-3">
                <CheckCircle2 className="w-5 h-5 text-primary" />
              </div>
            )}
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-4">
              <Upload className="w-6 h-6 text-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Manual Upload</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Upload professionally captured images from an external source. Supports batch upload with validation.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-xs">
                External capture
              </Badge>
              <Badge variant="outline" className="text-xs">
                Batch upload
              </Badge>
              <Badge variant="outline" className="text-xs">
                All devices
              </Badge>
            </div>
            <p className="mt-3 text-xs text-emerald-400">Always available</p>
          </button>
        </div>

        {/* Continue Button */}
        <div className="flex justify-end pt-4 border-t border-border">
          <Button onClick={handleContinue} disabled={!selectedMode || disabled} className="min-w-[160px]">
            Continue with {selectedMode === "GUIDED" ? "Guided" : selectedMode === "MANUAL" ? "Manual" : ""} Capture
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
