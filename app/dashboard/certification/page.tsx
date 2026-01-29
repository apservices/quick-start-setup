"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/dashboard/header"
import { dataStore } from "@/lib/data-store"
import { certificateRegistry } from "@/lib/certificate-registry"
import type { Forge, Model } from "@/lib/types"
import { useAuth } from "@/lib/auth-context"
import { hasPermission } from "@/lib/rbac"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { StateBadge } from "@/components/forge/state-badge"
import { ProgressIndicator } from "@/components/forge/progress-indicator"
import { LoadingCard, LoadingSpinner } from "@/components/loading-state"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  AlertCircle,
  Award,
  Shield,
  Lock,
  CheckCircle,
  Sparkles,
  Copy,
  ExternalLink,
  AlertTriangle,
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import Link from "next/link"

export default function CertificationPage() {
  const { user } = useAuth()
  const [forges, setForges] = useState<Forge[]>([])
  const [certifiedForges, setCertifiedForges] = useState<Forge[]>([])
  const [models, setModels] = useState<Map<string, Model>>(new Map())
  const [selectedForgeId, setSelectedForgeId] = useState<string>("")
  const [showCertifyDialog, setShowCertifyDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = () => {
    setIsLoading(true)
    try {
      if (dataStore) {
        const allForges = dataStore.getForges()
        setForges(allForges.filter((f) => f.state === "VALIDATED"))
        setCertifiedForges(allForges.filter((f) => f.state === "CERTIFIED"))

        const modelMap = new Map<string, Model>()
        dataStore.getModels().forEach((m) => modelMap.set(m.id, m))
        setModels(modelMap)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const selectedForge = forges.find((f) => f.id === selectedForgeId)
  const selectedModel = selectedForge ? models.get(selectedForge.modelId) : null

  // Check permission
  const canCertify = user && hasPermission(user.role, "certification:execute")

  const handleCertify = async () => {
    if (!selectedForge || !user || !canCertify) return

    setIsProcessing(true)

    try {
      const result = dataStore.transitionForge(selectedForge.id, "CERTIFIED")

      if (result.success && result.forge) {
        // Issue certificate through registry
        const model = models.get(selectedForge.modelId)
        if (model && certificateRegistry) {
          certificateRegistry.issueCertificate(result.forge, model, user.name)
        }

        dataStore.addAuditLog({
          userId: user.id,
          userName: user.name,
          action: "CERTIFICATION_COMPLETED",
          forgeId: selectedForge.id,
          modelId: selectedForge.modelId,
          metadata: {
            digitalTwinId: result.forge.digitalTwinId,
            certifiedAt: result.forge.certifiedAt?.toISOString(),
          },
        })

        toast.success("Certification Complete!", {
          description: `Digital Twin ID: ${result.forge.digitalTwinId}`,
        })

        // Refresh lists
        loadData()
        setSelectedForgeId("")
      } else {
        toast.error("Certification failed", { description: result.error })
      }
    } finally {
      setIsProcessing(false)
      setShowCertifyDialog(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Copied to clipboard")
  }

  if (isLoading) {
    return (
      <div>
        <Header title="Certification" description="Generate Digital Twin certifications" />
        <div className="p-6">
          <LoadingCard title="Loading Certification" description="Fetching certification data..." />
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header title="Certification" description="Generate Digital Twin certifications" />

      <div className="p-6 space-y-6">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Pending Certification</CardTitle>
            <CardDescription>Select a validated forge to certify as a Digital Twin</CardDescription>
          </CardHeader>
          <CardContent>
            {forges.length === 0 ? (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                <AlertCircle className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-foreground">No forges ready for certification</p>
                  <p className="text-xs text-muted-foreground">Forges must pass validation before certification.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Select value={selectedForgeId} onValueChange={setSelectedForgeId} disabled={!canCertify}>
                  <SelectTrigger className="w-full max-w-md bg-input border-border">
                    <SelectValue placeholder="Select a validated forge..." />
                  </SelectTrigger>
                  <SelectContent>
                    {forges.map((forge) => {
                      const model = models.get(forge.modelId)
                      return (
                        <SelectItem key={forge.id} value={forge.id}>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs">{forge.id}</span>
                            <span className="text-muted-foreground">-</span>
                            <span>{model?.name || "Unknown"}</span>
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>

                {!canCertify && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    <span>You do not have permission to issue certifications.</span>
                  </div>
                )}

                {selectedForge && selectedModel && (
                  <div className="p-4 rounded-lg border border-border bg-card">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-medium text-foreground">{selectedModel.name}</h3>
                        <p className="text-sm text-muted-foreground">{selectedModel.internalId}</p>
                      </div>
                      <StateBadge state={selectedForge.state} />
                    </div>

                    <ProgressIndicator currentState={selectedForge.state} compact />

                    <div className="mt-4 pt-4 border-t border-border">
                      <Button
                        onClick={() => setShowCertifyDialog(true)}
                        className="w-full"
                        disabled={!canCertify || isProcessing}
                      >
                        {isProcessing ? (
                          <LoadingSpinner size="sm" className="mr-2" />
                        ) : (
                          <Award className="w-4 h-4 mr-2" />
                        )}
                        Issue Certification
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Certified Digital Twins
            </CardTitle>
            <CardDescription>{certifiedForges.length} certified identities</CardDescription>
          </CardHeader>
          <CardContent>
            {certifiedForges.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <Award className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">No certified Digital Twins yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {certifiedForges.map((forge) => {
                  const model = models.get(forge.modelId)

                  return (
                    <div
                      key={forge.id}
                      className="p-4 rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                            <Shield className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">{model?.name || "Unknown"}</h3>
                            <p className="text-xs text-muted-foreground">{model?.internalId}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-primary" />
                          <span className="text-xs font-medium text-primary">ATLAS VERIFIED</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="p-3 rounded-lg bg-background/50">
                          <p className="text-xs text-muted-foreground mb-1">Digital Twin ID</p>
                          <div className="flex items-center gap-2">
                            <code className="text-sm font-mono text-primary">{forge.digitalTwinId}</code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => copyToClipboard(forge.digitalTwinId || "")}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="p-3 rounded-lg bg-background/50">
                          <p className="text-xs text-muted-foreground mb-1">Certified On</p>
                          <p className="text-sm text-foreground">
                            {forge.certifiedAt && format(forge.certifiedAt, "MMMM d, yyyy 'at' h:mm a")}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Lock className="w-3 h-3" />
                          <span>Permanently read-only - No modifications allowed</span>
                        </div>
                        <Link href={`/dashboard/forges/${forge.id}`}>
                          <Button variant="outline" size="sm">
                            View Details
                            <ExternalLink className="w-3 h-3 ml-2" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={showCertifyDialog} onOpenChange={setShowCertifyDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              Issue Digital Twin Certification
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                You are about to certify <strong>{selectedModel?.name}</strong> as a verified Digital Twin.
              </p>
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
                <strong>Warning:</strong> This action is permanent and irreversible. Once certified:
                <ul className="list-disc ml-4 mt-2 space-y-1">
                  <li>The identity record becomes permanently read-only</li>
                  <li>No modifications or rollbacks are possible</li>
                  <li>This cannot be undone via UI or any other means</li>
                </ul>
              </div>
              <div className="space-y-2 text-sm">
                <p className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary" />
                  <span>A unique Digital Twin ID will be generated</span>
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary" />
                  <span>ATLAS VERIFIED badge will be issued</span>
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary" />
                  <span>Immutable audit log entry will be created</span>
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCertify}
              className="bg-primary text-primary-foreground"
              disabled={isProcessing}
            >
              {isProcessing ? <LoadingSpinner size="sm" className="mr-2" /> : <Award className="w-4 h-4 mr-2" />}
              Issue Certification
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
