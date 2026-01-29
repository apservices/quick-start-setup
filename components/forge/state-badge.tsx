import { cn } from "@/lib/utils"
import type { ForgeState } from "@/lib/types"
import { ForgeStateMachine } from "@/lib/forge-state-machine"

interface StateBadgeProps {
  state: ForgeState
  size?: "sm" | "md" | "lg"
}

const stateColors: Record<ForgeState, string> = {
  CREATED: "bg-[var(--forge-created)]/20 text-[var(--forge-created)] border-[var(--forge-created)]/30",
  CAPTURED: "bg-[var(--forge-captured)]/20 text-[var(--forge-captured)] border-[var(--forge-captured)]/30",
  NORMALIZED: "bg-[var(--forge-normalized)]/20 text-[var(--forge-normalized)] border-[var(--forge-normalized)]/30",
  SEEDED: "bg-[var(--forge-seeded)]/20 text-[var(--forge-seeded)] border-[var(--forge-seeded)]/30",
  PARAMETRIZED:
    "bg-[var(--forge-parametrized)]/20 text-[var(--forge-parametrized)] border-[var(--forge-parametrized)]/30",
  VALIDATED: "bg-[var(--forge-validated)]/20 text-[var(--forge-validated)] border-[var(--forge-validated)]/30",
  CERTIFIED: "bg-[var(--forge-certified)]/20 text-[var(--forge-certified)] border-[var(--forge-certified)]/30",
}

export function StateBadge({ state, size = "md" }: StateBadgeProps) {
  const label = ForgeStateMachine.getStateLabel(state)

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full border",
        stateColors[state],
        size === "sm" && "px-2 py-0.5 text-xs",
        size === "md" && "px-2.5 py-1 text-xs",
        size === "lg" && "px-3 py-1.5 text-sm",
      )}
    >
      {label}
    </span>
  )
}
