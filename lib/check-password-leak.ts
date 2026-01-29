export type PasswordLeakResult =
  | { ok: true; leaked: true; count: number }
  | { ok: true; leaked: false }
  | { ok: false; error: string }

function bytesToHexUpper(bytes: ArrayBuffer): string {
  const arr = new Uint8Array(bytes)
  let out = ""
  for (const b of arr) out += b.toString(16).padStart(2, "0")
  return out.toUpperCase()
}

async function sha1HexUpper(input: string): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    return Promise.resolve("")
  }
  const data = new TextEncoder().encode(input)
  const digest = await globalThis.crypto.subtle.digest("SHA-1", data)
  return bytesToHexUpper(digest)
}

/**
 * Verifica se uma senha aparece no banco do Have I Been Pwned usando k-anonymity.
 * - Não envia a senha nem o hash completo, apenas os 5 primeiros caracteres do SHA-1.
 */
export async function checkPasswordLeak(password: string): Promise<PasswordLeakResult> {
  if (typeof password !== "string" || password.length < 1) {
    return { ok: false, error: "Password is required" }
  }
  if (password.length > 128) {
    return { ok: false, error: "Password is too long" }
  }

  const fullHash = await sha1HexUpper(password)
  if (!fullHash || fullHash.length !== 40) {
    return { ok: false, error: "Password leak check is not supported in this environment" }
  }

  const prefix = fullHash.slice(0, 5)
  const suffix = fullHash.slice(5)

  try {
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      method: "GET",
      headers: {
        // Reduz possibilidade de análise por tamanho de resposta.
        "Add-Padding": "true",
      },
    })

    if (!res.ok) {
      return { ok: false, error: `HIBP request failed (${res.status})` }
    }

    const text = await res.text()
    const lines = text.split(/\r?\n/)

    for (const line of lines) {
      // Format: HASH_SUFFIX:COUNT
      const [remoteSuffix, countRaw] = line.split(":")
      if (!remoteSuffix || !countRaw) continue
      if (remoteSuffix.toUpperCase() === suffix) {
        const count = Number.parseInt(countRaw.trim(), 10)
        return { ok: true, leaked: true, count: Number.isFinite(count) ? count : 0 }
      }
    }

    return { ok: true, leaked: false }
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e)
    return { ok: false, error: err || "HIBP request failed" }
  }
}
