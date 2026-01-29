"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/dashboard/header"
import { ModelTable } from "@/components/models/model-table"
import { CreateModelDialog } from "@/components/models/create-model-dialog"
import { dataStore } from "@/lib/data-store"
import type { Model } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export default function ModelsPage() {
  const [models, setModels] = useState<Model[]>([])
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  useEffect(() => {
    if (dataStore) {
      setModels(dataStore.getModels())
    }
  }, [])

  const handleCreate = (model: Model) => {
    setModels(dataStore.getModels())
    setIsCreateOpen(false)
  }

  const handleUpdate = () => {
    setModels(dataStore.getModels())
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
