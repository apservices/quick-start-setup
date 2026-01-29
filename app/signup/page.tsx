"use client"

import type React from "react"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth-context"
import { validateEmail, validatePassword, sanitizeEmail } from "@/lib/validation"
import { checkPasswordLeak } from "@/lib/check-password-leak"
import { supabase } from "@/src/integrations/supabase/client"
import { AlertCircle, Loader2, Lock } from "lucide-react"

export default function SignupPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (user && !isLoading) {
      router.push("/dashboard")
    }
  }, [user, isLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsSubmitting(true)

    try {
      const emailValidation = validateEmail(email)
      if (!emailValidation.valid) {
        setError(emailValidation.error || "Invalid email")
        return
      }

      const passwordValidation = validatePassword(password)
      if (!passwordValidation.valid) {
        setError(passwordValidation.error || "Invalid password")
        return
      }

      if (password !== confirmPassword) {
        setError("Passwords do not match")
        return
      }

      // Extra security: check password leak (HIBP k-anonymity)
      const leakCheck = await checkPasswordLeak(password)
      if (leakCheck.ok && leakCheck.leaked) {
        const msg = "Esta senha apareceu em um vazamento de dados. Por segurança, escolha outra."
        setError(msg)
        toast.error(msg)
        return
      }
      if (!leakCheck.ok) {
        // Fail-open (permitir) conforme escolhido: segue o cadastro, mas avisa.
        toast.warning("Não foi possível verificar se a senha já vazou. Prosseguindo com o cadastro.")
      }

      const sanitizedEmail = sanitizeEmail(email)
      const redirectUrl = `${window.location.origin}/login`

      const { error: signUpError } = await supabase.auth.signUp({
        email: sanitizedEmail,
        password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      })

      if (signUpError) {
        setError(signUpError.message)
        return
      }

      toast.success("Conta criada. Verifique seu email para confirmar (se habilitado).")
      router.push("/login")
    } catch {
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 mb-4">
            <Image src="/atlas-logo.png" alt="ATLAS" width={80} height={80} className="rounded-xl" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground">ATLAS™</h1>
          <p className="text-muted-foreground mt-1">Digital Identity Platform</p>
        </div>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Sign Up</CardTitle>
            <CardDescription>Crie sua conta com uma senha segura</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@atlas.io"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="bg-input border-border"
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="bg-input border-border"
                  autoComplete="new-password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-foreground">
                  Confirm Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="bg-input border-border"
                  autoComplete="new-password"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={isLoading || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create account"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center mt-4">
          <Link href="/login" className="text-sm text-primary hover:underline">
            Já tem conta? Entrar
          </Link>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-6">
          <Lock className="w-3 h-3" />
          <span>Protected platform. Unauthorized access is prohibited.</span>
        </div>
      </div>
    </div>
  )
}
