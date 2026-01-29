import type { UserRole, ForgeState } from "./types"

// Permission definitions
export const PERMISSIONS = {
  // Model permissions
  "models:read": ["ADMIN", "OPERATOR", "MODEL"],
  "models:create": ["ADMIN", "OPERATOR"],
  "models:update": ["ADMIN", "OPERATOR"],
  "models:delete": ["ADMIN"],
  "models:archive": ["ADMIN", "OPERATOR"],

  // Forge permissions
  "forges:read": ["ADMIN", "OPERATOR", "MODEL", "CLIENT"],
  "forges:create": ["ADMIN", "OPERATOR"],
  "forges:transition": ["ADMIN", "OPERATOR"],
  "forges:rollback": ["ADMIN", "OPERATOR"],
  "forges:delete": ["ADMIN"],

  // Capture permissions
  "captures:read": ["ADMIN", "OPERATOR"],
  "captures:upload": ["ADMIN", "OPERATOR"],

  "capture_viewer:read": ["ADMIN", "OPERATOR", "MODEL"],

  // Validation permissions
  "validation:execute": ["ADMIN", "OPERATOR"],

  // Certification permissions
  "certification:execute": ["ADMIN", "OPERATOR"],
  "certification:revoke": ["ADMIN"],

  "vtp:generate": ["ADMIN", "OPERATOR"],
  "vtp:read": ["ADMIN", "OPERATOR", "MODEL"],

  "vtg:generate": ["ADMIN", "OPERATOR"],
  "vtg:read": ["ADMIN", "OPERATOR"],

  "assets:read": ["ADMIN", "OPERATOR", "MODEL", "CLIENT"],
  "assets:download": ["ADMIN", "OPERATOR", "CLIENT"],

  "licenses:read": ["ADMIN", "OPERATOR", "MODEL", "CLIENT"],
  "licenses:create": ["ADMIN", "OPERATOR"],
  "licenses:revoke": ["ADMIN"],

  "career:read": ["MODEL"],
  "career:consents": ["MODEL"],

  // Audit permissions
  "audit:read": ["ADMIN"],
  "audit:export": ["ADMIN"],

  // System permissions
  "system:read": ["ADMIN"],
  "system:configure": ["ADMIN"],
} as const

export type Permission = keyof typeof PERMISSIONS

// Check if a role has a specific permission
export function hasPermission(role: UserRole | undefined, permission: Permission): boolean {
  if (!role) return false
  const allowedRoles = PERMISSIONS[permission]
  return allowedRoles.includes(role)
}

export function canAccessDigitalTwin(
  role: UserRole | undefined,
  userLinkedModelId: string | undefined,
  userLinkedClientId: string | undefined,
  targetDigitalTwinId: string,
  modelIdForTwin: string,
  clientIdWithLicense?: string,
): boolean {
  if (!role) return false

  // Admin and Operator have full access
  if (role === "ADMIN" || role === "OPERATOR") return true

  // MODEL can only access their own data
  if (role === "MODEL") {
    return userLinkedModelId === modelIdForTwin
  }

  // CLIENT can only access licensed assets
  if (role === "CLIENT") {
    return userLinkedClientId === clientIdWithLicense
  }

  return false
}

// Check if user can transition to a specific forge state
export function canTransitionToState(role: UserRole | undefined, fromState: ForgeState, toState: ForgeState): boolean {
  if (!role) return false

  // Only ADMIN and OPERATOR can transition states
  if (!["ADMIN", "OPERATOR"].includes(role)) return false

  // Certified forges cannot be modified
  if (fromState === "CERTIFIED") return false

  // Certification requires explicit permission
  if (toState === "CERTIFIED") {
    return hasPermission(role, "certification:execute")
  }

  return hasPermission(role, "forges:transition")
}

// Check if forge can be rolled back
export function canRollbackForge(role: UserRole | undefined, currentState: ForgeState): boolean {
  if (!role) return false

  // Cannot rollback certified forges
  if (currentState === "CERTIFIED") return false

  // Cannot rollback from CREATED (nothing to rollback to)
  if (currentState === "CREATED") return false

  return hasPermission(role, "forges:rollback")
}

