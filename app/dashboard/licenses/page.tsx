"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/dashboard/header"
import { LicenseList } from "@/components/licenses/license-list"
import { LicenseCreator } from "@/components/licenses/license-creator"
import { LicenseStats } from "@/components/licenses/license-stats"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { dataStore } from "@/lib/data-store"
import { phase2Store } from "@/lib/phase2-store"
import { useAuth } from "@/lib/auth-context"
import type { Forge, Model, License } from "@/lib/types"
import { Shield } from "lucide-react"

export default function LicensesPage() {
  const { user } = useAuth()
  const [certifiedForges, setCertifiedForges] = useState<Forge[]>([])
  const [models, setModels] = useState<Map<string, Model>>(new Map())
  const [licenses, setLicenses] = useState<License[]>([])
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (dataStore && phase2Store) {
      // Get certified forges
      const forges = dataStore.getForges().filter((f) => f.state === "CERTIFIED" && f.digitalTwinId)
      setCertifiedForges(forges)

      const modelMap = new Map<string, Model>()
      dataStore.getModels().forEach((m) => modelMap.set(m.id, m))
      setModels(modelMap)

      // Get licenses based on role
      if (user?.role === "CLIENT" && user.linkedClientId) {
        setLicenses(phase2Store.getLicensesByClient(user.linkedClientId))
      } else {
        // Admin/Operator see all licenses
        const allLicenses: License[] = []
        forges.forEach((f) => {
          if (f.digitalTwinId) {
            allLicenses.push(...phase2Store.getLicensesByDigitalTwin(f.digitalTwinId))
          }
        })
        setLicenses(allLicenses)
      }
    }
  }, [user, refreshKey])

  const handleLicenseCreated = () => {
    setRefreshKey((k) => k + 1)
  }

  const handleLicenseRevoked = () => {
    setRefreshKey((k) => k + 1)
  }

  const isClient = user?.role === "CLIENT"
  const canCreate = user?.role === "ADMIN" || user?.role === "OPERATOR"

  return (
    <div>
      <Header title="License Engine" description="Manage commercial usage licenses" />

      <div className="p-6 space-y-6">
        {/* Access notice */}
        <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/10 border border-primary/20">
          <Shield className="w-5 h-5 text-primary" />
          <div>
            <p className="text-sm font-medium text-foreground">License Management</p>
            <p className="text-xs text-muted-foreground">
              {isClient
                ? "View your active licenses and usage rights."
                : "Control usage rights, territory, and validity periods for commercial licenses."}
            </p>
          </div>
        </div>

        {/* Stats */}
        <LicenseStats licenses={licenses} />

        {canCreate ? (
          <Tabs defaultValue="list" className="space-y-4">
            <TabsList className="bg-muted">
              <TabsTrigger value="list">All Licenses</TabsTrigger>
              <TabsTrigger value="create">Create License</TabsTrigger>
            </TabsList>

            <TabsContent value="list">
              <LicenseList
                licenses={licenses}
                models={models}
                certifiedForges={certifiedForges}
                canRevoke={!isClient}
                onRevoked={handleLicenseRevoked}
              />
            </TabsContent>

            <TabsContent value="create">
              <LicenseCreator certifiedForges={certifiedForges} models={models} onCreated={handleLicenseCreated} />
            </TabsContent>
          </Tabs>
        ) : (
          <LicenseList
            licenses={licenses}
            models={models}
            certifiedForges={certifiedForges}
            canRevoke={false}
            onRevoked={handleLicenseRevoked}
          />
        )}
      </div>
    </div>
  )
}
