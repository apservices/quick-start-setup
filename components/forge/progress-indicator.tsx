import { cn } from "@/lib/utils"
import { type ForgeState, FORGE_STATES } from "@/lib/types"
import { ForgeStateMachine } from "@/lib/forge-state-machine"
import { Check } from "lucide-react"

interface ProgressIndicatorProps {
  currentState: ForgeState
  compact?: boolean
}

const stateColors: Record<ForgeState, string> = {
  CREATED: "var(--forge-created)",
  CAPTURED: "var(--forge-captured)",
  NORMALIZED: "var(--forge-normalized)",
  SEEDED: "var(--forge-seeded)",
  PARAMETRIZED: "var(--forge-parametrized)",
  VALIDATED: "var(--forge-validated)",
  CERTIFIED: "var(--forge-certified)",
}

export function ProgressIndicator({ currentState, compact = false }: ProgressIndicatorProps) {
  const currentIndex = FORGE_STATES.indexOf(currentState)

  if (compact) {
    const progress = ((currentIndex + 1) / FORGE_STATES.length) * 100
    return (
      <div className="w-full">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-muted-foreground">Progress</span>
          <span className="text-foreground font-medium">
            {currentIndex + 1}/{FORGE_STATES.length}
          </span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              backgroundColor: stateColors[currentState],
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {FORGE_STATES.map((state, index) => {
          const isComplete = index < currentIndex
          const isCurrent = index === currentIndex
          const isPending = index > currentIndex

          return (
            <div key={state} className="flex-1 flex flex-col items-center">
              <div className="relative flex items-center w-full">
                {index > 0 && (
                  <div
                    className={cn(
                      "flex-1 h-0.5 transition-colors",
                      isComplete || isCurrent ? "bg-primary" : "bg-muted",
                    )}
                  />
                )}
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all border-2",
                    isComplete && "bg-primary border-primary text-primary-foreground",
                    isCurrent && "border-primary text-primary bg-primary/10",
                    isPending && "border-muted text-muted-foreground bg-background",
                  )}
                  style={isCurrent ? { borderColor: stateColors[state] } : undefined}
                >
                  {isComplete ? <Check className="w-4 h-4" /> : index + 1}
                </div>
                {index < FORGE_STATES.length - 1 && (
                  <div className={cn("flex-1 h-0.5 transition-colors", isComplete ? "bg-primary" : "bg-muted")} />
                )}
              </div>
              <span
                className={cn(
                  "mt-2 text-xs transition-colors text-center",
                  isCurrent && "text-foreground font-medium",
                  !isCurrent && "text-muted-foreground",
                )}
              >
                {ForgeStateMachine.getStateLabel(state)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
