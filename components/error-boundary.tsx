"use client"

import type React from "react"

import { Component, type ReactNode } from "react"
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { systemLogger } from "@/lib/system-logger"
import { isProduction } from "@/lib/config"
import Link from "next/link"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
  errorId?: string
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    // Generate error ID for tracking
    const errorId = `err_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 6)}`
    return { hasError: true, error, errorId }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo })

    // Log error to system logger
    if (systemLogger) {
      systemLogger.error(`Uncaught error: ${error.message}`, "ErrorBoundary", error, {
        componentStack: errorInfo.componentStack,
        errorId: this.state.errorId,
      })
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined, errorId: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const productionMode = isProduction()

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <Card className="w-full max-w-lg bg-card border-border">
            <CardHeader className="text-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <ShieldAlert className="w-8 h-8 text-destructive" />
              </div>
              <CardTitle className="text-foreground">Something went wrong</CardTitle>
              <CardDescription>
                {productionMode
                  ? "An unexpected error occurred. Our team has been notified."
                  : "An error occurred while rendering this component."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!productionMode && this.state.error && (
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-xs font-mono text-muted-foreground break-all">{this.state.error.message}</p>
                </div>
              )}

              {/* Error reference ID for support */}
              <div className="p-3 rounded-lg bg-muted/30 border border-border">
                <p className="text-xs text-muted-foreground text-center">
                  Reference ID: <code className="font-mono text-foreground">{this.state.errorId}</code>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={this.handleReset} className="flex-1 bg-transparent">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Link href="/dashboard" className="flex-1">
                  <Button variant="default" className="w-full">
                    <Home className="w-4 h-4 mr-2" />
                    Go Home
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

export function ErrorFallback({
  title = "Error loading content",
  description = "Something went wrong. Please try again.",
  onRetry,
}: {
  title?: string
  description?: string
  onRetry?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <AlertTriangle className="w-6 h-6 text-destructive" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground text-center max-w-md mb-4">{description}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      )}
    </div>
  )
}
