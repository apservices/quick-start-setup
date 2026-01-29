"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Model } from "@/lib/types"
import { FileCheck, CheckCircle, XCircle, Calendar, AlertCircle } from "lucide-react"

interface CareerConsentsProps {
  model: Model
}

export function CareerConsents({ model }: CareerConsentsProps) {
  const consents = [
    {
      id: "biometric",
      label: "Biometric Data Processing",
      description: "Permission to capture and process biometric data for Digital Twin creation",
      required: true,
      given: model.consentGiven,
      date: model.consentDate,
    },
    {
      id: "visual",
      label: "Visual Asset Generation",
      description: "Permission to generate synthetic visual assets from your Digital Twin",
      required: true,
      given: model.consentGiven,
      date: model.consentDate,
    },
    {
      id: "commercial",
      label: "Commercial Usage",
      description: "Permission for licensed commercial use of generated assets",
      required: true,
      given: model.consentGiven,
      date: model.consentDate,
    },
    {
      id: "storage",
      label: "Data Storage",
      description: "Permission to securely store your biometric and generated data",
      required: true,
      given: model.consentGiven,
      date: model.consentDate,
    },
  ]

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <FileCheck className="w-5 h-5" />
          Consent Management
        </CardTitle>
        <CardDescription>Review and manage your consent agreements</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Status */}
        <div
          className={`flex items-center gap-3 p-4 rounded-lg ${model.consentGiven ? "bg-green-500/10 border border-green-500/20" : "bg-amber-500/10 border border-amber-500/20"}`}
        >
          {model.consentGiven ? (
            <>
              <CheckCircle className="w-5 h-5 text-green-400" />
              <div>
                <p className="text-sm font-medium text-foreground">All consents granted</p>
                <p className="text-xs text-muted-foreground">
                  Consent given on {model.consentDate?.toLocaleDateString()}
                </p>
              </div>
            </>
          ) : (
            <>
              <AlertCircle className="w-5 h-5 text-amber-400" />
              <div>
                <p className="text-sm font-medium text-foreground">Consent required</p>
                <p className="text-xs text-muted-foreground">Please review and provide consent to proceed</p>
              </div>
            </>
          )}
        </div>

        {/* Consent Items */}
        <div className="space-y-3">
          {consents.map((consent) => (
            <div
              key={consent.id}
              className="flex items-start justify-between p-4 rounded-lg bg-muted/30 border border-border"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{consent.label}</span>
                  {consent.required && (
                    <Badge variant="outline" className="text-xs">
                      Required
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">{consent.description}</p>
                {consent.date && (
                  <div className="flex items-center gap-1 mt-2">
                    <Calendar className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Granted on {new Date(consent.date).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
              <div className="ml-4">
                {consent.given ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4 border-t border-border">
          <Button variant="outline" size="sm">
            Download Agreement
          </Button>
          <Button variant="ghost" size="sm" className="text-destructive">
            Request Data Deletion
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
