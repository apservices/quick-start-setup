"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { License } from "@/lib/types"
import { FileKey, CheckCircle, XCircle, Clock } from "lucide-react"

interface LicenseStatsProps {
  licenses: License[]
}

export function LicenseStats({ licenses }: LicenseStatsProps) {
  const activeLicenses = licenses.filter((l) => l.status === "ACTIVE")
  const expiredLicenses = licenses.filter((l) => l.status === "EXPIRED")
  const revokedLicenses = licenses.filter((l) => l.status === "REVOKED")
  const commercialLicenses = licenses.filter((l) => l.usageType === "COMMERCIAL")

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Licenses</CardTitle>
          <FileKey className="w-4 h-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">{licenses.length}</div>
          <p className="text-xs text-muted-foreground">All time</p>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
          <CheckCircle className="w-4 h-4 text-green-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-400">{activeLicenses.length}</div>
          <p className="text-xs text-muted-foreground">{commercialLicenses.length} commercial</p>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Expired</CardTitle>
          <Clock className="w-4 h-4 text-amber-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-400">{expiredLicenses.length}</div>
          <p className="text-xs text-muted-foreground">Past validity</p>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Revoked</CardTitle>
          <XCircle className="w-4 h-4 text-red-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-400">{revokedLicenses.length}</div>
          <p className="text-xs text-muted-foreground">Terminated</p>
        </CardContent>
      </Card>
    </div>
  )
}
