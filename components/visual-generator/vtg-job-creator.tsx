"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { phase2Store } from "@/lib/phase2-store"
import { useAuth } from "@/lib/auth-context"
import type { VTGMode, VTGCategory, PlanType } from "@/lib/types"
import { Wand2, Loader2, AlertTriangle, Lock } from "lucide-react"
import { toast } from "sonner"

interface VTGJobCreatorProps {
  digitalTwinId: string
  modelName: string
  planType: PlanType
  hasActiveLicense: boolean
  onJobCreated: () => void
}

const previewCategories: { value: VTGCategory; label: string; description: string }[] = [
  { value: "NEUTRAL_PORTRAIT", label: "Neutral Portrait", description: "Clean, professional headshot" },
  { value: "LIGHT_LIFESTYLE", label: "Light Lifestyle", description: "Casual, natural setting" },
  { value: "SIMPLE_EDITORIAL", label: "Simple Editorial", description: "Magazine-style editorial" },
]

const licensedCategories: { value: VTGCategory; label: string; description: string }[] = [
  { value: "NEUTRAL_PORTRAIT", label: "Neutral Portrait", description: "Clean, professional headshot" },
  { value: "LIGHT_LIFESTYLE", label: "Light Lifestyle", description: "Casual, natural setting" },
  { value: "SIMPLE_EDITORIAL", label: "Simple Editorial", description: "Magazine-style editorial" },
  { value: "PRODUCT_USAGE", label: "Product Usage", description: "Product interaction visuals" },
  { value: "CAMPAIGN", label: "Campaign", description: "Full campaign imagery" },
  { value: "CUSTOM", label: "Custom", description: "Custom prompt generation" },
]

const priorityLabels: Record<PlanType, { label: string; priority: number }> = {
  ENTERPRISE: { label: "High Priority", priority: 3 },
  HYBRID: { label: "Medium Priority", priority: 2 },
  BASIC: { label: "Standard Priority", priority: 1 },
}

export function VTGJobCreator({
  digitalTwinId,
  modelName,
  planType,
  hasActiveLicense,
  onJobCreated,
}: VTGJobCreatorProps) {
  const { user } = useAuth()
  const [mode, setMode] = useState<VTGMode>("PREVIEW")
  const [category, setCategory] = useState<VTGCategory>("NEUTRAL_PORTRAIT")
  const [isCreating, setIsCreating] = useState(false)

  const availableCategories = mode === "PREVIEW" ? previewCategories : licensedCategories
  const priorityInfo = priorityLabels[planType]

  const handleCreate = async () => {
    if (!user || !phase2Store) return

    // Validate licensed mode has license
    if (mode === "LICENSED" && !hasActiveLicense) {
      toast.error("License Required", {
        description: "An active license is required for licensed mode generation.",
      })
      return
    }

    setIsCreating(true)
    try {
      phase2Store.createVTGJob(digitalTwinId, mode, category, user.id, planType)

      toast.success("Job created", {
        description: `${mode} job queued with ${priorityInfo.label.toLowerCase()}.`,
      })

      onJobCreated()
    } catch (error) {
      toast.error("Failed to create job", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <Wand2 className="w-5 h-5" />
          Create Generation Job
        </CardTitle>
        <CardDescription>Configure and queue a visual generation job</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Model Info */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div>
            <p className="text-sm font-medium text-foreground">{modelName}</p>
            <p className="text-xs text-muted-foreground font-mono">{digitalTwinId}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{planType}</Badge>
            <Badge className="bg-primary/20 text-primary">{priorityInfo.label}</Badge>
          </div>
        </div>

        {/* Mode Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-foreground">Generation Mode</Label>
          <RadioGroup value={mode} onValueChange={(v) => setMode(v as VTGMode)} className="grid grid-cols-2 gap-4">
            <div>
              <RadioGroupItem value="PREVIEW" id="preview" className="peer sr-only" />
              <Label
                htmlFor="preview"
                className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-muted/30 p-4 hover:bg-muted/50 peer-data-[state=checked]:border-amber-500 peer-data-[state=checked]:bg-amber-500/10 cursor-pointer"
              >
                <Wand2 className="w-6 h-6 mb-2 text-amber-400" />
                <span className="text-sm font-medium text-foreground">Preview Mode</span>
                <span className="text-xs text-muted-foreground text-center mt-1">
                  Ephemeral, watermarked, no persistence
                </span>
              </Label>
            </div>
            <div className={!hasActiveLicense ? "opacity-50" : ""}>
              <RadioGroupItem value="LICENSED" id="licensed" className="peer sr-only" disabled={!hasActiveLicense} />
              <Label
                htmlFor="licensed"
                className={`flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-muted/30 p-4 hover:bg-muted/50 peer-data-[state=checked]:border-green-500 peer-data-[state=checked]:bg-green-500/10 ${hasActiveLicense ? "cursor-pointer" : "cursor-not-allowed"}`}
              >
                {!hasActiveLicense && <Lock className="w-4 h-4 absolute top-2 right-2 text-muted-foreground" />}
                <Lock className="w-6 h-6 mb-2 text-green-400" />
                <span className="text-sm font-medium text-foreground">Licensed Mode</span>
                <span className="text-xs text-muted-foreground text-center mt-1">
                  Commercial-grade, hashed, auditable
                </span>
              </Label>
            </div>
          </RadioGroup>
          {!hasActiveLicense && (
            <p className="text-xs text-amber-400 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Active license required for licensed mode
            </p>
          )}
        </div>

        {/* Category Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-foreground">Category</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as VTGCategory)}>
            <SelectTrigger className="w-full bg-input border-border">
              <SelectValue placeholder="Select category..." />
            </SelectTrigger>
            <SelectContent>
              {availableCategories.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  <div className="flex flex-col">
                    <span>{cat.label}</span>
                    <span className="text-xs text-muted-foreground">{cat.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Mode-specific info */}
        {mode === "PREVIEW" ? (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm">
            <p className="text-muted-foreground">
              <strong className="text-amber-400">Preview Mode:</strong> Output will be watermarked and expire in 7 days.
              Not stored in Asset Library. For demonstration purposes only.
            </p>
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm">
            <p className="text-muted-foreground">
              <strong className="text-green-400">Licensed Mode:</strong> Commercial-grade output with unique hash.
              Certificate generated. Stored in Asset Library and bound to active license.
            </p>
          </div>
        )}

        <Button
          onClick={handleCreate}
          disabled={isCreating || (mode === "LICENSED" && !hasActiveLicense)}
          className="w-full"
        >
          {isCreating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating Job...
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4 mr-2" />
              Create {mode === "PREVIEW" ? "Preview" : "Licensed"} Job
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
