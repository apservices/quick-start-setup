import { supabase } from "@/src/integrations/supabase/client"

const SUPABASE_FUNCTIONS_BASE_URL = "https://vdxglfncaulbjvbbirrm.supabase.co/functions/v1"

export async function uploadCaptureToSupabase(opts: {
  file: File
  modelId: string
  forgeId: string
  angle: string
}): Promise<{ assetUrl: string }> {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  const token = data.session?.access_token
  if (!token) throw new Error("Not authenticated")

  const form = new FormData()
  form.append("file", opts.file)
  form.append("modelId", opts.modelId)
  form.append("forgeId", opts.forgeId)
  form.append("angle", opts.angle)

  const res = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/upload-capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkeGdsZm5jYXVsYmp2YmJpcnJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NzkwMzEsImV4cCI6MjA4NTI1NTAzMX0.4o3v-dVjVRY2mRmEITuePzILzYYZN-StzdB8cnc1maM",
    },
    body: form,
  })

  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json?.error || `Upload failed (${res.status})`)
  }
  if (!json?.assetUrl) throw new Error("Malformed response from upload-capture")
  return { assetUrl: String(json.assetUrl) }
}
