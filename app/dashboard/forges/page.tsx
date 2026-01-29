"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Header } from "@/components/dashboard/header"
import { dataStore } from "@/lib/data-store"
import type { Forge, Model } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StateBadge } from "@/components/forge/state-badge"
import { ProgressIndicator } from "@/components/forge/progress-indicator"
import { Search, Workflow, ArrowRight, Filter } from "lucide-react"
import { format } from "date-fns"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FORGE_STATES, type ForgeState } from "@/lib/types"

export default function ForgesPage() {
  const [forges, setForges] = useState<Forge[]>([])
  const [models, setModels] = useState<Map<string, Model>>(new Map())
  const [search, setSearch] = useState("")
  const [stateFilter, setStateFilter] = useState<ForgeState | "ALL">("ALL")

  useEffect(() => {
    if (dataStore) {
      const allForges = dataStore.getForges()
      setForges(allForges)

      const modelMap = new Map<string, Model>()
      dataStore.getModels().forEach((m) => modelMap.set(m.id, m))
      setModels(modelMap)
    }
  }, [])

  const filteredForges = forges.filter((forge) => {
    const model = models.get(forge.modelId)
    const matchesSearch =
      forge.id.toLowerCase().includes(search.toLowerCase()) ||
      model?.name.toLowerCase().includes(search.toLowerCase()) ||
      model?.internalId.toLowerCase().includes(search.toLowerCase())

    const matchesState = stateFilter === "ALL" || forge.state === stateFilter

    return matchesSearch && matchesState
  })

  return (
    <div>
      <Header title="Forges" description="Monitor and control forge pipelines" />

      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by ID or model name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-input border-border"
            />
          </div>
          <Select value={stateFilter} onValueChange={(v) => setStateFilter(v as ForgeState | "ALL")}>
            <SelectTrigger className="w-48 bg-input border-border">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by state" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All States</SelectItem>
              {FORGE_STATES.map((state) => (
                <SelectItem key={state} value={state}>
                  {state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filteredForges.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Workflow className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">No forges found</h3>
            <p className="text-sm text-muted-foreground">
              {search || stateFilter !== "ALL"
                ? "Try adjusting your search or filter criteria."
                : "Create a model and start a forge to begin."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredForges.map((forge) => {
              const model = models.get(forge.modelId)

              return (
                <Link key={forge.id} href={`/dashboard/forges/${forge.id}`}>
                  <Card className="bg-card border-border hover:border-primary/50 transition-all cursor-pointer">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="font-mono text-sm text-muted-foreground">{forge.id}</p>
                          <p className="font-medium text-foreground mt-1">{model?.name || "Unknown Model"}</p>
                          <p className="text-xs text-muted-foreground">{model?.internalId}</p>
                        </div>
                        <StateBadge state={forge.state} />
                      </div>

                      <ProgressIndicator currentState={forge.state} compact />

                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                        <span className="text-xs text-muted-foreground">
                          Created {format(forge.createdAt, "MMM d, yyyy")}
                        </span>
                        <Button variant="ghost" size="sm" className="text-primary">
                          View Details
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
