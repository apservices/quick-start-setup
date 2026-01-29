import { type ForgeState, FORGE_STATES } from "./types"

// State machine for forge pipeline - enforces strict order
export class ForgeStateMachine {
  private currentState: ForgeState

  constructor(initialState: ForgeState = "CREATED") {
    this.currentState = initialState
  }

  getState(): ForgeState {
    return this.currentState
  }

  getStateIndex(): number {
    return FORGE_STATES.indexOf(this.currentState)
  }

  canAdvance(): boolean {
    const currentIndex = this.getStateIndex()
    return currentIndex < FORGE_STATES.length - 1
  }

  canRollback(): boolean {
    const currentIndex = this.getStateIndex()
    return currentIndex > 0
  }

  getNextState(): ForgeState | null {
    if (!this.canAdvance()) return null
    return FORGE_STATES[this.getStateIndex() + 1]
  }

  getPreviousState(): ForgeState | null {
    if (!this.canRollback()) return null
    return FORGE_STATES[this.getStateIndex() - 1]
  }

  // Validate if transition is allowed
  validateTransition(targetState: ForgeState): { valid: boolean; error?: string } {
    const targetIndex = FORGE_STATES.indexOf(targetState)
    const currentIndex = this.getStateIndex()

    if (targetIndex === -1) {
      return { valid: false, error: "Invalid target state" }
    }

    // Can only advance by 1 step or rollback to any previous state
    if (targetIndex === currentIndex + 1) {
      return { valid: true }
    }

    if (targetIndex < currentIndex) {
      return { valid: true } // Rollback allowed
    }

    if (targetIndex === currentIndex) {
      return { valid: false, error: "Already in this state" }
    }

    return { valid: false, error: "Cannot skip steps - must proceed sequentially" }
  }

  transition(targetState: ForgeState): { success: boolean; error?: string } {
    const validation = this.validateTransition(targetState)
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }

    // Block transitions from CERTIFIED state (read-only)
    if (this.currentState === "CERTIFIED") {
      return { success: false, error: "Certified forges are read-only" }
    }

    this.currentState = targetState
    return { success: true }
  }

  static getStateLabel(state: ForgeState): string {
    const labels: Record<ForgeState, string> = {
      CREATED: "Created",
      CAPTURED: "Captured",
      NORMALIZED: "Normalized",
      SEEDED: "Seeded",
      PARAMETRIZED: "Parametrized",
      VALIDATED: "Validated",
      CERTIFIED: "Certified",
    }
    return labels[state]
  }

  static getStateDescription(state: ForgeState): string {
    const descriptions: Record<ForgeState, string> = {
      CREATED: "Forge initialized, awaiting capture",
      CAPTURED: "All biometric data captured",
      NORMALIZED: "Data normalized and processed",
      SEEDED: "Dataset seed generated",
      PARAMETRIZED: "Parameters extracted",
      VALIDATED: "Validation tests passed",
      CERTIFIED: "Digital Twin certified and locked",
    }
    return descriptions[state]
  }
}
