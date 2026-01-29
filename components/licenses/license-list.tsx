"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { phase2Store } from "@/lib/phase2-store"
import { useAuth } from "@/lib/auth-context"
import type { License, Forge, Model } from "@/lib/types"
import { FileKey, Calendar, Globe, Download, XCircle, AlertCircle } from "lucide-react"
import { toast } from "sonner"

interface LicenseListProps {
  licenses: License[]
  models: Map<string, Model>
  certifiedForges: Forge[]
  canRevoke: boolean
  onRevoked: () => void
}

const statusConfig = {
  ACTIVE: { color: "text-green-400", bg: "bg-green-500/20", border: "border-green-500/30", label: "Active" },
  EXPIRED: { color: "text-amber-400", bg: "bg-amber-500/20", border: "border-amber-500/30", label: "Expired" },
  REVOKED: { color: "text-red-400", bg: "bg-red-500/20", border: "border-red-500/30", label: "Revoked" },
}

export function LicenseList({ licenses, models, certifiedForges, canRevoke, onRevoked }: LicenseListProps) {
  const { user } = useAuth()
  const [revokeDialog, setRevokeDialog] = useState<License | null>(null)
  const [revokeReason, setRevokeReason] = useState("")

  const getModelName = (digitalTwinId: string) => {
    const forge = certifiedForges.find((f) => f.digitalTwinId === digitalTwinId)
    if (!forge) return "Unknown"
    const model = models.get(forge.modelId)
    return model?.name || "Unknown"
  }

  const handleRevoke = () => {
    if (!revokeDialog || !user || !phase2Store || !revokeReason) return

    const success = phase2Store.revokeLicense(revokeDialog.id, revokeReason, user.id)
    if (success) {
      toast.success("License revoked", {
        description: "The license has been terminated.",
      })
      setRevokeDialog(null)
      setRevokeReason("")
      onRevoked()
    } else {
      toast.error("Failed to revoke license")
    }
  }

  const getDaysRemaining = (validUntil: Date) => {
    const now = new Date()
    const diff = validUntil.getTime() - now.getTime()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    return days
  }

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <FileKey className="w-5 h-5" />
            License Registry
          </CardTitle>
          <CardDescription>All commercial licenses</CardDescription>
        </CardHeader>
        <CardContent>
          {licenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileKey className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No licenses found</p>
              <p className="text-xs text-muted-foreground mt-1">Create a license to enable commercial downloads</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {licenses.map((license) => {
                  const status = statusConfig[license.status]
                  const daysRemaining = getDaysRemaining(license.validUntil)
                  const modelName = getModelName(license.digitalTwinId)

                  return (
                    <div
                      key={license.id}
                      className={`p-4 rounded-lg border ${license.status === "ACTIVE" ? "bg-card border-green-500/20" : "bg-muted/30 border-border"}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{modelName}</span>
                            <Badge className={`${status.bg} ${status.color} ${status.border}`}>{status.label}</Badge>
                            <Badge variant="outline">{license.usageType}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground font-mono">{license.digitalTwinId}</p>
                        </div>

                        {canRevoke && license.status === "ACTIVE" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setRevokeDialog(license)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                        <div>
                          <p className="text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Valid Until
                          </p>
                          <p className="text-foreground font-medium">
                            {new Date(license.validUntil).toLocaleDateString()}
                          </p>
                          {license.status === "ACTIVE" && (
                            <p
                              className={`text-xs ${daysRemaining > 30 ? "text-green-400" : daysRemaining > 7 ? "text-amber-400" : "text-red-400"}`}
                            >
                              {daysRemaining > 0 ? `${daysRemaining} days remaining` : "Expires today"}
                            </p>
                          )}
                        </div>

                        <div>
                          <p className="text-muted-foreground flex items-center gap-1">
                            <Globe className="w-3 h-3" /> Territory
                          </p>
                          <p className="text-foreground font-medium">{license.territory.join(", ")}</p>
                        </div>

                        <div>
                          <p className="text-muted-foreground flex items-center gap-1">
                            <Download className="w-3 h-3" /> Downloads
                          </p>
                          <p className="text-foreground font-medium">
                            {license.currentDownloads}
                            {license.maxDownloads && ` / ${license.maxDownloads}`}
                          </p>
                        </div>

                        <div>
                          <p className="text-muted-foreground">Client ID</p>
                          <p className="text-foreground font-mono text-xs">{license.clientId}</p>
                        </div>
                      </div>

                      {license.status === "REVOKED" && license.revokedReason && (
                        <div className="mt-3 p-2 rounded bg-red-500/10 border border-red-500/20">
                          <p className="text-xs text-red-400">
                            <AlertCircle className="w-3 h-3 inline mr-1" />
                            Revoked: {license.revokedReason}
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Revoke Dialog */}
      <Dialog open={!!revokeDialog} onOpenChange={() => setRevokeDialog(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Revoke License</DialogTitle>
            <DialogDescription>
              This action will immediately terminate the license and block all downloads.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-400">
                Revoking license for: <strong>{revokeDialog?.digitalTwinId}</strong>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Revocation Reason</Label>
              <Input
                id="reason"
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="Enter reason for revocation..."
                className="bg-input border-border"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setRevokeDialog(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRevoke} disabled={!revokeReason}>
              Revoke License
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
