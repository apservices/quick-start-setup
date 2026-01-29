"use client"

import type React from "react"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import type { Model, PlanType } from "@/lib/types"
import { supabase } from "@/src/integrations/supabase/client"
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
  const [email, setEmail] = useState("")
  const [internalId, setInternalId] = useState("")
  const [planType, setPlanType] = useState<PlanType>("DIGITAL")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsSubmitting(true)

    const { data, error } = await supabase
      .from("models")
      .insert({ full_name: name, email, status: "pending", user_id: null })
      .select("id, full_name, status, created_at, user_id")
      .maybeSingle()

    if (error || !data) {
      toast.error("Failed to create model", { description: error?.message })
      setIsSubmitting(false)
      return
    }

    // Best-effort audit log
    await supabase.from("audit_logs").insert({
      actor_id: user.id,
      action: "MODEL_CREATED",
      target_table: "models",
      target_id: data.id,
    })

    const uiModel: Model = {
      id: data.id,
      name: data.full_name,
      internalId: internalId || data.id,
      status: "PENDING_CONSENT",
      planType,
      consentGiven: false,
      createdAt: new Date(data.created_at || Date.now()),
      updatedAt: new Date(data.created_at || Date.now()),
      createdBy: user.id,
    }

    toast.success("Model created successfully")

    setName("")
    setEmail("")
    setInternalId("")
    setPlanType("DIGITAL")
    setIsSubmitting(false)
    onCreated(uiModel)
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
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="model@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-input border-border"
              autoComplete="email"
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
            <Button type="submit" disabled={isSubmitting || !name || !email}>
              {isSubmitting ? "Creating..." : "Create Model"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
