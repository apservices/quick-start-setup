"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import type { Session, User as SupabaseUser } from "@supabase/supabase-js"
import { ROLE_SCOPES, type User, type UserRole } from "./types"
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

// Session timeout in milliseconds (30 minutes)
const SESSION_TIMEOUT = 30 * 60 * 1000

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sessionExpiry, setSessionExpiry] = useState<number | null>(null)

  const mapProfileRoleToAppRole = useCallback((role: string | null | undefined): UserRole => {
    switch ((role || "").toLowerCase()) {
      case "admin":
        return "ADMIN"
      case "model":
        return "MODEL"
      case "client":
        return "CLIENT"
      case "viewer":
      default:
        return "VIEWER"
    }
  }, [])

  const ensureProfileExists = useCallback(async (userId: string, email?: string | null) => {
    const { data: profile, error: readError } = await supabase
      .from("profiles")
      .select("id, role, full_name")
      .eq("id", userId)
      .maybeSingle()

    if (readError) throw readError
    if (profile) return profile

    const { error: insertError } = await supabase.from("profiles").insert({
      id: userId,
      role: "viewer",
      full_name: email || null,
    })
    if (insertError) throw insertError

    const { data: created, error: reReadError } = await supabase
      .from("profiles")
      .select("id, role, full_name")
      .eq("id", userId)
      .maybeSingle()
    if (reReadError) throw reReadError
    if (!created) throw new Error("Profile provisioning failed: row not found after insert")
    return created
  }, [])

  const buildUserFromSession = useCallback(
    async (sbUser: SupabaseUser): Promise<User> => {
      const profile = await ensureProfileExists(sbUser.id, sbUser.email)

      const nameFromMeta =
        (typeof sbUser.user_metadata?.full_name === "string" && sbUser.user_metadata.full_name) ||
        (typeof sbUser.user_metadata?.name === "string" && sbUser.user_metadata.name) ||
        sbUser.email ||
        "User"

      return {
        id: sbUser.id,
        email: sbUser.email || "",
        name: profile.full_name || nameFromMeta,
        role: mapProfileRoleToAppRole(profile.role),
        createdAt: sbUser.created_at ? new Date(sbUser.created_at) : new Date(),
        lastLoginAt: new Date(),
      }
    },
    [ensureProfileExists, mapProfileRoleToAppRole],
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
