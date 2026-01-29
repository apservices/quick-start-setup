"use client"

import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg"
  className?: string
}

const sizeMap = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
}

export function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  return <Loader2 className={cn("animate-spin text-primary", sizeMap[size], className)} />
}

interface LoadingOverlayProps {
  message?: string
  fullScreen?: boolean
}

export function LoadingOverlay({ message = "Loading...", fullScreen = false }: LoadingOverlayProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm",
        fullScreen ? "fixed inset-0 z-50" : "absolute inset-0",
      )}
    >
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

interface LoadingCardProps {
  title?: string
  description?: string
}

export function LoadingCard({ title, description }: LoadingCardProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <LoadingSpinner size="lg" />
      {title && <h3 className="text-lg font-medium text-foreground mt-4">{title}</h3>}
      {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
    </div>
  )
}

interface ProcessingIndicatorProps {
  message: string
  progress?: number
  subMessage?: string
}

export function ProcessingIndicator({ message, progress, subMessage }: ProcessingIndicatorProps) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
      <LoadingSpinner size="sm" />
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">{message}</p>
        {subMessage && <p className="text-xs text-muted-foreground mt-0.5">{subMessage}</p>}
      </div>
      {progress !== undefined && <span className="text-sm font-medium text-primary">{progress}%</span>}
    </div>
  )
}