// Check if user can access a specific route
export function canAccessRoute(role: UserRole | undefined, route: string): boolean {
  if (!role) return false

  // Admin can access everything
  if (role === "ADMIN") return true

  // Define route permissions - comprehensive list
  const routePermissions: Record<string, Permission[]> = {
    // Core dashboard
    "/dashboard": ["models:read"],

    // Pipeline routes
    "/dashboard/models": ["models:read"],
    "/dashboard/forges": ["forges:read"],
    "/dashboard/capture": ["captures:upload"],
    "/dashboard/validation": ["validation:execute"],
    "/dashboard/certification": ["certification:execute"],
    "/dashboard/registry": ["forges:read"],

    // Visual Twin Platform routes (Phase 2)
    "/dashboard/capture-viewer": ["capture_viewer:read"],
    "/dashboard/visual-preview": ["vtp:read"],
    "/dashboard/visual-generator": ["vtg:read"],
    "/dashboard/assets": ["assets:read"],
    "/dashboard/licenses": ["licenses:read"],

    // Model Career route
    "/dashboard/career": ["career:read"],

    // Administration routes
    "/dashboard/audit": ["audit:read"],
    "/dashboard/system": ["system:read"],
  }

  // Check for exact match first
  const requiredPermissions = routePermissions[route]
  if (requiredPermissions) {
    return requiredPermissions.some((permission) => hasPermission(role, permission))
  }

  // Check for dynamic routes (e.g., /dashboard/forges/[id])
  const dynamicRoutePatterns: Array<{ pattern: RegExp; permissions: Permission[] }> = [
    { pattern: /^\/dashboard\/forges\/[^/]+$/, permissions: ["forges:read"] },
    { pattern: /^\/dashboard\/models\/[^/]+$/, permissions: ["models:read"] },
  ]

  for (const { pattern, permissions } of dynamicRoutePatterns) {
    if (pattern.test(route)) {
      return permissions.some((permission) => hasPermission(role, permission))
    }
  }

  // Allow if no specific permissions defined (for unknown routes)
  return true
}

// Get allowed actions for a forge based on role and state
export function getForgeActions(
  role: UserRole | undefined,
  forgeState: ForgeState,
): {
  canAdvance: boolean
  canRollback: boolean
  canDelete: boolean
  canView: boolean
} {
  return {
    canAdvance: canTransitionToState(role, forgeState, getNextState(forgeState)),
    canRollback: canRollbackForge(role, forgeState),
    canDelete: hasPermission(role, "forges:delete") && forgeState !== "CERTIFIED",
    canView: hasPermission(role, "forges:read"),
  }
}

// Helper to get next state
function getNextState(currentState: ForgeState): ForgeState {
  const states: ForgeState[] = ["CREATED", "CAPTURED", "NORMALIZED", "SEEDED", "PARAMETRIZED", "VALIDATED", "CERTIFIED"]
  const currentIndex = states.indexOf(currentState)
  return states[currentIndex + 1] || currentState
}

export function canDownloadAsset(
  role: UserRole | undefined,
  assetType: "PREVIEW" | "LICENSED",
  licenseStatus?: "ACTIVE" | "EXPIRED" | "REVOKED",
): boolean {
  if (!role) return false

  // Previews cannot be downloaded
  if (assetType === "PREVIEW") return false

  // Admin and Operator can always download licensed assets
  if (role === "ADMIN" || role === "OPERATOR") return true

  // Clients can only download if license is active
  if (role === "CLIENT") {
    return assetType === "LICENSED" && licenseStatus === "ACTIVE"
  }

  return false
}

export function canUseGuidedCapture(role: UserRole | undefined): boolean {
  if (!role) return false
  return ["ADMIN", "OPERATOR"].includes(role)
}

export function canUseManualUpload(role: UserRole | undefined): boolean {
  if (!role) return false
  return ["ADMIN", "OPERATOR"].includes(role)
}
