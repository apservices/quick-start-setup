"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { phase2Store } from "@/lib/phase2-store"
import { useAuth } from "@/lib/auth-context"
import type { PreviewType } from "@/lib/types"
import { Sparkles, Loader2, User, ImagePlus } from "lucide-react"
import { toast } from "sonner"

interface PreviewGeneratorProps {
  digitalTwinId: string
  modelName: string
  onGenerated: () => void
}

const previewTypes: { value: PreviewType; label: string; description: string }[] = [
  {
    value: "NEUTRAL_PORTRAIT",
    label: "Neutral Portrait",
    description: "Clean, professional headshot style",
  },
  {
    value: "LIGHT_LIFESTYLE",
    label: "Light Lifestyle",
    description: "Casual, natural setting imagery",
  },
  {
    value: "SIMPLE_EDITORIAL",
    label: "Simple Editorial",
    description: "Magazine-style editorial preview",
  },
]

export function PreviewGenerator({
  digitalTwinId,
  modelName,
  onGenerated,
}: PreviewGeneratorProps) {
  const { user } = useAuth()
  const [selectedType, setSelectedType] =
    useState<PreviewType>("NEUTRAL_PORTRAIT")
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = async () => {
    if (!user || !phase2Store) {
      toast.error("Authentication required", {
        description: "You must be logged in to generate previews.",
      })
      return
    }

    setIsGenerating(true)

    try {
      // Simulate generation time (Preview Atlas async behavior)
      await new Promise((resolve) => setTimeout(resolve, 2000))

      phase2Store.generatePreview(
        digitalTwinId,
        selectedType,
        user.id,
      )

      toast.success("Preview generated", {
        description: "The preview will expire in 7 days.",
      })

      onGenerated()
    } catch (error) {
      toast.error("Failed to generate preview", {
        description:
          error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <ImagePlus className="w-5 h-5" />
          Generate Preview
        </CardTitle>
        <CardDescription>
          Create a demonstrative preview for commercial pitching
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {modelName}
            </p>
            <p className="text-xs text-muted-foreground font-mono">
              {digitalTwinId}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Preview Type
          </label>

          <Select
            value={selectedType}
            onValueChange={(v) =>
              setSelectedType(v as PreviewType)
            }
          >
            <SelectTrigger className="w-full bg-input border-border">
              <SelectValue placeholder="Select preview type..." />
            </SelectTrigger>

            <SelectContent>
              {previewTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <div className="flex flex-col">
                    <span>{type.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {type.description}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="p-3 rounded-lg bg-muted/30 border border-border">
          <p className="text-xs text-muted-foreground">
            <strong>Allowed preview types only:</strong>{" "}
            Neutral portrait, Light lifestyle, Simple editorial.
            <br />
            <strong>Forbidden:</strong> Product usage, Campaign scenes,
            Custom prompts, Batch campaigns.
          </p>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating Preview...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Preview
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
