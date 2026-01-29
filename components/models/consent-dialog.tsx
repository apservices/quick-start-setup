"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import type { Model } from "@/lib/types"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { AlertTriangle, FileCheck } from "lucide-react"
import { toast } from "sonner"

interface ConsentDialogProps {
  model: Model | null
  onOpenChange: (open: boolean) => void
  onConsented: () => void
}

export function ConsentDialog({ model, onOpenChange, onConsented }: ConsentDialogProps) {
  const { user } = useAuth()
  const [acknowledged, setAcknowledged] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleConsent = async () => {
    if (!user || !model || !acknowledged) return

    setIsSubmitting(true)

    const { error } = await supabase.from("models").update({ status: "active" }).eq("id", model.id)
    if (error) {
      toast.error("Failed to record consent", { description: error.message })
      setIsSubmitting(false)
      return
    }

    await supabase.from("audit_logs").insert({
      actor_id: user.id,
      action: "CONSENT_GIVEN",
      target_table: "models",
      target_id: model.id,
    })

    toast.success("Consent recorded successfully", {
      description: "Model is now active and ready for forging.",
    })

    setAcknowledged(false)
    setIsSubmitting(false)
    onOpenChange(false)
    onConsented()
  }

  return (
    <Dialog
      open={!!model}
      onOpenChange={(open) => {
        if (!open) setAcknowledged(false)
        onOpenChange(open)
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-primary" />
            Record Consent
          </DialogTitle>
          <DialogDescription>
            Consent is mandatory before any forge operation can begin for {model?.name}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-400">Important Notice</p>
                <p className="text-muted-foreground mt-1">
                  By recording consent, you confirm that the individual has provided explicit, informed consent for
                  biometric data collection and processing under the terms of their agreement.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="acknowledge"
              checked={acknowledged}
              onCheckedChange={(checked) => setAcknowledged(checked === true)}
            />
            <Label htmlFor="acknowledge" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
              I confirm that valid consent has been obtained from{" "}
              <strong className="text-foreground">{model?.name}</strong> and all required documentation is on file.
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConsent} disabled={!acknowledged || isSubmitting}>
            {isSubmitting ? "Recording..." : "Record Consent"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
