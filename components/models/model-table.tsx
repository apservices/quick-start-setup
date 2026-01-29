"use client"

import { useState } from "react"
import Link from "next/link"
import type { Model } from "@/lib/types"
import { dataStore } from "@/lib/data-store"
import { useAuth } from "@/lib/auth-context"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { EditModelDialog } from "./edit-model-dialog"
import { ConsentDialog } from "./consent-dialog"
import { MoreHorizontal, Eye, Edit, FileCheck, Archive, Workflow } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

interface ModelTableProps {
  models: Model[]
  onUpdate: () => void
}

const statusColors = {
  PENDING_CONSENT: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  ACTIVE: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  ARCHIVED: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
}

const planColors = {
  PHYSICAL: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  DIGITAL: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  HYBRID: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
}

export function ModelTable({ models, onUpdate }: ModelTableProps) {
  const { user } = useAuth()
  const [editModel, setEditModel] = useState<Model | null>(null)
  const [consentModel, setConsentModel] = useState<Model | null>(null)
  const [archiveModel, setArchiveModel] = useState<Model | null>(null)

  const handleArchive = () => {
    if (!archiveModel || !user) return

    dataStore.updateModel(archiveModel.id, { status: "ARCHIVED" })
    dataStore.addAuditLog({
      userId: user.id,
      userName: user.name,
      action: "MODEL_ARCHIVED",
      modelId: archiveModel.id,
    })
    toast.success("Model archived successfully")
    setArchiveModel(null)
    onUpdate()
  }

  const handleStartForge = (model: Model) => {
    if (!user) return

    const forge = dataStore.createForge(model.id, user.id)
    if (forge) {
      dataStore.addAuditLog({
        userId: user.id,
        userName: user.name,
        action: "FORGE_CREATED",
        modelId: model.id,
        forgeId: forge.id,
      })
      toast.success("New forge created", {
        description: `Forge ID: ${forge.id}`,
      })
      onUpdate()
    }
  }

  if (models.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <Workflow className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-1">No models yet</h3>
        <p className="text-sm text-muted-foreground">Create your first model to begin the forge pipeline.</p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground">Name</TableHead>
              <TableHead className="text-muted-foreground">Internal ID</TableHead>
              <TableHead className="text-muted-foreground">Status</TableHead>
              <TableHead className="text-muted-foreground">Plan Type</TableHead>
              <TableHead className="text-muted-foreground">Created</TableHead>
              <TableHead className="text-muted-foreground w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {models.map((model) => (
              <TableRow key={model.id} className="border-border">
                <TableCell className="font-medium text-foreground">{model.name}</TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground">{model.internalId}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusColors[model.status]}>
                    {model.status.replace("_", " ")}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={planColors[model.planType]}>
                    {model.planType}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{format(model.createdAt, "MMM d, yyyy")}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-muted-foreground">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/models/${model.id}`}>
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setEditModel(model)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      {!model.consentGiven && (
                        <DropdownMenuItem onClick={() => setConsentModel(model)}>
                          <FileCheck className="w-4 h-4 mr-2" />
                          Record Consent
                        </DropdownMenuItem>
                      )}
                      {model.consentGiven && model.status === "ACTIVE" && (
                        <DropdownMenuItem onClick={() => handleStartForge(model)}>
                          <Workflow className="w-4 h-4 mr-2" />
                          Start Forge
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setArchiveModel(model)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Archive className="w-4 h-4 mr-2" />
                        Archive
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <EditModelDialog model={editModel} onOpenChange={(open) => !open && setEditModel(null)} onUpdated={onUpdate} />

      <ConsentDialog
        model={consentModel}
        onOpenChange={(open) => !open && setConsentModel(null)}
        onConsented={onUpdate}
      />

      <AlertDialog open={!!archiveModel} onOpenChange={(open) => !open && setArchiveModel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Model</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive <strong>{archiveModel?.name}</strong>? This will prevent any new forges
              from being created for this model.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive}>Archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
