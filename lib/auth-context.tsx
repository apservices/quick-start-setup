"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import type { User, UserRole, AuditLog } from "./types"
import { validateEmail, validatePassword, sanitizeEmail } from "./validation"
import { systemLogger } from "./system-logger"

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  hasPermission: (requiredRole: UserRole) => boolean
  hasScope: (scope: string) => boolean
  validateSession: () => boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

const DEMO_USERS: Record<string, { password: string; user: User }> = {
  "admin@atlas.io": {
    password: "admin123",
    user: {
      id: "usr_admin_001",
      email: "admin@atlas.io",
      name: "System Admin",
      role: "ADMIN",
      createdAt: new Date("2024-01-01"),
      lastLoginAt: new Date(),
    },
  },
  "operator@atlas.io": {
    password: "operator123",
    user: {
      id: "usr_op_001",
      email: "operator@atlas.io",
      name: "Pipeline Operator",
      role: "OPERATOR",
      createdAt: new Date("2024-03-15"),
      lastLoginAt: new Date(),
    },
  },
  "model@atlas.io": {
    password: "model123",
    user: {
      id: "usr_model_001",
      email: "model@atlas.io",
      name: "John Mitchell",
      role: "MODEL",
      linkedModelId: "mdl_001",
      createdAt: new Date("2024-06-01"),
      lastLoginAt: new Date(),
    },
  },
  "client@atlas.io": {
    password: "client123",
    user: {
      id: "usr_client_001",
      email: "client@atlas.io",
      name: "Brand Client",
      role: "CLIENT",
      linkedClientId: "client_001",
      createdAt: new Date("2024-09-01"),
      lastLoginAt: new Date(),
    },
  },
}

const ROLE_SCOPE_MAP: Record<UserRole, string[]> = {
  ADMIN: ["*"],
  OPERATOR: [
    "models:read",
    "models:create",
    "models:update",
    "forges:read",
    "forges:create",
    "forges:transition",
    "captures:read",
    "captures:upload",
    "validation:execute",
    "certification:execute",
    "capture_viewer:read",
    "vtp:generate",
    "vtp:read",
    "vtg:generate",
    "vtg:read",
    "assets:read",
    "licenses:read",
    "licenses:create",
  ],
  MODEL: [
    "models:read:self",
    "forges:read:self",
    "certificates:read:self",
    "capture_viewer:read:self",
    "vtp:read:self",
    "assets:read:self",
    "career:read",
    "career:consents",
  ],
  CLIENT: ["certificates:read", "assets:read:licensed", "assets:download:licensed", "licenses:read:self"],
}

// Session timeout in milliseconds (30 minutes)
const SESSION_TIMEOUT = 30 * 60 * 1000

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sessionExpiry, setSessionExpiry] = useState<number | null>(null)

  const validateSession = useCallback((): boolean => {
    if (typeof window === "undefined") return false

    const stored = localStorage.getItem("atlas_session")
    if (!stored) return false

    try {
      const parsed = JSON.parse(stored)
      const expiry = parsed.expiry

      if (!expiry || Date.now() > expiry) {
        localStorage.removeItem("atlas_session")
        setUser(null)
        return false
      }

      return true
    } catch {
      localStorage.removeItem("atlas_session")
      return false
    }
  }, [])

  useEffect(() => {
    const stored = localStorage.getItem("atlas_session")
    if (stored) {
      try {
        const parsed = JSON.parse(stored)

        if (parsed.expiry && Date.now() > parsed.expiry) {
          localStorage.removeItem("atlas_session")
          setIsLoading(false)
          return
        }

        setUser(parsed.user)
        setSessionExpiry(parsed.expiry)
      } catch {
        localStorage.removeItem("atlas_session")
      }
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    if (!sessionExpiry) return

    const checkExpiry = setInterval(() => {
      if (Date.now() > sessionExpiry) {
        logout()
      }
    }, 60000)

    return () => clearInterval(checkExpiry)
  }, [sessionExpiry])

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true)

    const emailValidation = validateEmail(email)
    if (!emailValidation.valid) {
      setIsLoading(false)
      return { success: false, error: emailValidation.error }
    }

    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      setIsLoading(false)
      return { success: false, error: passwordValidation.error }
    }

    const sanitizedEmail = sanitizeEmail(email)

    await new Promise((resolve) => setTimeout(resolve, 500))

    const userRecord = DEMO_USERS[sanitizedEmail]

    if (!userRecord || userRecord.password !== password) {
      systemLogger?.warn("Failed login attempt", "Auth", { email: sanitizedEmail })
      setIsLoading(false)
      return { success: false, error: "Invalid credentials" }
    }

    const loggedInUser = {
      ...userRecord.user,
      lastLoginAt: new Date(),
    }

    const expiry = Date.now() + SESSION_TIMEOUT
    setUser(loggedInUser)
    setSessionExpiry(expiry)

    localStorage.setItem(
      "atlas_session",
      JSON.stringify({
        user: loggedInUser,
        token: `jwt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        expiry,
      }),
    )

    const log: AuditLog = {
      id: `log_${Date.now()}`,
      userId: loggedInUser.id,
      userName: loggedInUser.name,
      action: "USER_LOGIN",
      timestamp: new Date(),
    }
    const logs = JSON.parse(localStorage.getItem("atlas_audit_logs") || "[]")
    logs.push(log)
    localStorage.setItem("atlas_audit_logs", JSON.stringify(logs))

    systemLogger?.info("User logged in", "Auth", { userId: loggedInUser.id })
    setIsLoading(false)
    return { success: true }
  }, [])

  const logout = useCallback(() => {
    if (user) {
      const log: AuditLog = {
        id: `log_${Date.now()}`,
        userId: user.id,
        userName: user.name,
        action: "USER_LOGOUT",
        timestamp: new Date(),
      }
      const logs = JSON.parse(localStorage.getItem("atlas_audit_logs") || "[]")
      logs.push(log)
      localStorage.setItem("atlas_audit_logs", JSON.stringify(logs))

      systemLogger?.info("User logged out", "Auth", { userId: user.id })
    }

    setUser(null)
    setSessionExpiry(null)
    localStorage.removeItem("atlas_session")
  }, [user])

  const hasPermission = useCallback(
    (requiredRole: UserRole) => {
      if (!user) return false
      if (user.role === "ADMIN") return true
      return user.role === requiredRole
    },
    [user],
  )

  const hasScope = useCallback(
    (scope: string) => {
      if (!user) return false
      const scopes = ROLE_SCOPE_MAP[user.role]
      if (scopes.includes("*")) return true
      return scopes.some((s) => {
        if (s === scope) return true
        const pattern = s.replace(/:\*$/, "")
        return scope.startsWith(pattern)
      })
    },
    [user],
  )

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, hasPermission, hasScope, validateSession }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}
