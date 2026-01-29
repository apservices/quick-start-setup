"use client"

import type { User as SupabaseUser } from "@supabase/supabase-js"
import { supabase } from "@/src/integrations/supabase/client"

export type ProfileRow = {
  id: string
  role: string
  full_name: string | null
}

function isProfileNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false
  const anyErr = error as { code?: string; message?: string; details?: string }
  // PostgREST commonly uses PGRST116 for "0 rows" on .single().
  if (anyErr.code === "PGRST116") return true
  const msg = `${anyErr.message || ""} ${anyErr.details || ""}`.toLowerCase()
  return msg.includes("0 rows") || msg.includes("no rows") || msg.includes("not found")
}

export async function getAuthedUser(): Promise<SupabaseUser | null> {
  const { data, error } = await supabase.auth.getUser()
  if (error) return null
  return data.user ?? null
}

export async function ensureProfileForUser(user: SupabaseUser): Promise<ProfileRow> {
  // 1) Try to read profile via .single()
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", user.id)
    .single()

  if (!profileError && profile) return profile

  // 2) If not found, insert then re-fetch
  if (isProfileNotFoundError(profileError) || !profile) {
    const { error: insertError } = await supabase.from("profiles").insert({
      id: user.id,
      role: "viewer",
      full_name: user.email ?? null,
    })

    if (insertError) throw insertError

    const { data: created, error: reReadError } = await supabase
      .from("profiles")
      .select("id, role, full_name")
      .eq("id", user.id)
      .single()

    if (reReadError) throw reReadError
    if (!created) throw new Error("Profile provisioning failed: row not found after insert")
    return created
  }

  // 3) Otherwise surface the real error (RLS, schema, network, etc.)
  throw profileError
}
