"use client"

import type React from "react"

import { useState } from "react"
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

interface CreateModelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (model: Model) => void
}

export function CreateModelDialog({ open, onOpenChange, onCreated }: CreateModelDialogProps) {
  const { user } = useAuth()
  const [name, setName] = useState("")
  const [internalId, setInternalId] = useState("")
  const [planType, setPlanType] = useState<PlanType>("DIGITAL")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsSubmitting(true)

    // Generate internal ID if not provided
    const finalInternalId = internalId || `INT-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`

    const model = dataStore.createModel({
      name,
      internalId: finalInternalId,
      status: "PENDING_CONSENT",
      planType,
      consentGiven: false,
      createdBy: user.id,
    })

    dataStore.addAuditLog({
      userId: user.id,
      userName: user.name,
      action: "MODEL_CREATED",
      modelId: model.id,
    })

    toast.success("Model created successfully", {
      description: `Internal ID: ${model.internalId}`,
    })

    setName("")
    setInternalId("")
    setPlanType("DIGITAL")
    setIsSubmitting(false)
    onCreated(model)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Model</DialogTitle>
          <DialogDescription>Add a new individual to the forge pipeline.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="bg-input border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="internalId">Internal ID (Optional)</Label>
            <Input
              id="internalId"
              placeholder="Auto-generated if empty"
              value={internalId}
              onChange={(e) => setInternalId(e.target.value)}
              className="bg-input border-border font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="planType">Plan Type</Label>
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
            <p className="text-xs text-muted-foreground">
              Physical: In-person capture | Digital: Remote capture | Hybrid: Both methods
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !name}>
              {isSubmitting ? "Creating..." : "Create Model"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
