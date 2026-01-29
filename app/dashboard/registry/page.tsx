"use client"

import { Suspense, useState, useEffect } from "react"
import { Header } from "@/components/dashboard/header"
import { certificateRegistry } from "@/lib/certificate-registry"
import { dataStore } from "@/lib/data-store"
import type { Certificate } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Shield,
  Search,
  Download,
  ExternalLink,
  Copy,
  CheckCircle,
  XCircle,
  FileText,
  QrCode,
  Sparkles,
  RefreshCw,
  Award,
} from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import Link from "next/link"

function CertificateRegistryContent() {
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [search, setSearch] = useState("")
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null)
  const [verifyCode, setVerifyCode] = useState("")
  const [verifyResult, setVerifyResult] = useState<Certificate | null | "not_found">(null)
  const [stats, setStats] = useState({ total: 0, active: 0, revoked: 0 })

  useEffect(() => {
    loadCertificates()
  }, [])

  const loadCertificates = () => {
    if (certificateRegistry && dataStore) {
      const forges = dataStore.getForges().filter((f) => f.state === "CERTIFIED")
      const models = new Map(dataStore.getModels().map((m) => [m.id, m]))

      forges.forEach((forge) => {
        const model = models.get(forge.modelId)
        if (model && forge.digitalTwinId) {
          certificateRegistry.issueCertificate(forge, model, "System")
        }
      })

      setCertificates(certificateRegistry.getAllCertificates())
      setStats(certificateRegistry.getStats())
    }
  }

  const filteredCertificates = certificates.filter((cert) => {
    const searchLower = search.toLowerCase()
    return (
      cert.digitalTwinId.toLowerCase().includes(searchLower) ||
      cert.modelName.toLowerCase().includes(searchLower) ||
      cert.verificationCode.toLowerCase().includes(searchLower)
    )
  })

  const handleVerify = () => {
    if (!verifyCode.trim()) return

    if (certificateRegistry) {
      const result = certificateRegistry.verifyCertificate(verifyCode)
      setVerifyResult(result || "not_found")
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Copied to clipboard")
  }

  const exportCertificate = (cert: Certificate) => {
    if (!certificateRegistry) return

    const data = certificateRegistry.exportCertificateData(cert.id)
    if (!data) return

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `certificate-${cert.digitalTwinId}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <Header
        title="Certificate Registry"
        description="Public registry of verified Digital Twin certifications"
        actions={
          <Button variant="outline" onClick={loadCertificates}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Certificates</p>
                  <p className="text-2xl font-semibold text-foreground">{stats.total}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Award className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-semibold text-emerald-400">{stats.active}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Revoked</p>
                  <p className="text-2xl font-semibold text-rose-400">{stats.revoked}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-rose-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Verification */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              Verify Certificate
            </CardTitle>
            <CardDescription>Enter a verification code to validate a Digital Twin certificate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 max-w-xl">
              <Input
                placeholder="Enter verification code (e.g., ABCD-1234-EFGH-5678)"
                value={verifyCode}
                onChange={(e) => {
                  setVerifyCode(e.target.value)
                  setVerifyResult(null)
                }}
                className="bg-input border-border font-mono"
              />
              <Button onClick={handleVerify}>Verify</Button>
            </div>

            {verifyResult && (
              <div className="mt-4">
                {verifyResult === "not_found" ? (
                  <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center gap-3">
                    <XCircle className="w-5 h-5 text-rose-400" />
                    <div>
                      <p className="text-sm font-medium text-rose-400">Certificate Not Found</p>
                      <p className="text-xs text-muted-foreground">
                        The verification code is invalid or does not exist.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div
                    className={cn(
                      "p-4 rounded-lg border flex items-start gap-3",
                      verifyResult.status === "ACTIVE"
                        ? "bg-emerald-500/10 border-emerald-500/20"
                        : "bg-rose-500/10 border-rose-500/20",
                    )}
                  >
                    {verifyResult.status === "ACTIVE" ? (
                      <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-400 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p
                        className={cn(
                          "text-sm font-medium",
                          verifyResult.status === "ACTIVE" ? "text-emerald-400" : "text-rose-400",
                        )}
                      >
                        {verifyResult.status === "ACTIVE" ? "Valid Certificate" : "Certificate Revoked"}
                      </p>
                      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                        <p>Digital Twin ID: {verifyResult.digitalTwinId}</p>
                        <p>Model: {verifyResult.modelName}</p>
                        <p>Issued: {format(verifyResult.issuedAt, "MMMM d, yyyy")}</p>
                        {verifyResult.revokedReason && (
                          <p className="text-rose-400">Reason: {verifyResult.revokedReason}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Certificate List */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Certificate Registry
            </CardTitle>
            <CardDescription>All issued Digital Twin certifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by Digital Twin ID, name, or code..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-input border-border"
                />
              </div>
            </div>

            {filteredCertificates.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">No certificates found.</p>
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-muted-foreground">Digital Twin ID</TableHead>
                      <TableHead className="text-muted-foreground">Model</TableHead>
                      <TableHead className="text-muted-foreground">Plan</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                      <TableHead className="text-muted-foreground">Issued</TableHead>
                      <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCertificates.map((cert) => (
                      <TableRow key={cert.id} className="border-border">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-primary" />
                            <code className="text-sm font-mono text-primary">{cert.digitalTwinId}</code>
                          </div>
                        </TableCell>
                        <TableCell className="text-foreground">{cert.modelName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {cert.planType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              cert.status === "ACTIVE"
                                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                : "bg-rose-500/20 text-rose-400 border-rose-500/30",
                            )}
                          >
                            {cert.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(cert.issuedAt, "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => copyToClipboard(cert.verificationCode)}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => exportCertificate(cert)}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setSelectedCert(cert)}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Certificate Detail Dialog */}
      <Dialog open={!!selectedCert} onOpenChange={() => setSelectedCert(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Certificate Details
            </DialogTitle>
            <DialogDescription>Full certificate information for verification</DialogDescription>
          </DialogHeader>
          {selectedCert && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-xs font-medium text-primary">ATLAS VERIFIED</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      selectedCert.status === "ACTIVE"
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                        : "bg-rose-500/20 text-rose-400 border-rose-500/30",
                    )}
                  >
                    {selectedCert.status}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Digital Twin ID</p>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-lg font-mono text-primary">{selectedCert.digitalTwinId}</code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyToClipboard(selectedCert.digitalTwinId)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">Verification Code</p>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-sm font-mono text-foreground">{selectedCert.verificationCode}</code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyToClipboard(selectedCert.verificationCode)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Model</p>
                      <p className="text-sm text-foreground mt-1">{selectedCert.modelName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Plan Type</p>
                      <p className="text-sm text-foreground mt-1">{selectedCert.planType}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Version</p>
                      <p className="text-sm text-foreground mt-1">v{selectedCert.version}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Issued On</p>
                      <p className="text-sm text-foreground mt-1">{format(selectedCert.issuedAt, "MMMM d, yyyy")}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  className="flex-1 bg-transparent"
                  onClick={() => exportCertificate(selectedCert)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export JSON
                </Button>
                <Link href={`/dashboard/forges/${selectedCert.forgeId}`} className="flex-1">
                  <Button variant="default" className="w-full">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Forge
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function CertificateRegistryPage() {
  return (
    <Suspense fallback={null}>
      <CertificateRegistryContent />
    </Suspense>
  )
}
