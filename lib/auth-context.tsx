"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import type { Session, User as SupabaseUser } from "@supabase/supabase-js"
import { ROLE_SCOPES, type User, type UserRole } from "./types"
import { validateEmail, validatePassword, sanitizeEmail } from "./validation"
import { systemLogger } from "./system-logger"
import { supabase } from "@/src/integrations/supabase/client"
import { ensureProfileForUser, getAuthedUser, type ProfileRow } from "./profile-provisioning"

type UserRoleRow = { role: string }

function mapDbRoleToAppRole(dbRole: string | null | undefined): UserRole {
  switch ((dbRole || "").toLowerCase()) {
    case "admin":
      return "ADMIN"
    case "operator":
      return "OPERATOR"
    case "model":
      return "MODEL"
    case "client":
      return "CLIENT"
    default:
      return "VIEWER"
  }
}

function pickHighestRole(roles: string[]): UserRole {
  const normalized = roles.map((r) => r.toLowerCase())
  if (normalized.includes("admin")) return "ADMIN"
  if (normalized.includes("operator")) return "OPERATOR"
  if (normalized.includes("model")) return "MODEL"
  if (normalized.includes("client")) return "CLIENT"
  return "VIEWER"
}

async function getUserRoleFromDb(userId: string): Promise<UserRole> {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId)
  if (error) return "VIEWER"
  const roles = ((data ?? []) as UserRoleRow[]).map((r) => r.role)
  return pickHighestRole(roles)
}

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

// Session timeout in milliseconds (30 minutes)
const SESSION_TIMEOUT = 30 * 60 * 1000

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sessionExpiry, setSessionExpiry] = useState<number | null>(null)

  const buildUserFromProfile = useCallback(
    (sbUser: SupabaseUser, profile: ProfileRow, role: UserRole): User => {
      const nameFromMeta =
        (typeof sbUser.user_metadata?.full_name === "string" && sbUser.user_metadata.full_name) ||
        (typeof sbUser.user_metadata?.name === "string" && sbUser.user_metadata.name) ||
        sbUser.email ||
        "User"

      return {
        id: sbUser.id,
        email: sbUser.email || "",
        name: profile.full_name || nameFromMeta,
        role,
        createdAt: sbUser.created_at ? new Date(sbUser.created_at) : new Date(),
        lastLoginAt: new Date(),
      }
    },
    [],
  )

  const provisionProfileFromAuth = useCallback(async (): Promise<{ sbUser: SupabaseUser; profile: ProfileRow } | null> => {
    const sbUser = await getAuthedUser()
    if (!sbUser) return null
    const profile = await ensureProfileForUser(sbUser)
    return { sbUser, profile }
  }, [])

  const provisionRoleFromDb = useCallback(async (userId: string): Promise<UserRole> => {
    return getUserRoleFromDb(userId)
  }, [])

  const validateSession = useCallback((): boolean => {
    if (!user) return false
    if (sessionExpiry && Date.now() > sessionExpiry) {
      setUser(null)
      setSessionExpiry(null)
      return false
    }
    return true
  }, [user, sessionExpiry])

  useEffect(() => {
    // IMPORTANT: listener first, then initial session fetch (prevents missing events)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: string, nextSession: Session | null) => {
      setSession(nextSession)
      if (nextSession?.user) {
        // Defer any extra Supabase calls to avoid deadlocks.
        setIsLoading(true)
        setTimeout(() => {
          provisionProfileFromAuth()
            .then((result) => {
              if (!result) {
                setUser(null)
                setSessionExpiry(null)
                return
              }
              return provisionRoleFromDb(result.sbUser.id).then((role) => {
                const u = buildUserFromProfile(result.sbUser, result.profile, role)
                setUser(u)
                setSessionExpiry(Date.now() + SESSION_TIMEOUT)
              })
            })
            .catch(() => {
              setUser(null)
              setSessionExpiry(null)
            })
            .finally(() => setIsLoading(false))
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
          // Ensure we verify session via getUser() and provision profile via .single() flow.
          return provisionProfileFromAuth().then((result) => {
            if (!result) {
              setUser(null)
              setSessionExpiry(null)
              return
            }
            return provisionRoleFromDb(result.sbUser.id).then((role) => {
              const u = buildUserFromProfile(result.sbUser, result.profile, role)
              setUser(u)
              setSessionExpiry(Date.now() + SESSION_TIMEOUT)
            })
          })
        }

        setUser(null)
        setSessionExpiry(null)
      })
      .finally(() => setIsLoading(false))

    return () => subscription.unsubscribe()
  }, [buildUserFromProfile, provisionProfileFromAuth])

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
      // IMPORTANT: Verify authenticated user with getUser() and guarantee profiles row.
      try {
        const result = await provisionProfileFromAuth()
        if (!result) {
          setUser(null)
          setSessionExpiry(null)
          return { success: false, error: "Authentication session could not be verified." }
        }
        const role = await provisionRoleFromDb(result.sbUser.id)
        const u = buildUserFromProfile(result.sbUser, result.profile, role)
        setUser(u)
        setSessionExpiry(Date.now() + SESSION_TIMEOUT)
        systemLogger?.info("User logged in", "Auth", { userId: u.id, role })
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e))
        systemLogger?.error("Profile provisioning failed after login", "Auth", err)
        // Prevent infinite redirect loops by ending the session if provisioning fails.
        supabase.auth.signOut()
        setUser(null)
        setSession(null)
        setSessionExpiry(null)
        return { success: false, error: "Account provisioning failed. Please contact support." }
      }
    }

    setIsLoading(false)
    return { success: true }
  }, [buildUserFromProfile, provisionProfileFromAuth])

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
      const scopes = ROLE_SCOPES[user.role]
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
