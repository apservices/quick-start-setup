"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import type { Session, User as SupabaseUser } from "@supabase/supabase-js"
import type { User, UserRole } from "./types"
import { validateEmail, validatePassword, sanitizeEmail } from "./validation"
import { systemLogger } from "./system-logger"
import { supabase } from "@/src/integrations/supabase/client"

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
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sessionExpiry, setSessionExpiry] = useState<number | null>(null)

  const mapDbRoleToAppRole = useCallback((role: string | null | undefined): UserRole => {
    switch ((role || "").toLowerCase()) {
      case "admin":
        return "ADMIN"
      case "operator":
        return "OPERATOR"
      case "client":
        return "CLIENT"
      case "model":
      default:
        return "MODEL"
    }
  }, [])

  const ensureDefaultRole = useCallback(async (userId: string) => {
    // Best-effort: assign default 'model' role if the user has no roles.
    const { data: existing, error: readError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .limit(1)

    if (readError) return
    if (existing && existing.length > 0) return

    await supabase.from("user_roles").insert({ user_id: userId, role: "model" })
  }, [])

  const buildUserFromSession = useCallback(
    async (sbUser: SupabaseUser): Promise<User> => {
      await ensureDefaultRole(sbUser.id)

      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", sbUser.id)
      const primaryRole = roles?.[0]?.role ?? "model"

      const nameFromMeta =
        (typeof sbUser.user_metadata?.full_name === "string" && sbUser.user_metadata.full_name) ||
        (typeof sbUser.user_metadata?.name === "string" && sbUser.user_metadata.name) ||
        sbUser.email ||
        "User"

      return {
        id: sbUser.id,
        email: sbUser.email || "",
        name: nameFromMeta,
        role: mapDbRoleToAppRole(primaryRole),
        createdAt: sbUser.created_at ? new Date(sbUser.created_at) : new Date(),
        lastLoginAt: new Date(),
      }
    },
    [ensureDefaultRole, mapDbRoleToAppRole],
  )

  const validateSession = useCallback((): boolean => {
    if (!user) return false
    if (sessionExpiry && Date.now() > sessionExpiry) {
      setUser(null)
      setSessionExpiry(null)
      return false
    }
    return true
  }, [])

  useEffect(() => {
    // IMPORTANT: listener first, then initial session fetch (prevents missing events)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: string, nextSession: Session | null) => {
      setSession(nextSession)
      if (nextSession?.user) {
        // Defer any extra Supabase calls to avoid deadlocks.
        setTimeout(() => {
          buildUserFromSession(nextSession.user)
            .then((u) => {
              setUser(u)
              setSessionExpiry(Date.now() + SESSION_TIMEOUT)
            })
            .catch(() => {
              setUser(null)
              setSessionExpiry(null)
            })
        }, 0)
      } else {
        setUser(null)
        setSessionExpiry(null)
      }
    })

    supabase.auth
      .getSession()
      .then(({ data }: { data: { session: Session | null } }) => {
        setSession(data.session)
        if (data.session?.user) {
          return buildUserFromSession(data.session.user).then((u) => {
            setUser(u)
            setSessionExpiry(Date.now() + SESSION_TIMEOUT)
          })
        }
        setUser(null)
        setSessionExpiry(null)
      })
      .finally(() => setIsLoading(false))

    return () => subscription.unsubscribe()
  }, [buildUserFromSession])

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

    const { data, error } = await supabase.auth.signInWithPassword({
      email: sanitizedEmail,
      password,
    })

    if (error) {
      systemLogger?.warn("Failed login attempt", "Auth", { email: sanitizedEmail })
      setIsLoading(false)
      return { success: false, error: error.message }
    }

    if (data.session?.user) {
      setSession(data.session)
      const u = await buildUserFromSession(data.session.user)
      setUser(u)
      setSessionExpiry(Date.now() + SESSION_TIMEOUT)
      systemLogger?.info("User logged in", "Auth", { userId: u.id })
    }

    setIsLoading(false)
    return { success: true }
  }, [])

  const logout = useCallback(() => {
    if (user) systemLogger?.info("User logged out", "Auth", { userId: user.id })
    // Fire-and-forget
    supabase.auth.signOut()
    setUser(null)
    setSession(null)
    setSessionExpiry(null)
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
