"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/dashboard/header"
import { CareerOverview } from "@/components/career/career-overview"
import { CareerCaptureViewer } from "@/components/career/career-capture-viewer"
import { CareerPreviews } from "@/components/career/career-previews"
import { CareerAssets } from "@/components/career/career-assets"
import { CareerConsents } from "@/components/career/career-consents"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { dataStore } from "@/lib/data-store"
import { phase2Store } from "@/lib/phase2-store"
import { useAuth } from "@/lib/auth-context"
import type { Model, Forge } from "@/lib/types"
import { User, Lock } from "lucide-react"
import { redirect } from "next/navigation"

export default function CareerPage() {
  const { user } = useAuth()
  const [model, setModel] = useState<Model | null>(null)
  const [forges, setForges] = useState<Forge[]>([])
  const [digitalTwinId, setDigitalTwinId] = useState<string | null>(null)

  useEffect(() => {
    // Only MODEL role can access this page
    if (user?.role !== "MODEL") {
      redirect("/dashboard")
    }

    if (dataStore && phase2Store && user?.linkedModelId) {
      const linkedModel = dataStore.getModel(user.linkedModelId)
      setModel(linkedModel || null)

      const modelForges = dataStore.getForgesByModel(user.linkedModelId)
      setForges(modelForges)

      // Find certified forge with digitalTwinId
      const certifiedForge = modelForges.find((f) => f.state === "CERTIFIED" && f.digitalTwinId)
      if (certifiedForge) {
        setDigitalTwinId(certifiedForge.digitalTwinId!)
      }
    }
  }, [user])

  if (!model) {
    return (
      <div>
        <Header title="Career Platform" description="Your Digital Twin career dashboard" />
        <div className="p-6">
          <Card className="bg-card border-border">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Lock className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-1">No Model Linked</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                Your account is not linked to a model profile. Please contact an administrator.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header title="Career Platform" description="Your Digital Twin career dashboard" />

      <div className="p-6 space-y-6">
        {/* Welcome Section */}
        <div className="flex items-center gap-4 p-6 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Welcome, {model.name}</h2>
            <p className="text-sm text-muted-foreground">
              {digitalTwinId ? (
                <>
                  Digital Twin: <span className="font-mono text-primary">{digitalTwinId}</span>
                </>
              ) : (
                "Your Digital Twin is being processed"
              )}
            </p>
          </div>
        </div>

        {/* Overview Stats */}
        <CareerOverview model={model} forges={forges} digitalTwinId={digitalTwinId} />

        {/* Tabbed Content */}
        <Tabs defaultValue="captures" className="space-y-4">
          <TabsList className="bg-muted">
            <TabsTrigger value="captures">Captures</TabsTrigger>
            <TabsTrigger value="previews">Previews</TabsTrigger>
            <TabsTrigger value="assets">Licensed Assets</TabsTrigger>
            <TabsTrigger value="consents">Consents</TabsTrigger>
          </TabsList>

          <TabsContent value="captures">
            {digitalTwinId ? (
              <CareerCaptureViewer digitalTwinId={digitalTwinId} />
            ) : (
              <Card className="bg-card border-border">
                <CardContent className="py-12 text-center text-muted-foreground">
                  Captures will be visible once your Digital Twin is certified.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="previews">
            {digitalTwinId ? (
              <CareerPreviews digitalTwinId={digitalTwinId} />
            ) : (
              <Card className="bg-card border-border">
                <CardContent className="py-12 text-center text-muted-foreground">
                  Previews will be visible once your Digital Twin is certified.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="assets">
            {digitalTwinId ? (
              <CareerAssets digitalTwinId={digitalTwinId} />
            ) : (
              <Card className="bg-card border-border">
                <CardContent className="py-12 text-center text-muted-foreground">
                  Licensed assets will be visible once your Digital Twin is certified.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="consents">
            <CareerConsents model={model} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
