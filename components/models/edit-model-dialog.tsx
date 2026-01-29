"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { dataStore } from "@/lib/data-store"
import type { Model, PlanType } from "@/lib/types"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

interface EditModelDialogProps {
  model: Model | null
  onOpenChange: (open: boolean) => void
  onUpdated: () => void
}

export function EditModelDialog({ model, onOpenChange, onUpdated }: EditModelDialogProps) {
  const { user } = useAuth()
  const [name, setName] = useState("")
  const [planType, setPlanType] = useState<PlanType>("DIGITAL")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (model) {
      setName(model.name)
      setPlanType(model.planType)
    }
  }, [model])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !model) return

    setIsSubmitting(true)

    dataStore.updateModel(model.id, { name, planType })

    dataStore.addAuditLog({
      userId: user.id,
      userName: user.name,
      action: "MODEL_UPDATED",
      modelId: model.id,
      metadata: { name, planType },
    })

    toast.success("Model updated successfully")
    setIsSubmitting(false)
    onOpenChange(false)
    onUpdated()
  }

  return (
    <Dialog open={!!model} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Model</DialogTitle>
          <DialogDescription>Update model information.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Full Name</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="bg-input border-border"
            />
          </div>

          <div className="space-y-2">
            <Label>Internal ID</Label>
            <Input value={model?.internalId || ""} disabled className="bg-muted border-border font-mono" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-planType">Plan Type</Label>
            <Select value={planType} onValueChange={(v) => setPlanType(v as PlanType)}>
              <SelectTrigger className="bg-input border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PHYSICAL">Physical</SelectItem>
                <SelectItem value="DIGITAL">Digital</SelectItem>
                <SelectItem value="HYBRID">Hybrid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !name}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
