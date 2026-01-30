// @ts-nocheck
// Supabase Edge Function: upload-capture
// Uploads a file to Storage bucket 'captures' using Service Role, then inserts row into public.captures.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const authHeader = req.headers.get("Authorization") || ""
  const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7) : null
  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  // Client with user's JWT to verify auth
  const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "", {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  })

  const { data: userData, error: userErr } = await supabaseAuth.auth.getUser()
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  // Service client bypasses RLS for storage + DB inserts
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  try {
    const form = await req.formData()
    const file = form.get("file")
    const modelId = String(form.get("modelId") ?? "")
    const forgeId = String(form.get("forgeId") ?? "")
    const angle = String(form.get("angle") ?? "")

    if (!(file instanceof File)) {
      return new Response(JSON.stringify({ error: "Missing file" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }
    if (!modelId || !forgeId || !angle) {
      return new Response(JSON.stringify({ error: "Missing modelId/forgeId/angle" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const ext = file.type === "image/png" ? "png" : "jpg"
    const objectPath = `${modelId}/${forgeId}/${crypto.randomUUID()}_${angle}.${ext}`

    const bytes = new Uint8Array(await file.arrayBuffer())
    const { error: uploadError } = await supabaseAdmin.storage.from("captures").upload(objectPath, bytes, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    })
    if (uploadError) throw uploadError

    const { data: publicUrl } = supabaseAdmin.storage.from("captures").getPublicUrl(objectPath)
    const assetUrl = publicUrl.publicUrl

    const { error: insertError } = await supabaseAdmin.from("captures").insert({
      model_id: modelId,
      asset_url: assetUrl,
      status: "pending",
    })
    if (insertError) throw insertError

    // Optional audit
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: userData.user.id,
      action: "CAPTURE_UPLOADED",
      target_table: "captures",
      target_id: null,
    })

    return new Response(JSON.stringify({ assetUrl }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
