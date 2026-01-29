"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/dashboard/header"
import { ModelTable } from "@/components/models/model-table"
import { CreateModelDialog } from "@/components/models/create-model-dialog"
import type { Model } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { supabase } from "@/src/integrations/supabase/client"

export default function ModelsPage() {
  const [models, setModels] = useState<Model[]>([])
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const mapRowToModel = (row: any): Model => {
    const statusRaw = String(row.status || "pending").toLowerCase()
    const status: Model["status"] =
      statusRaw === "active" ? "ACTIVE" : statusRaw === "archived" ? "ARCHIVED" : "PENDING_CONSENT"

    return {
      id: row.id,
      name: row.full_name,
      internalId: row.id,
      status,
      planType: "DIGITAL",
      consentGiven: status === "ACTIVE",
      consentDate: status === "ACTIVE" ? new Date(row.created_at || Date.now()) : undefined,
      createdAt: new Date(row.created_at || Date.now()),
      updatedAt: new Date(row.created_at || Date.now()),
      createdBy: row.user_id || "",
    }
  }

  const loadModels = async () => {
    const { data, error } = await supabase
      .from("models")
      .select("id, full_name, status, created_at, user_id")
      .order("created_at", { ascending: false })

    if (error) return
    setModels((data || []).map(mapRowToModel))
  }

  useEffect(() => {
    loadModels()
  }, [])

  const handleCreate = (model: Model) => {
    void loadModels()
    setIsCreateOpen(false)
  }

  const handleUpdate = () => {
    void loadModels()
  }

  return (
    <div>
      <Header
        title="Models"
        description="Manage individuals in the forge pipeline"
        actions={
          <Button onClick={() => setIsCreateOpen(true)} className="bg-primary text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" />
            New Model
          </Button>
        }
      />

      <div className="p-6">
        <ModelTable models={models} onUpdate={handleUpdate} />
      </div>

      <CreateModelDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} onCreated={handleCreate} />
    </div>
  )
}
